/**
 * AutoCut — browser port of the Lean-verified executable `autoCutX` / `autoCutC`
 * (branch formal/westfall-theorem, lean/Westfall022/Exec.lean and CostedAutoCut.lean).
 *
 * STATUS: this TypeScript code is NOT formally verified. It follows the Lean definitions step by
 * step (same rounds k = 2^j, same reachable-cut layers, node set, candidate thresholds (τ, b),
 * shortest-path recursion, extraction, ordering DP and tie-breaking: colex-least set, least vertex,
 * lexicographically least (τ, b) with τ = ∞ last). Its outputs are tested for exact equality with
 * the compiled Lean executable on every archived instance the Lean run completed
 * (tests/autocut.test.ts).
 *
 * Arithmetic is exact: all inputs are scaled to integers, and for a fixed threshold τ every
 * φ_τ value shares the denominator τ, so path lengths are integers (BigInt).
 */
import { Q, lcm } from "./rational";

export interface AutoCutResult {
  /** OPT(A) = f_k(V), exact. */
  value: Q;
  /** Optimal ordering (position → vertex). */
  order: number[];
  /** Block index of every vertex (the recovered ordered partition). */
  partition: number[];
  blocks: number[][];
  /** λ(𝓑) of the recovered partition, which equals λ(A) by the verified theorem. */
  lambda: number;
  bmax: number;
  K0: number;
  /** The accepted threshold k = 2^j and the number of rounds tried. */
  k: number;
  rounds: number;
  reachable: number;
  nodes: number;
  candidate: { tau: Q | null; b: number };
}

export interface AutoCutHooks {
  progress?: (fraction: number, note: string) => void;
  deadline?: number;
}

const popcount = (x: number) => {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
};

