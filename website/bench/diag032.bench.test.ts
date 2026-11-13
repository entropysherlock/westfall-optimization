// ATLAS-032 diagnosis of the n = 24 barrier (same instances as ATLAS-031: engine generator, seeds 1–3).
import { it } from "vitest";
import { generate } from "../src/lib/engine";
import { cutBoundedDP } from "../src/lib/studio/cutdp";
import { fractionalPacking, greedyPacking } from "../src/lib/studio/bounds/packing";
import { localSearch } from "../src/lib/studio/solvers";
const now = () => performance.now();
it("diagnose", () => {
  for (const kind of ["random-int", "ties"] as const) for (const s of [1, 2, 3]) {
    const M = generate(kind, 24, s); const n = 24;
    const inc = localSearch(M, [...Array(n).keys()], { timeMs: 300, seed: 1 }).order;
    let B = 0; for (let r = 0; r < n; r++) for (let t = r + 1; t < n; t++) B += Math.max(M[inc[t]][inc[r]], 0);
    const g = greedyPacking(M), f = fractionalPacking(M);
    const line: string[] = [`${kind} s=${s}: incumbent β=${B}  rootLB greedy=${g.total / g.D} (${g.ms.toFixed(0)}ms)  fractional=${(f.total / f.D).toFixed(2)} (${f.ms.toFixed(0)}ms, ${f.method})`];
    for (const [name, o] of [["A 031", {}], ["strict", { strict: true }], ["strict+greedy", { strict: true, packing: g }], ["strict+fractional", { strict: true, packing: f }]] as const) {
      const t0 = now();
      try { const r = cutBoundedDP(M, inc, { ...o, maxStates: 3_000_000, deadline: now() + 60_000 }); line.push(`  ${name}: β*=${r.beta} proved=${r.incumbentProved} states=${r.states} pruned=${r.pruned} ${Math.round(now() - t0)}ms maxLayer=${r.maxLayer}`); }
      catch (e) { line.push(`  ${name}: ${(e as Error).message} ${Math.round(now() - t0)}ms`); }
    }
    process.stdout.write(line.join("\n") + "\n");
  }
});
