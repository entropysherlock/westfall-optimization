"""
Mission 047, Experiment 4 — the Two-Pivot Cover hypothesis.

For a k-cut X, the free-inversion graph Gamma(X) has an edge (y, x) when y is a zero, x is a one, y precedes x in
the reference order, and y, x are non-adjacent.

Hypothesis TPC(t): for every digraph with alpha <= 2 (any reference order of width c) and every k-cut X, there are
t vertices v_1..v_t whose non-neighbourhoods N̄(v_i) together cover every edge of Gamma(X), i.e. form a vertex cover.
If TPC(2) holds, then X is determined by (v_1, v_2) and its traces on V1 = N̄(v1), V2 = N̄(v2)∖V1 and the rest R.
None of these parts contains a free inversion, so each trace satisfies the semicomplete hyperbola, and
N_k <= n^2 ((n+1) H(c+k))^3.

We compute the minimum t for every k-cut and report the distribution and any instance with t > 2.
"""
import itertools, json, os, random, sys, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from lib046 import alpha_of, back_table, complement_adj, inv_table, underlying_adj
from exp2_decoder import best_order_width, families, relabel


def min_cover(n, U, X, tmax=4):
    full = (1 << n) - 1
    nb = [(full ^ U[v]) & ~(1 << v) for v in range(n)]
    edges = [(y, x) for y in range(n) if not X >> y & 1 for x in range(y + 1, n)
             if X >> x & 1 and not U[y] >> x & 1]
    if not edges:
        return 0, edges
    for t in range(1, tmax + 1):
        for vs in itertools.combinations(range(n), t):
            cov = 0
            for v in vs:
                cov |= nb[v]
            if all((cov >> y & 1) or (cov >> x & 1) for (y, x) in edges):
                return t, edges
    return tmax + 1, edges


def main():
    rnd = random.Random(4701)
    dist, bad, total = {}, [], 0
    t0 = time.time()
    # general model: the families of exp2 (backward arcs, antiparallel pairs, c = ctw)
    for name, n, arcs in families(rnd):
        U = underlying_adj(n, arcs)
        if alpha_of(n, U) > 2:
            continue
        b0 = back_table(n, arcs)
        ctw, order = best_order_width(n, b0)
        arcs2 = relabel(n, arcs, order)
        U2 = underlying_adj(n, arcs2)
        b = back_table(n, arcs2)
        for k in range(0, ctw + 3):
            for X in np.nonzero(b <= k)[0]:
                t, e = min_cover(n, U2, int(X))
                dist[t] = dist.get(t, 0) + 1
                total += 1
                if t > 2 and len(bad) < 10:
                    bad.append({"family": name, "n": n, "k": k, "c": ctw, "X": int(X), "arcs": arcs2, "t": t})
    # forward model, larger n, structured + random triangle-free defects
    from exp2b_forward import structured
    for trial in range(40):
        n = rnd.randint(10, 13)
        kind, g = structured(n, rnd)
        U = complement_adj(n, g)
        inv = inv_table(n, U)
        for k in range(0, 5):
            for X in np.nonzero(inv <= k)[0]:
                t, e = min_cover(n, U, int(X))
                dist[t] = dist.get(t, 0) + 1
                total += 1
                if t > 2 and len(bad) < 10:
                    bad.append({"family": "forward-" + kind, "n": n, "k": k, "c": 0, "X": int(X),
                                "U": U, "t": t})
    out = {"kcuts": total, "min_t_distribution": {str(k): v for k, v in sorted(dist.items())},
           "examples_t_gt_2": bad, "seconds": round(time.time() - t0, 1)}
    print(json.dumps({k: v for k, v in out.items() if k != "examples_t_gt_2"}, indent=1))
    for e in bad[:3]:
        print({k: e[k] for k in ("family", "n", "k", "c", "X", "t")})
    json.dump(out, open(os.path.join(HERE, "..", "data", "exp4_cover.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
