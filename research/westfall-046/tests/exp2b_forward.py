"""
Experiment 2b — Core Decomposition round trip at larger n in the forward model (c = 0, reference order = identity,
every U-edge i<j is the arc i->j, so b(X) = inv_U(X)).  alpha(U) <= 2 via triangle-free non-adjacency graph G.
n in {12,...,16}, k in {0,...,4}; every k-cut is encoded and decoded.  Counts how often each branch of the code is
used (far zeros / far ones / both / overlap) so that the test is known to exercise the pivot branches.
"""
import json, os, random, sys, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from lib046 import complement_adj, inv_table
from exp2_decoder import encode, decode

def rand_tf(n, rnd, dens):
    g = [0] * n
    pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]; rnd.shuffle(pairs)
    for (u, v) in pairs:
        if rnd.random() < dens and not (g[u] & g[v]):
            g[u] |= 1 << v; g[v] |= 1 << u
    return g

def structured(n, rnd):
    kind = rnd.choice(["two-cliques", "c5", "random"])
    if kind == "two-cliques":
        cls = [rnd.randrange(2) for _ in range(n)]
        g = [sum(1 << v for v in range(n) if cls[v] != cls[u]) for u in range(n)]
        # remove some G-edges (adds U-edges), stays triangle-free
        for u in range(n):
            for v in range(u + 1, n):
                if g[u] >> v & 1 and rnd.random() < 0.15:
                    g[u] &= ~(1 << v); g[v] &= ~(1 << u)
        return kind, g
    if kind == "c5":
        cls = [rnd.randrange(5) for _ in range(n)]
        g = [sum(1 << v for v in range(n) if (cls[u] - cls[v]) % 5 in (1, 4)) for u in range(n)]
        return kind, g
    return kind, rand_tf(n, rnd, rnd.choice([0.2, 0.5, 0.9]))

rnd = random.Random(4603)
st = {"digraphs": 0, "kcuts": 0, "roundtrip_failures": 0, "pivot_failures": 0, "max_core_minus_2K2": -99,
      "branch_far0": 0, "branch_far1": 0, "branch_both": 0}
t0 = time.time()
for trial in range(60):
    n = rnd.randint(12, 16)
    kind, g = structured(n, rnd)
    U = complement_adj(n, g)
    inv = inv_table(n, U)
    st["digraphs"] += 1
    for k in range(0, 5):
        for X in np.nonzero(inv <= k)[0]:
            X = int(X)
            code, chk = encode(n, U, inv, X, k)
            st["kcuts"] += 1
            if code is None:
                st["pivot_failures"] += 1; continue
            st["branch_far0"] += "Z" in code; st["branch_far1"] += "O" in code
            st["branch_both"] += ("Z" in code and "O" in code)
            st["max_core_minus_2K2"] = max(st["max_core_minus_2K2"], chk["core_size"] - (2 * k + 2))
            if decode(n, U, code) != X:
                st["roundtrip_failures"] += 1
st["seconds"] = round(time.time() - t0, 1)
print(json.dumps(st, indent=1))
json.dump(st, open(os.path.join(HERE, "..", "data", "exp2b_forward.json"), "w"), indent=1)
