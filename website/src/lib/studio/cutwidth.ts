/**
 * ATLAS-031 — experimental exact DIRECTED CUTWIDTH solver (separate from weighted linear ordering).
 *
 * Input: a digraph as an adjacency matrix adj[u][v] = true iff the arc u → v exists (two-way arcs
 * allowed, loops ignored). For a set S, cut(S) = #{(u,v) ∈ E : u ∉ S, v ∈ S}; the width of an
 * ordering is the largest cut of a prefix; ctw(D) is the least width.
 *
 * decide(k): ctw(D) ≤ k  ⇔  V is reachable from ∅ by adding one vertex at a time while every
 * intermediate set S has cut(S) ≤ k (the prefixes of a width-≤k ordering are such a chain, and any
 * such chain is an ordering of width ≤ k). Search is layered by |S| with exact deduplication.
 *
 * State cap (semicomplete inputs only). Theorem A, Lean kernel-checked as
 * Westfall040.card_kcuts_le_of_width_le_k (Mission 040, research/westfall-040/lean): if D is
 * semicomplete and ctw(D) ≤ k then D has at most (n+1)·H(2k) k-cuts, with H computed exactly below.
 * So when more than that many distinct reachable k-cuts are generated, ctw(D) > k is certified and
 * the search stops. The cap is only applied when the input is semicomplete. This TypeScript code is
 * not itself verified, so results that rely on the cap are still flagged (`capUsed`).
 */
import { Interrupted } from "./solvers";

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** H(K) = #{λ_1 ≥ λ_2 ≥ … ≥ 0 : i·λ_i ≤ K}, exact (BigInt), O(K log K) additions. */
export function hyperbolaPartitions(K: number): bigint {
  if (K < 0) throw new Error("K must be non-negative");
  if (K === 0) return 1n;
  let T: bigint[] = [1n];
  for (let i = K; i >= 1; i--) {
    const cap = Math.floor(K / i), capn = Math.floor(K / (i + 1));
    const next: bigint[] = new Array(cap + 1);
    let acc = 0n;
    for (let v = 0; v <= cap; v++) { acc += T[Math.min(v, capn)]; next[v] = acc; }
    T = next;
  }
  return T[K];
}

/**
 * The theorem's cap (n+1)·H(2k) as a BigInt, or null when it is vacuous (≥ 2^n, the number of all
 * subsets). Shortcut: (n+1)·H(2k) ≥ 2k+2 grows quickly; we first compare the analytic upper bound
 * log2((n+1)) + 2π√(2k)/ln 2 with n — if even the *upper* bound is below n the exact cap is
 * meaningful; otherwise we compute H exactly (cheap for k ≤ 20 000) and compare with 2^n.
 */
export function stateCap(n: number, k: number): bigint | null {
  if (k > 20_000) return null; // H would be enormous and is certainly ≥ 2^n for any n we can store
  const cap = BigInt(n + 1) * hyperbolaPartitions(2 * k);
  return cap >= 1n << BigInt(n) ? null : cap;
}

export function isSemicomplete(adj: boolean[][]): boolean {
  const n = adj.length;
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (!adj[u][v] && !adj[v][u]) return false;
  return true;
}

export function validateDigraph(adj: boolean[][]): string | null {
  const n = adj.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(adj[i]) || adj[i].length !== n) return "adjacency matrix must be square";
    for (let j = 0; j < n; j++) if (typeof adj[i][j] !== "boolean") return `entry (${i + 1}, ${j + 1}) must be true/false`;
  }
  return null;
}

export function cutOf(adj: boolean[][], S: Set<number>): number {
  let c = 0;
  for (const v of S) for (let u = 0; u < adj.length; u++) if (u !== v && !S.has(u) && adj[u][v]) c++;
  return c;
}

export function widthOf(adj: boolean[][], order: number[]): number {
  const S = new Set<number>();
  let w = 0;
  for (const v of order.slice(0, -1)) { S.add(v); w = Math.max(w, cutOf(adj, S)); }
  return w;
}

export interface DecideResult {
  feasible: boolean;
  order: number[] | null;
  states: number; // distinct reachable k-cuts generated
  maxLayer: number;
  capUsed: boolean; // the NO answer came from the theorem's state cap
  cap: string | null;
}

