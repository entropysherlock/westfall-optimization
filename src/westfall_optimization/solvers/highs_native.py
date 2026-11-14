"""Experimental direct HiGHS MIP backend for weighted linear ordering.

Uses the independently maintained HiGHS library via highspy, rather than
copying its C++ source into WESTFALL. Our specialization is the exact
pair-ordering model and the mandatory ordering/objective reconstruction.

IMPORTANT: "proved" means HiGHS reported an optimal MIP status and the
returned integer solution passes independent *primal* consistency checks.
It is NOT an independently certified exact-arithmetic optimality proof.
The separate ATLAS certificate verifier provides that stronger property.
This module does not claim to be a new MILP solver.

Install with: pip install -e ".[highs]"
"""
from __future__ import annotations

import time

import numpy as np
from scipy.sparse import coo_matrix

from ..core import as_skew, score, total_weight


def _model(A):
    """Construct the triangle-inequality binary MILP as HiGHS column CSC.

    z_ij = 1 iff i precedes j (i<j).
    For every i<j<k, 0 <= z_ij + z_jk - z_ik <= 1.
    Minimization objective c_ij = -2*A_ij, with offset -sum(A_ij).
    """
    n = len(A)
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
    idx = {pair: k for k, pair in enumerate(pairs)}
    rows, cols, vals = [], [], []
    r = 0
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                rows.extend((r, r, r))
                cols.extend((idx[i, j], idx[j, k], idx[i, k]))
                vals.extend((1.0, 1.0, -1.0))
                r += 1
    mat = coo_matrix((vals, (rows, cols)),
                     shape=(r, len(pairs)), dtype=float).tocsc()
    cost = np.array([-2.0 * float(A[i, j]) for i, j in pairs])
    offset = -sum(float(A[i, j]) for i, j in pairs)
    return pairs, mat, cost, offset


def _order_from_binary(z, pairs, n):
    """Return a permutation only for a fully transitive integral tournament."""
    if len(z) != len(pairs):
        return None
    a = np.asarray(z, dtype=float)
    if not np.all(np.isfinite(a)) or np.any(abs(a - np.rint(a)) > 1e-6):
        return None
    rounded = np.rint(a).astype(int)
    if np.any((rounded != 0) & (rounded != 1)):
        return None
    before = np.zeros(n, dtype=int)
    for (i, j), bit in zip(pairs, rounded):
        before[j if bit else i] += 1
    order = np.argsort(before, kind="stable").astype(int).tolist()
    if not np.array_equal(np.sort(before), np.arange(n)):
        return None
    pos = {v: k for k, v in enumerate(order)}
    if any((pos[i] < pos[j]) != bool(bit) for (i, j), bit in zip(pairs, rounded)):
        return None
    return order


def native_highs_solve(A, time_limit: float = 30.0) -> dict:
    """Solve a full-triangle linear-ordering MILP directly via highspy.

    The time_limit is shared with model assembly; it is not a hard wall-clock
    process limit. Returned status is never upgraded from an interrupted run.
    Numerical HiGHS bounds/statuses are not exact-arithmetic certificates.
    """
    A = as_skew(A)
    n = len(A)
    start = time.monotonic()
    fallback = list(range(n))
    fallback_score = score(A, fallback)
    if n < 2:
        return dict(proved=True, order=fallback, OPT=fallback_score,
                    best_found=fallback_score, upper_bound=fallback_score,
                    time=time.monotonic()-start, backend="highspy")

    try:
        import highspy
    except ImportError as exc:
        raise ImportError('Native HiGHS requires: pip install -e ".[highs]"') from exc

    if time_limit <= 0:
        return dict(proved=False, order=fallback, OPT=None,
                    best_found=fallback_score, upper_bound=total_weight(A),
                    time=time.monotonic()-start, backend="highspy")

    pairs, mat, c, offset = _model(A)
    remaining = float(time_limit) - (time.monotonic() - start)
    if remaining <= 0:
        return dict(proved=False, order=fallback, OPT=None,
                    best_found=fallback_score, upper_bound=total_weight(A),
                    time=time.monotonic()-start, backend="highspy")

    h = highspy.Highs()
    h.setOptionValue("output_flag", False)
    h.setOptionValue("threads", 1)
    h.setOptionValue("time_limit", remaining)
    h.setOptionValue("mip_rel_gap", 0.0)
    h.setOptionValue("mip_abs_gap", 0.0)

    lp = highspy.HighsLp()
    lp.num_col_ = len(pairs)
    lp.num_row_ = mat.shape[0]
    lp.col_cost_ = c
    lp.col_lower_ = np.zeros(len(pairs))
    lp.col_upper_ = np.ones(len(pairs))
    lp.row_lower_ = np.zeros(mat.shape[0])
    lp.row_upper_ = np.ones(mat.shape[0])
    lp.a_matrix_.format_ = highspy.MatrixFormat.kColwise
    lp.a_matrix_.start_ = mat.indptr.astype(np.int32)
    lp.a_matrix_.index_ = mat.indices.astype(np.int32)
    lp.a_matrix_.value_ = mat.data.astype(float)
    lp.integrality_ = [highspy.HighsVarType.kInteger] * len(pairs)

    if h.passModel(lp) != highspy.HighsStatus.kOk:
        raise RuntimeError("HiGHS rejected weighted-ordering model")
    h.run()
    status = h.getModelStatus()
    info = h.getInfo()
    raw_solution = h.getSolution()
    z = raw_solution.col_value if getattr(raw_solution, "value_valid", False) else []
    order = _order_from_binary(z, pairs, n)
    if order is None:
        order = fallback
    value = score(A, order)
    optimum_reported = status == highspy.HighsModelStatus.kOptimal
    if optimum_reported:
        # No optimal label without independently checked primal consistency.
        if not getattr(raw_solution, "value_valid", False):
            raise RuntimeError("HiGHS optimal status without an available primal solution")
        if _order_from_binary(z, pairs, n) is None:
            raise RuntimeError("HiGHS optimal status without a consistent total order")
        objective = -float(h.getObjectiveValue()) + offset
        if not np.isclose(value, objective, rtol=1e-8, atol=1e-6):
            raise RuntimeError("HiGHS objective does not match recomputed ordering")

    upper = total_weight(A)
    dual = getattr(info, "mip_dual_bound", None)
    if dual is not None and np.isfinite(dual):
        upper = min(upper, float(-dual + offset))
    upper = max(value, upper)
    return dict(proved=bool(optimum_reported), order=order,
                OPT=value if optimum_reported else None,
                best_found=value, upper_bound=value if optimum_reported else upper,
                time=time.monotonic()-start, backend="highspy",
                objective_verified=bool(optimum_reported),
                independent_optimality_certificate=False)
