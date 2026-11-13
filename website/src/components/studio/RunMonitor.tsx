"use client";
/**
 * Live run monitor (Mission 039). Shows only what the worker measured: the ATLAS bracket on β* converted to
 * the user's objective, per-component phases, DP depth/layer/state counts against the state budget, and the
 * heuristic's incumbent improvements. When a solver reports nothing measurable, the monitor says so.
 */
import { useMemo } from "react";
import type { AtlasBounds } from "@/lib/studio/atlas";
import { maximises, userFromFA, type Problem } from "@/lib/studio/model";
import { Q } from "@/lib/studio/rational";
import type { Telemetry } from "@/lib/studio/runner";
import { fmtInt, fmtMs } from "./ui";

export interface LiveState {
  sizes: number[] | null;
  bounds: AtlasBounds | null;
  history: { t: number; upper: number; lower: number | null }[];
  phase: { index: number; size: number; phase: string; method?: string } | null;
  layer: { index: number; depth: number; n: number; layerSize: number; states: number; pruned: number } | null;
  tick: { index: number; depth: number; expandedInLayer: number; layerTotal: number } | null;
  done: Record<number, { optimal: boolean; method: string }>;
  incumbent: { value: number; starts: number; ms: number } | null;
  incHistory: { t: number; value: number }[];
}
export const emptyLive = (): LiveState => ({ sizes: null, bounds: null, history: [], phase: null, layer: null, tick: null, done: {}, incumbent: null, incHistory: [] });

export function reduceLive(s: LiveState, events: Telemetry[], t: number): LiveState {
  const out = { ...s, done: { ...s.done } };
  for (const e of events) {
    if (e.kind === "plan") { out.sizes = e.sizes; out.bounds = e.bounds; out.history = [...out.history, { t, upper: e.bounds.betaUpper, lower: e.bounds.betaLower }]; }
    else if (e.kind === "component") {
      out.bounds = e.bounds;
      const last = out.history[out.history.length - 1];
      if (!last || last.upper !== e.bounds.betaUpper || last.lower !== e.bounds.betaLower) out.history = [...out.history, { t, upper: e.bounds.betaUpper, lower: e.bounds.betaLower }];
      if (e.phase === "done") { out.done[e.index] = { optimal: !!e.optimal, method: e.method ?? "" }; out.layer = null; out.tick = null; }
      else out.phase = { index: e.index, size: e.size, phase: e.phase, method: e.method };
    } else if (e.kind === "layer") out.layer = { index: e.index, depth: e.depth, n: e.n, layerSize: e.layerSize, states: e.states, pruned: e.pruned };
    else if (e.kind === "tick") out.tick = { index: e.index, depth: e.depth, expandedInLayer: e.expandedInLayer, layerTotal: e.layerTotal };
    else if (e.kind === "incumbent") { out.incumbent = { value: e.value, starts: e.starts, ms: e.ms }; out.incHistory = [...out.incHistory, { t, value: e.value }]; }
  }
  return out;
}

const PHASE: Record<string, string> = { incumbent: "finding an incumbent (local search)", packing: "computing the cycle-packing lower bound", "exact-search": "exact search" };

