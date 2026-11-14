# ATLAS-H — direct native HiGHS integration (experimental)

**Purpose:** Establish a reliable, isolated reference implementation using the MIT-licensed upstream HiGHS library through its official Python binding `highspy`. This avoids copying and maintaining the entire HiGHS C++ source tree.

This is **NOT** a new ATLAS solver or a measured improvement over HiGHS. The Python package already uses HiGHS through SciPy in `milp.py`, `milp_cuts.py`, and `scc_milp.py`. The new path removes the SciPy MILP wrapper and provides explicit zero-gap settings, direct engine information, and independently checked ordering reconstruction.

## Installation and usage

```bash
pip install -e ".[test,highs]"
westfall-opt solve instance.json --mode native_highs --milp-time-limit 30
python -m pytest -q tests/test_highs_native.py
python benchmarks/atlas_h_native.py --time-limit 30 --out atlas_h_results.json
```

The benchmark runs the same full-triangle binary linear-ordering formulation through the existing SciPy HiGHS interface and through native highspy. It regenerates three difficult 35-item instances using a Python port of the browser benchmark's seeded generator. Runs are sequential, never concurrent; it prints and exports actual measured results, not expected speedups. Comparisons should record CPU, RAM, version, solver settings, and five or more repetitions when making speed claims.

## Scientific integrity

- `PROVED_OPTIMAL` in the API means **HiGHS reported optimal MILP status**, and our code independently recomputed the feasible ordering and objective. This is not a formal or independently checkable proof of exact optimality; the solver uses floating-point arithmetic.
- `independent_optimality_certificate=False` is reported explicitly.
- ATLAS browser source and the existing 88-instance leaderboard benchmark remain unchanged.
- The unmodified HiGHS C++ solver stays an external library; this repository does not contain a vendored copy, and therefore does not claim to have invented its methods.
- The original ATLAS-032 85/88 achievement is a separate TypeScript exact-certification benchmark. This backend alone does not advance that number.
- Numerical tolerances and model-building overhead can affect comparisons. The existing SciPy baseline has different exposed gap-control semantics; interpret outcome differences accordingly.

## Next optimization stage

1. Capture paired data on the three failures and held-out matrices.
2. Profile model construction versus MIP solution time, memory, and root dual bounds.
3. Feed the best verified ATLAS heuristic incumbents to HiGHS where supported, and verify their objective convention before enabling the warm start.
4. Test incremental HiGHS relaxation updates on the residual sets identified by Mission 050.
5. Build an exact-arithmetic certificate bridge for any bound used to prune ATLAS's native exact search.

**Do not label this branch a breakthrough or claim 88/88 until the complete original test suite has been independently certified.**

## License

HiGHS upstream is MIT licensed: https://github.com/ERGO-Code/HiGHS . Its own third-party notices apply to any upstream code redistribution. WESTFALL remains GPL-3.0; keep upstream notices when distributing binaries or copies.
