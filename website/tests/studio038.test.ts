/** Mission 038: solver recommendation, ATLAS settings/bounds/certificates in the runner, independent verifier. */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { generate } from "@/lib/engine";
import { parseInput } from "@/lib/studio/parse";
import { buildProblem, type Problem } from "@/lib/studio/model";
import { solve } from "@/lib/studio/runner";
import { recommendSolver } from "@/lib/studio/select";
import { verifyCertificate, type CertificateLike } from "@/lib/studio/certverify";
import { parseQ } from "@/lib/studio/rational";

const fromMatrix = (M: number[][], interp: "skew" | "benefit" | "cost" = "skew"): Problem => {
  const r = parseInput(JSON.stringify({ matrix: M }), "json");
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  const b = buildProblem(r.value, interp);
  if (!b.ok) throw new Error(JSON.stringify(b.errors));
  return b.problem;
};
const multi = (blocks: number, b: number) => {
  const n = blocks * b, M = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const v = Math.floor(i / b) === Math.floor(j / b) ? ((i * 7 + j * 3) % 5) - 2 || 1 : 1;
    M[i][j] = v; M[j][i] = -v;
  }
  return M;
};

describe("solver recommendation", () => {
  it("recommends AutoCut for n ≤ 9 exact inputs and explains why", () => {
    const r = recommendSolver(fromMatrix(generate("random-int", 8, 1)));
    expect(r.solver).toBe("autocut");
    expect(r.reasons.join(" ")).toMatch(/≤ 9/);
  });
  it("recommends ATLAS for larger inputs and reports the decomposition", () => {
    const r = recommendSolver(fromMatrix(multi(6, 10)));
    expect(r.solver).toBe("atlas");
    expect(r.profile.components).toBe(6);
    expect(r.reasons.join(" ")).toMatch(/6 strongly connected components/);
  });
  it("warns on dense large single components instead of promising a proof", () => {
    const r = recommendSolver(fromMatrix(generate("random-int", 40, 2)));
    expect(r.solver).toBe("atlas");
    expect(r.warnings.join(" ")).toMatch(/may not be proved/);
  });
  it("warns that inexact (floating-point) models cannot be certified", () => {
    // fractions with many distinct prime denominators: the common scale exceeds 2^53, so the model is inexact
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];
    const n = 12, rows: string[][] = Array.from({ length: n }, () => Array(n).fill("0"));
    let k = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const q = primes[k++ % primes.length]; rows[i][j] = `1/${q}`; rows[j][i] = `-1/${q}`; }
    const r = parseInput(rows.map((x) => x.join(",")).join("\n"), "matrix");
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const b = buildProblem(r.value, "skew");
    if (!b.ok) throw new Error(JSON.stringify(b.errors));
    expect(b.problem.exact).toBe(false);
    expect(recommendSolver(b.problem).warnings.join(" ")).toMatch(/no solver can certify/);
  });
  it("only recommends the heuristic beyond every exact limit, and says so", () => {
    const p = fromMatrix(generate("random-int", 12, 4));
    const big = { ...p, n: 401 } as Problem; // the parser caps n at 400; exercise the rule directly
    const r = recommendSolver(big);
    expect(r.solver).toBe("heuristic");
    expect(r.reasons.join(" ")).toMatch(/never labelled optimal/);
  });
});

