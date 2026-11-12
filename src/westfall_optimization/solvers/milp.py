"""Generic baseline: the full triangle-inequality MILP solved by HiGHS (via SciPy).

Variables z_ij (i<j) = 1 iff i precedes j; constraints 0 <= z_ij + z_jk - z_ik <= 1 for all i<j<k.
This is a *generic* formulation, not a specialised LOP branch-and-cut code.
"""
from __future__ import annotations

import time

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import lil_matrix


def milp_solve(A, time_limit: float = 60.0) -> dict:
    A = np.asarray(A)
    n = A.shape[0]
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
    idx = {p: k for k, p in enumerate(pairs)}
    M = lil_matrix((n * (n - 1) * (n - 2) // 6, len(pairs)))
    r = 0
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                M[r, idx[(i, j)]] = 1
                M[r, idx[(j, k)]] = 1
                M[r, idx[(i, k)]] = -1
                r += 1
    c = np.array([-2 * A[i, j] for i, j in pairs])
    const = -sum(A[i, j] for i, j in pairs)
    t0 = time.time()
    res = milp(
        c,
        constraints=LinearConstraint(M.tocsr(), 0, 1) if r else (),
        integrality=np.ones(len(pairs)),
        bounds=Bounds(0, 1),
        options=dict(time_limit=time_limit, disp=False),
    )
    dt = time.time() - t0
    out = dict(time=dt, proved=bool(res.status == 0), order=None, OPT=None, upper_bound=None)
    if res.x is not None:
        z = np.round(res.x).astype(int)
        # position of v = number of vertices preceding it
        before = np.zeros(n, int)
        for (i, j), k in idx.items():
            if z[k]:
                before[j] += 1
            else:
                before[i] += 1
        order = [int(v) for v in np.argsort(before, kind="stable")]
        out["order"] = order
        out["OPT"] = float(-res.fun + const)
    if getattr(res, "mip_dual_bound", None) is not None and np.isfinite(res.mip_dual_bound):
        out["upper_bound"] = float(-res.mip_dual_bound + const)
    return out
