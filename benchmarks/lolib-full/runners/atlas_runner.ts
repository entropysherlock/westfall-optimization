/**
 * One ATLAS-032 run (final default options, unchanged algorithm) on one LOLIB file; prints one JSON line.
 * Usage: node atlas_runner.mjs <instance-file> <time-limit-ms>
 * The Python driver (run_suite.py) kills this process at the wall-clock limit; a killed run counts as unsolved.
 */
import fs from "fs";
import { solveAtlas } from "../../../website/src/lib/studio/atlas";
const [file, tlArg] = process.argv.slice(2);
const tok = fs.readFileSync(file, "utf8").trim().split(/\s+/).map(Number);
const n = tok[0];
const C = Array.from({ length: n }, (_, i) => tok.slice(1 + i * n, 1 + (i + 1) * n));
const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 0 : C[i][j] - C[j][i])));
let S = 0, W = 0;
for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) { S += C[i][j]; if (j > i) W += Math.abs(A[i][j]); }
const t0 = performance.now();
const r = solveAtlas(A, { deadline: t0 + Number(tlArg), maxStates: 4_000_000, seed: 1, bound: "cycles", strict: true });
const ms = performance.now() - t0;
let B = 0;
for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) B += C[r.order[a]][r.order[b]];
if (2 * B !== r.value + S) throw new Error("objective mismatch");
const ub = r.optimal ? B : r.lowerBoundBeta === null ? null : (W - 2 * r.lowerBoundBeta + S) / 2;
process.stdout.write(JSON.stringify({ optimal: r.optimal, benefit: B, upperBound: ub, solve_ms: ms, states: r.totalStates,
  components: r.components.length, largest: Math.max(...r.components.map((c) => c.size)), reason: r.interruptedReason, order: r.order }) + "\n");
