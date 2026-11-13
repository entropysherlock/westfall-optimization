/**
 * Mission 039: main-thread cost of what the Studio recomputes when the input text changes
 * (parse → build model → recommendation → profile → fingerprint), for the largest supported size.
 * Run: npx vitest run --config bench/vitest.config.ts bench/studio039main.bench.test.ts
 */
import { it } from "vitest";
import { generate } from "../src/lib/engine";
import { parseInput } from "../src/lib/studio/parse";
import { buildProblem } from "../src/lib/studio/model";
import { recommendSolver } from "../src/lib/studio/select";
import { fingerprint, profileProblem } from "../src/lib/studio/analysis";
import { instanceJson } from "../src/lib/studio/report";

it("input pipeline cost", () => {
  for (const n of [60, 200, 400]) {
    const M = generate("random-int", n, 1);
    const text = M.map((r) => r.join(",")).join("\n");
    const stages: Record<string, number[]> = { parse: [], build: [], recommend: [], profile: [], fingerprint: [] };
    for (let k = 0; k < 5; k++) {
      let t = performance.now();
      const r = parseInput(text, "matrix"); if (!r.ok) throw new Error("parse");
      stages.parse.push(performance.now() - t); t = performance.now();
      const b = buildProblem(r.value, "skew"); if (!b.ok) throw new Error("build");
      stages.build.push(performance.now() - t); t = performance.now();
      recommendSolver(b.problem); stages.recommend.push(performance.now() - t); t = performance.now();
      profileProblem(b.problem); stages.profile.push(performance.now() - t); t = performance.now();
      fingerprint(JSON.stringify(instanceJson(b.problem))); stages.fingerprint.push(performance.now() - t);
    }
    const med = (x: number[]) => [...x].sort((a, b) => a - b)[2].toFixed(1);
    process.stdout.write(`n=${n}: ${Object.entries(stages).map(([k, v]) => `${k} ${med(v)} ms`).join(", ")}\n`);
  }
});
