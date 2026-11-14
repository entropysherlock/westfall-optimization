"""
Mission 047, Experiment 4b — the relaxed Two-Pivot hypothesis TPD(d).
For every k-cut X of an alpha<=2 digraph there are v1, v2 (each possibly "none") such that, with
R = V minus (N̄(v1) ∪ N̄(v2)), the free-inversion graph Gamma(X) restricted to R has maximum degree <= d.
Within R every prefix rectangle then satisfies |A_R||B_R| <= K + d·min(|A_R|,|B_R|): the Mission 041 shifted hyperbola.
We record d*(X) = min over (v1, v2) of maxdeg(Gamma(X)[R]) and how it scales with n and K.
"""
import itertools, json, os, random, sys, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from lib046 import alpha_of, back_table, complement_adj, inv_table, underlying_adj
from exp2_decoder import best_order_width, families, relabel
from exp2b_forward import structured

def dstar(n, U, X):
    full = (1 << n) - 1
    nb = [(full ^ U[v]) & ~(1 << v) for v in range(n)] + [0]          # index n = "none"
    gam = [0] * n
    for y in range(n):
        if X >> y & 1: continue
        for x in range(y + 1, n):
            if X >> x & 1 and not U[y] >> x & 1:
                gam[y] |= 1 << x; gam[x] |= 1 << y
    if not any(gam): return 0
    best = 10**9
    for v1 in range(n + 1):
        for v2 in range(v1, n + 1):
            R = full & ~(nb[v1] | nb[v2])
            d = max((bin(gam[v] & R).count("1") for v in range(n) if R >> v & 1), default=0)
            if d < best:
                best = d
                if best == 0: return 0
    return best

rnd = random.Random(4702)
dist = {}; worst = []; t0 = time.time(); tot = 0
def rec(d, info):
    global tot
    tot += 1; dist[d] = dist.get(d, 0) + 1
    if d >= 2 and len(worst) < 12: worst.append(dict(info, dstar=d))
for name, n, arcs in families(rnd):
    U = underlying_adj(n, arcs)
    if alpha_of(n, U) > 2: continue
    ctw, order = best_order_width(n, back_table(n, arcs))
    arcs2 = relabel(n, arcs, order); U2 = underlying_adj(n, arcs2); b = back_table(n, arcs2)
    for k in range(0, ctw + 3):
        for X in np.nonzero(b <= k)[0]:
            rec(dstar(n, U2, int(X)), {"family": name, "n": n, "k": k, "c": ctw, "X": int(X), "arcs": arcs2})
for trial in range(40):
    n = rnd.randint(10, 13); kind, g = structured(n, rnd); U = complement_adj(n, g); inv = inv_table(n, U)
    for k in range(0, 5):
        for X in np.nonzero(inv <= k)[0]:
            rec(dstar(n, U, int(X)), {"family": "forward-" + kind, "n": n, "k": k, "c": 0, "X": int(X), "U": U})
out = {"kcuts": tot, "dstar_distribution": {str(k): v for k, v in sorted(dist.items())}, "examples_dstar_ge_2": worst,
       "seconds": round(time.time() - t0, 1)}
print(json.dumps({k: v for k, v in out.items() if k != "examples_dstar_ge_2"}, indent=1))
for e in worst[:6]: print({k: e[k] for k in ("family", "n", "k", "c", "X", "dstar")})
json.dump(out, open(os.path.join(HERE, "..", "data", "exp4b_degree.json"), "w"), indent=1)
