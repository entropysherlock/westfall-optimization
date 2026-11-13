# Mission 029 — Adaptive triangle-cut HiGHS experiment

## Result

Implemented a conventional **incremental triangle-inequality** exact MILP solver
and a transparent **adaptive router** for weighted linear ordering. Starting from
a binary pairwise-precedence relaxation, the solver adds violated triangle
constraints, reruns HiGHS, and declares global optimality only after the
relaxation is solved to global optimality and the returned tournament has **no
violated triangle inequalities**. Its objective is checked from the permutation.

This is standard cutting-plane engineering, **not a new theorem**, **not Lean
verified**, and **not a Westfall-specific competitive advantage over HiGHS**.
Both approaches use the HiGHS optimizer. It is also **not a specialized LOP
branch-and-cut solver**, because the cuts are added between external MILP calls.

## Preliminary local measurements

Environment: Python, NumPy 2.3.5, SciPy 1.17.0; single-run exploratory synthetic
tests, end-to-end per-solver wall time. Values in seconds, not controlled
statistical benchmarks. Baseline is the repository's full triangle MILP.
The 32-vertex random case exceeded the 10s limit for both approaches.

| Size | Family | Incremental | Full MILP | Interpretation |
|---:|---|---:|---:|---|
| 16 | random | 0.009 | 0.006 | Loss |
| 16 | near-transitive | 0.003 | 0.004 | Small win |
| 24 | random | 0.279 | 0.034 | Severe loss |
| 24 | near-transitive | 0.006 | 0.013 | Win |
| 24 | block | 0.008 | 0.012 | Win |
| 32 | random | >10 | >10 | Both unresolved |
| 32 | near-transitive | 0.011 | 0.025 | Win |
| 32 | block | 0.010 | 0.029 | Win |
| 44 | near-transitive | 0.030 | 0.134 | Win |
| 44 | block | 0.016 | 0.083 | Win |
| 60 | near-transitive | 0.044 | 0.220 | Win |
| 60 | block | 0.046 | 0.177 | Win |

All completed cases with certified optimal values agreed between formulations.
An exhaustive independent oracle on n=1..7 across four seeded input families
passed on all 28 cases before repository integration.

## Adaptive routing

A simple observable statistic, the fraction of orientation-inconsistent
triangles in the preferred pairwise directions, chooses incremental cuts if
at most 8% of triples are inconsistent; otherwise it chooses the baseline
full triangle MILP. This threshold is **not scientifically tuned** and is
not a claim of robust generalization. The route has overhead from its scan;
its payoff must be measured on held-out inputs.

The main finding is that **we can avoid paying dense-random cutting-plane
overhead when the initial preference orientation signals that the problem
has many directed cycles**.

## Limitations and next milestone

- No Gurobi or specialized LOP solver was available; no LOLIB run is claimed.
- Strongly connected near-transitive instances can benefit, but more varied,
  held-out realistic inputs are essential.
- The algorithm uses repeated SciPy MILP calls and rebuilds the constraint
  matrix; a solver-native callback could perform better.
- Multi-run statistical analysis, core counts, memory measurements,
  performance profiles, and total optimization budgets remain to be done.
- The selection feature is heuristic and does not carry any formal guarantee
  about superior performance.
- The method does not change the AutoCut arithmetic-operation proof or its
  guarantees.
- Next: run original LOLIB and harder XLOLIB held-out studies, independently
  verify objectives, then profile BLX search state counts and branch-and-cut
  performance on the hard structural regime.

## Reproduce

```bash
python -m pip install -e ".[test]"
python -m pytest -q tests/test_milp_cuts.py
python benchmarks/triangle_cut_experiment.py
westfall-opt solve instance.json --mode adaptive_milp
```
