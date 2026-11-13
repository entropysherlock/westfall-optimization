"""Opportunity 7 test: do prefixes of segment-swap local optima obey the optimal-prefix width bound
cut <= lambda(A)?  A segment swap exchanges two adjacent contiguous segments.  Random search, seed 28001.
(Outcome: no violation for n <= 7 -- but the conjecture is FALSE, see local_optima_counterexample.py.)"""
import itertools, json, random
from exact_reference import F, cut, lam_brute, all_optima

def skew(n, f):
    A = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = f(i, j); A[i][j] = v; A[j][i] = -v
    return A

def is_local_opt(A, p):
    n = len(p)
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n + 1):          # swap p[i:j] and p[j:k]
                if sum(A[u][v] for u in p[i:j] for v in p[j:k]) < 0: return False
    return True

def width(A, p):
    S = 0; w = 0
    for v in p: S |= 1 << v; w = max(w, cut(A, S))
    return w

def main():
    rng = random.Random(28001)
    fams = {'tournament': lambda n: skew(n, lambda i, j: rng.choice([-1, 1])),
            'weighted': lambda n: skew(n, lambda i, j: rng.choice([-3, -2, -1, 1, 2, 3])),
            'ties': lambda n: skew(n, lambda i, j: rng.choice([-1, 0, 0, 1])),
            'near_transitive': lambda n: skew(n, lambda i, j: rng.choice([1, 2, 3]) if rng.random() > .2 else -1)}
    out = dict(instances=0, local_optima=0, nonglobal_local_optima=0, violations=0, examples=[])
    for fam, g in fams.items():
        for n in (5, 6):
            for _ in range(40 if n == 5 else 15):
                A = g(n); lam = lam_brute(A)[0]; opt, opts = all_optima(A); out['instances'] += 1
                for p in itertools.permutations(range(n)):
                    if is_local_opt(A, p):
                        out['local_optima'] += 1; out['nonglobal_local_optima'] += F(A, p) < opt
                        w = width(A, p)
                        if w > lam:
                            out['violations'] += 1
                            if len(out['examples']) < 3: out['examples'].append(dict(family=fam, A=A, order=p, width=w, lam=lam, F=F(A, p), OPT=opt))
    json.dump(out, open('local_optima_results.json', 'w'), indent=1); print(json.dumps(out)[:1500])

if __name__ == '__main__': main()
