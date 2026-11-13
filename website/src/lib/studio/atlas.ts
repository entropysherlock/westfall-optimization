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
import { fractionalPacking, greedyPacking, type TrianglePacking } from "./bounds/packing";
import { strongComponents, subMatrix } from "./decompose";
import { Interrupted, localSearch, scoreOf, subsetDPExact } from "./solvers";

export interface ComponentReport { size: number; method: string; optimal: boolean; states: number; ms: number; note?: string; rootLB?: number; pruned?: number; packingMs?: number }
export interface AtlasResult {
  order: number[];
  value: number;
  optimal: boolean;
  interruptedReason: string | null;
  components: ComponentReport[];
  crossValue: number;
  totalStates: number;
  certificates: ComponentCertificate[];
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
  /**
   * ATLAS-032 residual bound L(V∖S): "fractional" (default; native Garg–Könemann triangle packing),
   * "greedy" (integral triangle packing) or "none" (= ATLAS-031 behaviour). Integral instances only.
   */
  bound?: "none" | "greedy" | "fractional";
  /** ATLAS-032 strict pruning (prove the incumbent instead of re-finding it). Default true; false = ATLAS-031. */
  strict?: boolean;
}

/** Per-component certificate data (independently checkable with benchmarks/atlas-032/verify_certificate.py). */
export interface ComponentCertificate { vertices: number[]; order: number[]; beta: number; packing: { D: number; tri: number[]; w: number[] } | null; verifiable: boolean }

export function solveAtlas(M: number[][], opts: AtlasOptions = {}): AtlasResult {
  const n = M.length;
  const subsetMax = opts.subsetMax ?? 13;
  if (n === 0) return { order: [], value: 0, optimal: true, interruptedReason: null, components: [], crossValue: 0, totalStates: 0, certificates: [] };
  const dec = opts.noDecompose ? { components: [[...Array(n).keys()]], crossValue: 0 } : strongComponents(M);
  const order: number[] = [];
  const reports: ComponentReport[] = [];
  let optimal = true;
  let interruptedReason: string | null = null;
  let totalStates = 0;
  const certificates: ComponentCertificate[] = [];
  const boundKind = opts.bound ?? "fractional";
  const strict = opts.strict ?? true;
  for (const comp of dec.components) {
    const t0 = now();
    const s = comp.length;
    if (s === 1) { order.push(comp[0]); reports.push({ size: 1, method: "trivial", optimal: true, states: 1, ms: 0 }); totalStates++; certificates.push({ vertices: comp, order: comp.slice(), beta: 0, packing: null, verifiable: true }); continue; }
    const sub = subMatrix(M, comp);
    const expired = () => opts.deadline !== undefined && now() > opts.deadline;
    let local: number[] | null = null;
    let compPacking: ComponentCertificate["packing"] = null;
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
          let packing: TrianglePacking | null = null;
          const integral = sub.every((row) => row.every((x) => Number.isInteger(x)));
          if (integral && boundKind !== "none") {
            try { packing = boundKind === "greedy" ? greedyPacking(sub) : fractionalPacking(sub, { eps: 0.05 }); } catch { packing = null; }
          }
          const r = cutBoundedDP(sub, inc.order, { maxStates: opts.maxStates ?? 1_500_000, deadline: opts.deadline, packing, strict });
          local = r.order;
          const label = `cut-bounded DP${packing ? ` + ${boundKind} triangle bound` : ""}${strict && integral ? " (strict)" : ""}`;
          rep = { size: s, method: label, optimal: true, states: r.states, ms: 0, rootLB: r.rootLB, pruned: r.pruned, packingMs: packing?.ms,
            note: `${r.incumbentProved ? "incumbent proved optimal" : "optimum found"}: β = ${r.beta}, root bound ${r.rootLB?.toFixed(2) ?? 0}, pruned ${r.pruned}` };
          compPacking = packing ? { D: packing.D, tri: Array.from(packing.tri), w: Array.from(packing.w) } : null;
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
    let cb = 0;
    for (let r = 0; r < s; r++) for (let t = r + 1; t < s; t++) cb += Math.max(sub[local![t]][local![r]], 0);
    certificates.push({ vertices: comp, order: local!.map((i) => comp[i]), beta: cb, packing: compPacking, verifiable: rep.optimal });
  }
  return { order, value: scoreOf(M, order), optimal, interruptedReason, components: reports, crossValue: dec.crossValue, totalStates, certificates };
}
