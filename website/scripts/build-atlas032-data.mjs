// Builds public/data/atlas-032.json from the committed ATLAS-032 benchmark records
// (benchmarks/atlas-032/results.json, results_E.json, highs_results.json, highs_results_defaultgap.json).
// No value is typed by hand: every number shown on /benchmarks/ for ATLAS-032 comes from these files.
// Run: node scripts/build-atlas032-data.mjs
import fs from "node:fs";
import path from "node:path";

const src = path.resolve(import.meta.dirname, "../../benchmarks/atlas-032");
const read = (f) => JSON.parse(fs.readFileSync(path.join(src, f), "utf8"));
const atlas = [...read("results.json").rows, ...read("results_E.json").rows];
const highs = read("highs_results.json");
const highsDefault = fs.existsSync(path.join(src, "highs_results_defaultgap.json")) ? read("highs_results_defaultgap.json") : [];
const code = (v) => v.split(":")[0]; // A, S, B, C, E
const real = (family) => family.startsWith("LOLIB");
const rows = atlas.map((r) => ({
  name: r.name, family: r.family, real: real(r.family), n: r.n, solver: code(r.variant), status: r.status === "OPTIMAL" ? "OPTIMAL" : "UNPROVED",
  F: r.F, beta: r.beta, lowerBoundBeta: r.bestBoundBeta, ms: r.ms, states: r.status === "OPTIMAL" ? r.states : null,
}));
for (const h of highs)
  rows.push({ name: h.name, family: h.family, real: real(h.family), n: h.n, solver: "H", status: h.status === "Optimal" ? "OPTIMAL" : "UNPROVED",
    F: h.F, beta: h.beta, lowerBoundBeta: h.boundBeta, ms: Math.round(h.end_to_end_s * 1000), states: null });
const exactF = Object.fromEntries(highs.filter((h) => h.status === "Optimal").map((h) => [h.name, h.F]));
const toleranceMislabels = highsDefault.filter((h) => h.status === "Optimal" && exactF[h.name] !== undefined && h.F !== exactF[h.name])
  .map((h) => ({ name: h.name, defaultGapF: h.F, exactF: exactF[h.name] }));
const out = {
  generatedFrom: ["benchmarks/atlas-032/results.json", "benchmarks/atlas-032/results_E.json", "benchmarks/atlas-032/highs_results.json", "benchmarks/atlas-032/highs_results_defaultgap.json"],
  conditions: "30 s limit and 4 M-state budget per run; identical instances for every solver; one thread; 2 vCPU Intel Xeon 2.1 GHz, 8 GB RAM; Node 22.23.4; HiGHS 1.16.0 with mip_rel_gap = 0 (exact). HiGHS times include model building.",
  solvers: { A: "ATLAS-031", S: "strict pruning only", B: "+ greedy triangle bound", C: "+ fractional triangle bound", E: "ATLAS-032 (final)", H: "HiGHS 1.16 MILP (exact gap)" },
  rows, toleranceMislabels,
};
fs.writeFileSync(path.resolve(import.meta.dirname, "../public/data/atlas-032.json"), JSON.stringify(out));
console.log(`atlas-032.json: ${rows.length} rows, ${toleranceMislabels.length} tolerance mislabels`);
