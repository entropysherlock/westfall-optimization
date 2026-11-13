/**
 * ATLAS-031 — adaptive exact pipeline for weighted linear ordering.
 *
 *   1. Strong-component decomposition (decompose.ts) — exact, never weakens optimality.
 *   2. Per component, by measured performance (see benchmarks/atlas-031):
 *        size 1            trivial
 *        size ≤ 13         exact subset DP (≤ 8 192 states; always fastest here)
 *        otherwise         local-search incumbent, then the cut-bounded DP (cutdp.ts) under a
 *                          state budget; if that budget runs out and size ≤ 20, the subset DP.
 *   3. Concatenate component orders in topological order; the caller re-verifies the objective
 *      exactly against the original rational data (report.ts / makeResult).
 *
 * Status: OPTIMAL only if every component was solved by a completed exact method; otherwise
 * INTERRUPTED (an exact search stopped — budget or deadline — and the incumbent for that component
 * is kept). Optimality claims additionally require exact integer arithmetic (Problem.exact).
 */
import { cutBoundedDP } from "./cutdp";
import { strongComponents, subMatrix } from "./decompose";
import { Interrupted, localSearch, scoreOf, subsetDPExact } from "./solvers";

export interface ComponentReport { size: number; method: string; optimal: boolean; states: number; ms: number; note?: string }
export interface AtlasResult {
  order: number[];
  value: number;
  optimal: boolean;
  interruptedReason: string | null;
  components: ComponentReport[];
  crossValue: number;
  totalStates: number;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export interface AtlasOptions {
  deadline?: number;
  seed?: number;
  /** State budget per component for the cut-bounded DP. */
  maxStates?: number;
  /** Local-search time per component (ms). */
  incumbentMs?: number;
  /** Disable decomposition (benchmark ablation). */
  noDecompose?: boolean;
  subsetMax?: number;
}

export function solveAtlas(M: number[][], opts: AtlasOptions = {}): AtlasResult {
  const n = M.length;
  const subsetMax = opts.subsetMax ?? 13;
  if (n === 0) return { order: [], value: 0, optimal: true, interruptedReason: null, components: [], crossValue: 0, totalStates: 0 };
  const dec = opts.noDecompose ? { components: [[...Array(n).keys()]], crossValue: 0 } : strongComponents(M);
  const order: number[] = [];
  const reports: ComponentReport[] = [];
  let optimal = true;
  let interruptedReason: string | null = null;
  let totalStates = 0;
  for (const comp of dec.components) {
    const t0 = now();
    const s = comp.length;
    if (s === 1) { order.push(comp[0]); reports.push({ size: 1, method: "trivial", optimal: true, states: 1, ms: 0 }); totalStates++; continue; }
    const sub = subMatrix(M, comp);
    const expired = () => opts.deadline !== undefined && now() > opts.deadline;
    let local: number[] | null = null;
    let rep: ComponentReport;
    if (s <= subsetMax && !expired()) {
      const r = subsetDPExact(sub);
      local = r.order;
      rep = { size: s, method: "subset-dp", optimal: true, states: r.states, ms: 0 };
    } else {
      const inc = localSearch(sub, [...Array(s).keys()], { timeMs: opts.incumbentMs ?? Math.min(200, 20 + 4 * s), seed: opts.seed ?? 1, maxStarts: 200 });
      local = inc.order;
      rep = { size: s, method: "local-search", optimal: false, states: 0, ms: 0 };
      if (!expired()) {
        try {
          const r = cutBoundedDP(sub, inc.order, { maxStates: opts.maxStates ?? 1_500_000, deadline: opts.deadline });
          local = r.order;
          rep = { size: s, method: "cut-bounded DP", optimal: true, states: r.states, ms: 0, note: `bound β ≤ ${r.bound}, optimum β = ${r.beta}, pruned ${r.pruned}` };
        } catch (e) {
          if (!(e instanceof Interrupted)) throw e;
          rep.note = `cut-bounded DP stopped: ${e.message}`;
          if (s <= 20 && !expired()) {
            try {
              const r = subsetDPExact(sub, { deadline: opts.deadline });
              local = r.order;
              rep = { size: s, method: "subset-dp (fallback)", optimal: true, states: r.states, ms: 0, note: rep.note };
            } catch (e2) {
              if (!(e2 instanceof Interrupted)) throw e2;
              rep.note += `; subset DP stopped: ${e2.message}`;
            }
          }
        }
      } else rep.note = "deadline passed before exact search";
    }
    rep.ms = now() - t0;
    totalStates += rep.states;
    if (!rep.optimal) { optimal = false; interruptedReason ??= `component of size ${s}: ${rep.note ?? "not solved exactly"}`; }
    reports.push(rep);
    for (const i of local!) order.push(comp[i]);
  }
  return { order, value: scoreOf(M, order), optimal, interruptedReason, components: reports, crossValue: dec.crossValue, totalStates };
}
