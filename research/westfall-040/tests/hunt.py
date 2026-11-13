"""
Mission 040 counterexample hunt for the candidate theorem

    N_k(D) <= (n+1) * H(c+k)   whenever D is semicomplete and has an ordering of width <= c,

and for every lemma used in its proof. Writes a JSON summary (and any counterexample) to ../data/.

Checks, for every digraph tested and every k in 0..max back(X):
  T1  N_k(D) <= (n+1) H(ctw(D) + k)                                  (theorem, best reference ordering)
  T1s N_k(D) <= sum_a #{lambda in a x (n-a) box, i*lambda_i <= c+k}   (sharper per-size form)
  L1  for EVERY reference ordering tested (optimal and random, with its own width c):
        every k-cut's word gives a nonincreasing lambda with i*lambda_i <= c + k     (rectangle lemma)
        decode(encode(X)) == X                                                       (injectivity)
  C1  the forward (JCTB) convention, applied consistently, satisfies the same bound
  C2  MIXED conventions (backward cuts, forward-width bound). These cannot differ: reversing an ordering maps forward
      width to backward width, and (X,Y) -> (Y,X) maps forward k-cuts to backward ones, so ctw and N_k are
      convention-independent. The check confirms this empirically (expected 0 failures).
  N1  non-semicomplete digraphs (a missing pair) — expected to FAIL somewhere; shows the hypothesis is needed
Run:  python3 -I hunt.py [--quick]
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kcut_lib import (Digraph, H, H_box, H_bruteforce, all_semicomplete, back_naive, back_table, complete_bidirected,  # noqa: E402
                      cutwidth, cyclic_tournament, decode, encode, near_transitive, optimal_ordering, ordering_width, paley,
                      random_semicomplete, rectangle_ok)

QUICK = "--quick" in sys.argv
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(OUT, exist_ok=True)

stats = {"digraphs": 0, "theorem_checks": 0, "rectangle_checks": 0, "violations": [], "max_ratio": 0.0, "max_ratio_case": None,
         "mixed_convention_failures": 0, "mixed_first_failure": None, "nonsemicomplete_failures": 0, "nonsemicomplete_first_failure": None,
         "families": {}}
box_cache: dict = {}


def box_sum(n, K):
    key = (n, K)
    if key not in box_cache:
        box_cache[key] = sum(H_box(K, a, n - a) for a in range(n + 1))
    return box_cache[key]


def check(D: Digraph, family: str, rnd: random.Random, n_random_orders=3):
    n = D.n
    back = back_table(D)
    c = cutwidth(D, back)
    opt = optimal_ordering(D, back)
    assert ordering_width(D, opt, back) == c
    maxb = max(back)
    fam = stats["families"].setdefault(family, {"digraphs": 0, "max_n": 0, "max_ctw": 0})
    fam["digraphs"] += 1
    fam["max_n"] = max(fam["max_n"], n)
    fam["max_ctw"] = max(fam["max_ctw"], c)
    stats["digraphs"] += 1
    counts = {}
    for X in range(1 << n):
        counts[back[X]] = counts.get(back[X], 0) + 1
    cum, N = 0, {}
    for k in range(maxb + 1):
        cum += counts.get(k, 0)
        N[k] = cum
    refs = [(opt, c)] + [(o, ordering_width(D, o, back)) for o in (rnd.sample(range(n), n) for _ in range(n_random_orders))]
    for k in range(maxb + 1):
        bound = (n + 1) * H(c + k)
        if n >= 4:
            rb = N[k] / box_sum(n, c + k)
            if rb > stats.setdefault("max_box_ratio_n4", 0.0):
                stats["max_box_ratio_n4"] = rb
                stats["max_box_ratio_case"] = {"family": family, "n": n, "k": k, "ctw": c, "N_k": N[k], "box_bound": box_sum(n, c + k), "arcs": D.arcs()}
        stats["theorem_checks"] += 1
        if N[k] > bound or N[k] > box_sum(n, c + k):
            stats["violations"].append({"family": family, "n": n, "arcs": D.arcs(), "k": k, "ctw": c, "N_k": N[k], "bound": bound, "box_bound": box_sum(n, c + k)})
        r = N[k] / bound
        if r > stats["max_ratio"]:
            stats["max_ratio"] = r
            stats["max_ratio_case"] = {"family": family, "n": n, "k": k, "ctw": c, "N_k": N[k], "bound": bound}
    # lemma checks on every k-cut for every reference ordering (k = back(X) is the tightest admissible k)
    for (order, cw) in refs:
        for X in range(1 << n):
            k = back[X]
            stats["rectangle_checks"] += 1
            if not rectangle_ok(order, X, cw, k):
                stats["violations"].append({"family": family, "lemma": "rectangle", "n": n, "arcs": D.arcs(), "order": order, "X": X, "k": k, "c": cw, "encode": encode(order, X)})
            a, lam = encode(order, X)
            if decode(order, a, lam) != X:
                stats["violations"].append({"family": family, "lemma": "injectivity", "n": n, "arcs": D.arcs(), "order": order, "X": X})
    return back, c, N


def check_conventions(D: Digraph, family: str):
    """C1: forward convention = theorem for the reverse digraph. C2: mixed conventions (expected identical)."""
    n = D.n
    R = D.reverse()
    backR = back_table(R)            # backR[X] = arcs Y->X in R = arcs X->Y in D  (forward cut size in D)
    cF = cutwidth(R, backR)          # forward-convention cutwidth of D
    for k in range(max(backR) + 1):
        NF = sum(1 for X in range(1 << n) if backR[X] <= k)
        if NF > (n + 1) * H(cF + k):
            stats["violations"].append({"family": family, "convention": "forward", "n": n, "arcs": D.arcs(), "k": k})
    # mixed: count BACKWARD k-cuts but assume only a FORWARD-width bound cF
    back = back_table(D)
    for k in range(max(back) + 1):
        NB = sum(1 for X in range(1 << n) if back[X] <= k)
        if NB > (n + 1) * H(cF + k):
            stats["mixed_convention_failures"] += 1
            if stats["mixed_first_failure"] is None:
                stats["mixed_first_failure"] = {"family": family, "n": n, "arcs": D.arcs(), "k": k, "N_k_backward": NB, "forward_ctw": cF, "bound_used": (n + 1) * H(cF + k), "backward_ctw": cutwidth(D, back)}
            break


def check_nonsemicomplete(n: int, rnd: random.Random):
    """N1: digraphs with missing pairs need not satisfy the bound (empty digraph: all 2^n bipartitions are 0-cuts)."""
    D = Digraph(n, [])
    back = back_table(D)
    c = cutwidth(D, back)
    N0 = sum(1 for X in range(1 << n) if back[X] <= 0)
    if N0 > (n + 1) * H(c):
        stats["nonsemicomplete_failures"] += 1
        stats["nonsemicomplete_first_failure"] = stats["nonsemicomplete_first_failure"] or {"n": n, "arcs": [], "k": 0, "ctw": c, "N_0": N0, "bound": (n + 1) * H(c)}


def main():
    t0 = time.time()
    rnd = random.Random(40)
    # H sanity: DP vs brute force, and the explicit estimate H(K) <= (e^{2 pi sqrt K} - 1)/(2 pi sqrt K)
    for K in range(0, 25):
        assert H(K) == H_bruteforce(K), K
    worst = 0.0
    for K in list(range(1, 2001)) + ([] if QUICK else [5000, 10000, 20000]):
        lhs = math.log(H(K))
        x = 2 * math.pi * math.sqrt(K)
        rhs = x + math.log1p(-math.exp(-x)) - math.log(x)  # log((e^x - 1)/x) without overflow
        assert lhs <= rhs + 1e-12, K
        worst = max(worst, lhs / (2 * math.pi * math.sqrt(K)))
    stats["H_check"] = {"dp_vs_bruteforce": "K <= 24", "estimate_checked_up_to": 2000 if QUICK else 20000, "max log H / (2 pi sqrt K)": worst,
                        "H_values": {K: H(K) for K in [0, 1, 2, 3, 4, 5, 10, 20, 50, 100]}}

    # exhaustive: every semicomplete digraph (all 3^(n choose 2) labelled ones, antiparallel pairs included) for n <= 5
    for n in range(1, 5 if QUICK else 6):
        for D in all_semicomplete(n):
            check(D, f"exhaustive semicomplete n={n}", rnd, n_random_orders=1 if n == 5 else 2)
            check_conventions(D, f"exhaustive semicomplete n={n}")
        print(f"exhaustive n={n} done ({time.time() - t0:.0f}s)", flush=True)
    # exhaustive tournaments n = 6
    if not QUICK:
        import itertools
        n = 6
        pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
        for bits in range(1 << len(pairs)):
            arcs = [(u, v) if bits >> j & 1 else (v, u) for j, (u, v) in enumerate(pairs)]
            check(Digraph(n, arcs), "exhaustive tournaments n=6", rnd, n_random_orders=1)
        print(f"exhaustive tournaments n=6 done ({time.time() - t0:.0f}s)", flush=True)
    # random and structured families, n = 6..12
    reps = 40 if QUICK else 400
    for n in range(6, 10 if QUICK else 13):
        for _ in range(reps // max(1, n - 5)):
            check(random_semicomplete(n, rnd, p_both=rnd.choice([0.0, 0.1, 0.3, 0.6])), "random semicomplete", rnd)
            check(near_transitive(n, rnd.randint(0, n), rnd, both=rnd.randint(0, n)), "near-transitive (+bidirected)", rnd)
        check(cyclic_tournament(n), "cyclic tournaments", rnd)
        check(complete_bidirected(n), "complete bidirected", rnd)
        check_conventions(random_semicomplete(n, rnd), "random semicomplete")
    for p in [3, 7, 11]:
        check(paley(p), "Paley tournaments", rnd)
    for n in range(2, 9):
        check_nonsemicomplete(n, rnd)

    stats["seconds"] = round(time.time() - t0, 1)
    stats["mode"] = "quick" if QUICK else "full"
    text = json.dumps(stats, indent=1, default=str)
    path = os.path.join(OUT, f"hunt_{stats['mode']}.json")
    with open(path, "w") as f:
        f.write(text)
    print(json.dumps({k: v for k, v in stats.items() if k not in ("families",)}, default=str)[:3000])
    print("families:", json.dumps(stats["families"]))
    print("sha256:", hashlib.sha256(text.encode()).hexdigest())
    return 1 if stats["violations"] else 0


if __name__ == "__main__":
    sys.exit(main())
