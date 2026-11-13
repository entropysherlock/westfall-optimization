import { describe, expect, it } from "vitest";
import { generate, mulberry32 } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";
import { cutBoundedDP } from "../src/lib/studio/cutdp";
import { cutwidthSubsetDP, decideCutwidth, hyperbolaPartitions, isSemicomplete, minCutwidth, stateCap, widthOf } from "../src/lib/studio/cutwidth";
import { checkDecomposition, strongComponents } from "../src/lib/studio/decompose";
import { bruteForce, scoreOf, subsetDPExact } from "../src/lib/studio/solvers";

const isPerm = (o: number[], n: number) => o.length === n && new Set(o).size === n && o.every((v) => v >= 0 && v < n);

function randSkew(n: number, rnd: () => number, kind: number): number[][] {
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  const blocks = 1 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      let v: number;
      if (kind === 0) v = Math.floor(rnd() * 7) - 3; // ties allowed
      else if (kind === 1) v = rnd() < 0.85 ? 1 + Math.floor(rnd() * 4) : -(1 + Math.floor(rnd() * 4)); // near-transitive
      else if (kind === 2) v = (i * blocks) / n === (j * blocks) / n || Math.floor((i * blocks) / n) === Math.floor((j * blocks) / n) ? (rnd() < 0.5 ? 2 : -2) : rnd() < 0.5 ? 1 : 0; // components
      else if (kind === 3) v = rnd() < 0.5 ? 1e6 + Math.floor(rnd() * 1e6) : -(1e6 + Math.floor(rnd() * 1e6)); // high weights
      else v = 0; // all zero
      A[i][j] = v; A[j][i] = -v;
    }
  return A;
}

describe("ATLAS-031 SCC decomposition", () => {
  it("handles empty, single, all-zero, reverse-transitive inputs", () => {
    expect(strongComponents([]).components).toEqual([]);
    expect(strongComponents([[0]]).components).toEqual([[0]]);
    const Z = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    expect(strongComponents(Z).components.length).toBe(3);
    const n = 6;
    const R = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : i > j ? 1 : -1)));
    const d = strongComponents(R);
    expect(d.components.map((c) => c[0])).toEqual([5, 4, 3, 2, 1, 0]);
    expect(checkDecomposition(R, d)).toBe(true);
    expect(solveAtlas(R).order).toEqual([5, 4, 3, 2, 1, 0]);
  });
  it("is a valid topological decomposition on 400 random instances", () => {
    const rnd = mulberry32(31);
    for (let t = 0; t < 400; t++) {
      const n = 1 + Math.floor(rnd() * 30);
      const M = randSkew(n, rnd, t % 5);
      const d = strongComponents(M);
      expect(checkDecomposition(M, d)).toBe(true);
      expect(d.components.flat().sort((a, b) => a - b)).toEqual([...Array(n).keys()]);
    }
  });
});

describe("ATLAS-031 exact pipeline vs independent exact methods", () => {
  it("matches exhaustive enumeration for n ≤ 8 (600 instances, ties/negatives/high weights)", () => {
    const rnd = mulberry32(2031);
    for (let t = 0; t < 600; t++) {
      const n = Math.floor(rnd() * 9);
      const M = randSkew(n, rnd, t % 5);
      const r = solveAtlas(M, { subsetMax: t % 2 ? 0 : 13, incumbentMs: 5 }); // odd t forces the cut-bounded DP
      expect(isPerm(r.order, n)).toBe(true);
      expect(r.optimal).toBe(true);
      expect(scoreOf(M, r.order)).toBe(r.value);
      expect(r.value).toBe(bruteForce(M).value);
    }
  }, 120_000);
  it("matches the subset DP for n ≤ 16 and the cut-bounded DP alone, with and without decomposition", () => {
    const rnd = mulberry32(77);
    const kinds = ["near-transitive", "random-int", "ties", "blocks", "cyclic"] as const;
    for (let t = 0; t < 80; t++) {
      const n = 9 + Math.floor(rnd() * 8);
      const M = t % 2 ? generate(kinds[t % kinds.length], n, t) : randSkew(n, rnd, t % 4);
      const ref = subsetDPExact(M).value;
      const a = solveAtlas(M, { subsetMax: 0, incumbentMs: 10 });
      const b = solveAtlas(M, { subsetMax: 0, incumbentMs: 10, noDecompose: true });
      expect(a.optimal && b.optimal).toBe(true);
      expect(a.value).toBe(ref);
      expect(b.value).toBe(ref);
      const c = cutBoundedDP(M, [...Array(n).keys()]); // worst-case incumbent (identity) is still admissible
      expect(c.value).toBe(ref);
      expect(scoreOf(M, c.order)).toBe(ref);
    }
  }, 300_000);
  it("reports INTERRUPTED (never OPTIMAL) when the budget is exhausted, and keeps a valid incumbent", () => {
    const M = generate("random-int", 40, 5);
    const r = solveAtlas(M, { maxStates: 1000, incumbentMs: 20 });
    expect(r.optimal).toBe(false);
    expect(r.interruptedReason).toMatch(/state budget/);
    expect(isPerm(r.order, 40)).toBe(true);
  });
  it("honours an expired deadline", () => {
    const M = generate("random-int", 30, 9);
    const r = solveAtlas(M, { deadline: 0, incumbentMs: 5 });
    expect(r.optimal).toBe(false);
    expect(isPerm(r.order, 30)).toBe(true);
  });
  it("solves 300 items exactly when components are small (beyond every previous exact limit)", () => {
    const rnd = mulberry32(3);
    const n = 300, blk = 10;
    const M = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const same = Math.floor(i / blk) === Math.floor(j / blk);
      const v = same ? (rnd() < 0.5 ? 1 + Math.floor(rnd() * 5) : -(1 + Math.floor(rnd() * 5))) : rnd() < 0.7 ? 1 : 0;
      M[i][j] = v; M[j][i] = -v;
    }
    const r = solveAtlas(M);
    expect(r.optimal).toBe(true);
    // independent check: the per-block subset DP values plus the cross value
    const d = strongComponents(M);
    let opt = d.crossValue;
    for (const c of d.components) opt += subsetDPExact(c.map((i) => c.map((j) => M[i][j]))).value;
    expect(r.value).toBe(opt);
  }, 120_000);
});

