"""BLX 2.0: adaptive portfolio around Block-Localized Exclusion (Discovery 019).

Routing rule (engineering heuristic, NOT a theorem; thresholds set on Discovery 018 instances and
evaluated out-of-sample in Discovery 019):
    n > 62                                   -> HiGHS MILP (DP states are 64-bit masks)
    zero-entry fraction >= 0.05, gap >= 0.03 -> HiGHS MILP for a short budget, then exclusion DP
    root packing gap < 0.03                  -> packing exclusion DP (SLDP)
    block tables close >= 30% of root gap    -> hybrid exclusion DP (BLX)
    otherwise                                -> packing exclusion DP (SLDP)
Every exact route returns status PROVED_OPTIMAL only when its search completed.
"""
from __future__ import annotations

import time

import numpy as np

from ..core import as_skew, score, total_weight
from ..solvers.exclusion_dp import sldp, triangle_packing
from ..solvers.local_search import best_of_restarts
from ..solvers.milp import milp_solve
from .hybrid import HybridBound, block_params, block_params2, segment

PROVED = "PROVED_OPTIMAL"
BEST = "BEST_FOUND"
UNRESOLVED = "UNRESOLVED"
REJECTED = "CERTIFICATE_REJECTED"


def features(A, order):
    n = A.shape[0]
    W = total_weight(A)
    L = score(A, order)
    b0 = (W - L) / 2
    pm, py = triangle_packing(A)
    P = float(py.sum())
    gap = (b0 - P) / max(b0, 1e-12)
    iu = np.triu_indices(n, 1)
    f = dict(n=n, incumbent=L, incumbent_backward=b0, packing_lb=P, gap=gap,
             zero_frac=float((A[iu] == 0).mean()), rho=0.0, blocks=None, H=None)
    if gap >= 0.03:
        best = None
        for bmax in (8, 12, 16, 20):
            blocks, _ = segment(A, order, bmax)
            par = block_params(A, blocks, 0.0)
            if best is None or par["log_state_bound"] < best[0]:
                best = (par["log_state_bound"], blocks)
        H = HybridBound(A, best[1])
        full = np.array([(1 << n) - 1], dtype=np.int64)
        Hlb = float(H.lower_beta(full)[0])
        f.update(rho=(Hlb - P) / max(b0 - P, 1e-12), blocks=best[1], H=H)
    return f


def _reconstruct(A, layers, fs):
    from ..certificates.make_cert import reconstruct
    return reconstruct(A, layers, fs)


def solve(A, mode: str = "auto", milp_time_limit: float = 30.0, restarts: int = 5, seed: int = 1,
          blocks=None, want_pairs: bool = False) -> dict:
    """Solve max_pi F_A(pi). Returns a dict with status in {PROVED_OPTIMAL, BEST_FOUND, UNRESOLVED}.

    mode: 'auto' (BLX 2.0 routing), 'blx' (hybrid exclusion DP), 'sldp' (packing exclusion DP),
          'milp' (HiGHS), 'subset_dp' (unrestricted exact DP, n <= 24), 'scc_milp' (SCC preprocessing + HiGHS).
    blocks: optional ordered partition (list of vertex lists) for mode 'blx'.
    """
    A = as_skew(A)
    n = A.shape[0]
    t0 = time.time()
    if mode == "scc_milp":
        # Avoid computing an unnecessary heuristic incumbent before the
        # decomposition: the fast preprocessing path must be end-to-end fast.
        from ..solvers.scc_milp import scc_milp_solve
        m = scc_milp_solve(A, time_limit=milp_time_limit)
        result = dict(n=n, mode=mode, route=mode, order=m["order"],
                      scc={k: m[k] for k in ("components", "component_sizes",
                                            "largest_component", "subsolver_calls")},
                      time=time.time() - t0)
        if m["proved"]:
            result.update(status=PROVED, OPT=m["OPT"], proved_by="scc_milp")
        else:
            result.update(status=UNRESOLVED, OPT=None, best_found=m["best_found"],
                          upper_bound=m["upper_bound"])
        return result

    order0 = best_of_restarts(A, restarts=restarts, seed=seed) if n > 1 else list(range(n))
    L = score(A, order0)
    out = dict(n=n, incumbent_order=order0, incumbent_score=L, mode=mode)

    if n <= 1:
        out.update(status=PROVED, route="trivial", order=list(range(n)), OPT=0.0, time=time.time() - t0)
        return out

    route = mode
    f = None
    if mode == "auto":
        if n > 62:
            route = "milp"
        else:
            f = features(A, order0)
            out["features"] = {k: f[k] for k in ("gap", "zero_frac", "rho", "packing_lb", "incumbent_backward")}
            if f["zero_frac"] >= 0.05 and f["gap"] >= 0.03:
                route = "milp->sldp"
            elif f["gap"] < 0.03:
                route = "sldp"
            elif f["rho"] >= 0.3:
                route = "blx"
            else:
                route = "sldp"
    out["route"] = route

    if route == "subset_dp":
        if n > 24:
            raise ValueError("subset_dp is limited to n <= 24")
        from ..solvers.subset_dp import subset_dp
        dp, _, _ = subset_dp(A)
        res = sldp(A, L, ub_kind="trivial", keep_layers=True, want_pairs=want_pairs)  # exact order reconstruction
        out.update(status=PROVED, OPT=float(dp[-1]), order=_reconstruct(A, res["layers"], res["fs"]))
        out["time"] = time.time() - t0
        return out

    if route.startswith("milp"):
        m = milp_solve(A, milp_time_limit if n <= 62 else max(milp_time_limit, 60.0))
        out["milp"] = {k: m[k] for k in ("time", "proved", "OPT", "upper_bound")}
        if m["proved"]:
            out.update(status=PROVED, OPT=m["OPT"], order=m["order"], proved_by="milp", time=time.time() - t0)
            return out
        if n > 62 or route == "milp":
            best = m["order"] if (m["order"] is not None and m["OPT"] is not None and m["OPT"] > L) else order0
            out.update(status=UNRESOLVED, OPT=None, order=best, best_found=score(A, best),
                       upper_bound=m["upper_bound"], time=time.time() - t0)
            return out
        route = "sldp"

    if n > 62:
        raise ValueError("exclusion DP supports n <= 62 (64-bit prefix masks)")
    H = None
    if route == "blx":
        if blocks is not None:
            H = HybridBound(A, [list(map(int, B)) for B in blocks])
            out["blocks"] = [list(map(int, B)) for B in blocks]
        else:
            if f is None:
                f = features(A, order0)
            if f["H"] is None:
                bl, _ = segment(A, order0, 12)
                f["H"], f["blocks"] = HybridBound(A, bl), bl
            H = f["H"]
            out["blocks"] = [list(map(int, B)) for B in f["blocks"]]
        par = block_params2(A, out["blocks"], 0.0)
        out["theorem_parameters"] = par
    res = sldp(A, L, ub_kind="packing", hybrid=H, keep_layers=True, want_pairs=want_pairs)
    order = _reconstruct(A, res["layers"], res["fs"])
    out.update(status=PROVED, OPT=float(res["OPT"]), order=order, proved_by=route,
               generated_states=int(res["generated"]), retained_states=int(res["survivors"]),
               excluded_states=int(res["generated"] - res["survivors"]))
    if want_pairs:
        out.update(certified_pairs=res["certified"], total_pairs=res["pairs"])
    out["_H"] = H
    out["time"] = time.time() - t0
    return out
