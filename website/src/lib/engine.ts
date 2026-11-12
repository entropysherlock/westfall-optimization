/**
 * Browser optimization engine (runs entirely in the visitor's browser).
 *
 * IMPORTANT SCOPE NOTE: this is NOT the BLX 2.0 implementation. It contains
 *  (1) an exact unrestricted subset dynamic program (complete exhaustive argument, small n), and
 *  (2) an exclusion DP with the trivial suffix bound or the exact-block-table hybrid bound
 *      (Discovery 018 Theorem 1 with an empty transversal packing, which is admissible).
 * The full BLX 2.0 solver (triangle-packing LPs, portfolio routing, exact certificates) is the
 * Python package `westfall_optimization`. Objective convention: F_A(pi) = sum_{r<s} a_{pi_r pi_s}.
 */

export type Matrix = number[][];

export function validateSkew(A: Matrix): string | null {
  const n = A.length;
  if (n === 0) return "matrix is empty";
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(A[i]) || A[i].length !== n) return "matrix must be square";
    for (let j = 0; j < n; j++) {
      const v = A[i][j];
      if (typeof v !== "number" || !Number.isFinite(v)) return `entry (${i + 1}, ${j + 1}) is not a finite number`;
    }
    if (A[i][i] !== 0) return `diagonal entry (${i + 1}, ${i + 1}) must be 0`;
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (A[i][j] !== -A[j][i]) return `not skew-symmetric at (${i + 1}, ${j + 1}): a_ij must equal -a_ji`;
  return null;
}

export function score(A: Matrix, order: number[]): number {
  let s = 0;
  for (let r = 0; r < order.length; r++) for (let t = r + 1; t < order.length; t++) s += A[order[r]][order[t]];
  return s;
}

export function totalWeight(A: Matrix): number {
  let w = 0;
  for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) w += Math.abs(A[i][j]);
  return w;
}

export function backwardWeight(A: Matrix, order: number[]): number {
  return (totalWeight(A) - score(A, order)) / 2;
}

/** Arcs u->v (a_uv > 0, i.e. "u should precede v") that point backward in `order`. */
export function backwardArcs(A: Matrix, order: number[]): [number, number, number][] {
  const pos = new Map(order.map((v, i) => [v, i]));
  const out: [number, number, number][] = [];
  for (let u = 0; u < A.length; u++)
    for (let v = 0; v < A.length; v++) if (A[u][v] > 0 && pos.get(u)! > pos.get(v)!) out.push([u, v, A[u][v]]);
  return out;
}

export const isIntegerMatrix = (A: Matrix) => A.every((r) => r.every((x) => Number.isInteger(x)));
const EPS = 1e-9;

/* ------------------------------------------------------------------ */
/* Seeded PRNG + instance generators                                    */
/* ------------------------------------------------------------------ */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function permuteMatrix(A: Matrix, perm: number[]): Matrix {
  return perm.map((i) => perm.map((j) => A[i][j]));
}

function emptyMatrix(n: number): Matrix {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function setPair(A: Matrix, i: number, j: number, v: number) {
  A[i][j] = v;
  A[j][i] = v === 0 ? 0 : -v;
}

export type Generator = "near-transitive" | "random-int" | "cyclic" | "paley" | "blocks" | "ties";

export function generate(kind: Generator, n: number, seed: number): Matrix {
  const rnd = mulberry32(seed);
  const A = emptyMatrix(n);
  if (kind === "paley") {
    const p = [3, 7, 11, 19].reduce((b, q) => (q <= n ? q : b), 3);
    const Q = new Set<number>();
    for (let z = 1; z < p; z++) Q.add((z * z) % p);
    const P = emptyMatrix(p);
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) setPair(P, i, j, Q.has((j - i) % p) ? 1 : -1);
    return P;
  }
  if (kind === "cyclic") {
    for (let i = 0; i < n; i++)
      for (let d = 1; d <= Math.floor((n - 1) / 2); d++) setPair(A, i, (i + d) % n, 1);
    return A;
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      let v = 0;
      if (kind === "near-transitive") v = (1 + Math.floor(rnd() * 5)) * (rnd() < 0.15 ? -1 : 1);
      else if (kind === "random-int") v = Math.floor(rnd() * 11) - 5 || 1;
      else if (kind === "ties") v = Math.floor(rnd() * 5) - 2;
      else if (kind === "blocks") {
        const bi = Math.floor((i * 3) / n), bj = Math.floor((j * 3) / n);
        if (bi === bj) v = rnd() < 0.5 ? 2 : -2; // frustrated inside blocks
        else v = rnd() < 0.08 ? -1 : 3; // mostly consistent cross preferences, a few reversals
      }
      setPair(A, i, j, v);
    }
  return permuteMatrix(A, shuffle([...Array(n).keys()], rnd));
}

