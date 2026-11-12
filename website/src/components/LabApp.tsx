"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { backwardArcs, backwardWeight, generate, isIntegerMatrix, score, segmentOrder, insertionLocalSearch, validateSkew, mulberry32, type Generator, type Matrix } from "@/lib/engine";
import { parseCertificate, Reject, verifyCertificate } from "@/lib/verify";
import type { Preset } from "@/lib/data";
import { asset } from "@/lib/site";
import { GraphCircle, MatrixView, OrderingDiagram, blockColor } from "./views";
import { Stat, StatusBadge, type Status } from "./ui";

type Mode = "subset" | "exclusion-trivial" | "exclusion-blocks";
const MODES: { id: Mode; label: string; limit: number; note: string }[] = [
  { id: "subset", label: "Browser exact subset DP", limit: 18, note: "Exhaustive dynamic program over all 2ⁿ prefix sets. Complete proof of optimality; not BLX." },
  { id: "exclusion-trivial", label: "Browser exclusion DP — trivial suffix bound", limit: 22, note: "The exclusion rule f(S)+r(S)+U(V∖S) ≥ L with U(T)=W(T). Exact (Discovery 017 mechanism)." },
  { id: "exclusion-blocks", label: "Browser exclusion DP — block-table hybrid bound", limit: 22, note: "U(T)=W(T)−2Σβ*(T∩Bᵢ): BLX's hybrid bound without the triangle-packing LP. Exact." },
];

interface RunResult {
  ok: boolean; error?: string; opt?: number; order?: number[]; incumbent?: number[]; incumbentScore?: number;
  generated?: number; retained?: number; excluded?: number; certifiedCount?: number | null; ms: number; mode: Mode;
}

function download(name: string, obj: unknown) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const fmt = (x: number | undefined | null) => (x === undefined || x === null ? "—" : Number.isInteger(x) ? String(x) : x.toFixed(8));

function parseBlocks(text: string, n: number): number[][] | string {
  const parts = text.split("|").map((s) => s.trim()).filter(Boolean);
  const blocks = parts.map((p) => p.split(/[\s,]+/).filter(Boolean).map((t) => Number(t) - 1));
  const flat = blocks.flat();
  if (flat.some((v) => !Number.isInteger(v) || v < 0 || v >= n)) return `vertices must be integers 1…${n}`;
  if (new Set(flat).size !== flat.length || flat.length !== n) return "blocks must partition all vertices exactly once";
  if (blocks.some((B) => B.length > 12)) return "browser block tables are limited to blocks of size ≤ 12";
  return blocks;
}
const blocksToText = (b: number[][]) => b.map((B) => B.map((v) => v + 1).join(" ")).join(" | ");

