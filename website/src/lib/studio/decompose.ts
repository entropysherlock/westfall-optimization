/**
 * ATLAS-031 — exact strong-component decomposition for weighted linear ordering.
 *
 * Strict preference digraph: u → v  iff  M[u][v] > 0 (M skew-symmetric; zero margins give no arc).
 * Let C_1,…,C_m be its strongly connected components in a topological order of the condensation.
 *
 * Claim. Concatenating optimal orderings of M[C_1],…,M[C_m] (in that order) is optimal for M, and
 *   OPT(M) = Σ_i OPT(M[C_i]) + Σ_{i<j} Σ_{u∈C_i, v∈C_j} M[u][v].
 * Proof. F_M(π) splits into within-component pairs and cross pairs. A within-component pair's
 * contribution depends only on the order π induces on that component, so it is at most
 * OPT(M[C_i]). For a cross pair {u,v} with u ∈ C_i, v ∈ C_j, i < j, there is no arc v → u (otherwise
 * the condensation would have an arc C_j → C_i, contradicting the topological order), so
 * M[v][u] ≤ 0 ≤ M[u][v] and the pair contributes at most max(M[u][v], M[v][u]) = M[u][v].
 * The concatenation attains every one of these upper bounds simultaneously. ∎
 * (Ties: if M[u][v] = 0 both placements are optimal; the topological order is any valid one.)
 */

export interface Decomposition {
  /** Components in topological order; vertices inside a component are in increasing index order. */
  components: number[][];
  /** Σ_{i<j} Σ_{u∈C_i, v∈C_j} M[u][v] (exact when M is integral and below 2^53). */
  crossValue: number;
}

/** Iterative Tarjan SCC (no recursion, so it is safe for thousands of items). */
export function strongComponents(M: number[][]): Decomposition {
  const n = M.length;
  const index = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const onStack = new Uint8Array(n);
  const stack: number[] = [];
  const comps: number[][] = [];
  let counter = 0;
  const callV: number[] = [];
  const callW: number[] = [];
  for (let s = 0; s < n; s++) {
    if (index[s] !== -1) continue;
    callV.push(s); callW.push(0);
    index[s] = low[s] = counter++; stack.push(s); onStack[s] = 1;
    while (callV.length) {
      const v = callV[callV.length - 1];
      let w = callW[callW.length - 1];
      const row = M[v];
      let descended = false;
      while (w < n) {
        if (row[w] > 0) {
          if (index[w] === -1) {
            callW[callW.length - 1] = w + 1;
            index[w] = low[w] = counter++; stack.push(w); onStack[w] = 1;
            callV.push(w); callW.push(0);
            descended = true;
            break;
          } else if (onStack[w]) low[v] = Math.min(low[v], index[w]);
        }
        w++;
      }
      if (descended) continue;
      callV.pop(); callW.pop();
      if (low[v] === index[v]) {
        const comp: number[] = [];
        let x: number;
        do { x = stack.pop()!; onStack[x] = 0; comp.push(x); } while (x !== v);
        comp.sort((a, b) => a - b);
        comps.push(comp);
      }
      if (callV.length) { const p = callV[callV.length - 1]; low[p] = Math.min(low[p], low[v]); }
    }
  }
  // Tarjan emits components in reverse topological order of the condensation.
  comps.reverse();
  const compOf = new Int32Array(n);
  comps.forEach((c, i) => c.forEach((v) => (compOf[v] = i)));
  let crossValue = 0;
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (compOf[u] < compOf[v]) crossValue += M[u][v];
  return { components: comps, crossValue };
}

export function subMatrix(M: number[][], idx: number[]): number[][] {
  return idx.map((i) => idx.map((j) => M[i][j]));
}

/** Check the decomposition's defining property: no strict arc goes from a later to an earlier component. */
export function checkDecomposition(M: number[][], d: Decomposition): boolean {
  const n = M.length;
  const compOf = new Int32Array(n).fill(-1);
  d.components.forEach((c, i) => c.forEach((v) => (compOf[v] = i)));
  if (compOf.some((c) => c < 0)) return false;
  for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) if (compOf[u] > compOf[v] && M[u][v] > 0) return false;
  return true;
}
