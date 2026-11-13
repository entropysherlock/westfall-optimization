/**
 * The mathematical model behind a Studio instance.
 *
 * Every instance is reduced to a skew-symmetric matrix A (a_ij = -a_ji, a_ii = 0) and the
 * objective F_A(π) = Σ_{r<s} a_{π_r π_s}, which is maximised. The user's own objective is related
 * to F_A by an exact affine identity (S = Σ_{i≠j} c_ij):
 *
 *   interpretation "skew":    objective(π) = F_A(π),               A given         (maximise)
 *   interpretation "benefit": Σ_{r<s} c_{π_r π_s} = (F_A(π) + S)/2,  A = C − Cᵀ      (maximise)
 *   interpretation "cost":    Σ_{r<s} d_{π_r π_s} = (S − F_A(π))/2,  A = Dᵀ − D      (minimise)
 *
 * Proof (benefit): Σ_{r<s} c(π_r,π_s) + Σ_{r<s} c(π_s,π_r) = S and their difference is F_A(π).
 * The cost case is the benefit case for C = −D. Diagonal entries never affect any ordering.
 */
import type { Edge, Interpretation, ParseError, RawInstance } from "./parse";
import { lcm, Q } from "./rational";

export interface Problem {
  n: number;
  names: string[];
  title?: string;
  interpretation: Interpretation;
  source: "matrix" | "edges";
  /** The data as the user's objective sees it: C (benefit), D (cost) or A (skew); diagonal zero. */
  original: Q[][];
  /** Skew-symmetric matrix of the transformed objective F_A (maximised). */
  A: Q[][];
  /** S = Σ_{i≠j} original_ij (zero for "skew"). */
  offset: Q;
  /** Common denominator d such that d·A is integral. */
  scale: bigint;
  /** d·A as JavaScript numbers. Exact (`exact = true`) when every partial sum fits 2^53. */
  M: number[][];
  exact: boolean;
  initialOrder: number[];
  warnings: string[];
  stats: { nonzeroPairs: number; negativeEntries: number; zeroPairs: number; duplicateEdges: number; selfEdges: number; integer: boolean };
}

export type BuildResult = { ok: true; problem: Problem } | { ok: false; errors: ParseError[] };

export const maximises = (p: Problem) => p.interpretation !== "cost";

/** Build the model. `interpretation` must be chosen explicitly unless the input declares one. */
export function buildProblem(raw: RawInstance, interpretation?: Interpretation): BuildResult {
  const interp = interpretation ?? raw.interpretation;
  const n = raw.names.length;
  const warnings = [...raw.warnings];
  const errors: ParseError[] = [];
  let duplicateEdges = 0;
  let original: Q[][] = Array.from({ length: n }, () => Array<Q>(n).fill(Q.ZERO));

  if (raw.source === "matrix") {
    const M = raw.matrix!;
    let diag = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = M[i][j];
        if (i === j) {
          if (x && !x.isZero()) diag++;
          continue;
        }
        original[i][j] = x ?? Q.ZERO;
      }
    if (!interp) {
      if (diag === 0 && isSkew(original)) return buildProblem(raw, "skew");
      return {
        ok: false,
        errors: [{
          message: "this matrix is not skew-symmetric (a_ij ≠ −a_ji for some pair). Choose how to read it: " +
            "“benefit” (entry i,j is gained when i is placed before j) or “cost” (entry i,j is paid when i is placed before j).",
        }],
      };
    }
    if (diag > 0) {
      if (interp === "skew") errors.push({ message: `${diag} nonzero diagonal entries; a skew-symmetric matrix has a zero diagonal` });
      else warnings.push(`${diag} nonzero diagonal entries were ignored (a vertex is never ordered relative to itself)`);
    }
    if (interp === "skew") {
      for (let i = 0; i < n && errors.length < 10; i++)
        for (let j = i + 1; j < n && errors.length < 10; j++)
          if (!original[i][j].eq(original[j][i].neg()))
            errors.push({
              message: `not skew-symmetric at (${i + 1}, ${j + 1}): a_ij = ${original[i][j]} but a_ji = ${original[j][i]}. ` +
                "Use the “benefit” or “cost” interpretation for general pairwise matrices.",
            });
    }
  } else {
    const seen = new Map<string, number>();
    for (const e of raw.edges as Edge[]) {
      const key = `${e.from}>${e.to}`;
      if (seen.has(key)) duplicateEdges++;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    if (!interp) return { ok: false, errors: [{ message: "choose how to read the edge weights: “benefit” or “cost” (or “skew”)" }] };
    if (interp === "skew") {
      // each edge u→v,w sets a_uv = w and a_vu = −w; both directions may be given only consistently
      const set = new Map<string, Q>();
      for (const e of raw.edges as Edge[]) {
        const k = `${e.from}>${e.to}`;
        const rev = set.get(`${e.to}>${e.from}`);
        if (set.has(k)) errors.push({ message: `duplicate edge ${raw.names[e.from]} → ${raw.names[e.to]} (not allowed for skew input)`, line: e.line });
        else if (rev && !rev.eq(e.weight.neg()))
          errors.push({ message: `edges ${raw.names[e.from]} → ${raw.names[e.to]} and its reverse are inconsistent (need w_vu = −w_uv)`, line: e.line });
        set.set(k, e.weight);
        original[e.from][e.to] = e.weight;
        original[e.to][e.from] = e.weight.neg();
      }
    } else {
      original = Array.from({ length: n }, () => Array<Q>(n).fill(Q.ZERO));
      for (const e of raw.edges as Edge[]) original[e.from][e.to] = original[e.from][e.to].add(e.weight);
      if (duplicateEdges) warnings.push(`${duplicateEdges} duplicate edges were summed (weights of repeated from→to pairs add up)`);
    }
  }
  if (errors.length) return { ok: false, errors };

  const A: Q[][] = Array.from({ length: n }, () => Array<Q>(n).fill(Q.ZERO));
  let offset = Q.ZERO;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const c = original[i][j];
      if (interp === "skew") A[i][j] = c;
      else {
        offset = offset.add(c);
        const d = c.sub(original[j][i]);
        A[i][j] = interp === "benefit" ? d : d.neg();
      }
    }

  let scale = 1n;
  for (const row of A) for (const x of row) scale = lcm(scale, x.den);
  let maxAbs = 0n;
  let nonzeroPairs = 0;
  let zeroPairs = 0;
  let negativeEntries = 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const v = (A[i][j].num * scale) / A[i][j].den;
      const a = v < 0n ? -v : v;
      if (a > maxAbs) maxAbs = a;
      if (j > i) {
        if (A[i][j].isZero()) zeroPairs++;
        else nonzeroPairs++;
      }
      if (original[i][j].sign() < 0) negativeEntries++;
    }
  const pairs = BigInt(Math.max(1, (n * (n - 1)) / 2));
  const exact = maxAbs * pairs * 2n < 2n ** 53n && scale < 2n ** 53n;
  const M = A.map((row) => row.map((x) => (exact ? Number((x.num * scale) / x.den) : x.toNumber())));
  const initialOrder = raw.initialOrder && raw.initialOrder.length === n ? raw.initialOrder.slice() : [...Array(n).keys()];
  if (!exact) warnings.push("values are too large or too finely divided for exact 53-bit integer arithmetic; solvers use floating point, and every reported objective is re-verified exactly");
  return {
    ok: true,
    problem: {
      n, names: raw.names.slice(), title: raw.title, interpretation: interp, source: raw.source, original, A, offset, scale, M, exact,
      initialOrder, warnings,
      stats: {
        nonzeroPairs, negativeEntries, zeroPairs, duplicateEdges, selfEdges: 0,
        integer: A.every((r) => r.every((x) => x.den === 1n)),
      },
    },
  };
}

