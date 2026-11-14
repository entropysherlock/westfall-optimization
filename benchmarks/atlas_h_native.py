#!/usr/bin/env python3
"""ATLAS-H reproducible *backend comparison* on three hard 35-item instances.

No precomputed numbers; reports actual solver outcomes and wall time.
Execute each backend in isolation, one after another:
    python benchmarks/atlas_h_native.py --time-limit 30 --out atlas_h_results.json

The direct highspy and SciPy modes both use HiGHS and the SAME full-triangle
linear-ordering MILP. This diagnoses Python integration overhead and solver
option effects, NOT a novel ATLAS algorithm or independent proof certificates.
The native backend sets mip_rel_gap=0 and mip_abs_gap=0; SciPy milp defaults
may differ. The best feasible ordering is recomputed from the original matrix.
"""
from __future__ import annotations

import argparse
import json
import time

import numpy as np

from westfall_optimization.core import score
from westfall_optimization.solvers.milp import milp_solve
from westfall_optimization.solvers.highs_native import native_highs_solve


def mulberry32(seed):
    a = seed & 0xffffffff
    while True:
        a = (a + 0x6d2b79f5) & 0xffffffff
        t = ((a ^ (a >> 15)) * (a | 1)) & 0xffffffff
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff)) & 0xffffffff
        yield ((t ^ (t >> 14)) & 0xffffffff) / 4294967296


def generate(kind, n, seed):
    rng = mulberry32(seed)
    a = np.zeros((n, n), dtype=np.int64)
    for i in range(n):
        for j in range(i + 1, n):
            if kind == "random-int":
                v = int(next(rng) * 11) - 5 or 1
            elif kind == "ties":
                v = int(next(rng) * 5) - 2
            else:
                raise ValueError(kind)
            a[i, j], a[j, i] = v, -v
    p = list(range(n))
    for i in range(n-1, 0, -1):
        j = int(next(rng) * (i+1))
        p[i], p[j] = p[j], p[i]
    return a[np.ix_(p, p)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--time-limit", type=float, default=30)
    ap.add_argument("--out", default="atlas_h_results.json")
    args = ap.parse_args()
    rows = []
    for kind, seed in (("random-int", 1), ("random-int", 2), ("ties", 2)):
        a = generate(kind, 35, seed)
        for name, solver in (("scipy-highs", milp_solve), ("native-highspy", native_highs_solve)):
            t0 = time.monotonic()
            result = solver(a, time_limit=args.time_limit)
            elapsed = time.monotonic() - t0
            ordering = result.get("order")
            valid = ordering is not None and sorted(ordering) == list(range(35))
            recomputed = score(a, ordering) if valid else None
            row = dict(instance=f"{kind} n=35 seed={seed}", backend=name,
                       wall_seconds=round(elapsed, 6),
                       claimed_optimal=bool(result["proved"]), valid_order=valid,
                       recomputed_objective=recomputed,
                       independently_certified=False)
            if result["proved"] and not valid:
                raise RuntimeError("solver claims optimum without valid order")
            if result["proved"] and not np.isclose(result["OPT"], recomputed, rtol=0, atol=1e-6):
                raise RuntimeError("solver optimum and recomputed score disagree")
            rows.append(row)
            print(row, flush=True)
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(dict(description="native HiGHS versus SciPy HiGHS, three seeded 35-item cases",
                           time_limit=args.time_limit, results=rows), f, indent=2)
    print("No status here constitutes an independently checkable optimality certificate.")


if __name__ == "__main__":
    main()
