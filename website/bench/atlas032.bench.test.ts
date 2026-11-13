/**
 * ATLAS-032 benchmark. Every variant gets the same instances, time limit (ATLAS_TL_MS, default 30 s) and
 * state budget (4 M). Variants: A = ATLAS-031 rule (no residual bound, non-strict); S = strict only;
 * B = strict + greedy triangle bound; C = strict + fractional triangle bound (ATLAS-032 default).
 * Run: npx vitest run --config bench/vitest.config.ts bench/atlas032.bench.test.ts
 */
import { it } from "vitest";
import fs from "fs";
import path from "path";
import { generate, mulberry32 } from "../src/lib/engine";
import { solveAtlas, type AtlasOptions } from "../src/lib/studio/atlas";
import { fractionalPacking } from "../src/lib/studio/bounds/packing";
import { strongComponents, subMatrix } from "../src/lib/studio/decompose";

const TL = Number(process.env.ATLAS_TL_MS ?? 30000);
const ONLY = process.env.ATLAS_ONLY ?? "";
const SHARD = process.env.ATLAS_SHARD ? process.env.ATLAS_SHARD.split("/").map(Number) : [0, 1]; // "i/k"
const now = () => performance.now();
const skew = (n: number) => Array.from({ length: n }, () => Array(n).fill(0));
const set = (A: number[][], i: number, j: number, v: number) => { A[i][j] = v; A[j][i] = -v; };
const shuffleSym = (A: number[][], rnd: () => number) => { const p = [...A.keys()]; for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } return p.map((i) => p.map((j) => A[i][j])); };
function planted(n: number, r: number, seed: number) { const rnd = mulberry32(seed), A = skew(n); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) set(A, i, j, 1 + Math.floor(rnd() * 5)); for (let t = 0; t < r; t++) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); if (i !== j) set(A, Math.min(i, j), Math.max(i, j), -(1 + Math.floor(rnd() * 5))); } return shuffleSym(A, rnd); }
function multi(n: number, b: number, seed: number) { const rnd = mulberry32(seed), A = skew(n); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const same = Math.floor(i / b) === Math.floor(j / b); set(A, i, j, same ? (Math.floor(rnd() * 11) - 5 || 1) : rnd() < 0.6 ? 1 + Math.floor(rnd() * 3) : 0); } return shuffleSym(A, rnd); }
/** weighted cyclic tournament: i beats the next ⌊(n−1)/2⌋ vertices cyclically, random weights 1..5 */
function wcyclic(n: number, seed: number) { const rnd = mulberry32(seed), A = skew(n); for (let i = 0; i < n; i++) for (let d = 1; d <= Math.floor((n - 1) / 2); d++) set(A, i, (i + d) % n, 1 + Math.floor(rnd() * 5)); return shuffleSym(A, rnd); }

const instances: { family: string; name: string; M: number[][] }[] = [];
const add = (family: string, name: string, M: number[][]) => instances.push({ family, name, M });
for (const s of [1, 2, 3]) {
  for (const n of [24, 30, 35]) { add(`random-int n=${n}`, `random-int n=${n} s=${s}`, generate("random-int", n, s)); add(`ties n=${n}`, `ties n=${n} s=${s}`, generate("ties", n, s)); }
  for (const n of [24, 30]) add(`weighted-cyclic n=${n}`, `weighted-cyclic n=${n} s=${s}`, wcyclic(n, s));
  for (const n of [24, 40]) add(`near-transitive n=${n}`, `near-transitive n=${n} s=${s}`, generate("near-transitive", n, s));
  add("planted(r=30) n=100 [031 regression]", `planted(r=30) n=100 s=${s}`, planted(100, 30, s));
  add("multi-comp(b=12) n=120 [031 regression]", `multi-comp(b=12) n=120 s=${s}`, multi(120, 12, s));
}
for (const n of [21, 25]) add(`cyclic (unweighted) n=${n}`, `cyclic n=${n}`, generate("cyclic", n, 1));
const lolibPath = path.resolve(__dirname, "../../benchmarks/atlas-032/lolib_io.json");
if (fs.existsSync(lolibPath)) for (const [name, v] of Object.entries(JSON.parse(fs.readFileSync(lolibPath, "utf8")) as Record<string, { A: number[][] }>)) add("LOLIB IO (real-world)", name, v.A);

const variants: [string, AtlasOptions][] = [
  ["A: ATLAS-031", { bound: "none", strict: false }],
  ["S: strict only", { bound: "none", strict: true }],
  ["B: strict + greedy triangles", { bound: "greedy", strict: true }],
  ["C: ATLAS-032 (strict + fractional triangles)", { bound: "fractional", strict: true }],
];

it("ATLAS-032 benchmark", () => {
  const rows: Record<string, unknown>[] = [];
  const out = path.resolve(__dirname, `../../benchmarks/atlas-032/results${SHARD[1] > 1 ? `.shard${SHARD[0]}` : ""}.json`);
  for (const [ii, inst] of instances.entries()) {
    if (ONLY && !inst.name.includes(ONLY)) continue;
    if (ii % SHARD[1] !== SHARD[0]) continue;
    const n = inst.M.length;
    let W = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) W += Math.abs(inst.M[i][j]);
    // best rigorous bound for reporting: Σ over strong components of the fractional packing bound (not timed)
    let lbBeta = 0;
    for (const c of strongComponents(inst.M).components) if (c.length >= 3) { const p = fractionalPacking(subMatrix(inst.M, c)); lbBeta += Math.ceil(p.total / p.D); }
    for (const [vname, opt] of variants) {
      // ablations S and B only on the n = 24 dense families (the ATLAS-031 failure set); A and C everywhere
      if ((vname.startsWith("S") || vname.startsWith("B")) && !/^(random-int|ties) n=24/.test(inst.name)) continue;
      const t0 = now(); const rss0 = process.memoryUsage().rss;
      const r = solveAtlas(inst.M, { ...opt, deadline: now() + TL, maxStates: 4_000_000, seed: 1 });
      const ms = Math.round(now() - t0);
      const beta = (W - r.value) / 2;
      const row = { family: inst.family, name: inst.name, n, variant: vname, status: r.optimal ? "OPTIMAL" : "INTERRUPTED", F: r.value, beta,
        bestBoundBeta: r.optimal ? beta : lbBeta, gapAbs: r.optimal ? 0 : beta - lbBeta, ms, states: r.totalStates,
        pruned: r.components.reduce((s, c) => s + (c.pruned ?? 0), 0), packingMs: Math.round(r.components.reduce((s, c) => s + (c.packingMs ?? 0), 0)),
        components: r.components.length, largest: Math.max(...r.components.map((c) => c.size)), rssDeltaMB: Math.round((process.memoryUsage().rss - rss0) / 1e6) };
      rows.push(row);
      process.stdout.write(`${inst.name} | ${vname}: ${row.status} β=${beta} LB=${row.bestBoundBeta} ${ms}ms states=${row.states}\n`);
    }
    fs.writeFileSync(out, JSON.stringify({ TL, node: process.version, rows }, null, 1));
  }
});
