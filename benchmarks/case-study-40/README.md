# Case study: one 40-item sequence, proved optimal

**Instance.** `near-transitive n=40 s=1` from the deterministic ATLAS-032 benchmark generator:
`generate("near-transitive", 40, 1)` in `website/src/lib/engine.ts`. It is a synthetic benchmark, not customer
data. A pair weight is how strongly one item should precede another; the **penalty** of an order is the total
weight of the preferences it violates (its backward weight β). Lower is better. Total pair weight W = 2 285;
objective F = W − 2β.

## Verified results

| Method | Penalty β | Objective F | vs greedy | Proof of optimality |
|---|---:|---:|---:|---|
| Greedy baseline (specified rule, below) | 475 | 1 335 | — | none |
| Greedy + insertion local search (context) | 321 | 1 643 | −32.4% | none; cannot know it is within 2 of the optimum |
| **ATLAS-032** | **319** | **1 647** | **−32.84%** | **proved; exported certificate verified independently** |
| HiGHS 1.16 (exact MILP, gap 0) | 319 | 1 647 | −32.84% | proved by the MILP solver (no exportable certificate) |

**Improvement.** 475 − 319 = 156 penalty points, i.e. 156 / 475 = **32.84%** lower than the greedy baseline. That
is a comparison with a simple heuristic only. It is **not** a comparison with HiGHS, Gurobi, Hexaly or any other
exact solver: HiGHS reaches the same optimum.

**Greedy rule.** Repeatedly take the remaining item with the highest net pairwise preference
Σ_{j remaining} M[i][j], with ties going to the lowest index. Another common reading, which sorts once by net
preference over all items, gives 445; the optimum is 28.3% below that. We report the specified rule.

## Runtime (2-vCPU Intel Xeon 2.1 GHz, 8 GB RAM, Node 22.23.4, HiGHS 1.16.0, one thread each)

| Solver | Recorded benchmark | Re-run here (median of 5 after warm-up) |
|---|---:|---:|
| ATLAS-032, variant E (30 s limit, 4 M states) | **1.287 s** (`../atlas-032/results_E.json`, `ms: 1287`) | 1.207 s (runs 1.075–1.413 s) |
| HiGHS 1.16, mip_rel_gap = 0, end to end | 0.204 s (`../atlas-032/highs_results.json`) | 0.240 s (runs 0.222–0.270 s) |

On this instance **HiGHS proves the optimum about 5–6× faster than ATLAS** (6.3× recorded, 5.0× re-run). The certificate check takes 0.002 s.

## What ATLAS adds here

The certificate is a proof that **no ordering of the 40 items has a penalty below 319**. It is a cycle packing whose
weight equals 319, checkable without trusting the solver. A heuristic that reaches 321 cannot say how far it is
from the best possible; a MILP solver's "Optimal" status has to be taken on trust in the solver.

## Files

| File | Contents |
|---|---|
| `instance.json` | the 40 × 40 skew-symmetric integer matrix |
| `atlas_run.json` | greedy and alternative-greedy orders, ATLAS order, F, β, five timings, environment |
| `certificate.json` | ATLAS optimality certificate, in the `verify_certificate.py` format |
| `verification.json` | independent results: matrix regenerated, greedy recomputed, certificate verified, HiGHS runs, local-search context |
| `verify_case_study.py` | the independent Python verifier (shares no code with the TypeScript solver) |

## Reproduce

```bash
cd website && npm ci && npx vitest run --config bench/vitest.config.ts bench/casestudy40.bench.test.ts
cd ../benchmarks/case-study-40 && pip install highspy numpy && python3 verify_case_study.py
```

Verification passes when `verification.json` shows the following:
- `matrix_reproduced_independently: true`;
- greedy penalty 475;
- ATLAS F 1647 and β 319;
- `certificate.verified: true`;
- HiGHS `Optimal` with F 1647 and gap 0.
