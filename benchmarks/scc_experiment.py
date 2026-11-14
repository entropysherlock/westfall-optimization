"""Exploratory, NOT independent LOLIB evidence: SCC preprocessing vs HiGHS.

Run: python benchmarks/scc_experiment.py
Reports full solver time including preprocessing/model building, and objective
agreement. Synthetic families are not a basis for commercial superiority.
"""
import json
import time

import numpy as np

from westfall_optimization.core import score
from westfall_optimization.solvers.milp import milp_solve
from westfall_optimization.solvers.scc_milp import scc_milp_solve


def make_instance(n, family, seed=28028, block=4):
    rng = np.random.default_rng(seed + n + (0 if family == "block" else 100))
    A = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            val = (float(rng.integers(1, 9)) if
                   family == "block" and i // block != j // block else
                   float(rng.integers(-7, 8)))
            A[i, j], A[j, i] = val, -val
    return A


def main():
    for n in (16, 24, 32):
        for family in ("block", "random"):
            A = make_instance(n, family, seed=(28028 - n if n <= 32 else 28028))
            results = {}
            for name, fn in (("SCC + HiGHS", scc_milp_solve), ("HiGHS", milp_solve)):
                t0 = time.perf_counter()
                r = fn(A, time_limit=15.0)
                dt = time.perf_counter() - t0
                valid = r["order"] is not None and sorted(r["order"]) == list(range(n))
                results[name] = dict(
                    seconds=round(dt, 5), proved=bool(r["proved"]), valid=valid,
                    score=score(A, r["order"]) if valid else None,
                    component_sizes=r.get("component_sizes"),
                )
            if all(q["proved"] for q in results.values()):
                assert abs(results["HiGHS"]["score"] -
                           results["SCC + HiGHS"]["score"]) < 1e-7
            print(json.dumps(dict(n=n, family=family, results=results)))


if __name__ == "__main__":
    main()
