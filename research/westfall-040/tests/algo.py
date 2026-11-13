"""
Mission 040 prototype: deciding directed cutwidth <= k on semicomplete digraphs by enumerating k-cuts
(Fomin-Pilipczuk ESA 2013 framework) with the stopping threshold (n+1) H(2k) from the new counting theorem.

Algorithm CW(D, k):
  1. Enumerate k-cuts X (back(X) <= k) by depth-first branching over the vertices in a fixed order, keeping a
     partial assignment (A ⊆ X, B ⊆ Y) only if it extends to some k-cut. Extendability = an s-t minimum cut:
     min over X ⊇ A, X ∩ B = ∅ of back(X) equals the max flow from B (sources) to A (sinks) in the digraph with
     unit capacities (an arc y -> x is cut when y is on the source side and x on the sink side). Every leaf of the
     pruned tree is a k-cut, so the delay between outputs is <= n flow computations: polynomial delay.
  2. If more than (n+1) H(2k) cuts appear, answer NO: by the counting theorem a semicomplete digraph of
     cutwidth <= k has at most that many k-cuts.
  3. Otherwise search the DAG whose nodes are the k-cuts and whose edges add one vertex; an ordering of width
     <= k exists iff V is reachable from the empty set (its prefixes are exactly such a chain of k-cuts).
Time: O(#cuts * n * flow) with flow = O((k+1) n^2) by at most k+1 augmenting paths
      => O((n+1) H(2k) * (k+1) * n^3) = 2^{O(sqrt k)} * n^4.
This file also contains an independent checker (exact subset DP) and a benchmark driver.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys
import time
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kcut_lib import H, Digraph, back_table, cutwidth, near_transitive, ordering_width, random_semicomplete  # noqa: E402


def min_completion(D: Digraph, A: int, B: int, cap: int) -> int:
    """min{ back(X) : A ⊆ X, X ∩ B = ∅ }, computed as a max flow from B to A, truncated at cap+1."""
    n = D.n
    # nodes 0..n-1, s = n, t = n+1; arcs u->v capacity 1 (D's arcs); s->b infinite for b in B; a->t infinite for a in A
    INF = 1 << 30
    s, t = n, n + 1
    adj = [dict() for _ in range(n + 2)]

    def add(u, v, c):
        adj[u][v] = adj[u].get(v, 0) + c
        adj[v].setdefault(u, 0)

    for u in range(n):
        o = D.out[u]
        while o:
            b = o & -o
            o ^= b
            add(u, b.bit_length() - 1, 1)
    for v in range(n):
        if B >> v & 1:
            add(s, v, INF)
        if A >> v & 1:
            add(v, t, INF)
    flow = 0
    while flow <= cap:
        par = {s: None}
        q = deque([s])
        while q and t not in par:
            u = q.popleft()
            for v, c in adj[u].items():
                if c > 0 and v not in par:
                    par[v] = u
                    q.append(v)
        if t not in par:
            break
        # unit augment along the path (capacities on graph arcs are 1)
        v = t
        while par[v] is not None:
            u = par[v]
            adj[u][v] -= 1
            adj[v][u] += 1
            v = u
        flow += 1
    return flow


def enumerate_kcuts(D: Digraph, k: int, limit: int, order=None):
    """Yield k-cuts (bitmasks) with polynomial delay; stops after limit+1 cuts. Returns (cuts, flows, exceeded)."""
    n = D.n
    order = order or list(range(n))
    cuts, flows = [], 0
    stack = [(0, 0, 0)]  # (depth, A, B)
    while stack:
        d, A, B = stack.pop()
        if d == n:
            cuts.append(A)
            if len(cuts) > limit:
                return cuts, flows, True
            continue
        v = order[d]
        for (A2, B2) in ((A, B | (1 << v)), (A | (1 << v), B)):
            flows += 1
            if min_completion(D, A2, B2, k) <= k:
                stack.append((d + 1, A2, B2))
    return cuts, flows, False


def decide_cutwidth(D: Digraph, k: int):
    """Returns (answer, ordering or None, stats)."""
    n = D.n
    limit = (n + 1) * H(2 * k)
    t0 = time.perf_counter()
    cuts, flows, exceeded = enumerate_kcuts(D, k, limit)
    stats = {"cuts": len(cuts), "limit": limit, "flows": flows, "exceeded_limit": exceeded}
    if exceeded:
        stats["ms"] = (time.perf_counter() - t0) * 1000
        return False, None, stats
    cutset = set(cuts)
    full = (1 << n) - 1
    if 0 not in cutset or full not in cutset:
        stats["ms"] = (time.perf_counter() - t0) * 1000
        return False, None, stats
    par = {0: None}
    q = deque([0])
    while q:
        X = q.popleft()
        if X == full:
            break
        rest = full ^ X
        while rest:
            b = rest & -rest
            rest ^= b
            Y = X | b
            if Y in cutset and Y not in par:
                par[Y] = X
                q.append(Y)
    stats["ms"] = (time.perf_counter() - t0) * 1000
    if full not in par:
        return False, None, stats
    order, X = [], full
    while par[X] is not None:
        order.append((X ^ par[X]).bit_length() - 1)
        X = par[X]
    return True, order[::-1], stats


def min_cutwidth(D: Digraph):
    k = 0
    total = {"cuts": 0, "flows": 0, "ms": 0.0}
    while True:
        ok, order, st = decide_cutwidth(D, k)
        for key in total:
            total[key] += st[key]
        if ok:
            return k, order, total
        k += 1


def fp_threshold_log(k: int) -> float:
    """log of Fomin-Pilipczuk's Corollary 10 bound without the constant A: C*sqrt(2k(1+ln 2k)) * ... (per n+1)."""
    C = math.pi * math.sqrt(2 / 3)
    return 2 * C * math.sqrt(k * (1 + math.log(2 * k))) if k >= 1 else 0.0


