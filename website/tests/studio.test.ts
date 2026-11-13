/**
 * Studio library tests: parsing, validation, model transformation, solvers, verification, export.
 * Acceptance tests 1, 2, 3, 5 and 6 of the Mission 026 brief are exercised here at the library level
 * (the browser end-to-end versions are in e2e/studio.spec.ts).
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { parseEdgeText, parseInput, parseJsonText, parseMatrixText, guessCsvKind } from "@/lib/studio/parse";
import { buildProblem, exactFA, exactUserObjective, userFromFA, type Problem } from "@/lib/studio/model";
import { parseQ, Q } from "@/lib/studio/rational";
import { fromWire, problemFromWire, solve, toWire } from "@/lib/studio/runner";
import { bruteForce, localSearch, subsetDPExact } from "@/lib/studio/solvers";
import { improvement, instanceJson, resultCsv, resultJson, resultMarkdown } from "@/lib/studio/report";
import { autoCut } from "@/lib/studio/autocut";
import { mulberry32 } from "@/lib/engine";

const build = (text: string, interp?: "skew" | "benefit" | "cost", kind: "auto" | "matrix" | "edges" | "json" = "auto"): Problem => {
  const r = parseInput(text, kind);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  const b = buildProblem(r.value, interp);
  if (!b.ok) throw new Error(JSON.stringify(b.errors));
  return b.problem;
};

/** Exhaustive optimum of the user's objective, computed independently with exact rationals. */
function exhaustiveUser(p: Problem): Q {
  const n = p.n;
  let best: Q | null = null;
  const perm = [...Array(n).keys()];
  const rec = (k: number) => {
    if (k === n) {
      const v = exactUserObjective(p, perm);
      const better = best === null || (p.interpretation === "cost" ? v.cmp(best) < 0 : v.cmp(best) > 0);
      if (better) best = v;
      return;
    }
    for (let i = k; i < n; i++) {
      [perm[k], perm[i]] = [perm[i], perm[k]];
      rec(k + 1);
      [perm[k], perm[i]] = [perm[i], perm[k]];
    }
  };
  rec(0);
  return best!;
}

const MATRIX_CSV = `,A,B,C,D,E
A,0,3,-1,2,0
B,-3,0,4,1,-2
C,1,-4,0,5,2
D,-2,-1,-5,0,1
E,0,2,-2,-1,0
`;
const EDGES_CSV = `from,to,weight
A,B,3
A,D,2
C,A,1
B,C,4
B,D,1
E,B,2
C,D,5
C,E,2
D,E,1
`;

describe("rational parsing", () => {
  it("parses decimals, fractions and exponents exactly", () => {
    expect(parseQ("1.25")!.toString()).toBe("5/4");
    expect(parseQ("-7/4")!.toString()).toBe("-7/4");
    expect(parseQ("3e-2")!.toString()).toBe("3/100");
    expect(parseQ(".5")!.toString()).toBe("1/2");
    expect(parseQ("0.1")!.add(parseQ("0.2")!).eq(parseQ("0.3")!)).toBe(true);
    for (const bad of ["", "abc", "1/0", "1..2", "NaN", "Infinity", "1e999", "1,5"]) expect(parseQ(bad)).toBeNull();
  });
  it("floors negative values correctly", () => {
    expect(Q.of(-7n, 2n).floor()).toBe(-4n);
    expect(Q.of(7n, 2n).floor()).toBe(3n);
  });
});

describe("Acceptance 1: matrix CSV, exact solve, independent exhaustive verification", () => {
  it("solves exactly and the optimum matches exhaustive enumeration", () => {
    const p = build(MATRIX_CSV);
    expect(p.interpretation).toBe("skew"); // detected as skew-symmetric
    expect(p.names).toEqual(["A", "B", "C", "D", "E"]);
    for (const solver of ["subset-dp", "exclusion", "autocut"] as const) {
      const r = solve(p, solver, { timeLimitMs: 10_000, seed: 1 });
      expect(r.status).toBe("OPTIMAL");
      expect(r.objective.eq(exhaustiveUser(p))).toBe(true);
      expect(r.verification.bruteForce!.agrees).toBe(true);
      expect(r.verification.identityHolds).toBe(true);
    }
  });
});

