"""Discovery 022 -- exact (pure-integer) reference implementation and brute-force oracles for small n.

Definitions (A integer skew-symmetric, vertices 0..n-1, sets as bitmasks):
  cut(S)     = #{(w,u): w not in S, u in S, a[w][u] >= 0}          (pairs across the cut that do not strictly agree)
  C_k        = k-cuts reachable from {} by single-vertex steps through sets with cut <= k
  K0(B)      = min_tau [N^- + Z(tau) + floor(X/tau)]                (Discovery 021)
  lam(B)     = b(B)^2 + 3*K0(B);   lam(A) = min over ordered partitions
  omega(A)   = max over optimal orderings of max prefix cut
"""
import itertools
from functools import lru_cache
INF = float('inf')

def F(A, p): return sum(A[p[r]][p[s]] for r in range(len(p)) for s in range(r + 1, len(p)))

def all_optima(A):
    n = len(A); best = None; opt = []
    for p in itertools.permutations(range(n)):
        v = F(A, p)
        if best is None or v > best: best, opt = v, [p]
        elif v == best: opt.append(p)
    return best, opt

def cut(A, S):
    n = len(A)
    return sum(1 for w in range(n) if not S >> w & 1 for u in range(n) if S >> u & 1 and A[w][u] >= 0)

def omega_brute(A, opts):
    best = 0
    for p in opts:
        S = 0
        for v in p:
            S |= 1 << v; best = max(best, cut(A, S))
    return best

def K0(A, blocks):
    n = len(A); bk = {v: i for i, B in enumerate(blocks) for v in B}
    c = [A[u][v] for u in range(n) for v in range(n) if bk[u] < bk[v]]
    if not c: return 0
    X = sum(-x for x in c if x < 0); Nm = sum(1 for x in c if x < 0)
    best = len(c)                                   # tau = infinity
    for tau in set(x for x in c if x > 0):
        best = min(best, Nm + sum(1 for x in c if 0 <= x < tau) + X // tau)
    return best

def ordered_partitions(items):
    items = list(items)
    if not items: yield []; return
    first = items[0]; rest = items[1:]
    for r in range(len(rest) + 1):
        for comb in itertools.combinations(rest, r):
            blk = [first] + list(comb); rem = [x for x in rest if x not in comb]
            for p in ordered_partitions(rem):
                for pos in range(len(p) + 1): yield p[:pos] + [blk] + p[pos:]

def lam_brute(A):
    n = len(A); best = (INF, None)
    for B in ordered_partitions(range(n)):
        v = max(len(x) for x in B) ** 2 + 3 * K0(A, B)
        if v < best[0]: best = (v, B)
    return best

def partitions_P(M):
    """P(M) = sum_{j<=M} p(j)"""
    p = [1] + [0] * M
    for part in range(1, M + 1):
        for j in range(part, M + 1): p[j] += p[j - part]
    return sum(p)

def gen_cuts(A, k, cap=None):
    """layers[s] = dict S -> best prefix value f_k(S) over chains inside C_k. Returns None if cap exceeded."""
    n = len(A); layers = [{0: 0}]; total = 1; cuts = {0: 0}
    for s in range(1, n + 1):
        cur = {}
        for S, f in layers[-1].items():
            for v in range(n):
                if S >> v & 1: continue
                T = S | 1 << v
                if T not in cuts: cuts[T] = cut(A, T)
                if cuts[T] > k: continue
                g = f + sum(A[u][v] for u in range(n) if S >> u & 1)
                if T not in cur or g > cur[T]: cur[T] = g
        layers.append(cur); total += len(cur)
        if cap is not None and total > cap: return None, cuts
    return layers, cuts

def discover(A, layers, cuts, k):
    """Exact min over ordered partitions whose prefix unions are nodes with cut <= k//3 of b^2 + 3*K0, if <= k.
    For fixed (b, tau) minimise the integer  tau*(N^- + Z(tau)) + X  over chains (shortest path); K = floor(min/tau)."""
    n = len(A); full = (1 << n) - 1
    nodes = sorted((S for L in layers for S in L if cuts[S] <= k // 3), key=lambda S: bin(S).count('1'))
    if full not in set(nodes): return None
    taus = sorted(set(A[u][v] for u in range(n) for v in range(n) if A[u][v] > 0)) + [None]
    best = None
    for tau in taus:
        def phi(c):
            if tau is None: return 1
            return (tau if (c < 0 or c < tau) else 0) + (-c if c < 0 else 0)
        PH = [[phi(A[u][v]) for v in range(n)] for u in range(n)]
        for b in range(1, int(k ** 0.5) + 1):
            dist = {0: 0}; arg = {}
            for Cp in nodes[1:]:
                bd = None
                for C in nodes:
                    if C == Cp or C & ~Cp or C not in dist: continue
                    Y = Cp & ~C
                    if bin(Y).count('1') > b: continue
                    d = dist[C] + sum(PH[u][v] for u in range(n) if C >> u & 1 for v in range(n) if Y >> v & 1)
                    if bd is None or d < bd: bd = d; arg[Cp] = C
                if bd is not None: dist[Cp] = bd
            if full not in dist: continue
            K = dist[full] if tau is None else dist[full] // tau
            val = b * b + 3 * K
            if best is None or val < best[0]:
                chain = [full]
                while chain[-1]: chain.append(arg[chain[-1]])
                chain.reverse()
                B = [[v for v in range(n) if (chain[i + 1] & ~chain[i]) >> v & 1] for i in range(len(chain) - 1)]
                best = (val, B)
    if best is None: return None
    # report the true value of the witness (block cap b may exceed actual max block)
    B = best[1]; true = max(len(x) for x in B) ** 2 + 3 * K0(A, B)
    return (true, B) if true <= k else None

def auto_solve(A):
    """Partition-free exact algorithm (Theorem 2). Returns dict(OPT, lam, blocks, k, nodes)."""
    n = len(A); k = 1
    while True:
        layers, cuts = gen_cuts(A, k, cap=(n + 1) * partitions_P(3 * k))
        if layers is not None and layers[n]:
            w = discover(A, layers, cuts, k)
            if w is not None:
                return dict(OPT=layers[n][(1 << n) - 1], lam_witness=w[0], blocks=w[1], k=k, nodes=sum(len(L) for L in layers))
        k *= 2
