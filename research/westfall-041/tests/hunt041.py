"""
Mission 041 adversarial search. For every digraph tested (h = its max non-neighbour count):
  L1  defect rectangle lemma for every pair (P, X) of vertex sets (all 4^n pairs for n <= 5, sampled otherwise);
  L2  shifted-hyperbola bounds  s*(mu_s - h)_+ <= K  and  mu_s*(s - h)_+ <= K  for every k-cut and reference ordering;
  L3  injectivity: decode(encode(X)) recovers mu, and distinct k-cuts get distinct codes;
  T1  N_k <= (n+1) * R_h(K) * H(K)           (new bound, K = c + k)
  T2  N_k <= (n+1)^(2h+1) * H(K)             (Conjecture 041-A)
  T0  N_k <= (n+1) * H(K)  (the h = 0 bound)  -- EXPECTED TO FAIL for h >= 1; failures recorded as evidence that
                                                  the defect term is necessary.
Families: all digraphs on n <= 4 (4^C(n,2) arc patterns) and n = 5 (1,048,576 patterns), missing-edge matchings and
stars, near-transitive tournaments with deleted adjacencies, block constructions, random bounded-defect digraphs,
dense bidirected digraphs with missing pairs, cyclic constructions.
Run: python3 -I hunt041.py [--quick]
"""
from __future__ import annotations

import hashlib
import itertools
import json
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from defect_lib import H, R, Digraph, back_table, cutwidth, decode_mu, defect_h, encode_shifted, mu_vector, nonadjacency, optimal_ordering, ordering_width  # noqa: E402

QUICK = "--quick" in sys.argv
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(OUT, exist_ok=True)
S = {"digraphs": 0, "by_h": {}, "rect_checks": 0, "shift_checks": 0, "inj_checks": 0, "bound_checks": 0, "violations": [],
     "h0_bound_failures": 0, "h0_first_failure": None, "max_ratio_new": 0.0, "max_ratio_new_case": None, "max_ratio_conj": 0.0,
     "lower_bound_blocks": [], "families": {}}


def add_violation(kind, D, **kw):
    if len(S["violations"]) < 50:
        S["violations"].append({"kind": kind, "n": D.n, "arcs": D.arcs(), **kw})


