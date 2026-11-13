"""Adaptive triangle-cut MILP for skew-symmetric linear ordering.

This uses a standard cutting-plane approach: initially omit all ordering
triangle inequalities, solve an exact binary MILP relaxation, and add violated
triangle inequalities until the integer relation is transitive. At that point
a globally optimal result of the relaxation certifies the full LOP optimum.

The choice of cutting-plane vs. full triangle MILP is a *heuristic*, not a new
algorithmic theorem. This code is not covered by the Lean AutoCut proof.
"""
from __future__ import annotations

import time
import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix

from ..core import as_skew, score, total_weight
from .milp import milp_solve


def _ordered_from_binary(z: np.ndarray, n: int, pairs: list[tuple[int, int]]) -> list[int]:
    """Get a valid permutation even if a relaxation incumbent contains cycles."""
    before = np.zeros(n, dtype=int)
    for k, (i, j) in enumerate(pairs):
        if z[k]:
            before[j] += 1
        else:
            before[i] += 1
    return np.argsort(before, kind="stable").astype(int).tolist()


def _violations(z, n, idx, cap=None):
    """Find directed 3-cycles: z_ij+z_jk-z_ik must lie in {0,1}."""
    bad = []
    for i in range(n):
        for j in range(i + 1, n):
            x = int(z[idx[(i, j)]])
            for k in range(j + 1, n):
                t = x + int(z[idx[(j, k)]]) - int(z[idx[(i, k)]])
                if t < 0 or t > 1:
                    bad.append((i, j, k))
                    if cap is not None and len(bad) >= cap:
                        return bad
    return bad


def preference_cycle_fraction(A) -> float:
    """Cheap exact-sign diagnostic, not a formal prediction of runtime."""
    A = as_skew(A)
    n = len(A)
    if n < 3:
        return 0.0
    z = (A[np.triu_indices(n, 1)] > 0).astype(int)
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
    idx = {pair: k for k, pair in enumerate(pairs)}
    return len(_violations(z, n, idx)) / (n * (n - 1) * (n - 2) / 6)


def milp_cuts_solve(A, time_limit: float = 60.0, max_rounds: int = 100,
                    cut_batch: int = 5000) -> dict:
    """Repeated HiGHS MILP with dynamic triangle inequalities.

    A solution is marked proved only if the MILP optimum is proven and *all*
    triangle inequalities hold. Other outcomes carry a feasible ordering
    and a safe relaxation-based or trivial upper bound.
    """
    A = as_skew(A)
    n = len(A)
    start = time.monotonic()
    if n < 2:
        return dict(time=time.monotonic() - start, proved=True,
                    order=list(range(n)), OPT=0.0, best_found=0.0,
                    upper_bound=0.0, rounds=0, cuts_added=0,
                    candidate_cycles=0)
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
    idx = {pair: k for k, pair in enumerate(pairs)}
    m = len(pairs)
    coeff = np.asarray([-2 * A[i, j] for i, j in pairs], dtype=float)
    offset = -sum(float(A[i, j]) for i, j in pairs)
    best = list(range(n))
    best_value = score(A, best)
    upper = total_weight(A)
    added: set[tuple[int, int, int]] = set()
    rows: list[int] = []
    cols: list[int] = []
    vals: list[float] = []
    rounds = 0
    remaining_cycles = 0

    for _ in range(max_rounds):
        remaining = time_limit - (time.monotonic() - start)
        if remaining <= 0:
            break
        if added:
            mat = coo_matrix((vals, (rows, cols)), shape=(len(added), m)).tocsr()
            constraints = LinearConstraint(mat, 0, 1)
        else:
            constraints = ()
        result = milp(
            coeff, integrality=np.ones(m, dtype=int), bounds=Bounds(0, 1),
            constraints=constraints, options={"time_limit":remaining, "disp":False}
        )
        rounds += 1
        dual = getattr(result, "mip_dual_bound", None)
        if dual is not None and np.isfinite(dual):
            upper = min(upper, float(-dual + offset))
        if result.x is None:
            break
        if np.max(np.abs(result.x - np.round(result.x))) > 1e-5:
            break
        z = np.round(result.x).astype(int)
        candidate = _ordered_from_binary(z, n, pairs)
        candidate_value = score(A, candidate)
        if candidate_value > best_value:
            best, best_value = candidate, candidate_value
        bad = _violations(z, n, idx)
        remaining_cycles = len(bad)
        if not bad:
            if result.status == 0:
                model_value = -float(result.fun) + offset
                if abs(candidate_value - model_value) > 1e-6 * max(1, abs(model_value)):
                    raise AssertionError("MILP objective disagrees with returned ordering")
                return dict(time=time.monotonic() - start, proved=True,
                            order=candidate, OPT=candidate_value,
                            best_found=candidate_value, upper_bound=candidate_value,
                            rounds=rounds, cuts_added=len(added),
                            candidate_cycles=0)
            break
        new_cuts = 0
        for triangle in bad:
            if triangle in added:
                continue
            added.add(triangle)
            i, j, k = triangle
            row = len(added) - 1
            rows.extend((row, row, row))
            cols.extend((idx[(i, j)], idx[(j, k)], idx[(i, k)]))
            vals.extend((1.0, 1.0, -1.0))
            new_cuts += 1
            if new_cuts >= cut_batch:
                break
        if new_cuts == 0:
            break

    return dict(time=time.monotonic() - start, proved=False,
                order=best, OPT=None, best_found=best_value,
                upper_bound=max(upper, best_value),
                rounds=rounds, cuts_added=len(added),
                candidate_cycles=remaining_cycles)


def adaptive_milp_solve(A, time_limit: float = 60.0,
                        cycle_fraction_threshold: float = 0.08) -> dict:
    """Use cutting-plane MILP only for nearly transitively oriented instances.

    Density threshold is a transparent engineering heuristic, not trained
    on LOLIB. Fallback to full MILP for graphs with many directed triangles.
    """
    start = time.monotonic()
    A = as_skew(A)
    fraction = preference_cycle_fraction(A)
    if fraction > cycle_fraction_threshold:
        result = milp_solve(A, time_limit=max(0, time_limit - (time.monotonic() - start)))
        result["strategy"] = "full_triangle"
    else:
        result = milp_cuts_solve(A, time_limit=max(0, time_limit - (time.monotonic() - start)))
        result["strategy"] = "incremental_triangle"
    result["preference_cycle_fraction"] = fraction
    result["time"] = time.monotonic() - start
    return result
