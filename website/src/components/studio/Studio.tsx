"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseInput, LIMITS, type Interpretation, type ParseError } from "@/lib/studio/parse";
import { buildProblem, maximises, pairContributions, type Problem } from "@/lib/studio/model";
import { SOLVERS, type SolverId } from "@/lib/studio/solvers";
import { backwardReduction, improvement, instanceJson, resultCsv, resultJson, resultMarkdown, STUDIO_VERSION, type SolveResult } from "@/lib/studio/report";
import { fromWire, type WireJob, type WireResult } from "@/lib/studio/runner";
import { EXAMPLES, largeExample, type Example } from "@/lib/studio/examples";
import { ArcDiagram, GraphView, MatrixHeatmap } from "./Viz";
import RemotePanel from "./RemotePanel";

type Format = "auto" | "matrix" | "edges" | "json";
type JobState = "idle" | "running" | "completed" | "failed" | "cancelled";
interface Job { id: string; state: JobState; startedAt: number; finishedAt?: number; progress: { fraction: number; note: string } | null; error?: string; solver: SolverId }

const INTERP_LABEL: Record<Interpretation | "auto", string> = {
  auto: "Detect (or use the file's declaration)",
  skew: "Skew-symmetric margins (a_ij = −a_ji)",
  benefit: "Benefit: entry (i, j) is gained when i precedes j",
  cost: "Cost: entry (i, j) is paid when i precedes j",
};

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fmtQ = (q: { toDecimal: (d?: number) => string; toString: () => string }) => {
  const s = q.toString();
  return s.includes("/") ? `${q.toDecimal(4)} (= ${s})` : s;
};

let jobCounter = 0;

