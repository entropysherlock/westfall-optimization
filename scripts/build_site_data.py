"""Generate all data the website displays, from the real implementation and the real logs.

    python scripts/build_site_data.py

Outputs (website/public/data/):
  presets.json        preset instances + reference results computed by the Python BLX 2.0 solver
  certificates/*.json exact certificates (verified here with verify_exact before being written)
  benchmarks.json     flattened records parsed from benchmarks/data/*.jsonl (no manual edits)
"""
from __future__ import annotations

import json
import os
import platform
import sys
import time

import numpy as np
import scipy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))
import westfall_optimization as w  # noqa: E402
from westfall_optimization.blx.hybrid import HybridBound, block_params2, segment  # noqa: E402
from westfall_optimization.certificates.make_cert import make_certificate  # noqa: E402
from westfall_optimization.certificates.verify_exact import verify  # noqa: E402
from westfall_optimization.solvers.subset_dp import subset_dp  # noqa: E402

OUT = os.path.join(ROOT, "website", "public", "data")


def clean(o):
    """Strict JSON: non-finite floats become null; numpy scalars become Python numbers."""
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        return float(o) if np.isfinite(o) else None
    return o


def dump(obj, fh):
    json.dump(clean(obj), fh, allow_nan=False)


def skew(upper, n):
    A = np.zeros((n, n))
    for (i, j), v in upper.items():
        A[i, j] = v
        A[j, i] = -v
    return A


def presets():
    P = []
    rng = np.random.default_rng(20)
    # 1. near-transitive, integer weights
    n = 10
    A = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            v = int(rng.integers(1, 6)) * (1 if rng.random() > 0.15 else -1)
            A[i, j], A[j, i] = v, -v
    perm = rng.permutation(n)
    P.append(dict(id="near-transitive-10", title="Near-transitive tournament (n = 10)", family="near-transitive",
                  description="Integer weights 1-5; about 15% of pairs disagree with a hidden ranking, then the vertices are shuffled.",
                  A=A[np.ix_(perm, perm)], integer=True))
    # 2. cyclic 5
    A = np.zeros((5, 5))
    for i in range(5):
        for d in (1, 2):
            j = (i + d) % 5
            A[i, j], A[j, i] = 1, -1
    P.append(dict(id="cyclic-5", title="Regular cyclic tournament (n = 5)", family="cyclic",
                  description="Every vertex beats the next two. Highly symmetric: many orderings are optimal, so individual precedences are not forced.",
                  A=A, integer=True))
    # 3. Paley 7
    P.append(dict(id="paley-7", title="Paley tournament P7 (n = 7)", family="paley",
                  description="Quadratic-residue tournament mod 7 with +-1 weights. Vertex-transitive; optimal orderings are not unique.",
                  A=w.paley_sign(7), integer=True))
    # 4. perturbed Paley 11 (program instance)
    P.append(dict(id="paley-11-perturbed", title="Perturbed Paley P11 (WESTFALL seeded instance)", family="paley",
                  description="Paley(11) plus uniform noise in [-0.05, 0.05] (NumPy default_rng(14013+11)). Unique optimum 15.52614287. Local pairwise certificates certify nothing here.",
                  A=w.perturbed_paley(11), integer=False))
    # 5. block-structured, mixed sign: two P7 cores in an ordered frame
    n = 14
    A = np.zeros((n, n))
    S7 = w.paley_sign(7)
    for i in range(n):
        for j in range(i + 1, n):
            if i // 7 == j // 7:
                v = S7[i % 7, j % 7]
            else:
                v = 2.0
            A[i, j], A[j, i] = v, -v
    for (i, j) in [(2, 9), (5, 12)]:  # two reversed (mixed-sign) cross edges
        A[i, j], A[j, i] = -1.0, 1.0
    perm = np.random.default_rng(5).permutation(n)
    P.append(dict(id="blocks-14-mixed", title="Two cyclic cores, mixed-sign cross edges (n = 14)", family="block-structured",
                  description="Two Paley(7) cores; cross pairs prefer core 1 before core 2 (weight 2) except two reversed pairs (weight -1). Shuffled.",
                  A=A[np.ix_(perm, perm)], integer=True))
    # 6. Discovery 018 separation instance
    A = np.load(os.path.join(ROOT, "examples", "sep18_A.npy"))
    P.append(dict(id="separation-9", title="Mixed-sign block separation instance (Discovery 018)", family="mixed-sign",
                  description="Three rigid weighted 3-cycles with five negative cross edges. Every optimum is block-sorted; local partial-optimality rules miss most cross relations.",
                  A=A, integer=False))
    # 7. ties and zero weights
    n = 8
    A = np.zeros((n, n))
    r2 = np.random.default_rng(8)
    for i in range(n):
        for j in range(i + 1, n):
            v = int(r2.integers(-2, 3))
            A[i, j], A[j, i] = v, -v
    P.append(dict(id="ties-zero-8", title="Ties and zero-weight pairs (n = 8)", family="ties",
                  description="Integer weights in {-2,...,2}, including zeros. Optimal orderings need not be unique.",
                  A=A, integer=True))
    # 8. planted ranking
    n = 12
    A = np.zeros((n, n))
    r3 = np.random.default_rng(12)
    for i in range(n):
        for j in range(i + 1, n):
            v = int(round((j - i) + 2.5 * r3.standard_normal())) or 1
            A[i, j], A[j, i] = v, -v
    perm = r3.permutation(n)
    P.append(dict(id="planted-12", title="Planted noisy ranking (n = 12)", family="planted",
                  description="Signal a_ij ~ (j - i) + Gaussian noise, rounded to integers, vertices shuffled.",
                  A=A[np.ix_(perm, perm)], integer=True))
    return P


