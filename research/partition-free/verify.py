"""Brute-force verification of every claim in REPORT.md (exact arithmetic). Run: python3 verify.py"""
import itertools, json, random
from fractions import Fraction as Fr
from exact_reference import F, all_optima, lam_brute, K0, ordered_partitions, auto_solve
from sccdp import solve, sccs, restrict, lam_circ, K0_tieblind, bits

rng = random.Random(26026)
def skew(n, f):
    A = [[Fr(0)] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = Fr(f(i, j)); A[i][j] = v; A[j][i] = -v
    return A
def shuffle(A):
    n = len(A); p = list(range(n)); rng.shuffle(p)
    return [[A[p[i]][p[j]] for j in range(n)] for i in range(n)]
FAMS = {
 'tournament±1': lambda n: skew(n, lambda i, j: rng.choice([-1, 1])),
 'ties_heavy':   lambda n: skew(n, lambda i, j: rng.choice([0, 0, 0, 1, -1])),
 'weighted':     lambda n: skew(n, lambda i, j: rng.randint(-5, 5)),
 'rational':     lambda n: skew(n, lambda i, j: Fr(rng.randint(-6, 6), rng.randint(1, 3))),
 'near_transitive': lambda n: shuffle(skew(n, lambda i, j: rng.choice([1, 2, 3]) if rng.random() > .2 else -1)),
 'sparse_digraph':  lambda n: shuffle(skew(n, lambda i, j: rng.choice([1, -1]) if rng.random() < .35 else 0)),
}
res = {}
# --- Claim T1/T3: strong-component recursion is exact ---------------------------------------
cnt = 0
for fam, g in FAMS.items():
    for n in range(1, 8):
        for _ in range(40 if n <= 6 else 12):
            A = g(n); opt, _ = all_optima(A); val, order, st = solve(A)
            assert val == opt == F(A, order) and sorted(order) == list(range(n)), (fam, n)
            cnt += 1
res['T3_sccdp_exact_instances'] = cnt
# --- Claim T2: lambda(A[S]) <= lambda(A) for every subset S; lambda° <= lambda --------------
cnt = 0; strict = 0
for fam, g in FAMS.items():
    for n in range(2, 6):
        for _ in range(12):
            A = g(n); lam = lam_brute(A)[0]
            for S in range(1, 1 << n):
                assert lam_brute(restrict(A, S))[0] <= lam
            lc = lam_circ(A, lam_brute); assert lc <= lam; strict += lc < lam; cnt += 1
res['T2_monotone_instances'] = cnt; res['T2_strictly_smaller'] = strict
# --- Separation families ---------------------------------------------------------------------
sep = []
for n in range(2, 7):
    Z = skew(n, lambda i, j: 0)
    Cy = skew(n, lambda i, j: 1 if j == i + 1 else (-1 if (i == 0 and j == n - 1 and n > 2) else 0))
    sep.append(dict(n=n, zero_lam=lam_brute(Z)[0], zero_lam_circ=lam_circ(Z, lam_brute), zero_states=solve(Z)[2],
                    cycle_lam=lam_brute(Cy)[0], cycle_lam_circ=lam_circ(Cy, lam_brute), cycle_states=solve(Cy)[2]))
    assert sep[-1]['zero_lam'] == n * n and sep[-1]['zero_lam_circ'] == 1
res['separation'] = sep
# --- Claim T4 (reduction): VC -> FAS digraph with margins in {0,±1}; fas = vc; tie-blind parameter <= 1 + 6 vc
def vc(n, E): return min(bin(S).count('1') for S in range(1 << n) if all(S >> u & 1 or S >> v & 1 for u, v in E))
cnt = 0
for _ in range(60):
    n = rng.randint(2, 3); E = [(u, v) for u in range(n) for v in range(u + 1, n) if rng.random() < .7]
    if not E: continue
    N = 2 * n; A = [[Fr(0)] * N for _ in range(N)]
    def arc(x, y): A[x][y] = Fr(1); A[y][x] = Fr(-1)
    for v in range(n): arc(2 * v, 2 * v + 1)                 # v_in -> v_out
    for u, v in E: arc(2 * u + 1, 2 * v); arc(2 * v + 1, 2 * u)
    opt, opts = all_optima(A); m = n + 2 * len(E); fas = (m - opt) / 2; k = vc(n, E)
    assert fas == k, (fas, k)
    singles = [[v] for v in opts[0]]
    assert 1 + 3 * K0_tieblind(A, singles) <= 1 + 6 * k
    cnt += 1
res['T4_reduction_instances'] = cnt
json.dump(res, open('verify_results.json', 'w'), indent=1); print(json.dumps(res))
