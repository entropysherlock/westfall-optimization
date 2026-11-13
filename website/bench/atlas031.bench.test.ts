/**
 * ATLAS-031 benchmark. Same instances, same limits for every solver.
 * Run:  npx vitest run --config bench/vitest.config.ts   (writes ../benchmarks/atlas-031/results.{json,md})
 * Env:  ATLAS_TL_MS (default 20000), ATLAS_SEEDS (default 3)
 */
import { it } from "vitest";
import fs from "fs";
import path from "path";
import { generate, mulberry32 } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";
import { exclusionExact, Interrupted, localSearch, scoreOf, subsetDPExact } from "../src/lib/studio/solvers";
import { minCutwidth, cutwidthSubsetDP, decideCutwidth } from "../src/lib/studio/cutwidth";

const TL = Number(process.env.ATLAS_TL_MS ?? 20000);
const SEEDS = Number(process.env.ATLAS_SEEDS ?? 3);
const now = () => performance.now();
const skew = (n: number) => Array.from({ length: n }, () => Array(n).fill(0));
const set = (A: number[][], i: number, j: number, v: number) => { A[i][j] = v; A[j][i] = -v; };
const shuffleSym = (A: number[][], rnd: () => number) => {
  const p = [...A.keys()];
  for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p.map((i) => p.map((j) => A[i][j]));
};
/** planted: transitive order with weights 1..5 and r random reversed pairs (weight 1..5). */
function planted(n: number, r: number, seed: number) {
  const rnd = mulberry32(seed), A = skew(n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) set(A, i, j, 1 + Math.floor(rnd() * 5));
  for (let t = 0; t < r; t++) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); if (i !== j) set(A, Math.min(i, j), Math.max(i, j), -(1 + Math.floor(rnd() * 5))); }
  return shuffleSym(A, rnd);
}
/** multi-component: blocks of size b, random inside (strongly connected w.h.p.), consistent (or tied) across. */
function multi(n: number, b: number, seed: number) {
  const rnd = mulberry32(seed), A = skew(n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const same = Math.floor(i / b) === Math.floor(j / b);
    set(A, i, j, same ? (Math.floor(rnd() * 11) - 5 || 1) : rnd() < 0.6 ? 1 + Math.floor(rnd() * 3) : 0);
  }
  return shuffleSym(A, rnd);
}

interface Row { family: string; n: number; seed: number; solver: string; status: string; value: number | null; ms: number; states: number | null; note: string }
const rows: Row[] = [];
function run(family: string, n: number, seed: number, M: number[][], solver: string, f: () => { status: string; value: number | null; states: number | null; note?: string }) {
  const t0 = now();
  let r: { status: string; value: number | null; states: number | null; note?: string };
  try { r = f(); } catch (e) { r = { status: e instanceof Interrupted ? "INTERRUPTED" : "ERROR", value: null, states: null, note: (e as Error).message.slice(0, 80) }; }
  rows.push({ family, n, seed, solver, status: r.status, value: r.value, ms: Math.round(now() - t0), states: r.states, note: r.note ?? "" });
  process.stdout.write(`${family} n=${n} s=${seed} ${solver}: ${r.status} ${r.value} ${Math.round(now() - t0)}ms states=${r.states}\n`);
}

function benchInstance(family: string, n: number, seed: number, M: number[][]) {
  // baseline production solvers (as runner.ts uses them)
  if (n <= 20) run(family, n, seed, M, "subset-dp (prod)", () => { const r = subsetDPExact(M, { deadline: now() + TL }); return { status: "OPTIMAL", value: r.value, states: r.states }; });
  if (n <= 26) run(family, n, seed, M, "exclusion (prod)", () => {
    const inc = localSearch(M, [...Array(n).keys()], { timeMs: Math.min(300, TL / 4), seed: 1 });
    try { const r = exclusionExact(M, inc.order); return { status: "OPTIMAL", value: r.value, states: r.generated }; }
    catch (e) { if (e instanceof Interrupted) return { status: "INTERRUPTED", value: scoreOf(M, inc.order), states: 3_000_000, note: "state budget" }; throw e; }
  });
  run(family, n, seed, M, "local-search (prod heuristic)", () => { const r = localSearch(M, [...Array(n).keys()], { timeMs: Math.min(1500, TL), seed: 1 }); return { status: "FEASIBLE", value: r.value, states: null }; });
  run(family, n, seed, M, "ATLAS", () => { const r = solveAtlas(M, { deadline: now() + TL }); return { status: r.optimal ? "OPTIMAL" : "INTERRUPTED", value: r.value, states: r.totalStates, note: `${r.components.length} comps, max ${Math.max(...r.components.map((c) => c.size))}` }; });
  run(family, n, seed, M, "ATLAS (no decomposition)", () => { const r = solveAtlas(M, { deadline: now() + TL, noDecompose: true }); return { status: r.optimal ? "OPTIMAL" : "INTERRUPTED", value: r.value, states: r.totalStates }; });
}