describe("Acceptance 2: edge list gives an equivalent result", () => {
  it("edge list with skew interpretation reproduces the matrix model and optimum", () => {
    const pm = build(MATRIX_CSV);
    const pe = build(EDGES_CSV, "skew", "edges");
    // same vertex set (possibly different order of first appearance) and same pairwise weights
    const idx = pe.names.map((s) => pm.names.indexOf(s));
    for (let i = 0; i < pe.n; i++) for (let j = 0; j < pe.n; j++) expect(pe.A[i][j].eq(pm.A[idx[i]][idx[j]])).toBe(true);
    const rm = solve(pm, "subset-dp", { timeLimitMs: 5000, seed: 1 });
    const re = solve(pe, "subset-dp", { timeLimitMs: 5000, seed: 1 });
    expect(re.objective.eq(rm.objective)).toBe(true);
  });
  it("benefit edge list ≡ benefit matrix, with the constant offset preserved", () => {
    const edges = "x,y,2\ny,x,5\nx,z,1.5\nz,y,1/2\ny,z,3\n";
    const pe = build(edges, "benefit", "edges");
    const pm = build(",x,y,z\nx,0,2,1.5\ny,5,0,3\nz,0,1/2,0\n", "benefit");
    expect(pe.offset.toString()).toBe(pm.offset.toString());
    expect(pe.offset.toString()).toBe("12");
    const r = solve(pe, "subset-dp", { timeLimitMs: 5000, seed: 1 });
    expect(r.objective.eq(exhaustiveUser(pe))).toBe(true);
    expect(r.objective.eq(solve(pm, "autocut", { timeLimitMs: 5000, seed: 1 }).objective)).toBe(true);
  });
  it("sums duplicate edges with a warning, rejects self-edges", () => {
    const pe = build("a,b,1\na,b,2\nb,c,1\n", "benefit", "edges");
    expect(pe.original[0][1].toString()).toBe("3");
    expect(pe.warnings.join(" ")).toMatch(/duplicate edges were summed/);
    const bad = parseEdgeText("a,a,1\n");
    expect(bad.ok).toBe(false);
  });
});

describe("Acceptance 3: malformed input gives useful errors", () => {
  const msg = (t: string, k: "auto" | "matrix" | "edges" | "json" = "auto") => {
    const r = parseInput(t, k);
    return r.ok ? null : r.errors.map((e) => e.message).join(" | ");
  };
  it("reports the exact location of problems", () => {
    expect(msg("0,1\n-1,abc\n", "matrix")).toMatch(/row 2, column 2 is not a number/);
    expect(msg("0,1,2\n-1,0\n", "matrix")).toMatch(/row 1 has 3 entries but the matrix has 2 rows/);
    expect(msg("0,,1\n1,0,1\n-1,-1,0\n", "matrix")).toMatch(/missing entry at row 1, column 2/);
    expect(msg('{"matrix": [[0, 1], [-1]]}')).toMatch(/row 2 must be an array of length 2/);
    expect(msg("{not json")).toMatch(/invalid JSON/);
    expect(msg("a,b\n", "edges")).toMatch(/expected "from,to,weight"/);
    expect(msg("a,b,heavy\n", "edges")).toMatch(/weight "heavy" is not a number/);
    expect(msg("")).toMatch(/empty/);
  });
  it("refuses to reinterpret an asymmetric matrix silently", () => {
    const r = parseMatrixText("0,1\n2,0\n");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const b = buildProblem(r.value);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.errors[0].message).toMatch(/not skew-symmetric/);
    const s = buildProblem(r.value, "skew");
    expect(s.ok).toBe(false);
  });
  it("enforces size limits", () => {
    const big = Array.from({ length: 401 }, () => Array(401).fill(0).join(",")).join("\n");
    expect(msg(big, "matrix")).toMatch(/at most 400 items/);
    expect(msg("a,b,1e13\n", "edges")).toMatch(/exceeds 10\^12/);
  });
});

describe("model transformation identity", () => {
  it("objective = (F_A + S)/2 for benefit and (S − F_A)/2 for cost, on random instances", () => {
    const rnd = mulberry32(5);
    for (let t = 0; t < 30; t++) {
      const n = 2 + (t % 6);
      const rows = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? "0" : String(Math.floor(rnd() * 21) - 5))));
      for (const interp of ["benefit", "cost"] as const) {
        const p = build(JSON.stringify({ matrix: rows }), interp, "json");
        for (let k = 0; k < 5; k++) {
          const order = [...Array(n).keys()].sort(() => rnd() - 0.5);
          expect(userFromFA(p, exactFA(p, order)).eq(exactUserObjective(p, order))).toBe(true);
        }
        const r = solve(p, "subset-dp", { timeLimitMs: 5000, seed: 1 });
        expect(r.objective.eq(exhaustiveUser(p))).toBe(true);
      }
    }
  });
});

