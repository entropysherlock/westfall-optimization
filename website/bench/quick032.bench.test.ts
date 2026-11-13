import { it } from "vitest";
import { generate } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";
it("quick", () => {
  for (const [k, n, s] of [["random-int", 30, 1], ["ties", 30, 1]] as const) {
    const t0 = performance.now(); const r = solveAtlas(generate(k, n, s), { deadline: performance.now() + 120_000, maxStates: 6_000_000 });
    process.stdout.write(`${k} n=${n} s=${s}: optimal=${r.optimal} states=${r.totalStates} ${Math.round(performance.now() - t0)}ms ${r.components[0]?.note ?? ""}\n`);
  }
});
