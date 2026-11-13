/**
 * ATLAS-032 — directed-triangle packing lower bounds for weighted linear ordering (native, no LP solver).
 *
 * Setting. P_uv = max(A_uv, 0); the strict preference digraph has an arc u→v of capacity P_uv > 0.
 * β(π) = Σ_{r<s} P_{π_s π_r} is the backward weight of an ordering π.
 *
 * Lemma 1 (packing bound; standard — see NOVELTY.md). Let 𝒯 be the directed 3-cycles and y ≥ 0 with
 * Σ_{T∋e} y_T ≤ P_e for every arc e. Then Σ_T y_T ≤ β(π) for every ordering π.
 * Proof. Every directed cycle has at least one arc pointing backward in π (otherwise π would order
 * the cycle's vertices strictly increasingly around a cycle). Choose one such arc e(T) per T. Then
 * Σ_T y_T ≤ Σ_e Σ_{T: e(T)=e} y_T ≤ Σ_{e backward} Σ_{T∋e} y_T ≤ Σ_{e backward} P_e = β(π). ∎
 *
 * Lemma 2 (restriction). For R ⊆ V, the triangles inside R with the same y form a feasible packing
 * of the instance induced on R (capacities are unchanged and fewer triangles share each arc), so
 * L(R) := Σ_{T ⊆ R} y_T ≤ OPT_β(R). One global packing therefore yields admissible bounds for
 * every residual set, updated in O(#triangles at v) when v leaves R.
 *
 * Exactness. Packings are stored as integers in units of 1/D. Every arc load is checked in exact
 * integer arithmetic (all quantities < 2^53, enforced) before a packing is accepted.
 */

export interface TrianglePacking {
  n: number;
  /** directed cycles (triangles and, optionally, longer cycles): vertices of cycle c are cyc[start[c] .. start[c+1]) */
  start: Int32Array;
  cyc: Int32Array;
  /** weight of each cycle, in units of 1/D (non-negative integers) */
  w: Float64Array;
  D: number;
  /** Σ w (units of 1/D) */
  total: number;
  /** for each vertex v: ids of the cycles through v */
  byVertex: Int32Array[];
  /** triangles only (legacy flat triples, for the certificate exporter) */
  tri: Int32Array;
  method: string;
  ms: number;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Directed 3-cycles of the strict preference digraph, each as three arc ids u*n+v. */
export function directedTriangles(M: number[][]): { verts: number[][]; arcs: number[][] } {
  const n = M.length;
  const verts: number[][] = [], arcs: number[][] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        if (M[i][j] > 0 && M[j][k] > 0 && M[k][i] > 0) { verts.push([i, j, k]); arcs.push([i * n + j, j * n + k, k * n + i]); }
        else if (M[j][i] > 0 && M[k][j] > 0 && M[i][k] > 0) { verts.push([i, k, j]); arcs.push([j * n + i, k * n + j, i * n + k]); }
      }
  return { verts, arcs };
}

function finalize(M: number[][], verts: number[][], _arcs: number[][], yUnits: number[], D: number, method: string, t0: number): TrianglePacking {
  const n = M.length;
  // Exact feasibility: every listed vertex sequence must be a directed cycle of the strict preference digraph
  // (consecutive A > 0, closing arc included) and Σ_{C∋e} y_C ≤ D·P_e on every arc (integers below 2^53).
  const load = new Map<number, number>();
  for (let t = 0; t < verts.length; t++) {
    const y = yUnits[t], c = verts[t];
    if (!(y >= 0) || !Number.isInteger(y)) throw new Error("packing weights must be non-negative integers (units of 1/D)");
    if (y === 0) continue;
    if (c.length < 3 || new Set(c).size !== c.length) throw new Error("packing cycle must have ≥ 3 distinct vertices");
    for (let i = 0; i < c.length; i++) {
      const u = c[i], v = c[(i + 1) % c.length];
      if (!(M[u][v] > 0)) throw new Error(`packing cycle uses a non-arc ${u}→${v}`);
      load.set(u * n + v, (load.get(u * n + v) ?? 0) + y);
    }
  }
  for (const [e, l] of load) {
    const cap = D * Math.max(M[Math.floor(e / n)][e % n], 0);
    if (!Number.isSafeInteger(l) || l > cap) throw new Error(`packing infeasible on arc ${e} (${l} > ${cap})`);
  }
  const keep: number[] = [];
  for (let t = 0; t < verts.length; t++) if (yUnits[t] > 0) keep.push(t);
  const start = new Int32Array(keep.length + 1), flat: number[] = [], w = new Float64Array(keep.length), triFlat: number[] = [];
  const lists: number[][] = Array.from({ length: n }, () => []);
  let total = 0;
  keep.forEach((t, i) => {
    start[i] = flat.length;
    for (const v of verts[t]) { flat.push(v); lists[v].push(i); }
    if (verts[t].length === 3) triFlat.push(...verts[t]);
    w[i] = yUnits[t]; total += yUnits[t];
  });
  start[keep.length] = flat.length;
  if (!Number.isSafeInteger(total)) throw new Error("packing total exceeds 2^53");
  return { n, start, cyc: Int32Array.from(flat), w, D, total, byVertex: lists.map((l) => Int32Array.from(l)), tri: Int32Array.from(triFlat), method, ms: now() - t0 };
}