it("ATLAS-031 weighted ordering benchmark", () => {
  const seeds = [...Array(SEEDS).keys()].map((s) => s + 1);
  for (const kind of ["near-transitive", "random-int", "ties", "blocks", "cyclic"] as const)
    for (const n of kind === "cyclic" ? [13, 17, 21] : [12, 18, 24])
      for (const s of kind === "cyclic" ? [1] : seeds) benchInstance(kind, n, s, generate(kind, n, s));
  for (const [n, r] of [[30, 10], [60, 20], [100, 30], [200, 40]] as const) for (const s of seeds) benchInstance(`planted(r=${r})`, n, s, planted(n, r, s));
  for (const [n, b] of [[60, 10], [120, 12], [240, 14], [400, 16]] as const) for (const s of seeds) benchInstance(`multi-comp(b=${b})`, n, s, multi(n, b, s));
  const paley = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../examples/paley11.json"), "utf8"));
  const PM: number[][] = paley.A ?? paley.matrix ?? paley;
  if (Array.isArray(PM) && Array.isArray(PM[0])) benchInstance("example paley11", PM.length, 0, PM.map((r: unknown[]) => r.map(Number)));
  fs.writeFileSync(path.resolve(__dirname, "../../benchmarks/atlas-031/results.json"), JSON.stringify({ TL, SEEDS, rows, node: process.version }, null, 1));
});

it("ATLAS-031 cutwidth benchmark (semicomplete digraphs)", () => {
  const out: Record<string, unknown>[] = [];
  for (const [n, flips, p2] of [[16, 6, 0.02], [20, 8, 0.02], [40, 15, 0.01], [80, 25, 0.005], [150, 40, 0.002]] as const)
    for (const s of [1, 2, 3]) {
      const rnd = mulberry32(100 + s);
      // near-transitive semicomplete digraph: transitive + `flips` reversed pairs + a few two-way arcs, shuffled
      const adj = Array.from({ length: n }, (_, u) => Array.from({ length: n }, (_, v) => u < v));
      for (let t = 0; t < flips; t++) { const u = Math.floor(rnd() * n), v = Math.floor(rnd() * n); if (u < v && v - u < 8) { adj[u][v] = false; adj[v][u] = true; } }
      for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) if (rnd() < p2) adj[u][v] = adj[v][u] = true;
      const perm = [...Array(n).keys()].sort(() => rnd() - 0.5);
      const D = perm.map((i) => perm.map((j) => adj[i][j]));
      const t0 = now();
      const r = minCutwidth(D, { deadline: now() + 60_000 });
      const ms = Math.round(now() - t0);
      let ref: number | null = null, refMs: number | null = null;
      if (n <= 20) { const t1 = now(); ref = cutwidthSubsetDP(D); refMs = Math.round(now() - t1); }
      // NO-side: compare the theorem cap against plain exhaustion at k = ctw-1
      let noCap: unknown = null;
      if (r.cutwidth > 0) {
        const a = decideCutwidth(D, r.cutwidth - 1), b = decideCutwidth(D, r.cutwidth - 1, { useCap: false });
        noCap = { withCap: a.states, capUsed: a.capUsed, withoutCap: b.states };
      }
      const row = { n, seed: s, cutwidth: r.cutwidth, ms, ref, refMs, decisions: r.decisions, noSide: noCap };
      out.push(row);
      process.stdout.write(`cutwidth n=${n} s=${s}: ctw=${r.cutwidth} ${ms}ms ref=${ref} (${refMs}ms) ${JSON.stringify(noCap)}\n`);
    }
  fs.writeFileSync(path.resolve(__dirname, "../../benchmarks/atlas-031/cutwidth.json"), JSON.stringify(out, null, 1));
});
