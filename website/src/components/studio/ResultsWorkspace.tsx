"use client";
/**
 * Results workspace: outcome, proof information, computational information, the ordering, exports.
 * Every number is the exact recomputation from report.ts (makeResult) or the engine's own counters.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { maximises, type Problem } from "@/lib/studio/model";
import { parseQ, Q } from "@/lib/studio/rational";
import { backwardReduction, improvement, resultCsv, resultJson, resultMarkdown, STUDIO_VERSION, type SolveResult } from "@/lib/studio/report";
import { download } from "@/lib/studio/client";
import { totalWeight } from "@/lib/studio/model";
import { Metric, Panel, StatusPill, STATUS_UI, Term, fmtInt, fmtMs, fmtQ, type StatusKind } from "./ui";

export interface RunRecord { solver: string; status: string; objective: string; bound: string | null; gap: string | null; ms: number; states: string; certificate: boolean; settings: string }

export function runRecord(r: SolveResult): RunRecord {
  const states = r.details["exact states (all components)"] ?? r.details["prefix states"] ?? r.details["prefix states generated"] ?? r.details["reachable cuts"] ?? "—";
  return {
    solver: r.solverLabel, status: r.status, objective: r.objective.toDecimal(4),
    bound: r.atlas?.objectiveBound ? parseQ(r.atlas.objectiveBound)!.toDecimal(4) : null,
    gap: r.atlas?.gap ? parseQ(r.atlas.gap)!.toDecimal(4) : r.status === "OPTIMAL" ? "0" : null,
    ms: r.runtimeMs, states: String(states), certificate: !!r.atlas?.certificate,
    settings: `${r.config.timeLimitMs / 1000} s, seed ${r.config.seed}${r.atlas ? `, ${r.atlas.settings.bound}${r.atlas.settings.strict ? ", strict" : ""}${r.atlas.settings.decompose ? "" : ", no decomposition"}` : ""}`,
  };
}

export interface ResultsProps {
  p: Problem;
  r: SolveResult;
  stale: boolean;
  base: string;
  runs: RunRecord[];
  useAsInitial: () => void;
  exportBundle: () => void;
  openVerification: () => void;
  verdictLabel: string | null;
}

type Tab = "ordering" | "search" | "structure" | "details";

export default function ResultsWorkspace({ p, r, stale, base, runs, useAsInitial, exportBundle, openVerification, verdictLabel }: ResultsProps) {
  const [tab, setTab] = useState<Tab>(r.structure ? "structure" : "ordering");
  const imp = improvement(p, r.initialObjective, r.objective);
  const v = r.verification;
  const verified = v.permutation && v.objectiveRecomputed && v.identityHolds && v.bruteForce?.agrees !== false && v.crossCheck?.agrees !== false;
  const status = (r.status as StatusKind) in STATUS_UI ? (r.status as StatusKind) : "FAILED";
  const dir = maximises(p) ? "maximise" : "minimise";
  const W = useMemo(() => totalWeight(p), [p]);
  const forward = W.sub(r.backwardFinal);
  const bred = backwardReduction(r.backwardInitial, r.backwardFinal);
  const a = r.atlas;
  const posInit = useMemo(() => new Map(p.initialOrder.map((x, i) => [x, i])), [p]);
  const states = r.details["exact states (all components)"] ?? r.details["prefix states"] ?? r.details["prefix states generated"] ?? r.details["reachable cuts"] ?? null;
  const pruned = r.details["states pruned"] ?? r.details["excluded"] ?? null;
  const relGap = a?.gap && a.objectiveBound ? (() => {
    const g = parseQ(a.gap)!;
    if (g.isZero()) return "0%";
    // a relative gap is only meaningful when the objective and the bound have the same strict sign
    const ob = parseQ(a.objectiveBound)!;
    if (r.objective.sign() === 0 || r.objective.sign() !== ob.sign()) return "not meaningful (objective and bound differ in sign or are zero)";
    return `${(Number(g.toDecimal(12)) / Math.abs(Number(r.objective.toDecimal(12))) * 100).toFixed(3)}% of |objective|`;
  })() : null;
  const proofMethod = r.status !== "OPTIMAL" ? "none (no completed exact search)"
    : r.solver === "atlas" ? `strong-component decomposition + ${[...new Set(a!.components.filter((c) => c.size > 1).map((c) => c.method))].join("; ") || "trivial components"}`
    : r.solver === "autocut" ? "AutoCut structural dynamic program (exact rational arithmetic)"
    : r.solver === "subset-dp" ? "exhaustive dynamic program over all prefix sets" : r.solver === "exclusion" ? "exclusion DP with an admissible block bound" : "—";

  return (
    <div className="space-y-4" data-testid="results">
      {stale && (
        <div className="ws-panel px-4 py-2.5 text-[13px] ws-amber" role="status">The problem has changed since this run. These results describe the earlier instance; run again to update them.</div>
      )}
      <Panel id="outcome" title="Optimization outcome">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={status} testId="status-badge" />
          {verified && <span data-testid="verified-badge" className="ws-chip ws-text">Verification passed</span>}
          {verdictLabel && <span className="ws-chip ws-green" data-testid="verdict-chip">{verdictLabel}</span>}
          <span className="ws-chip">Browser solver · not the Lean-verified executable</span>
        </div>
        <p className="ws-sub mt-2 text-[13px]" data-testid="status-note">{r.statusNote}.</p>
        <p className="ws-faint mt-0.5 text-[12px]">{STATUS_UI[status].explain}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
          <Metric label={`Best objective (${dir})`} value={fmtQ(r.objective)} testId="objective" tone="accent" />
          <Metric label="Initial order" value={fmtQ(r.initialObjective)} testId="initial-objective" />
          <Metric label="Improvement" value={`${imp.absolute.sign() >= 0 ? "+" : ""}${imp.absolute.toDecimal(4)}`} hint={imp.percent !== null ? `${imp.percent.toFixed(2)}% ${imp.note}` : imp.note} />
          <Metric label="Runtime" value={fmtMs(r.runtimeMs)} hint={r.solverLabel} />
        </div>
        <div className="mt-3">
          <p className="ws-lbl"><Term def="Forward weight: Σ |a_ij| over pairs the ordering satisfies. Backward weight β: Σ |a_ij| over pairs it places against their margin. Forward + backward = W, and F_A = forward − backward.">Forward versus backward weight</Term> (units of A)</p>
          <WeightBar forward={forward} backward={r.backwardFinal} />
          <p className="ws-sub mt-1">Backward weight β {r.backwardInitial.toDecimal(4)} → {r.backwardFinal.toDecimal(4)}{bred !== null ? ` (${bred.toFixed(2)}% lower than the initial order)` : " (the initial order already had β = 0)"}.</p>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel id="proof" title="Proof information">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="ws-muted">Optimality</dt><dd className={r.status === "OPTIMAL" ? "ws-green" : "ws-amber"}>{r.status === "OPTIMAL" ? "proved" : "not proved"}</dd>
            {a?.objectiveBound ? (<>
              <dt className="ws-muted">Rigorous {maximises(p) ? "upper" : "lower"} bound</dt><dd className="num" data-testid="objective-bound">{fmtQ(parseQ(a.objectiveBound)!)}</dd>
              <dt className="ws-muted">Absolute gap</dt><dd className="num" data-testid="gap">{parseQ(a.gap!)!.isZero() ? "0 (proved)" : fmtQ(parseQ(a.gap!)!)}</dd>
              <dt className="ws-muted">Relative gap</dt><dd>{relGap}</dd>
              <dt className="ws-muted">Bound on β*</dt><dd className="num">{fmtQ(parseQ(a.lowerBoundBeta!)!)} (returned ordering: {r.backwardFinal.toDecimal(4)})</dd>
            </>) : (<>
              <dt className="ws-muted">Rigorous bound</dt><dd>{r.status === "OPTIMAL" ? "the proved optimum itself" : a ? "none: the model is not in exact integer arithmetic" : "none: this solver does not compute bounds"}</dd>
            </>)}
            <dt className="ws-muted">Proof method</dt><dd>{proofMethod}</dd>
            <dt className="ws-muted">Certificate</dt><dd>{a?.certificate ? <button type="button" className="ws-accent underline" onClick={openVerification}>available — open in Verification</button> : a ? a.certificateNote : "not produced by this solver"}</dd>
          </dl>
          <ul className="mt-3 space-y-1 text-[12.5px]" data-testid="verification">
            <Check ok={v.permutation}>valid permutation of all {p.n} items</Check>
            <Check ok={v.objectiveRecomputed && v.identityHolds}>objective recomputed exactly from the input; F_A identity holds</Check>
            {v.bruteForce && <Check ok={v.bruteForce.agrees}>exhaustive enumeration of {v.bruteForce.orderings.toLocaleString("en-US")} orderings: optimum {v.bruteForce.agrees ? "attained" : "NOT attained"} ({v.bruteForce.optimalOrderings} optimal)</Check>}
            {v.crossCheck && <Check ok={v.crossCheck.agrees}>cross-checked with the {v.crossCheck.method}</Check>}
            {!v.bruteForce && !v.crossCheck && <li className="ws-faint">no independent optimality check was run for this size or solver</li>}
          </ul>
        </Panel>
        <Panel id="compute" title="Computational information">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="ws-muted">Solver</dt><dd>{r.solverLabel}</dd>
            <dt className="ws-muted">Runtime</dt><dd className="num">{fmtMs(r.runtimeMs)}</dd>
            <dt className="ws-muted">States explored</dt><dd className="num">{states === null ? "—" : typeof states === "number" ? fmtInt(states) : String(states)}</dd>
            <dt className="ws-muted">States pruned</dt><dd className="num">{pruned === null ? "—" : typeof pruned === "number" ? fmtInt(pruned) : String(pruned)}</dd>
            {a && <><dt className="ws-muted">Decomposition</dt><dd>{a.settings.decompose ? `${a.components.length} strong component${a.components.length === 1 ? "" : "s"} (largest ${Math.max(...a.components.map((c) => c.size), 0)})` : "off"}</dd></>}
            <dt className="ws-muted">Resource limits</dt><dd className="num">{r.config.timeLimitMs / 1000} s{a ? ` · ${fmtInt(a.settings.maxStates)} states per component` : ""} · seed {r.config.seed}</dd>
            <dt className="ws-muted">Interruption</dt><dd>{r.status === "INTERRUPTED" ? r.statusNote.replace(/^exact search stopped without proof \((.*)\);.*$/, "$1") : "none"}</dd>
          </dl>
        </Panel>
      </div>

      <Panel id="result-views" title="Ordering and diagnostics" actions={
        <div className="ws-noprint flex flex-wrap gap-1.5">
          <button type="button" className="ws-btn" data-testid="export-json" onClick={() => download(`${base}.json`, JSON.stringify(resultJson(p, r), null, 2), "application/json")}>Export JSON</button>
          <button type="button" className="ws-btn" data-testid="export-csv" onClick={() => download(`${base}-order.csv`, resultCsv(p, r), "text/csv")}>Export CSV</button>
          <button type="button" className="ws-btn" onClick={() => download(`${base}-report.md`, resultMarkdown(p, r), "text/markdown")}>Report (.md)</button>
          <button type="button" className="ws-btn" data-testid="export-bundle" onClick={exportBundle}>Reproducibility bundle</button>
          <button type="button" className="ws-btn ws-btn-ghost" onClick={() => window.print()}>Print</button>
          <button type="button" className="ws-btn ws-btn-ghost" onClick={useAsInitial} title="The ordering becomes the initial order: the baseline for improvement and the starting point of local search and the exclusion DP.">Reuse as starting order</button>
        </div>}>
        <div className="ws-tabs" role="tablist" aria-label="Result views">
          {([["ordering", "Ordering"], ["search", "Search"], ["structure", "Structure"], ["details", "Run details"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className="ws-tab" onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="mt-3">
          {tab === "ordering" && (
            <div className="ws-scroll max-h-[460px] overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
              <table className="ws-table" data-testid="ordering-table">
                <thead><tr><th>Position</th><th>Item</th><th>Initial position</th><th>Move</th></tr></thead>
                <tbody>{r.order.map((x, i) => {
                  const d = posInit.get(x)! - i;
                  return <tr key={x}><td className="num">{i + 1}</td><td className="font-medium">{p.names[x]}</td><td className="num ws-muted">{posInit.get(x)! + 1}</td>
                    <td className={`num ${d > 0 ? "ws-accent" : d < 0 ? "ws-back" : "ws-faint"}`}>{d > 0 ? `↑ ${d}` : d < 0 ? `↓ ${-d}` : "—"}</td></tr>;
                })}</tbody>
              </table>
            </div>
          )}
          {tab === "search" && (a ? (
            <div data-testid="search-view">
              <p className="ws-sub mb-2">Bound <span className="num">{a.settings.bound}</span> · strict {a.settings.strict ? "on" : "off"} · decomposition {a.settings.decompose ? "on" : "off"} · state budget {fmtInt(a.settings.maxStates)} per component. Root bound: the packing lower bound on the component&apos;s backward weight before search (scaled integer units).</p>
              <div className="ws-scroll max-h-[420px] overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
                <table className="ws-table">
                  <thead><tr><th>#</th><th>Size</th><th>Method</th><th>Proved</th><th>States</th><th>Pruned</th><th>Root bound</th><th>Time</th></tr></thead>
                  <tbody>{a.components.map((c, i) => c.size > 1 || a.components.length <= 30 ? (
                    <tr key={i}><td className="num">{i + 1}</td><td className="num">{c.size}</td><td>{c.method}</td>
                      <td className={c.optimal ? "ws-green" : "ws-amber"}>{c.optimal ? "yes" : "no"}</td>
                      <td className="num">{fmtInt(c.states)}</td><td className="num">{c.pruned !== null ? fmtInt(c.pruned) : "—"}</td>
                      <td className="num">{c.rootLB !== null ? c.rootLB.toFixed(2) : "—"}</td><td className="num">{c.ms} ms</td></tr>
                  ) : null)}</tbody>
                </table>
              </div>
            </div>
          ) : <p className="ws-sub">Per-component search statistics are reported by ATLAS-032. The run details list what this solver measures.</p>)}
          {tab === "structure" && (r.structure ? (
            <div className="space-y-3 text-[13px]">
              <div className="grid gap-2 sm:grid-cols-4">
                <Metric label="λ(A)" value={String(r.structure.lambda)} hint="= b² + 3K₀ of the recovered partition" testId="lambda" />
                <Metric label="Largest block b" value={String(r.structure.bmax)} />
                <Metric label="K₀" value={String(r.structure.K0)} />
                <Metric label="Accepted k" value={`${r.structure.k} (round ${r.structure.rounds})`} />
              </div>
              <p className="ws-muted">AutoCut recovered an ordered partition attaining the structural minimum λ(A), searching {r.structure.reachable} reachable cuts and {r.structure.nodes} DAG nodes (threshold τ = {r.structure.tau ?? "∞"}, block cap {r.structure.b}).</p>
              <ol className="space-y-1.5">{r.structure.blocks.map((B, i) => <li key={i} className="ws-sunken px-3 py-2"><span className="num text-[11.5px] ws-faint">Block {i + 1}</span> <span className="ml-2">{B.map((x) => p.names[x]).join(", ")}</span></li>)}</ol>
              <p className="ws-sub">The partition is a structural witness, not a polynomial-time optimality certificate. <Link className="ws-accent underline" href="/technology/#lambda">What λ(A) means</Link>.</p>
            </div>
          ) : <p className="ws-sub">Structural decomposition is computed by the AutoCut solver (n ≤ 9 in the browser).</p>)}
          {tab === "details" && (
            <dl className="grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
              {Object.entries(r.details).map(([k, val]) => <div key={k} className="flex justify-between gap-4 py-1" style={{ borderBottom: "1px solid var(--ws-line)" }}><dt className="ws-muted">{k}</dt><dd className="num">{String(val)}</dd></div>)}
              {[["Studio version", STUDIO_VERSION], ["Time limit · seed", `${r.config.timeLimitMs / 1000} s · ${r.config.seed}`], ["F_A (transformed)", r.FA.toDecimal(4)], ["Finished", `${r.finishedAt.slice(0, 19).replace("T", " ")} UTC`]].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4 py-1" style={{ borderBottom: "1px solid var(--ws-line)" }}><dt className="ws-muted">{k}</dt><dd className="num">{val}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </Panel>

      {runs.length > 1 && (
        <Panel id="runs" title="Runs on this instance" sub="Same input for every row; each run used the solver and settings shown." testId="runs-table">
          <div className="ws-scroll overflow-x-auto">
            <table className="ws-table">
              <thead><tr><th>#</th><th>Solver</th><th>Status</th><th>Objective</th><th>Bound</th><th>Gap</th><th>Time</th><th>States</th><th>Settings</th><th>Certificate</th></tr></thead>
              <tbody>{runs.map((x, i) => (
                <tr key={i}><td className="num">{i + 1}</td><td>{x.solver}</td><td className={x.status === "OPTIMAL" ? "ws-green" : "ws-amber"}>{STATUS_UI[x.status as StatusKind]?.label ?? x.status}</td>
                  <td className="num">{x.objective}</td><td className="num">{x.bound ?? "—"}</td><td className="num">{x.gap ?? "—"}</td><td className="num">{fmtMs(x.ms)}</td><td className="num">{x.states}</td><td className="ws-muted">{x.settings}</td><td>{x.certificate ? "yes" : "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

function WeightBar({ forward, backward }: { forward: Q; backward: Q }) {
  const f = Number(forward.toDecimal(8)), b = Number(backward.toDecimal(8));
  const tot = f + b || 1;
  return (
    <div className="mt-1.5">
      <div className="flex h-3 overflow-hidden rounded-sm" role="img" aria-label={`Forward weight ${forward.toDecimal(4)}, backward weight ${backward.toDecimal(4)}`}>
        <div style={{ width: `${(f / tot) * 100}%`, background: "var(--ws-accent)" }} />
        <div style={{ width: `${(b / tot) * 100}%`, background: "var(--ws-back)" }} />
      </div>
      <div className="num mt-1 flex justify-between text-[12px]"><span className="ws-accent">forward {forward.toDecimal(4)}</span><span className="ws-back">backward {backward.toDecimal(4)}</span></div>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className="flex gap-2"><span aria-hidden className={ok ? "ws-green" : "ws-back"}>{ok ? "✓" : "✗"}</span><span className="ws-muted">{children}</span></li>;
}
