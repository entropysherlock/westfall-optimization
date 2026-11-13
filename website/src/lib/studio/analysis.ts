/**
 * Mission 039 — problem profiling and ordering analysis for the Studio workstation.
 *
 * Every quantity here is a deterministic function of the model (Problem) and an ordering, and is tested
 * against exact recomputation in tests/studio039.test.ts. Conventions (see model.ts):
 *   A skew-symmetric, F_A(π) = Σ_{r<s} a_{π_r π_s},  W = Σ_{i<j} |a_ij|,  β(π) = (W − F_A(π))/2 ≥ 0.
 * A pair {u, v} with a_uv ≠ 0 is "satisfied" by π if the item with the positive margin comes first, and
 * "backward" otherwise. Zero-margin pairs (ties) never matter.
 *
 * Numbers: contributions are exact rationals (computed on the integer matrix M = scale·A while
 * Problem.exact, otherwise directly on A). The matrix-explorer helpers work on M as displayed numbers.
 */
import { strongComponents } from "./decompose";
import type { Problem } from "./model";
import { Q } from "./rational";
import { SOLVERS, type SolverId } from "./catalog";

/* ------------------------------------------------------------------ problem profile */

export type Difficulty = "trivial" | "easy" | "moderate" | "hard" | "very hard";

export interface ProblemProfile {
  n: number;
  pairs: number;
  nonzeroPairs: number;
  zeroPairs: number;
  density: number;
  components: number;
  componentSizes: number[]; // descending
  largest: number;
  /** every pair has a nonzero margin (a weighted tournament) */
  tournament: boolean;
  integral: boolean;
  scale: string;
  maxAbsEntry: number;
  totalWeight: Q;
  difficulty: Difficulty;
  difficultyReason: string;
  /** exact browser solvers that accept this size */
  exactSolvers: SolverId[];
}

/**
 * Difficulty class of the largest strongly connected component. This is an evidence-based classification
 * from the ATLAS-032 benchmark conditions (benchmarks/atlas-032/RESULTS.md, 30 s, one thread), NOT a runtime
 * prediction: the exact search may finish faster or not at all.
 */
export function classifyDifficulty(largest: number, density: number, integral: boolean): { difficulty: Difficulty; reason: string } {
  if (largest <= 1) return { difficulty: "trivial", reason: "The strict preference graph is acyclic: sorting by the decomposition is already optimal." };
  if (largest <= 13) return { difficulty: "easy", reason: `The largest strongly connected component has ${largest} items; the exact subset DP needs at most 2^${largest} = ${(2 ** largest).toLocaleString("en-US")} states for it.` };
  if (largest <= 30) return { difficulty: "moderate", reason: `Largest component ${largest}: every benchmarked component up to 30 items was proved within 30 s by ATLAS-032${integral ? "" : " (with exact integer input; this model is floating-point, so no proof is possible)"}.` };
  if (largest <= 35 || (largest <= 80 && density < 0.6)) return { difficulty: "hard", reason: `Largest component ${largest}: half of the dense n = 35 benchmark instances were not proved in 30 s; sparse real-world instances (LOLIB IO, n ≤ 79) were.` };
  return { difficulty: "very hard", reason: `A dense component of ${largest} items is beyond the benchmarked range: an optimality proof is not expected, and the run will most likely return its best ordering with a rigorous gap.` };
}

export function profileProblem(p: Problem): ProblemProfile {
  const n = p.n;
  const pairs = (n * (n - 1)) / 2;
  const dec = strongComponents(p.M);
  const sizes = dec.components.map((c) => c.length).sort((a, b) => b - a);
  const largest = sizes[0] ?? 0;
  const density = pairs ? p.stats.nonzeroPairs / pairs : 0;
  let maxAbs = 0;
  let W = Q.ZERO;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { W = W.add(p.A[i][j].abs()); maxAbs = Math.max(maxAbs, Math.abs(p.M[i][j])); }
  const { difficulty, reason } = classifyDifficulty(largest, density, p.exact);
  return {
    n, pairs, nonzeroPairs: p.stats.nonzeroPairs, zeroPairs: p.stats.zeroPairs, density,
    components: dec.components.length, componentSizes: sizes, largest, tournament: p.stats.zeroPairs === 0,
    integral: p.exact, scale: p.scale.toString(), maxAbsEntry: maxAbs, totalWeight: W,
    difficulty, difficultyReason: reason,
    exactSolvers: SOLVERS.filter((s) => s.exact && n <= s.maxN).map((s) => s.id),
  };
}

