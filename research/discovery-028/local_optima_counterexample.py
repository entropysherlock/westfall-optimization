"""REFUTATION of the local-optimum width conjecture (Mission 028, opportunity 7).

Conjecture (false): every prefix of every segment-swap local optimum has weak cut <= lambda(A).

Family W(p, q), n = p + q + 2, vertices a_1..a_p, b, c, d_1..d_q, parameters M = 1, H = p + q + 1, G = max(p, q) * H:
   a_i -> a_j (i < j): H        d_i -> d_j (i < j): H        b -> c: H
   a_i -> b: M (light)          c -> d_j: M (light)
   a_i -> c: G                  b -> d_j: G
   d_j -> a_i: H                (so A[a_i][d_j] = -H)
Ordering pi = a_1..a_p, b, c, d_1..d_q is a segment-swap local optimum whose prefix {a_1..a_p, b} has weak cut p*q.
Ordering sigma = b, d_1..d_q, a_1..a_p, c (singleton blocks) has K0 = p + q, hence lambda(A) <= 1 + 3(p + q).
So width(pi) - lambda(A) >= p*q - 1 - 3(p+q) > 0 as soon as e.g. (p, q) = (6, 7)  (n = 15):  42 > 40.
Everything below is exact integer arithmetic; local optimality is checked over ALL adjacent segment pairs."""
import json
from exact_reference import F, cut, K0

def build(p, q):
    n = p + q + 2; a = list(range(p)); b = p; c = p + 1; d = list(range(p + 2, n))
    M = 1; H = p + q + 1; G = max(p, q) * H
    A = [[0] * n for _ in range(n)]
    def arc(u, v, w): A[u][v] = w; A[v][u] = -w
    for i in range(p):
        for j in range(i + 1, p): arc(a[i], a[j], H)
    for i in range(q):
        for j in range(i + 1, q): arc(d[i], d[j], H)
    arc(b, c, H)
    for x in a: arc(x, b, M); arc(x, c, G)
    for y in d: arc(c, y, M); arc(b, y, G)
    for x in a:
        for y in d: arc(y, x, H)
    pi = a + [b, c] + d; sigma = [b] + d + a + [c]
    return A, pi, sigma

def is_local_opt(A, p):
    """all adjacent segments X = p[i:j], Y = p[j:k] have a(X, Y) >= 0 (prefix sums: O(n^3))"""
    n = len(p)
    for j in range(1, n):
        col = [0] * (n + 1)                      # col[k] = sum over v in p[j:k] handled incrementally per i
        for i in range(j - 1, -1, -1):
            run = 0
            for k in range(j, n):
                col[k] += A[p[i]][p[k]]          # col[k] = a(p[i:j], {p[k]})
                run += col[k]                    # run = a(p[i:j], p[j:k+1])
                if run < 0: return False
    return True

def width(A, p):
    S = 0; w = 0
    for v in p: S |= 1 << v; w = max(w, cut(A, S))
    return w

def report(p, q):
    A, pi, sigma = build(p, q); n = len(A)
    assert all(A[i][j] == -A[j][i] for i in range(n) for j in range(n))
    lo = is_local_opt(A, pi); w = width(A, pi)
    k0 = K0(A, [[v] for v in sigma]); lam_ub = 1 + 3 * k0
    return dict(p=p, q=q, n=n, pi_is_segment_swap_local_optimum=lo, width_pi=w, K0_sigma=k0, lambda_upper_bound=lam_ub,
                violation=lo and w > lam_ub, F_pi=F(A, pi), F_sigma=F(A, sigma), A=A if n <= 15 else None, pi=pi, sigma=sigma)

if __name__ == '__main__':
    # cross-check the fast local-optimality test against the definitional one on small cases
    from local_optima import is_local_opt as slow
    import itertools, random
    rng = random.Random(28003)
    for _ in range(300):
        n = rng.randint(2, 6); A = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(i + 1, n): A[i][j] = rng.randint(-3, 3); A[j][i] = -A[i][j]
        for perm in itertools.permutations(range(n)): assert slow(A, perm) == is_local_opt(A, list(perm))
    rows = [report(p, q) for (p, q) in [(2, 2), (4, 4), (6, 6), (6, 7), (7, 7), (10, 10), (20, 20), (40, 40)]]
    for r in rows: print({k: v for k, v in r.items() if k not in ('A', 'pi', 'sigma')})
    assert all(r['pi_is_segment_swap_local_optimum'] for r in rows)
    assert all(r['width_pi'] >= r['p'] * r['q'] and r['K0_sigma'] == r['p'] + r['q'] for r in rows)
    json.dump(rows, open('local_optima_counterexample.json', 'w'))