def check(D: Digraph, family: str, rnd: random.Random, all_pairs: bool, n_orders: int = 2):
    n = D.n
    h = defect_h(D)
    back = back_table(D)
    c = cutwidth(D, back)
    opt = optimal_ordering(D, back)
    S["digraphs"] += 1
    S["by_h"][h] = S["by_h"].get(h, 0) + 1
    f = S["families"].setdefault(family, {"digraphs": 0, "max_n": 0, "max_h": 0, "max_ctw": 0})
    f["digraphs"] += 1; f["max_n"] = max(f["max_n"], n); f["max_h"] = max(f["max_h"], h); f["max_ctw"] = max(f["max_ctw"], c)
    na = nonadjacency(D)
    full = (1 << n) - 1
    # L1: defect rectangle lemma over pairs (P, X)
    if all_pairs:
        Ps = range(1 << n)
    else:
        Ps = [rnd.randrange(1 << n) for _ in range(64)]
    for P in Ps:
        for X in (range(1 << n) if all_pairs else [rnd.randrange(1 << n) for _ in range(64)]):
            A, B = P & ~X & full, X & ~P & full
            a, b = bin(A).count("1"), bin(B).count("1")
            S["rect_checks"] += 1
            if a * b > back[P] + back[X] + h * min(a, b):
                add_violation("defect rectangle", D, P=P, X=X)
            # sharper form with the exact number of non-adjacent pairs in the rectangle
            m = 0
            T = A
            while T:
                y = (T & -T).bit_length() - 1; T &= T - 1
                m += bin(na[y] & B).count("1")
            if a * b > back[P] + back[X] + m:
                add_violation("exact-defect rectangle", D, P=P, X=X)
    # counts
    counts = {}
    for X in range(1 << n):
        counts[back[X]] = counts.get(back[X], 0) + 1
    maxb = max(back)
    N, cum = {}, 0
    for k in range(maxb + 1):
        cum += counts.get(k, 0); N[k] = cum
    refs = [(opt, c)] + [(o, ordering_width(D, o, back)) for o in (rnd.sample(range(n), n) for _ in range(n_orders))]
    for (order, cw) in refs:
        for k in range(maxb + 1):
            K = cw + k
            codes = {}
            for X in range(1 << n):
                if back[X] > k:
                    continue
                mu = mu_vector(order, X)
                for s, m in enumerate(mu, start=1):
                    S["shift_checks"] += 1
                    if s * max(m - h, 0) > K or m * max(s - h, 0) > K:
                        add_violation("shifted hyperbola", D, order=order, X=X, k=k, c=cw, s=s, mu=m, h=h)
                code = encode_shifted(order, X, h, K)
                S["inj_checks"] += 1
                if decode_mu(code[1], code[2], h, n) != mu:
                    add_violation("decode", D, order=order, X=X, k=k, c=cw, h=h)
                if code in codes and codes[code] != X:
                    add_violation("injectivity", D, order=order, X=X, X2=codes[code], k=k, c=cw, h=h)
                codes[code] = X
            S["bound_checks"] += 1
            new = (n + 1) * R(h, K) * H(K)
            conj = (n + 1) ** (2 * h + 1) * H(K)
            if N[k] > new:
                add_violation("new bound", D, k=k, c=cw, h=h, N=N[k], bound=new)
            if N[k] > conj:
                add_violation("conjecture 041-A", D, k=k, c=cw, h=h, N=N[k], bound=conj)
            if N[k] > (n + 1) * H(K):
                S["h0_bound_failures"] += 1
                if S["h0_first_failure"] is None or (n, k) < (S["h0_first_failure"]["n"], S["h0_first_failure"]["k"]):
                    S["h0_first_failure"] = {"family": family, "n": n, "h": h, "k": k, "c": cw, "N_k": N[k], "h0_bound": (n + 1) * H(K), "arcs": D.arcs()}
            if order is opt:
                r = N[k] / new
                if r > S["max_ratio_new"]:
                    S["max_ratio_new"] = r
                    S["max_ratio_new_case"] = {"family": family, "n": n, "h": h, "k": k, "c": cw, "N_k": N[k], "bound": new}
                S["max_ratio_conj"] = max(S["max_ratio_conj"], N[k] / conj)


def all_digraphs(n):
    pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
    for st in itertools.product(range(4), repeat=len(pairs)):
        arcs = []
        for (u, v), s in zip(pairs, st):
            if s & 1: arcs.append((u, v))
            if s & 2: arcs.append((v, u))
        yield Digraph(n, arcs)


def transitive_minus(n, missing, rnd, both=0):
    """transitive tournament (arcs earlier -> later) with the given set of pairs made non-adjacent, relabelled"""
    perm = list(range(n)); rnd.shuffle(perm)
    pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
    bi = set(rnd.sample(pairs, min(both, len(pairs))))
    arcs = []
    for (u, v) in pairs:
        if (u, v) in missing:
            continue
        arcs.append((perm[u], perm[v]))
        if (u, v) in bi:
            arcs.append((perm[v], perm[u]))
    return Digraph(n, arcs)


