#!/usr/bin/env python3
"""Mission 050 independent diagnostic: node-local directed-triangle packing LP.

Requires: pip install numpy scipy
Usage: python research/westfall-050/probe.py

This is NOT a certified solver and never declares optimality. SciPy/HiGHS
floating-point LP values are used only to compare bound strength.
Reconstructs the benchmark generator's mulberry32 and Fisher-Yates shuffle.
"""
from __future__ import annotations

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_matrix


def mulberry32(seed: int):
    a = seed & 0xFFFFFFFF
    while True:
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((a ^ (a >> 15)) * (a | 1)) & 0xFFFFFFFF
        t = (t ^ ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        yield ((t ^ (t >> 14)) & 0xFFFFFFFF) / (1 << 32)


def generate(kind: str, n: int, seed: int) -> np.ndarray:
    rnd = mulberry32(seed)
    m = np.zeros((n, n), dtype=np.int64)
    for i in range(n):
        for j in range(i + 1, n):
            if kind == "random-int":
                val = int(next(rnd) * 11) - 5
                val = val or 1
            elif kind == "ties":
                val = int(next(rnd) * 5) - 2
            else:
                raise ValueError(kind)
            m[i, j], m[j, i] = val, -val
    perm = list(range(n))
    for i in range(n - 1, 0, -1):
        j = int(next(rnd) * (i + 1))
        perm[i], perm[j] = perm[j], perm[i]
    return m[np.ix_(perm, perm)]


def directed_triangles(p: np.ndarray):
    n = len(p)
    triples = []
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if p[i, j] > 0 and p[j, k] > 0 and p[k, i] > 0:
                    triples.append((i, j, k))
                elif p[j, i] > 0 and p[k, j] > 0 and p[i, k] > 0:
                    triples.append((i, k, j))
    return triples


def packing_lp(p: np.ndarray):
    triples = directed_triangles(p)
    arc_ids = {(i, j): t for t, (i, j) in enumerate(
        (i, j) for i in range(len(p)) for j in range(len(p)) if p[i, j] > 0
    )}
    rows, cols = [], []
    for t, (i, j, k) in enumerate(triples):
        for e in ((i, j), (j, k), (k, i)):
            rows.append(arc_ids[e])
            cols.append(t)
    a = coo_matrix((np.ones(len(rows)), (rows, cols)),
                   shape=(len(arc_ids), len(triples))).tocsr()
    caps = np.array([p[i, j] for i, j in arc_ids], dtype=float)
    sol = linprog(-np.ones(len(triples)), A_ub=a, b_ub=caps,
                  bounds=(0, None), method="highs")
    if not sol.success:
        raise RuntimeError(sol.message)
    return -sol.fun, triples, sol.x


def greedy_repair(p: np.ndarray, triples, y, excluded: int):
    remaining = set(range(len(p))) - {excluded}
    cap = p.astype(float).copy()
    kept = 0.0
    for (i, j, k), w in zip(triples, y):
        if excluded in (i, j, k):
            continue
        kept += w
        for u, v in ((i, j), (j, k), (k, i)):
            cap[u, v] -= w
    # Fixed-order greedy augmentation; a valid capacity-feasible packing,
    # but typically much weaker than optimizing the residual triangle LP.
    gain = 0.0
    for i, j, k in triples:
        if excluded in (i, j, k):
            continue
        edges = ((i, j), (j, k), (k, i))
        w = min(cap[u, v] for u, v in edges)
        if w > 1e-8:
            gain += w
            for u, v in edges:
                cap[u, v] -= w
    return kept, gain


def run():
    for kind, seed in (("random-int", 1), ("random-int", 2), ("ties", 2)):
        p = np.maximum(generate(kind, 35, seed), 0)
        root, triples, y = packing_lp(p)
        print(f"\n{kind} n=35 seed={seed}: root triangle LP={root:.3f}; triangles={len(triples)}")
        print("deleted,restricted_root_LP,node_local_LP,improvement,greedy_repair_gain")
        for v in range(10):
            r = [i for i in range(35) if i != v]
            restricted, gain = greedy_repair(p, triples, y, v)
            local, _, _ = packing_lp(p[np.ix_(r, r)])
            print(f"{v},{restricted:.3f},{local:.3f},{local-restricted:.3f},{gain:.3f}")
    print("\nDIAGNOSTIC ONLY: floating-point LP solutions are not exact certificates.")


if __name__ == "__main__":
    run()