export default function Studio() {
  const [text, setText] = useState(EXAMPLES[0].text);
  const [format, setFormat] = useState<Format>(EXAMPLES[0].format);
  const [interp, setInterp] = useState<Interpretation | "auto">(EXAMPLES[0].interpretation);
  const [exampleId, setExampleId] = useState<string>(EXAMPLES[0].id);
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [nameEdits, setNameEdits] = useState<Record<number, string>>({});
  const [initialOverride, setInitialOverride] = useState<number[] | null>(null);
  const [solver, setSolver] = useState<SolverId>("autocut");
  const [timeLimit, setTimeLimit] = useState(30);
  const [seed, setSeed] = useState(1);
  const [bfCheck, setBfCheck] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [result, setResult] = useState<{ problem: Problem; r: SolveResult } | null>(null);
  const [tab, setTab] = useState<"ordering" | "matrix" | "graph" | "pairs" | "structure">("ordering");
  const [now, setNow] = useState(0);
  const workerRef = useRef<Worker | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- parse + build (pure, synchronous; bounded by LIMITS) ----------
  const built = useMemo((): { problem: Problem | null; errors: ParseError[]; stage: "parse" | "model" | null } => {
    const parsed = parseInput(text, format);
    if (!parsed.ok) return { problem: null, errors: parsed.errors, stage: "parse" };
    const raw = parsed.value;
    const names = raw.names.map((s, i) => (nameEdits[i] !== undefined ? nameEdits[i].trim() : s));
    if (names.some((s) => !s)) return { problem: null, errors: [{ message: "item names must be non-empty" }], stage: "model" };
    if (new Set(names).size !== names.length) return { problem: null, errors: [{ message: "item names must be unique" }], stage: "model" };
    const b = buildProblem({ ...raw, names }, interp === "auto" ? undefined : interp);
    if (!b.ok) return { problem: null, errors: b.errors, stage: "model" };
    if (initialOverride && initialOverride.length === b.problem.n) b.problem.initialOrder = initialOverride.slice();
    return { problem: b.problem, errors: [], stage: null };
  }, [text, format, interp, nameEdits, initialOverride]);
  const p = built.problem;

  const solverInfo = SOLVERS.find((s) => s.id === solver)!;
  const solverOk = p ? p.n <= solverInfo.maxN : false;

  // choose a sensible solver when the size changes
  const pickSolver = useCallback((n: number) => {
    if (n <= 9) return "autocut" as const;
    if (n <= 18) return "subset-dp" as const;
    if (n <= 24) return "exclusion" as const;
    return "heuristic" as const;
  }, []);

  const loadExample = (ex: Example) => {
    setText(ex.text);
    setFormat(ex.format);
    setInterp(ex.interpretation);
    setExampleId(ex.id);
    setNameEdits({});
    setInitialOverride(null);
    setFileNote(null);
    const parsed = parseInput(ex.text, ex.format);
    if (parsed.ok) setSolver(pickSolver(parsed.value.names.length));
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > LIMITS.maxBytes) {
      setFileNote(`“${f.name}” is ${(f.size / 1e6).toFixed(1)} MB; the limit is ${LIMITS.maxBytes / 1e6} MB.`);
      return;
    }
    const t = await f.text();
    const isJson = /\.json$/i.test(f.name);
    setText(t);
    setFormat(isJson ? "json" : "auto");
    setInterp("auto");
    setExampleId("");
    setNameEdits({});
    setInitialOverride(null);
    setFileNote(`Loaded “${f.name}” (${f.size.toLocaleString("en-US")} bytes).`);
    const parsed = parseInput(t, isJson ? "json" : "auto");
    if (parsed.ok) setSolver(pickSolver(parsed.value.names.length));
  };

  // ---------- jobs ----------
  const stopWorker = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    if (watchdog.current) clearTimeout(watchdog.current);
  };
  useEffect(() => () => stopWorker(), []);
  useEffect(() => {
    if (job?.state !== "running") return;
    const id = setInterval(() => setNow(performance.now()), 200);
    return () => clearInterval(id);
  }, [job?.state]);

  const run = () => {
    if (!p || !solverOk) return;
    stopWorker();
    const id = `job-${Date.now().toString(36)}-${++jobCounter}`;
    const snapshot = p;
    const w = new Worker(new URL("../../lib/studio/studio.worker.ts", import.meta.url));
    workerRef.current = w;
    const startedAt = performance.now();
    setNow(startedAt);
    setJob({ id, state: "running", startedAt, progress: null, solver });
    const msg: WireJob = { id: jobCounter, instance: instanceJson(snapshot), interpretation: snapshot.interpretation, solver,
      config: { timeLimitMs: timeLimit * 1000, seed, bruteForceCheck: bfCheck } };
    w.onmessage = (ev: MessageEvent<{ type: string; fraction?: number; note?: string; result?: WireResult; message?: string }>) => {
      const d = ev.data;
      if (d.type === "progress") setJob((j) => (j && j.id === id ? { ...j, progress: { fraction: d.fraction!, note: d.note! } } : j));
      else if (d.type === "done") {
        stopWorker();
        setResult({ problem: snapshot, r: fromWire(d.result!) });
        setJob((j) => (j && j.id === id ? { ...j, state: "completed", finishedAt: performance.now() } : j));
        setTab(d.result!.structure ? "structure" : "ordering");
      } else if (d.type === "error") {
        stopWorker();
        setJob((j) => (j && j.id === id ? { ...j, state: "failed", error: d.message, finishedAt: performance.now() } : j));
      }
    };
    w.onerror = (e) => {
      stopWorker();
      setJob((j) => (j && j.id === id ? { ...j, state: "failed", error: e.message || "the solver worker crashed (possibly out of memory)", finishedAt: performance.now() } : j));
    };
    // watchdog: hard stop slightly after the time limit even if a solver cannot check its deadline
    watchdog.current = setTimeout(() => {
      stopWorker();
      setJob((j) => (j && j.id === id && j.state === "running" ? { ...j, state: "failed", error: `hard time limit of ${timeLimit} s exceeded; the job was terminated`, finishedAt: performance.now() } : j));
    }, timeLimit * 1000 + 3000);
    w.postMessage(msg);
  };

  const cancel = () => {
    stopWorker();
    setJob((j) => (j && j.state === "running" ? { ...j, state: "cancelled", finishedAt: performance.now() } : j));
  };

  const running = job?.state === "running";
  const elapsed = job ? ((job.finishedAt ?? now) - job.startedAt) / 1000 : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
      {/* ------------------------------ left: data & solver ------------------------------ */}
      <div className="space-y-6">
        <Panel step="1" title="Data">
          <div>
            <p className="label">Example problems</p>
            <div className="mt-2 grid gap-1.5">
              {[...EXAMPLES, largeExample()].map((ex) => (
                <button key={ex.id} type="button" onClick={() => loadExample(ex)}
                  className={`flex items-baseline justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${exampleId === ex.id ? "border-navy-700/40 bg-ink-900" : "border-line hover:border-ink-600"}`}>
                  <span className="font-medium text-fog-100">{ex.title}</span>
                  <span className="shrink-0 text-xs text-fog-500">{ex.domain}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <label className="label" htmlFor="file">Upload CSV, TSV, TXT or JSON (≤ 2 MB)</label>
            <input id="file" data-testid="file-input" type="file" accept=".csv,.tsv,.txt,.json,text/csv,application/json,text/plain"
              className="mt-2 block w-full text-sm text-fog-400 file:mr-3 file:rounded-md file:border file:border-ink-600 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fog-100 hover:file:border-fog-500"
              onChange={(e) => onFile(e.target.files?.[0])} />
            {fileNote && <p className="mt-2 text-xs text-fog-500" role="status">{fileNote}</p>}
          </div>
          <div className="mt-5 grid gap-3">
            <div>
              <label className="label" htmlFor="format">Format</label>
              <select id="format" className="field mt-1.5" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
                <option value="auto">Detect automatically</option>
                <option value="matrix">Matrix (CSV / TSV / spaces)</option>
                <option value="edges">Edge list: from,to,weight</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="interp">Interpretation</label>
              <select id="interp" className="field mt-1.5" value={interp} onChange={(e) => setInterp(e.target.value as Interpretation | "auto")}>
                {(Object.keys(INTERP_LABEL) as (Interpretation | "auto")[]).map((k) => <option key={k} value={k}>{INTERP_LABEL[k]}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="data">Data (edit or paste)</label>
            <textarea id="data" data-testid="data-input" spellCheck={false} value={text}
              onChange={(e) => { setText(e.target.value); setExampleId(""); setInitialOverride(null); }}
              className="field mt-1.5 h-56 resize-y font-mono text-[12px] leading-relaxed" />
            <p className="mt-1.5 text-xs text-fog-500">Formats and conventions: <Link className="text-accent-600 underline" href="/docs/#input-formats">documentation</Link>.</p>
          </div>
          <Validation built={built} />
        </Panel>

        {p && <Panel step="2" title="Model">
          <ModelSummary p={p} nameEdits={nameEdits} setNameEdits={setNameEdits} />
        </Panel>}

        <Panel step="3" title="Solve">
          <fieldset disabled={running} className="space-y-3">
            <legend className="sr-only">Solver selection</legend>
            {SOLVERS.map((s) => {
              const tooBig = p ? p.n > s.maxN : false;
              return (
                <label key={s.id} className={`flex cursor-pointer gap-3 rounded-md border p-3 ${solver === s.id ? "border-navy-700/50 bg-ink-900" : "border-line"} ${tooBig ? "opacity-50" : ""}`}>
                  <input type="radio" name="solver" value={s.id} checked={solver === s.id} onChange={() => setSolver(s.id)} className="mt-1 accent-[#0f766e]" />
                  <span>
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fog-100">
                      {s.label}
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${s.exact ? "bg-signal-green/10 text-signal-green" : "bg-signal-amber/10 text-signal-amber"}`}>{s.exact ? "exact" : "heuristic"}</span>
                      <span className="font-mono text-[11px] font-normal text-fog-500">n ≤ {s.maxN}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-fog-400">{s.summary}</span>
                  </span>
                </label>
              );
            })}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="tl">Time limit (s)</label>
                <input id="tl" type="number" min={0.1} max={600} step={0.1} value={timeLimit} className="field mt-1.5"
                  onChange={(e) => setTimeLimit(Math.max(0.1, Math.min(600, Math.round((Number(e.target.value) || 1) * 10) / 10)))} />
              </div>
              <div>
                <label className="label" htmlFor="seed">Random seed</label>
                <input id="seed" type="number" min={1} max={1_000_000} value={seed} className="field mt-1.5"
                  onChange={(e) => setSeed(Math.max(1, Math.min(1_000_000, Math.round(Number(e.target.value) || 1))))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-fog-300">
              <input type="checkbox" checked={bfCheck} onChange={(e) => setBfCheck(e.target.checked)} className="accent-[#0f766e]" />
              Independent exhaustive check when n ≤ 9
            </label>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={run} disabled={!p || !solverOk || running} data-testid="run">
              {running ? "Running…" : "Run optimization"}
            </button>
            {running && <button type="button" className="btn-secondary" onClick={cancel} data-testid="cancel">Cancel</button>}
            {p && !solverOk && <span className="text-xs text-signal-red">This solver supports n ≤ {solverInfo.maxN} (instance has {p.n}).</span>}
          </div>
          {job && <JobStatus job={job} elapsed={elapsed} />}
        </Panel>

        <RemotePanel problem={p} />
      </div>

      {/* ------------------------------ right: results ------------------------------ */}
      <div className="min-w-0">
        {result ? (
          <Results problem={result.problem} r={result.r} tab={tab} setTab={setTab}
            useAsInitial={() => { setInitialOverride(result.r.order.slice()); }} />
        ) : (
          <div className="card flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
            <p className="kicker">Results</p>
            <h2 className="mt-3 text-xl font-semibold text-fog-100">Run a solver to see the optimized ordering</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-fog-400">
              Everything runs in your browser: your data is not uploaded anywhere. Exact solvers establish optimality when they complete. The heuristic returns a feasible ordering only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5" aria-labelledby={`panel-${step}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 font-mono text-[11px] text-white">{step}</span>
        <h2 id={`panel-${step}`} className="text-base font-semibold text-fog-100">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Validation({ built }: { built: { problem: Problem | null; errors: ParseError[]; stage: "parse" | "model" | null } }) {
  if (built.problem)
    return (
      <div className="mt-4 rounded-md border border-signal-green/30 bg-signal-green/5 px-3 py-2 text-sm text-signal-green" role="status" data-testid="validation-ok">
        Valid input: {built.problem.n} items.
        {built.problem.warnings.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-xs text-signal-amber">{built.problem.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        )}
      </div>
    );
  return (
    <div className="mt-4 rounded-md border border-signal-red/30 bg-signal-red/5 px-3 py-2 text-sm text-signal-red" role="alert" data-testid="validation-errors">
      <p className="font-semibold">{built.stage === "parse" ? "The input could not be read" : "The input cannot be modelled as stated"}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs leading-relaxed">
        {built.errors.map((e, i) => <li key={i}>{e.line ? `Line ${e.line}: ` : ""}{e.message}</li>)}
      </ul>
    </div>
  );
}

function ModelSummary({ p, nameEdits, setNameEdits }: { p: Problem; nameEdits: Record<number, string>; setNameEdits: (f: (x: Record<number, string>) => Record<number, string>) => void }) {
  const [showNames, setShowNames] = useState(false);
  const objective = p.interpretation === "cost"
    ? "minimise Σ d_ij over pairs with i before j"
    : p.interpretation === "benefit" ? "maximise Σ c_ij over pairs with i before j" : "maximise F_A(π) = Σ_{r<s} a_{π_r π_s}";
  const identity = p.interpretation === "skew" ? "objective = F_A" : p.interpretation === "benefit" ? "objective = (F_A + S) / 2" : "objective = (S − F_A) / 2";
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2" data-testid="model-summary">
        <dt className="text-fog-500">Items</dt><dd className="font-mono text-fog-100">{p.n}</dd>
        <dt className="text-fog-500">Source</dt><dd className="text-fog-100">{p.source === "edges" ? "edge list" : "matrix"}</dd>
        <dt className="text-fog-500">Interpretation</dt><dd className="text-fog-100">{p.interpretation}</dd>
        <dt className="text-fog-500">Objective</dt><dd className="text-fog-100">{objective}</dd>
        <dt className="text-fog-500">Transformed</dt><dd className="text-fog-100">maximise F_A with A {p.interpretation === "skew" ? "as given" : p.interpretation === "benefit" ? "= C − Cᵀ" : "= Dᵀ − D"}</dd>
        <dt className="text-fog-500">Identity</dt><dd className="font-mono text-[12.5px] text-fog-100">{identity}{p.interpretation !== "skew" && <>, S = {p.offset.toDecimal(4)}</>}</dd>
        <dt className="text-fog-500">Nonzero pairs</dt><dd className="font-mono text-fog-100">{p.stats.nonzeroPairs} of {(p.n * (p.n - 1)) / 2}</dd>
        <dt className="text-fog-500">Arithmetic</dt><dd className="text-fog-100">{p.exact ? `exact integers (scale ${p.scale})` : "floating point (values too large)"}</dd>
      </dl>
      {p.n <= 12 && (
        <div className="overflow-x-auto">
          <table className="border-collapse font-mono text-[11px]" aria-label="Transformed skew-symmetric matrix A">
            <caption className="mb-1 text-left font-sans text-xs text-fog-500">Transformed matrix A (row before column)</caption>
            <thead><tr><th />{p.names.map((s) => <th key={s} className="px-1.5 py-1 font-medium text-fog-500">{s.slice(0, 6)}</th>)}</tr></thead>
            <tbody>
              {p.A.map((row, i) => (
                <tr key={i}>
                  <th className="pr-2 text-right font-medium text-fog-500">{p.names[i].slice(0, 8)}</th>
                  {row.map((x, j) => (
                    <td key={j} className={`border border-line px-1.5 py-1 text-right ${i === j ? "bg-ink-800" : x.sign() > 0 ? "text-accent-700" : x.sign() < 0 ? "text-signal-red" : "text-fog-500"}`}>
                      {i === j ? "" : x.den === 1n ? x.toString() : x.toDecimal(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div>
        <button type="button" className="text-sm font-medium text-accent-600 hover:underline" onClick={() => setShowNames((v) => !v)} aria-expanded={showNames}>
          {showNames ? "Hide item names" : "Rename items"}
        </button>
        {showNames && (
          <div className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {p.names.map((s, i) => (
              <label key={i} className="text-xs text-fog-500">
                #{i + 1}
                <input className="field mt-0.5 py-1" value={nameEdits[i] ?? s} maxLength={80}
                  onChange={(e) => setNameEdits((x) => ({ ...x, [i]: e.target.value }))} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JobStatus({ job, elapsed }: { job: Job; elapsed: number }) {
  const tone = job.state === "completed" ? "text-signal-green" : job.state === "failed" ? "text-signal-red" : job.state === "cancelled" ? "text-fog-400" : "text-navy-800";
  return (
    <div className="mt-4 rounded-md border border-line bg-ink-900 p-3 text-sm" role="status" aria-live="polite" data-testid="job-status">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`font-semibold ${tone}`} data-testid="job-state">{job.state.toUpperCase()}</span>
        <span className="font-mono text-xs text-fog-500">{job.id} · {elapsed.toFixed(1)} s</span>
      </div>
      {job.state === "running" && job.progress && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded bg-ink-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(job.progress.fraction * 100)}>
            <div className="h-full bg-accent-500" style={{ width: `${Math.round(job.progress.fraction * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-fog-500">{job.progress.note}</p>
        </div>
      )}
      {job.state === "running" && !job.progress && <p className="mt-1 text-xs text-fog-500">Running. This solver does not report measurable progress.</p>}
      {job.error && <p className="mt-1 text-xs text-signal-red" data-testid="job-error">{job.error}</p>}
      {job.state === "cancelled" && <p className="mt-1 text-xs text-fog-500">Cancelled: the solver worker was terminated. No partial result is reported.</p>}
    </div>
  );
}

function Results({ problem: p, r, tab, setTab, useAsInitial }: { problem: Problem; r: SolveResult; tab: string; setTab: (t: "ordering" | "matrix" | "graph" | "pairs" | "structure") => void; useAsInitial: () => void }) {
  const imp = improvement(p, r.initialObjective, r.objective);
  const bred = backwardReduction(r.backwardInitial, r.backwardFinal);
  const v = r.verification;
  const verified = v.permutation && v.objectiveRecomputed && v.identityHolds && v.bruteForce?.agrees !== false && v.crossCheck?.agrees !== false;
  const optimal = r.status === "OPTIMAL";
  const posInit = new Map(p.initialOrder.map((x, i) => [x, i]));
  const contributions = useMemo(() => pairContributions(p, r.order), [p, r.order]);
  const dir = maximises(p) ? "maximise" : "minimise";
  const blocks = r.structure?.blocks ?? null;
  const base = (p.title ?? "westfall-result").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "westfall-result";
  return (
    <div className="space-y-6" data-testid="results">
      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span data-testid="status-badge" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${optimal ? "border-signal-green/30 bg-signal-green/5 text-signal-green" : "border-signal-amber/30 bg-signal-amber/5 text-signal-amber"}`}>
            <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
            {optimal ? "Optimality established" : "Feasible solution only"}
          </span>
          {verified && <span data-testid="verified-badge" className="inline-flex rounded-full border border-navy-700/25 bg-ink-900 px-3 py-1 text-sm font-semibold text-navy-800">Verification passed</span>}
          <span className="inline-flex rounded-full border border-line px-3 py-1 text-xs text-fog-500">Browser solver · not the Lean-verified executable</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fog-400" data-testid="status-note">{r.statusNote}.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={`Objective (${dir})`} value={fmtQ(r.objective)} testId="objective" />
          <Metric label="Initial order" value={fmtQ(r.initialObjective)} testId="initial-objective" />
          <Metric label="Change" value={`${imp.absolute.sign() >= 0 ? "+" : ""}${imp.absolute.toDecimal(4)}`}
            hint={imp.percent !== null ? `${imp.percent.toFixed(2)}% ${imp.note}` : imp.note} />
          <Metric label="Runtime" value={`${r.runtimeMs < 1000 ? r.runtimeMs.toFixed(1) + " ms" : (r.runtimeMs / 1000).toFixed(2) + " s"}`} hint={r.solverLabel} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Metric label="Backward weight β (disagreement)" value={`${r.backwardInitial.toDecimal(4)} → ${r.backwardFinal.toDecimal(4)}`}
            hint={bred !== null ? `${bred.toFixed(2)}% reduction (β ≥ 0, so this ratio is always meaningful when β₀ > 0)` : "β₀ = 0: the initial order already agrees with every pair"} />
          <div className="rounded-lg border border-line bg-white p-4 text-sm">
            <p className="label">Verification</p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-fog-300" data-testid="verification">
              <Check ok={v.permutation}>valid permutation of all {p.n} items</Check>
              <Check ok={v.objectiveRecomputed && v.identityHolds}>objective recomputed exactly from the input; F_A identity holds</Check>
              {v.bruteForce && <Check ok={v.bruteForce.agrees}>exhaustive enumeration of {v.bruteForce.orderings.toLocaleString("en-US")} orderings: optimum {v.bruteForce.agrees ? "attained" : "NOT attained"} ({v.bruteForce.optimalOrderings} optimal)</Check>}
              {v.crossCheck && <Check ok={v.crossCheck.agrees}>cross-checked with the {v.crossCheck.method}</Check>}
              {!v.bruteForce && !v.crossCheck && <li className="text-fog-500">no independent optimality check was run for this size or solver</li>}
            </ul>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
          <button type="button" className="btn-secondary py-2" data-testid="export-json" onClick={() => download(`${base}.json`, JSON.stringify(resultJson(p, r), null, 2), "application/json")}>Export JSON</button>
          <button type="button" className="btn-secondary py-2" data-testid="export-csv" onClick={() => download(`${base}-order.csv`, resultCsv(p, r), "text/csv")}>Export CSV</button>
          <button type="button" className="btn-secondary py-2" onClick={() => download(`${base}-report.md`, resultMarkdown(p, r), "text/markdown")}>Summary report (.md)</button>
          <button type="button" className="btn-secondary py-2" onClick={() => window.print()}>Print / PDF</button>
          <button type="button" className="btn-ghost py-2" onClick={useAsInitial}>Use as initial order</button>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap gap-1 rounded-lg bg-ink-850 p-1" role="tablist" aria-label="Result views">
          {([["ordering", "Ordering"], ["matrix", "Matrix"], ["graph", "Graph"], ["pairs", "Pairwise contributions"], ["structure", "Structure"]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} type="button" className={`tab ${tab === id ? "tab-active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="mt-5">
          {tab === "ordering" && (
            <div className="space-y-6">
              <div>
                <p className="label">Optimized ordering</p>
                <ArcDiagram M={p.M} order={r.order} names={p.names} />
                <p className="label mt-4">Initial ordering</p>
                <ArcDiagram M={p.M} order={p.initialOrder} names={p.names} height={180} />
                <p className="mt-2 text-xs text-fog-500">An arc joins every pair with a positive margin. Arcs above the line agree with the ordering; arcs below it (red) are backward.</p>
              </div>
              <div className="max-h-[420px] overflow-auto rounded-lg border border-line">
                <table className="table-clean" data-testid="ordering-table">
                  <thead><tr><th>Position</th><th>Item</th><th>Initial position</th><th>Move</th></tr></thead>
                  <tbody>{r.order.map((x, i) => {
                    const d = posInit.get(x)! - i;
                    return <tr key={x}><td className="font-mono">{i + 1}</td><td className="font-medium text-fog-100">{p.names[x]}</td><td className="font-mono">{posInit.get(x)! + 1}</td>
                      <td className={`font-mono ${d > 0 ? "text-accent-700" : d < 0 ? "text-signal-red" : "text-fog-500"}`}>{d > 0 ? `↑ ${d}` : d < 0 ? `↓ ${-d}` : "—"}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "matrix" && (
            <div className="grid gap-6 md:grid-cols-2">
              <MatrixHeatmap M={p.M} order={p.initialOrder} names={p.names} label="Initial order" size={360} />
              <MatrixHeatmap M={p.M} order={r.order} names={p.names} blocks={blocks} label="Optimized order" size={360} />
            </div>
          )}
          {tab === "graph" && <GraphView M={p.M} order={r.order} names={p.names} />}
          {tab === "pairs" && <Pairs p={p} contributions={contributions} />}
          {tab === "structure" && (r.structure ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="λ(A)" value={String(r.structure.lambda)} hint="= b² + 3K₀ of the recovered partition" testId="lambda" />
                <Metric label="Largest block b" value={String(r.structure.bmax)} />
                <Metric label="K₀" value={String(r.structure.K0)} />
                <Metric label="Accepted k" value={`${r.structure.k} (round ${r.structure.rounds})`} />
              </div>
              <p className="text-fog-400">AutoCut recovered an ordered partition attaining the structural minimum λ(A), searching {r.structure.reachable} reachable cuts and {r.structure.nodes} DAG nodes (threshold τ = {r.structure.tau ?? "∞"}, block cap {r.structure.b}).</p>
              <ol className="space-y-2">
                {r.structure.blocks.map((B, i) => (
                  <li key={i} className="rounded-md border border-line px-3 py-2"><span className="font-mono text-xs text-fog-500">Block {i + 1}</span> <span className="ml-2 text-fog-100">{B.map((x) => p.names[x]).join(", ")}</span></li>
                ))}
              </ol>
              <p className="text-xs text-fog-500">The partition is a structural witness, not a polynomial-time optimality certificate. <Link className="text-accent-600 underline" href="/technology/#lambda">What λ(A) means</Link>.</p>
            </div>
          ) : (
            <p className="text-sm text-fog-400">Structural decomposition is computed by the AutoCut solver (n ≤ 9 in the browser). Select it and run again to recover a partition attaining λ(A).</p>
          ))}
        </div>
      </section>

      <section className="card p-6 text-sm">
        <h3 className="font-semibold text-fog-100">Run details</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {Object.entries(r.details).map(([k, val]) => <div key={k} className="flex justify-between gap-4 border-b border-line py-1"><dt className="text-fog-500">{k}</dt><dd className="font-mono text-fog-100">{String(val)}</dd></div>)}
          <div className="flex justify-between gap-4 border-b border-line py-1"><dt className="text-fog-500">Studio version</dt><dd className="font-mono text-fog-100">{STUDIO_VERSION}</dd></div>
          <div className="flex justify-between gap-4 border-b border-line py-1"><dt className="text-fog-500">Time limit · seed</dt><dd className="font-mono text-fog-100">{r.config.timeLimitMs / 1000} s · {r.config.seed}</dd></div>
          <div className="flex justify-between gap-4 border-b border-line py-1"><dt className="text-fog-500">F_A (transformed)</dt><dd className="font-mono text-fog-100">{r.FA.toDecimal(4)}</dd></div>
          <div className="flex justify-between gap-4 border-b border-line py-1"><dt className="text-fog-500">Finished</dt><dd className="font-mono text-fog-100">{r.finishedAt.slice(0, 19).replace("T", " ")} UTC</dd></div>
        </dl>
      </section>
    </div>
  );
}

function Pairs({ p, contributions }: { p: Problem; contributions: ReturnType<typeof pairContributions> }) {
  const [only, setOnly] = useState<"all" | "against">("all");
  const rows = contributions.filter((c) => only === "all" || !c.agrees).sort((a, b) => b.value.abs().cmp(a.value.abs()));
  const unit = p.interpretation === "cost" ? "cost paid" : p.interpretation === "benefit" ? "benefit earned" : "a_uv";
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fog-400">Every ordered pair (u before v) with a nonzero margin, and its contribution ({unit}).</p>
        <select className="field w-auto py-1.5" value={only} onChange={(e) => setOnly(e.target.value as "all" | "against")} aria-label="Filter pairs">
          <option value="all">All pairs</option>
          <option value="against">Against the majority only</option>
        </select>
      </div>
      <div className="mt-3 max-h-[480px] overflow-auto rounded-lg border border-line">
        <table className="table-clean">
          <thead><tr><th>First</th><th>Then</th><th>Contribution</th><th>Margin a_uv</th><th>Agrees</th></tr></thead>
          <tbody>
            {rows.slice(0, 300).map((c) => (
              <tr key={`${c.u}-${c.v}`}>
                <td className="font-medium text-fog-100">{p.names[c.u]}</td><td className="font-medium text-fog-100">{p.names[c.v]}</td>
                <td className="font-mono">{c.value.toDecimal(4)}</td><td className="font-mono">{p.A[c.u][c.v].toDecimal(4)}</td>
                <td className={c.agrees ? "text-accent-700" : "text-signal-red"}>{c.agrees ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 300 && <p className="mt-2 text-xs text-fog-500">Showing the 300 largest of {rows.length} pairs; the JSON export contains the full result.</p>}
    </div>
  );
}

function Metric({ label, value, hint, testId }: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="label">{label}</p>
      <p className="mt-1 break-words font-mono text-lg text-fog-100" data-testid={testId}>{value}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-fog-500">{hint}</p>}
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className={ok ? "text-signal-green" : "text-signal-red"}>{ok ? "✓" : "✗"}</span>
      <span>{children}</span>
    </li>
  );
}