/* ------------------------------------------------------------------ */
/* Incumbent: insertion local search (heuristic)                        */
/* ------------------------------------------------------------------ */
export function insertionLocalSearch(A: Matrix, start: number[]): number[] {
  let perm = start.slice();
  let improved = true;
  while (improved) {
    improved = false;
    for (const v of start) {
      const i = perm.indexOf(v);
      const rest = perm.slice(0, i).concat(perm.slice(i + 1));
      let pref = 0;
      const vals: number[] = [];
      let suf = 0;
      for (const u of rest) suf += A[v][u];
      vals.push(pref + suf);
      for (const u of rest) {
        pref += A[u][v];
        suf -= A[v][u];
        vals.push(pref + suf);
      }
      let k = 0;
      for (let t = 1; t < vals.length; t++) if (vals[t] > vals[k]) k = t;
      if (vals[k] > vals[i] + EPS) {
        perm = rest.slice(0, k).concat([v], rest.slice(k));
        improved = true;
      }
    }
  }
  return perm;
}

/* ------------------------------------------------------------------ */
/* Exact unrestricted subset DP                                         */
/* ------------------------------------------------------------------ */
export const SUBSET_DP_MAX_N = 18;

export interface SubsetDPResult {
  opt: number;
  order: number[];
  states: number;
  /** certified[x][y] = true if x precedes y in EVERY optimal ordering (computed when n <= 14) */
  certified: boolean[][] | null;
  certifiedCount: number | null;
}

export function subsetDP(A: Matrix): SubsetDPResult {
  const n = A.length;
  if (n > SUBSET_DP_MAX_N) throw new Error(`browser subset DP is limited to n <= ${SUBSET_DP_MAX_N}`);
  const N = 1 << n;
  const f = new Float64Array(N).fill(-Infinity);
  f[0] = 0;
  const gain = (v: number, S: number) => {
    let g = 0;
    for (let u = 0; u < n; u++) if (S & (1 << u)) g += A[u][v];
    return g;
  };
  for (let S = 0; S < N; S++) {
    const fs = f[S];
    if (fs === -Infinity) continue;
    for (let v = 0; v < n; v++) {
      if (S & (1 << v)) continue;
      const C = S | (1 << v);
      const val = fs + gain(v, S);
      if (val > f[C]) f[C] = val;
    }
  }
  const full = N - 1;
  // backward completion values
  const b = new Float64Array(N).fill(-Infinity);
  b[full] = 0;
  for (let S = full - 1; S >= 0; S--) {
    let best = -Infinity;
    for (let v = 0; v < n; v++) {
      if (S & (1 << v)) continue;
      const val = gain(v, S) + b[S | (1 << v)];
      if (val > best) best = val;
    }
    b[S] = best;
  }
  const opt = f[full];
  // reconstruct one optimal ordering
  const order: number[] = [];
  let S = 0;
  for (let k = 0; k < n; k++) {
    for (let v = 0; v < n; v++) {
      if (S & (1 << v)) continue;
      const C = S | (1 << v);
      if (Math.abs(f[S] + gain(v, S) + b[C] - opt) <= EPS * Math.max(1, Math.abs(opt))) {
        order.push(v);
        S = C;
        break;
      }
    }
  }
  let certified: boolean[][] | null = null;
  let certifiedCount: number | null = null;
  if (n <= 14) {
    // W[y][x] = best value among orderings with y before x
    const W = Array.from({ length: n }, () => Array(n).fill(-Infinity));
    for (let T = 0; T < N; T++) {
      if (f[T] === -Infinity) continue;
      for (let x = 0; x < n; x++) {
        if (T & (1 << x)) continue;
        const val = f[T] + gain(x, T) + b[T | (1 << x)];
        for (let y = 0; y < n; y++) if (T & (1 << y) && val > W[y][x]) W[y][x] = val;
      }
    }
    certified = Array.from({ length: n }, () => Array(n).fill(false));
    certifiedCount = 0;
    const tol = EPS * Math.max(1, Math.abs(opt));
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++)
        if (x !== y && W[y][x] < opt - tol) {
          certified[x][y] = true;
          certifiedCount++;
        }
  }
  return { opt, order, states: N, certified, certifiedCount };
}

