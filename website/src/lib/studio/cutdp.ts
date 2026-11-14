/**
 * ATLAS-031 — cut-bounded exact prefix DP for weighted linear ordering (any n).
 *
 * Notation: P[u][v] = max(M[u][v], 0) is the weight lost if v is placed before u ("backward").
 * β(π) = Σ backward weights = (W − F_M(π))/2, so maximising F_M ⇔ minimising β.
 * For a prefix set S: cut(S) = Σ_{u∉S, v∈S} P[u][v] (every such pair is backward in any ordering
 * that starts with S), and β_S = least backward weight of an ordering of S.
 *
 * Admissibility. If π* is optimal and S is any prefix of π*, then β_S(π*) + cut(S) ≤ β(π*) ≤ B
 * where B = β(incumbent) for any feasible incumbent. The DP keeps, per set S, the least β_S found;
 * it discards S when β_S + cut(S) > B. The prefixes of π* (or of an equally good ordering through
 * the kept minimum) always survive, so the DP returns a true optimum. No floating point enters
 * when M is integral with all partial sums below 2^53 (Problem.exact); callers must not claim
 * optimality otherwise.
 *
 * Connection to the counting theorem (Missions 027–029): when every pair has a nonzero integer
 * margin (a weighted tournament), the unweighted cut is ≤ the weighted cut, so every surviving
 * state is a B-cut of a tournament that has an ordering (π*) of width ≤ β*. Theorem A then bounds the
 * number of surviving states by (n+1)·H(β*+B). Nothing similar holds with ties (zero margins).
 */
import { Interrupted } from "./solvers";
import type { TrianglePacking } from "./bounds/packing";