def build_presets():
    os.makedirs(os.path.join(OUT, "certificates"), exist_ok=True)
    out = []
    for p in presets():
        A = w.as_skew(p["A"])
        n = A.shape[0]
        exact = float(subset_dp(A)[0][-1])
        auto = w.solve(A, mode="auto")
        auto.pop("_H", None)
        blx = w.solve(A, mode="blx", want_pairs=True)
        H = blx.pop("_H", None)
        assert abs(auto["OPT"] - exact) < 1e-9 and abs(blx["OPT"] - exact) < 1e-9, p["id"]
        cert, _, _ = make_certificate(A, blx["incumbent_order"], H)
        t = time.time()
        v = verify(cert, A_input=A)
        tv = time.time() - t
        assert abs(v["OPT"] - exact) < 1e-9
        with open(os.path.join(OUT, "certificates", p["id"] + ".json"), "w") as fh:
            json.dump(cert, fh)
        params = blx.get("theorem_parameters", {})
        out.append(dict(
            id=p["id"], title=p["title"], family=p["family"], description=p["description"], n=n,
            integer=p["integer"], matrix=A.tolist(),
            reference=dict(
                solver="Python BLX 2.0 (westfall_optimization.solve)",
                auto_route=auto["route"], status=blx["status"], OPT=blx["OPT"], order=blx["order"],
                incumbent_order=blx["incumbent_order"], incumbent_score=blx["incumbent_score"],
                blocks=blx.get("blocks"), generated=blx["generated_states"], retained=blx["retained_states"],
                excluded=blx["excluded_states"], certified_pairs=blx.get("certified_pairs"),
                total_pairs=blx.get("total_pairs"), time_s=round(blx["time"], 4),
                theorem=dict(K=params.get("K"), b=params.get("b"), X=params.get("X"),
                             zero_cross=params.get("zero_cross"), mu_plus=params.get("mu_plus")),
                exact_subset_dp=exact,
                certificate=f"data/certificates/{p['id']}.json",
                certificate_python_verified=True, python_verify_s=round(tv, 4)),
        ))
        print(f"{p['id']:>22}: OPT={exact:.8f} route={auto['route']} blx states {blx['generated_states']} certificate OK")
    with open(os.path.join(OUT, "presets.json"), "w") as fh:
        dump(out, fh)


def build_benchmarks():
    recs = []
    srcs = [("grid.jsonl", "D018 grid (training set for portfolio thresholds)"),
            ("lolib.jsonl", "D018 LOLIB (training set)"),
            ("test19.jsonl", "D019 out-of-sample test"),
            ("insample19.jsonl", "D019 BLX 2.0 on D018 instances (in-sample)")]
    names = {"sldp": "Packing SLDP", "blx": "BLX 1.0", "blx2": "BLX 2.0", "milp": "HiGHS MILP"}
    for fn, label in srcs:
        for line in open(os.path.join(ROOT, "benchmarks", "data", fn)):
            d = json.loads(line)
            c = d["cfg"]
            kw = c.get("kw", {}) or {}
            if c["fam"] == "lolib":
                inst = c.get("name") or os.path.basename(kw.get("path", ""))
                fam = "LOLIB" if "xLOLIB" not in inst else "xLOLIB"
            else:
                inst = f"{c['fam']} n={c['n']}" + (f" cores={kw['cores']} q={kw['q']}" if 'cores' in kw else "") + \
                       (f" alpha={kw['alpha']} theta={kw['theta']}" if 'alpha' in kw else "")
                fam = {"blocks": "C: embedded cyclic cores", "neartrans": "A: near-transitive", "planted": "B: planted ranking",
                       "uniform": "D: uniform weights", "ties": "D: integer ties", "paley": "F: pure Paley"}[c["fam"]]
                if c.get("family") == "C-adv":
                    fam = "C-adv: adversarial reversals"
            solver = d["solver"]
            if "error" in d:
                status = "TIMEOUT" if "TIMEOUT" in d["error"] else "ERROR"
                t = None
            elif solver == "milp":
                status = "PROVED_OPTIMAL" if d.get("proved") else "NOT_PROVED_WITHIN_LIMIT"
                t = d.get("time")
            elif "status" in d:
                status = "UNRESOLVED"
                t = d.get("time")
            else:
                status = "PROVED_OPTIMAL"
                t = d.get("time")
            recs.append(dict(source=label, family=fam, instance=inst, seed=c.get("seed"), n=d.get("n") or c["n"] or None,
                             q=kw.get("q"), solver=names[solver], status=status, time_s=t,
                             OPT=d.get("OPT") if status == "PROVED_OPTIMAL" else None,
                             generated=d.get("generated"), route=d.get("route"), milp_limit_s=c.get("tl")))
    env = dict(machine="2-core cloud VM, 8 GB RAM (Discovery 018/019 runs)", python=platform.python_version(),
               numpy=np.__version__, scipy=scipy.__version__, milp="HiGHS via scipy.optimize.milp, full triangle formulation",
               limits="MILP 60 s (BLX 2.0's internal MILP attempt 30 s, 60 s when n > 62); DP runs: 300-900 s process timeouts",
               note="Times are wall-clock on a shared VM and are not identical budgets across solvers; see benchmarks/README.md.")
    with open(os.path.join(OUT, "benchmarks.json"), "w") as fh:
        dump(dict(environment=env, records=recs), fh)
    print("benchmark records:", len(recs))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    build_presets()
    build_benchmarks()