export function decideCutwidth(adj: boolean[][], k: number, opts: { maxStates?: number; deadline?: number; useCap?: boolean } = {}): DecideResult {
  const n = adj.length;
  if (n <= 1) return { feasible: true, order: [...Array(n).keys()], states: 1, maxLayer: 1, capUsed: false, cap: null };
  const words = (n + 31) >>> 5;
  const out: Uint32Array[] = [], inn: Uint32Array[] = [];
  const indeg = new Int32Array(n);
  for (let v = 0; v < n; v++) { out.push(new Uint32Array(words)); inn.push(new Uint32Array(words)); }
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (u !== v && adj[u][v]) {
    out[u][v >>> 5] |= 1 << (v & 31); inn[v][u >>> 5] |= 1 << (u & 31); indeg[v]++;
  }
  const pop = (x: number) => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };
  const andPop = (a: Uint32Array, m: Uint32Array) => { let c = 0; for (let i = 0; i < words; i++) c += pop(a[i] & m[i]); return c; };
  const useCap = (opts.useCap ?? true) && isSemicomplete(adj);
  const capBig = useCap ? stateCap(n, k) : null;
  const cap = capBig === null ? Infinity : capBig > BigInt(Number.MAX_SAFE_INTEGER) ? Infinity : Number(capBig);
  const maxStates = opts.maxStates ?? 5_000_000;
  const keyOf = (m: Uint32Array) => { let s = ""; for (let i = 0; i < words; i++) s += String.fromCharCode(m[i] & 0xffff, m[i] >>> 16); return s; };
  interface Layer { masks: Uint32Array[]; cut: number[]; parent: number[]; added: number[] }
  const layers: Layer[] = [{ masks: [new Uint32Array(words)], cut: [0], parent: [-1], added: [-1] }];
  let states = 1, maxLayer = 1, ops = 0;
  for (let t = 0; t < n; t++) {
    const cur = layers[t];
    const next: Layer = { masks: [], cut: [], parent: [], added: [] };
    const seen = new Set<string>();
    for (let s = 0; s < cur.masks.length; s++) {
      if ((ops++ & 1023) === 0 && opts.deadline !== undefined && now() > opts.deadline) throw new Interrupted("time limit reached during the cutwidth search");
      const S = cur.masks[s];
      for (let v = 0; v < n; v++) {
        if (S[v >>> 5] & (1 << (v & 31))) continue;
        // cut(S ∪ {v}) = cut(S) − #{v→u : u ∈ S} + #{u→v : u ∉ S ∪ {v}}
        const c = cur.cut[s] - andPop(out[v], S) + (indeg[v] - andPop(inn[v], S));
        if (c > k) continue;
        const T = S.slice(); T[v >>> 5] |= 1 << (v & 31);
        const key = keyOf(T);
        if (seen.has(key)) continue;
        seen.add(key);
        next.masks.push(T); next.cut.push(c); next.parent.push(s); next.added.push(v);
        states++;
        if (states > cap) return { feasible: false, order: null, states, maxLayer, capUsed: true, cap: capBig!.toString() };
        if (states > maxStates) throw new Interrupted(`state budget of ${maxStates.toLocaleString("en-US")} cut states exhausted`);
      }
    }
    if (next.masks.length === 0) return { feasible: false, order: null, states, maxLayer, capUsed: false, cap: capBig?.toString() ?? null };
    maxLayer = Math.max(maxLayer, next.masks.length);
    layers.push(next);
  }
  const order: number[] = [];
  let idx = 0;
  for (let t = n; t > 0; t--) { order.push(layers[t].added[idx]); idx = layers[t].parent[idx]; }
  order.reverse();
  return { feasible: true, order, states, maxLayer, capUsed: false, cap: capBig?.toString() ?? null };
}

export interface CutwidthResult { cutwidth: number; order: number[]; decisions: { k: number; feasible: boolean; states: number; capUsed: boolean }[]; capReliance: boolean }

/** Exact minimum cutwidth by binary search between 0 and the width of an out-degree ordering. */
export function minCutwidth(adj: boolean[][], opts: { maxStates?: number; deadline?: number; useCap?: boolean } = {}): CutwidthResult {
  const n = adj.length;
  const outdeg = adj.map((r, u) => r.reduce((s, x, v) => s + (x && u !== v ? 1 : 0), 0));
  const start = [...Array(n).keys()].sort((a, b) => outdeg[b] - outdeg[a] || a - b);
  let hi = widthOf(adj, start), bestOrder = start, lo = 0;
  const decisions: CutwidthResult["decisions"] = [];
  let capReliance = false;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const r = decideCutwidth(adj, mid, opts);
    decisions.push({ k: mid, feasible: r.feasible, states: r.states, capUsed: r.capUsed });
    if (r.feasible) { hi = mid; bestOrder = r.order!; } else { lo = mid + 1; if (r.capUsed) capReliance = true; }
  }
  return { cutwidth: hi, order: bestOrder, decisions, capReliance };
}

/** Independent reference: subset DP, best[S] = min_v max(best[S∖v], cut(S)); n ≤ 20. */
export function cutwidthSubsetDP(adj: boolean[][]): number {
  const n = adj.length;
  if (n > 20) throw new Error("reference DP limited to n ≤ 20");
  if (n <= 1) return 0;
  const N = 1 << n;
  const inMask = new Int32Array(n);
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (u !== v && adj[u][v]) inMask[v] |= 1 << u;
  const pc = (x: number) => { let c = 0; while (x) { x &= x - 1; c++; } return c; };
  const cut = new Int32Array(N);
  for (let S = 1; S < N; S++) { let c = 0; for (let v = 0; v < n; v++) if (S & (1 << v)) c += pc(inMask[v] & ~S); cut[S] = c; }
  const best = new Int32Array(N).fill(1 << 30); best[0] = 0;
  for (let S = 1; S < N; S++) {
    let b = 1 << 30;
    for (let v = 0; v < n; v++) if (S & (1 << v)) b = Math.min(b, best[S & ~(1 << v)]);
    best[S] = S === N - 1 ? b : Math.max(b, cut[S]);
  }
  return best[N - 1];
}
