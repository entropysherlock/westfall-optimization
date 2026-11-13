"""Sharper test at n = 7 on structured instances where lambda is small. Seed 28002."""
import itertools, json, random
from exact_reference import F, cut, lam_brute, all_optima
from local_optima import skew, is_local_opt, width
rng = random.Random(28002)
def planted(n):
    A = skew(n, lambda i, j: rng.choice([1, 2, 4]) if rng.random() > .12 else -rng.choice([1, 3, 6]))
    p = list(range(n)); rng.shuffle(p)
    return [[A[p[i]][p[j]] for j in range(n)] for i in range(n)]
out = dict(instances=0, local_optima=0, nonglobal=0, violations=0, min_slack=None, slack_hist={}, examples=[])
for _ in range(45):
    A = planted(7); lam = lam_brute(A)[0]; opt, opts = all_optima(A); out['instances'] += 1
    for p in itertools.permutations(range(7)):
        if is_local_opt(A, p):
            w = width(A, p); out['local_optima'] += 1; out['nonglobal'] += F(A, p) < opt
            s = lam - w; out['slack_hist'][s] = out['slack_hist'].get(s, 0) + 1
            if out['min_slack'] is None or s < out['min_slack']: out['min_slack'] = s
            if w > lam:
                out['violations'] += 1
                if len(out['examples']) < 3: out['examples'].append(dict(A=A, order=p, width=w, lam=lam, F=F(A, p), OPT=opt))
json.dump(out, open('local_optima2_results.json', 'w'), indent=1); print(json.dumps(out)[:1200])
