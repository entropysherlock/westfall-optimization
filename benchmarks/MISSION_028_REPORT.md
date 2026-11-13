# Westfall Performance Mission 028 — SCC decomposition prototype

## Result and scope

Added an **exact classical graph preprocessing** technique for weighted linear ordering, exposed as `scc_milp`. The positive-weight digraph's strongly connected components are topologically ordered. Cross-component contributions can simultaneously achieve their individual maxima; separate exact HiGHS solves on the nontrivial components are sufficient to obtain a global optimum. A one-component graph falls back to the ordinary MILP formulation. **This is not a new Westfall theorem, not Lean verified, and does not demonstrate a commercial advantage.**

The change is intended to establish a measurable, self-contained performance engineering step without modifying the formal Lean research branch. It does **not** solve the main hard case of a strongly connected large LOP matrix.

## Exploratory local measurements

Environment: SciPy 1.17.0, NumPy 2.3.5, same Python process; each solver's total measured time included model construction. The local comparison used seeded synthetic matrices; the measurements below are preliminary single-run checks, not matched multicore benchmark claims.

| n | Family | SCC + HiGHS (s) | HiGHS (s) |
|--:|---|---:|---:|
| 16 | planted directional blocks | 0.0044 | 0.0090 |
| 16 | dense random | 0.0108 | 0.0063 |
| 24 | planted directional blocks | 0.0032 | 0.0318 |
| 24 | dense random | 0.0359 | 0.0301 |
| 32 | planted directional blocks | 0.0066 | 0.0648 |
| 32 | dense random | 4.8448 | 4.6541 |

These figures show the expected selective benefit: strong decomposability helps; dense strongly connected instances often slightly regress. There are no external LOLIB, Gurobi or specialized branch-and-cut results here. The new `benchmarks/scc_experiment.py` prints machine-readable results and reruns objective checks.

## Correctness validation

Locally checked all n=1..7 across three seeded families against exhaustive permutation enumeration, with every case passing. The repository's new `tests/test_scc_milp.py` also checks cyclic blocks, zeros, a single SCC, and an unproved zero-budget scenario. GitHub CI is the source of truth for final integrated tests.

## Critical limitations and next experiment

- Most dense, difficult ordering instances have a single large SCC. No improvement is expected for them.
- This mode uses HiGHS as its exact subsolver; it is not a standalone competing algorithm.
- Numerical MILP optimality statuses are solver-provided. Independently calculated objective values are checks, not full proof certificates.
- The routine's time limit is shared across MILP calls but preprocessing is not enforced by an external hard subprocess timeout.
- The original HiGHS implementation was not changed; its reconstruction and bound semantics deserve separate hardening.
- Research priority: profile and compile BLX/SLDP inner loops, test structural pruning/cut generation, and compare on held-out difficult instances and real manufacturing cost matrices.

## Reproduce

```bash
pip install -e ".[test]"
pytest -q tests/test_scc_milp.py
python benchmarks/scc_experiment.py
westfall-opt solve instance.json --mode scc_milp
```
