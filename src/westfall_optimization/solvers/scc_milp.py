"""Classical exact SCC decomposition for skew-weighted linear ordering.

Build the positive-preference digraph (u -> v iff A[u,v] > 0).
Its strongly connected components form an acyclic condensation graph. A
topological component ordering puts *all* positive cross-component pairs
forward (zero pairs do not matter), maximizing their independent
contribution. Thus the optimum is a fixed cross score plus the optima of
the induced component subproblems.

This is a classical preprocessing observation, NOT a new theorem and NOT
an implementation covered by Westfall's Lean proof. Dense tournaments
can have one SCC, giving no benefit. No tolerance is used in defining
positive arcs: exact skew input signs determine the decomposition.
"""
from __future__ import annotations

import heapq
import time

import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import connected_components

from ..core import as_skew, score, total_weight
from .milp import milp_solve


def _scc_partition(A: np.ndarray) -> list[list[int]]:
    """Return SCCs in a deterministic topological order."""
    n = len(A)
    if n == 0:
        return []
    _, labels = connected_components(csr_matrix(A > 0), directed=True, connection="strong")
    by_label: dict[int, list[int]] = {}
    for v, label in enumerate(labels):
        by_label.setdefault(int(label), []).append(v)
    components = list(by_label.values())
    belong = [0] * n
    for i, comp in enumerate(components):
        for v in comp:
            belong[v] = i

    dag = [set() for _ in components]
    indeg = [0] * len(components)
    for v in range(n):
        for w in np.flatnonzero(A[v] > 0):
            x, y = belong[v], belong[int(w)]
            if x != y and y not in dag[x]:
                dag[x].add(y)
                indeg[y] += 1
    ready = [(components[i][0], i) for i, d in enumerate(indeg) if d == 0]
    heapq.heapify(ready)
    ordered = []
    while ready:
        _, i = heapq.heappop(ready)
        ordered.append(components[i])
        for j in dag[i]:
            indeg[j] -= 1
            if indeg[j] == 0:
                heapq.heappush(ready, (components[j][0], j))
    if len(ordered) != len(components):
        raise AssertionError("SCC condensation must be acyclic")
    return ordered


def scc_milp_solve(A, time_limit: float = 60.0) -> dict:
    """Run HiGHS on each SCC; return best feasible ordering on interruption.

    Time limit is the total budget assigned to MILP calls, not an external
    hard timeout. Only all-proved components give 'proved=True'.
    Numerical MILP dual bounds are not independent proof certificates.
    """
    t0 = time.monotonic()
    A = as_skew(A)
    n = len(A)
    components = _scc_partition(A)
    order: list[int] = []
    proved = True
    upper_internal = 0.0
    calls = 0

    for comp in components:
        if len(comp) == 1:
            order.extend(comp)
            continue
        sub = A[np.ix_(comp, comp)]
        remaining = max(0.0, float(time_limit) - (time.monotonic() - t0))
        if remaining == 0:
            proved = False
            order.extend(comp)
            upper_internal += total_weight(sub)
            continue
        calls += 1
        result = milp_solve(sub, time_limit=remaining)
        loc = result.get("order")
        valid = loc is not None and sorted(loc) == list(range(len(comp)))
        if not valid:
            loc = list(range(len(comp)))
        order.extend(comp[int(i)] for i in loc)
        if result["proved"] and valid:
            upper_internal += score(sub, loc)
        else:
            proved = False
            dual = result.get("upper_bound")
            upper_internal += min(total_weight(sub), float(dual)) if dual is not None else total_weight(sub)

    if sorted(order) != list(range(n)):
        raise AssertionError("Reconstructed ordering is not a permutation")
    value = score(A, order)
    cross = sum(float(A[i, j]) for k, comp in enumerate(components)
                for later in components[k + 1:] for i in comp for j in later)
    upper = max(value, cross + upper_internal)
    return dict(
        time=time.monotonic() - t0, proved=proved, order=order,
        OPT=value if proved else None, best_found=value, upper_bound=upper,
        components=len(components),
        component_sizes=[len(comp) for comp in components],
        largest_component=max((len(comp) for comp in components), default=0),
        subsolver_calls=calls, cross_score=cross,
    )