export interface CutDPResult {
  order: number[];
  beta: number; // optimal backward weight
  value: number; // F_M of the order
  states: number; // states created (after pruning)
  expanded: number;
  pruned: number;
  maxLayer: number;
  bound: number; // B used
  /** ATLAS-032: the incumbent was proved optimal because no state could strictly improve on it. */
  incumbentProved?: boolean;
  /** ATLAS-032 instrumentation */
  rootLB?: number; // L(V) in units of 1 (packing total / D)
  layerSizes?: number[];
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Telemetry emitted by the DP (Mission 039). Every field is a count the search actually performed. */
export interface CutDPLayerEvent {
  /** prefix length just completed (1..n) */
  depth: number;
  n: number;
  /** states kept at this depth */
  layerSize: number;
  /** states created so far (all depths) */
  states: number;
  expanded: number;
  pruned: number;
  /** B = β(incumbent); the DP keeps states with bound ≤ B (or ≤ B − 1 when strict) */
  incumbentBeta: number;
}
export interface CutDPTickEvent { depth: number; n: number; expandedInLayer: number; layerTotal: number; states: number; pruned: number }

/** Growable Float64Array (amortised doubling). */
class F64 {
  a: Float64Array;
  len = 0;
  constructor(cap: number) { this.a = new Float64Array(Math.max(16, cap)); }
  reserve(extra: number) {
    if (this.len + extra <= this.a.length) return;
    let cap = this.a.length * 2;
    while (cap < this.len + extra) cap *= 2;
    const b = new Float64Array(cap); b.set(this.a.subarray(0, this.len)); this.a = b;
  }
}
class I32 {
  a: Int32Array;
  len = 0;
  constructor(cap: number) { this.a = new Int32Array(Math.max(16, cap)); }
  push(x: number) {
    if (this.len === this.a.length) { const b = new Int32Array(this.a.length * 2); b.set(this.a); this.a = b; }
    this.a[this.len++] = x;
  }
}
class U32 {
  a: Uint32Array;
  len = 0;
  constructor(cap: number) { this.a = new Uint32Array(Math.max(16, cap)); }
  reserve(extra: number) {
    if (this.len + extra <= this.a.length) return;
    let cap = this.a.length * 2;
    while (cap < this.len + extra) cap *= 2;
    const b = new Uint32Array(cap); b.set(this.a.subarray(0, this.len)); this.a = b;
  }
}

/**
 * Mission 039 implementation note. The search is identical, state for state, to the ATLAS-032 version
 * (kept verbatim in cutdp.reference.ts and compared by tests/studio039.test.ts): same expansion order,
 * same pruning test with the same floating-point operations, same tie-breaking on duplicates. Only the
 * storage changed: per-layer flat typed arrays instead of one Uint32Array + three Float64Arrays per state,
 * numeric set keys derived from the parent key (no mask copy for a duplicate child), and every per-state
 * vector of a finished layer is released (only parent/added links are retained for reconstruction).
 */
export function cutBoundedDP(
  M: number[][],
  incumbent: number[],
  opts: {
    maxStates?: number;
    /** Conservative search working-memory budget (bytes). Stops cleanly, never claims optimality. */
    maxBytes?: number;
    deadline?: number;
    /** ATLAS-032: admissible residual bound L(V∖S) from a global triangle packing (Lemma 2). */
    packing?: TrianglePacking | null;
    /**
     * ATLAS-032: keep only states whose bound is ≤ B − 1 (integral instances only). If no complete
     * ordering survives, the incumbent is optimal (every strictly better ordering would have survived).
     */
    strict?: boolean;
    /** Mission 039 telemetry: called once per completed depth (cheap; never alters the search). */
    onLayer?: (e: CutDPLayerEvent) => void;
    /** Mission 039 telemetry: called every 4096 expansions with in-layer progress. */
    onTick?: (e: CutDPTickEvent) => void;
  } = {},
): CutDPResult {
  const n = M.length;
  if (n === 0) return { order: [], beta: 0, value: 0, states: 1, expanded: 0, pruned: 0, maxLayer: 1, bound: 0 };
  const maxStates = opts.maxStates ?? 2_000_000;
  const maxBytes = opts.maxBytes ?? Infinity;
  const P: Float64Array[] = M.map((row) => Float64Array.from(row, (x) => (x > 0 ? x : 0)));
  const colP = new Float64Array(n);
  let W = 0;
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) { colP[v] += P[u][v]; W += P[u][v]; }
  let B = 0;
  for (let r = 0; r < n; r++) for (let t = r + 1; t < n; t++) B += P[incumbent[t]][incumbent[r]];

  const integral = M.every((r) => r.every((x) => Number.isInteger(x)));
  const strict = !!opts.strict && integral;
  const pk = opts.packing && integral && opts.packing.n === n ? opts.packing : null;
  const Dp = pk ? pk.D : 1;
  const limit = strict ? B - 1 : B;
  const layerSizes: number[] = [1];
  const words = (n + 31) >>> 5;
  const numericKeys = n <= 52;
  const POW2 = new Float64Array(Math.min(n, 53));
  for (let v = 0; v < POW2.length; v++) POW2[v] = 2 ** v;

  // ---- layer t storage (flat) ----
  let curCount = 1;
  let curMasks: Uint32Array = new Uint32Array(words);
  let curKeys: Float64Array = new Float64Array(1); // numeric set key (n ≤ 52)
  let curBeta: Float64Array = new Float64Array(1), curCut: Float64Array = new Float64Array(1), curLb: Float64Array = new Float64Array(1);
  let curA: Float64Array = new Float64Array(n), curB: Float64Array = new Float64Array(n), curD: Float64Array = new Float64Array(pk ? n : 0);
  curLb[0] = pk ? pk.total : 0;
  if (pk) for (let c = 0; c < pk.w.length; c++) for (let i = pk.start[c]; i < pk.start[c + 1]; i++) curD[pk.cyc[i]] += pk.w[c];
  // reconstruction links for every layer (layer 0 has one root)
  const parents: Int32Array[] = [Int32Array.of(-1)];
  const addeds: Int32Array[] = [Int32Array.of(-1)];
  let lastBeta: Float64Array = curBeta;

