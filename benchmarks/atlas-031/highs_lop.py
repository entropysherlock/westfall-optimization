"""HiGHS MILP baseline for the ATLAS-031 instances (same matrices, same 20 s limit, 1 thread).
Formulation: x_ij ∈ {0,1} (i<j) = 1 iff i precedes j; maximise Σ_{i<j} M_ij x_ij + M_ji (1−x_ij);
3-cycle constraints 0 ≤ x_ij + x_jk − x_ik ≤ 1 for all i<j<k.  Run: python3 highs_lop.py"""
import json, time, itertools, sys, os
import numpy as np, highspy
TL = float(os.environ.get("ATLAS_TL_S", 20))
here = os.path.dirname(os.path.abspath(__file__))
inst = json.load(open(os.path.join(here, "highs_instances.json")))
rows = []
for name, M in inst.items():
    M = np.array(M, dtype=float); n = len(M)
    idx = {}; c = []
    for i in range(n):
        for j in range(i + 1, n):
            idx[(i, j)] = len(c); c.append(M[i, j] - M[j, i])
    const = sum(M[j, i] for i in range(n) for j in range(i + 1, n))
    h = highspy.Highs(); h.setOptionValue("output_flag", False); h.setOptionValue("time_limit", TL); h.setOptionValue("threads", 1)
    nv = len(c)
    lp = highspy.HighsLp(); lp.num_col_ = nv; lp.col_cost_ = np.array(c); lp.col_lower_ = np.zeros(nv); lp.col_upper_ = np.ones(nv)
    lp.sense_ = highspy.ObjSense.kMaximize; lp.integrality_ = [highspy.HighsVarType.kInteger] * nv
    starts, inds, vals, lo, up = [0], [], [], [], []
    for i, j, k in itertools.combinations(range(n), 3):
        inds += [idx[(i, j)], idx[(j, k)], idx[(i, k)]]; vals += [1.0, 1.0, -1.0]; starts.append(len(inds)); lo.append(0.0); up.append(1.0)
    lp.num_row_ = len(lo); lp.row_lower_ = np.array(lo); lp.row_upper_ = np.array(up)
    lp.a_matrix_.format_ = highspy.MatrixFormat.kRowwise; lp.a_matrix_.start_ = np.array(starts); lp.a_matrix_.index_ = np.array(inds); lp.a_matrix_.value_ = np.array(vals)
    t0 = time.time(); h.passModel(lp); h.run(); dt = time.time() - t0
    st = h.modelStatusToString(h.getModelStatus()); info = h.getInfo()
    val = info.objective_function_value + const if info.primal_solution_status == 2 else None
    rows.append({"instance": name, "n": n, "status": st, "value": val, "bound": info.mip_dual_bound + const, "s": round(dt, 2)})
    print(rows[-1], flush=True)
json.dump(rows, open(os.path.join(here, "highs_results.json"), "w"), indent=1)
