/**
 * Mission 039 tests: engine rewrite (differential against the ATLAS-032 reference copy), telemetry invariants,
 * ordering analysis identities, profiling, sessions, the comparison lab, the evidence ladder, certificate
 * tampering and resource exhaustion, and brute-force agreement of every solver on small instances.
 */
import { describe, expect, it } from "vitest";
import { generate, mulberry32 } from "@/lib/engine";
import { cutBoundedDP } from "@/lib/studio/cutdp";
import { cutBoundedDPReference } from "@/lib/studio/cutdp.reference";
import { fractionalPacking, greedyPacking, withLongerCycles } from "@/lib/studio/bounds/packing";
import { solveAtlas, type AtlasEvent } from "@/lib/studio/atlas";
import { localSearch, subsetDPExact, bruteForce } from "@/lib/studio/solvers";
import { parseInput } from "@/lib/studio/parse";
import { backwardWeight, buildProblem, exactFA, totalWeight, type Problem } from "@/lib/studio/model";
import { Q } from "@/lib/studio/rational";
import { solve } from "@/lib/studio/runner";
import { aggregate, backwardPairs, classifyDifficulty, componentRanges, fingerprint, itemContributions, movement, profileProblem, upperTriangleSum } from "@/lib/studio/analysis";
import { deleteSession, listSessions, loadSession, makeSession, parseSession, reproBundle, saveSession, type KV, type StudioSettings } from "@/lib/studio/session";
import { comparabilityStatement, comparisonCsv, comparisonMarkdown, comparisonPlan, failedRow, finalizeRows, rowFromResult } from "@/lib/studio/compare";
import { evidenceLadder, evidenceSummary } from "@/lib/studio/evidence";
import { verifyCertificate, type CertificateLike } from "@/lib/studio/certverify";
import { ATLAS_DEFAULTS } from "@/lib/studio/runner";

