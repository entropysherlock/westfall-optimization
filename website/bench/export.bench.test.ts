// Exports the exact instances used for the HiGHS comparison (same generators/seeds as atlas031.bench.test.ts).
import { it } from "vitest";
import fs from "fs";
import path from "path";
import { generate, mulberry32 } from "../src/lib/engine";
const skew = (n: number) => Array.from({ length: n }, () => Array(n).fill(0));
const set = (A: number[][], i: number, j: number, v: number) => { A[i][j] = v; A[j][i] = -v; };
const shuffleSym = (A: number[][], rnd: () => number) => { const p = [...A.keys()]; for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p.map((i) => p.map((j) => A[i][j])); };
function planted(n: number, r: number, seed: number) { const rnd = mulberry32(seed), A = skew(n); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) set(A, i, j, 1 + Math.floor(rnd() * 5)); for (let t = 0; t < r; t++) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); if (i !== j) set(A, Math.min(i, j), Math.max(i, j), -(1 + Math.floor(rnd() * 5))); } return shuffleSym(A, rnd); }
function multi(n: number, b: number, seed: number) { const rnd = mulberry32(seed), A = skew(n); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const same = Math.floor(i / b) === Math.floor(j / b); set(A, i, j, same ? (Math.floor(rnd() * 11) - 5 || 1) : rnd() < 0.6 ? 1 + Math.floor(rnd() * 3) : 0); } return shuffleSym(A, rnd); }
it("export", () => {
  const inst: Record<string, number[][]> = {};
  for (const s of [1, 2, 3]) {
    inst[`random-int n=18 s=${s}`] = generate("random-int", 18, s);
    inst[`random-int n=24 s=${s}`] = generate("random-int", 24, s);
    inst[`near-transitive n=24 s=${s}`] = generate("near-transitive", 24, s);
    inst[`planted(r=10) n=30 s=${s}`] = planted(30, 10, s);
    inst[`planted(r=20) n=60 s=${s}`] = planted(60, 20, s);
    inst[`planted(r=30) n=100 s=${s}`] = planted(100, 30, s);
    inst[`multi-comp(b=10) n=60 s=${s}`] = multi(60, 10, s);
    inst[`multi-comp(b=12) n=120 s=${s}`] = multi(120, 12, s);
  }
  fs.writeFileSync(path.resolve(__dirname, "../../benchmarks/atlas-031/highs_instances.json"), JSON.stringify(inst));
});
