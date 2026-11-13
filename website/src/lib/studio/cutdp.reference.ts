/**
 * REFERENCE COPY (Mission 039): the ATLAS-032 cut-bounded DP exactly as it was before the typed-array
 * rewrite in cutdp.ts. It is used only by tests/studio039.test.ts as a differential oracle (same order,
 * β, states and pruned counts on every input). Do not use it in the Studio.
 *
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

interface CutDPResult {
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

export function cutBoundedDPReference(
  M: number[][],
  incumbent: number[],
  opts: {
    maxStates?: number;
    deadline?: number;
    /** ATLAS-032: admissible residual bound L(V∖S) from a global triangle packing (Lemma 2). */
    packing?: TrianglePacking | null;
    /**
     * ATLAS-032: keep only states whose bound is ≤ B − 1 (integral instances only). If no complete
     * ordering survives, the incumbent is optimal (every strictly better ordering would have survived).
     */
    strict?: boolean;
  } = {},
): CutDPResult {
  const n = M.length;
  if (n === 0) return { order: [], beta: 0, value: 0, states: 1, expanded: 0, pruned: 0, maxLayer: 1, bound: 0 };
  const maxStates = opts.maxStates ?? 2_000_000;
  const P: Float64Array[] = M.map((row) => Float64Array.from(row, (x) => (x > 0 ? x : 0)));
  const colP = new Float64Array(n);
  let W = 0;
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) { colP[v] += P[u][v]; W += P[u][v]; }
  // β(incumbent)
  let B = 0;
  for (let r = 0; r < n; r++) for (let t = r + 1; t < n; t++) B += P[incumbent[t]][incumbent[r]];

  const integral = M.every((r) => r.every((x) => Number.isInteger(x)));
  const strict = !!opts.strict && integral;
  const pk = opts.packing && integral && opts.packing.n === n ? opts.packing : null;
  const Dp = pk ? pk.D : 1;
  // a child is kept iff  β + cut + ⌈L/D⌉ ≤ limit
  const limit = strict ? B - 1 : B;
  const layerSizes: number[] = [1];
  const words = (n + 31) >>> 5;
  // Numeric keys (exact below 2^53) for n ≤ 52 — avoids building a string per generated state.
  const keyOf = n <= 52
    ? (m: Uint32Array): number | string => (words > 1 ? m[0] + m[1] * 4294967296 : m[0])
    : (m: Uint32Array): number | string => {
        let s = "";
        for (let i = 0; i < words; i++) s += String.fromCharCode(m[i] & 0xffff, m[i] >>> 16);
        return s;
      };
  // layer storage
  interface Layer { masks: Uint32Array[]; beta: number[]; cut: number[]; lb: number[]; parent: number[]; added: number[]; a: Float64Array[]; b: Float64Array[]; d: Float64Array[] }
  const newLayer = (): Layer => ({ masks: [], beta: [], cut: [], lb: [], parent: [], added: [], a: [], b: [], d: [] });
  const layers: Layer[] = [];
  const L0 = newLayer();
  L0.masks.push(new Uint32Array(words)); L0.beta.push(0); L0.cut.push(0); L0.lb.push(pk ? pk.total : 0); L0.parent.push(-1); L0.added.push(-1);
  L0.a.push(new Float64Array(n)); L0.b.push(new Float64Array(n));
  // d[v] = Σ_{T∋v, T⊆R} y_T for R = V∖S: the packing weight lost when v leaves R (O(1) pruning test)
  const d0 = new Float64Array(n);
  if (pk) for (let c = 0; c < pk.w.length; c++) for (let i = pk.start[c]; i < pk.start[c + 1]; i++) d0[pk.cyc[i]] += pk.w[c];
  L0.d.push(d0);
  layers.push(L0);
  let states = 1, expanded = 0, pruned = 0, maxLayer = 1;
  for (let t = 0; t < n; t++) {
    const cur = layers[t];
    const next = newLayer();
    const seen = new Map<number | string, number>();
    for (let s = 0; s < cur.masks.length; s++) {
      if ((expanded & 1023) === 0 && opts.deadline !== undefined && now() > opts.deadline) throw new Interrupted("time limit reached during the cut-bounded DP");
      expanded++;
      const mask = cur.masks[s], bS = cur.beta[s], cS = cur.cut[s], a = cur.a[s], b = cur.b[s], lS = cur.lb[s], dS = cur.d[s];
      for (let v = 0; v < n; v++) {
        if (mask[v >>> 5] & (1 << (v & 31))) continue;
        // adding v: new backward pairs inside = a[v] = Σ_{x∈S} P[v][x]
        const beta = bS + a[v];
        const cut = cS - a[v] + colP[v] - b[v] - P[v][v];
        const lb = pk ? lS - dS[v] : 0;
        if (beta + cut + (pk ? Math.ceil(lb / Dp) : 0) > limit) { pruned++; continue; }
        const m2 = mask.slice(); m2[v >>> 5] |= 1 << (v & 31);
        const k = keyOf(m2);
        const j = seen.get(k);
        if (j === undefined) {
          const a2 = a.slice(), b2 = b.slice();
          const Pv = P[v];
          for (let x = 0; x < n; x++) { a2[x] += P[x][v]; b2[x] += Pv[x]; }
          let d2 = dS;
          if (pk) {
            d2 = dS.slice();
            // cycles through v that lie inside R = V∖S leave the residual set: every other vertex loses their weight
            const lst = pk.byVertex[v];
            for (let q = 0; q < lst.length; q++) {
              const c = lst[q], c0 = pk.start[c], c1 = pk.start[c + 1];
              let inside = true;
              for (let i = c0; i < c1; i++) { const x = pk.cyc[i]; if (mask[x >>> 5] & (1 << (x & 31))) { inside = false; break; } }
              if (!inside) continue;
              const wc = pk.w[c];
              for (let i = c0; i < c1; i++) { const x = pk.cyc[i]; if (x !== v) d2[x] -= wc; }
            }
          }
          seen.set(k, next.masks.length);
          next.masks.push(m2); next.beta.push(beta); next.cut.push(cut); next.lb.push(lb); next.parent.push(s); next.added.push(v);
          next.a.push(a2); next.b.push(b2); next.d.push(d2);
          if (++states > maxStates) throw new Interrupted(`state budget of ${maxStates.toLocaleString("en-US")} prefix states exhausted`);
        } else if (beta < next.beta[j]) {
          next.beta[j] = beta; next.parent[j] = s; next.added[j] = v;
        }
      }
    }
    // the per-state vectors of layer t are no longer needed
    cur.a = []; cur.b = []; cur.d = [];
    if (next.masks.length === 0) {
      if (strict) {
        // No ordering with β ≤ B − 1 survives; by admissibility none exists, so the incumbent is optimal.
        return { order: incumbent.slice(), beta: B, value: W - 2 * B, states, expanded, pruned, maxLayer, bound: B, incumbentProved: true, rootLB: pk ? pk.total / Dp : 0, layerSizes };
      }
      throw new Error("internal error: cut-bounded DP lost every state (the bound must be admissible; please report this input)");
    }
    layerSizes.push(next.masks.length);
    maxLayer = Math.max(maxLayer, next.masks.length);
    layers.push(next);
  }
  const order: number[] = [];
  let idx = 0;
  for (let t = n; t > 0; t--) { order.push(layers[t].added[idx]); idx = layers[t].parent[idx]; }
  order.reverse();
  const beta = layers[n].beta[0];
  return { order, beta, value: W - 2 * beta, states, expanded, pruned, maxLayer, bound: B, incumbentProved: false, rootLB: pk ? pk.total / Dp : 0, layerSizes };
}
