"""Exhaustive checks of the counting theorem and of the algorithms (seed 27027). Run: python3 verify.py"""
import itertools, json, math, random
from hyperbola import H, cut, cutwidth_bruteforce, shape, cutwidth_at_most, ola_bruteforce, ola_at_most, ola_width_bound

rng = random.Random(27027)
Hc = {}
def Hm(K):
    if K not in Hc: Hc[K] = H(K)
    return Hc[K]

def tournament(n, p_back=0.5, both=0.0):
    """Random semi-complete digraph: forward arc i->j (i<j) unless flipped with prob p_back; both arcs with prob `both`."""
    adj = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            r = rng.random()
            if r < both: adj[i][j] = adj[j][i] = 1
            elif rng.random() < p_back: adj[j][i] = 1
            else: adj[i][j] = 1
    p = list(range(n)); rng.shuffle(p)
    return [[adj[p[i]][p[j]] for j in range(n)] for i in range(n)]

res = dict(instances=0, cut_sets_checked=0, max_ratio_count_over_bound=0.0, worst=None, hyperbola_violations=0,
           injectivity_violations=0, cutwidth_algorithm_checks=0, ola_checks=0, aborts_seen=0)
fams = [(0.5, 0.0), (0.15, 0.0), (0.05, 0.0), (0.3, 0.2), (0.1, 0.3), (0.5, 0.5), (0.0, 1.0)]
for n in range(1, 10):
    for (pb, both) in fams:
        for rep in range(30 if n <= 7 else (8 if n == 8 else 4)):
            adj = tournament(n, pb, both); N = 1 << n
            c, order = cutwidth_bruteforce(adj)
            cuts = [cut(adj, S) for S in range(N)]
            res['instances'] += 1
            # Theorem A for every k >= 0 (the ordering has width c): shapes obey i*s_i <= c+k, the map is injective,
            # and the number of k-cuts is at most (n+1) * H(c+k)
            shapes = [shape(S, order) for S in range(N)]
            for k in range(0, max(cuts) + 1):
                ks = [S for S in range(N) if cuts[S] <= k]
                seen = set()
                for S in ks:
                    a, s = shapes[S]
                    if any((i + 1) * si > c + k for i, si in enumerate(s)): res['hyperbola_violations'] += 1
                    if (a, s) in seen: res['injectivity_violations'] += 1
                    seen.add((a, s))
                res['cut_sets_checked'] += len(ks)
                bound = (n + 1) * Hm(c + k)
                assert len(ks) <= bound
                if k == c:
                    r = len(ks) / bound
                    if r > res['max_ratio_count_over_bound']:
                        res['max_ratio_count_over_bound'] = r; res['worst'] = dict(n=n, c=c, kcuts=len(ks), bound=bound)
            # Algorithm: cutwidth <= k decided correctly for every k
            for k in range(0, c + 3):
                ans, tot, ab = cutwidth_at_most(adj, k, Hm(2 * k))
                assert ans == (c <= k), (n, c, k, ans)
                assert not (ab and c <= k)
                res['aborts_seen'] += ab; res['cutwidth_algorithm_checks'] += 1
            # OLA
            if n <= 8:
                o = ola_bruteforce(adj)
                for k in {max(0, o - 1), o, o + 1, o + 5}:
                    ans, tot, ab = ola_at_most(adj, k)
                    assert ans == (o <= k), (n, o, k, ans, ab)
                    res['ola_checks'] += 1
assert res['hyperbola_violations'] == 0 and res['injectivity_violations'] == 0
# OLA width lemma: every ordering of cost <= k has width <= ola_width_bound(k)   (all orderings, n <= 6)
chk = 0
for n in range(2, 7):
    for _ in range(25):
        adj = tournament(n, rng.choice([.1, .3, .5]), rng.choice([0, .3]))
        for p in itertools.permutations(range(n)):
            S = 0; cost = 0; width = 0
            for v in p[:-1]:
                S |= 1 << v; c = cut(adj, S); cost += c; width = max(width, c)
            assert width <= ola_width_bound(cost); chk += 1
res['ola_width_lemma_orderings'] = chk
# Table: published exponent vs new exponent
C = math.pi * math.sqrt(2 / 3)
res['exponent_table'] = [dict(k=k, FP_exponent=round(2 * C * math.sqrt(k * (1 + math.log(2 * k))), 1), ln_H_2k=round(math.log(H(2 * k)), 1))
                         for k in (5, 10, 25, 50, 100, 250, 500, 1000)]
json.dump(res, open('verify_results.json', 'w'), indent=1); print(json.dumps(res, indent=1))
