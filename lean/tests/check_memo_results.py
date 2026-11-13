"""Mission 024: exact comparison of autoCutM (and autoCutX where it finished) with an exhaustive
reference; per-instance time, reachable cuts, nodes and DP transitions."""
import json, os
from fractions import Fraction as F
from exact_reference import all_optima, lam_brute, K0, cut, partitions_P
inst = json.load(open('memo_instances.json'))
def load(fn):
    rows = {}
    if os.path.exists(fn):
        for line in open(fn):
            p = line.strip().split('|')
            if len(p) == 10: rows[int(p[0])] = p[1:]
    return rows
M, X = load('memo_raw.txt'), load('unmemo_raw.txt')
def plist(s): return [int(x) for x in s.strip('[]').split(',') if x.strip()]
out = []
for d in inst:
    i = d['id']; A = [[F(x) for x in r] for r in d['A']]; n = len(A)
    rec = dict(id=i, suite=d['suite'], family=d['family'], n=n)
    if i not in M: rec['status'] = 'NOT COMPLETED'; out.append(rec); continue
    val, order, obj, part, lamB, k, reach, nodes, ms = M[i]
    order, part, k, lamB, reach, nodes = plist(order), plist(part), int(k), int(lamB), int(reach), int(nodes)
    OPT, opts = all_optima(A); lam, _ = lam_brute(A)
    blocks = [[v for v in range(n) if part[v] == L] for L in sorted(set(part))]
    lam_part = max(len(b) for b in blocks) ** 2 + 3 * K0(A, blocks)
    bound = (n + 1) * partitions_P(3 * k)
    # DP transitions = sum over reachable k-cuts T of |T| (one candidate last vertex each)
    layer = {0}; transitions = 0
    for s in range(n):
        nxt = set()
        for S in layer:
            for v in range(n):
                if not S >> v & 1 and cut(A, S | 1 << v) <= k: nxt.add(S | 1 << v)
        transitions += sum(bin(T).count('1') for T in nxt); layer = nxt
    checks = dict(value=F(val) == OPT, ordering=tuple(order) in opts and F(obj) == OPT, lam_exact=lamB == lam,
                  certificate=lam_part == lamB, lam_le_k=lam <= k, k_bound=(k == 1 or k < 2 * lam),
                  reach_bound=reach <= bound)
    rec.update(OPT=str(OPT), lam=lam, k=k, reachable=reach, nodes=nodes, dp_transitions=transitions,
               ms_memo=int(ms.split('=')[1]), **checks)
    if i in X:
        rec['ms_unmemo'] = int(X[i][8].split('=')[1]); rec['unmemo_same_output'] = X[i][:8] == M[i][:8]
    rec['status'] = 'PASS' if all(checks.values()) else 'FAIL'
    out.append(rec)
json.dump(out, open('memo_comparison.json', 'w'), indent=1)
done = [r for r in out if r['status'] != 'NOT COMPLETED']
both = [r for r in done if 'ms_unmemo' in r]
summ = dict(instances=len(out), completed=len(done), passed=sum(r['status'] == 'PASS' for r in done),
            failed=sum(r['status'] == 'FAIL' for r in done),
            not_completed=[(r['id'], r['family'], r['n']) for r in out if r['status'] == 'NOT COMPLETED'],
            unmemo_completed=len(both), identical_outputs=sum(r['unmemo_same_output'] for r in both),
            max_ms_memo_by_n={n: max((r['ms_memo'] for r in done if r['n'] == n), default=None) for n in range(1, 8)},
            max_ms_unmemo_by_n={n: max((r['ms_unmemo'] for r in both if r['n'] == n), default=None) for n in range(1, 8)},
            max_reachable_by_n={n: max((r['reachable'] for r in done if r['n'] == n), default=None) for n in range(1, 8)})
json.dump(summ, open('memo_summary.json', 'w'), indent=1); print(json.dumps(summ))