describe("ATLAS-032 in the Studio runner: settings, rigorous bounds, certificates", () => {
  const p = fromMatrix(generate("random-int", 24, 2));
  it("proves the former n = 24 failure, reports zero gap and an exportable certificate", () => {
    const r = solve(p, "atlas", { timeLimitMs: 20000, seed: 1 });
    expect(r.status).toBe("OPTIMAL");
    expect(r.atlas!.gap).toBe("0");
    expect(parseQ(r.atlas!.objectiveBound!)!.eq(r.objective)).toBe(true);
    expect(r.atlas!.certificate).not.toBeNull();
    const v = verifyCertificate(r.atlas!.certificate!);
    expect(v.verdict).toBe("ACCEPTED");
    expect(v.F).toBe(String(r.atlas!.certificate!.claimedFA));
  }, 60_000);
  it("honours settings: decomposition off, greedy bound, certificate off", () => {
    const r = solve(fromMatrix(multi(4, 8)), "atlas", { timeLimitMs: 20000, seed: 1, atlas: { decompose: false, bound: "greedy", certificate: false } });
    expect(r.status).toBe("OPTIMAL");
    expect(r.atlas!.settings).toMatchObject({ decompose: false, bound: "greedy" });
    expect(r.details["strong components"]).toBe(1);
    expect(r.atlas!.certificate).toBeNull();
    expect(r.atlas!.certificateNote).toMatch(/switched off/);
  }, 60_000);
  it("an interrupted run is INTERRUPTED, keeps its ordering, and reports a valid non-negative gap but no certificate", () => {
    const q = fromMatrix(generate("random-int", 34, 5));
    const r = solve(q, "atlas", { timeLimitMs: 20000, seed: 1, atlas: { maxStates: 200 } });
    expect(r.status).toBe("INTERRUPTED");
    expect(r.order.length).toBe(34);
    expect(parseQ(r.atlas!.gap!)!.sign()).toBeGreaterThanOrEqual(0);
    expect(parseQ(r.atlas!.objectiveBound!)!.cmp(r.objective)).toBeGreaterThanOrEqual(0); // maximisation: bound ≥ objective
    expect(r.atlas!.certificate).toBeNull();
  }, 60_000);
  it("cost interpretation: the bound is a lower bound on the minimised cost", () => {
    const C = generate("random-int", 14, 6).map((row) => row.map((x) => Math.max(x, 0)));
    const q = fromMatrix(C, "cost");
    const r = solve(q, "atlas", { timeLimitMs: 20000, seed: 1, atlas: {} });
    expect(r.status).toBe("OPTIMAL");
    expect(parseQ(r.atlas!.objectiveBound!)!.eq(r.objective)).toBe(true);
  }, 60_000);
});

describe("documentation walkthrough stays true", () => {
  it("the built-in 60-item example: ATLAS is recommended, proves objective 3027, and the certificate is accepted", async () => {
    const { largeExample } = await import("@/lib/studio/examples");
    const ex = largeExample();
    const r0 = parseInput(ex.text, ex.format); if (!r0.ok) throw new Error("parse");
    const b = buildProblem(r0.value, ex.interpretation); if (!b.ok) throw new Error("build");
    expect(recommendSolver(b.problem).solver).toBe("atlas");
    const r = solve(b.problem, "atlas", { timeLimitMs: 60000, seed: 1 });
    expect(r.status).toBe("OPTIMAL");
    expect(r.objective.toString()).toBe("3027");
    expect(r.initialObjective.toString()).toBe("597");
    expect(verifyCertificate(r.atlas!.certificate!).verdict).toBe("ACCEPTED");
  }, 180_000);
});

describe("independent certificate verifier (browser)", () => {
  const p = fromMatrix(generate("ties", 24, 1));
  const cert = solve(p, "atlas", { timeLimitMs: 20000, seed: 1 }).atlas!.certificate! as CertificateLike;
  const clone = (): CertificateLike => JSON.parse(JSON.stringify(cert));
  it("accepts a genuine certificate", () => expect(verifyCertificate(cert).verdict).toBe("ACCEPTED"));
  it("rejects an inflated packing", () => {
    const c = clone(); const comp = c.components.find((x) => x.packing && x.packing.w.length)!;
    comp.packing!.w[0] += comp.packing!.D * 1000;
    expect(verifyCertificate(c).verdict).toBe("REJECTED");
  });
  it("rejects a wrong β and a suboptimal order", () => {
    const c = clone(); c.components[0].beta -= 1; expect(verifyCertificate(c).verdict).toBe("REJECTED");
    const d = clone(); const o = d.components[0].order; [o[0], o[1]] = [o[1], o[0]]; d.order = d.components.flatMap((x) => x.order);
    expect(verifyCertificate(d).verdict).toBe("REJECTED");
  });
  it("rejects a forged decomposition, a non-skew matrix and malformed input", () => {
    const c = clone(); c.A[0][1] = c.A[0][1] + 1; expect(verifyCertificate(c).verdict).toBe("REJECTED");
    expect(verifyCertificate({} as CertificateLike).verdict).toBe("REJECTED");
  });
  it("returns UNDECIDED (never ACCEPTED) when its search budget is too small", () => {
    const c = clone(); c.components.forEach((x) => (x.packing = null));
    expect(verifyCertificate(c, { maxStates: 5 }).verdict).not.toBe("ACCEPTED");
  });
  it("agrees with the separate Python verifier on every archived ATLAS-032 certificate", () => {
    const file = path.resolve(__dirname, "../../benchmarks/atlas-032/certificates.json");
    const all = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, CertificateLike>;
    expect(Object.keys(all).length).toBeGreaterThanOrEqual(6);
    for (const [name, c] of Object.entries(all)) expect(verifyCertificate(c).verdict, name).toBe("ACCEPTED");
  }, 120_000);
});
