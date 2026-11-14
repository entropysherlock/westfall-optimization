"""
Mission 041 — independent reference code for h-semicomplete digraphs.

Definitions (backward convention, as in Mission 040 / Fomin–Pilipczuk ESA 2013):
  * digraph on {0..n-1}: arcs (u, v), u != v; antiparallel pairs allowed.
  * u, v (u != v) are NON-ADJACENT if neither u->v nor v->u is an arc.
  * nonadj(u) = number of non-neighbours of u;  D is h-semicomplete iff max_u nonadj(u) <= h.
    (h = 0 is exactly "semicomplete".)
  * back(X) = #arcs from V\\X into X; k-cut iff back(X) <= k; width / cutwidth as in Mission 040.

Quantities checked against brute force:
  * defect rectangle lemma:  a*b <= back(P) + back(X) + h*min(a, b),  a = |P\\X|, b = |X\\P|,  for EVERY P, X
    (not only prefixes) and also the sharper  a*b <= back(P) + back(X) + nonadjacent pairs in the rectangle.
  * column encoding mu_s(X) (members of X preceded by >= s non-members), and the two shifted-hyperbola bounds
        s * (mu_s - h)_+ <= K   and   mu_s * (s - h)_+ <= K,        K = c + k.
  * injectivity of X -> (|X|, first h rows, residual (mu_s - h)_+ ).
  * counting bounds:  Conjecture 041-A  (n+1)^(2h+1) H(K);  new  (n+1) R_h(K) H(K);  exact per-size count.
"""
from __future__ import annotations

import os
import sys
from functools import lru_cache

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "westfall-040", "tests"))
from kcut_lib import H, Digraph, back_table, cutwidth, optimal_ordering, ordering_width  # noqa: E402,F401


def nonadjacency(D: Digraph) -> list[int]:
    """bitmask of non-neighbours of each vertex"""
    n = D.n
    full = (1 << n) - 1
    return [full & ~(D.out[u] | D.inn[u] | (1 << u)) for u in range(n)]


def defect_h(D: Digraph) -> int:
    return max((bin(m).count("1") for m in nonadjacency(D)), default=0)


@lru_cache(maxsize=None)
def R(h: int, K: int) -> int:
    """#{lambda_1 >= ... >= lambda_h >= 0 : lambda_i <= floor(K/i) + h}  (first-h-rows choices)."""
    def rec(i, maxv):
        if i > h:
            return 1
        return sum(rec(i + 1, x) for x in range(min(maxv, K // i + h) + 1))
    return rec(1, K + h)


def mu_vector(order, X: int):
    """mu_s for s = 1..n along the reference ordering `order`."""
    n = len(order)
    zeros = 0
    zb = []  # zeros-before for each member of X
    for v in order:
        if X >> v & 1:
            zb.append(zeros)
        else:
            zeros += 1
    return [sum(1 for z in zb if z >= s) for s in range(1, n + 1)]


def rows_from_mu(mu, h):
    """first h row lengths: lambda_i = #{s >= 1 : mu_s >= i}"""
    return tuple(sum(1 for m in mu if m >= i) for i in range(1, h + 1))


def encode_shifted(order, X: int, h: int, K: int):
    mu = mu_vector(order, X)
    resid = tuple(max(m - h, 0) for m in mu[:K]) if K > 0 else ()
    return bin(X).count("1"), rows_from_mu(mu, h), resid


def decode_mu(rows, resid, h, n):
    """reconstruct mu_s (s = 1..n) from the first h rows and the residual (mu_s - h)_+ for s <= K."""
    mu = []
    for s in range(1, n + 1):
        r = resid[s - 1] if s - 1 < len(resid) else 0
        if r > 0:
            mu.append(r + h)
        else:
            mu.append(sum(1 for lam in rows if lam >= s))
    return mu
