# WESTFALL Mission 050 — Dynamic residual bounds: diagnostic checkpoint

**Date:** 2026-11-14  
**Scope:** Independent mathematical/LP experiment; **no production solver changes and no claim of 88/88**.  
**Target:** Three ATLAS-032 failures: `random-int n=35 s=1`, `random-int n=35 s=2`, `ties n=35 s=2`.

## Baseline to beat

Published ATLAS-032, 30 seconds and 4 million states per instance:

| Instance | ATLAS incumbent β | Reported valid LB | Gap |
|---|---:|---:|---:|
| random-int n=35 s=1 | 510 | 484 | 26 |
| random-int n=35 s=2 | 516 | 491 | 25 |
| ties n=35 s=2 | 218 | 207 | 11 |

HiGHS found a **better incumbent, 509**, for the first random-int case, but also timed out.

## Experiment 1 — Optimize the triangle packing anew on residual sets

Let `P_uv = max(A_uv,0)`. A nonnegative directed-cycle packing with load at most `P_e` on each arc has total mass no larger than the backward penalty of any ordering. For `R = V \ S`, the restriction of a root packing to cycles wholly in `R` is admissible, but need not be the strongest feasible packing on `R`.

We regenerated the three 35-item matrices from an **independent Python translation** of the seeded mulberry32/Fisher-Yates generator in `website/src/lib/engine.ts`. SciPy HiGHS solved the triangle packing LP at the root and for each induced 34-vertex residual graph obtained by deleting vertices 0 through 9.

| Instance | Optimized root triangle-LP objective | Improvement from recomputing after removing one vertex (min–max across v=0..9) |
|---|---:|---:|
| random-int s=1 | 487.667 | **5.00–17.60** |
| random-int s=2 | 495.667 | **3.00–17.83** |
| ties s=2 | 208.000 | **1.33–7.33** |

These are **floating-point LP diagnostic values**, not certified integer lower bounds. They should not be substituted directly into ATLAS exact pruning without an exact rational-to-safe-integer feasibility check. Root LP objectives differ from the repository's published `bestBoundBeta` because this probe solves the triangle packing LP to an LP optimum rather than running the approximate Garg–Könemann implementation used for the reported bound.

**Interpretation:** Significant strengthening is possible on residual subproblems without adding new constraints. The open challenge is recovering it at low amortized cost over the millions of search states.

## Experiment 2 — Naive residual repair is insufficient

Starting from the root LP solution restricted to each 34-vertex induced graph, we tried one pass of greedy augmentation over all remaining directed triangles in fixed order.

Across the first ten single-vertex deletions, nonzero greedy augmentation occurred only in:

- random-int s=1: 1/10, at most 1.24 units;
- random-int s=2: 3/10, at most 1.53 units;
- ties s=2: 3/10, at most 0.60 units.

Most samples gained **zero**, even when a new LP solved on that subproblem improved by 5–18 units. A useful method therefore needs some form of **reallocation/augmenting exchanges or reoptimization**, not merely adding cycles to the residual capacity of a fixed global packing.

## Experiment 3 — Two tempting alternatives did not help

1. **Triangle + directed 4-cycle LP** (all enumerated 3- and 4-cycles) reproduced precisely the same objective as the triangle-only LP on all three 35-item instances: `487.667`, `495.667`, and `208.000`. Simply adding 4-cycles is not promising on this sample.
2. **Seven-item exact residual blocks:** subtracting an optimal triangle packing leaves residual nonnegative arc capacities. Exact dynamic programming on disjoint blocks of size seven, over 100 randomly sampled partitions, added **zero** to the LP bound on all three instances. This is a negative result for these choices of block size and partitioning, not a general impossibility theorem.

## Valid inequalities for future integration

For any feasible directed-cycle packing `y` on residual graph `R`, with arc capacities `P`, and for every partition `B_1,...,B_m` of `R`, write `r_e = P_e - Σ_{C∋e} y_C >= 0`. Then

```
OPT_beta(R; P) >= Σ_C y_C + Σ_i OPT_beta(B_i; r).
```

**Proof:** For every order, the `y` contribution to its backward arc mass is at least `Σ_C y_C`, since each cycle has a backward arc and packing loads satisfy capacities. The remaining `r` contribution is at least the sum of optimum backward penalties on disjoint induced blocks, ignoring the nonnegative crossing penalties. Taking the minimum over orders proves the inequality. The bound is valid, but the particular 7-vertex probe above found no added value.

## What to implement next — not yet done

**Priority A — Incremental primal-dual packing repair.** Reallocate existing cycle weights when a vertex disappears, maintaining arc-capacity feasibility at every step. Experiment with augmenting-cycle exchanges or a warm-started packing LP on *selected* high-impact residual sets. Cache results by residual vertex bitmask.

**Priority B — Selective exact inequalities.** If warm-started packing remains insufficient, study stronger *linear ordering polytope* inequalities (e.g. fence or Möbius-ladder families), including separation cost and exact certificate compatibility. Check literature first.

**Priority C — Better incumbent.** Reproduce the 509 HiGHS incumbent for random-int seed 1 and assess whether enhanced local search can find it before proving optimality.

**Exit criterion:** Full 88-instance comparison under the **original** 30-second/4-million-state rules, exact independent certificates for every OPTIMAL result, no regression masking, and raw logs for all failures.

### Reproduce

```bash
python -m pip install numpy scipy
python research/westfall-050/probe.py
```

The tracked script reproduces Experiment 1 and the greedy-repair part of Experiment 2; the experiments in §3 were additional exploratory Python runs, not included in that script yet. No claim is made that this branch constitutes a new theorem, a solved instance, an implemented ATLAS change, or a peer-reviewed contribution.
