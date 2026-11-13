"""
Mission 041 prototype: deciding directed cutwidth <= k on h-semicomplete digraphs.

Same algorithm as Mission 040 (research/westfall-040/tests/algo.py): polynomial-delay enumeration of k-cuts by
min-cut pruned branching, then a reachability search over the k-cut lattice. The only change is the stopping
threshold, which becomes  T_h(k) = (n+1) * R(h, 2k) * H(2k)  by the defect-robust counting theorem
(Lean: Westfall041.card_kcuts_le_defect_of_width_le_k). If more than T_h(k) k-cuts exist, ctw > k.

Checks performed here (all against the exact subset DP of kcut_lib.cutwidth):
  * returned ctw equals the exact ctw, and the returned ordering has that width;
  * the enumerator's count equals the brute-force k-cut count;
  * the threshold never fires on an instance with ctw <= k (that would contradict the theorem);
  * how far below T_h the actual k-cut counts are (tightness ratio).
"""
from __future__ import annotations

import json
import os
import random
import sys
import time
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "..", "westfall-040", "tests"))
from algo import enumerate_kcuts  # noqa: E402
from defect_lib import R, defect_h  # noqa: E402
from kcut_lib import H, Digraph, back_table, cutwidth, ordering_width  # noqa: E402


def decide_cutwidth_h(D: Digraph, k: int, h: int):
    n = D.n
    limit = (n + 1) * R(h, 2 * k) * H(2 * k)
    cuts, flows, exceeded = enumerate_kcuts(D, k, limit)
    stats = {"cuts": len(cuts), "limit": limit, "flows": flows, "exceeded_limit": exceeded}
    if exceeded:
        return False, None, stats
    cutset = set(cuts)
    full = (1 << n) - 1
    if 0 not in cutset or full not in cutset:
        return False, None, stats
    par = {0: None}
    q = deque([0])
    while q:
        X = q.popleft()
        rest = full ^ X
        while rest:
            b = rest & -rest
            rest ^= b
            Y = X | b
            if Y in cutset and Y not in par:
                par[Y] = X
                q.append(Y)
    if full not in par:
        return False, None, stats
    order, X = [], full
    while par[X] is not None:
        order.append((X ^ par[X]).bit_length() - 1)
        X = par[X]
    return True, order[::-1], stats


def min_cutwidth_h(D: Digraph, h: int):
    k = 0
    while True:
        ok, order, st = decide_cutwidth_h(D, k, h)
        if ok:
            return k, order, st
        k += 1


def random_h_semicomplete(n: int, h: int, rnd: random.Random, flips: int, both: int) -> Digraph:
    """Transitive tournament, `flips` reversed arcs, `both` bidirected pairs, then delete adjacencies greedily
    while every vertex keeps at most h non-neighbours."""
    arcs = {(i, j) for i in range(n) for j in range(i + 1, n)}
    pairs = sorted(arcs)
    for (i, j) in rnd.sample(pairs, min(flips, len(pairs))):
        arcs.discard((i, j)); arcs.add((j, i))
    for (i, j) in rnd.sample(pairs, min(both, len(pairs))):
        arcs.add((i, j)); arcs.add((j, i))
    deg = [0] * n
    for (i, j) in rnd.sample(pairs, len(pairs)):
        if deg[i] < h and deg[j] < h and rnd.random() < 0.6:
            arcs.discard((i, j)); arcs.discard((j, i))
            deg[i] += 1; deg[j] += 1
    return Digraph(n, sorted(arcs))


def main():
    rnd = random.Random(4041)
    out = {"correctness": {}, "tightness": [], "benchmark": []}
    mism = threshold_misfires = 0
    worst = 0.0
    for trial in range(400):
        n = rnd.randint(2, 11)
        h = rnd.randint(0, 3)
        D = random_h_semicomplete(n, h, rnd, flips=rnd.randint(0, n), both=rnd.randint(0, 2))
        hh = defect_h(D)
        assert hh <= h
        c = cutwidth(D)
        k, order, _ = min_cutwidth_h(D, hh)
        bt = back_table(D)
        if k != c or ordering_width(D, order, bt) != c:
            mism += 1
        for kk in {max(0, c - 1), c, c + 1}:
            cuts, _, _ = enumerate_kcuts(D, kk, 1 << 40)
            brute = sum(1 for X in range(1 << n) if bt[X] <= kk)
            if len(cuts) != brute:
                mism += 1
            if kk >= c:
                lim = (n + 1) * R(hh, 2 * kk) * H(2 * kk)
                if brute > lim:
                    threshold_misfires += 1
                worst = max(worst, brute / lim)
    out["correctness"] = {"instances": 400, "mismatches": mism, "threshold_misfires": threshold_misfires,
                          "max_count_over_threshold": round(worst, 4)}
    print("correctness:", out["correctness"], flush=True)
    for n in [16, 24, 32, 48]:
        for h in [0, 1, 2, 3]:
            D = random_h_semicomplete(n, h, rnd, flips=4, both=1)
            hh = defect_h(D)
            t0 = time.perf_counter()
            k, order, st = min_cutwidth_h(D, hh)
            ms = (time.perf_counter() - t0) * 1000
            S = wmax = 0
            for v in order:
                S |= 1 << v
                w = 0
                for y in range(n):
                    if not S >> y & 1:
                        w += bin(D.out[y] & S).count("1")
                wmax = max(wmax, w)
            assert wmax == k
            row = {"n": n, "h": hh, "ctw": k, "final_cuts": st["cuts"], "final_threshold": st["limit"], "ms": round(ms, 1)}
            if n <= 16:
                row["subset_dp_ctw"] = cutwidth(D)
                assert row["subset_dp_ctw"] == k
            out["benchmark"].append(row)
            print(row, flush=True)
    path = os.path.join(HERE, "..", "data", "algo041_results.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
    print("wrote", path)


if __name__ == "__main__":
    main()
