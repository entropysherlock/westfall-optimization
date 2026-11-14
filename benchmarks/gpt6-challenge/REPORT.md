# WESTFALL vs GPT-6 challenge — independent re-check

**Author:** Caleb J Westfall · **Date:** 14 November 2026

GPT-6 supplied two weighted linear ordering instances (20 and 50 items). ATLAS-032 was run on them in Westfall Optimization Studio before ATLAS-060 existed. This folder re-checks those results and runs other solvers on the same instances.

Objective (from the Studio files): maximise F(π) = Σ_{r<s} a[π_r][π_s], with A skew-symmetric integers (|a| ≤ 150). The `.lolib` files are the same matrices in LOLIB format. `scripts/check.py` and `scripts/dp20.py` reproduce the checks below.

## Round 1 — 20 items: optimum 7,288 (proved)
- The Studio ordering scores exactly 7,288 when recomputed from the matrix.
- Independent proof: exhaustive dynamic programming over all 2²⁰ prefix sets gives 7,288 (0.6 s). It finds a different ordering with the same value; the optimum is not unique.
- ATLAS-032, ATLAS-060, HiGHS and SCIP all prove 7,288 in under 1 s on one core. This instance does not separate the solvers.

## Round 2 — 50 items: best 33,214 (not proved)
All runs on one pinned core, 2 vCPU Xeon @ 2.1 GHz ([`results.jsonl`](results.jsonl)):

| Method | Limit | Best F | Proved | Upper bound on F* |
|---|---|---|---|---|
| ATLAS-032, Studio settings (1.5 M states) | 30 / 120 s | 33,214 | no — state budget at ~24 s | 38,856 |
| ATLAS-032, LOLIB settings (4 M states) | 30 / 120 s | 33,214 | no | 38,856 |
| ATLAS-060 | 30 / 120 s | 33,214 | no — handed to ATLAS-032 | 38,464 (exact) |
| HiGHS 1.16 | 30 / 120 s | 32,616 / 32,616 | no | 38,464 |
| SCIP 10 | 30 / 120 s | 20,056 / 27,986 | no | 38,279 / 38,209 (floating point) |
| Iterated local search, 60 s | — | 33,214 (same ordering as ATLAS) | — | — |
| GPT-6 (self-reported) | ~29 s | 32,840 | no | — |

- GPT-6's 32,840 is **not verified**: its ordering was not supplied.
- Every method tried converges on 33,214, but optimality is unproved: the best exact bound leaves a gap of about 15.8 %.
- ATLAS-060 brings nothing here except a tighter exact bound. The instance behaves like the dense random RandB family, where the 3-dicycle relaxation is weak.

## Reading
ATLAS found the best ordering any method produced on the 50-item instance, 374 above GPT-6's reported score, and better than HiGHS and SCIP within 120 s. Runtime comparison with GPT-6 is uncontrolled (different hardware, self-reported time). One instance is an anecdote, not a benchmark; LOLIB is the evidence base.