def main():
    rnd = random.Random(4040)
    out = {"correctness": [], "benchmark": [], "thresholds": []}
    # correctness against the exact subset DP
    mism = 0
    for trial in range(300):
        n = rnd.randint(2, 11)
        D = random_semicomplete(n, rnd, p_both=rnd.choice([0, 0.1, 0.3])) if trial % 2 else near_transitive(n, rnd.randint(0, n), rnd, both=rnd.randint(0, 3))
        c = cutwidth(D)
        k, order, _ = min_cutwidth(D)
        bt = back_table(D)
        if k != c or ordering_width(D, order, bt) != c:
            mism += 1
        # also: the answer for k = c-1 must be NO and the enumerated count must equal the brute-force count
        for kk in {max(0, c - 1), c}:
            cuts, _, ex = enumerate_kcuts(D, kk, 1 << 40)
            if len(cuts) != sum(1 for X in range(1 << n) if bt[X] <= kk):
                mism += 1
    out["correctness"] = {"instances": 300, "mismatches": mism}
    print("correctness:", out["correctness"], flush=True)
    # stopping thresholds: new (n+1)H(2k) vs Fomin-Pilipczuk exp(2C sqrt(k(1+ln 2k))) (both per (n+1), FP without A)
    for k in [1, 2, 5, 10, 20, 50, 100, 200, 500]:
        out["thresholds"].append({"k": k, "log_H_2k": round(math.log(H(2 * k)), 2), "log_FP_without_A": round(fp_threshold_log(k), 2)})
    print("thresholds:", out["thresholds"], flush=True)
    # benchmark: instances beyond the subset DP's reach (n = 20..60), small cutwidth
    for n in [16, 20, 30, 40, 60]:
        for flips in [2, 4, 8]:
            D = near_transitive(n, flips, rnd, both=2)
            t0 = time.perf_counter()
            k, order, st = min_cutwidth(D)
            ms = (time.perf_counter() - t0) * 1000
            w = ordering_width(D, order, back_table(D) if n <= 22 else None) if n <= 22 else None
            row = {"n": n, "flips": flips, "ctw": k, "cuts_enumerated_total": st["cuts"], "flow_calls": st["flows"], "ms": round(ms, 1),
                   "final_limit_(n+1)H(2k)": (n + 1) * H(2 * k)}
            if n <= 20:
                t1 = time.perf_counter()
                c = cutwidth(D)
                row["subset_dp_ctw"] = c
                row["subset_dp_ms"] = round((time.perf_counter() - t1) * 1000, 1)
                assert c == k
            # verify the returned ordering's width directly (independent of both algorithms)
            S, wmax = 0, 0
            for v in order:
                S |= 1 << v
                wmax = max(wmax, sum(1 for (a, b) in D.arcs() if not (S >> a & 1) and (S >> b & 1)))
            row["ordering_width_verified"] = wmax
            assert wmax == k
            out["benchmark"].append(row)
            print(row, flush=True)
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "algo_results.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1)


if __name__ == "__main__":
    main()
