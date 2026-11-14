/**
 * The 40-item case study. Every number on the page is computed here from the verified evidence in
 * src/data/caseStudy40.json (copied from benchmarks/case-study-40/), never typed by hand.
 */
import data from "@/data/caseStudy40.json";

export const CS = data;
const A = data.A as number[][];

export const totalWeight = (() => { let w = 0; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) w += Math.abs(A[i][j]); return w; })();
export const objective = (o: number[]) => { let s = 0; for (let r = 0; r < o.length; r++) for (let t = r + 1; t < o.length; t++) s += A[o[r]][o[t]]; return s; };
/** Penalty = total weight of violated preferences (backward weight β). */
export const penalty = (o: number[]) => (totalWeight - objective(o)) / 2;

export const n = A.length;
export const pairs = (n * (n - 1)) / 2;
export const greedy = penalty(data.orders.greedy);
export const localSearch = penalty(data.orders.localSearch);
export const optimum = penalty(data.orders.atlas);
export const optimumF = objective(data.orders.atlas);
export const reductionPct = ((greedy - optimum) / greedy) * 100;
export const violatedPairs = (o: number[]) => { let c = 0; for (let r = 0; r < o.length; r++) for (let t = r + 1; t < o.length; t++) if (A[o[r]][o[t]] < 0) c++; return c; };
/** 40! ≈ 8.16 × 10^47, computed exactly. */
export const orderingsSci = (() => {
  let f = BigInt(1); for (let i = 2; i <= n; i++) f *= BigInt(i);
  const s = f.toString(); const m = Math.round(Number(s.slice(0, 4)) / 10) / 100; // round to 3 significant digits
  return { mantissa: m.toFixed(2), exp: s.length - 1 };
})();

/** Upper-triangle cells of the matrix reordered by `o`: weight > 0 honoured, < 0 violated. */
export function cells(o: number[]) {
  const out: { r: number; t: number; w: number }[] = [];
  for (let r = 0; r < o.length; r++) for (let t = r + 1; t < o.length; t++) out.push({ r, t, w: A[o[r]][o[t]] });
  return out;
}
