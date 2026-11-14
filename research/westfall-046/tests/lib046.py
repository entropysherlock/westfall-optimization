"""
Mission 046 — exact tools for k-cut counting on digraphs of bounded independence number.

Conventions (ESA 2013 / brief §1):  b_D(X) = #{(u,v) in E : u not in X, v in X};  X is a k-cut iff b_D(X) <= k.
An ordering has width <= c iff every prefix P has b_D(P) <= c.

Two models are used.
* General model: an arbitrary digraph given by arc list; b_D is tabulated for all 2^n subsets.
* Forward model: vertices 0..n-1 in the reference order sigma, U an undirected graph, every U-edge {i<j} is the
  single arc i -> j. Then every prefix has b = 0 (c = 0), alpha(D) = alpha(U), and
      b_D(X) = inv_U(X) = #{i<j : ij in U, i not in X, j in X}.
  N_k of a forward-model digraph is the number of X with inv_U(X) <= k.
"""
from __future__ import annotations

import itertools
from functools import lru_cache

import numpy as np

_POP16 = np.array([bin(i).count("1") for i in range(1 << 16)], dtype=np.int32)


def popcount(a: np.ndarray) -> np.ndarray:
    a = a.astype(np.int64)
    out = _POP16[a & 0xFFFF]
    a = a >> 16
    while np.any(a):
        out = out + _POP16[a & 0xFFFF]
        a = a >> 16
    return out


# ---------------------------------------------------------------- general digraphs
def back_table(n: int, arcs) -> np.ndarray:
    """b_D(X) for all X in [0, 2^n)."""
    X = np.arange(1 << n, dtype=np.int64)
    b = np.zeros(1 << n, dtype=np.int32)
    for (u, v) in arcs:
        b += (((X >> v) & 1) & (1 - ((X >> u) & 1))).astype(np.int32)
    return b


def cutwidth(n: int, b: np.ndarray) -> int:
    """Exact directed cutwidth by subset DP: best[S] = min over orderings of S-as-prefix of max prefix back."""
    INF = 1 << 30
    best = np.full(1 << n, INF, dtype=np.int64)
    best[0] = 0
    for S in range(1 << n):
        if best[S] >= INF:
            continue
        rest = ((1 << n) - 1) ^ S
        while rest:
            bit = rest & -rest
            rest ^= bit
            T = S | bit
            w = max(best[S], b[T])
            if w < best[T]:
                best[T] = w
    return int(best[(1 << n) - 1])


def alpha_of(n: int, adj: list[int]) -> int:
    """Independence number of the underlying undirected graph (adj = bitmask of neighbours)."""
    best = 0

    def rec(cand: int, size: int):
        nonlocal best
        if size + bin(cand).count("1") <= best:
            return
        if cand == 0:
            best = max(best, size)
            return
        v = (cand & -cand).bit_length() - 1
        rec(cand & ~adj[v] & ~(1 << v), size + 1)   # take v
        rec(cand & ~(1 << v), size)                  # skip v
    rec((1 << n) - 1, 0)
    return best


def underlying_adj(n: int, arcs) -> list[int]:
    adj = [0] * n
    for (u, v) in arcs:
        adj[u] |= 1 << v
        adj[v] |= 1 << u
    return adj


# ---------------------------------------------------------------- forward model
def inv_table(n: int, uadj: list[int]) -> np.ndarray:
    """inv_U(X) for all X: number of U-edges i<j with i not in X, j in X."""
    X = np.arange(1 << n, dtype=np.int64)
    notX = ((1 << n) - 1) ^ X
    inv = np.zeros(1 << n, dtype=np.int32)
    for j in range(n):
        lower = uadj[j] & ((1 << j) - 1)
        if lower:
            inv += ((X >> j) & 1).astype(np.int32) * popcount(notX & lower)
    return inv


def nk_counts(table: np.ndarray, kmax: int) -> list[int]:
    h = np.bincount(np.minimum(table, kmax + 1), minlength=kmax + 2)
    return [int(x) for x in np.cumsum(h)[: kmax + 1]]


def complement_adj(n: int, gadj: list[int]) -> list[int]:
    full = (1 << n) - 1
    return [(full ^ gadj[v]) & ~(1 << v) for v in range(n)]


def triangle_free(n: int, gadj: list[int]) -> bool:
    for u in range(n):
        for v in range(u + 1, n):
            if gadj[u] >> v & 1 and gadj[u] & gadj[v]:
                return False
    return True


# ---------------------------------------------------------------- partitions under the hyperbola
@lru_cache(maxsize=None)
def _H(K: int, i: int, cap: int) -> int:
    # partitions with parts lambda_i, lambda_{i+1}, ... (nonincreasing, <= cap) and j*lambda_j <= K
    if cap == 0:
        return 1
    tot = 1  # lambda_i = 0 and all later 0
    for v in range(1, min(cap, K // i) + 1):
        tot += _H(K, i + 1, v)
    return tot


def H(K: int) -> int:
    return _H(K, 1, K)
