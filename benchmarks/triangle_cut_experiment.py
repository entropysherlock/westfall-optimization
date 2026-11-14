"""Exploratory adaptive-vs-full HiGHS comparison; synthetic data only.

Run: python benchmarks/triangle_cut_experiment.py
Do not infer enterprise performance or commercial superiority from these tests.
"""
import json
import time
import numpy as np
from westfall_optimization.core import score
from westfall_optimization.solvers.milp import milp_solve
from westfall_optimization.solvers.milp_cuts import adaptive_milp_solve, milp_cuts_solve


def instance(n, family, seed):
    rng = np.random.default_rng(seed)
    A = np.zeros((n, n))
    for i in range(n):
        for j in range(i+1, n):
            if family == "random":
                v = rng.integers(-6, 7)
            elif family == "near":
                v = (1 if rng.random() > .04 else -1)*rng.integers(1, 7)
            else:
                v = rng.integers(1, 6) if i // 4 != j // 4 else rng.integers(-6, 7)
            A[i, j], A[j, i] = v, -v
    return A


def main():
    for n, family in [(16,"random"),(16,"near"),(16,"block"),
                      (24,"random"),(24,"near"),(24,"block"),
                      (32,"near"),(32,"block"),(44,"near"),(44,"block"),
                      (60,"near"),(60,"block")]:
        A=instance(n,family,29029+n)
        observations={}
        for name,solver in [("full",milp_solve),("incremental",milp_cuts_solve),
                            ("adaptive",adaptive_milp_solve)]:
            t0=time.perf_counter()
            result=solver(A,time_limit=10)
            dt=time.perf_counter()-t0
            order=result.get("order")
            verified=order is not None and sorted(order)==list(range(n))
            observations[name]=dict(seconds=round(dt,5),proved=bool(result["proved"]),
                                    objective=score(A,order) if verified else None,
                                    rounds=result.get("rounds"),
                                    cuts=result.get("cuts_added"),
                                    strategy=result.get("strategy"))
        certified=[r["objective"] for r in observations.values() if r["proved"]]
        if len(certified)>1:
            assert max(certified)-min(certified)<1e-7
        print(json.dumps(dict(n=n,family=family,solvers=observations)),flush=True)


if __name__=="__main__":
    main()
