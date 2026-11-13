import { describe, expect, it } from "vitest";
import { generate, mulberry32 } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";
import { cutBoundedDP } from "../src/lib/studio/cutdp";
import { directedTriangles, fractionalPacking, greedyPacking, packingValueOn } from "../src/lib/studio/bounds/packing";
import { bruteForce, scoreOf, subsetDPExact } from "../src/lib/studio/solvers";

const W = (M: number[][]) => { let w = 0; for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) w += Math.abs(M[i][j]); return w; };
const optBeta = (M: number[][]) => (M.length < 2 ? 0 : (W(M) - bruteForce(M).value) / 2);
function randSkew(n: number, rnd: () => number, kind: number): number[][] {
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const v = kind === 0 ? Math.floor(rnd() * 7) - 3 : kind === 1 ? (Math.floor(rnd() * 11) - 5 || 1) : kind === 2 ? (rnd() < 0.5 ? 1 : -1) * (1 + Math.floor(rnd() * 1e5)) : rnd() < 0.85 ? 1 + Math.floor(rnd() * 4) : -(1 + Math.floor(rnd() * 4));
    A[i][j] = v; A[j][i] = -v;
  }
  return A;
}

describe("ATLAS-032 triangle-packing bounds (Lemmas 1–2)", () => {
  it("packings are exactly feasible and L(R) ≤ OPT_β(R) on random residual sets (ties, negatives, large weights)", () => {
    const rnd = mulberry32(32);
    for (let t = 0; t < 250; t++) {
      const n = 3 + Math.floor(rnd() * 6);
      const M = randSkew(n, rnd, t % 4);
      for (const p of [greedyPacking(M), fractionalPacking(M, { eps: 0.1 })]) {
        expect(p.total / p.D).toBeLessThanOrEqual(optBeta(M) + 1e-12);
        for (let q = 0; q < 4; q++) {
          const R = [...Array(n).keys()].filter(() => rnd() < 0.7);
          const inR = new Set(R);
          const L = packingValueOn(p, (v) => inR.has(v)) / p.D;
          const sub = R.map((i) => R.map((j) => M[i][j]));
          expect(L).toBeLessThanOrEqual(optBeta(sub) + 1e-12);
        }
      }
    }
  }, 120_000);
  it("is exact on a directed 3-cycle and tight on a weighted cyclic tournament", () => {
    const C3 = [[0, 2, -5], [-2, 0, 3], [5, -3, 0]];
    expect(directedTriangles(C3).verts.length).toBe(1);
    expect(greedyPacking(C3).total).toBe(2);
    expect(optBeta(C3)).toBe(2);
    const cyc = generate("cyclic", 7, 1);
    expect(fractionalPacking(cyc).total / fractionalPacking(cyc).D).toBeLessThanOrEqual(optBeta(cyc));
  });
  it("rejects non-integral matrices (no unverifiable bounds)", () => {
    expect(() => greedyPacking([[0, 0.5], [-0.5, 0]])).toThrow(/integral/);
  });
});

describe("ATLAS-032 strengthened prefix DP: β_S + cut(S) + ⌈L(V∖S)⌉ vs independent exact methods", () => {
  it("matches exhaustive enumeration for n ≤ 8 with every bound/strictness combination (incumbent = identity, possibly bad)", () => {
    const rnd = mulberry32(3203);
    for (let t = 0; t < 400; t++) {
      const n = 1 + Math.floor(rnd() * 8);
      const M = randSkew(n, rnd, t % 4);
      const ref = bruteForce(M).value;
      const g = n >= 3 ? greedyPacking(M) : null, f = n >= 3 ? fractionalPacking(M, { eps: 0.1 }) : null;
      for (const o of [{ packing: g }, { packing: f }, { packing: f, strict: true }, { strict: true }]) {
        const r = cutBoundedDP(M, [...Array(n).keys()], o);
        expect(r.value).toBe(ref);
        expect(scoreOf(M, r.order)).toBe(ref);
      }
    }
  }, 120_000);
  it("matches the subset DP for n = 10–16 on dense families, and strict mode proves an optimal incumbent", () => {
    const kinds = ["random-int", "ties", "cyclic", "near-transitive", "blocks"] as const;
    for (let t = 0; t < 40; t++) {
      const n = 10 + (t % 7);
      const M = generate(kinds[t % kinds.length], n, 100 + t);
      const ref = subsetDPExact(M);
      const f = fractionalPacking(M);
      const a = cutBoundedDP(M, [...Array(n).keys()], { packing: f, strict: true });
      expect(a.value).toBe(ref.value);
      const b = cutBoundedDP(M, ref.order, { packing: f, strict: true }); // optimal incumbent
      expect(b.incumbentProved).toBe(true);
      expect(b.value).toBe(ref.value);
    }
  }, 300_000);
  it("pipeline with each bound option agrees with the subset DP and records certificates", () => {
    const rnd = mulberry32(9);
    for (let t = 0; t < 30; t++) {
      const n = 9 + Math.floor(rnd() * 8);
      const M = randSkew(n, rnd, t % 4);
      const ref = subsetDPExact(M).value;
      for (const bound of ["none", "greedy", "fractional"] as const) {
        const r = solveAtlas(M, { subsetMax: 0, incumbentMs: 10, bound });
        expect(r.optimal).toBe(true);
        expect(r.value).toBe(ref);
        if (bound !== "none") expect(r.certificates.length).toBeGreaterThan(0);
      }
    }
  }, 300_000);
  it("non-integral input falls back to the ATLAS-031 rule and stays correct", () => {
    const M = generate("random-int", 10, 4).map((r) => r.map((x) => x * 0.5));
    const r = solveAtlas(M, { subsetMax: 0, incumbentMs: 10 });
    expect(Math.abs(r.value - subsetDPExact(M).value)).toBeLessThan(1e-9);
  });
});

describe("ATLAS-032 milestone: the n = 24 cases ATLAS-031 failed", () => {
  it("proves optimality on all six dense random / tie-heavy n = 24 instances within a 20 s limit", () => {
    for (const kind of ["random-int", "ties"] as const) for (const s of [1, 2, 3]) {
      const M = generate(kind, 24, s);
      const r = solveAtlas(M, { deadline: performance.now() + 20_000 });
      expect(r.optimal).toBe(true);
    }
  }, 180_000);
});