/* ------------------------------------------------------------------ */
/* Exclusion DP (SLDP / BLX mechanism) with a live trace                */
/* ------------------------------------------------------------------ */
export interface TraceEntry {
  layer: number;
  S: number; // prefix bitmask
  f: number; // best retained prefix score
  r: number; // cross contribution r(S)
  U: number; // admissible suffix bound U(V \ S)
  lhs: number; // f + r + U
  kept: boolean;
}
export interface ExclusionResult {
  opt: number;
  order: number[];
  threshold: number;
  generated: number;
  retained: number;
  excluded: number;
  trace: TraceEntry[] | null;
  bound: "trivial" | "blocks";
}

/** beta*(X) for every subset X of each block (exact, by subset DP inside the block). */
export function blockTables(A: Matrix, blocks: number[][]): number[][] {
  return blocks.map((B) => {
    const b = B.length;
    const best = new Float64Array(1 << b).fill(-Infinity);
    best[0] = 0;
    for (let m = 0; m < 1 << b; m++) {
      if (best[m] === -Infinity) continue;
      for (let k = 0; k < b; k++) {
        if (m & (1 << k)) continue;
        let g = 0;
        for (let j = 0; j < b; j++) if (m & (1 << j)) g += A[B[j]][B[k]];
        const c = m | (1 << k);
        if (best[m] + g > best[c]) best[c] = best[m] + g;
      }
    }
    const tab: number[] = [];
    for (let m = 0; m < 1 << b; m++) {
      let W = 0;
      for (let i = 0; i < b; i++) for (let j = i + 1; j < b; j++) if (m & (1 << i) && m & (1 << j)) W += Math.abs(A[B[i]][B[j]]);
      tab.push((W - best[m]) / 2);
    }
    return tab;
  });
}