/**
 * Lemma 1 holds for any directed cycles, not only triangles. With zero margins (ties, sparse data) the 3-dicycle
 * LP implicitly enforces longer cycles through zero-weight pairs, which no triangle packing can see. This extends a
 * packing greedily: repeatedly take a shortest directed cycle (BFS, ≤ maxLen arcs) in the residual-capacity digraph
 * and give it the bottleneck residual capacity. Exactness is re-checked by `finalize`.
 */
export function withLongerCycles(M: number[][], base: TrianglePacking, opts: { maxLen?: number } = {}): TrianglePacking {
  const t0 = now();
  const n = M.length, D = base.D, maxLen = opts.maxLen ?? 12;
  const res = M.map((r) => r.map((x) => (x > 0 ? x * D : 0)));
  const verts: number[][] = [], y: number[] = [];
  for (let c = 0; c < base.w.length; c++) {
    const vs = Array.from(base.cyc.subarray(base.start[c], base.start[c + 1]));
    verts.push(vs); y.push(base.w[c]);
    for (let i = 0; i < vs.length; i++) res[vs[i]][vs[(i + 1) % vs.length]] -= base.w[c];
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let s = 0; s < n; s++) {
      const prev = new Int32Array(n).fill(-1), dist = new Int32Array(n).fill(-1);
      dist[s] = 0; const q = [s]; let found = -1;
      for (let h = 0; h < q.length && found < 0; h++) {
        const u = q[h];
        if (dist[u] >= maxLen - 1) continue;
        for (let v = 0; v < n; v++) {
          if (res[u][v] <= 0) continue;
          if (v === s) { found = u; break; }
          if (dist[v] < 0) { dist[v] = dist[u] + 1; prev[v] = u; q.push(v); }
        }
      }
      if (found < 0) continue;
      const path = [found];
      while (path[path.length - 1] !== s) path.push(prev[path[path.length - 1]]);
      const cyc = path.reverse();
      let m = Infinity;
      for (let i = 0; i < cyc.length; i++) m = Math.min(m, res[cyc[i]][cyc[(i + 1) % cyc.length]]);
      for (let i = 0; i < cyc.length; i++) res[cyc[i]][cyc[(i + 1) % cyc.length]] -= m;
      verts.push(cyc); y.push(m); improved = true;
    }
  }
  const p = finalize(M, verts, [], y, D, `${base.method} + longer cycles (≤ ${maxLen} arcs)`, t0);
  p.ms += base.ms;
  return p;
}

/** Integer arc capacities (scaled by D), or null if M is not integral or too large. */
function scaledCaps(M: number[][], D: number): boolean {
  let sum = 0;
  for (const r of M) for (const x of r) { if (!Number.isInteger(x)) return false; if (x > 0) sum += x; }
  return sum * D < 2 ** 52;
}

/** Greedy integral packing: repeatedly take y_T = min residual capacity, triangles in a fixed order. */
export function greedyPacking(M: number[][]): TrianglePacking {
  const t0 = now();
  const n = M.length;
  const D = 1;
  if (!scaledCaps(M, D)) throw new Error("triangle packing requires an integral matrix (exact arithmetic)");
  const { verts, arcs } = directedTriangles(M);
  const res = new Map<number, number>();
  for (const a of arcs) for (const e of a) res.set(e, M[Math.floor(e / n)][e % n]);
  // order: smallest bottleneck first tends to leave more capacity for others
  const idx = [...verts.keys()];
  const bott = (t: number) => Math.min(...arcs[t].map((e) => M[Math.floor(e / n)][e % n]));
  idx.sort((a, b) => bott(a) - bott(b) || a - b);
  const y = new Array(verts.length).fill(0);
  for (const t of idx) {
    const m = Math.min(res.get(arcs[t][0])!, res.get(arcs[t][1])!, res.get(arcs[t][2])!);
    if (m > 0) { y[t] = m; for (const e of arcs[t]) res.set(e, res.get(e)! - m); }
  }
  return finalize(M, verts, arcs, y, D, "greedy", t0);
}

/**
 * Fractional packing by the Garg–Könemann multiplicative-weights method (a (1−O(ε))-approximation of
 * the maximum fractional triangle packing = the dual of the triangle LP restricted to 3-cycles), then
 * rounded down to units of 1/D, made exactly feasible, and topped up greedily on residual capacity.
 */
