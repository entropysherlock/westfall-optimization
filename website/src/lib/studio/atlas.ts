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
import { cutBoundedDP, type CutDPLayerEvent } from "./cutdp";
import { fractionalPacking, greedyPacking, withLongerCycles, type TrianglePacking } from "./bounds/packing";
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
  /**
   * Rigorous lower bound on the optimal backward weight β* of the whole instance (units of M):
   * Σ over components of β (if solved exactly) or ⌈packing bound⌉ (if not; Lemmas 1–2, PROOFS.md),
   * using OPT_β(V) = Σ OPT_β(C_i) from the decomposition theorem. Null for non-integral M.
   */
  lowerBoundBeta: number | null;
  /** β of the returned ordering (units of M). */
  beta: number;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export interface AtlasOptions {
  deadline?: number;
  seed?: number;
  /** State budget per component for the cut-bounded DP. */
  maxStates?: number;
  /** Working-memory cap for exact prefix-search (bytes); default 800 MiB for timed runs. */
  maxMemoryBytes?: number;
  /** Local-search time per component (ms). */
  incumbentMs?: number;
  /** Disable decomposition (benchmark ablation). */
  noDecompose?: boolean;
  subsetMax?: number;
  /**
   * ATLAS-032 residual bound L(V∖S): "cycles" (default; fractional triangles + greedy longer cycles on the
   * residual capacity), "fractional" (native Garg–Könemann triangle packing),
   * "greedy" (integral triangle packing) or "none" (= ATLAS-031 behaviour). Integral instances only.
   */
  bound?: "none" | "greedy" | "fractional" | "cycles";
  /** ATLAS-032 strict pruning (prove the incumbent instead of re-finding it). Default true; false = ATLAS-031. */
  strict?: boolean;
  /**
   * Mission 039 telemetry. Every value is measured by the search itself; nothing is estimated.
   * β values are in units of M (integers when M is integral). Never alters the search.
   */
  onEvent?: (e: AtlasEvent) => void;
}

/**
 * Global bounds on the optimal backward weight β* during a run (units of M). betaUpper is the β of a concrete
 * ordering (the concatenation of each component's current best ordering; cross pairs between components are
 * never backward), so it is always attained. betaLower is Σ over components of: β* if solved exactly, the
 * rounded-up packing bound if computed, otherwise 0 (β ≥ 0). betaLower is null when M is not integral.
 */
export interface AtlasBounds { betaUpper: number; betaLower: number | null; solved: number; total: number }
export type AtlasEvent =
  | { kind: "plan"; sizes: number[]; bounds: AtlasBounds }
  | { kind: "component"; index: number; size: number; phase: "incumbent" | "packing" | "exact-search" | "done"; method?: string; optimal?: boolean; beta?: number; lower?: number | null; bounds: AtlasBounds }
  | ({ kind: "layer"; index: number } & CutDPLayerEvent)
  | { kind: "tick"; index: number; depth: number; n: number; expandedInLayer: number; layerTotal: number; states: number; pruned: number };

/** Per-component certificate data (independently checkable with benchmarks/atlas-032/verify_certificate.py). */
export interface ComponentCertificate { vertices: number[]; order: number[]; beta: number; packing: { D: number; start: number[]; cyc: number[]; w: number[] } | null; verifiable: boolean }