describe("Acceptance 4 (library): heuristics never claim optimality", () => {
  it("returns FEASIBLE status even when it happens to find the optimum", () => {
    const p = build(MATRIX_CSV);
    const r = solve(p, "heuristic", { timeLimitMs: 200, seed: 3 });
    expect(r.status).toBe("FEASIBLE");
    expect(r.statusNote).toMatch(/NOT established/);
  });
  it("an interrupted exact solve is reported as an error or FEASIBLE, never OPTIMAL", () => {
    const rnd = mulberry32(9);
    const n = 20;
    const rows = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = Math.floor(rnd() * 9) - 4; rows[i][j] = v; rows[j][i] = -v; }
    const p = build(JSON.stringify({ matrix: rows }), "skew", "json");
    expect(() => solve(p, "subset-dp", { timeLimitMs: 1, seed: 1 })).toThrow(/time limit/);
  });
});

describe("Acceptance 5: export and re-import", () => {
  it("round-trips the instance, solver result and ordering through JSON", () => {
    const p = build(EDGES_CSV, "skew", "edges");
    const r = solve(p, "autocut", { timeLimitMs: 5000, seed: 1 });
    const json = JSON.stringify(resultJson(p, r));
    const back = parseJsonText(json);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const b = buildProblem(back.value);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.problem.initialOrder.map((v) => b.problem.names[v])).toEqual(r.order.map((v) => p.names[v]));
    expect(exactUserObjective(b.problem, b.problem.initialOrder).eq(r.objective)).toBe(true);
    expect(resultCsv(p, r).split("\n")[0]).toBe("position,item,index");
    expect(resultMarkdown(p, r)).toMatch(/Status: \*\*OPTIMAL\*\*/);
    // wire format used by the worker
    const w = fromWire(JSON.parse(JSON.stringify(toWire(r))));
    expect(w.objective.eq(r.objective)).toBe(true);
    expect(problemFromWire({ instance: instanceJson(p), interpretation: p.interpretation }).n).toBe(p.n);
  });
});

describe("Acceptance 6: negative weights and ties", () => {
  it("exact solvers agree with exhaustive enumeration on tie-heavy instances with negative weights", () => {
    const rnd = mulberry32(42);
    for (let t = 0; t < 40; t++) {
      const n = 3 + (t % 6);
      const rows = Array.from({ length: n }, () => Array(n).fill("0"));
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const v = [-2, -1, 0, 0, 1, 2][Math.floor(rnd() * 6)];
          rows[i][j] = String(v);
          rows[j][i] = String(-v);
        }
      const p = build(JSON.stringify({ matrix: rows }), "skew", "json");
      const opt = exhaustiveUser(p);
      for (const s of ["subset-dp", "exclusion", "autocut"] as const) expect(solve(p, s, { timeLimitMs: 5000, seed: 1 }).objective.eq(opt)).toBe(true);
    }
  });
  it("the all-zero matrix (every ordering optimal) is handled", () => {
    const p = build(JSON.stringify({ matrix: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] }), "skew", "json");
    const r = solve(p, "autocut", { timeLimitMs: 5000, seed: 1 });
    expect(r.objective.toString()).toBe("0");
    expect(r.verification.bruteForce!.optimalOrderings).toBe(6);
  });
});

describe("improvement metric", () => {
  it("never divides by a zero or negative baseline", () => {
    const p = build(MATRIX_CSV);
    expect(improvement(p, Q.of(-3n), Q.of(5n)).percent).toBeNull();
    expect(improvement(p, Q.ZERO, Q.of(5n)).percent).toBeNull();
    expect(improvement(p, Q.of(4n), Q.of(5n)).percent).toBeCloseTo(25);
  });
});

describe("solvers vs brute force, and AutoCut on the Lean suite (including runs Lean did not finish)", () => {
  it("subset DP and local search agree with enumeration", () => {
    const rnd = mulberry32(77);
    for (let t = 0; t < 25; t++) {
      const n = 2 + (t % 8);
      const M = Array.from({ length: n }, () => Array(n).fill(0));
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = Math.floor(rnd() * 13) - 6; M[i][j] = v; M[j][i] = -v; }
      const bf = bruteForce(M).value;
      expect(subsetDPExact(M).value).toBe(bf);
      expect(localSearch(M, [...Array(n).keys()], { timeMs: 20 }).value).toBeLessThanOrEqual(bf);
    }
  });
  it("AutoCut value equals the exhaustive optimum on all 119 archived instances", () => {
    const inst: { id: number; A: string[][] }[] = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/autocut_instances.json"), "utf8"));
    expect(inst.length).toBe(119);
    for (const x of inst) {
      const A = x.A.map((r) => r.map((s) => parseQ(s)!));
      const r = autoCut(A)!;
      const scale = A.flat().reduce((m, q) => (q.den > m ? q.den * m : m), 1n);
      void scale;
      const M = A.map((row) => row.map((q) => q.toNumber()));
      const bf = bruteForce(M).value;
      expect(Math.abs(r.value.toNumber() - bf)).toBeLessThan(1e-9);
    }
  }, 600_000);
});