export default function RunMonitor({ p, live, solver, maxStates, elapsed, progress }: { p: Problem; live: LiveState; solver: string; maxStates: number; elapsed: number; progress: { fraction: number; note: string } | null }) {
  const W = useMemo(() => { let w = 0; for (let i = 0; i < p.n; i++) for (let j = i + 1; j < p.n; j++) w += Math.abs(p.M[i][j]); return w; }, [p]);
  const toUser = (beta: number) => userFromFA(p, Q.of(BigInt(Math.round(W - 2 * beta)), p.scale));
  const maxi = maximises(p);
  const b = live.bounds;
  const bracket = b && p.exact ? (() => {
    const inc = toUser(b.betaUpper);
    const bound = b.betaLower === null ? null : toUser(b.betaLower);
    const gap = b.betaLower === null ? null : (b.betaUpper - b.betaLower) / Number(p.scale);
    const g0 = live.history.length && live.history[0].lower !== null ? (live.history[0].upper - live.history[0].lower!) / Number(p.scale) : null;
    return { inc, bound, gap, g0 };
  })() : null;

  const nontrivial = (live.sizes ?? []).map((s, i) => ({ s, i })).filter((x) => x.s > 1);
  return (
    <div className="space-y-3" data-testid="run-monitor">
      {bracket && (
        <div>
          <div className="grid grid-cols-3 gap-2">
            <div><p className="ws-lbl">Best ordering so far</p><p className="num text-[15px] ws-accent" data-testid="live-incumbent">{bracket.inc.toDecimal(2)}</p></div>
            <div><p className="ws-lbl">Rigorous {maxi ? "upper" : "lower"} bound</p><p className="num text-[15px] ws-violet" data-testid="live-bound">{bracket.bound ? bracket.bound.toDecimal(2) : "—"}</p></div>
            <div><p className="ws-lbl">Gap</p><p className={`num text-[15px] ${bracket.gap === 0 ? "ws-green" : "ws-amber"}`}>{bracket.gap === null ? "—" : bracket.gap === 0 ? "0 · closed" : bracket.gap.toFixed(2)}</p></div>
          </div>
          {bracket.gap !== null && bracket.g0 !== null && bracket.g0 > 0 && (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--ws-sunken)" }} role="meter" aria-label="Remaining gap as a share of the initial gap" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((bracket.gap / bracket.g0) * 100)}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (bracket.gap / bracket.g0) * 100))}%`, background: "var(--ws-amber)", transition: "width .25s" }} />
              </div>
              <p className="ws-sub mt-1 text-[11.5px]">Remaining gap as a share of the gap at the start ({bracket.g0.toFixed(2)}). The bracket only closes when a component is finished or bounded; it does not predict the remaining time.</p>
            </div>
          )}
          <GapSpark history={live.history} scale={Number(p.scale)} />
        </div>
      )}
      {b && !p.exact && <p className="ws-sub">This model is not in exact integer arithmetic, so no rigorous bound is tracked.</p>}

      {live.sizes && (
        <div>
          <p className="ws-lbl">Strong components: {fmtInt(b?.solved ?? 0)} of {fmtInt(live.sizes.length)} solved{live.sizes.length - nontrivial.length ? ` (${fmtInt(live.sizes.length - nontrivial.length)} single items are trivial)` : ""}</p>
          {nontrivial.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1" aria-label="Component status">
              {nontrivial.slice(0, 120).map(({ s, i }) => {
                const d = live.done[i];
                const running = !d && live.phase?.index === i;
                const color = d ? (d.optimal ? "var(--ws-green)" : "var(--ws-amber)") : running ? "var(--ws-accent)" : "var(--ws-line-strong)";
                return <span key={i} title={`component ${i + 1}: ${s} items · ${d ? (d.optimal ? `proved (${d.method})` : "not proved") : running ? "running" : "pending"}`}
                  className="num inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-[10.5px]"
                  style={{ border: `1px solid ${color}`, color, background: running ? "color-mix(in srgb, var(--ws-accent) 14%, transparent)" : "transparent" }}>{s}</span>;
              })}
            </div>
          )}
        </div>
      )}
      {live.phase && !live.done[live.phase.index] && (
        <div className="text-[12.5px]">
          <p className="ws-text">Component {live.phase.index + 1} ({live.phase.size} items): {PHASE[live.phase.phase] ?? live.phase.phase}{live.phase.method && live.phase.phase === "exact-search" ? ` · ${live.phase.method}` : ""}</p>
          {live.layer && live.layer.index === live.phase.index && (
            <>
              <p className="num ws-muted mt-0.5">prefix length {live.layer.depth} of {live.layer.n} · {fmtInt(live.layer.layerSize)} states at this length · {fmtInt(live.layer.pruned)} pruned</p>
              <div className="mt-1.5">
                <div className="flex justify-between text-[11.5px] ws-muted"><span>States used of the budget</span><span className="num">{fmtInt(live.layer.states)} / {fmtInt(maxStates)}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--ws-sunken)" }} role="meter" aria-label="States used of the state budget" aria-valuemin={0} aria-valuemax={maxStates} aria-valuenow={live.layer.states}>
                  <div className="h-full" style={{ width: `${Math.min(100, (live.layer.states / maxStates) * 100)}%`, background: live.layer.states / maxStates > 0.8 ? "var(--ws-amber)" : "var(--ws-accent)" }} />
                </div>
              </div>
            </>
          )}
          {live.tick && live.tick.index === live.phase.index && live.tick.layerTotal > 0 && (
            <p className="num ws-faint mt-1 text-[11.5px]">expanding prefix length {live.tick.depth}: {fmtInt(live.tick.expandedInLayer)} of {fmtInt(live.tick.layerTotal)} states</p>
          )}
        </div>
      )}
      {live.incumbent && (
        <div className="text-[12.5px]">
          <p className="ws-text">Best ordering found: <span className="num ws-accent" data-testid="live-heuristic">{userFromFA(p, Q.of(BigInt(Math.round(live.incumbent.value)), p.scale)).toDecimal(2)}</span> after {fmtInt(live.incumbent.starts)} restarts ({fmtMs(live.incumbent.ms)})</p>
          <p className="ws-sub">{live.incHistory.length} improvement{live.incHistory.length === 1 ? "" : "s"} so far. A heuristic computes no bound, so there is no gap to show.</p>
        </div>
      )}
      {progress && <ProgressBar fraction={progress.fraction} note={progress.note} />}
      {!b && !live.incumbent && !progress && (
        <p className="ws-sub">{solver === "exclusion" || solver === "autocut" ? "This solver reports no intermediate measurements; elapsed time is the only live signal." : "Waiting for the first measurement…"} Elapsed {elapsed.toFixed(1)} s.</p>
      )}
    </div>
  );
}

