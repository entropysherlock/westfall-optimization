import { describe, expect, it } from "vitest";
import { bruteForce, exclusionDP, generate, insertionLocalSearch, score, segmentOrder, subsetDP, validateSkew, type Generator } from "@/lib/engine";
import fs from "fs";
import path from "path";

const kinds: Generator[] = ["near-transitive", "random-int", "cyclic", "ties", "blocks"];

describe("browser engine vs brute force", () => {
  it("subset DP and exclusion DP are exact (n <= 8)", () => {
    for (const kind of kinds)
      for (let seed = 1; seed <= 6; seed++) {
        const n = 5 + (seed % 4);
        const A = generate(kind, n, seed);
        expect(validateSkew(A)).toBeNull();
        const bf = bruteForce(A);
        const dp = subsetDP(A);
        expect(dp.opt).toBeCloseTo(bf, 9);
        expect(score(A, dp.order)).toBeCloseTo(bf, 9);
        const inc = insertionLocalSearch(A, [...Array(n).keys()]);
        const ex = exclusionDP(A, inc);
        expect(ex.opt).toBeCloseTo(bf, 9);
        expect(score(A, ex.order)).toBeCloseTo(bf, 9);
        const blocks = segmentOrder(A, inc, 3);
        const exb = exclusionDP(A, inc, { blocks });
        expect(exb.opt).toBeCloseTo(bf, 9);
        expect(exb.generated).toBeLessThanOrEqual(ex.generated);
      }
  });
  it("browser results agree with the Python BLX 2.0 reference on every preset", () => {
    const presets = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/data/presets.json"), "utf8"));
    for (const p of presets) {
      const dp = subsetDP(p.matrix);
      expect(dp.opt).toBeCloseTo(p.reference.OPT, 8);
      expect(score(p.matrix, p.reference.order)).toBeCloseTo(p.reference.OPT, 8);
    }
  });
  it("pair certification: unique-optimum instance certifies all pairs, symmetric one certifies none", () => {
    const presets = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/data/presets.json"), "utf8"));
    const p11 = presets.find((p: { id: string }) => p.id === "paley-11-perturbed");
    expect(subsetDP(p11.matrix).certifiedCount).toBe(55);
    const c5 = presets.find((p: { id: string }) => p.id === "cyclic-5");
    expect(subsetDP(c5.matrix).certifiedCount).toBe(0);
  });
  it("rejects malformed matrices", () => {
    expect(validateSkew([[0, 1], [1, 0]])).not.toBeNull();
    expect(validateSkew([[1]])).not.toBeNull();
  });
});

import { BLOCKS, INSTANCE } from "@/lib/explainerInstance";
describe("explainer instance", () => {
  it("excludes states, block bound excludes at least as much, and both are exact", () => {
    const inc = insertionLocalSearch(INSTANCE, [6, 2, 0, 5, 1, 3, 4]);
    const triv = exclusionDP(INSTANCE, inc, { trace: true });
    const blk = exclusionDP(INSTANCE, inc, { trace: true, blocks: BLOCKS });
    const opt = subsetDP(INSTANCE).opt;
    expect(triv.opt).toBe(opt);
    expect(blk.opt).toBe(opt);
    expect(triv.excluded).toBeGreaterThan(0);
    expect(blk.generated).toBeLessThanOrEqual(triv.generated);
    console.log("explainer: trivial gen/excl", triv.generated, triv.excluded, "| blocks gen/excl", blk.generated, blk.excluded, "| L", score(INSTANCE, inc), "OPT", opt);
  });
});
