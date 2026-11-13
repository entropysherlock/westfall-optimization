r"""Mission 027: k-cuts in semi-complete digraphs of bounded cutwidth, counted by partitions under a hyperbola.

A digraph is given by adj[u][v] in {0,1} (arc u -> v). Semi-complete: adj[u][v] + adj[v][u] >= 1 for u != v.
cut(S) = number of arcs from the complement of S into S.  A k-cut is a set S with cut(S) <= k.
The width of an ordering is the maximum cut of its prefixes; cutwidth = minimum width.
Sets are bitmasks.
"""
from functools import lru_cache


def H_table(Kmax):
    """H[K] = number of partitions (l_1 >= l_2 >= ... > 0, the empty one included) with i * l_i <= K for all i."""
    out = []
    for K in range(Kmax + 1):
        out.append(H(K))
    return out


def H(K):
    # f[m] = number of admissible tails (l_i, l_{i+1}, ...) with l_i <= m; zeros end the partition
    f = [1] * (K + 2)
    for i in range(K, 0, -1):
        cap = K // i
        pre = [0] * (K + 2); acc = 0
        for v in range(K + 1):
            if v <= cap: acc += f[v]
            pre[v] = acc
        f = pre
    return f[K]


def cut(adj, S):
    n = len(adj)
    return sum(adj[w][u] for w in range(n) if not S >> w & 1 for u in range(n) if S >> u & 1)


def cutwidth_bruteforce(adj):
    """Exact cutwidth and an optimal ordering by the 2^n subset DP (reference implementation)."""
    n = len(adj); N = 1 << n
    c = [cut(adj, S) for S in range(N)]
    w = [0] * N; arg = [-1] * N
    for S in range(1, N):
        best = None
        for v in range(n):
            if S >> v & 1:
                val = max(w[S & ~(1 << v)], c[S])
                if best is None or val < best: best, arg[S] = val, v
        w[S] = best
    order = []; S = N - 1
    while S: order.append(arg[S]); S &= ~(1 << arg[S])
    return w[N - 1], order[::-1]


def shape(S, order):
    """(a, s): a = number of leading members of S in the ordering; s_i = number of members after the i-th non-member
    (only the positive values). S is determined by (a, s)."""
    members_after = sum(1 for v in order if S >> v & 1); a = 0; s = []; lead = True
    for v in order:
        if S >> v & 1:
            members_after -= 1
            if lead: a += 1
        else:
            lead = False
            if members_after > 0: s.append(members_after)
    return a, tuple(s)


def cutwidth_at_most(adj, k, H2k=None):
    """Decide cutwidth <= k by breadth-first generation of the k-cuts reachable from the empty set, aborting as soon as
    more than (n+1) * H(2k) of them are found (then cutwidth > k by the counting theorem).
    Returns (answer, number of cuts generated, aborted)."""
    n = len(adj); cap = (n + 1) * (H(2 * k) if H2k is None else H2k)
    inn = [sum(1 << w for w in range(n) if adj[w][u]) for u in range(n)]     # in-neighbours of u
    out = [sum(1 << w for w in range(n) if adj[u][w]) for u in range(n)]     # out-neighbours of u
    full = (1 << n) - 1; layer = {0: 0}; total = 1
    for _ in range(n):
        nxt = {}
        for S, cS in layer.items():
            for v in range(n):
                if S >> v & 1: continue
                T = S | 1 << v
                if T in nxt: continue
                # arcs into T from outside: old ones not starting at v, plus arcs into v from outside T
                cT = cS - bin(out[v] & S).count('1') + bin(inn[v] & ~T & full).count('1')
                if cT <= k: nxt[T] = cT
        total += len(nxt)
        if total > cap: return False, total, True
        layer = nxt
        if not layer: return False, total, False
    return full in layer, total, False


def ola_bruteforce(adj):
    """Exact OLA cost: min over orderings of sum of lengths of backward arcs = sum over prefixes of cut(prefix)."""
    n = len(adj); N = 1 << n
    g = [0] * N
    for S in range(1, N):
        c = cut(adj, S) if S != N - 1 else 0
        g[S] = c + min(g[S & ~(1 << v)] for v in range(n) if S >> v & 1)
    return g[N - 1]


def ola_width_bound(k):
    """Any ordering of OLA cost <= k has width <= this value (proved in REPORT.md)."""
    d = 0
    while (d + 1) * (d + 2) * (2 * d + 3) // 6 <= k: d += 1      # largest d with sum_{l<=d} l^2 <= k
    return (d + 1) * (d + 2) // 2 - 1


def ola_at_most(adj, k):
    """Decide OLA cost <= k by DP over c-cuts, c = ola_width_bound(k), with the hyperbola cap."""
    n = len(adj); c = ola_width_bound(k); cap = (n + 1) * H(2 * c)
    inn = [sum(1 << w for w in range(n) if adj[w][u]) for u in range(n)]
    out = [sum(1 << w for w in range(n) if adj[u][w]) for u in range(n)]
    full = (1 << n) - 1; layer = {0: (0, 0)}; total = 1          # S -> (cut(S), best cost)
    for _ in range(n):
        nxt = {}
        for S, (cS, gS) in layer.items():
            for v in range(n):
                if S >> v & 1: continue
                T = S | 1 << v
                cT = cS - bin(out[v] & S).count('1') + bin(inn[v] & ~T & full).count('1')
                if cT > c: continue
                val = gS + cT
                if T not in nxt or val < nxt[T][1]: nxt[T] = (cT, val)
        total += len(nxt)
        if total > cap: return False, total, True
        layer = nxt
        if not layer: return False, total, False
    return (full in layer and layer[full][1] <= k), total, False
