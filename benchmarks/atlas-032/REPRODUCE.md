# ATLAS-032 — Reproduction and release record

**Frozen release baseline:** main squash merge `8a18e4254a51462b3333626a6c365311ffe05a57` (PR #9). Original benchmark research head `f4b5d96a41d0949e8b107563b8d99cce7f8e693f`.

**Status and limitations:** These are a historical reported benchmark from 2026-11-13. We have the source, synthetic-instance generator, real-data importer, raw result JSON, benchmark tables, and independent certificate verifier. Passing CI proves that the code and selected certificates pass the automated checks; CI does **not** rerun the complete 88-instance timing comparison. The upstream RPLib clone is not pinned, so a later download can change its contents; verify dataset names/versions/checksums before claiming bit-for-bit replay. Avoid claims of universal superiority over HiGHS, SCIP, commercial MIP, or dedicated LOP codes.

## Conditions

- 88 total instances: 38 synthetic and regression instances, 50 LOLIB IO cases imported from [IGARDS/RPLib](https://github.com/IGARDS/RPLib).
- ATLAS/Node 22.23.4; HiGHS 1.16.0; one computational thread per solver; 30 s per instance; ATLAS state limit 4 million.
- Reported hardware: 2-vCPU Intel Xeon 2.1 GHz, 8 GB RAM.
- Metric: number of instances with **proved exact optimality**. For HiGHS set `mip_rel_gap = 0`; default gap tolerance does not satisfy the same certification condition.
- Results: ATLAS-031 47/88, ATLAS-032 85/88, HiGHS exact-gap 83/88; 50/50 LOLIB for ATLAS-032 and HiGHS.
- On many LP-tight instances HiGHS is materially faster. Three n=35 dense cases remain unproved by ATLAS-032 under these limits.

## Regenerate inputs (clean clone, Unix shell)

```bash
python3 benchmarks/atlas-032/fetch_lolib_io.py
cd website
npm ci
npx vitest run --config bench/vitest.config.ts bench/export032.bench.test.ts
cd ..
```

The importer writes `benchmarks/atlas-032/lolib_io.json` and the exporter writes `benchmarks/atlas-032/instances.json` (intentionally not committed because they include third-party datasets).

Before comparing with 2026-11-13 results, record the precise RPLib revision, the generated set of 50 LOLIB names, and the generated inputs' SHA256. Upstream updates or lossy conversions can invalidate literal comparisons. The importer currently converts RPLib numeric values through `int(round(float(v)))`; note that in claims about faithful raw-source reproduction.

## Rerun ATLAS variants

```bash
cd website
ATLAS_TL_MS=30000 ATLAS_VARIANTS=A,C npx vitest run --config bench/vitest.config.ts bench/atlas032.bench.test.ts
ATLAS_TL_MS=30000 ATLAS_VARIANTS=E npx vitest run --config bench/vitest.config.ts bench/atlas032.bench.test.ts
cd ..
```

These commands rerun the base and final variants with default non-sharded instance order. For the earlier strict-only and greedy-triangle ablation, run `ATLAS_VARIANTS=S,B` (these are defined only on the six dense n=24 milestone cases). If memory is restricted, use `ATLAS_SHARD=0/2` and `ATLAS_SHARD=1/2` sequentially and combine the produced JSON files. Rerunning modifies local result outputs; preserve original committed JSON for provenance.

## Rerun HiGHS

Install a compatible `highspy` and NumPy version in Python, then:

```bash
cd benchmarks/atlas-032
ATLAS_TL_S=30 python3 highs_032.py
```

**Important:** `highs_032.py` resumes from `highs_results.json` when that file already contains rows, so on a fresh clone the version-controlled historical rows cause an immediate skip. To force a clean timing replay, archive and remove the local output JSON first. Do not overwrite the committed historical data without preserving it. Likewise, the default-gap run uses `HIGHS_DEFAULT_GAP=1` and is a separate, non-exact-control experiment.

## Independently verify certificates

```bash
python3 benchmarks/atlas-032/verify_certificate.py benchmarks/atlas-032/certificates.json
```

GitHub CI now executes exactly this command as `atlas-certificates`, in addition to website typecheck/lint/tests/build/browser tests and Python/service tests. The checker uses arbitrary-precision Python integer arithmetic to validate packing feasibility and, where needed, a pruned exhaustive proof of optimality. It does not depend on the TypeScript solver.

## Supporting artifacts

- `ATLAS_032_REPORT.md`: scope, failures, and performance interpretation.
- `RESULTS.md`: family-by-family tables including HiGHS wins.
- `PROOFS.md` and `NOVELTY.md`: correctness proofs and explicit standard/non-novel status.
- `results.json`, `results_E.json`, `highs_results.json`, `highs_results_defaultgap.json`: historical benchmark records.
- `certificates.json`: selected independent optimality certificates.

## Release conclusion

ATLAS-032 is an empirically successful, selectively strong, exactly certified research solver for weighted linear ordering. It is **not** a new mathematical theorem, not fully Lean-verified, and not demonstrated best-in-class on broadly representative optimization workloads.
