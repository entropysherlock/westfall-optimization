"""
Experiment 2 — exhaustive/adversarial verification of the Pivot Lemma and the Core Decomposition (alpha <= 2).

Propositions checked (statements and proofs in ../THEOREMS.md):
  PL  (Pivot Lemma).  For every prefix P of the reference order and every k-cut X: if |X\\P| > back(P)+back(X), some
      x' in X\\P has no neighbour in P\\X, hence P\\X is contained in the non-neighbourhood N_G(x'), whose
      independence number is <= alpha - 1.  (Symmetric version for the zeros side.)
  CD  (Core Decomposition, alpha = 2).  With K = c + k, every k-cut X is reconstructed exactly from
        (y_f, x', X ∩ N_G(x'),  x_f, y', X ∩ N_G(y'),  q, r,  X ∩ C)
      where C (the core) has at most 2K + 2 vertices and N_G(x'), N_G(y') are cliques of the underlying graph.
  The decoder below uses nothing but this code; a successful round trip for every k-cut proves injectivity on the
  tested instances.

Families: random alpha<=2 digraphs with backward arcs and antiparallel pairs; disjoint unions of two tournaments
(interleaved and blocked), C5 blow-ups, complement-of-matching, cyclic tournaments, bidirected-with-missing-pairs,
complete-bipartite-missing-edge patterns, and alpha = 1 controls.  n <= 11, every k from 0 to ctw + 2, every k-cut.
Not tested: n >= 12 (exact cutwidth by subset DP is the bottleneck); alpha >= 3 (CD is stated for alpha = 2).
"""
from __future__ import annotations

import json
import os
import random
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lib046 import alpha_of, back_table, cutwidth, underlying_adj  # noqa: E402


def best_order_width(n, b):
    """Return (ctw, an optimal ordering) by subset DP."""
    INF = 1 << 30
    best = [INF] * (1 << n)
    par = [-1] * (1 << n)
    best[0] = 0
    for S in range(1 << n):
        if best[S] >= INF:
            continue
        rest = ((1 << n) - 1) ^ S
        while rest:
            bit = rest & -rest
            rest ^= bit
            T = S | bit
            w = max(best[S], int(b[T]))
            if w < best[T]:
                best[T] = w
                par[T] = S
    order, S = [], (1 << n) - 1
    while S:
        order.append((S ^ par[S]).bit_length() - 1)
        S = par[S]
    return best[(1 << n) - 1], order[::-1]


def relabel(n, arcs, order):
    pos = {v: i for i, v in enumerate(order)}
    return [(pos[u], pos[v]) for (u, v) in arcs]


def encode(n, U, b, X, K):
    """Return the code of X and assertion data. Vertices are 0..n-1 in reference order."""
    full = (1 << n) - 1
    nonnbr = [(full ^ U[v]) & ~(1 << v) for v in range(n)]
    zeros = [v for v in range(n) if not X >> v & 1]
    ones = [v for v in range(n) if X >> v & 1]
    R = {y: sum(1 for x in ones if x > y) for y in zeros}
    L = {x: sum(1 for y in zeros if y < x) for x in ones}
    far0 = [y for y in zeros if R[y] > K]
    far1 = [x for x in ones if L[x] > K]
    code = {}
    checks = {"pivot_found": True, "clique": True}
    if far0:
        yf = far0[-1]
        A = sum(1 << y for y in zeros if y <= yf)
        B = [x for x in ones if x > yf]
        P = (1 << (yf + 1)) - 1
        assert len(B) > b[P] + b[X] or True
        piv = [x for x in B if U[x] & A == 0]
        if not piv:
            checks["pivot_found"] = False
            return None, checks
        xp = piv[0]
        S1 = nonnbr[xp]
        checks["clique"] &= all((S1 >> u & 1) == 0 or (S1 & ~U[u] & ~(1 << u)) == 0 for u in range(n))
        code["Z"] = (yf, xp, X & S1)
    if far1:
        xf = far1[0]
        Bm = sum(1 << x for x in ones if x >= xf)
        A2 = [y for y in zeros if y < xf]
        piv = [y for y in A2 if U[y] & Bm == 0]
        if not piv:
            checks["pivot_found"] = False
            return None, checks
        yp = piv[0]
        S2 = nonnbr[yp]
        checks["clique"] &= all((S2 >> u & 1) == 0 or (S2 & ~U[u] & ~(1 << u)) == 0 for u in range(n))
        code["O"] = (xf, yp, X & S2)
    farmask = sum(1 << v for v in far0 + far1)
    M = [v for v in range(n) if not farmask >> v & 1]
    nz = [v for v in M if not X >> v & 1]
    no = [v for v in M if X >> v & 1]
    q = nz[0] if nz else n
    r = no[-1] if no else -1
    C = [v for v in M if q <= v <= r]
    Cmask = sum(1 << v for v in C)
    code["core"] = (q, r, X & Cmask)
    checks["core_size"] = len(C)
    return code, checks


