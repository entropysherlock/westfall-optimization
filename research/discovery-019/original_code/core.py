"""Core utilities for WESTFALL Discovery 015 experiments."""
import numpy as np
from itertools import permutations

def qr_set(p):
    return {(z * z) % p for z in range(1, p)}

def paley_sign(p):
    Q = qr_set(p)
    S = np.zeros((p, p))
    for i in range(p):
        for j in range(p):
            if i != j:
                S[i, j] = 1.0 if ((j - i) % p) in Q else -1.0
    return S

def build(p, eps=0.05, seed=14013, variant=0):
    """Weighted QR tournament. Several draw-order variants, since the brief does
    not pin down how the uniform perturbations were drawn."""
    rng = np.random.default_rng(seed + p)
    S = paley_sign(p)
    A = np.zeros((p, p))
    if variant == 0:      # one draw per upper pair, row-major
        for i in range(p):
            for j in range(i + 1, p):
                A[i, j] = S[i, j] + rng.uniform(-eps, eps)
    elif variant == 1:    # full matrix drawn at once
        U = rng.uniform(-eps, eps, size=(p, p))
        for i in range(p):
            for j in range(i + 1, p):
                A[i, j] = S[i, j] + U[i, j]
    elif variant == 2:    # vector of upper entries
        iu = np.triu_indices(p, 1)
        U = rng.uniform(-eps, eps, size=len(iu[0]))
        A[iu] = S[iu] + U
    for i in range(p):
        for j in range(i + 1, p):
            A[j, i] = -A[i, j]
    return A

def score(A, perm):
    perm = list(perm)
    idx = np.array(perm)
    M = A[np.ix_(idx, idx)]
    return float(np.triu(M, 1).sum())

def dp_opt(A, forced=None):
    """Exact Held-Karp style DP over subsets. forced: list of (u,v) meaning u must
    precede v. Returns (opt, order)."""
    n = A.shape[0]
    N = 1 << n
    pred = np.zeros(n, dtype=np.int64)          # bitmask of vertices that must precede v
    if forced:
        for u, v in forced:
            pred[v] |= (1 << u)
    # gain[v][S] = sum_{u in S} a_{u v}, computed incrementally
    dp = np.full(N, -np.inf)
    dp[0] = 0.0
    choice = np.full(N, -1, dtype=np.int64)
    # precompute column sums per subset via low-bit recursion for each v
    masks = np.arange(N, dtype=np.int64)
    low = masks & (-masks)
    lowidx = np.zeros(N, dtype=np.int64)
    lowidx[1:] = np.log2(low[1:]).astype(np.int64)
    popc = np.array([bin(m).count('1') for m in range(N)]) if n <= 16 else None
    gain = np.zeros((n, N))
    for v in range(n):
        g = gain[v]
        for m in range(1, N):
            g[m] = g[m ^ low[m]] + A[lowidx[m], v]
    order_by_size = np.argsort(popc, kind='stable') if popc is not None else range(N)
    for m in order_by_size:
        if dp[m] == -np.inf:
            continue
        for v in range(n):
            bit = 1 << v
            if m & bit or (pred[v] & ~m):
                continue
            val = dp[m] + gain[v][m]
            mm = m | bit
            if val > dp[mm]:
                dp[mm] = val
                choice[mm] = v
    # reconstruct
    m = N - 1
    order = []
    while m:
        v = choice[m]
        order.append(v)
        m ^= (1 << v)
    return float(dp[N - 1]), order[::-1]
