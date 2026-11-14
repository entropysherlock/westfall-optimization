"""Independent verification of the 40-item case study (pure Python + HiGHS; shares no code with the TypeScript
solver).

1. Re-implements the ATLAS-032 generator (mulberry32 + generate('near-transitive', 40, 1)) and checks that the
   matrix in instance.json is reproduced exactly.
2. Re-implements the specified greedy baseline and recomputes its penalty.
3. Recomputes F and the penalty (backward weight) of the ATLAS ordering from the matrix.
4. Runs benchmarks/atlas-032/verify_certificate.py on certificate.json. That verifier performs its own exhaustive
   search with independently checked bounds, so a pass is a proof of optimality that does not trust ATLAS.
5. Solves the instance with HiGHS (exact MILP, mip_rel_gap = 0, 1 thread), 5 timed runs.
6. Context: best-insertion local search started from the greedy order (a cheap heuristic), to show how much of the
   gap a simple improvement step already closes.

Usage: python3 verify_case_study.py   (needs highspy)       Output: verification.json
"""
import importlib.util, itertools, json, os, platform, statistics, time

HERE = os.path.dirname(os.path.abspath(__file__))
M32 = 0xFFFFFFFF


def imul(a, b):
    r = (a * b) & M32
    return r - (1 << 32) if r & 0x80000000 else r


def mulberry32(seed):
    a = seed & M32

    def rnd():
        nonlocal a
        a = (a + 0x6D2B79F5) & M32
        t = a
        t = imul(t ^ (t >> 15), t | 1) & M32
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & M32
        t &= M32
        return ((t ^ (t >> 14)) & M32) / 4294967296
    return rnd


def generate_near_transitive(n, seed):
    rnd = mulberry32(seed)
    A = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            mag = 1 + int(rnd() * 5)
            v = mag * (-1 if rnd() < 0.15 else 1)
            A[i][j], A[j][i] = v, -v
    perm = list(range(n))
    for i in range(n - 1, 0, -1):
        j = int(rnd() * (i + 1))
        perm[i], perm[j] = perm[j], perm[i]
    return [[A[i][j] for j in perm] for i in perm]


def F(A, o):
    return sum(A[o[r]][o[t]] for r in range(len(o)) for t in range(r + 1, len(o)))


def W(A):
    return sum(abs(A[i][j]) for i in range(len(A)) for j in range(i + 1, len(A)))


def penalty(A, o):
    return (W(A) - F(A, o)) // 2


def greedy(A):
    rem, out = list(range(len(A))), []
    while rem:
        best = max(rem, key=lambda i: (sum(A[i][j] for j in rem if j != i), -i))
        out.append(best)
        rem.remove(best)
    return out


def insertion_local_search(A, order):
    o = order[:]
    improved = True
    while improved:
        improved = False
        for i in range(len(o)):
            v = o[i]
            rest = o[:i] + o[i + 1:]
            best_o, best_f = o, F(A, o)
            for p in range(len(rest) + 1):
                cand = rest[:p] + [v] + rest[p:]
                f = F(A, cand)
                if f > best_f:
                    best_o, best_f = cand, f
            if best_o is not o:
                o, improved = best_o, True
    return o