const fromMatrix = (M: (number | string)[][], interp: "skew" | "benefit" | "cost" = "skew"): Problem => {
  const r = parseInput(JSON.stringify({ matrix: M.map((row) => row.map(String)) }), "json");
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  const b = buildProblem(r.value, interp);
  if (!b.ok) throw new Error(JSON.stringify(b.errors));
  return b.problem;
};
const randomGeneral = (n: number, seed: number, lo = -3, hi = 9) => {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : lo + Math.floor(rnd() * (hi - lo + 1)))));
};
function allPerms(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of allPerms(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}
const settings: StudioSettings = { solver: "atlas", followRecommendation: true, timeLimitS: 30, seed: 1, bruteForceCheck: true, atlas: { ...ATLAS_DEFAULTS }, mode: "beginner" };

/* ------------------------------------------------------------------ engine rewrite */

describe("cut-bounded DP rewrite is state-for-state identical to the ATLAS-032 reference", () => {
  const kinds = ["random-int", "ties", "near-transitive", "blocks", "cyclic"] as const;
  for (const kind of kinds)
    for (const n of [5, 9, 13, 16])
      it(`${kind} n=${n}: every bound/strict combination`, { timeout: 120_000 }, () => {
        const M = generate(kind, n, n * 7 + 1);
        const inc = localSearch(M, [...Array(n).keys()], { timeMs: 1e9, seed: 3, maxStarts: 40 }).order;
        const worst = [...Array(n).keys()];
        const starts = n <= 13 ? [inc, worst] : [inc];
        const packings = [null, greedyPacking(M), fractionalPacking(M, { eps: 0.05 })];
        packings.push(withLongerCycles(M, packings[2]!));
        for (const packing of packings)
          for (const strict of [false, true])
            for (const start of starts) {
              const a = cutBoundedDP(M, start, { packing, strict, maxStates: 3_000_000 });
              const b = cutBoundedDPReference(M, start, { packing, strict, maxStates: 3_000_000 });
              expect(a.order).toEqual(b.order);
              expect([a.beta, a.states, a.pruned, a.expanded, a.maxLayer, a.incumbentProved]).toEqual([b.beta, b.states, b.pruned, b.expanded, b.maxLayer, b.incumbentProved]);
              expect(a.layerSizes).toEqual(b.layerSizes);
            }
      });
  it("string-key path (n > 52) matches the reference", { timeout: 60_000 }, () => {
    // planted: a transitive weighted tournament with a few reversed pairs, randomly relabelled (one component)
    const n = 64, rnd = mulberry32(5), A = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = 1 + Math.floor(rnd() * 5); A[i][j] = v; A[j][i] = -v; }
    for (let t = 0; t < 14; t++) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); if (i < j) { const v = -(1 + Math.floor(rnd() * 5)); A[i][j] = v; A[j][i] = -v; } }
    const perm = [...Array(n).keys()].sort(() => rnd() - 0.5);
    const M = perm.map((i) => perm.map((j) => A[i][j]));
    const inc = localSearch(M, [...Array(n).keys()], { timeMs: 1e9, seed: 1, maxStarts: 30 }).order;
    const packing = withLongerCycles(M, fractionalPacking(M, { eps: 0.05 }));
    const outcome = (f: typeof cutBoundedDP, strict: boolean) => {
      try { const r = f(M, inc, { strict, packing, maxStates: 400_000 }); return JSON.stringify([r.order, r.beta, r.states, r.pruned]); } catch (e) { return (e as Error).message; }
    };
    for (const strict of [false, true]) {
      const a = outcome(cutBoundedDP, strict);
      expect(a).toBe(outcome(cutBoundedDPReference as typeof cutBoundedDP, strict));
      expect(a.startsWith("[")).toBe(true); // the instance is solved, so the string-key path really ran to completion
    }
  });
  it("non-integral matrices (no packing, non-strict) match the reference", () => {
    const M0 = generate("random-int", 12, 5);
    const M = M0.map((r) => r.map((x) => x / 4));
    const a = cutBoundedDP(M, [...Array(12).keys()], { strict: true });
    const b = cutBoundedDPReference(M, [...Array(12).keys()], { strict: true });
    expect(a.order).toEqual(b.order);
    expect([a.beta, a.states, a.pruned]).toEqual([b.beta, b.states, b.pruned]);
  });
  it("state budget exhaustion still throws at the same point", () => {
    const M = generate("random-int", 22, 2);
    const run = (f: typeof cutBoundedDP) => { try { f(M, [...Array(22).keys()], { maxStates: 2000 }); return "done"; } catch (e) { return (e as Error).message; } };
    expect(run(cutBoundedDP)).toBe(run(cutBoundedDPReference as typeof cutBoundedDP));
    expect(run(cutBoundedDP)).toMatch(/state budget/);
  });
  it("layer telemetry reports the real layer sizes", () => {
    const M = generate("ties", 16, 4);
    const ev: number[] = [];
    const r = cutBoundedDP(M, [...Array(16).keys()], { onLayer: (e) => ev.push(e.layerSize) });
    expect([1, ...ev]).toEqual(r.layerSizes);
  });
});

/* ------------------------------------------------------------------ ATLAS telemetry */

