import { describe, expect, it } from "vitest";
import { generate } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";
import { fractionalPacking, greedyPacking, withLongerCycles } from "../src/lib/studio/bounds/packing";
import { Interrupted, bruteForce, scoreOf } from "../src/lib/studio/solvers";

describe("ATLAS-033 deadline safety", () => {
  it("returns a feasible incumbent and rigorous bound on an already expired deadline", () => {
    for (const kind of ["random-int", "ties", "cyclic"] as const) {
      const M = generate(kind, 25, 33);
      const r = solveAtlas(M, { deadline: performance.now() - 1, subsetMax: 0 });
      expect(r.optimal).toBe(false);
      expect(r.interruptedReason).not.toBeNull();
      expect(r.order.slice().sort((a, b) => a - b)).toEqual([...Array(25).keys()]);
      expect(scoreOf(M, r.order)).toBe(r.value);
      expect(r.lowerBoundBeta).not.toBeNull();
      expect(r.lowerBoundBeta!).toBeLessThanOrEqual(r.beta);
      expect(r.lowerBoundBeta!).toBeGreaterThanOrEqual(0);
    }
  });
  it("packing algorithms honor expired deadline rather than computing indefinitely", () => {
    const M = generate("cyclic", 13, 1);
    const expired = performance.now() - 1;
    expect(() => fractionalPacking(M, { deadline: expired })).toThrow(Interrupted);
    expect(() => greedyPacking(M, { deadline: expired })).toThrow(Interrupted);
    const base = greedyPacking(M);
    expect(() => withLongerCycles(M, base, { deadline: expired })).toThrow(Interrupted);
  });
  it("enforces a triangle-enumeration memory cap safely", () => {
    const M = generate("cyclic", 13, 1);
    expect(() => fractionalPacking(M, { maxTriangles: 1 })).toThrow(Interrupted);
  });
  it("does not change exact optimum when there is time", () => {
    for (const kind of ["random-int", "ties", "cyclic"] as const) {
      const M = generate(kind, 8, 1);
      const r = solveAtlas(M, { deadline: performance.now() + 20_000, subsetMax: 0 });
      expect(r.optimal).toBe(true);
      expect(r.value).toBe(bruteForce(M).value);
    }
  });
});
