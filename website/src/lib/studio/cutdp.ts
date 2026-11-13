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

export interface CutDPResult {
  order: number[];
  beta: number; // optimal backward weight
  value: number; // F_M of the order
  states: number; // states created (after pruning)
  expanded: number;
  pruned: number;
  maxLayer: number;
  bound: number; // B used
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function cutBoundedDP(
  M: number[][],
  incumbent: number[],
  opts: { maxStates?: number; deadline?: number } = {},
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

  const words = (n + 31) >>> 5;
  const keyOf = (m: Uint32Array) => {
    let s = "";
    for (let i = 0; i < words; i++) s += String.fromCharCode(m[i] & 0xffff, m[i] >>> 16);
    return s;
  };
  // layer storage
  interface Layer { masks: Uint32Array[]; beta: number[]; cut: number[]; parent: number[]; added: number[]; a: Float64Array[]; b: Float64Array[] }
  const newLayer = (): Layer => ({ masks: [], beta: [], cut: [], parent: [], added: [], a: [], b: [] });
  const layers: Layer[] = [];
  const L0 = newLayer();
  L0.masks.push(new Uint32Array(words)); L0.beta.push(0); L0.cut.push(0); L0.parent.push(-1); L0.added.push(-1);
  L0.a.push(new Float64Array(n)); L0.b.push(new Float64Array(n));
  layers.push(L0);
  let states = 1, expanded = 0, pruned = 0, maxLayer = 1;
  for (let t = 0; t < n; t++) {
    const cur = layers[t];
    const next = newLayer();
    const seen = new Map<string, number>();
    for (let s = 0; s < cur.masks.length; s++) {
      if ((expanded & 1023) === 0 && opts.deadline !== undefined && now() > opts.deadline) throw new Interrupted("time limit reached during the cut-bounded DP");
      expanded++;
      const mask = cur.masks[s], bS = cur.beta[s], cS = cur.cut[s], a = cur.a[s], b = cur.b[s];
      for (let v = 0; v < n; v++) {
        if (mask[v >>> 5] & (1 << (v & 31))) continue;
        // adding v: new backward pairs inside = a[v] = Σ_{x∈S} P[v][x]
        const beta = bS + a[v];
        const cut = cS - a[v] + colP[v] - b[v] - P[v][v];
        if (beta + cut > B) { pruned++; continue; }
        const m2 = mask.slice(); m2[v >>> 5] |= 1 << (v & 31);
        const k = keyOf(m2);
        const j = seen.get(k);
        if (j === undefined) {
          const a2 = a.slice(), b2 = b.slice();
          const Pv = P[v];
          for (let x = 0; x < n; x++) { a2[x] += P[x][v]; b2[x] += Pv[x]; }
          seen.set(k, next.masks.length);
          next.masks.push(m2); next.beta.push(beta); next.cut.push(cut); next.parent.push(s); next.added.push(v);
          next.a.push(a2); next.b.push(b2);
          if (++states > maxStates) throw new Interrupted(`state budget of ${maxStates.toLocaleString("en-US")} prefix states exhausted`);
        } else if (beta < next.beta[j]) {
          next.beta[j] = beta; next.parent[j] = s; next.added[j] = v;
        }
      }
    }
    // the per-state vectors of layer t are no longer needed
    cur.a = []; cur.b = [];
    if (next.masks.length === 0) throw new Error("internal error: cut-bounded DP lost every state (the bound must be admissible; please report this input)");
    maxLayer = Math.max(maxLayer, next.masks.length);
    layers.push(next);
  }
  const order: number[] = [];
  let idx = 0;
  for (let t = n; t > 0; t--) { order.push(layers[t].added[idx]); idx = layers[t].parent[idx]; }
  order.reverse();
  const beta = layers[n].beta[0];
  return { order, beta, value: W - 2 * beta, states, expanded, pruned, maxLayer, bound: B };
}
