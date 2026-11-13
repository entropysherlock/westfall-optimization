"""Mission 026 (research): strong-component recursion for weighted linear ordering.

Convention: A is skew-symmetric (a_uv = -a_vu), maximise F_A(pi) = sum_{r<s} a_{pi_r pi_s}.
D+ is the strict majority digraph: arc u -> v iff a_uv > 0. Zero margins are NOT arcs.
Sets are bitmasks.
"""
from fractions import Fraction


def sccs(A, U):
    """Strong components of D+[U] in topological order (sources first), as bitmasks. Tarjan, iterative-safe sizes."""
    n = len(A); idx = {}; low = {}; st = []; on = set(); out = []; c = [0]
    def dfs(v):
        idx[v] = low[v] = c[0]; c[0] += 1; st.append(v); on.add(v)
        for w in range(n):
            if U >> w & 1 and A[v][w] > 0:
                if w not in idx: dfs(w); low[v] = min(low[v], low[w])
                elif w in on: low[v] = min(low[v], idx[w])
        if low[v] == idx[v]:
            m = 0
            while True:
                w = st.pop(); on.discard(w); m |= 1 << w
                if w == v: break
            out.append(m)
    for v in range(n):
        if U >> v & 1 and v not in idx: dfs(v)
    return out[::-1]          # Tarjan emits sinks first


def bits(m):
    v = 0
    while m:
        if m & 1: yield v
        m >>= 1; v += 1


def solve(A):
    """Exact optimum by strong-component recursion. Returns (OPT, order, strong_states).

    OPT(U)        = sum_i OPT*(C_i) + sum_{i<j} a(C_i, C_j)   over SCCs C_1..C_m of D+[U] (topological order)
    OPT*(C), |C|=1: 0
    OPT*(C), C strongly connected: max_{v in C} a(v, C - v) + OPT(C - v)        (v placed first)
    """
    n = len(A); memo = {}
    def a_set(S, T): return sum(A[u][v] for u in bits(S) for v in bits(T))
    def strong(C):
        if C & (C - 1) == 0: return 0, [C.bit_length() - 1]
        if C in memo: return memo[C]
        best = None
        for v in bits(C):
            R = C & ~(1 << v)
            val, order = general(R)
            val += a_set(1 << v, R)
            if best is None or val > best[0]: best = (val, [v] + order)
        memo[C] = best
        return best
    def general(U):
        comps = sccs(A, U); val = 0; order = []; seen = 0
        for C in comps:
            v, o = strong(C)
            val += v + a_set(seen, C); order += o; seen |= C
        return val, order
    val, order = general((1 << n) - 1)
    return val, order, len(memo)


def restrict(A, C):
    vs = list(bits(C))
    return [[A[u][v] for v in vs] for u in vs]


def lam_circ(A, lam_fn):
    """lambda°(A) = max over strong components C of D+ of lambda(A[C])."""
    return max(lam_fn(restrict(A, C))[0] for C in sccs(A, (1 << len(A)) - 1))


def K0_tieblind(A, blocks):
    """K0 with zero cross margins not charged (used only for the lower-bound statement)."""
    n = len(A); bk = {v: i for i, B in enumerate(blocks) for v in B}
    c = [A[u][v] for u in range(n) for v in range(n) if bk[u] < bk[v] and A[u][v] != 0]
    if not c: return 0
    X = sum(-x for x in c if x < 0); Nm = sum(1 for x in c if x < 0)
    best = len(c)
    for tau in set(x for x in c if x > 0):
        best = min(best, Nm + sum(1 for x in c if 0 < x < tau) + X // tau)
    return best
