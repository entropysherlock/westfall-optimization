/**
 * Studio solvers. All maximise F_M(π) = Σ_{r<s} M[π_r][π_s] for the (scaled, skew-symmetric)
 * matrix M of a Problem. Exact solvers return a proof of optimality *under their stated
 * assumptions*; the heuristic never does.
 *
 * - "subset-dp"   exact dynamic program over all 2^n prefix sets (n ≤ 20).
 * - "exclusion"   exact exclusion DP (prefix states pruned by an admissible bound against an
 *                 incumbent), block-table bound; n ≤ 26, bounded state budget.
 * - "autocut"     TypeScript port of the formally verified AutoCut algorithm (see autocut.ts).
 * - "atlas"       ATLAS-031 adaptive pipeline: exact strong-component decomposition, then per-component
 *                 subset DP or cut-bounded DP (atlas.ts). Exact when every component completes.
 * - "heuristic"   multi-start insertion local search; returns a feasible ordering only.
 * - "brute-force" exhaustive enumeration of all n! orderings (n ≤ 9), used as an independent check.
 */
import { exclusionDP, insertionLocalSearch, mulberry32, segmentOrder } from "../engine";

export type SolverId = "subset-dp" | "exclusion" | "autocut" | "atlas" | "heuristic";

export interface SolverInfo {
  id: SolverId;
  label: string;
  exact: boolean;
  maxN: number;
  summary: string;
}

export const SOLVERS: SolverInfo[] = [
  { id: "subset-dp", label: "Exact subset dynamic program", exact: true, maxN: 20,
    summary: "Exhaustive dynamic program over all 2ⁿ prefix sets. Optimality is established when it completes." },
  { id: "exclusion", label: "Exact exclusion DP (block bound)", exact: true, maxN: 26,
    summary: "Prefix-state DP that discards states provably unable to beat a local-search incumbent. Exact when it completes within its state budget." },
  { id: "autocut", label: "AutoCut structural solver", exact: true, maxN: 9,
    summary: "Browser port of the Lean-verified AutoCut algorithm: recovers a partition attaining λ(A) and an optimal ordering. The port is tested against the Lean executable, not itself formally verified." },
  { id: "atlas", label: "ATLAS adaptive exact (components + cut-bounded DP)", exact: true, maxN: 400,
    summary: "Splits the instance into strongly connected components (exact), solves each with the subset DP or a cut-bounded prefix DP, and concatenates. Optimal when every component completes; otherwise the result is reported as interrupted with the best ordering found." },
  { id: "heuristic", label: "Local search (heuristic)", exact: false, maxN: 400,
    summary: "Multi-start insertion local search. Returns a good feasible ordering; it does not establish optimality." },
];

export class Interrupted extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Interrupted";
  }
}

