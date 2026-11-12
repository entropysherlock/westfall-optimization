"""Insertion local search (incumbent construction). Heuristic: never claims optimality."""
from __future__ import annotations

import numpy as np

from ..core import score


def insertion_ls(A, perm, rng) -> list:
    """Repeatedly move single vertices to their best position until no strict improvement exists."""
    A = np.asarray(A)
    perm = list(perm)
    improved = True
    while improved:
        improved = False
        for v in rng.permutation(len(perm)):
            i = perm.index(v)
            rest = perm[:i] + perm[i + 1 :]
            col = np.array([A[u, v] for u in rest])
            pref = np.concatenate([[0.0], np.cumsum(col)])
            suf = np.concatenate([np.cumsum((-col)[::-1])[::-1], [0.0]])
            val = pref + suf
            k = int(np.argmax(val))
            if val[k] > val[i] + 1e-12:
                perm = rest[:k] + [int(v)] + rest[k:]
                improved = True
    return [int(x) for x in perm]


def best_of_restarts(A, restarts: int = 5, seed: int = 1) -> list:
    rng = np.random.default_rng(seed)
    n = np.asarray(A).shape[0]
    return max((insertion_ls(A, rng.permutation(n), rng) for _ in range(restarts)), key=lambda o: score(A, o))