describe("ATLAS-031 directed cutwidth (separate module)", () => {
  const randDigraph = (n: number, rnd: () => number, p2: number, semi: boolean) => {
    const adj = Array.from({ length: n }, () => Array(n).fill(false));
    for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) {
      const r = rnd();
      if (!semi && r < 0.2) continue;
      if (r > 1 - p2) { adj[u][v] = adj[v][u] = true; } else if (rnd() < 0.5) adj[u][v] = true; else adj[v][u] = true;
    }
    return adj;
  };
  it("H(K) matches known values", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => Number(hyperbolaPartitions(k)))).toEqual([1, 2, 5, 10, 26, 42, 118, 171, 389, 692, 1442]);
    expect(hyperbolaPartitions(20)).toBe(300326n);
  });
  it("cap shortcut never exceeds 2^n and is null when vacuous", () => {
    expect(stateCap(5, 10)).toBeNull();
    const c = stateCap(200, 3)!;
    expect(c).toBe(201n * hyperbolaPartitions(6));
  });
  it("min cutwidth equals the subset-DP reference (semicomplete and general digraphs, two-way arcs)", () => {
    const rnd = mulberry32(29);
    for (let t = 0; t < 300; t++) {
      const n = 1 + Math.floor(rnd() * 12);
      const semi = t % 3 !== 0;
      const adj = randDigraph(n, rnd, [0, 0.1, 0.4][t % 3], semi);
      expect(isSemicomplete(adj) || !semi).toBe(true);
      const ref = cutwidthSubsetDP(adj);
      const r = minCutwidth(adj);
      expect(r.cutwidth).toBe(ref);
      expect(isPerm(r.order, n)).toBe(true);
      expect(widthOf(adj, r.order)).toBe(ref);
      // the NO side: decide(ref-1) must be infeasible, with and without the cap
      if (ref > 0) {
        expect(decideCutwidth(adj, ref - 1).feasible).toBe(false);
        expect(decideCutwidth(adj, ref - 1, { useCap: false }).feasible).toBe(false);
      }
    }
  }, 120_000);
  it("cap is never applied to non-semicomplete digraphs", () => {
    const adj = [[false, false, false], [false, false, false], [false, false, false]];
    expect(isSemicomplete(adj)).toBe(false);
    const r = decideCutwidth(adj, 0);
    expect(r.feasible).toBe(true);
    expect(r.cap).toBeNull();
  });
});

import { parseInput } from "@/lib/studio/parse";
import { buildProblem } from "@/lib/studio/model";
import { solve } from "@/lib/studio/runner";

describe("ATLAS-031 Studio integration", () => {
  const prob = (text: string, interp: "benefit" | "cost" | "skew") => {
    const r = parseInput(text, "matrix");
    if (!r.ok) throw new Error("parse");
    const b = buildProblem(r.value, interp);
    if (!b.ok) throw new Error("build");
    return b.problem;
  };
  it("rational benefit matrix: OPTIMAL, exact objective re-verified, brute-force agrees", () => {
    const p = prob("0,1/2,3,0\n2,0,1/3,5\n0,4,0,1\n7/4,0,2,0", "benefit");
    const r = solve(p, "atlas", { timeLimitMs: 5000, seed: 1 });
    expect(r.status).toBe("OPTIMAL");
    expect(r.verification.permutation && r.verification.identityHolds).toBe(true);
    expect(r.verification.bruteForce?.agrees).toBe(true);
  });
  it("cost interpretation with negative entries and ties", () => {
    const p = prob("0,-1,2,0,0\n3,0,0,-2,1\n0,0,0,1,1\n0,2,1,0,-3\n1,1,1,0,0", "cost");
    const r = solve(p, "atlas", { timeLimitMs: 5000, seed: 2 });
    expect(r.status).toBe("OPTIMAL");
    expect(r.verification.bruteForce?.agrees).toBe(true);
    expect(r.verification.crossCheck?.agrees).toBe(true);
  });
});
