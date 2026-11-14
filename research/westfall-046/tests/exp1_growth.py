"""
Experiment 1 — what is the true growth of N_k for alpha = 2 (and 3)?

Proposition tested (forward model, c = 0):
  P_poly(alpha):  max over U with alpha(U) <= alpha, |V| = n, of  N_k  is  <= C_alpha * n^alpha * exp(c_alpha * sqrt(k)).
Competitor:
  P_xp:  the maximum grows like n^{f(k)} with f unbounded (as Misra et al.'s general bound n^{O(alpha sqrt k)} allows).
Discriminator: for fixed k, the ratio  max N_k / n^alpha  as n grows (bounded under P_poly, growing under P_xp).

Adversary: simulated annealing over the non-adjacency graph G = complement(U), constrained to be K_{alpha+1}-free,
objective N_k (exact count over all 2^n sets).  Seeds include the extremal candidates we know: disjoint transitive
tournaments (G complete multipartite), blow-ups of C5, matchings, random triangle-free graphs.
Not tested: n > 16; backward arcs (c > 0) — see exp3 for the general model.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib046 import H, complement_adj, inv_table, nk_counts  # noqa: E402


def has_clique(n, gadj, size, cand=None):
    """Does G contain a clique of the given size?"""
    if cand is None:
        cand = (1 << n) - 1
    if size == 0:
        return True
    while cand:
        if bin(cand).count("1") < size:
            return False
        v = (cand & -cand).bit_length() - 1
        cand &= ~(1 << v)
        if has_clique(n, gadj, size - 1, cand & gadj[v]):
            return True
    return False


def score(n, gadj, k):
    U = complement_adj(n, gadj)
    return nk_counts(inv_table(n, U), k)[k]


def seeds(n, alpha, rnd):
    out = []
    # disjoint transitive tournaments, interleaved and blocked
    for inter in (False, True):
        cls = [(v % alpha) if inter else (v * alpha // n) for v in range(n)]
        g = [0] * n
        for u in range(n):
            for v in range(n):
                if u != v and cls[u] != cls[v]:
                    g[u] |= 1 << v
        out.append(g)
    # random K_{alpha+1}-free
    for _ in range(3):
        g = [0] * n
        pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
        rnd.shuffle(pairs)
        for (u, v) in pairs:
            g[u] |= 1 << v; g[v] |= 1 << u
            if has_clique(n, g, alpha + 1):
                g[u] &= ~(1 << v); g[v] &= ~(1 << u)
        out.append(g)
    return out


def anneal(n, alpha, k, rnd, iters):
    best_g, best_s = None, -1
    for g0 in seeds(n, alpha, rnd):
        g = list(g0)
        s = score(n, g, k)
        T = max(1.0, s * 0.02)
        for it in range(iters):
            u, v = rnd.sample(range(n), 2)
            g[u] ^= 1 << v; g[v] ^= 1 << u
            if g[u] >> v & 1 and has_clique(n, g, alpha + 1):
                g[u] ^= 1 << v; g[v] ^= 1 << u
                continue
            s2 = score(n, g, k)
            if s2 >= s or rnd.random() < math.exp((s2 - s) / T):
                s = s2
                if s > best_s:
                    best_s, best_g = s, list(g)
            else:
                g[u] ^= 1 << v; g[v] ^= 1 << u
            T *= 0.997
        if s > best_s:
            best_s, best_g = s, list(g)
    return best_s, best_g


def main():
    rnd = random.Random(46)
    quick = "--quick" in sys.argv
    res = []
    t0 = time.time()
    for alpha in (2, 3):
        for n in ([10, 12] if quick else ([12, 14, 16, 18] if alpha == 2 else [12, 15, 18])):
            for k in (1, 2, 4, 6):
                base = max(score(n, g0, k) for g0 in seeds(n, alpha, rnd)[:2])
                s, g = anneal(n, alpha, k, rnd, 150 if quick else 1500)
                # full profile of the best graph for this k
                U = complement_adj(n, g)
                prof = nk_counts(inv_table(n, U), 8)
                row = {"alpha": alpha, "n": n, "k": k, "maxN": s, "baseline_disjoint_tournaments": base,
                       "gain_over_baseline": round(s / base, 4),
                       "ratio_n_alpha": round(s / n ** alpha, 4),
                       "ratio_n_alpha_Hk_alpha": round(s / ((n / alpha + 1) ** alpha * H(k) ** alpha), 5),
                       "G_edges": sum(bin(x).count("1") for x in g) // 2, "profile_k0_8": prof,
                       "G": g}
                res.append(row)
                print({x: row[x] for x in ("alpha", "n", "k", "maxN", "baseline_disjoint_tournaments", "gain_over_baseline", "ratio_n_alpha", "G_edges")},
                      f"{time.time()-t0:.0f}s", flush=True)
    with open(os.path.join(HERE, "..", "data", "exp1_growth.json"), "w") as f:
        json.dump(res, f)


if __name__ == "__main__":
    main()