function isqrt(k: number): number {
  let r = Math.floor(Math.sqrt(k));
  while (r * r > k) r--;
  while ((r + 1) * (r + 1) <= k) r++;
  return r;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export const AUTOCUT_MAX_N = 12;

export function autoCut(A: Q[][], hooks: AutoCutHooks = {}): AutoCutResult | null {
  const n = A.length;
  if (n > AUTOCUT_MAX_N) throw new Error(`AutoCut in the browser is limited to n ≤ ${AUTOCUT_MAX_N}`);
  let scale = 1n;
  for (const r of A) for (const x of r) scale = lcm(scale, x.den);
  const M: bigint[][] = A.map((r) => r.map((x) => (x.num * scale) / x.den));
  const full = (1 << n) - 1;

  // weak-majority cut: pairs (w ∉ S, u ∈ S) with a_wu ≥ 0
  const wmcCache = new Int32Array(1 << n).fill(-1);
  const wmc = (S: number) => {
    if (wmcCache[S] >= 0) return wmcCache[S];
    let c = 0;
    for (let w = 0; w < n; w++) if (!(S & (1 << w))) for (let u = 0; u < n; u++) if (S & (1 << u) && M[w][u] >= 0n) c++;
    wmcCache[S] = c;
    return c;
  };

  // candidate thresholds: τ = ∞ (null) and every distinct positive entry
  const tauVals: bigint[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i][j] > 0n && !tauVals.includes(M[i][j])) tauVals.push(M[i][j]);
  tauVals.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  for (let j = 0; j <= 2 * n; j++) {
    const k = 2 ** j;
    hooks.progress?.(j / (2 * n + 1), `round ${j + 1}: threshold k = ${k}`);
    if (hooks.deadline !== undefined && now() > hooks.deadline) throw new Error("time limit reached");
    const rec = recognize(k);
    if (rec) {
      const { cutVal, order } = orderDP(k);
      const { blocks, bmax, K0 } = partitionParams(rec.partition);
      return {
        value: Q.of(cutVal, scale),
        order,
        partition: rec.partition,
        blocks,
        lambda: bmax * bmax + 3 * K0,
        bmax,
        K0,
        k,
        rounds: j + 1,
        reachable: rec.reachable,
        nodes: rec.nodes,
        candidate: { tau: rec.tau === null ? null : Q.of(rec.tau, scale), b: rec.b },
      };
    }
  }
  return null;

  function recognize(k: number) {
    // Stage 1: reachable k-cuts, layer by layer
    const reachableSets: number[] = [0];
    let layer = [0];
    for (let s = 0; s < n; s++) {
      const next = new Set<number>();
      for (const S of layer)
        for (let v = 0; v < n; v++) {
          if (S & (1 << v)) continue;
          const T = S | (1 << v);
          if (wmc(T) <= k) next.add(T);
        }
      layer = [...next];
      reachableSets.push(...layer);
    }
    // closed-form abort test U(n,k) = (n+1)(3k+1)·2^{5(⌊√(3k)⌋+1)} (never changes a decision)
    const U = BigInt(n + 1) * BigInt(3 * k + 1) * 2n ** BigInt(5 * (isqrt(3 * k) + 1));
    if (BigInt(reachableSets.length) > U) return null;
    const nodes = reachableSets.filter((S) => wmc(S) <= Math.floor(k / 3)).sort((a, b) => popcount(a) - popcount(b) || a - b);
    const nodeSet = new Set(nodes);
    if (!nodeSet.has(full)) return null; // dist(V) = ⊤ for every candidate
    const bMax = isqrt(k);

    let best: { val: number; tau: bigint | null; b: number } | null = null;
    // candidates in key order: finite τ ascending, then τ = ∞; b ascending (ties keep the first)
    const taus: (bigint | null)[] = [...tauVals, null];
    for (const tau of taus) {
      const D = tau === null ? 1n : tau;
      const phi = (c: bigint) => (tau === null ? 1n : c < 0n ? tau - c : c < tau ? tau : 0n);
      // column sums of φ over each node set, used for edge costs
      const P: bigint[][] = M.map((r) => r.map(phi));
      const edge = (C: number, Y: number) => {
        let s = 0n;
        for (let u = 0; u < n; u++) if (C & (1 << u)) for (let v = 0; v < n; v++) if (Y & (1 << v)) s += P[u][v];
        return s;
      };
      for (let b = 0; b <= bMax; b++) {
        const dist = shortest(nodes, b, edge);
        const d = dist.get(full);
        const val = d === undefined || d === null ? Infinity : b * b + 3 * Number(d / D);
        if (best === null || val < best.val) best = { val, tau, b };
      }
    }
    if (!best || best.val > k) return null;
    // extraction for the selected candidate
    const tau = best.tau;
    const phi = (c: bigint) => (tau === null ? 1n : c < 0n ? tau - c : c < tau ? tau : 0n);
    const P: bigint[][] = M.map((r) => r.map(phi));
    const edge = (C: number, Y: number) => {
      let s = 0n;
      for (let u = 0; u < n; u++) if (C & (1 << u)) for (let v = 0; v < n; v++) if (Y & (1 << v)) s += P[u][v];
      return s;
    };
    const dist = shortest(nodes, best.b, edge);
    const labels = new Array<number>(n).fill(0);
    // extract(C'): if preds nonempty: C = colex-least minimiser of dist(C) + edge(C, C' \ C)
    const chain: number[] = [full];
    let cur = full;
    for (;;) {
      const preds = predsOf(nodes, cur, best.b);
      if (preds.length === 0) break;
      // selMinSet: minimise dist(C) + edge(C, C' ∖ C) (⊤ largest); ties → colex-least (= numerically least) set
      let arg = -1;
      let argVal: bigint | null = null; // null = ⊤
      for (const C of preds) {
        const dc = dist.get(C);
        const v = dc === undefined || dc === null ? null : dc + edge(C, cur & ~C);
        const less = v !== null && (argVal === null || v < argVal);
        if (arg < 0 || less) {
          arg = C;
          argVal = v;
        }
      }
      chain.push(arg);
      cur = arg;
    }
    // labels: the chain is full ⊃ C₁ ⊃ … ⊃ C_m; vertex v gets the index of the first set containing it
    chain.reverse(); // C_m … full
    for (let v = 0; v < n; v++) {
      // r.1 at chain position i is i; label(v) = r.1 of the step where v first appears
      let lab = 0;
      for (let i = 1; i < chain.length; i++) {
        if (chain[i] & (1 << v) && !(chain[i - 1] & (1 << v))) {
          lab = i - 1;
          break;
        }
      }
      labels[v] = n === 0 ? 0 : lab % n;
    }
    return { partition: labels, reachable: reachableSets.length, nodes: nodes.length, tau: best.tau, b: best.b };
  }

  function predsOf(nodes: number[], C2: number, b: number): number[] {
    const out: number[] = [];
    for (const C of nodes) if (C !== C2 && (C & C2) === C && popcount(C2 & ~C) <= b) out.push(C);
    return out.sort((x, y) => x - y);
  }

  function shortest(nodes: number[], b: number, edge: (C: number, Y: number) => bigint): Map<number, bigint | null> {
    const dist = new Map<number, bigint | null>();
    for (const C2 of nodes) {
      if (C2 === 0) {
        dist.set(0, 0n);
        continue;
      }
      let best: bigint | null = null;
      for (const C of predsOf(nodes, C2, b)) {
        const dc = dist.get(C);
        if (dc === undefined || dc === null) continue;
        const v = dc + edge(C, C2 & ~C);
        if (best === null || v < best) best = v;
      }
      dist.set(C2, best);
    }
    return dist;
  }

  function orderDP(k: number) {
    const memo = new Map<number, bigint | null>(); // null = ⊥
    const gain = (T: number, v: number) => {
      let s = 0n;
      for (let u = 0; u < n; u++) if (T & (1 << u)) s += M[u][v];
      return s;
    };
    const cutDP = (S: number): bigint | null => {
      if (S === 0) return 0n;
      if (memo.has(S)) return memo.get(S)!;
      let res: bigint | null = null;
      if (wmc(S) <= k) {
        for (let v = 0; v < n; v++) {
          if (!(S & (1 << v))) continue;
          const T = S & ~(1 << v);
          const c = cutDP(T);
          if (c === null) continue;
          const val = c + gain(T, v);
          if (res === null || val > res) res = val;
        }
      }
      memo.set(S, res);
      return res;
    };
    const cutVal = cutDP(full);
    if (cutVal === null) throw new Error("internal error: cut DP has no value");
    // dpOrder(S): v = least vertex maximising cutDP(S∖v) + gain(S∖v, v); extendPerm(dpOrder(S∖v), |S|−1, v)
    const dpOrder = (S: number): number[] => {
      if (S === 0) return [...Array(n).keys()];
      let arg = -1;
      let argVal: bigint | null = null;
      for (let v = 0; v < n; v++) {
        if (!(S & (1 << v))) continue;
        const T = S & ~(1 << v);
        const c = cutDP(T);
        const val = c === null ? null : c + gain(T, v);
        if (arg < 0 || (val !== null && (argVal === null || val > argVal))) {
          arg = v;
          argVal = val;
        }
      }
      const pi = dpOrder(S & ~(1 << arg));
      const t = popcount(S) - 1;
      if (t < n) {
        const p = pi[t];
        return pi.map((x) => (x === p ? arg : x === arg ? p : x));
      }
      return pi;
    };
    return { cutVal, order: dpOrder(full) };
  }

  function partitionParams(part: number[]) {
    const ids = [...new Set(part)].sort((a, b) => a - b);
    const blocks = ids.map((id) => part.map((p, v) => (p === id ? v : -1)).filter((v) => v >= 0));
    const bmax = Math.max(0, ...blocks.map((B) => B.length));
    // K₀ = min over τ ∈ {∞} ∪ {positive cross margins} of N⁻ + Z(τ) + ⌊X/τ⌋ (Z(∞) = #{c ≥ 0}, ⌊X/∞⌋ = 0)
    const cross: bigint[] = [];
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (part[u] < part[v]) cross.push(M[u][v]);
    const neg = cross.filter((c) => c < 0n);
    const Nneg = neg.length;
    const X = neg.reduce((s, c) => s - c, 0n);
    let K0 = Nneg + cross.filter((c) => c >= 0n).length;
    for (const t of new Set(cross.filter((c) => c > 0n))) {
      const val = Nneg + cross.filter((c) => c >= 0n && c < t).length + Number(X / t);
      if (val < K0) K0 = val;
    }
    return { blocks, bmax, K0 };
  }
}
