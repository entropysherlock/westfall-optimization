"""
Mission 041, Phase 7 test: degenerate defect (Theorem D in PROOF.md).

Claim (paper proof, not formalized): if the non-adjacency graph of D is d-degenerate and the reference ordering has
width <= c, then
    (R)  |P\\X|·|X\\P| <= back(P) + back(X) + d·(|P\\X| + |X\\P|)        for all P, X,
    (S)  (s - d)_+ · (mu_s - d)_+ <= c + k + d^2                          for every k-cut X and every s,
    (N)  N_k <= (n+1)^(2d+1) · H(c + k + d^2).
Max-degree-h defect (h-semicomplete) is the special case d = h of the hypothesis, with the sharper Theorem C.

Generators: each vertex v picks at most d earlier vertices as non-neighbours (so the non-adjacency graph is
d-degenerate by construction, with unbounded maximum degree when the picks concentrate); all other pairs get a
random orientation from {forward, backward, both}, biased towards a transitive order so that ctw stays small.
Adversarial family "hub": d hub vertices non-adjacent to everything else (non-adjacency = K_{d, n-d} plus nothing),
which has non-adjacency max degree n-d but degeneracy d.
"""
from __future__ import annotations

import json
import os
import random
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "westfall-040", "tests"))
from defect_lib import mu_vector, nonadjacency  # noqa: E402
from kcut_lib import H, Digraph, back_table, cutwidth, optimal_ordering  # noqa: E402


def degeneracy(n: int, nonadj) -> int:
    alive = (1 << n) - 1
    best = 0
    while alive:
        v = min((u for u in range(n) if alive >> u & 1), key=lambda u: bin(nonadj[u] & alive).count("1"))
        best = max(best, bin(nonadj[v] & alive).count("1"))
        alive &= ~(1 << v)
    return best


def random_degenerate(n: int, d: int, rnd: random.Random, p_rev: float, p_both: float, hub: bool = False) -> Digraph:
    missing = set()
    if hub:
        for x in range(d):
            for y in range(d, n):
                missing.add((x, y))
    else:
        for v in range(1, n):
            for u in rnd.sample(range(v), min(d, v, rnd.randint(0, d))):
                missing.add((u, v))
    arcs = []
    for i in range(n):
        for j in range(i + 1, n):
            if (i, j) in missing:
                continue
            r = rnd.random()
            if r < p_both:
                arcs += [(i, j), (j, i)]
            elif r < p_both + p_rev:
                arcs.append((j, i))
            else:
                arcs.append((i, j))
    perm = list(range(n))
    rnd.shuffle(perm)
    return Digraph(n, [(perm[u], perm[v]) for (u, v) in arcs])


def main():
    rnd = random.Random(4107)
    stats = {"digraphs": 0, "rect_checks": 0, "shift_checks": 0, "bound_checks": 0, "violations": [],
             "max_ratio": 0.0, "max_ratio_case": None, "by_d": {}}
    t0 = time.time()
    for trial in range(1500):
        n = rnd.randint(3, 10)
        d = rnd.randint(1, 3)
        hub = trial % 5 == 0 and n > d
        D = random_degenerate(n, d, rnd, p_rev=rnd.choice([0.0, 0.1, 0.25]), p_both=rnd.choice([0.0, 0.1]), hub=hub)
        na = nonadjacency(D)
        dd = degeneracy(n, na)
        assert dd <= d
        bt = back_table(D)
        order = optimal_ordering(D, bt)
        c = cutwidth(D, bt)
        stats["digraphs"] += 1
        stats["by_d"][dd] = stats["by_d"].get(dd, 0) + 1
        full = (1 << n) - 1
        # (R) rectangle with degenerate defect, on all pairs for n <= 6, sampled otherwise
        pairs = ((P, X) for P in range(1 << n) for X in range(1 << n)) if n <= 6 else \
            ((rnd.randrange(1 << n), rnd.randrange(1 << n)) for _ in range(3000))
        for P, X in pairs:
            a = bin(P & ~X & full).count("1")
            b = bin(X & ~P & full).count("1")
            stats["rect_checks"] += 1
            if a * b > bt[P] + bt[X] + dd * (a + b):
                stats["violations"].append({"kind": "R", "n": n, "d": dd, "P": P, "X": X, "arcs": D.arcs()})
        for k in range(0, c + 3):
            K2 = c + k + dd * dd
            cnt = 0
            for X in range(1 << n):
                if bt[X] > k:
                    continue
                cnt += 1
                mu = mu_vector(order, X)
                for s in range(1, n + 1):
                    stats["shift_checks"] += 1
                    m = mu[s - 1]
                    if max(s - dd, 0) * max(m - dd, 0) > K2:
                        stats["violations"].append({"kind": "S", "n": n, "d": dd, "X": X, "s": s, "arcs": D.arcs()})
            bound = (n + 1) ** (2 * dd + 1) * H(K2)
            stats["bound_checks"] += 1
            if cnt > bound:
                stats["violations"].append({"kind": "N", "n": n, "d": dd, "k": k, "c": c, "N": cnt, "bound": bound})
            r = cnt / bound
            if r > stats["max_ratio"]:
                stats["max_ratio"] = r
                stats["max_ratio_case"] = {"n": n, "d": dd, "k": k, "c": c, "N_k": cnt, "bound": bound}
    stats["violations"] = stats["violations"][:20]
    stats["n_violations"] = len(stats["violations"])
    stats["seconds"] = round(time.time() - t0, 1)
    out = os.path.join(HERE, "..", "data", "degenerate041.json")
    with open(out, "w") as f:
        json.dump(stats, f, indent=1)
    print(json.dumps({k: v for k, v in stats.items() if k != "violations"}, indent=1))


if __name__ == "__main__":
    main()