export function isSkew(M: Q[][]): boolean {
  const n = M.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (!M[i][j].eq(M[j][i].neg())) return false;
  return true;
}

/** Exact F_A(order). */
export function exactFA(p: Problem, order: number[]): Q {
  let s = Q.ZERO;
  for (let r = 0; r < order.length; r++) for (let t = r + 1; t < order.length; t++) s = s.add(p.A[order[r]][order[t]]);
  return s;
}

/** Exact objective in the user's own terms, computed directly from the original data. */
export function exactUserObjective(p: Problem, order: number[]): Q {
  let s = Q.ZERO;
  for (let r = 0; r < order.length; r++) for (let t = r + 1; t < order.length; t++) s = s.add(p.original[order[r]][order[t]]);
  return s;
}

/** The user objective obtained from F_A through the affine identity (used as a cross-check). */
export function userFromFA(p: Problem, fa: Q): Q {
  if (p.interpretation === "skew") return fa;
  const two = Q.of(2n);
  return p.interpretation === "benefit" ? fa.add(p.offset).div(two) : p.offset.sub(fa).div(two);
}

/** Total weight W = Σ_{i<j} |a_ij| and the backward weight β(π) = (W − F_A(π))/2 ≥ 0. */
export function totalWeight(p: Problem): Q {
  let w = Q.ZERO;
  for (let i = 0; i < p.n; i++) for (let j = i + 1; j < p.n; j++) w = w.add(p.A[i][j].abs());
  return w;
}

export function backwardWeight(p: Problem, order: number[]): Q {
  return totalWeight(p).sub(exactFA(p, order)).div(Q.of(2n));
}

export function isPermutation(order: number[], n: number): boolean {
  return order.length === n && new Set(order).size === n && order.every((v) => Number.isInteger(v) && v >= 0 && v < n);
}

/** Pairwise contributions a_{uv} for every ordered pair (u before v) in `order`, in user units. */
export function pairContributions(p: Problem, order: number[]): { u: number; v: number; value: Q; agrees: boolean }[] {
  const out: { u: number; v: number; value: Q; agrees: boolean }[] = [];
  for (let r = 0; r < order.length; r++)
    for (let t = r + 1; t < order.length; t++) {
      const u = order[r];
      const v = order[t];
      const a = p.A[u][v];
      if (a.isZero()) continue;
      out.push({ u, v, value: p.interpretation === "skew" ? a : p.original[u][v], agrees: a.sign() > 0 });
    }
  return out;
}