describe("ATLAS telemetry", () => {
  const multi = (blocks: number, b: number, seed: number) => {
    const rnd = mulberry32(seed), n = blocks * b, M = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const v = Math.floor(i / b) === Math.floor(j / b) ? (Math.floor(rnd() * 11) - 5 || 1) : rnd() < 0.6 ? 1 + Math.floor(rnd() * 3) : 0;
      M[i][j] = v; M[j][i] = -v;
    }
    return M;
  };
  for (const [name, M] of [["4 components of 15", multi(4, 15, 1)], ["one component of 20", generate("random-int", 20, 3)], ["ties n=18", generate("ties", 18, 2)]] as const)
    it(`${name}: bounds are monotone, always bracket β*, and end at the reported values`, () => {
      const events: AtlasEvent[] = [];
      const r = solveAtlas(M, { onEvent: (e) => events.push(e), seed: 1 });
      expect(r.optimal).toBe(true);
      const n = M.length;
      let W = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) W += Math.abs(M[i][j]);
      const betaStar = r.beta;
      expect(betaStar).toBe((W - r.value) / 2);
      const withBounds = events.filter((e): e is Extract<AtlasEvent, { bounds: unknown }> => "bounds" in e);
      expect(withBounds[0].kind).toBe("plan");
      let up = Infinity, lo = -Infinity;
      for (const e of withBounds) {
        expect(e.bounds.betaUpper).toBeLessThanOrEqual(up);
        expect(e.bounds.betaLower!).toBeGreaterThanOrEqual(lo);
        expect(e.bounds.betaLower!).toBeLessThanOrEqual(betaStar);
        expect(e.bounds.betaUpper).toBeGreaterThanOrEqual(betaStar);
        up = e.bounds.betaUpper; lo = e.bounds.betaLower!;
      }
      expect(up).toBe(betaStar);
      expect(lo).toBe(r.lowerBoundBeta);
      // telemetry does not change the outcome
      const r2 = solveAtlas(M, { seed: 1 });
      expect(r2.value).toBe(r.value);
      expect(r2.optimal).toBe(true);
    });
  it("an interrupted run keeps a valid bracket and reports it", () => {
    const M = generate("random-int", 34, 1);
    const events: AtlasEvent[] = [];
    const r = solveAtlas(M, { onEvent: (e) => events.push(e), maxStates: 20_000, incumbentMs: 50 });
    expect(r.optimal).toBe(false);
    const last = [...events].reverse().find((e) => "bounds" in e) as Extract<AtlasEvent, { bounds: unknown }>;
    expect(last.bounds.betaUpper).toBe(r.beta);
    expect(last.bounds.betaLower).toBe(r.lowerBoundBeta);
    expect(r.lowerBoundBeta!).toBeLessThanOrEqual(r.beta);
  });
  it("the runner streams heuristic incumbents that only improve and end at the result", () => {
    const p = fromMatrix(generate("random-int", 30, 9));
    const vals: number[] = [];
    const r = solve(p, "heuristic", { timeLimitMs: 300, seed: 2 }, { telemetry: (e) => { if (e.kind === "incumbent") vals.push(e.value); } });
    expect(vals.length).toBeGreaterThan(0);
    for (let i = 1; i < vals.length; i++) expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    expect(Q.of(BigInt(vals[vals.length - 1]), p.scale).eq(r.FA)).toBe(true);
  });
});

/* ------------------------------------------------------------------ analysis */

