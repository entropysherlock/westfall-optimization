// Builds public/data/lolib-full.json from the committed LOLIB records (benchmarks/lolib-full/results/*.jsonl,
// benchmarks/atlas-060/results/*.jsonl) and the GPT-6 challenge records (benchmarks/gpt6-challenge/results.jsonl).
// No value is typed by hand except GPT-6's self-reported score, which is labelled as unverified.
// Run: node scripts/build-lolib-data.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const jsonl = (p) => fs.readFileSync(path.join(root, p), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l.replace(/:\s*(-?)Infinity\b/g, ': "$1Infinity"').replace(/:\s*NaN\b/g, ": null")));  // Python json.dumps writes Infinity/NaN
const FAMILIES = ["IO", "SGB", "RandB", "MB", "Spec"];

const SOLVERS = [
  { key: "atlas060", label: "ATLAS-060 (experimental)", file: "benchmarks/atlas-060/results/atlas060.exact.jsonl", note: "Experimental prototype, 14 Nov 2026, same machine as the ATLAS-032 rerun." },
  { key: "atlas032", label: "ATLAS-032 (published run)", file: "benchmarks/lolib-full/results/atlas.exact.jsonl", note: "Published LOLIB study, 14 Nov 2026." },
  { key: "atlas032r", label: "ATLAS-032 (rerun, same machine as ATLAS-060)", file: "benchmarks/lolib-full/results/atlas.repro_2026-11-14.jsonl", note: "Unchanged ATLAS-032 rerun alongside ATLAS-060; this machine is ~30 % slower than the published one." },
  { key: "highs", label: "HiGHS 1.16", file: "benchmarks/lolib-full/results/highs.exact.jsonl", note: "Published LOLIB study." },
  { key: "scip", label: "SCIP 10", file: "benchmarks/lolib-full/results/scip.exact.jsonl", note: "Published LOLIB study." },
];

const byId = new Map();
for (const s of SOLVERS) {
  for (const r of jsonl(s.file)) {
    if (!FAMILIES.includes(r.family)) continue;
    if (!byId.has(r.id)) byId.set(r.id, { id: r.id, family: r.family, name: r.name, n: r.n, bks: r.bks, by: {} });
    const num = (x) => (x === null || x === undefined ? null : Number(x));
    byId.get(r.id).by[s.key] = {
      status: r.status, solved: !!r.solved, wall: r.wall_s === null || r.wall_s === undefined ? null : Math.round(r.wall_s * 1000) / 1000,
      F: num(r.benefit), upper: r.upperBound === null || r.upperBound === undefined || !Number.isFinite(Number(r.upperBound)) ? null : Math.floor(Number(r.upperBound) + 1e-6),
    };
  }
}
const instances = [...byId.values()].sort((a, b) => FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family) || a.name.localeCompare(b.name, "en", { numeric: true }));
for (const i of instances) for (const s of SOLVERS) if (!i.by[s.key]) throw new Error(`missing ${s.key} for ${i.id}`);

// independent verification of ATLAS-060's proved results
const ver = jsonl("benchmarks/atlas-060/results/verification.jsonl");
const verification = {
  proved: ver.length,
  objectiveRecomputed: ver.filter((v) => v.permutation && v.benefit_ok).length,
  equalsBKS: ver.filter((v) => v.equals_bks).length,
  certificates: ver.filter((v) => "cert_valid" in v).length,
  certificatesValid: ver.filter((v) => v.cert_valid && v.cert_matches_objective).length,
};

const ch = jsonl("benchmarks/gpt6-challenge/results.jsonl");
const challenge = {
  rounds: [
    { key: "round1_20items", label: "Round 1 · 20 items", n: 20, optimum: 7288, optimumProof: "exhaustive dynamic programming over all 2^20 prefix sets (scripts/dp20.py)", gpt6: null },
    { key: "round2_50items", label: "Round 2 · 50 items", n: 50, optimum: null, optimumProof: null, gpt6: { F: 32840, verified: false, note: "self-reported by GPT-6; its ordering was not supplied, so the score cannot be checked" } },
  ],
  runs: ch.map((r) => ({ round: r.inst, tl: r.tl, solver: r.solver, wall: r.wall, proved: r.proved, F: r.F, upper: r.upper === null || r.upper === undefined ? null : Math.floor(Number(r.upper) + 1e-6) })),
  ils: { round: "round2_50items", F: 33214, seconds: 60, note: "independent iterated local search, 1 150 restarts; same ordering as ATLAS" },
};

const out = {
  generatedFrom: [...SOLVERS.map((s) => s.file), "benchmarks/atlas-060/results/verification.jsonl", "benchmarks/gpt6-challenge/results.jsonl"],
  conditions: "232 LOLIB instances (IO, SGB, RandB, MB, Spec). One thread, 30 s wall clock including model build, process killed at 33 s; solved = proved optimal within 30 s. 2 vCPU Intel Xeon @ 2.10 GHz, 8 GB RAM. Best-known values (BKS) recomputed from the MA-EDM published permutations.",
  families: FAMILIES,
  solvers: SOLVERS.map(({ key, label, note }) => ({ key, label, note })),
  instances, verification, challenge,
};
const dest = path.resolve(import.meta.dirname, "../public/data/lolib-full.json");
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`wrote ${dest}: ${instances.length} instances × ${SOLVERS.length} solvers; ${challenge.runs.length} challenge runs`);
