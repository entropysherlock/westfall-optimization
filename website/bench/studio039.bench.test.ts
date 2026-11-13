/**
 * Mission 039 performance benchmark: the cut-bounded DP inner loop (cutdp.ts) in isolation.
 *
 * Fixed inputs: for each instance the incumbent comes from a deterministic, start-count-bounded local search
 * (no wall-clock budget) and the residual bound from fractionalPacking + withLongerCycles, both computed once
 * outside the timed region. Only cutBoundedDP is timed (median of REPS runs). Because the inputs are fixed,
 * states/pruned/β must be identical between code versions; the benchmark asserts that against the
 * reference file when it exists, so a speed-up can never come from a changed search.
 *
 * Before/after: the ATLAS-032 code is kept verbatim as cutdp.reference.ts; both versions are timed in the same
 * process, interleaved, on the same inputs, and their order/β/states/pruned must agree exactly.
 * Run:  npx vitest run --config bench/vitest.config.ts bench/studio039.bench.test.ts
 *       (writes benchmarks/studio-039/cutdp.<STUDIO039_LABEL or "run">.json; STUDIO039_TELEMETRY=1 adds the onLayer hook)
 */
import { expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { generate, mulberry32 } from "../src/lib/engine";
import { cutBoundedDP } from "../src/lib/studio/cutdp";
import { cutBoundedDPReference } from "../src/lib/studio/cutdp.reference";
import { fractionalPacking, withLongerCycles } from "../src/lib/studio/bounds/packing";
import { strongComponents, subMatrix } from "../src/lib/studio/decompose";
import { localSearch } from "../src/lib/studio/solvers";

const REPS = Number(process.env.STUDIO039_REPS ?? 5);
const LABEL = process.env.STUDIO039_LABEL ?? "run";
const TELEMETRY = process.env.STUDIO039_TELEMETRY === "1";

const skew = (n: number) => Array.from({ length: n }, () => Array(n).fill(0));
function multi(n: number, b: number, seed: number) {
  const rnd = mulberry32(seed), A = skew(n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const same = Math.floor(i / b) === Math.floor(j / b);
    const v = same ? (Math.floor(rnd() * 11) - 5 || 1) : rnd() < 0.6 ? 1 + Math.floor(rnd() * 3) : 0;
    A[i][j] = v; A[j][i] = -v;
  }
  return A;
}

const instances: [string, number[][]][] = [
  ["random-int n=24 s=2", generate("random-int", 24, 2)],
  ["random-int n=30 s=3", generate("random-int", 30, 3)],
  ["ties n=30 s=1", generate("ties", 30, 1)],
  ["ties n=35 s=3", generate("ties", 35, 3)],
  ["random-int n=35 s=3", generate("random-int", 35, 3)],
  ["multi-comp(b=12) n=120 s=1 (largest component)", multi(120, 12, 1)],
];

it("cut-bounded DP timing", () => {
  const rows: Record<string, unknown>[] = [];
  const dir = path.resolve(__dirname, "../../benchmarks/studio-039");
  fs.mkdirSync(dir, { recursive: true });
  const refFile = path.join(dir, "cutdp.before.json");
  const ref = fs.existsSync(refFile) ? (JSON.parse(fs.readFileSync(refFile, "utf8")).rows as Record<string, unknown>[]) : null;
  for (const [name, M0] of instances) {
    // the largest strong component (the DP runs per component in ATLAS)
    const comps = strongComponents(M0).components;
    const big = comps.reduce((a, c) => (c.length > a.length ? c : a), comps[0]);
    const M = subMatrix(M0, big);
    const s = M.length;
    const inc = localSearch(M, [...Array(s).keys()], { timeMs: 1e9, seed: 1, maxStarts: 300 }).order;
    const packing = withLongerCycles(M, fractionalPacking(M, { eps: 0.05 }));
    // paired, interleaved timing: before (reference copy of the ATLAS-032 code) and after (Mission 039) on the same inputs
    const tb: number[] = [], ta: number[] = [];
    let r: ReturnType<typeof cutBoundedDP> | null = null, r0: ReturnType<typeof cutBoundedDPReference> | null = null;
    let layers = 0;
    for (let k = 0; k < REPS; k++) {
      let t0 = performance.now();
      r0 = cutBoundedDPReference(M, inc, { maxStates: 6_000_000, packing, strict: true });
      tb.push(performance.now() - t0);
      t0 = performance.now();
      r = cutBoundedDP(M, inc, { maxStates: 6_000_000, packing, strict: true, ...(TELEMETRY ? { onLayer: () => { layers++; } } : {}) });
      ta.push(performance.now() - t0);
    }
    const med = (x: number[]) => { const y = [...x].sort((a, b) => a - b); return Math.round(y[Math.floor(y.length / 2)] * 10) / 10; };
    expect(r!.order).toEqual(r0!.order); expect(r!.states).toBe(r0!.states); expect(r!.pruned).toBe(r0!.pruned); expect(r!.beta).toBe(r0!.beta);
    const row = { name, size: s, states: r!.states, pruned: r!.pruned, beta: r!.beta, beforeMedianMs: med(tb), afterMedianMs: med(ta), speedup: Math.round((med(tb) / Math.max(0.1, med(ta))) * 100) / 100, beforeMs: tb.map(Math.round), afterMs: ta.map(Math.round), layerEvents: TELEMETRY ? layers : null };
    rows.push(row);
    process.stdout.write(`${name} (component ${s}): before ${row.beforeMedianMs} ms, after ${row.afterMedianMs} ms (×${row.speedup}), states ${row.states}, pruned ${row.pruned}, β ${row.beta}\n`);
    const same = ref?.find((x) => x.name === name);
    if (same) { expect(row.states).toBe(same.states); expect(row.pruned).toBe(same.pruned); expect(row.beta).toBe(same.beta); }
  }
  fs.writeFileSync(path.join(dir, `cutdp.${LABEL}.json`), JSON.stringify({ label: LABEL, node: process.version, reps: REPS, telemetry: TELEMETRY, cpu: "see README", rows }, null, 1));
});