/* ------------------------------------------------------------------ ordering analysis */

export interface ItemContribution {
  item: number;
  position: number;
  /** Σ |a_uv| over nonzero pairs containing the item that π satisfies */
  satisfied: Q;
  /** Σ |a_uv| over nonzero pairs containing the item that π places backward */
  backward: Q;
  /** (satisfied − backward)/2: the item's share of F_A; Σ_items net = F_A(π) exactly */
  net: Q;
  backwardPairs: number;
}

/**
 * Per-item decomposition of the objective. Identities (tested): Σ_v backward_v = 2β(π),
 * Σ_v satisfied_v = 2(W − β(π)), Σ_v net_v = F_A(π).
 */
export function itemContributions(p: Problem, order: number[]): ItemContribution[] {
  const n = p.n;
  const pos = new Int32Array(n);
  order.forEach((v, i) => (pos[v] = i));
  const cnt = new Int32Array(n);
  let sat: Q[], back: Q[];
  if (p.exact) {
    // exact integer arithmetic on M = scale·A (all partial sums < 2^53 by construction of Problem.exact)
    const s = new Float64Array(n), b = new Float64Array(n);
    for (let u = 0; u < n; u++)
      for (let v = u + 1; v < n; v++) {
        const a = p.M[u][v];
        if (a === 0) continue;
        const w = Math.abs(a);
        if ((a > 0) === (pos[u] < pos[v])) { s[u] += w; s[v] += w; } else { b[u] += w; b[v] += w; cnt[u]++; cnt[v]++; }
      }
    sat = Array.from(s, (x) => Q.of(BigInt(x), p.scale));
    back = Array.from(b, (x) => Q.of(BigInt(x), p.scale));
  } else {
    // exact rationals directly from A (slower, used only when M is not exact)
    sat = Array(n).fill(Q.ZERO); back = Array(n).fill(Q.ZERO);
    for (let u = 0; u < n; u++)
      for (let v = u + 1; v < n; v++) {
        const a = p.A[u][v];
        if (a.isZero()) continue;
        const w = a.abs();
        if ((a.sign() > 0) === (pos[u] < pos[v])) { sat[u] = sat[u].add(w); sat[v] = sat[v].add(w); }
        else { back[u] = back[u].add(w); back[v] = back[v].add(w); cnt[u]++; cnt[v]++; }
      }
  }
  const two = Q.of(2n);
  return order.map((v, i) => ({ item: v, position: i, satisfied: sat[v], backward: back[v], net: sat[v].sub(back[v]).div(two), backwardPairs: cnt[v] }));
}

export interface BackwardPair { first: number; then: number; /** a_{first,then} < 0 */ margin: Q; weight: Q }

/** Every backward pair of π (u placed before v although a_uv < 0), heaviest first. Σ weight = β(π). */
export function backwardPairs(p: Problem, order: number[]): BackwardPair[] {
  const out: BackwardPair[] = [];
  for (let r = 0; r < order.length; r++)
    for (let t = r + 1; t < order.length; t++) {
      const u = order[r], v = order[t];
      const a = p.A[u][v];
      if (a.sign() < 0) out.push({ first: u, then: v, margin: a, weight: a.neg() });
    }
  return out.sort((x, y) => y.weight.cmp(x.weight));
}

