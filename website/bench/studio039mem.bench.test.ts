/**
 * Mission 039 memory measurement: run ONE implementation (STUDIO039_IMPL=reference|current) on one fixed input
 * in a fresh process, and report the process's peak RSS (VmHWM from /proc/self/status, Linux). See benchmarks/studio-039/README.md.
 */
import { it } from "vitest";
import fs from "fs";
import { generate } from "../src/lib/engine";
import { cutBoundedDP } from "../src/lib/studio/cutdp";
import { cutBoundedDPReference } from "../src/lib/studio/cutdp.reference";
import { fractionalPacking, withLongerCycles } from "../src/lib/studio/bounds/packing";
import { localSearch } from "../src/lib/studio/solvers";

it("cut-bounded DP memory", () => {
  const M = generate("ties", 30, 1);
  const inc = localSearch(M, [...Array(30).keys()], { timeMs: 1e9, seed: 1, maxStarts: 300 }).order;
  const packing = withLongerCycles(M, fractionalPacking(M, { eps: 0.05 }));
  const f = process.env.STUDIO039_IMPL === "reference" ? cutBoundedDPReference : cutBoundedDP;
  const r = f(M, inc, { maxStates: 6_000_000, packing, strict: true });
  process.stdout.write(`impl=${process.env.STUDIO039_IMPL} states=${r.states} beta=${r.beta} peakRSS=${/VmHWM:\s*(\d+ kB)/.exec(fs.readFileSync("/proc/self/status", "utf8"))?.[1]}\n`);
});