describe("ordering analysis identities (exact)", () => {
  const cases: [string, Problem][] = [
    ["skew random", fromMatrix(generate("random-int", 11, 2))],
    ["benefit general", fromMatrix(randomGeneral(9, 4), "benefit")],
    ["cost general", fromMatrix(randomGeneral(8, 5), "cost")],
    ["fractions", fromMatrix([["0", "1/2", "-3/4", "0"], ["-1/2", "0", "5/3", "1"], ["3/4", "-5/3", "0", "-2"], ["0", "-1", "2", "0"]])],
  ];
  for (const [name, p] of cases)
    it(`${name}: Σ net = F_A, Σ backward = 2β, Σ satisfied = 2(W − β), backward pairs sum to β`, () => {
      const rnd = mulberry32(p.n);
      for (let k = 0; k < 6; k++) {
        const order = [...Array(p.n).keys()].sort(() => rnd() - 0.5);
        const c = itemContributions(p, order);
        const sum = (f: (x: (typeof c)[number]) => Q) => c.reduce((s, x) => s.add(f(x)), Q.ZERO);
        const beta = backwardWeight(p, order), W = totalWeight(p);
        expect(sum((x) => x.net).eq(exactFA(p, order))).toBe(true);
        expect(sum((x) => x.backward).eq(beta.mul(Q.of(2n)))).toBe(true);
        expect(sum((x) => x.satisfied).eq(W.sub(beta).mul(Q.of(2n)))).toBe(true);
        expect(backwardPairs(p, order).reduce((s, x) => s.add(x.weight), Q.ZERO).eq(beta)).toBe(true);
        expect(Q.of(BigInt(upperTriangleSum(p.M, order)), p.scale).eq(exactFA(p, order))).toBe(true);
      }
    });
  it("movement: Kendall distance and footrule match brute-force definitions", () => {
    const rnd = mulberry32(3);
    for (let k = 0; k < 20; k++) {
      const n = 2 + Math.floor(rnd() * 9);
      const a = [...Array(n).keys()].sort(() => rnd() - 0.5), b = [...Array(n).keys()].sort(() => rnd() - 0.5);
      const m = movement(a, b);
      let kd = 0;
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) if (x < y && (a.indexOf(x) < a.indexOf(y)) !== (b.indexOf(x) < b.indexOf(y))) kd++;
      expect(m.kendall).toBe(kd);
      expect(m.footrule).toBe([...Array(n).keys()].reduce((s, v) => s + Math.abs(a.indexOf(v) - b.indexOf(v)), 0));
      expect(movement(a, a).kendall).toBe(0);
    }
  });
  it("aggregation preserves totals and the upper-triangle sum for every bin count", () => {
    const M = generate("random-int", 37, 8);
    const order = localSearch(M, [...Array(37).keys()], { timeMs: 1e9, maxStarts: 5 }).order;
    for (const bins of [1, 5, 8, 37, 100]) {
      const g = aggregate(M, order, bins);
      let total = 0;
      for (let i = 0; i < g.bins * g.bins; i++) total += g.pos[i] + g.neg[i];
      expect(total).toBe(0);
      // F_M = Σ strictly-upper blocks + Σ upper triangles inside the diagonal blocks
      let diagUpper = 0;
      for (let b = 0; b < g.bins; b++) for (let r = g.edges[b]; r < g.edges[b + 1]; r++) for (let t = r + 1; t < g.edges[b + 1]; t++) diagUpper += M[order[r]][order[t]];
      let strictUpper = 0;
      for (let i = 0; i < g.bins; i++) for (let j = i + 1; j < g.bins; j++) strictUpper += g.pos[i * g.bins + j] + g.neg[i * g.bins + j];
      expect(strictUpper + diagUpper).toBe(upperTriangleSum(M, order));
      expect(g.edges[g.bins]).toBe(37);
    }
  });
  it("component ranges are contiguous in ATLAS orderings and cover every item", () => {
    const M = generate("blocks", 30, 2);
    const r = solveAtlas(M, { seed: 1 });
    const ranges = componentRanges(M, r.order);
    expect(ranges.reduce((s, x) => s + x.size, 0)).toBe(30);
    for (let i = 1; i < ranges.length; i++) expect(ranges[i].start).toBe(ranges[i - 1].end);
  });
});

describe("problem profile", () => {
  it("reports structure, ties and exactness", () => {
    const p = fromMatrix(generate("ties", 20, 1));
    const pr = profileProblem(p);
    expect(pr.n).toBe(20);
    expect(pr.zeroPairs + pr.nonzeroPairs).toBe(190);
    expect(pr.tournament).toBe(pr.zeroPairs === 0);
    expect(pr.componentSizes.reduce((a, b) => a + b, 0)).toBe(20);
    expect(pr.totalWeight.eq(totalWeight(p))).toBe(true);
    expect(pr.exactSolvers).toContain("atlas");
    expect(pr.exactSolvers).not.toContain("autocut");
  });
  it("difficulty classes follow the documented thresholds and never promise runtime", () => {
    expect(classifyDifficulty(1, 1, true).difficulty).toBe("trivial");
    expect(classifyDifficulty(13, 1, true).difficulty).toBe("easy");
    expect(classifyDifficulty(30, 1, true).difficulty).toBe("moderate");
    expect(classifyDifficulty(35, 1, true).difficulty).toBe("hard");
    expect(classifyDifficulty(70, 0.4, true).difficulty).toBe("hard");
    expect(classifyDifficulty(100, 0.9, true).difficulty).toBe("very hard");
    for (const s of [5, 20, 40, 100]) expect(classifyDifficulty(s, 0.9, true).reason).not.toMatch(/will finish|guarantee/i);
  });
});