export interface Movement {
  /** per item: initial position, final position, final − initial (positive = moved later) */
  items: { item: number; from: number; to: number; delta: number }[];
  /** number of item pairs whose relative order differs (Kendall tau distance) */
  kendall: number;
  /** Σ |delta| (Spearman footrule) */
  footrule: number;
  maxShift: number;
  unchanged: number;
}

export function movement(initial: number[], final: number[]): Movement {
  const n = final.length;
  const p0 = new Int32Array(n), p1 = new Int32Array(n);
  initial.forEach((v, i) => (p0[v] = i));
  final.forEach((v, i) => (p1[v] = i));
  let kendall = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if ((p0[a] < p0[b]) !== (p1[a] < p1[b])) kendall++;
  const items = final.map((v) => ({ item: v, from: p0[v], to: p1[v], delta: p1[v] - p0[v] }));
  const footrule = items.reduce((s, x) => s + Math.abs(x.delta), 0);
  return { items, kendall, footrule, maxShift: items.reduce((m, x) => Math.max(m, Math.abs(x.delta)), 0), unchanged: items.filter((x) => x.delta === 0).length };
}

/* ------------------------------------------------------------------ matrix explorer model */

/** Sum of the entries above the diagonal of M permuted by `order` — equals F_M(order). */
export function upperTriangleSum(M: number[][], order: number[]): number {
  let s = 0;
  for (let r = 0; r < order.length; r++) for (let t = r + 1; t < order.length; t++) s += M[order[r]][order[t]];
  return s;
}

export interface AggregateGrid {
  bins: number;
  /** item index ranges (in display positions) per bin: [start, end) */
  edges: number[];
  /** per cell: sum of positive entries, sum of negative entries, count of nonzero entries */
  pos: Float64Array;
  neg: Float64Array;
  nonzero: Int32Array;
}

/**
 * Aggregate the permuted matrix into bins × bins blocks (for large instances). Exact entries remain
 * available through the hover/inspection path, which reads M directly. Totals are preserved:
 * Σ (pos + neg) over all cells = Σ of all entries (= 0 for a skew matrix), and over the strictly-upper
 * blocks plus the upper halves of diagonal blocks = F_M(order).
 */
export function aggregate(M: number[][], order: number[], bins: number): AggregateGrid {
  const n = order.length;
  const k = Math.max(1, Math.min(bins, n));
  const edges = Array.from({ length: k + 1 }, (_, b) => Math.round((b * n) / k));
  const binOf = new Int32Array(n);
  for (let b = 0; b < k; b++) for (let i = edges[b]; i < edges[b + 1]; i++) binOf[i] = b;
  const pos = new Float64Array(k * k), neg = new Float64Array(k * k), nonzero = new Int32Array(k * k);
  for (let i = 0; i < n; i++) {
    const row = M[order[i]], bi = binOf[i] * k;
    for (let j = 0; j < n; j++) {
      const x = row[order[j]];
      if (x === 0) continue;
      const c = bi + binOf[j];
      if (x > 0) pos[c] += x; else neg[c] += x;
      nonzero[c]++;
    }
  }
  return { bins: k, edges, pos, neg, nonzero };
}

/** Contiguous position ranges of the strong components inside `order` (only when they are contiguous). */
export function componentRanges(M: number[][], order: number[]): { start: number; end: number; size: number }[] {
  const comps = strongComponents(M).components;
  const pos = new Map(order.map((v, i) => [v, i]));
  const out: { start: number; end: number; size: number }[] = [];
  for (const c of comps) {
    const ps = c.map((v) => pos.get(v)!);
    const lo = Math.min(...ps), hi = Math.max(...ps);
    if (hi - lo + 1 === c.length) out.push({ start: lo, end: hi + 1, size: c.length });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Stable 64-bit FNV-1a fingerprint of a string (instance identity for comparisons; not cryptographic). */
export function fingerprint(s: string): string {
  let h1 = 0x811c9dc5 >>> 0, h2 = 0xcbf29ce4 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + 0x9e), 0x01000193) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