export function fractionalPacking(M: number[][], opts: { eps?: number; D?: number; maxIters?: number } = {}): TrianglePacking {
  const t0 = now();
  const n = M.length;
  const eps = opts.eps ?? 0.05;
  let D = opts.D ?? 1 << 12;
  while (D > 1 && !scaledCaps(M, D)) D >>= 1;
  if (!scaledCaps(M, D)) throw new Error("triangle packing requires an integral matrix (exact arithmetic)");
  const { verts, arcs } = directedTriangles(M);
  const T = verts.length;
  if (T === 0) return finalize(M, verts, arcs, [], D, "fractional", t0);
  const arcIds = [...new Set(arcs.flat())];
  const pos = new Map(arcIds.map((e, i) => [e, i]));
  const m = arcIds.length;
  const cap = Float64Array.from(arcIds, (e) => M[Math.floor(e / n)][e % n]);
  const ta = Int32Array.from(arcs.flat().map((e) => pos.get(e)!));
  const delta = (1 + eps) * Math.pow((1 + eps) * m, -1 / eps);
  const len = Float64Array.from(cap, (c) => delta / c);
  let Dval = m * delta;
  const y = new Float64Array(T);
  let iters = 0;
  // Lazy min-heap over triangle lengths: lengths only ever increase, so a popped entry whose stored
  // key equals its current length is a true minimum; stale entries are re-keyed and pushed back.
  const tlen = (t: number) => len[ta[3 * t]] + len[ta[3 * t + 1]] + len[ta[3 * t + 2]];
  const hk: number[] = [], hv: number[] = [];
  const push = (k: number, v: number) => {
    let i = hk.length; hk.push(k); hv.push(v);
    while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; }
  };
  const pop = () => {
    const k = hk[0], v = hv[0], lk = hk.pop()!, lv = hv.pop()!;
    if (hk.length) {
      hk[0] = lk; hv[0] = lv; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < hk.length && hk[l] < hk[m]) m = l; if (r < hk.length && hk[r] < hk[m]) m = r; if (m === i) break; [hk[m], hk[i]] = [hk[i], hk[m]]; [hv[m], hv[i]] = [hv[i], hv[m]]; i = m; }
    }
    return [k, v] as const;
  };
  for (let t = 0; t < T; t++) push(tlen(t), t);
  const maxIters = opts.maxIters ?? 5_000_000;
  while (Dval < 1 && iters < maxIters) {
    const [k, best] = pop();
    const cur = tlen(best);
    if (cur > k * (1 + 1e-12)) { push(cur, best); continue; }
    iters++;
    const a0 = ta[3 * best], a1 = ta[3 * best + 1], a2 = ta[3 * best + 2];
    const c = Math.min(cap[a0], cap[a1], cap[a2]);
    y[best] += c;
    for (const a of [a0, a1, a2]) { const old = len[a]; len[a] = old * (1 + (eps * c) / cap[a]); Dval += cap[a] * (len[a] - old); }
    push(tlen(best), best);
  }
  const scale = Math.log((1 + eps) / delta) / Math.log(1 + eps);
  // round down to units of 1/D, then repair any floating-point excess exactly, then top up greedily
  const yu = Array.from(y, (v) => Math.floor((v / scale) * D * (1 - 1e-9)));
  const load = new Float64Array(m);
  for (let t = 0; t < T; t++) for (let r = 0; r < 3; r++) load[ta[3 * t + r]] += yu[t];
  for (let t = 0; t < T; t++)
    for (let r = 0; r < 3; r++) {
      const a = ta[3 * t + r], over = load[a] - cap[a] * D;
      if (over > 0) { const d = Math.min(over, yu[t]); yu[t] -= d; for (let q = 0; q < 3; q++) load[ta[3 * t + q]] -= d; }
    }
  for (let t = 0; t < T; t++) {
    const s = Math.min(cap[ta[3 * t]] * D - load[ta[3 * t]], cap[ta[3 * t + 1]] * D - load[ta[3 * t + 1]], cap[ta[3 * t + 2]] * D - load[ta[3 * t + 2]]);
    if (s > 0) { yu[t] += s; for (let q = 0; q < 3; q++) load[ta[3 * t + q]] += s; }
  }
  return finalize(M, verts, arcs, yu, D, `fractional(GK ε=${eps}, ${iters} iterations)`, t0);
}

/** L(R) in units of 1/D for R given as a membership predicate (reference implementation, O(#triangles)). */
export function packingValueOn(p: TrianglePacking, inR: (v: number) => boolean): number {
  let s = 0;
  for (let c = 0; c < p.w.length; c++) {
    let all = true;
    for (let i = p.start[c]; i < p.start[c + 1]; i++) if (!inR(p.cyc[i])) { all = false; break; }
    if (all) s += p.w[c];
  }
  return s;
}
