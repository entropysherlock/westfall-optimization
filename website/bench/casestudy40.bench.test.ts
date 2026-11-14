/**
 * Case study: "near-transitive n=40 s=1" from the ATLAS-032 benchmark generator.
 * Reproduces the instance, computes the greedy baseline, re-runs ATLAS-032 (variant E, the recorded default),
 * and exports an optimality certificate for the independent Python verifier.
 * Run: npx vitest run --config bench/vitest.config.ts bench/casestudy40.bench.test.ts
 * Output: ../benchmarks/case-study-40/{instance.json, atlas_run.json, certificate.json}
 */
import { it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { generate } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";

const OUT = path.resolve(__dirname, "../../benchmarks/case-study-40");
const W = (M: number[][]) => { let w = 0; for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) w += Math.abs(M[i][j]); return w; };
const F = (M: number[][], o: number[]) => { let s = 0; for (let r = 0; r < o.length; r++) for (let t = r + 1; t < o.length; t++) s += M[o[r]][o[t]]; return s; };
const beta = (M: number[][], o: number[]) => (W(M) - F(M, o)) / 2;

/** The specified baseline: repeatedly take the remaining item with the highest net pairwise preference
 *  sum_{j remaining} M[i][j]; ties go to the lowest index. */
function greedyDynamic(M: number[][]): number[] {
  const rem = new Set(M.keys()), out: number[] = [];
  while (rem.size) {
    let best = -1, bs = -Infinity;
    for (const i of rem) { let s = 0; for (const j of rem) if (j !== i) s += M[i][j]; if (s > bs) { bs = s; best = i; } }
    out.push(best); rem.delete(best);
  }
  return out;
}
/** A common alternative reading, reported for transparency: sort once by net score over all items. */
function greedyStatic(M: number[][]): number[] {
  const s = M.map((row) => row.reduce((a, b) => a + b, 0));
  return [...M.keys()].sort((a, b) => s[b] - s[a] || a - b);
}

it("case study 40", () => {
  fs.mkdirSync(OUT, { recursive: true });
  const M = generate("near-transitive", 40, 1);
  const n = M.length, total = W(M);
  fs.writeFileSync(path.join(OUT, "instance.json"), JSON.stringify({ name: "near-transitive n=40 s=1",
    generator: "website/src/lib/engine.ts generate('near-transitive', 40, 1)", n, totalWeight: total, A: M }));
  const gd = greedyDynamic(M), gs = greedyStatic(M);
  const opts = { bound: "cycles" as const, strict: true, maxStates: 4_000_000, seed: 1 };
  solveAtlas(M, { ...opts, deadline: performance.now() + 30000 }); // warm-up (JIT), not timed
  const times: number[] = [];
  let r = solveAtlas(M, { ...opts, deadline: performance.now() + 30000 });
  for (let k = 0; k < 5; k++) { const t0 = performance.now(); r = solveAtlas(M, { ...opts, deadline: performance.now() + 30000 }); times.push(performance.now() - t0); }
  times.sort((a, b) => a - b);
  const cpu = os.cpus();
  const run = {
    instance: "near-transitive n=40 s=1", n, totalWeight: total,
    greedy: { rule: "repeatedly take the remaining item with the highest net pairwise preference (sum over remaining j of M[i][j]); ties to lowest index",
      order: gd, F: F(M, gd), penalty: beta(M, gd) },
    greedyStaticAlternative: { rule: "sort once by net preference over all items (not the specified baseline)", order: gs, F: F(M, gs), penalty: beta(M, gs) },
    atlas: { variant: "E: ATLAS-032 final ({ bound: 'cycles', strict: true }, 4M states, 30 s, seed 1)", optimal: r.optimal,
      order: r.order, F: r.value, penalty: r.beta, lowerBoundPenalty: r.lowerBoundBeta, components: r.components.length,
      runs_ms: times.map((t) => Math.round(t)), median_ms: Math.round(times[2]) },
    environment: { node: process.version, platform: `${os.platform()} ${os.arch()}`, cpu: cpu[0]?.model, logicalCpus: cpu.length,
      memoryGB: Math.round(os.totalmem() / 1e9), date: new Date().toISOString(), note: "re-run environment (not the recorded benchmark machine)" },
  };
  fs.writeFileSync(path.join(OUT, "atlas_run.json"), JSON.stringify(run, null, 1));
  fs.writeFileSync(path.join(OUT, "certificate.json"), JSON.stringify({ "near-transitive n=40 s=1": {
    A: M, order: r.order, components: r.certificates.map(({ vertices, order, beta: b, packing }) => ({ vertices, order, beta: b, packing })) } }));
  process.stdout.write(`greedy ${run.greedy.penalty} | static ${run.greedyStaticAlternative.penalty} | ATLAS ${r.beta} F=${r.value} optimal=${r.optimal} median=${run.atlas.median_ms}ms runs=${run.atlas.runs_ms}\n`);
});
