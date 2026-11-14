"""
Experiment 3 — the core function f(K) of the Self-Reduction Theorem (forward model, c = 0, so K = k).
  f(K) = max { N_K(D) : alpha(D) <= 2, |V(D)| <= 2K }.
Conjecture W predicts f(K) <= exp(O(sqrt K)); the trivial bound is 2^{2K}; the disjoint-two-tournament value is
the natural lower bound.  We anneal over triangle-free non-adjacency graphs on exactly 2K vertices (monotone in n,
so 2K is the worst case) and record log f(K) / sqrt(K) against log f(K) / (sqrt(K) log K).
Small K only (2K <= 16): numerical evidence, not proof, and K <= 8 cannot separate sqrt(K) from sqrt(K) log K.
"""
import json, math, os, random, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from exp1_growth import anneal, score, seeds
from lib046 import H
rnd = random.Random(4604)
rows = []
for K in range(1, 9):
    n = 2 * K
    base = max(score(n, g, K) for g in seeds(n, 2, rnd)[:2])
    best, g = anneal(n, 2, K, rnd, 2500 if K <= 6 else 800)
    row = {"K": K, "n": n, "f_lower_found": best, "two_tournaments": base, "trivial_2^2K": 2 ** n,
           "H(K)^2": H(K) ** 2, "log f / sqrt K": round(math.log(best) / math.sqrt(K), 3),
           "f / ((K+1)^2 H(K)^2)": round(best / ((K + 1) ** 2 * H(K) ** 2), 4)}
    rows.append(row); print(row, flush=True)
json.dump(rows, open(os.path.join(HERE, "..", "data", "exp3_core.json"), "w"), indent=1)
