"""HiGHS 1.16 baselines on the ATLAS-032 instances (instances.json), 1 thread, same 30 s limit.
EXACT mode (default): mip_rel_gap = 0 so "Optimal" means exactly optimal; HIGHS_DEFAULT_GAP=1 reproduces the
default-tolerance run (mip_rel_gap = 1e-4), which labelled a suboptimal N-stabu70 solution "Optimal".
F: MILP with all 3-cycle constraints; reports end-to-end time (model build + solve) and solve-only time.
D(reference only): root LP relaxation value (external LP; bound-strength comparison, not a WESTFALL result).
Output: highs_results.json.  Run: python3 highs_032.py   (env ATLAS_TL_S, default 30)"""
import json, time, itertools, os
import numpy as np, highspy
TL = float(os.environ.get("ATLAS_TL_S", 30))
here = os.path.dirname(os.path.abspath(__file__))
inst = json.load(open(os.path.join(here, "instances.json")))
done = {}
DEFAULT_GAP = os.environ.get("HIGHS_DEFAULT_GAP") == "1"
outp = os.path.join(here, "highs_results_defaultgap.json" if DEFAULT_GAP else "highs_results.json")
if os.path.exists(outp): done = {r["name"]: r for r in json.load(open(outp))}
def build(M):
    n = len(M); idx = {}; c = []
    for i in range(n):
        for j in range(i + 1, n): idx[(i, j)] = len(c); c.append(M[i][j] - M[j][i])
    const = sum(M[j][i] for i in range(n) for j in range(i + 1, n))
    st, ind, val = [0], [], []
    for i, j, k in itertools.combinations(range(n), 3):
        ind += [idx[(i, j)], idx[(j, k)], idx[(i, k)]]; val += [1., 1., -1.]; st.append(len(ind))
    lp = highspy.HighsLp(); nv = len(c); lp.num_col_ = nv; lp.col_cost_ = np.array(c, float)
    lp.col_lower_ = np.zeros(nv); lp.col_upper_ = np.ones(nv); lp.sense_ = highspy.ObjSense.kMaximize
    m = len(st) - 1; lp.num_row_ = m; lp.row_lower_ = np.zeros(m); lp.row_upper_ = np.ones(m)
    lp.a_matrix_.format_ = highspy.MatrixFormat.kRowwise; lp.a_matrix_.start_ = np.array(st); lp.a_matrix_.index_ = np.array(ind); lp.a_matrix_.value_ = np.array(val)
    return lp, const, nv
rows = list(done.values())
for name, v in inst.items():
    if name in done: continue
    M = v["A"]; n = len(M); W = sum(abs(M[i][j]) for i in range(n) for j in range(i + 1, n))
    t0 = time.time(); lp, const, nv = build(M); tb = time.time() - t0
    # D: LP relaxation (reference)
    h = highspy.Highs(); h.setOptionValue("output_flag", False); h.setOptionValue("threads", 1); h.setOptionValue("time_limit", TL)
    h.passModel(lp); t1 = time.time(); h.run(); tlp = time.time() - t1
    lpF = h.getInfo().objective_function_value + const if h.getModelStatus() == highspy.HighsModelStatus.kOptimal else None
    # F: MILP
    lp.integrality_ = [highspy.HighsVarType.kInteger] * nv
    h = highspy.Highs(); h.setOptionValue("output_flag", False); h.setOptionValue("threads", 1); h.setOptionValue("time_limit", TL)
    if not DEFAULT_GAP: h.setOptionValue("mip_rel_gap", 0.0)
    t2 = time.time(); h.passModel(lp); h.run(); ts = time.time() - t2
    info = h.getInfo(); st = h.modelStatusToString(h.getModelStatus())
    F = round(info.objective_function_value + const) if info.primal_solution_status == 2 else None
    bnd = info.mip_dual_bound + const
    r = {"name": name, "family": v["family"], "n": n, "status": st, "F": F, "beta": None if F is None else (W - F) / 2,
         "boundBeta": (W - bnd) / 2, "lpBoundBeta": None if lpF is None else (W - lpF) / 2, "lp_s": round(tlp, 3),
         "build_s": round(tb, 3), "solve_s": round(ts, 3), "end_to_end_s": round(tb + ts, 3), "nodes": int(info.mip_node_count)}
    rows.append(r); json.dump(rows, open(outp, "w"), indent=1)
    print(name, st, F, f"e2e={r['end_to_end_s']}s lpβ={r['lpBoundBeta']}", flush=True)