def highs_solve(A):
    import numpy as np
    import highspy
    n = len(A)
    idx, c = {}, []
    for i in range(n):
        for j in range(i + 1, n):
            idx[(i, j)] = len(c)
            c.append(A[i][j] - A[j][i])
    const = sum(A[j][i] for i in range(n) for j in range(i + 1, n))
    st, ind, val = [0], [], []
    for i, j, k in itertools.combinations(range(n), 3):
        ind += [idx[(i, j)], idx[(j, k)], idx[(i, k)]]
        val += [1.0, 1.0, -1.0]
        st.append(len(ind))
    t0 = time.perf_counter()
    lp = highspy.HighsLp()
    nv = len(c)
    lp.num_col_ = nv
    lp.col_cost_ = np.array(c, float)
    lp.col_lower_, lp.col_upper_ = np.zeros(nv), np.ones(nv)
    lp.sense_ = highspy.ObjSense.kMaximize
    m = len(st) - 1
    lp.num_row_ = m
    lp.row_lower_, lp.row_upper_ = np.zeros(m), np.ones(m)
    lp.a_matrix_.format_ = highspy.MatrixFormat.kRowwise
    lp.a_matrix_.start_, lp.a_matrix_.index_, lp.a_matrix_.value_ = np.array(st), np.array(ind), np.array(val)
    lp.integrality_ = [highspy.HighsVarType.kInteger] * nv
    h = highspy.Highs()
    h.setOptionValue("output_flag", False)
    h.setOptionValue("threads", 1)
    h.setOptionValue("mip_rel_gap", 0.0)
    h.setOptionValue("time_limit", 60.0)
    h.passModel(lp)
    h.run()
    secs = time.perf_counter() - t0
    info = h.getInfo()
    return {"status": h.modelStatusToString(h.getModelStatus()), "F": round(info.objective_function_value + const),
            "dualBoundF": info.mip_dual_bound + const, "mip_gap": info.mip_gap, "seconds": secs,
            "version": h.version()}


def main():
    inst = json.load(open(os.path.join(HERE, "instance.json")))
    run = json.load(open(os.path.join(HERE, "atlas_run.json")))
    A = inst["A"]
    out = {}
    regen = generate_near_transitive(40, 1)
    out["matrix_reproduced_independently"] = regen == A
    g = greedy(A)
    out["greedy"] = {"order": g, "F": F(A, g), "penalty": penalty(A, g), "matches_ts": g == run["greedy"]["order"]}
    o = run["atlas"]["order"]
    out["atlas_order_recomputed"] = {"is_permutation": sorted(o) == list(range(40)), "F": F(A, o), "penalty": penalty(A, o)}
    spec = importlib.util.spec_from_file_location("vc", os.path.join(HERE, "..", "atlas-032", "verify_certificate.py"))
    vc = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(vc)
    t0 = time.perf_counter()
    try:
        vc.main(os.path.join(HERE, "certificate.json"))
        out["certificate"] = {"verified": True, "verifier": "benchmarks/atlas-032/verify_certificate.py",
                              "seconds": round(time.perf_counter() - t0, 3)}
    except (AssertionError, SystemExit) as e:
        ok = isinstance(e, SystemExit) and (e.code in (0, None))
        out["certificate"] = {"verified": ok, "error": None if ok else str(e)}
    ls = insertion_local_search(A, g)
    out["context_greedy_plus_insertion_local_search"] = {"F": F(A, ls), "penalty": penalty(A, ls), "order": ls}
    runs = [highs_solve(A) for _ in range(5)]
    secs = sorted(r["seconds"] for r in runs)
    out["highs"] = {"version": runs[0]["version"], "status": runs[0]["status"], "F": runs[0]["F"],
                    "penalty": (W(A) - runs[0]["F"]) // 2, "mip_gap": runs[0]["mip_gap"],
                    "settings": "exact MILP with all 3-cycle constraints, mip_rel_gap=0, threads=1",
                    "runs_s": [round(s, 3) for s in secs], "median_s": round(statistics.median(secs), 3),
                    "timing_scope": "model build + solve, end to end"}
    out["environment"] = {"python": platform.python_version(), "machine": platform.machine(), "processor": platform.processor(),
                          "logical_cpus": os.cpu_count()}
    json.dump(out, open(os.path.join(HERE, "verification.json"), "w"), indent=1)
    print(json.dumps({k: (v if k not in ("greedy", "context_greedy_plus_insertion_local_search") else {kk: vv for kk, vv in v.items() if kk != "order"})
                      for k, v in out.items()}, indent=1))


if __name__ == "__main__":
    main()
