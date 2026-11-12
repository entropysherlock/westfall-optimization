"""Vectorised subset DP. dp[m] = OPT(A restricted to m) (within-set optimum)."""
import numpy as np

def popcount_layers(n):
    m = np.arange(1 << n, dtype=np.int64)
    pc = np.zeros(1 << n, dtype=np.int8)
    for u in range(n):
        pc += ((m >> u) & 1).astype(np.int8)
    order = np.argsort(pc, kind='stable')
    bounds = np.searchsorted(pc[order], np.arange(n + 2))
    return [order[bounds[k]:bounds[k + 1]] for k in range(n + 1)]

def gains(A, dtype):
    """g[v][m] = sum_{u in m} a_{u v}."""
    n = A.shape[0]
    G = []
    for v in range(n):
        g = np.zeros(1, dtype=dtype)
        for u in range(n):
            g = np.concatenate([g, g + dtype(A[u, v])])
        G.append(g)
    return G

def subset_dp(A, dtype=np.float64, layers=None, G=None):
    n = A.shape[0]
    layers = layers if layers is not None else popcount_layers(n)
    G = G if G is not None else gains(A, dtype)
    NEG = np.finfo(np.float64).min / 4 if dtype == np.float64 else np.iinfo(dtype).min // 2
    dp = np.full(1 << n, NEG, dtype=dtype)
    dp[0] = 0
    for k in range(1, n + 1):
        L = layers[k]
        best = np.full(len(L), NEG, dtype=dtype)
        for v in range(n):
            has = ((L >> v) & 1).astype(bool)
            prev = L[has] ^ (1 << v)
            cand = dp[prev] + G[v][prev]
            sub = best[has]
            best[has] = np.maximum(sub, cand)
        dp[L] = best
    return dp, layers, G

def subset_dp_forced(A, y, x, layers, G):
    """Like subset_dp but only orders with y before x."""
    n = A.shape[0]; NEG = -1e300
    dp = np.full(1 << n, NEG); dp[0] = 0
    for k in range(1, n + 1):
        L = layers[k]; best = np.full(len(L), NEG)
        for v in range(n):
            has = ((L >> v) & 1).astype(bool)
            if v == x:
                has &= ((L >> y) & 1).astype(bool)
            prev = L[has] ^ (1 << v)
            best[has] = np.maximum(best[has], dp[prev] + G[v][prev])
        dp[L] = best
    return dp[(1 << n) - 1]