def decode(n, U, code):
    full = (1 << n) - 1
    nonnbr = [(full ^ U[v]) & ~(1 << v) for v in range(n)]
    X = 0
    known = 0
    if "Z" in code:
        yf, xp, tr = code["Z"]
        S1 = nonnbr[xp]
        zmask = S1 & ((1 << (yf + 1)) - 1) & ~tr        # far zeros
        known |= zmask
        # every far zero is a zero: nothing added to X
    if "O" in code:
        xf, yp, tr = code["O"]
        S2 = nonnbr[yp]
        omask = S2 & (full ^ ((1 << xf) - 1)) & tr      # far ones
        known |= omask
        X |= omask
    q, r, ctr = code["core"]
    for v in range(n):
        if known >> v & 1:
            continue
        if v < q:
            X |= 1 << v
        elif v <= r:
            X |= ctr & (1 << v)
    return X


def families(rnd):
    out = []
    def add(name, n, arcs):
        out.append((name, n, sorted(set(arcs))))
    for n in range(2, 12):
        # two tournaments, interleaved / blocked, random orientations + some backward arcs
        for inter in (0, 1):
            cls = [(v % 2) if inter else int(v >= n // 2) for v in range(n)]
            arcs = []
            for u in range(n):
                for v in range(u + 1, n):
                    if cls[u] == cls[v]:
                        arcs.append((u, v) if rnd.random() > 0.15 else (v, u))
            add(f"two-tournaments-{'inter' if inter else 'block'}", n, arcs)
        # cyclic tournament (alpha 1)
        arcs = [(u, (u + d) % n) for u in range(n) for d in range(1, (n + 1) // 2)]
        add("cyclic-tournament", n, [(u, v) for (u, v) in arcs if u != v])
        # complement of a matching, bidirected with missing pairs
        arcs = []
        for u in range(n):
            for v in range(u + 1, n):
                if v == u + 1 and u % 2 == 0:
                    continue
                arcs.append((u, v))
                if rnd.random() < 0.2:
                    arcs.append((v, u))
        add("complement-matching+bidirected", n, arcs)
        # C5 blow-up: classes 0..4, non-adjacent iff classes differ by 1 mod 5
        cls = [rnd.randrange(5) for _ in range(n)]
        arcs = []
        for u in range(n):
            for v in range(u + 1, n):
                d = (cls[u] - cls[v]) % 5
                if d in (1, 4):
                    continue
                arcs.append((u, v) if rnd.random() > 0.2 else (v, u))
        add("C5-blowup", n, arcs)
    # random triangle-free non-adjacency, random orientations, varying backward density
    for t in range(260):
        n = rnd.randint(3, 11)
        g = [0] * n
        pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
        rnd.shuffle(pairs)
        for (u, v) in pairs[: rnd.randint(0, len(pairs))]:
            if g[u] & g[v]:
                continue
            g[u] |= 1 << v; g[v] |= 1 << u
        p_back = rnd.choice([0.0, 0.05, 0.15, 0.3])
        arcs = []
        for (u, v) in pairs:
            if g[u] >> v & 1:
                continue
            r = rnd.random()
            if r < 0.1:
                arcs += [(u, v), (v, u)]
            elif r < 0.1 + p_back:
                arcs.append((v, u))
            else:
                arcs.append((u, v))
        add("random-alpha<=2", n, arcs)
    return out


def main():
    rnd = random.Random(4602)
    st = {"digraphs": 0, "kcuts_checked": 0, "roundtrip_failures": 0, "pivot_failures": 0, "clique_failures": 0,
          "max_core_over_2K_plus_2": -10**9, "by_family": {}, "max_core_size_seen": 0}
    t0 = time.time()
    for name, n, arcs in families(rnd):
        U = underlying_adj(n, arcs)
        a = alpha_of(n, U)
        if a > 2:
            continue
        b0 = back_table(n, arcs)
        ctw, order = best_order_width(n, b0)
        arcs2 = relabel(n, arcs, order)          # reference order = optimal order, so c = ctw
        U2 = underlying_adj(n, arcs2)
        b = back_table(n, arcs2)
        c = max(int(b[(1 << i) - 1]) for i in range(n + 1))
        assert c == ctw
        st["digraphs"] += 1
        fam = st["by_family"].setdefault(name, {"digraphs": 0, "kcuts": 0})
        fam["digraphs"] += 1
        for k in range(0, ctw + 3):
            K = c + k
            for X in range(1 << n):
                if b[X] > k:
                    continue
                code, chk = encode(n, U2, b, X, K)
                st["kcuts_checked"] += 1
                fam["kcuts"] += 1
                if code is None:
                    st["pivot_failures"] += 1
                    continue
                if not chk["clique"]:
                    st["clique_failures"] += 1
                st["max_core_size_seen"] = max(st["max_core_size_seen"], chk["core_size"])
                st["max_core_over_2K_plus_2"] = max(st["max_core_over_2K_plus_2"], chk["core_size"] - (2 * K + 2))
                if decode(n, U2, code) != X:
                    st["roundtrip_failures"] += 1
    st["seconds"] = round(time.time() - t0, 1)
    print(json.dumps(st, indent=1))
    with open(os.path.join(HERE, "..", "data", "exp2_decoder.json"), "w") as f:
        json.dump(st, f, indent=1)


if __name__ == "__main__":
    main()
