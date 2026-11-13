"""Mission 025: exact comparison of autoCutC (the costed program) with the exhaustive reference,
with autoCutM (rerun under identical conditions) and with the Mission 024 autoCutX output.
Records the counted cost, rounds, states, nodes, time, and checks the counted cost against
the two proved bounds of `autoCut_complexity`.

Run from lean/tests:  python3 check_costed_results.py
"""
import json, math, os
from fractions import Fraction as F
from exact_reference import all_optima, lam_brute, K0, partitions_P

inst = json.load(open('memo_instances.json'))


def load(fn, ncol):
    rows = {}
    if os.path.exists(fn):
        for line in open(fn):
            p = line.strip().split('|')
            if len(p) == ncol:
                rows[int(p[0])] = p[1:]
    return rows


C = load('m025/costed_raw.txt', 11)        # ...|nodes|cost=..|ms=..
M = load('m025/memo_rerun_raw.txt', 10)    # ...|nodes|ms=..
X = load('unmemo_raw.txt', 10)             # Mission 024 autoCutX run


def plist(s):
    return [int(x) for x in s.strip('[]').split(',') if x.strip()]


def isqrt(x):
    return math.isqrt(x)


def abort_bound(n, k):
    return (n + 1) * ((3 * k + 1) * 2 ** (5 * (isqrt(3 * k) + 1)))


out = []
for d in inst:
    i = d['id']
    A = [[F(x) for x in r] for r in d['A']]
    n = len(A)
    rec = dict(id=i, suite=d['suite'], family=d['family'], n=n)
    if i not in C:
        rec['status'] = 'NOT COMPLETED'
        if i in M:
            rec['ms_memo'] = int(M[i][8].split('=')[1])
        out.append(rec)
        continue
    val, order, obj, part, lamB, k, reach, nodes, cost, ms = C[i]
    order, part, k, lamB, reach, nodes = plist(order), plist(part), int(k), int(lamB), int(reach), int(nodes)
    cost = int(cost.split('=')[1])
    OPT, opts = all_optima(A)
    lam, _ = lam_brute(A)
    blocks = [[v for v in range(n) if part[v] == L] for L in sorted(set(part))]
    lam_part = max(len(b) for b in blocks) ** 2 + 3 * K0(A, blocks)
    K = max(1, 2 * lam)
    bound1 = 1000 * (n + 1) ** 9 * (abort_bound(n, K) + 1) ** 3
    bound2 = 1728000 * (n + 1) ** 18 * 2 ** (45 * (isqrt(lam) + 1))
    checks = dict(value=F(val) == OPT, ordering=tuple(order) in opts and F(obj) == OPT,
                  lam_exact=lamB == lam, certificate=lam_part == lamB, lam_le_k=lam <= k,
                  k_bound=(k == 1 or k < 2 * lam), reach_bound=reach <= (n + 1) * partitions_P(3 * k),
                  cost_le_bound1=cost <= bound1, cost_le_bound2=cost <= bound2)
    rec.update(OPT=str(OPT), lam=lam, k=k, rounds=k.bit_length(), reachable=reach, nodes=nodes,
               counted_cost=cost, log2_cost=round(math.log2(cost), 2),
               log2_bound1=round(math.log2(bound1), 1), ms_costed=int(ms.split('=')[1]), **checks)
    key = C[i][:8]
    if i in M:
        rec['ms_memo'] = int(M[i][8].split('=')[1])
        rec['memo_same_output'] = M[i][:8] == key
    if i in X:
        rec['unmemoX_same_output'] = X[i][:8] == key
    rec['status'] = 'PASS' if all(checks.values()) else 'FAIL'
    out.append(rec)

json.dump(out, open('m025/costed_comparison.json', 'w'), indent=1)
done = [r for r in out if r['status'] != 'NOT COMPLETED']
withM = [r for r in done if 'memo_same_output' in r]
withX = [r for r in done if 'unmemoX_same_output' in r]
summ = dict(
    instances=len(out), completed=len(done),
    passed=sum(r['status'] == 'PASS' for r in done), failed=sum(r['status'] == 'FAIL' for r in done),
    failed_ids=[r['id'] for r in done if r['status'] == 'FAIL'],
    not_completed=[(r['id'], r['family'], r['n']) for r in out if r['status'] == 'NOT COMPLETED'],
    memo_completed_on_same_instances=len(withM), identical_to_memo=sum(r['memo_same_output'] for r in withM),
    unmemoX_completed_on_same_instances=len(withX),
    identical_to_unmemoX=sum(r['unmemoX_same_output'] for r in withX),
    memo_completed_total=len(M),
    max_ms_costed_by_n={n: max((r['ms_costed'] for r in done if r['n'] == n), default=None) for n in range(1, 8)},
    max_ms_memo_by_n={n: max((r['ms_memo'] for r in withM if r['n'] == n), default=None) for n in range(1, 8)},
    max_cost_by_n={n: max((r['counted_cost'] for r in done if r['n'] == n), default=None) for n in range(1, 8)},
    max_reachable_by_n={n: max((r['reachable'] for r in done if r['n'] == n), default=None) for n in range(1, 8)},
    max_log2_cost_minus_log2_bound1=max((r['log2_cost'] - r['log2_bound1'] for r in done), default=None),
)
json.dump(summ, open('m025/costed_summary.json', 'w'), indent=1)
print(json.dumps(summ))
