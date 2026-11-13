"""Targeted search for an instance where the 3-dicycle (triangle) LP is not tight, and its lambda."""
import json, random, itertools
import numpy as np
from scipy.optimize import linprog
from exact_reference import lam_brute, all_optima
from sccdp import solve
rng = random.Random(26028)
def lp_value(A):
    n = len(A); idx = {(i, j): t for t, (i, j) in enumerate(itertools.combinations(range(n), 2))}
    def x(i, j):
        c = np.zeros(len(idx))
        if i < j: c[idx[(i, j)]] = 1; return c, 0.0
        c[idx[(j, i)]] = -1; return c, 1.0
    obj = np.array([2.0 * A[i][j] for (i, j) in idx]); const = -sum(A[i][j] for (i, j) in idx)
    Aub, bub = [], []
    for i, j, k in itertools.permutations(range(n), 3):
        if i < j and i < k:
            (c1, d1), (c2, d2), (c3, d3) = x(i, j), x(j, k), x(k, i)
            Aub.append(c1 + c2 + c3); bub.append(2 - d1 - d2 - d3)
    r = linprog(-obj, A_ub=np.array(Aub), b_ub=np.array(bub), bounds=[(0, 1)] * len(idx), method='highs')
    return -r.fun + const
out = dict(samples=0, nontight=0, best=None)
for t in range(6000):
    n = 6
    A = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = rng.choice([-2, -1, -1, 0, 1, 1, 2]); A[i][j] = v; A[j][i] = -v
    opt = solve(A)[0]; lp = lp_value(A); out['samples'] += 1
    if lp > opt + 1e-6:
        out['nontight'] += 1
        lam = lam_brute(A)[0]
        if out['best'] is None or lam < out['best']['lam']:
            out['best'] = dict(A=A, OPT=int(opt), LP=round(lp, 4), lam=lam, brute_OPT=int(all_optima(A)[0]))
json.dump(out, open('lp_probe_results.json', 'w'), indent=1); print(json.dumps(out))