def blocks(n, h):
    """lower-bound family: transitive order of blocks of size h+1; no arcs inside a block (each vertex has h
    non-neighbours); every 0-cut is a prefix of blocks plus any subset of the next block."""
    arcs = [(u, v) for u in range(n) for v in range(n) if u // (h + 1) < v // (h + 1)]
    return Digraph(n, arcs)


def random_bounded_defect(n, h, rnd, p_both=0.2):
    # choose a random graph of non-adjacencies with max degree <= h, then orient the rest randomly
    deg = [0] * n
    pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
    rnd.shuffle(pairs)
    missing = set()
    for (u, v) in pairs:
        if deg[u] < h and deg[v] < h and rnd.random() < 0.6:
            missing.add((u, v)); deg[u] += 1; deg[v] += 1
    arcs = []
    for (u, v) in pairs:
        if (u, v) in missing:
            continue
        r = rnd.random()
        if r < p_both: arcs += [(u, v), (v, u)]
        elif r < (1 + p_both) / 2: arcs.append((u, v))
        else: arcs.append((v, u))
    return Digraph(n, arcs)


def main():
    t0 = time.time()
    rnd = random.Random(41)
    for n in range(1, 5):
        for D in all_digraphs(n):
            check(D, f"all digraphs n={n}", rnd, all_pairs=True)
        print(f"all digraphs n={n} done {time.time()-t0:.0f}s", flush=True)
    if not QUICK:
        # n = 5: all 4^10 = 1,048,576 arc patterns, restricted to h <= 2 (others are checked for L1 on a sample)
        cnt = 0
        for D in all_digraphs(5):
            h = defect_h(D)
            if h <= 2 or rnd.random() < 0.02:
                check(D, "all digraphs n=5 (h<=2, +2% sample of h>=3)", rnd, all_pairs=(cnt % 50 == 0), n_orders=1)
                cnt += 1
        print(f"n=5 done {time.time()-t0:.0f}s ({cnt} digraphs)", flush=True)
    reps = 20 if QUICK else 150
    for n in range(6, 9 if QUICK else 12):
        for _ in range(reps // (n - 4)):
            h = rnd.randint(1, 3)
            check(random_bounded_defect(n, h, rnd, p_both=rnd.choice([0, 0.2, 0.5])), "random bounded-defect", rnd, False)
            # matching of missing edges / star of missing edges / deleted adjacencies near transitive
            m = set()
            for i in range(0, n - 1, 2):
                if rnd.random() < 0.7: m.add((i, i + 1))
            check(transitive_minus(n, m, rnd, both=rnd.randint(0, 3)), "transitive minus matching", rnd, False)
            centre = rnd.randrange(n)
            star = {tuple(sorted((centre, v))) for v in rnd.sample([x for x in range(n) if x != centre], min(h, n - 1))}
            check(transitive_minus(n, star, rnd), "transitive minus star", rnd, False)
        for h in range(0, 4):
            if (h + 1) <= n:
                check(blocks(n, h), "independent blocks (lower bound)", rnd, False, n_orders=1)
        # cyclic tournament with a missing matching
        arcs = [(i, (i + d) % n) for i in range(n) for d in range(1, (n - 1) // 2 + 1)]
        miss = {(i, (i + 1) % n) for i in range(0, n - 1, 2)}
        check(Digraph(n, [a for a in arcs if a not in miss and (a[1], a[0]) not in miss]), "cyclic minus matching", rnd, False)
        # dense bidirected with missing pairs
        miss = {(i, (i + 3) % n) for i in range(n)}
        check(Digraph(n, [(u, v) for u in range(n) for v in range(n) if u != v and (u, v) not in miss and (v, u) not in miss]), "bidirected minus pairs", rnd, False)
    # lower-bound family: exact N_0 versus the new bound
    for h in range(0, 5):
        for n in [6, 8, 10, 12] if not QUICK else [6, 8]:
            D = blocks(n, h)
            back = back_table(D)
            N0 = sum(1 for X in range(1 << n) if back[X] == 0)
            S["lower_bound_blocks"].append({"h": h, "n": n, "ctw": cutwidth(D, back), "N_0": N0, "new_bound": (n + 1) * R(h, 0) * H(0), "conjecture": (n + 1) ** (2 * h + 1)})
    S["seconds"] = round(time.time() - t0, 1)
    S["mode"] = "quick" if QUICK else "full"
    txt = json.dumps(S, indent=1, default=str)
    with open(os.path.join(OUT, f"hunt041_{S['mode']}.json"), "w") as f:
        f.write(txt)
    print(json.dumps({k: v for k, v in S.items() if k not in ("families", "lower_bound_blocks")}, default=str)[:2500])
    print("families:", json.dumps(S["families"]))
    print("blocks:", json.dumps(S["lower_bound_blocks"]))
    print("sha256", hashlib.sha256(txt.encode()).hexdigest())
    return 1 if S["violations"] else 0


if __name__ == "__main__":
    sys.exit(main())
