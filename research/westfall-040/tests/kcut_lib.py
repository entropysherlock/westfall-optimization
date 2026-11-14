"""
Independent reference implementation for the Mission 040 counterexample hunt.

Nothing here reuses the candidate proof's encoding: cutwidth is computed by an exact subset dynamic program,
k-cuts by brute-force enumeration of all 2^n ordered bipartitions, and H(K) by a dynamic program over the
defining inequalities. The candidate's injection is implemented separately (encode/decode) so that it can be
checked against the brute force, never used to produce the counts.

Conventions (Fomin-Pilipczuk ESA 2013, Definitions 2 and 4; "backward" convention):
  * A digraph on {0..n-1} is a set of arcs (u, v), u != v; antiparallel pairs are allowed, loops are not.
  * Semicomplete: for every u != v at least one of (u, v), (v, u) is an arc.
  * For X subset V, Y = V \\ X:  back(X) = #{arcs (y, x) : y in Y, x in X}.   (X, Y) is a k-cut iff back(X) <= k.
  * For an ordering sigma and t in 0..n:  width_t = back({sigma_1..sigma_t}); width(sigma) = max_t width_t;
    ctw(D) = min over orderings.  (Equivalently: arcs from the suffix to the prefix.)
The JCTB 2019 journal version counts *forward* arcs instead; that is the same theory for the reverse digraph.
"""
from __future__ import annotations

import itertools
import random
from functools import lru_cache


# ----------------------------------------------------------------------------- digraphs as adjacency bitmasks

class Digraph:
    """out[u] is a bitmask of v with arc u -> v;  inn[v] is a bitmask of u with arc u -> v."""

    def __init__(self, n: int, arcs):
        self.n = n
        self.out = [0] * n
        self.inn = [0] * n
        for (u, v) in arcs:
            assert u != v and 0 <= u < n and 0 <= v < n
            self.out[u] |= 1 << v
            self.inn[v] |= 1 << u

    def arcs(self):
        return [(u, v) for u in range(self.n) for v in range(self.n) if self.out[u] >> v & 1]

    def is_semicomplete(self) -> bool:
        return all((self.out[u] >> v & 1) or (self.out[v] >> u & 1) for u in range(self.n) for v in range(u + 1, self.n))

    def reverse(self) -> "Digraph":
        return Digraph(self.n, [(v, u) for (u, v) in self.arcs()])


def back_table(D: Digraph) -> list[int]:
    """back[X] = number of arcs from V\\X into X, for every subset X (bitmask), in O(2^n n)."""
    n = D.n
    full = (1 << n) - 1
    back = [0] * (1 << n)
    for X in range(1, 1 << n):
        v = (X & -X).bit_length() - 1
        Xp = X ^ (1 << v)
        # adding v to Xp:  + arcs from Y=V\X into v,  - arcs from v into Xp (they were Y->X before)
        back[X] = back[Xp] + bin(D.inn[v] & (full ^ X)).count("1") - bin(D.out[v] & Xp).count("1")
    return back


def back_naive(D: Digraph, X: int) -> int:
    return sum(1 for (u, v) in D.arcs() if not (X >> u & 1) and (X >> v & 1))


def cutwidth(D: Digraph, back=None) -> int:
    """Exact cutwidth: f(S) = max(back(S), min_{v in S} f(S \\ v)), f(empty) = 0; ctw = f(V)."""
    n = D.n
    back = back or back_table(D)
    INF = 1 << 60
    f = [INF] * (1 << n)
    f[0] = 0
    for S in range(1, 1 << n):
        best = INF
        T = S
        while T:
            b = T & -T
            T ^= b
            if f[S ^ b] < best:
                best = f[S ^ b]
        f[S] = max(back[S], best)
    return f[(1 << n) - 1]


def ordering_width(D: Digraph, order, back=None) -> int:
    back = back or back_table(D)
    S, w = 0, back[0]
    for v in order:
        S |= 1 << v
        w = max(w, back[S])
    return w


def optimal_ordering(D: Digraph, back=None):
    """Recover an ordering attaining ctw (used as a reference ordering in the tests)."""
    n = D.n
    back = back or back_table(D)
    INF = 1 << 60
    f = [INF] * (1 << n)
    arg = [-1] * (1 << n)
    f[0] = 0
    for S in range(1, 1 << n):
        best, bv = INF, -1
        T = S
        while T:
            b = T & -T
            T ^= b
            if f[S ^ b] < best:
                best, bv = f[S ^ b], b.bit_length() - 1
        f[S] = max(back[S], best)
        arg[S] = bv
    order, S = [], (1 << n) - 1
    while S:
        v = arg[S]
        order.append(v)
        S ^= 1 << v
    return order[::-1]


# ----------------------------------------------------------------------------- H(K)

