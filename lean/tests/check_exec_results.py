"""Compare native autoCutX output with an independent exhaustive reference (exact rationals)."""
import json, sys, itertools
from fractions import Fraction as F
from exact_reference import all_optima, lam_brute, K0, cut, partitions_P
inst = json.load(open('exec_instances.json'))
rows = {}
for line in open('exec_raw_results.txt'):
    parts = line.strip().split('|')
    if len(parts) == 7: rows[int(parts[0])] = parts[1:]
def plist(s): return [int(x) for x in s.strip('[]').split(',') if x.strip()]
def reach_counts(A, k):
    n = len(A); layer = {0}; total = 1
    for s in range(n):
        nxt = set()
        for S in layer:
            for v in range(n):
                if not S >> v & 1:
                    T = S | 1 << v
                    if cut(A, T) <= k: nxt.add(T)
        layer = nxt; total += len(nxt)
    allk = sum(1 for S in range(1 << n) if cut(A, S) <= k)
    return total, allk
out = []; fails = 0
for d in inst:
    i = d['id']; A = [[F(x) for x in r] for r in d['A']]; n = len(A)
    rec = dict(id=i, family=d['family'], n=n)
    if i not in rows: rec['status'] = 'NO OUTPUT'; out.append(rec); fails += 1; continue
    val, order, obj, part, lamB, k = rows[i]
    order = plist(order); part = plist(part); k = int(k); lamB = int(lamB)
    OPT, opts = all_optima(A); lam, _ = lam_brute(A)
    labels = sorted(set(part)); blocks = [[v for v in range(n) if part[v] == L] for L in labels]
    lam_part = max(len(b) for b in blocks) ** 2 + 3 * K0(A, blocks)
    reach, allk = reach_counts(A, k); bound = (n + 1) * partitions_P(3 * k)
    checks = dict(value_eq_OPT=F(val) == OPT, ordering_is_perm=sorted(order) == list(range(n)),
                  ordering_obj_eq_OPT=F(obj) == OPT and tuple(order) in opts,
                  lamB_eq_true_lambda=lamB == lam, certificate_recomputed=lam_part == lamB,
                  lambda_le_k=lam <= k, k_bound=(k == 1 or k < 2 * lam),
                  reachable_le_bound=reach <= bound, all_kcuts_le_bound=allk <= bound)
    rec.update(OPT=str(OPT), value=val, lam=lam, lamB=lamB, k=k, reachable=reach, all_kcuts=allk, bound=bound, **checks)
    rec['status'] = 'PASS' if all(checks.values()) else 'FAIL'
    fails += rec['status'] != 'PASS'; out.append(rec)
json.dump(out, open('exec_comparison.json', 'w'), indent=1)
by = {}
for r in out: by.setdefault(r['family'], [0, 0]); by[r['family']][0] += r['status'] == 'PASS'; by[r['family']][1] += 1
print(json.dumps(dict(instances=len(out), passed=len(out) - fails, failed=fails, by_family=by)))