export function exclusionDP(
  A: Matrix,
  incumbent: number[],
  opts: { blocks?: number[][]; trace?: boolean; maxStates?: number } = {}
): ExclusionResult {
  const n = A.length;
  if (n > 26) throw new Error("browser exclusion DP is limited to n <= 26");
  const maxStates = opts.maxStates ?? 2_000_000;
  const t = score(A, incumbent);
  const rowsum = A.map((r) => r.reduce((s, x) => s + x, 0));
  const tabs = opts.blocks ? blockTables(A, opts.blocks) : null;
  const full = n === 32 ? 0xffffffff : (1 << n) - 1;
  const W = (T: number) => {
    let w = 0;
    for (let i = 0; i < n; i++) if (T & (1 << i)) for (let j = i + 1; j < n; j++) if (T & (1 << j)) w += Math.abs(A[i][j]);
    return w;
  };
  const U = (T: number) => {
    let u = W(T);
    if (tabs && opts.blocks) {
      let lb = 0;
      opts.blocks.forEach((B, bi) => {
        let idx = 0;
        B.forEach((v, k) => {
          if (T & (1 << v)) idx |= 1 << k;
        });
        lb += tabs[bi][idx];
      });
      u -= 2 * lb;
    }
    return u;
  };
  const rOf = (S: number) => {
    let r = 0;
    for (let u = 0; u < n; u++) if (S & (1 << u)) r += rowsum[u];
    return r;
  };
  const gain = (v: number, S: number) => {
    let g = 0;
    for (let u = 0; u < n; u++) if (S & (1 << u)) g += A[u][v];
    return g;
  };
  const tol = EPS * Math.max(1, Math.abs(t));
  const layers: Map<number, number>[] = [new Map([[0, 0]])];
  const trace: TraceEntry[] | null = opts.trace ? [] : null;
  let generated = 1;
  for (let k = 1; k <= n; k++) {
    const cand = new Map<number, number>();
    for (const [S, fS] of layers[k - 1]) {
      for (let v = 0; v < n; v++) {
        if (S & (1 << v)) continue;
        const C = (S | (1 << v)) >>> 0;
        const val = fS + gain(v, S);
        if (!cand.has(C) || val > cand.get(C)!) cand.set(C, val);
      }
    }
    generated += cand.size;
    if (generated > maxStates) throw new Error(`state limit (${maxStates}) reached`);
    const kept = new Map<number, number>();
    for (const [C, fc] of cand) {
      const r = rOf(C);
      const u = U((full ^ C) >>> 0);
      const lhs = fc + r + u;
      const keep = lhs >= t - tol;
      if (keep) kept.set(C, fc);
      if (trace) trace.push({ layer: k, S: C, f: fc, r, U: u, lhs, kept: keep });
    }
    layers.push(kept);
  }
  const fFull = layers[n].get(full >>> 0);
  if (fFull === undefined) throw new Error("no retained chain reached V (threshold above optimum?)");
  // reconstruct backwards through retained states
  const order: number[] = [];
  let S = full >>> 0;
  for (let k = n; k >= 1; k--) {
    const fS = layers[k].get(S)!;
    for (let v = 0; v < n; v++) {
      if (!(S & (1 << v))) continue;
      const P = (S & ~(1 << v)) >>> 0;
      const fp = layers[k - 1].get(P);
      if (fp !== undefined && Math.abs(fp + gain(v, P) - fS) <= tol) {
        order.push(v);
        S = P;
        break;
      }
    }
  }
  order.reverse();
  const retained = layers.reduce((s, L) => s + L.size, 0);
  return { opt: fFull, order, threshold: t, generated, retained, excluded: generated - retained, trace, bound: tabs ? "blocks" : "trivial" };
}

/** Segment an ordering into contiguous blocks of size <= bmax minimising the backward weight that crosses blocks. */
export function segmentOrder(A: Matrix, order: number[], bmax: number): number[][] {
  const n = order.length;
  const inside = (s: number, e: number) => {
    let w = 0;
    for (let p = s; p < e; p++) for (let q = p + 1; q < e; q++) if (A[order[p]][order[q]] < 0) w -= A[order[p]][order[q]];
    return w;
  };
  const best = Array(n + 1).fill(-Infinity);
  const arg = Array(n + 1).fill(0);
  best[0] = 0;
  for (let e = 1; e <= n; e++)
    for (let s = Math.max(0, e - bmax); s < e; s++) {
      const v = best[s] + inside(s, e);
      if (v > best[e]) {
        best[e] = v;
        arg[e] = s;
      }
    }
  const segs: number[][] = [];
  let e = n;
  while (e > 0) {
    segs.push(order.slice(arg[e], e));
    e = arg[e];
  }
  return segs.reverse();
}

/** Brute force over all permutations (tests only; n <= 8). */
export function bruteForce(A: Matrix): number {
  const n = A.length;
  let best = -Infinity;
  const perm = [...Array(n).keys()];
  const rec = (k: number) => {
    if (k === n) {
      best = Math.max(best, score(A, perm));
      return;
    }
    for (let i = k; i < n; i++) {
      [perm[k], perm[i]] = [perm[i], perm[k]];
      rec(k + 1);
      [perm[k], perm[i]] = [perm[i], perm[k]];
    }
  };
  rec(0);
  return best;
}
