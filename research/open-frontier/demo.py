"""Cutwidth of larger semi-complete digraphs with the hyperbola cap (seed 27028). Run: python3 demo.py"""
import json, math, random, time
from hyperbola import H, cutwidth_at_most
rng = random.Random(27028); rows = []
C = math.pi * math.sqrt(2 / 3)
for n, flips in [(30, 6), (40, 10), (60, 12), (80, 16)]:
    adj = [[1 if i < j else 0 for j in range(n)] for i in range(n)]
    for _ in range(flips):                       # reverse a few short-range pairs
        i = rng.randrange(n - 1); j = min(n - 1, i + rng.randint(1, 6))
        adj[i][j], adj[j][i] = 0, 1
    p = list(range(n)); rng.shuffle(p); adj = [[adj[p[i]][p[j]] for j in range(n)] for i in range(n)]
    k = 0; t = time.time()
    while True:
        ans, tot, ab = cutwidth_at_most(adj, k)
        if ans: break
        k += 1
    rows.append(dict(n=n, flips=flips, cutwidth=k, cuts_generated_at_k=tot, cap=(n + 1) * H(2 * k),
                     FP_cap_log2=round((2 * C * math.sqrt(k * (1 + math.log(2 * k))) if k else 0) / math.log(2) + math.log2(n + 1), 1),
                     new_cap_log2=round(math.log2((n + 1) * H(2 * k)), 1), seconds=round(time.time() - t, 2)))
    print(rows[-1], flush=True)
json.dump(rows, open('demo_results.json', 'w'), indent=1)
