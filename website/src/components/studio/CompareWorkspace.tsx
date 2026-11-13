"use client";
/**
 * Solver Comparison Lab: runs the selected solvers one after another, each in a fresh worker, on one frozen
 * snapshot of the problem with the same time limit and seed, then reports what is and is not comparable.
 */
import { useEffect, useState } from "react";
import { download } from "@/lib/studio/client";
import { comparabilityStatement, comparisonCsv, comparisonMarkdown, comparisonPlan } from "@/lib/studio/compare";
import type { Problem } from "@/lib/studio/model";
import { ATLAS_DEFAULTS } from "@/lib/studio/config";
import type { StudioSettings } from "@/lib/studio/session";
import { Empty, Panel, fmtInt, fmtMs } from "./ui";

import type { useComparison } from "./useComparison";

export default function CompareWorkspace({ p, fingerprint, cmp, settings, stale }: {
  p: Problem | null; fingerprint: string; cmp: ReturnType<typeof useComparison>; settings: { timeLimit: number; seed: number; atlas: StudioSettings["atlas"] }; stale: boolean;
}) {
  const plan = p ? comparisonPlan(p) : [];
  const [chosen, setChosen] = useState<Record<string, boolean>>({});
  const [tl, setTl] = useState(Math.min(settings.timeLimit, 30));
  const [now, setNow] = useState(0);
  const { c } = cmp;
  useEffect(() => { if (!c.running) return; const id = setInterval(() => setNow(performance.now()), 250); return () => clearInterval(id); }, [c.running]);
  if (!p) return <Empty title="Nothing to compare yet">Load a valid problem first.</Empty>;
  const selected = plan.filter((x) => x.applicable && (chosen[x.solver] ?? true)).map((x) => x.solver);
  const rows = c.rows;
  const cond = c.conditions;
  const statement = cond ? comparabilityStatement(cond, rows) : null;
  const base = (c.problem?.title ?? "comparison").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "comparison";
  const maxMs = Math.max(1, ...rows.map((r) => r.ms ?? 0));
  return (
    <div className="space-y-4">
      <Panel id="cmp-setup" title="Solver comparison" sub="Runs each selected solver on the same frozen snapshot of this problem, one after another in a fresh worker, with the same time limit and seed.">
        <fieldset disabled={c.running}>
          <legend className="sr-only">Solvers to compare</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {plan.map((x) => (
              <label key={x.solver} className="flex items-start gap-2.5 rounded-md border p-2.5 text-[13px]" style={{ borderColor: "var(--ws-line)", opacity: x.applicable ? 1 : 0.72 }}>
                <input type="checkbox" className="ws-check mt-0.5" disabled={!x.applicable} checked={x.applicable && (chosen[x.solver] ?? true)} onChange={(e) => setChosen((m) => ({ ...m, [x.solver]: e.target.checked }))} data-testid={`cmp-${x.solver}`} />
                <span><span className="font-medium ws-text">{x.label}</span> <span className={`ws-chip ${x.exact ? "ws-green" : "ws-amber"}`}>{x.exact ? "exact" : "heuristic"}</span><span className="ws-sub block">{x.reason}</span></span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="ws-lbl" htmlFor="cmp-tl">Time limit per solver (s)</label>
              <input id="cmp-tl" type="number" min={0.5} max={600} step={0.5} className="ws-field num mt-1 w-32" value={tl} onChange={(e) => setTl(Math.max(0.5, Math.min(600, Number(e.target.value) || 1)))} />
            </div>
            <p className="ws-sub pb-2">Seed {settings.seed} and the ATLAS settings come from the Solver workspace. Worst case: {fmtMs(selected.length * (tl + 3) * 1000)}.</p>
          </div>
        </fieldset>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="ws-btn ws-btn-primary" data-testid="run-comparison" disabled={c.running || selected.length < 2} onClick={() => cmp.start(p, fingerprint, selected, tl, settings.seed, settings.atlas ?? ATLAS_DEFAULTS)}>Run comparison ({selected.length} solvers)</button>
          {c.running && <button type="button" className="ws-btn" onClick={cmp.cancel} data-testid="cancel-comparison">Cancel comparison</button>}
          {selected.length < 2 && <span className="ws-sub self-center">Select at least two solvers.</span>}
        </div>
        {c.running && c.current && <p className="mt-2 text-[12.5px] ws-muted" role="status" aria-live="polite">Running {plan.find((x) => x.solver === c.current)?.label} · {((now - c.currentStart) / 1000).toFixed(1)} s · {c.queue.length} still queued</p>}
      </Panel>

      {rows.length > 0 && cond && (
        <Panel id="cmp-results" title="Comparison results" testId="comparison-results"
          sub={<>Instance fingerprint <span className="num">{cond.fingerprint}</span>{cond.fingerprint !== fingerprint || stale ? " — the current problem differs from this snapshot" : ""} · {cond.n} items · {cond.timeLimitMs / 1000} s per solver · seed {cond.seed}</>}
          actions={!c.running ? <>
            <button type="button" className="ws-btn" data-testid="export-comparison" onClick={() => download(`${base}-comparison.md`, comparisonMarkdown(c.problem!, cond, rows, c.inconsistencies), "text/markdown")}>Report (.md)</button>
            <button type="button" className="ws-btn" onClick={() => download(`${base}-comparison.csv`, comparisonCsv(rows), "text/csv")}>CSV</button>
            <button type="button" className="ws-btn" onClick={() => download(`${base}-comparison.json`, JSON.stringify({ format: "westfall-studio-comparison", version: 1, conditions: cond, rows, inconsistencies: c.inconsistencies }, null, 2), "application/json")}>JSON</button>
          </> : undefined}>
          <div className="ws-scroll overflow-x-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
            <table className="ws-table" data-testid="comparison-table">
              <thead><tr><th>Solver</th><th>Outcome</th><th>Objective</th><th>Rigorous bound</th><th>Gap</th><th>Solver time</th><th>States</th><th>Pruned</th><th>Certificate</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.solver}>
                  <td><span className="font-medium">{r.label}</span> <span className={`ws-chip ${r.exact ? "ws-green" : "ws-amber"}`}>{r.exact ? "exact" : "heuristic"}</span></td>
                  <td className={r.status === "OPTIMAL" ? "ws-green" : r.outcome === "completed" ? "ws-amber" : "ws-back"} title={r.note}>{r.statusLabel}</td>
                  <td className="num">{r.objectiveDecimal ?? "—"}{r.bestKnown && <span className="ws-accent" title="attains the best objective among these runs"> ★</span>}</td>
                  <td className="num">{r.bound ? r.bound : "—"}</td>
                  <td className="num">{r.gap ?? "—"}</td>
                  <td className="num">
                    {r.ms !== null ? <span className="flex items-center gap-2"><span className="inline-block h-1.5 rounded-sm" style={{ width: `${Math.max(2, (Math.log1p(r.ms) / Math.log1p(maxMs)) * 70)}px`, background: "var(--ws-violet)" }} aria-hidden />{fmtMs(r.ms)}</span> : "—"}
                  </td>
                  <td className="num">{r.states !== null ? fmtInt(r.states) : "—"}</td>
                  <td className="num">{r.pruned !== null ? fmtInt(r.pruned) : "—"}</td>
                  <td>{r.certificate ? "yes" : "—"}</td>
                </tr>
              ))}
              {c.running && c.current && <tr><td colSpan={9} className="ws-faint">Running {c.current}…</td></tr>}</tbody>
            </table>
          </div>
          <p className="ws-sub mt-1">★ attains the best objective among these runs. Runtime bars use a log scale. Hover an outcome for the solver&apos;s own status note.</p>
          {c.inconsistencies.length > 0 && <ul className="mt-2 list-disc pl-5 text-[12.5px] ws-back" role="alert">{c.inconsistencies.map((x) => <li key={x}>{x}</li>)}</ul>}
          {statement && !c.running && (
            <div className="ws-sunken mt-3 p-3" data-testid="comparability">
              <p className="text-[13px] font-semibold ws-text">{statement.level === "same-conditions" ? "Same instance, same limits — not a benchmark study" : "Too few completed runs to compare"}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12.5px] ws-muted">{statement.points.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
