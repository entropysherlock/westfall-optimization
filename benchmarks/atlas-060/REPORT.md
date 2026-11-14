# ATLAS-060 on LOLIB — experimental results

**Author:** Caleb J Westfall · **Date:** 14 November 2026 · **Status:** EXPERIMENTAL prototype, not the production solver. ATLAS-032 is unchanged.

The ATLAS-060 source code is not published. This folder contains its raw per-instance results and the outcome of independent checks.

## What ATLAS-060 is
- An exact branch-and-bound method on pair orientations. Every pruning step is justified by an **integer** Lagrangian bound from the standard 3-dicycle relaxation of the linear ordering polytope (weak duality).
- The open-source HiGHS LP solver is used **as an LP engine only**: it proposes multipliers, and the certificate is then checked in exact integer arithmetic. A wrong floating-point answer can weaken a bound but cannot create a false proof.
- When the root relaxation is far from integral (dense random instances), ATLAS-060 hands the instance to the unchanged ATLAS-032 for the remaining time.
- None of the ingredients is new: 3-dicycle relaxation (Grötschel–Jünger–Reinelt 1984), LP cutting-plane exact LOP (Mitchell–Borchers), safe LP bounds (Neumaier–Shcherbina 2004), reduced-cost fixing. No novelty is claimed.

## Protocol
Identical to [`../lolib-full/REPORT.md`](../lolib-full/REPORT.md): 232 instances (IO, SGB, RandB, MB, Spec), one thread, 30 s wall clock including preparation, process killed at 33 s, solved = proved optimal within 30 s. Machine: 2 vCPU Intel Xeon @ 2.10 GHz, 8 GB. Each run alone on one pinned core.

ATLAS-032 was rerun on the same machine the same day ([`../lolib-full/results/atlas.repro_2026-11-14.jsonl`](../lolib-full/results/atlas.repro_2026-11-14.jsonl)). This machine is about 30 % slower than the one used for the published run: ATLAS-032 needs 37 s on MB/N-r100c2 here against 27.9 s published, so the reproduction misses the five MB n = 100 proofs.

## Results (proved optimal within 30 s)
| Family | n | ATLAS-032 published | ATLAS-032 rerun | ATLAS-060 | HiGHS | SCIP |
|---|---|---|---|---|---|---|
| IO | 50 | 50 | 50 | 50 | 50 | 50 |
| SGB | 25 | 0 | 0 | 25 | 12 | 0 |
| RandB | 90 | 21 | 21 | 21 | 15 | 15 |
| MB | 30 | 5 | 0 | 23 | 0 | 0 |
| Spec | 37 | 13 | 13 | 14 | 13 | 11 |
| **All** | 232 | **89** | **84** | **133** | **90** | **76** |

Shifted geometric mean time (10 s shift, unsolved = 30 s): ATLAS-032 rerun 15.92 s, ATLAS-060 10.52 s. IO on the same machine: 6.25× faster (geometric mean; worst instance 0.93×).

- No instance proved by ATLAS-032 (published or rerun) is unproved by ATLAS-060. Every instance HiGHS proved is proved by ATLAS-060.
- 31 instances (13 SGB, 18 MB) are proved by ATLAS-060 and by neither published ATLAS-032 nor HiGHS.
- **RandB: no gain.** The 3-dicycle relaxation itself leaves gaps of 244–1 990 on the unsolved RandB instances.
- **Regression (feasible solutions only):** on 12 unsolved instances (11 RandB, Spec/N-econ68) the returned ordering is worse than ATLAS-032's on this machine, because the ATLAS-032 fallback is stopped before it reports its incumbent. No proof is affected.

## Verification ([`results/verification.jsonl`](results/verification.jsonl))
- 133/133 proved orderings: valid permutation, objective recomputed from the raw file, equal to the published best-known value.
- 115/115 ATLAS-060 certificates accepted by an independent checker (exact integers, no LP solver, no code shared with the solver). The other 18 proofs come from the unchanged ATLAS-032 fallback.
- Falsification: 840 random instances (n = 3–15; ties, zeros, 10⁷ weights, tournaments), half with deliberately corrupted multipliers: 0 disagreements with exhaustive dynamic programming, 0 rejected certificates.
- The checker and certificates are not yet published, so the certificate check cannot be independently repeated from this repository.

## Not yet done
Synthetic 85/88 benchmark not run; not independently replicated; prototype is Python, not integrated into ATLAS.
