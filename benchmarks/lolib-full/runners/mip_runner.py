"""One MIP run on one LOLIB file; prints one JSON line. Usage: python3 mip_runner.py highs|scip <file> <TL seconds>
Model (standard 3-cycle formulation): binary x_ij (i<j) = 1 iff i precedes j; maximise
  sum_{i<j} (C_ij - C_ji) x_ij + sum_{i<j} C_ji, subject to 0 <= x_ij + x_jk - x_ik <= 1 for all i<j<k.
One thread, exact optimality (relative and absolute gap 0). The time limit covers model build + solve: the
solver receives TL minus the build time. The driver also kills the process at the wall-clock limit."""
import itertools, json, sys, time
solver, path, TL = sys.argv[1], sys.argv[2], float(sys.argv[3])
t0 = time.perf_counter()
tok = open(path).read().split(); n = int(tok[0]); v = list(map(int, tok[1:1 + n * n]))
C = [v[i * n:(i + 1) * n] for i in range(n)]
pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]; idx = {p: k for k, p in enumerate(pairs)}
cost = [C[i][j] - C[j][i] for i, j in pairs]; const = sum(C[j][i] for i, j in pairs)
out = {"solver": solver}
def order_from(x):
    wins = [0] * n
    for (i, j), val in zip(pairs, x):
        if val > 0.5: wins[i] += 1
        else: wins[j] += 1
    return sorted(range(n), key=lambda i: -wins[i])
if solver == "highs":
    import numpy as np, highspy
    st, ind = [0], []
    for i, j, k in itertools.combinations(range(n), 3):
        ind += [idx[(i, j)], idx[(j, k)], idx[(i, k)]]; st.append(len(ind))
    m = len(st) - 1; nv = len(pairs)
    lp = highspy.HighsLp(); lp.num_col_ = nv; lp.col_cost_ = np.array(cost, float); lp.col_lower_ = np.zeros(nv); lp.col_upper_ = np.ones(nv)
    lp.sense_ = highspy.ObjSense.kMaximize; lp.num_row_ = m; lp.row_lower_ = np.zeros(m); lp.row_upper_ = np.ones(m)
    lp.a_matrix_.format_ = highspy.MatrixFormat.kRowwise; lp.a_matrix_.start_ = np.array(st)
    lp.a_matrix_.index_ = np.array(ind); lp.a_matrix_.value_ = np.tile(np.array([1., 1., -1.]), m)
    lp.integrality_ = [highspy.HighsVarType.kInteger] * nv
    build = time.perf_counter() - t0
    h = highspy.Highs(); h.setOptionValue("output_flag", False); h.setOptionValue("threads", 1)
    h.setOptionValue("mip_rel_gap", 0.0); h.setOptionValue("mip_abs_gap", 0.0); h.setOptionValue("time_limit", max(0.01, TL - build))
    h.passModel(lp); h.run(); info = h.getInfo(); status = h.modelStatusToString(h.getModelStatus())
    has = info.primal_solution_status == 2
    x = list(h.getSolution().col_value) if has else None
    out.update(status=status, optimal=status == "Optimal", upperBound=info.mip_dual_bound + const, nodes=int(info.mip_node_count))
elif solver == "scip":
    from pyscipopt import Model, quicksum
    mdl = Model(); mdl.hideOutput()
    X = [mdl.addVar(vtype="B", name=f"x{k}") for k in range(len(pairs))]
    for i, j, k in itertools.combinations(range(n), 3):
        e = X[idx[(i, j)]] + X[idx[(j, k)]] - X[idx[(i, k)]]
        mdl.addCons(e >= 0); mdl.addCons(e <= 1)
    mdl.setObjective(quicksum(c * x for c, x in zip(cost, X)), "maximize")
    build = time.perf_counter() - t0
    mdl.setParam("limits/time", max(0.01, TL - build)); mdl.setParam("limits/gap", 0.0); mdl.setParam("limits/absgap", 0.0)
    mdl.setParam("parallel/maxnthreads", 1); mdl.setParam("lp/threads", 1)
    mdl.optimize(); status = mdl.getStatus(); has = mdl.getNSols() > 0
    x = [mdl.getVal(v) for v in X] if has else None
    out.update(status=status, optimal=status == "optimal", upperBound=mdl.getDualbound() + const, nodes=int(mdl.getNNodes()))
else:
    raise SystemExit("solver must be highs or scip")
if x is not None:
    order = order_from(x); B = sum(C[order[a]][order[b]] for a in range(n) for b in range(a + 1, n))
    out.update(benefit=B, order=order)
else:
    out.update(benefit=None, order=None)
out.update(build_s=build, total_s=time.perf_counter() - t0)
print(json.dumps(out), flush=True)
