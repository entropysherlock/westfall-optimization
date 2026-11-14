import { describe, expect, it } from "vitest";
import { CS, greedy, localSearch, n, objective, optimum, optimumF, pairs, reductionPct, totalWeight } from "@/lib/caseStudy40";

const A = CS.A as number[][];
const isPerm = (o: number[]) => [...o].sort((a, b) => a - b).every((v, i) => v === i) && o.length === n;

describe("40-item case study: published numbers come from the verified evidence", () => {
  it("instance is the 40-item skew-symmetric integer matrix from benchmarks/case-study-40", () => {
    expect(n).toBe(40);
    expect(pairs).toBe(780);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { expect(Number.isInteger(A[i][j])).toBe(true); expect(A[i][j] + A[j][i]).toBe(0); }
    expect(totalWeight).toBe(2285);
  });
  it("every published order is a permutation, and the penalties match the verified values", () => {
    for (const o of Object.values(CS.orders)) expect(isPerm(o)).toBe(true);
    expect(greedy).toBe(475);
    expect(localSearch).toBe(321);
    expect(optimum).toBe(319);
    expect(optimumF).toBe(1647);
    expect(objective(CS.orders.greedy)).toBe(1335);
    expect(reductionPct.toFixed(2)).toBe("32.84");
  });
  it("the claims the page makes are backed by recorded verification, not by the page itself", () => {
    expect(CS.verified.matrixRegenerated).toBe(true);
    expect(CS.verified.certificate).toBe(true);
    expect(CS.verified.highsStatus).toBe("Optimal");
    expect(CS.verified.highsGap).toBe(0);
    expect(CS.verified.highsF).toBe(optimumF);
    expect(CS.timing.atlasRecordedMs).toBe(1287);
    expect(CS.timing.highsRecordedS).toBe(0.204);
  });
});