/* ------------------------------------------------------------------ sessions */

class MemKV implements KV {
  m = new Map<string, string>();
  full = false;
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.full) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; } this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
}

describe("local sessions", () => {
  const input = { text: "0,1\n-1,0\n", format: "matrix" as const, interp: "skew" as const, nameEdits: { 0: "Alpha" }, initialOverride: [1, 0], title: "t" };
  it("round-trips through storage and lists newest first", async () => {
    const kv = new MemKV();
    const a = saveSession(kv, makeSession("first", input, { text: input.text, format: "matrix", interp: "skew", title: "t" }, settings));
    await new Promise((r) => setTimeout(r, 5));
    const b = saveSession(kv, makeSession("second", { ...input, text: "0,2\n-2,0\n" }, { text: input.text, format: "matrix", interp: "skew", title: "t" }, { ...settings, seed: 7, mode: "advanced" }));
    expect(a.ok && b.ok).toBe(true);
    const list = listSessions(kv);
    expect(list.map((x) => x.name)).toEqual(["second", "first"]);
    const l = loadSession(kv, list[0].id);
    expect(l.ok && l.session.input.text).toBe("0,2\n-2,0\n");
    expect(l.ok && l.session.settings.seed).toBe(7);
    expect(l.ok && l.session.settings.mode).toBe("advanced");
    expect(l.ok && l.session.input.nameEdits[0]).toBe("Alpha");
    deleteSession(kv, list[0].id);
    expect(listSessions(kv)).toHaveLength(1);
  });
  it("rejects foreign or malformed data and clamps settings", () => {
    expect(parseSession({ format: "other" }).ok).toBe(false);
    expect(parseSession({ format: "westfall-studio-session", version: 2 }).ok).toBe(false);
    const s = makeSession("x", input, { text: "", format: "matrix", interp: "skew", title: "" }, settings) as unknown as Record<string, unknown>;
    const bad = JSON.parse(JSON.stringify(s));
    bad.settings.timeLimitS = 1e9; bad.settings.solver = "rm -rf"; bad.settings.atlas.maxStates = -5; bad.input.nameEdits = { "0": 5, x: "y", 2: "ok" };
    const r = parseSession(bad);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.session.settings.timeLimitS).toBe(600);
      expect(r.session.settings.solver).toBe("atlas");
      expect(r.session.settings.atlas.maxStates).toBe(1000);
      expect(r.session.input.nameEdits).toEqual({ 2: "ok" });
    }
  });
  it("reports a full or disabled storage instead of failing silently", () => {
    const kv = new MemKV(); kv.full = true;
    const r = saveSession(kv, makeSession("x", input, { text: "", format: "matrix", interp: "skew", title: "" }, settings));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/QuotaExceededError/);
  });
  it("reproducibility bundle contains instance, settings, result and certificate", () => {
    const p = fromMatrix(generate("random-int", 14, 3));
    const r = solve(p, "atlas", { timeLimitMs: 30_000, seed: 1, atlas: ATLAS_DEFAULTS });
    const b = reproBundle(p, r, settings, "abc");
    expect(b.instance.names).toHaveLength(14);
    expect(b.result.result.objective).toBe(r.objective.toString());
    expect(b.certificate).not.toBeNull();
    expect(b.settings.solver).toBe("atlas");
    expect(JSON.parse(JSON.stringify(b)).instanceFingerprint).toBe("abc");
  });
});

/* ------------------------------------------------------------------ comparison lab */

