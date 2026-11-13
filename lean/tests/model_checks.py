"""Exact checks of the modelling choices used in Westfall022/*.lean (integer/rational arithmetic, n <= 5).
M1  lambda over block-index functions blk : Fin n -> Fin n  ==  lambda over genuine ordered partitions.
M2  finite-threshold K0 (positive cross values + infinity) == min over a dense rational grid of thresholds + infinity.
M3  Lemma 1 of 019 in the ordered-pair counting form used in Lean, all S.
M4  Theorem 1(1): every prefix of every optimum has weak cut <= b^2 + 3*K0(blk) for EVERY blk (not just the minimiser).
M5  edge cases: n = 0, n = 1, all-zero matrices, ties."""
import itertools, random, json
from fractions import Fraction as Fr
from exact_reference import all_optima, cut, K0, lam_brute

def K0_fun(A, blk):
    n = len(A); c = [A[u][v] for u in range(n) for v in range(n) if blk[u] < blk[v]]
    X = sum(-x for x in c if x < 0); Nm = sum(1 for x in c if x < 0)
    vals = [Nm + sum(1 for x in c if x >= 0)]
    for tau in set(x for x in c if x > 0): vals.append(Nm + sum(1 for x in c if 0 <= x < tau) + (X // tau if isinstance(X, int) else int(X / tau)))
    return min(vals)

def K0_grid(A, blk):
    n = len(A); c = [Fr(A[u][v]) for u in range(n) for v in range(n) if blk[u] < blk[v]]
    X = sum(-x for x in c if x < 0); Nm = sum(1 for x in c if x < 0)
    best = Nm + sum(1 for x in c if x >= 0)
    top = max([abs(x) for x in c] + [Fr(1)]) * 2
    grid = [top * Fr(i, 97) for i in range(1, 98)] + [x for x in c if x > 0] + [x + Fr(1, 1000) for x in c if x > 0] + [x - Fr(1, 1000) for x in c if x > Fr(1, 1000)]
    for tau in grid:
        if tau > 0: best = min(best, Nm + sum(1 for x in c if 0 <= x < tau) + int(X // tau))
    return best

def b_of(blk, n): return max([sum(1 for v in range(n) if blk[v] == k) for k in range(n)] + [0])

def lam_fun(A):
    n = len(A)
    return min((b_of(blk, n) ** 2 + 3 * K0_fun(A, blk) for blk in itertools.product(range(n), repeat=n)), default=0)

rng = random.Random(11); st = dict(M1=0, M2=0, M3=0, M4=0, viol=[])
for t in range(250):
    n = rng.randint(1, 5); kind = rng.choice(['ties', 'zeros', 'wide', 'pm1'])
    A = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = {'ties': rng.randint(-3, 3), 'zeros': rng.choice([0, 0, 1, -1]), 'wide': rng.choice([-50, -1, 0, 3, 40]), 'pm1': rng.choice([-1, 1])}[kind]
            A[i][j] = v; A[j][i] = -v
    lf = lam_fun(A); lb, _ = lam_brute(A)
    if lf == lb: st['M1'] += 1
    else: st['viol'].append(('M1', A, lf, lb))
    OPT, opts = all_optima(A)
    for blk in itertools.product(range(n), repeat=n):
        if K0_fun(A, blk) == K0_grid(A, blk): st['M2'] += 1
        else: st['viol'].append(('M2', A, blk))
        bb = b_of(blk, n)
        for S in range(1 << n):
            same = sum(1 for w in range(n) for u in range(n) if not S >> w & 1 and S >> u & 1 and blk[w] == blk[u])
            I = sum(1 for w in range(n) for u in range(n) if not S >> w & 1 and S >> u & 1 and blk[w] < blk[u])
            if same <= bb * bb + I: st['M3'] += 1
            else: st['viol'].append(('M3', blk, S))
        lamB = bb * bb + 3 * K0_fun(A, blk)
        for p in opts:
            S = 0
            for v in p:
                S |= 1 << v
                if cut(A, S) <= lamB: st['M4'] += 1
                else: st['viol'].append(('M4', A, blk, p))
# edge cases
st['n0_lambda'] = lam_fun([]); st['n1_lambda'] = lam_fun([[0]])
st['all_zero_n4_lambda'] = lam_fun([[0] * 4 for _ in range(4)])
st['n_viol'] = len(st['viol']); st['viol'] = st['viol'][:3]
print(json.dumps(st))
