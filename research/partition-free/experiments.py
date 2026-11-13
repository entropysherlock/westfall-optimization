"""State counts and times on identical instances: subset DP (2^n states), AutoCut (reference implementation),
strong-component recursion, HiGHS MILP. Also the LP-tightness probe. Run: python3 experiments.py"""
import json, random, signal, time, itertools
import numpy as np
from fractions import Fraction as Fr
from scipy.optimize import linprog
from exact_reference import auto_solve, lam_brute, all_optima
from sccdp import solve, sccs, lam_circ
from westfall_optimization.solvers.milp import milp_solve
from westfall_optimization.solvers.subset_dp import subset_dp

rng = random.Random(26027)
def skew(n, f):
    A = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = f(i, j); A[i][j] = v; A[j][i] = -v
    return A
def shuffle(A):
    n = len(A); p = list(range(n)); rng.shuffle(p)
    return [[A[p[i]][p[j]] for j in range(n)] for i in range(n)]
def cyc_plus(n):          # a directed Hamiltonian cycle plus a few chords, everything else tied
    A = skew(n, lambda i, j: 0)
    def arc(x, y): A[x][y] = 1; A[y][x] = -1
    for i in range(n): arc(i, (i + 1) % n)
    for _ in range(n // 3):
        x, y = rng.sample(range(n), 2)
        if A[x][y] == 0: arc(x, y)
    return shuffle(A)
FAMS = {
 'all_zero':        lambda n: skew(n, lambda i, j: 0),
 'cycle_plus_chords': cyc_plus,
 'sparse_digraph_p0.2': lambda n: shuffle(skew(n, lambda i, j: rng.choice([1, -1]) if rng.random() < .2 else 0)),
 'ties_heavy':      lambda n: skew(n, lambda i, j: rng.choice([0, 0, 0, 1, -1])),
 'near_transitive': lambda n: shuffle(skew(n, lambda i, j: rng.choice([1, 2, 3]) if rng.random() > .1 else -1)),
 'random_tournament': lambda n: skew(n, lambda i, j: rng.choice([-1, 1])),
}
class TO(Exception): pass
def _alarm(*a): raise TO()
signal.signal(signal.SIGALRM, _alarm)
def timed(f, limit):
    signal.alarm(limit); t = time.time()
    try: r = f(); return r, time.time() - t
    except TO: return None, None
    finally: signal.alarm(0)

rows = []
for fam, g in FAMS.items():
    for n in (10, 12):
        for rep in range(3):
            A = g(n); row = dict(family=fam, n=n, rep=rep, subset_states=2 ** n)
            (r, t) = timed(lambda: solve(A), 60)
            row.update(scc_opt=None if r is None else int(r[0]), scc_states=None if r is None else r[2], scc_s=t)
            (dp, t) = timed(lambda: subset_dp(np.array(A, float)), 120)
            row.update(subset_opt=None if dp is None else int(round(float(dp[0][-1]))), subset_s=t)
            (m, t) = timed(lambda: milp_solve(np.array(A, float), 60.0), 90)
            row.update(milp_opt=None if m is None or not m['proved'] else int(round(m['OPT'])), milp_s=t)
            (a, t) = timed(lambda: auto_solve(A), 30)
            row.update(autocut_opt=None if a is None else int(a['OPT']), autocut_nodes=None if a is None else a['nodes'],
                       autocut_k=None if a is None else a['k'], autocut_s=t)
            opts = {row[k] for k in ('scc_opt', 'subset_opt', 'milp_opt', 'autocut_opt') if row[k] is not None}
            row['agree'] = len(opts) == 1
            row['n_scc'] = len(sccs(A, (1 << n) - 1)); row['max_scc'] = max(bin(C).count('1') for C in sccs(A, (1 << n) - 1))
            rows.append(row); print(row, flush=True)
assert all(r['agree'] for r in rows)

# ---- LP probe: is the triangle LP tight, and does a small lambda force tightness? ----------------
def lp_value(A):
    n = len(A); idx = {}
    for i in range(n):
        for j in range(i + 1, n): idx[(i, j)] = len(idx)
    def x(i, j):          # coefficient vector (c, const) for x_ij = 1 iff i before j
        c = np.zeros(len(idx))
        if i < j: c[idx[(i, j)]] = 1; return c, 0.0
        c[idx[(j, i)]] = -1; return c, 1.0
    obj = np.zeros(len(idx)); const = 0.0      # F = sum_{i<j} a_ij (2 x_ij - 1)
    for (i, j), t in idx.items(): obj[t] = 2 * float(A[i][j]); const -= float(A[i][j])
    Aub, bub = [], []
    for i, j, k in itertools.permutations(range(n), 3):   # x_ij + x_jk + x_ki <= 2
        if i < j and i < k:
            c1, d1 = x(i, j); c2, d2 = x(j, k); c3, d3 = x(k, i)
            Aub.append(c1 + c2 + c3); bub.append(2 - d1 - d2 - d3)
    r = linprog(-obj, A_ub=np.array(Aub), b_ub=np.array(bub), bounds=[(0, 1)] * len(idx), method='highs')
    return -r.fun + const
probe = dict(tested=0, nontight=0, examples=[])
for n in (6, 7):
    for _ in range(150):
        A = skew(n, lambda i, j: rng.choice([-1, 1]))
        opt = all_optima(A)[0] if n <= 6 else solve(A)[0]
        lp = lp_value(A); probe['tested'] += 1
        if lp > opt + 1e-6:
            probe['nontight'] += 1
            if len(probe['examples']) < 3 and n == 6:
                probe['examples'].append(dict(n=n, A=A, OPT=int(opt), LP=round(lp, 4), lam=lam_brute(A)[0]))
json.dump(dict(rows=rows, lp_probe=probe), open('experiment_results.json', 'w'), indent=1)
print(json.dumps(probe))