describe("solver comparison lab", () => {
  it("plans only applicable solvers and explains every exclusion", () => {
    const plan = comparisonPlan(fromMatrix(generate("random-int", 24, 1)));
    const by = Object.fromEntries(plan.map((x) => [x.solver, x]));
    expect(by["subset-dp"].applicable).toBe(false);
    expect(by["autocut"].applicable).toBe(false);
    expect(by["exclusion"].applicable).toBe(true);
    expect(by["atlas"].applicable).toBe(true);
    expect(by["heuristic"].reason).toMatch(/never proves/);
  });
  it("runs every applicable solver on the same instance; proven optima agree; best is marked", () => {
    const p = fromMatrix(randomGeneral(9, 12), "cost");
    const rows = comparisonPlan(p).filter((x) => x.applicable).map((x) => rowFromResult(solve(p, x.solver, { timeLimitMs: 20_000, seed: 1, atlas: ATLAS_DEFAULTS }), 0));
    const { rows: fin, inconsistencies } = finalizeRows(p, rows);
    expect(inconsistencies).toEqual([]);
    const proved = fin.filter((r) => r.status === "OPTIMAL");
    expect(proved.length).toBeGreaterThanOrEqual(4);
    expect(new Set(proved.map((r) => r.objective)).size).toBe(1);
    expect(proved.every((r) => r.bestKnown)).toBe(true);
    const cond = { fingerprint: "f", n: 9, timeLimitMs: 20_000, seed: 1, atlasSettings: "defaults", sequential: true as const, startedAt: "now", userAgent: "test" };
    expect(comparabilityStatement(cond, fin).points.join(" ")).toMatch(/not a benchmark study/);
    const md = comparisonMarkdown(p, cond, fin, inconsistencies);
    expect(md).toContain("| Solver |");
    expect(md).not.toMatch(/\bfair\b/i);
    expect(comparisonCsv(fin).split("\n")).toHaveLength(fin.length + 2);
  });
  it("flags a 'proven optimum' that another run beats (consistency check)", () => {
    const p = fromMatrix(generate("random-int", 6, 1));
    const good = rowFromResult(solve(p, "subset-dp", { timeLimitMs: 5000, seed: 1 }), 0);
    const fake = { ...good, label: "Broken solver", objective: Q.of(-1000n).toString(), objectiveDecimal: "-1000" };
    expect(finalizeRows(p, [good, fake]).inconsistencies.join(" ")).toMatch(/Broken solver/);
    const skipped = failedRow("autocut", "skipped", "n too large");
    expect(finalizeRows(p, [good, skipped]).rows[1].bestKnown).toBe(false);
  });
});

/* ------------------------------------------------------------------ evidence + certificates */