export default function LabApp({ presets }: { presets: Preset[] }) {
  const [source, setSource] = useState<"preset" | "generator">("preset");
  const [presetId, setPresetId] = useState(presets[0].id);
  const [gen, setGen] = useState<{ kind: Generator; n: number; seed: number }>({ kind: "near-transitive", n: 9, seed: 7 });
  const [A, setA] = useState<Matrix>(presets[0].matrix);
  const [edited, setEdited] = useState(false);
  const [mode, setMode] = useState<Mode>("subset");
  const [seed, setSeed] = useState(1);
  const [blockText, setBlockText] = useState("");
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState<RunResult | null>(null);
  const [view, setView] = useState<"ordering" | "graph" | "matrix" | "backward" | "blocks">("ordering");
  const [showOptimized, setShowOptimized] = useState(true);
  const [certState, setCertState] = useState<{ status: Status; msg: string } | null>(null);
  const [jsonText, setJsonText] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const t0 = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const preset = presets.find((p) => p.id === presetId)!;
  const n = A.length;
  const invalid = useMemo(() => validateSkew(A), [A]);
  const modeInfo = MODES.find((m) => m.id === mode)!;
  const blocksParsed = useMemo(() => (blockText.trim() ? parseBlocks(blockText, n) : null), [blockText, n]);
  const startOrder = useMemo(() => {
    const rnd = mulberry32(seed);
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }, [n, seed]);

  const loadMatrix = useCallback((M: Matrix, blocks?: number[][] | null) => {
    setA(M); setRes(null); setCertState(null); setEdited(false);
    setBlockText(blocks ? blocksToText(blocks) : "");
  }, []);

  useEffect(() => {
    if (source === "preset") loadMatrix(preset.matrix, preset.reference.blocks);
  }, [presetId, source]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => workerRef.current?.terminate(), []);

  const run = () => {
    if (invalid) return;
    if (n > modeInfo.limit) { setRes({ ok: false, error: `${modeInfo.label} is limited to n ≤ ${modeInfo.limit} in the browser`, ms: 0, mode }); return; }
    let blocks: number[][] | undefined;
    if (mode === "exclusion-blocks") {
      if (!blocksParsed || typeof blocksParsed === "string") {
        blocks = segmentOrder(A, insertionLocalSearch(A, startOrder), Math.min(6, n));
        setBlockText(blocksToText(blocks));
      } else blocks = blocksParsed;
    }
    workerRef.current?.terminate();
    const w = new Worker(new URL("../lib/worker.ts", import.meta.url));
    workerRef.current = w;
    setRunning(true); setRes(null); t0.current = performance.now();
    const tick = setInterval(() => setElapsed(performance.now() - t0.current), 100);
    w.onmessage = (ev) => {
      clearInterval(tick); setRunning(false); setShowOptimized(true);
      setRes({ ...ev.data, mode });
      w.terminate();
    };
    w.postMessage({ kind: mode === "subset" ? "subset" : "exclusion", A, blocks, start: startOrder });
    (w as Worker & { _tick?: ReturnType<typeof setInterval> })._tick = tick;
  };
  const cancel = () => {
    const w = workerRef.current as (Worker & { _tick?: ReturnType<typeof setInterval> }) | null;
    if (w) { w.terminate(); if (w._tick) clearInterval(w._tick); }
    setRunning(false);
    setRes({ ok: false, error: "cancelled by user", ms: performance.now() - t0.current, mode });
  };

  const status: Status | null = res ? (res.ok ? "PROVED_OPTIMAL" : res.incumbent ? "BEST_FOUND" : "UNRESOLVED") : null;
  const displayOrder = res?.ok && res.order ? (showOptimized ? res.order : startOrder) : startOrder;
  const blocksForView = blocksParsed && typeof blocksParsed !== "string" ? blocksParsed : null;
  const back = backwardArcs(A, displayOrder);

  const verifyPresetCert = async () => {
    setCertState(null);
    try {
      const text = await (await fetch(asset(preset.reference.certificate))).text();
      const cert = parseCertificate(text);
      const r = verifyCertificate(cert, A);
      setCertState({ status: "PROVED_OPTIMAL", msg: `ACCEPTED — certificate bound to the matrix on screen. Verified optimum ${fmt(r.OPT)} (exact integer arithmetic; ${r.kept} retained states, ${r.excludedChecked} exclusion inequalities re-checked).` });
    } catch (e) {
      setCertState({ status: "CERTIFICATE_REJECTED", msg: e instanceof Reject ? `REJECTED — ${e.message}` : `Error — ${(e as Error).message}` });
    }
  };

  const editCell = (i: number, j: number, v: string) => {
    const x = Number(v);
    if (!Number.isFinite(x) || !Number.isInteger(x) || Math.abs(x) > 1e6) return;
    const M = A.map((r) => r.slice());
    M[i][j] = x; M[j][i] = x === 0 ? 0 : -x;
    setA(M); setEdited(true); setRes(null); setCertState(null);
  };

  const loadJson = () => {
    try {
      const d = JSON.parse(jsonText);
      const M: Matrix = Array.isArray(d) ? d : d.matrix;
      const err = validateSkew(M);
      if (err) { alertMsg(err); return; }
      if (M.length > 22) { alertMsg("browser lab accepts n ≤ 22"); return; }
      setSource("generator"); loadMatrix(M);
    } catch { alertMsg("could not parse JSON"); }
  };
  const [msg, setMsg] = useState("");
  const alertMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 5000); };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
      {/* ---------------- INPUT PANEL ---------------- */}
      <aside className="min-w-0 space-y-5">
        <div className="card p-5">
          <p className="kicker mb-3">1 · Instance</p>
          <div className="mb-3 grid grid-cols-2 gap-2" role="tablist">
            {(["preset", "generator"] as const).map((s) => (
              <button key={s} role="tab" aria-selected={source === s} onClick={() => setSource(s)}
                className={`rounded-lg border px-3 py-2 text-sm ${source === s ? "border-cyan-400/60 text-cyan-300" : "border-line text-fog-400"}`}>
                {s === "preset" ? "Preset problem" : "Generate / paste"}
              </button>
            ))}
          </div>
          {source === "preset" ? (
            <>
              <label className="text-xs text-fog-500" htmlFor="preset">Preset (reference results from Python BLX 2.0)</label>
              <select id="preset" value={presetId} onChange={(e) => setPresetId(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-ink-850 px-3 py-2 text-sm">
                {presets.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-fog-500">{preset.description}</p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-3 text-xs text-fog-500" htmlFor="gk">Random family (seeded)</label>
                <select id="gk" value={gen.kind} onChange={(e) => setGen({ ...gen, kind: e.target.value as Generator })} className="col-span-3 rounded-lg border border-line bg-ink-850 px-3 py-2 text-sm">
                  <option value="near-transitive">Near-transitive tournament</option>
                  <option value="random-int">Random integer tournament</option>
                  <option value="cyclic">Regular cyclic tournament</option>
                  <option value="paley">Paley tournament (p ≤ n, p ∈ 3,7,11,19)</option>
                  <option value="blocks">Three frustrated blocks, mixed-sign cross edges</option>
                  <option value="ties">Ties and zero weights</option>
                </select>
                <label className="text-xs text-fog-500">n<input type="number" min={2} max={18} value={gen.n} onChange={(e) => setGen({ ...gen, n: Math.max(2, Math.min(18, Number(e.target.value) || 2)) })} className="mt-1 w-full rounded-lg border border-line bg-ink-850 px-2 py-1.5 font-mono text-sm" /></label>
                <label className="text-xs text-fog-500">seed<input type="number" value={gen.seed} onChange={(e) => setGen({ ...gen, seed: Number(e.target.value) || 0 })} className="mt-1 w-full rounded-lg border border-line bg-ink-850 px-2 py-1.5 font-mono text-sm" /></label>
                <button onClick={() => loadMatrix(generate(gen.kind, gen.n, gen.seed))} className="self-end rounded-lg bg-ink-700 px-2 py-2 text-sm text-fog-100 hover:bg-ink-600">Generate</button>
              </div>
              <label className="text-xs text-fog-500" htmlFor="json">…or paste a JSON matrix ({"{\"matrix\": [[0,2],[-2,0]]}"})</label>
              <textarea id="json" value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={3} className="w-full rounded-lg border border-line bg-ink-850 p-2 font-mono text-xs" />
              <button onClick={loadJson} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fog-300 hover:text-cyan-300">Load JSON</button>
              {msg && <p className="text-xs text-signal-red" role="alert">{msg}</p>}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-line px-2 py-0.5 font-mono text-fog-400">n = {n}</span>
            <span className="rounded border border-line px-2 py-0.5 font-mono text-fog-400">{isIntegerMatrix(A) ? "integer weights · exact JS arithmetic" : "decimal weights · IEEE double arithmetic"}</span>
            {edited && <span className="rounded border border-signal-amber/40 px-2 py-0.5 font-mono text-signal-amber">edited</span>}
          </div>
          {invalid && <p className="mt-2 text-xs text-signal-red" role="alert">{invalid}</p>}
        </div>

        <div className="card p-5">
          <p className="kicker mb-3">2 · Algorithm</p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Algorithm mode</legend>
            {MODES.map((m) => (
              <label key={m.id} className={`block cursor-pointer rounded-lg border p-3 ${mode === m.id ? "border-cyan-400/60 bg-cyan-400/5" : "border-line"}`}>
                <input type="radio" name="mode" className="mr-2 accent-cyan-400" checked={mode === m.id} onChange={() => setMode(m.id)} />
                <span className="text-sm text-fog-100">{m.label}</span>
                <span className="block pl-5 text-xs text-fog-500">{m.note} n ≤ {m.limit}.</span>
              </label>
            ))}
          </fieldset>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-fog-500">incumbent seed
              <input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-line bg-ink-850 px-2 py-1.5 font-mono text-sm" />
            </label>
            <div className="flex items-end gap-2">
              {!running ? (
                <button onClick={run} disabled={!!invalid} className="w-full rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-300 disabled:opacity-40">Run</button>
              ) : (
                <button onClick={cancel} className="w-full rounded-lg border border-signal-red/60 px-3 py-2 text-sm text-signal-red">Cancel ({(elapsed / 1000).toFixed(1)} s)</button>
              )}
            </div>
          </div>
          <label className="mt-3 block text-xs text-fog-500" htmlFor="blk">Ordered block partition (1-based, blocks separated by “|”; used by the hybrid bound; empty = auto-segment)</label>
          <input id="blk" value={blockText} onChange={(e) => setBlockText(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-ink-850 px-2 py-1.5 font-mono text-xs" placeholder="e.g. 1 4 7 | 2 5 | 3 6" />
          {typeof blocksParsed === "string" && <p className="mt-1 text-xs text-signal-red">{blocksParsed}</p>}
        </div>

        <div className="card p-5">
          <p className="kicker mb-3">3 · Edit preferences</p>
          <p className="mb-2 text-xs text-fog-500">Upper triangle shown; a<sub>ji</sub> = −a<sub>ij</sub> is maintained automatically. Integer weights only.</p>
          <div className="max-h-72 overflow-auto">
            <table className="font-mono text-[10px]">
              <tbody>
                {A.map((row, i) => (
                  <tr key={i}>
                    <th className="pr-1 text-fog-500">{i + 1}</th>
                    {row.map((v, j) => (
                      <td key={j} className="p-0.5">
                        {j > i ? (
                          <input aria-label={`a(${i + 1},${j + 1})`} defaultValue={v} key={`${i}-${j}-${v}`} disabled={!isIntegerMatrix(A)}
                            onBlur={(e) => editCell(i, j, e.target.value)} className="w-9 rounded border border-line bg-ink-850 px-1 py-0.5 text-center text-fog-100 disabled:opacity-60" />
                        ) : (
                          <span className="block w-9 text-center text-fog-500/60">{i === j ? "·" : Number.isInteger(v) ? v : v.toFixed(2)}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </aside>

      {/* ---------------- RESULTS ---------------- */}
      <section className="min-w-0 space-y-5" aria-live="polite">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {status ? <StatusBadge status={status} /> : <span className="font-mono text-xs text-fog-500">{running ? "running in a Web Worker…" : "not run yet"}</span>}
              {res && !res.ok && <span className="text-xs text-signal-red">{res.error}</span>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button onClick={() => download("instance.json", { matrix: A, blocks: blocksForView })} className="rounded-lg border border-line px-3 py-1.5 text-fog-300 hover:text-cyan-300">Instance JSON ↓</button>
              {res?.ok && (
                <button onClick={() => download("solution.json", { solver: modeInfo.label, status, objective: res.opt, order: res.order!.map((v) => v + 1),
                  backward_weight: backwardWeight(A, res.order!), incumbent_order: res.incumbent!.map((v) => v + 1), incumbent_objective: res.incumbentScore,
                  states: { generated: res.generated, retained: res.retained, excluded: res.excluded }, certified_pairs: res.certifiedCount, time_ms: res.ms,
                  note: "Computed in the browser. Vertex labels are 1-based." })} className="rounded-lg border border-line px-3 py-1.5 text-fog-300 hover:text-cyan-300">Solution JSON ↓</button>
              )}
            </div>
          </div>
          {res?.ok && (
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Objective before → after" value={<>{fmt(score(A, startOrder))} → <span className="text-cyan-300">{fmt(res.opt)}</span></>} hint="F_A of start order → optimum" />
              <Stat label="Backward weight" value={fmt(backwardWeight(A, res.order!))} hint={`incumbent: ${fmt(backwardWeight(A, res.incumbent!))}`} />
              <Stat label="Solver used" value={<span className="text-sm">{modeInfo.label}</span>} hint="exact · runs in your browser" />
              <Stat label="Time" value={`${res.ms.toFixed(1)} ms`} hint="includes local search" />
              <Stat label="States generated" value={res.generated?.toLocaleString()} />
              <Stat label="Retained / excluded" value={`${res.retained?.toLocaleString()} / ${res.excluded?.toLocaleString()}`} hint={mode === "subset" ? "subset DP excludes nothing" : "exclusion rule"} />
              <Stat label="Forced precedences" value={res.certifiedCount === null || res.certifiedCount === undefined ? "n > 14" : `${res.certifiedCount} / ${(n * (n - 1)) / 2}`} hint="hold in every optimum" />
              <Stat label="Certificate" value={<span className="text-sm">{source === "preset" && !edited ? "Python BLX cert. ↓" : "none (browser run)"}</span>} hint="browser proof = exhaustive search" />
            </div>
          )}
          {res?.ok && (
            <p className="mt-4 text-xs leading-relaxed text-fog-500">
              PROVED OPTIMAL here means the browser DP completed: every ordering scoring at least the incumbent keeps all its prefixes, so the DP value is the global optimum.
              This browser engine is <strong className="text-fog-300">not</strong> the BLX 2.0 implementation (which adds triangle-packing LPs and portfolio routing in Python).
            </p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Views">
              {(["ordering", "graph", "matrix", "backward", "blocks"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-sm ${view === v ? "bg-ink-700 text-cyan-300" : "text-fog-400 hover:text-fog-100"}`}>
                  {{ ordering: "Ordering", graph: "Directed graph", matrix: "Weight matrix", backward: "Backward edges", blocks: "Blocks" }[v]}
                </button>
              ))}
            </div>
            {res?.ok && (
              <div className="flex gap-1 text-xs">
                <button onClick={() => setShowOptimized(false)} className={`rounded-lg border px-3 py-1.5 ${!showOptimized ? "border-cyan-400/60 text-cyan-300" : "border-line text-fog-400"}`}>Original order</button>
                <button onClick={() => setShowOptimized(true)} className={`rounded-lg border px-3 py-1.5 ${showOptimized ? "border-cyan-400/60 text-cyan-300" : "border-line text-fog-400"}`}>Optimized order</button>
              </div>
            )}
          </div>
          <p className="mt-3 font-mono text-xs text-fog-500">
            Showing {res?.ok && showOptimized ? "optimized" : "start (seeded shuffle)"} order: [{displayOrder.map((v) => v + 1).join(", ")}] · F = {fmt(score(A, displayOrder))} · backward weight = {fmt(backwardWeight(A, displayOrder))}
          </p>
          <div className="mt-4">
            {view === "ordering" && <OrderingDiagram A={A} order={displayOrder} blocks={blocksForView} />}
            {view === "graph" && <GraphCircle A={A} order={displayOrder} blocks={blocksForView} />}
            {view === "matrix" && <MatrixView A={A} order={displayOrder} blocks={blocksForView} />}
            {view === "backward" && (
              <div className="overflow-x-auto">
                <p className="mb-2 text-sm text-fog-400">{back.length} backward arc(s), total weight {fmt(back.reduce((s, [, , w]) => s + w, 0))} = backward weight β<sub>A</sub>(π).</p>
                <table className="w-full font-mono text-xs">
                  <thead><tr className="text-left text-fog-500"><th className="py-1">arc u → v (a_uv &gt; 0)</th><th>weight</th><th>positions (u, v)</th></tr></thead>
                  <tbody>
                    {back.map(([u, v, w]) => (
                      <tr key={`${u}-${v}`} className="border-t border-line/50"><td className="py-1 text-signal-red">{u + 1} → {v + 1}</td><td>{fmt(w)}</td><td>{displayOrder.indexOf(u) + 1}, {displayOrder.indexOf(v) + 1}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {view === "blocks" && (
              blocksForView ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {blocksForView.map((B, i) => (
                      <div key={i} className="rounded-lg border px-3 py-2 font-mono text-sm" style={{ borderColor: blockColor(i) }}>
                        <span className="text-fog-500">B{i + 1}:</span> {B.map((v) => v + 1).join(", ")}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-fog-400">Blocks are ordered left to right. Arcs between blocks that point from a later to an earlier block are the reversed cross weight X in the theorem.</p>
                </div>
              ) : <p className="text-sm text-fog-400">No block partition. Choose the hybrid-bound mode (auto-segments the incumbent) or type a partition.</p>
            )}
          </div>
        </div>

        {source === "preset" && (
          <div className="card p-5">
            <p className="kicker mb-3">Reference: Python BLX 2.0 on this preset</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Status" value={<span className="text-sm text-signal-green">{preset.reference.status.replace("_", " ")}</span>} hint="hybrid exclusion DP, full bound" />
              <Stat label="Optimum" value={fmt(preset.reference.OPT)} hint={`subset DP: ${fmt(preset.reference.exact_subset_dp)}`} />
              <Stat label="States gen. / kept" value={`${preset.reference.generated} / ${preset.reference.retained}`} />
              <Stat label="Portfolio route (auto)" value={preset.reference.auto_route} />
              <Stat label="Theorem K, b" value={`${preset.reference.theorem.K ?? "—"}, ${preset.reference.theorem.b ?? "—"}`} hint="for the segmented partition" />
              <Stat label="Forced precedences" value={`${preset.reference.certified_pairs} / ${preset.reference.total_pairs}`} />
              <Stat label="Optimal order" value={<span className="text-xs">[{preset.reference.order.map((v) => v + 1).join(", ")}]</span>} />
              <Stat label="Python verifier" value={preset.reference.certificate_python_verified ? "accepted" : "—"} hint={`${preset.reference.python_verify_s}s`} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={verifyPresetCert} className="rounded-lg bg-ink-700 px-4 py-2 text-sm text-fog-100 hover:bg-ink-600">Verify the BLX certificate in this browser</button>
              <a href={asset(preset.reference.certificate)} download className="rounded-lg border border-line px-3 py-2 text-sm text-fog-300 hover:text-cyan-300">Certificate JSON ↓</a>
              {certState && <StatusBadge status={certState.status} />}
            </div>
            {certState && <p className={`mt-3 text-sm ${certState.status === "CERTIFICATE_REJECTED" ? "text-signal-red" : "text-fog-300"}`}>{certState.msg}</p>}
            {edited && <p className="mt-2 text-xs text-signal-amber">You edited the matrix, so the certificate (which is bound to the original instance) is expected to be rejected.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
