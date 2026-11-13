"use client";
/**
 * Solver workspace: problem profile, explained recommendation, and the control center (Beginner / Advanced).
 * Every control maps to a real engine option (runner.ts SolveConfig / AtlasSettings).
 */
import Link from "next/link";
import type { ProblemProfile } from "@/lib/studio/analysis";
import type { Problem } from "@/lib/studio/model";
import { ATLAS_DEFAULTS } from "@/lib/studio/runner";
import type { Recommendation } from "@/lib/studio/select";
import type { StudioSettings } from "@/lib/studio/session";
import { SOLVERS, type SolverId } from "@/lib/studio/solvers";
import RemotePanel from "./RemotePanel";
import { Metric, Panel, Term, Toggle, fmtInt } from "./ui";

export type AtlasCfg = StudioSettings["atlas"];

export interface SolverProps {
  p: Problem | null;
  profile: ProblemProfile | null;
  rec: Recommendation | null;
  solver: SolverId;
  chooseSolver: (s: SolverId) => void;
  useRecommended: () => void;
  mode: "beginner" | "advanced"; setMode: (m: "beginner" | "advanced") => void;
  timeLimit: number; setTimeLimit: (s: number) => void;
  seed: number; setSeed: (s: number) => void;
  bfCheck: boolean; setBfCheck: (b: boolean) => void;
  atlasCfg: AtlasCfg; setAtlasCfg: (f: (c: AtlasCfg) => AtlasCfg) => void;
  autoVerify: boolean; setAutoVerify: (b: boolean) => void;
  verifyBudget: number; setVerifyBudget: (n: number) => void;
  running: boolean;
  memoryNote: string | null;
}

const DIFF_TONE: Record<string, "green" | "accent" | "amber" | "back"> = { trivial: "green", easy: "green", moderate: "accent", hard: "amber", "very hard": "back" };
const PLAIN: Record<SolverId, string> = {
  "subset-dp": "Checks every possible prefix of the ordering. Always exact, but only for small problems.",
  exclusion: "Exact search that skips prefixes which provably cannot beat a good starting ordering.",
  autocut: "Exact solver for up to 9 items that also finds the problem's block structure.",
  atlas: "Splits the problem into independent parts and solves each exactly; reports a proven gap if it runs out of time.",
  heuristic: "Quickly finds a good ordering by repeated local improvement. Never proves it is the best.",
};