describe("evidence ladder and certificate tampering", () => {
  const p = fromMatrix(generate("random-int", 16, 6));
  const r = solve(p, "atlas", { timeLimitMs: 30_000, seed: 1, atlas: ATLAS_DEFAULTS });
  const cert = r.atlas!.certificate as unknown as CertificateLike;
  it("separates the six levels; nothing claims Lean verification", () => {
    const before = evidenceLadder(r, null);
    expect(before.map((s) => s.state)).toEqual(["established", "established", "established", "established", "pending", "not-available"]);
    const v = verifyCertificate(cert);
    expect(v.verdict).toBe("ACCEPTED");
    const after = evidenceLadder(r, v);
    expect(after.find((s) => s.id === "independent")!.state).toBe("established");
    expect(after.find((s) => s.id === "lean")!.state).toBe("not-available");
    expect(evidenceSummary(r, v).established).toMatch(/independent verifier/);
  });
  it("a heuristic result only establishes feasibility and recomputation", () => {
    const h = solve(p, "heuristic", { timeLimitMs: 100, seed: 1 });
    expect(evidenceLadder(h, null).map((s) => s.state)).toEqual(["established", "established", "not-available", "not-available", "not-available", "not-available"]);
    expect(evidenceSummary(h, null).uncertain).toMatch(/never proves/);
  });
  const clone = () => JSON.parse(JSON.stringify(cert)) as CertificateLike;
  const tamper: [string, (c: CertificateLike) => void][] = [
    ["claimed β lowered", (c) => { const k = c.components.findIndex((x) => x.beta > 0); c.components[k].beta -= 1; c.claimedBeta = (c.claimedBeta ?? 0) - 1; }],
    ["two items swapped in a component order", (c) => { const k = c.components.findIndex((x) => x.order.length > 2); const o = c.components[k].order; [o[0], o[1]] = [o[1], o[0]]; c.order = c.components.flatMap((x) => x.order); }],
    ["packing weight inflated", (c) => { const k = c.components.findIndex((x) => x.packing && x.packing.w.length); if (k >= 0) c.components[k].packing!.w[0] += 10 ** 9; else c.A[0][1] += 1; }],
    ["matrix entry changed (skew broken)", (c) => { c.A[0][1] += 1; }],
    ["matrix pair changed consistently", (c) => { const [u, v] = [c.order[0], c.order[1]]; c.A[u][v] -= 50; c.A[v][u] += 50; }],
    ["order not a permutation", (c) => { c.order[0] = c.order[1]; }],
    ["claimed objective altered", (c) => { c.claimedFA = (c.claimedFA ?? 0) + 2; }],
    ["component marked unverifiable", (c) => { c.components[0].verifiable = false; }],
  ];
  for (const [name, f] of tamper)
    it(`tampered certificate is rejected: ${name}`, () => {
      const c = clone(); f(c);
      const v = verifyCertificate(c);
      expect(v.verdict).not.toBe("ACCEPTED");
    });
  it("resource exhaustion yields UNDECIDED, never ACCEPTED", () => {
    const big = fromMatrix(generate("random-int", 18, 3));
    const rr = solve(big, "atlas", { timeLimitMs: 60_000, seed: 1, atlas: { ...ATLAS_DEFAULTS, bound: "none" } });
    expect(rr.status).toBe("OPTIMAL");
    const v = verifyCertificate(rr.atlas!.certificate as unknown as CertificateLike, { maxStates: 10 });
    expect(["UNDECIDED", "ACCEPTED"]).toContain(v.verdict);
    // with no packings the verifier must search; 10 states cannot suffice for an 18-item dense component
    expect(v.verdict).toBe("UNDECIDED");
  });
});

/* ------------------------------------------------------------------ brute force agreement */

describe("every solver agrees with exhaustive enumeration on small instances", () => {
  for (const interp of ["skew", "benefit", "cost"] as const)
    for (const n of [4, 6, 7])
      it(`${interp} n=${n}`, () => {
        const p = interp === "skew" ? fromMatrix(generate("ties", n, n + 2)) : fromMatrix(randomGeneral(n, n * 3, -2, 6), interp);
        // independent exhaustive optimum of F_M
        let best = -Infinity;
        for (const o of allPerms(n)) best = Math.max(best, upperTriangleSum(p.M, o));
        expect(bruteForce(p.M).value).toBe(best);
        expect(subsetDPExact(p.M).value).toBe(best);
        for (const s of ["subset-dp", "exclusion", "autocut", "atlas"] as const) {
          const r = solve(p, s, { timeLimitMs: 20_000, seed: 1, atlas: ATLAS_DEFAULTS });
          expect(r.status).toBe("OPTIMAL");
          expect(r.FA.eq(Q.of(BigInt(best), p.scale))).toBe(true);
        }
        const h = solve(p, "heuristic", { timeLimitMs: 50, seed: 1 });
        expect(h.status).toBe("FEASIBLE");
        expect(h.FA.cmp(Q.of(BigInt(best), p.scale))).toBeLessThanOrEqual(0);
      });
  it("fingerprints are stable and sensitive", () => {
    expect(fingerprint("abc")).toBe(fingerprint("abc"));
    expect(fingerprint("abc")).not.toBe(fingerprint("abd"));
    expect(fingerprint("")).toHaveLength(16);
  });
});