export function solveAtlas(M: number[][], opts: AtlasOptions = {}): AtlasResult {
  const n = M.length;
  const subsetMax = opts.subsetMax ?? 13;
  if (n === 0) return { order: [], value: 0, optimal: true, interruptedReason: null, components: [], crossValue: 0, totalStates: 0, certificates: [], lowerBoundBeta: 0, beta: 0 };
  const dec = opts.noDecompose ? { components: [[...Array(n).keys()]], crossValue: 0 } : strongComponents(M);
  const order: number[] = [];
  const reports: ComponentReport[] = [];
  let optimal = true;
  let interruptedReason: string | null = null;
  let totalStates = 0;
  const certificates: ComponentCertificate[] = [];
  let betaTotal = 0, lbTotal = 0;
  const integralM = M.every((row) => row.every((x) => Number.isInteger(x)));
  const boundKind = opts.bound ?? "cycles";
  const strict = opts.strict ?? true;
  // telemetry state: per-component best β (of a concrete ordering) and rigorous lower bound
  const emit = opts.onEvent;
  const betaOf = (sub: number[][], ord: number[]) => { let b = 0; for (let r = 0; r < ord.length; r++) for (let t = r + 1; t < ord.length; t++) b += Math.max(sub[ord[t]][ord[r]], 0); return b; };
  const compUpper: number[] = [], compLower: number[] = [];
  let solvedCount = 0;
  const bounds = (): AtlasBounds => ({ betaUpper: compUpper.reduce((a, b) => a + b, 0), betaLower: integralM ? compLower.reduce((a, b) => a + b, 0) : null, solved: solvedCount, total: dec.components.length });
  if (emit) {
    for (const comp of dec.components) { compUpper.push(comp.length > 1 ? betaOf(subMatrix(M, comp), [...Array(comp.length).keys()]) : 0); compLower.push(0); }
    emit({ kind: "plan", sizes: dec.components.map((c) => c.length), bounds: bounds() });
  }
  for (const [ci, comp] of dec.components.entries()) {
    const t0 = now();
    const s = comp.length;
    if (s === 1) {
      order.push(comp[0]); reports.push({ size: 1, method: "trivial", optimal: true, states: 1, ms: 0 }); totalStates++; certificates.push({ vertices: comp, order: comp.slice(), beta: 0, packing: null, verifiable: true });
      solvedCount++;
      // single items are reported in bulk (no event per trivial component) — they change no bound
      continue;
    }
    const sub = subMatrix(M, comp);
    const expired = () => opts.deadline !== undefined && now() > opts.deadline;
    let local: number[] | null = null;
    let compPacking: ComponentCertificate["packing"] = null;
    let compRootLB = 0; // ⌈packing bound⌉ for this component, kept even if the exact search is interrupted
    let rep: ComponentReport;
    if (emit) emit({ kind: "component", index: ci, size: s, phase: s <= subsetMax ? "exact-search" : "incumbent", method: s <= subsetMax ? "subset-dp" : "local-search", bounds: bounds() });
    if (s <= subsetMax && !expired()) {
      try {
        const r = subsetDPExact(sub, { deadline: opts.deadline });
        local = r.order;
        rep = { size: s, method: "subset-dp", optimal: true, states: r.states, ms: 0 };
      } catch (e) {
        if (!(e instanceof Interrupted)) throw e;
        local = [...Array(s).keys()]; // still a feasible fallback
        rep = { size: s, method: "subset-dp", optimal: false, states: 0, ms: 0,
          note: "subset DP stopped: " + e.message };
      }
    } else {
      const inc = localSearch(sub, [...Array(s).keys()], {
        timeMs: opts.incumbentMs ?? Math.min(1500, 20 + 4 * s + (s > 40 ? 20 * s : 0)),
        deadline: opts.deadline,
        seed: opts.seed ?? 1, maxStarts: s > 40 ? 2000 : 200,
      });
      local = inc.order;
      rep = { size: s, method: "local-search", optimal: false, states: 0, ms: 0 };
      if (emit) { compUpper[ci] = Math.min(compUpper[ci], betaOf(sub, inc.order)); emit({ kind: "component", index: ci, size: s, phase: "packing", bounds: bounds() }); }
      if (!expired()) {
        try {
          let packing: TrianglePacking | null = null;
          const integral = sub.every((row) => row.every((x) => Number.isInteger(x)));
          if (integral && boundKind !== "none") {
            try {
              // A bounded triangle count prevents an O(n^3) temporary list from
              // exhausting memory on huge instances. No bound is safer than an
              // incomplete one. The normal (unlimited) path is unchanged.
              const guard = { deadline: opts.deadline, maxTriangles: opts.deadline === undefined ? undefined : 250_000 };
              packing = boundKind === "greedy"
                ? greedyPacking(sub, guard)
                : fractionalPacking(sub, { eps: 0.05, ...guard });
              if (boundKind === "cycles") {
                try { packing = withLongerCycles(sub, packing, { deadline: opts.deadline }); }
                catch (e) { if (!(e instanceof Interrupted)) throw e; } // preserve completed triangle packing
              }
            } catch (e) {
              if (!(e instanceof Interrupted)) throw e;
              packing = null; // zero is a universally valid residual lower bound
            }
          }
          if (packing) compRootLB = Math.ceil(packing.total / packing.D);
          if (emit) { if (integral) compLower[ci] = Math.max(compLower[ci], compRootLB); emit({ kind: "component", index: ci, size: s, phase: "exact-search", method: "cut-bounded DP", bounds: bounds() }); }
          if (expired()) throw new Interrupted("deadline passed before exact search");
          const r = cutBoundedDP(sub, inc.order, {
            maxStates: opts.maxStates ?? 1_500_000, maxBytes: opts.maxMemoryBytes ?? (opts.deadline === undefined ? undefined : 800 * 1024 * 1024), deadline: opts.deadline, packing, strict,
            onLayer: emit ? (e) => emit({ kind: "layer", index: ci, ...e }) : undefined,
            onTick: emit ? (e) => emit({ kind: "tick", index: ci, ...e }) : undefined,
          });
          local = r.order;
          const label = `cut-bounded DP${packing ? ` + ${boundKind} triangle bound` : ""}${strict && integral ? " (strict)" : ""}`;
          rep = { size: s, method: label, optimal: true, states: r.states, ms: 0, rootLB: r.rootLB, pruned: r.pruned, packingMs: packing?.ms,
            note: `${r.incumbentProved ? "incumbent proved optimal" : "optimum found"}: β = ${r.beta}, root bound ${r.rootLB?.toFixed(2) ?? 0}, pruned ${r.pruned}` };
          compPacking = packing ? { D: packing.D, start: Array.from(packing.start), cyc: Array.from(packing.cyc), w: Array.from(packing.w) } : null;
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
    betaTotal += cb;
    lbTotal += rep.optimal ? cb : compRootLB;
    if (emit) {
      compUpper[ci] = cb;
      compLower[ci] = rep.optimal ? cb : compRootLB;
      if (rep.optimal) solvedCount++;
      emit({ kind: "component", index: ci, size: s, phase: "done", method: rep.method, optimal: rep.optimal, beta: cb, lower: integralM ? compLower[ci] : null, bounds: bounds() });
    }
  }
  return { order, value: scoreOf(M, order), optimal, interruptedReason, components: reports, crossValue: dec.crossValue, totalStates, certificates,
    lowerBoundBeta: integralM ? lbTotal : null, beta: betaTotal };
}