export interface Hooks {
  /** Called with real progress fractions in [0,1] (only where progress is measurable). */
  progress?: (fraction: number, note: string) => void;
  deadline?: number; // performance.now() timestamp
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function scoreOf(M: number[][], order: number[]): number {
  let s = 0;
  for (let r = 0; r < order.length; r++) for (let t = r + 1; t < order.length; t++) s += M[order[r]][order[t]];
  return s;
}

/** Exact subset DP with progress and deadline. f(S) = best score of an ordering of S as a prefix. */
export function subsetDPExact(M: number[][], hooks: Hooks = {}): { order: number[]; value: number; states: number } {
  const n = M.length;
  if (n > 20) throw new Error("the subset DP is limited to n ≤ 20");
  if (n === 0) return { order: [], value: 0, states: 1 };
  const N = 1 << n;
  const f = new Float64Array(N).fill(-Infinity);
  const arg = new Int8Array(N).fill(-1);
  f[0] = 0;
  const g = new Float64Array(n);
  const chunk = 1 << 14;
  for (let S = 0; S < N; S++) {
    if ((S & (chunk - 1)) === 0 && S > 0) {
      hooks.progress?.(S / N, `${S.toLocaleString("en-US")} of ${N.toLocaleString("en-US")} prefix states`);
      if (hooks.deadline !== undefined && now() > hooks.deadline) throw new Interrupted("time limit reached before the dynamic program finished");
    }
    const fs = f[S];
    g.fill(0);
    for (let u = 0; u < n; u++) if (S & (1 << u)) { const row = M[u]; for (let v = 0; v < n; v++) g[v] += row[v]; }
    for (let v = 0; v < n; v++) {
      if (S & (1 << v)) continue;
      const C = S | (1 << v);
      const val = fs + g[v];
      if (val > f[C]) {
        f[C] = val;
        arg[C] = v;
      }
    }
  }
  const order: number[] = [];
  let S = N - 1;
  while (S) {
    const v = arg[S];
    order.push(v);
    S &= ~(1 << v);
  }
  order.reverse();
  hooks.progress?.(1, "complete");
  return { order, value: f[N - 1], states: N };
}

/** Multi-start insertion local search. Deterministic for a fixed seed. */
export function localSearch(M: number[][], start: number[], opts: { timeMs?: number; seed?: number; maxStarts?: number } & Hooks = {}) {
  const n = M.length;
  const t0 = now();
  const budget = opts.timeMs ?? 1500;
  const rnd = mulberry32(opts.seed ?? 1);
  let best = insertionLocalSearch(M, start);
  let bestVal = scoreOf(M, best);
  let starts = 1;
  const maxStarts = opts.maxStarts ?? 10_000;
  // a Copeland-style start (sort by row sums) is usually strong
  const copeland = [...Array(n).keys()].sort((a, b) => M[b].reduce((s, x) => s + x, 0) - M[a].reduce((s, x) => s + x, 0) || a - b);
  const c = insertionLocalSearch(M, copeland);
  const cv = scoreOf(M, c);
  starts++;
  if (cv > bestVal) { best = c; bestVal = cv; }
  while (starts < maxStarts && now() - t0 < budget) {
    // perturb the incumbent: random segment reversal + a few random moves, then re-optimise
    const p = best.slice();
    const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n);
    const [a, b] = i < j ? [i, j] : [j, i];
    p.splice(a, b - a + 1, ...p.slice(a, b + 1).reverse());
    for (let k = 0; k < 2; k++) {
      const x = Math.floor(rnd() * n);
      const [v] = p.splice(x, 1);
      p.splice(Math.floor(rnd() * n), 0, v);
    }
    const q = insertionLocalSearch(M, p);
    const qv = scoreOf(M, q);
    starts++;
    if (qv > bestVal) { best = q; bestVal = qv; }
    if (starts % 16 === 0) opts.progress?.(Math.min(1, (now() - t0) / budget), `${starts} restarts`);
  }
  return { order: best, value: bestVal, starts };
}

/** Exact exclusion DP with a block-table bound built from the incumbent. */
export function exclusionExact(M: number[][], incumbent: number[], maxStates = 3_000_000) {
  const n = M.length;
  if (n > 26) throw new Error("the exclusion DP is limited to n ≤ 26");
  const blocks = n >= 4 ? segmentOrder(M, incumbent, Math.min(10, Math.max(2, Math.ceil(Math.sqrt(n)) + 1))) : undefined;
  try {
    const r = exclusionDP(M, incumbent, { blocks, maxStates });
    return { order: r.order, value: r.opt, generated: r.generated, retained: r.retained, excluded: r.excluded, blocks: blocks ?? null };
  } catch (e) {
    if (/state limit/.test((e as Error).message)) throw new Interrupted(`state budget of ${maxStates.toLocaleString("en-US")} prefix states exhausted`);
    throw e;
  }
}

/** Exhaustive enumeration (independent optimality check). Exact for integer M below 2^53. */
export function bruteForce(M: number[][]): { value: number; count: number; optimaCount: number } {
  const n = M.length;
  if (n > 9) throw new Error("exhaustive enumeration is limited to n ≤ 9");
  let best = -Infinity;
  let optimaCount = 0;
  let count = 0;
  const used = new Array(n).fill(false);
  const prefix: number[] = [];
  const rec = (acc: number) => {
    if (prefix.length === n) {
      count++;
      if (acc > best) { best = acc; optimaCount = 1; } else if (acc === best) optimaCount++;
      return;
    }
    for (let v = 0; v < n; v++) {
      if (used[v]) continue;
      let g = 0;
      for (const u of prefix) g += M[u][v];
      used[v] = true;
      prefix.push(v);
      rec(acc + g);
      prefix.pop();
      used[v] = false;
    }
  };
  rec(0);
  return { value: n === 0 ? 0 : best, count: n === 0 ? 1 : count, optimaCount: n === 0 ? 1 : optimaCount };
}