  let states = 1, expanded = 0, pruned = 0, maxLayer = 1;
  let retainedLinkBytes = parents[0].byteLength + addeds[0].byteLength;
  const scratch = new Uint32Array(words);
  for (let t = 0; t < n; t++) {
    if (states >= maxStates) throw new Interrupted("state budget exhausted");
    // Avoid constructing 65,536 full n-vectors for large n before there is
    // evidence that the frontier is that wide.
    const est = Math.max(1, Math.min(curCount * 4, n >= 100 ? 2048 : 1 << 16, maxStates - states));
    const nMasks = new U32(est * words), nKeys = new F64(numericKeys ? est : 1);
    const nBeta = new F64(est), nCut = new F64(est), nLb = new F64(est);
    const nA = new F64(est * n), nB = new F64(est * n), nD = new F64(pk ? est * n : 1);
    const nParent = new I32(est), nAdded = new I32(est);
    const seen = new Map<number | string, number>();
    let count = 0;
    const oldLayerBytes = curMasks.byteLength + curKeys.byteLength + curBeta.byteLength +
      curCut.byteLength + curLb.byteLength + curA.byteLength + curB.byteLength + curD.byteLength;
    const predictedBytes = (array: F64 | I32 | U32, additional: number) => {
      let capacity = array.a.length;
      while (array.len + additional > capacity) capacity *= 2;
      return capacity * array.a.BYTES_PER_ELEMENT;
    };
    // Upper bound on retained arrays + working frontier + approximate Map
    // allocations. Check *before* any reserve/doubling operation.
    const projectedMemory = () => retainedLinkBytes + oldLayerBytes +
      predictedBytes(nMasks, words) + predictedBytes(nKeys, numericKeys ? 1 : 0) +
      predictedBytes(nBeta, 1) + predictedBytes(nCut, 1) +
      predictedBytes(nLb, 1) + predictedBytes(nA, n) +
      predictedBytes(nB, n) + predictedBytes(nD, pk ? n : 0) +
      predictedBytes(nParent, 1) + predictedBytes(nAdded, 1) +
      128 * (count + 1) + 8 * (states + 1);

    for (let s = 0; s < curCount; s++) {
      if ((expanded & 1023) === 0) {
        if (opts.deadline !== undefined && now() > opts.deadline) throw new Interrupted("time limit reached during the cut-bounded DP");
        if (opts.onTick && (expanded & 4095) === 0 && expanded > 0) opts.onTick({ depth: t + 1, n, expandedInLayer: s, layerTotal: curCount, states, pruned });
      }
      expanded++;
      const mo = s * words, vo = s * n;
      const bS = curBeta[s], cS = curCut[s], lS = curLb[s];
      const pkey = numericKeys ? curKeys[s] : 0;
      for (let v = 0; v < n; v++) {
        if (curMasks[mo + (v >>> 5)] & (1 << (v & 31))) continue;
        const av = curA[vo + v];
        const beta = bS + av;
        const cut = cS - av + colP[v] - curB[vo + v] - P[v][v];
        const lb = pk ? lS - curD[vo + v] : 0;
        if (beta + cut + (pk ? Math.ceil(lb / Dp) : 0) > limit) { pruned++; continue; }
        let k: number | string;
        if (numericKeys) k = pkey + POW2[v];
        else {
          for (let w = 0; w < words; w++) scratch[w] = curMasks[mo + w];
          scratch[v >>> 5] |= 1 << (v & 31);
          let str = "";
          for (let i = 0; i < words; i++) str += String.fromCharCode(scratch[i] & 0xffff, scratch[i] >>> 16);
          k = str;
        }
        const j = seen.get(k);
        if (j === undefined) {
          if (projectedMemory() > maxBytes) throw new Interrupted(
            `estimated exact-search byte budget exhausted (${Math.round(maxBytes / 1048576)} MiB)`
          );
          const idx = count++;
          seen.set(k, idx);
          // mask
          nMasks.reserve(words);
          for (let w = 0; w < words; w++) nMasks.a[nMasks.len + w] = curMasks[mo + w];
          nMasks.a[nMasks.len + (v >>> 5)] |= 1 << (v & 31);
          nMasks.len += words;
          if (numericKeys) { nKeys.reserve(1); nKeys.a[nKeys.len++] = k as number; }
          nBeta.reserve(1); nBeta.a[nBeta.len++] = beta;
          nCut.reserve(1); nCut.a[nCut.len++] = cut;
          nLb.reserve(1); nLb.a[nLb.len++] = lb;
          nParent.push(s); nAdded.push(v);
          // a2[x] = a[x] + P[x][v],  b2[x] = b[x] + P[v][x]   (same operations as the reference)
          nA.reserve(n); nB.reserve(n);
          const ao = nA.len, Pv = P[v];
          for (let x = 0; x < n; x++) { nA.a[ao + x] = curA[vo + x] + P[x][v]; nB.a[ao + x] = curB[vo + x] + Pv[x]; }
          nA.len += n; nB.len += n;
          if (pk) {
            nD.reserve(n);
            const dd = nD.len;
            for (let x = 0; x < n; x++) nD.a[dd + x] = curD[vo + x];
            const lst = pk.byVertex[v];
            for (let q = 0; q < lst.length; q++) {
              const c = lst[q], c0 = pk.start[c], c1 = pk.start[c + 1];
              let inside = true;
              for (let i = c0; i < c1; i++) { const x = pk.cyc[i]; if (curMasks[mo + (x >>> 5)] & (1 << (x & 31))) { inside = false; break; } }
              if (!inside) continue;
              const wc = pk.w[c];
              for (let i = c0; i < c1; i++) { const x = pk.cyc[i]; if (x !== v) nD.a[dd + x] -= wc; }
            }
            nD.len += n;
          }
          if (++states > maxStates) throw new Interrupted(`state budget of ${maxStates.toLocaleString("en-US")} prefix states exhausted`);
        } else if (beta < nBeta.a[j]) {
          nBeta.a[j] = beta; nParent.a[j] = s; nAdded.a[j] = v;
        }
      }
    }
    if (count === 0) {
      if (strict) {
        // No ordering with β ≤ B − 1 survives; by admissibility none exists, so the incumbent is optimal.
        return { order: incumbent.slice(), beta: B, value: W - 2 * B, states, expanded, pruned, maxLayer, bound: B, incumbentProved: true, rootLB: pk ? pk.total / Dp : 0, layerSizes };
      }
      throw new Error("internal error: cut-bounded DP lost every state (the bound must be admissible; please report this input)");
    }
    // the previous layer's per-state data is released here; only parent/added links are kept
    parents.push(nParent.a.slice(0, count)); addeds.push(nAdded.a.slice(0, count));
    retainedLinkBytes += 8 * count;
    curCount = count;
    curMasks = nMasks.a; curKeys = nKeys.a; curBeta = nBeta.a; curCut = nCut.a; curLb = nLb.a; curA = nA.a; curB = nB.a; curD = nD.a;
    lastBeta = curBeta;
    layerSizes.push(count);
    maxLayer = Math.max(maxLayer, count);
    opts.onLayer?.({ depth: t + 1, n, layerSize: count, states, expanded, pruned, incumbentBeta: B });
  }
  const order: number[] = [];
  let idx = 0;
  for (let t = n; t > 0; t--) { order.push(addeds[t][idx]); idx = parents[t][idx]; }
  order.reverse();
  const beta = lastBeta[0];
  return { order, beta, value: W - 2 * beta, states, expanded, pruned, maxLayer, bound: B, incumbentProved: false, rootLB: pk ? pk.total / Dp : 0, layerSizes };
}