function ProgressBar({ fraction, note }: { fraction: number; note: string }) {
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--ws-sunken)" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
        <div className="h-full" style={{ width: `${Math.round(fraction * 100)}%`, background: "var(--ws-accent)" }} />
      </div>
      <p className="ws-sub mt-1 text-[11.5px]">{note}</p>
    </div>
  );
}

/** Step chart of the gap (upper − lower, user units) against elapsed time; one point per measured change. */
function GapSpark({ history, scale }: { history: LiveState["history"]; scale: number }) {
  const pts = history.filter((h) => h.lower !== null).map((h) => ({ t: h.t, g: (h.upper - h.lower!) / scale }));
  if (pts.length < 2) return null;
  const W = 280, H = 52, t0 = pts[0].t, t1 = Math.max(pts[pts.length - 1].t, t0 + 1), gmax = Math.max(...pts.map((x) => x.g)) || 1;
  const x = (t: number) => ((t - t0) / (t1 - t0)) * (W - 4) + 2, y = (g: number) => H - 3 - (g / gmax) * (H - 8);
  let d = `M ${x(pts[0].t)} ${y(pts[0].g)}`;
  for (let i = 1; i < pts.length; i++) d += ` H ${x(pts[i].t)} V ${y(pts[i].g)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full max-w-[320px]" role="img" aria-label={`Gap over time: from ${pts[0].g.toFixed(2)} to ${pts[pts.length - 1].g.toFixed(2)} in ${pts.length} measured steps`}>
      <line x1={2} x2={W - 2} y1={H - 3} y2={H - 3} style={{ stroke: "var(--ws-line-strong)" }} />
      <path d={d} fill="none" style={{ stroke: "var(--ws-amber)" }} strokeWidth={1.6} />
      <text x={4} y={10} style={{ fill: "var(--ws-faint)", font: "10px JetBrains Mono, monospace" }}>gap {gmax.toFixed(0)}</text>
      <text x={W - 4} y={H - 7} textAnchor="end" style={{ fill: "var(--ws-faint)", font: "10px JetBrains Mono, monospace" }}>{((t1 - t0) / 1000).toFixed(1)} s</text>
    </svg>
  );
}
