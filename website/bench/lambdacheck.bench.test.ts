/** Exact λ via AutoCut on small random instances, for validating benchmarks/lolib-full/lambda_bounds.py. */
import { it } from "vitest";
import fs from "fs";
import path from "path";
import { autoCut } from "../src/lib/studio/autocut";
import { Q } from "../src/lib/studio/rational";
import { mulberry32 } from "../src/lib/engine";
it("exact lambda sample", () => {
  const out: unknown[] = [];
  for (let seed = 1; seed <= 60; seed++) {
    const rnd = mulberry32(seed), n = 6 + (seed % 5), mode = seed % 3;
    const A = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      // mode 0: near-transitive; 1: random small ints with ties; 2: random signs
      const v = mode === 0 ? (rnd() < 0.85 ? 1 + Math.floor(rnd() * 4) : -(1 + Math.floor(rnd() * 4))) : mode === 1 ? Math.floor(rnd() * 5) - 2 : (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 9));
      A[i][j] = v; A[j][i] = -v;
    }
    const r = autoCut(A.map((row) => row.map((x) => Q.of(BigInt(x), 1n))))!;
    out.push({ seed, A, lambda: r.lambda, order: r.order });
  }
  fs.writeFileSync(path.resolve(__dirname, "../../benchmarks/lolib-full/results/lambda_exact_small.json"), JSON.stringify(out));
});