@lru_cache(maxsize=None)
def H(K: int) -> int:
    """#{lambda_1 >= lambda_2 >= ... >= 0 : i*lambda_i <= K for all i} (finitely many nonzero), exactly."""
    if K <= 0:
        return 1
    # cnt[m] = number of valid tails (lambda_i, lambda_{i+1}, ...) with lambda_i <= m, processed for i = K .. 1
    cap = [0] + [K // i for i in range(1, K + 1)]
    # tails starting at i = K+1 are all zero: 1 way for any bound
    prev = None  # cumulative counts for position i+1, indexed by value bound m
    for i in range(K, 0, -1):
        c = cap[i]
        # ways(i, value x) = number of tails from i+1 with lambda_{i+1} <= x  = prevcum(min(x, cap[i+1]))
        cur = [0] * (c + 1)
        acc = 0
        for x in range(c + 1):
            if prev is None:
                w = 1
            else:
                w = prev[min(x, len(prev) - 1)]
            acc += w
            cur[x] = acc  # cumulative: tails from i with lambda_i <= x
        prev = cur
    return prev[len(prev) - 1]


def H_bruteforce(K: int) -> int:
    """Independent check of H for small K by recursive enumeration."""
    def rec(i, maxv):
        if i > K or maxv == 0:
            return 1
        return sum(rec(i + 1, x) for x in range(min(maxv, K // i) + 1))
    return rec(1, K)


def H_box(K: int, a: int, b: int) -> int:
    """#{lambda_1>=...>=lambda_a>=0 : lambda_1 <= b, i*lambda_i <= K} (partitions in an a x b box under the hyperbola)."""
    @lru_cache(maxsize=None)
    def rec(i, maxv):
        if i > a:
            return 1
        return sum(rec(i + 1, x) for x in range(min(maxv, K // i) + 1))
    return rec(1, b)


# ----------------------------------------------------------------------------- the candidate encoding (tested, not trusted)

def encode(order, X: int):
    """Word along the reference ordering: 1 = vertex in X.  lambda_i = #zeros before the i-th one from the right."""
    word = [(X >> v) & 1 for v in order]
    ones = [p for p, b in enumerate(word) if b]
    lam = []
    for i, p in enumerate(reversed(ones), start=1):
        lam.append(sum(1 for q in range(p) if word[q] == 0))
    return len(ones), tuple(lam)


def decode(order, a: int, lam):
    n = len(order)
    pos = [lam[i - 1] + (a - i) for i in range(1, a + 1)]  # 0-based position of the i-th one from the right
    X = 0
    for p in pos:
        assert 0 <= p < n
        X |= 1 << order[p]
    return X


def rectangle_ok(order, X: int, c: int, k: int) -> bool:
    a, lam = encode(order, X)
    return all(i * l <= c + k for i, l in enumerate(lam, start=1)) and all(lam[i] >= lam[i + 1] for i in range(len(lam) - 1))


# ----------------------------------------------------------------------------- generators

def all_semicomplete(n: int):
    pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
    for states in itertools.product((0, 1, 2), repeat=len(pairs)):
        arcs = []
        for (u, v), s in zip(pairs, states):
            if s in (0, 2):
                arcs.append((u, v))
            if s in (1, 2):
                arcs.append((v, u))
        yield Digraph(n, arcs)


def random_semicomplete(n: int, rnd: random.Random, p_both=0.25, p_forward=0.5):
    arcs = []
    for u in range(n):
        for v in range(u + 1, n):
            r = rnd.random()
            if r < p_both:
                arcs += [(u, v), (v, u)]
            elif rnd.random() < p_forward:
                arcs.append((u, v))
            else:
                arcs.append((v, u))
    return Digraph(n, arcs)


def near_transitive(n: int, flips: int, rnd: random.Random, both=0):
    """Transitive tournament (arcs from earlier to later index), `flips` reversed pairs, `both` bidirected pairs, relabelled."""
    pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]
    flip = set(rnd.sample(pairs, min(flips, len(pairs))))
    bi = set(rnd.sample(pairs, min(both, len(pairs))))
    perm = list(range(n))
    rnd.shuffle(perm)
    arcs = []
    for (u, v) in pairs:
        a, b = (v, u) if (u, v) in flip else (u, v)
        arcs.append((perm[a], perm[b]))
        if (u, v) in bi:
            arcs.append((perm[b], perm[a]))
    return Digraph(n, arcs)


def cyclic_tournament(n: int):
    """Vertex i beats i+1..i+floor((n-1)/2) mod n (regular for odd n)."""
    arcs = set()
    for i in range(n):
        for d in range(1, (n - 1) // 2 + 1):
            arcs.add((i, (i + d) % n))
    for u in range(n):
        for v in range(u + 1, n):
            if (u, v) not in arcs and (v, u) not in arcs:
                arcs.add((u, v))
    return Digraph(n, arcs)


def paley(p: int):
    sq = {(z * z) % p for z in range(1, p)}
    return Digraph(p, [(u, v) for u in range(p) for v in range(p) if u != v and (v - u) % p in sq])


def complete_bidirected(n: int):
    return Digraph(n, [(u, v) for u in range(n) for v in range(n) if u != v])


def H_formal(K: int) -> int:
    """Count exactly as the Lean definition `Westfall040.H`: antitone f : Fin K -> Fin (K+1) with (s+1)*f(s) <= K."""
    def rec(s, maxv):
        if s == K:
            return 1
        return sum(rec(s + 1, x) for x in range(min(maxv, K // (s + 1)) + 1))
    return rec(0, K)