export default function SolverWorkspace(props: SolverProps) {
  const { p, profile, rec, solver } = props;
  const info = SOLVERS.find((s) => s.id === solver)!;
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <div className="space-y-4 min-w-0">
        {profile && rec ? <Profile profile={profile} rec={rec} solver={solver} useRecommended={props.useRecommended} /> : <Panel title="Problem profile"><p className="ws-sub">Load a valid problem to see its structure and a recommended solver.</p></Panel>}
        <Panel id="control" title="Solver control center" sub={props.mode === "beginner" ? "The recommended exact method is selected for you. Switch to Advanced for every engine option." : "Every option below is passed to the engine as shown and recorded in exports."}
          actions={
            <div className="flex rounded-md border p-0.5" style={{ borderColor: "var(--ws-line-strong)" }} role="radiogroup" aria-label="Configuration mode">
              {(["beginner", "advanced"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={props.mode === m} data-testid={`mode-${m}`} onClick={() => props.setMode(m)}
                  className="rounded px-2.5 py-1 text-[12.5px] font-medium" style={{ background: props.mode === m ? "var(--ws-raised)" : "transparent", color: props.mode === m ? "var(--ws-text)" : "var(--ws-muted)" }}>
                  {m === "beginner" ? "Beginner" : "Advanced"}
                </button>
              ))}
            </div>}>
          <fieldset disabled={props.running} className="space-y-4">
            <legend className="sr-only">Solver selection</legend>
            <div className="grid gap-2" role="radiogroup" aria-label="Solver">
              {SOLVERS.map((s) => {
                const tooBig = p ? p.n > s.maxN : false;
                const recommended = rec?.solver === s.id;
                return (
                  <label key={s.id} className="flex cursor-pointer gap-3 rounded-md border p-3"
                    style={{ borderColor: solver === s.id ? "var(--ws-accent)" : "var(--ws-line)", background: solver === s.id ? "color-mix(in srgb, var(--ws-accent) 8%, transparent)" : "transparent", opacity: tooBig ? 0.72 : 1 }}>
                    <input type="radio" name="solver" value={s.id} checked={solver === s.id} onChange={() => props.chooseSolver(s.id)} className="ws-check mt-0.5" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold ws-text">
                        {s.label}
                        <span className={`ws-chip ${s.exact ? "ws-green" : "ws-amber"}`}>{s.exact ? "exact" : "heuristic"}</span>
                        <span className="num text-[11px] font-normal ws-faint">n ≤ {s.maxN}</span>
                        {recommended && <span className="ws-chip ws-accent">recommended</span>}
                      </span>
                      <span className="ws-sub mt-0.5 block">{props.mode === "beginner" ? PLAIN[s.id] : s.summary}</span>
                      {tooBig && p && <span className="mt-0.5 block text-[12px] ws-back">This solver supports n ≤ {s.maxN} (instance has {p.n}).</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            {props.mode === "beginner" ? (
              <div>
                <p className="ws-lbl">How long may it run?</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Time limit">
                  {[5, 30, 120, 600].map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={props.timeLimit === t} onClick={() => props.setTimeLimit(t)} className="ws-btn px-3 py-1.5"
                      style={props.timeLimit === t ? { borderColor: "var(--ws-accent)", color: "var(--ws-accent-strong)" } : undefined}>{t < 60 ? `${t} s` : `${t / 60} min`}</button>
                  ))}
                </div>
                <p className="ws-sub mt-2">If an exact search does not finish in time you still get the best ordering found{info.id === "atlas" ? ", with a proven bound on how far from optimal it can be" : ""}. Nothing is labelled optimal unless it was proved.</p>
              </div>
            ) : (
              <Advanced {...props} />
            )}
          </fieldset>
        </Panel>
      </div>
      <div className="space-y-4 min-w-0">
        <MethodNotes />
        <RemotePanel problem={p} />
      </div>
    </div>
  );
}

function Profile({ profile: pr, rec, solver, useRecommended }: { profile: ProblemProfile; rec: Recommendation; solver: SolverId; useRecommended: () => void }) {
  const label = SOLVERS.find((s) => s.id === rec.solver)?.label ?? rec.solver;
  const maxBar = pr.componentSizes[0] || 1;
  const shown = pr.componentSizes.filter((s) => s > 1);
  return (
    <Panel id="profile" title="Problem profile" sub="Measured from the loaded data before solving.">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="problem-profile">
        <Metric label="Items" value={fmtInt(pr.n)} />
        <Metric label={<Term def="Share of item pairs with a nonzero margin a_ij.">Density</Term>} value={`${(pr.density * 100).toFixed(0)}%`} hint={`${fmtInt(pr.nonzeroPairs)} of ${fmtInt(pr.pairs)} pairs`} />
        <Metric label={<Term def="Strongly connected components of the strict preference graph (u → v when a_uv > 0). Each can be solved separately without losing optimality.">Strong components</Term>} value={fmtInt(pr.components)} hint={`largest ${pr.largest}`} />
        <Metric label={<Term def="Pairs with a_ij = 0: either order scores the same.">Ties</Term>} value={fmtInt(pr.zeroPairs)} hint={pr.tournament ? "every pair is decided" : "zero-margin pairs"} />
        <Metric label={<Term def="Integer arithmetic below 2^53 is required for any optimality proof or certificate.">Arithmetic</Term>} value={pr.integral ? "exact" : "floating"} tone={pr.integral ? undefined : "amber"} hint={pr.integral ? `scale ${pr.scale}` : "no certification possible"} />
        <Metric label="Largest |entry|" value={fmtInt(pr.maxAbsEntry)} hint="in scaled integer units" />
        <Metric label={<Term def="A class based on the ATLAS-032 benchmark conditions (30 s, one thread), not a runtime prediction.">Difficulty class</Term>} value={pr.difficulty} tone={DIFF_TONE[pr.difficulty]} testId="difficulty" />
        <Metric label="Exact solvers that accept it" value={String(pr.exactSolvers.length)} hint={pr.exactSolvers.join(", ") || "none"} />
      </div>
      <p className="ws-sub mt-2">{pr.difficultyReason}</p>
      {shown.length > 1 && (
        <div className="mt-3">
          <p className="ws-lbl">Component sizes (non-trivial, largest first)</p>
          <div className="mt-1.5 flex h-10 items-end gap-[2px]" role="img" aria-label={`Component sizes: ${shown.slice(0, 40).join(", ")}`}>
            {shown.slice(0, 80).map((s, i) => <div key={i} title={`${s} items`} style={{ height: `${Math.max(8, (s / maxBar) * 100)}%`, flex: "1 1 0", maxWidth: 14, background: "var(--ws-violet)", opacity: 0.75, borderRadius: 2 }} />)}
          </div>
        </div>
      )}
      <div className="mt-4 rounded-md border p-3" data-testid="recommendation" style={{ borderColor: "color-mix(in srgb, var(--ws-accent) 40%, transparent)", background: "color-mix(in srgb, var(--ws-accent) 6%, transparent)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13.5px] font-semibold ws-text">Recommended: {label}</p>
          {solver !== rec.solver && <button type="button" className="ws-btn px-2 py-1 text-[12px]" onClick={useRecommended}>Use recommended</button>}
        </div>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed ws-muted">{rec.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
        {rec.warnings.length > 0 && <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12.5px] leading-relaxed ws-amber">{rec.warnings.map((x) => <li key={x}>{x}</li>)}</ul>}
      </div>
    </Panel>
  );
}

function Advanced(props: SolverProps) {
  const { atlasCfg: cfg, setAtlasCfg } = props;
  const set = <K extends keyof AtlasCfg>(k: K, v: AtlasCfg[K]) => setAtlasCfg((c) => ({ ...c, [k]: v }));
  const atlas = props.solver === "atlas";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="ws-lbl" htmlFor="tl">Time limit (s)</label>
          <input id="tl" type="number" min={0.1} max={600} step={0.1} value={props.timeLimit} className="ws-field num mt-1"
            onChange={(e) => props.setTimeLimit(Math.max(0.1, Math.min(600, Math.round((Number(e.target.value) || 1) * 10) / 10)))} />
          <p className="ws-sub mt-1">A watchdog terminates the worker 3 s after the limit.</p>
        </div>
        <div>
          <label className="ws-lbl" htmlFor="seed">Random seed</label>
          <input id="seed" type="number" min={1} max={1_000_000} value={props.seed} className="ws-field num mt-1"
            onChange={(e) => props.setSeed(Math.max(1, Math.min(1_000_000, Math.round(Number(e.target.value) || 1))))} />
          <p className="ws-sub mt-1">Seeds local search (incumbents and the heuristic).</p>
        </div>
      </div>
      <fieldset className="space-y-3 rounded-md border p-3" style={{ borderColor: "var(--ws-line)" }} data-testid="atlas-settings" disabled={!atlas || props.running}>
        <legend className="px-1 text-[12.5px] font-semibold ws-text">ATLAS-032 engine {atlas ? "" : "(select ATLAS to use these)"}</legend>
        <div>
          <label className="ws-lbl" htmlFor="atlas-bound"><Term def="Lower bound on the backward weight of the remaining items, used to prune prefixes (PROOFS.md Lemmas 1–5).">Directed-cycle packing</Term></label>
          <select id="atlas-bound" className="ws-field mt-1" value={cfg.bound} onChange={(e) => set("bound", e.target.value as AtlasCfg["bound"])}>
            <option value="cycles">Fractional triangles + longer cycles (default)</option>
            <option value="fractional">Fractional triangle packing</option>
            <option value="greedy">Greedy triangle packing</option>
            <option value="none">None (ATLAS-031 rule)</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="ws-lbl" htmlFor="atlas-states">Search-state budget per component</label>
            <input id="atlas-states" type="number" min={1000} max={4_000_000} step={1000} className="ws-field num mt-1" value={cfg.maxStates}
              onChange={(e) => set("maxStates", Math.max(1000, Math.min(4_000_000, Math.round(Number(e.target.value) || 1000))))} />
            <p className="ws-sub mt-1">Caps memory. Exhausting it ends that component&apos;s search with a rigorous gap.{props.memoryNote ? ` ${props.memoryNote}` : ""}</p>
          </div>
          <div>
            <label className="ws-lbl" htmlFor="atlas-inc">Incumbent search per component (ms)</label>
            <input id="atlas-inc" type="number" min={0} max={10_000} placeholder="automatic (size-dependent)" className="ws-field num mt-1" value={cfg.incumbentMs ?? ""}
              onChange={(e) => set("incumbentMs", e.target.value === "" ? null : Math.max(0, Math.min(10_000, Math.round(Number(e.target.value)))))} />
          </div>
        </div>
        <Toggle id="atlas-strict" checked={cfg.strict} onChange={(v) => set("strict", v)} hint="Prune at β ≥ incumbent, so a good incumbent is proved rather than re-found (integral input only).">Strict optimality proving</Toggle>
        <Toggle id="atlas-dec" checked={cfg.decompose} onChange={(v) => set("decompose", v)} hint="Exact; turning it off is only useful for ablation studies.">Strong-component decomposition</Toggle>
        <Toggle id="atlas-cert" checked={cfg.certificate} onChange={(v) => set("certificate", v)} hint="Produced only for proved results on exact integer models.">Certificate generation</Toggle>
        <button type="button" className="ws-btn ws-btn-ghost px-2 py-1 text-[12px]" onClick={() => setAtlasCfg(() => ({ ...ATLAS_DEFAULTS }))}>Restore ATLAS defaults</button>
      </fieldset>
      <fieldset className="space-y-3 rounded-md border p-3" style={{ borderColor: "var(--ws-line)" }}>
        <legend className="px-1 text-[12.5px] font-semibold ws-text">Verification</legend>
        <Toggle id="bf" checked={props.bfCheck} onChange={props.setBfCheck} hint="Enumerates all n! orderings; at most 362 880.">Independent exhaustive check when n ≤ 9</Toggle>
        <Toggle id="autoverify" checked={props.autoVerify} onChange={props.setAutoVerify} hint="Runs the separate BigInt verifier in its own worker as soon as a certificate exists.">Verify certificates automatically</Toggle>
        <div>
          <label className="ws-lbl" htmlFor="verify-budget">Verifier state budget</label>
          <input id="verify-budget" type="number" min={1000} max={10_000_000} step={1000} className="ws-field num mt-1 sm:w-1/2" value={props.verifyBudget}
            onChange={(e) => props.setVerifyBudget(Math.max(1000, Math.min(10_000_000, Math.round(Number(e.target.value) || 1000))))} />
          <p className="ws-sub mt-1">If the verifier needs more states, its verdict is UNDECIDED, never accepted.</p>
        </div>
      </fieldset>
    </div>
  );
}

function MethodNotes() {
  return (
    <Panel title="What each status means" sub="The Studio never upgrades a status.">
      <dl className="space-y-2 text-[12.5px]">
        <div><dt className="font-semibold ws-green">Proven optimal</dt><dd className="ws-muted">An exact solver completed in exact integer arithmetic.</dd></div>
        <div><dt className="font-semibold ws-amber">Feasible — not proven optimal</dt><dd className="ws-muted">A valid ordering without a proof (heuristic, or floating-point model).</dd></div>
        <div><dt className="font-semibold ws-amber">Interrupted — not proven optimal</dt><dd className="ws-muted">An exact search stopped at its time or state budget; ATLAS still reports a rigorous gap.</dd></div>
        <div><dt className="font-semibold ws-back">Invalid or failed</dt><dd className="ws-muted">No valid result (time limit hit before any ordering, worker crash, invalid input).</dd></div>
      </dl>
      <p className="ws-sub mt-3">Browser solvers are TypeScript programs; none is the Lean-verified executable. <Link className="ws-accent underline" href="/docs/#atlas">ATLAS settings reference</Link> · <Link className="ws-accent underline" href="/benchmarks/">benchmark conditions</Link>.</p>
    </Panel>
  );
}
