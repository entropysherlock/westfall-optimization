import { describe, expect, it } from "vitest";
import { generate } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";
import { bruteForce, scoreOf } from "../src/lib/studio/solvers";

describe("ATLAS-033 memory-safe interruptions", () => {
  it("returns an incumbent without claiming optimality when byte budget is exhausted", () => {
    const M = generate("random-int", 15, 22);
    const r = solveAtlas(M, {
      subsetMax: 0, bound: "none", maxMemoryBytes: 1024,
      deadline: performance.now() + 20_000,
    });
    expect(r.optimal).toBe(false);
    expect(r.interruptedReason).toMatch(/byte budget/);
    expect(r.order.slice().sort((a, b) => a - b)).toEqual([...Array(15).keys()]);
    expect(scoreOf(M, r.order)).toBe(r.value);
    expect(r.lowerBoundBeta).not.toBeNull();
    expect(r.lowerBoundBeta!).toBeGreaterThanOrEqual(0);
    expect(r.lowerBoundBeta!).toBeLessThanOrEqual(r.beta);
  });
  it("loose byte budget preserves exact optimum on small inputs", () => {
    for (const k of ["random-int", "ties", "cyclic"] as const) {
      const M = generate(k, 9, 22);
      const r = solveAtlas(M, {
        subsetMax: 0, maxMemoryBytes: 100_000_000,
        deadline: performance.now() + 20_000,
      });
      expect(r.optimal).toBe(true);
      expect(r.value).toBe(bruteForce(M).value);
    }
  });
});
