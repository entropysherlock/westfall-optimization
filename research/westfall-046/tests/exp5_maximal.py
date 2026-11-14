"""
Mission 047, Experiment 5 — exact Two-Tournament Extremality over ALL orderings, n = 8, 9, 10.

Monotonicity: removing arcs (adding non-adjacencies) can only lower b(X) for every X, so N_k can only grow.
Hence, in the forward model, max N_k over alpha<=2 digraphs on n vertices is attained when the non-adjacency graph G
is MAXIMAL triangle-free, together with some vertex order.

Steps:
1. Enumerate maximal triangle-free graphs on n vertices up to isomorphism, by randomized greedy maximalization
   (many seeds) plus an isomorphism check. Stabilisation of the class count is reported.
2. For each class, run perm_extremal over all n! orders.
3. Compare with the complete bipartite classes K_{a,n-a}, which are the two-tournament configurations.

Conjecture E (exact): for every n and k, the maximum is attained by some K_{a,n-a}.
"""
import json, os, random, subprocess, sys, time
import networkx as nx
HERE = os.path.dirname(os.path.abspath(__file__))
BIN = os.path.join(HERE, "c", "perm_extremal")

def greedy_maximal(n, rnd):
    G = nx.empty_graph(n); pairs = [(u, v) for u in range(n) for v in range(u + 1, n)]; rnd.shuffle(pairs)
    for (u, v) in pairs:
        if not (set(G[u]) & set(G[v])): G.add_edge(u, v)
    return G

def classes(n, rnd, rounds):
    reps, hist = [], []
    for r in range(rounds):
        G = greedy_maximal(n, rnd)
        h = nx.weisfeiler_lehman_graph_hash(G)
        if not any(hh == h and nx.is_isomorphic(G, H) for hh, H in reps):
            reps.append((h, G)); hist.append(r)
    for a in range(1, n // 2 + 1):                       # make sure every K_{a,n-a} is present
        K = nx.complete_bipartite_graph(a, n - a); h = nx.weisfeiler_lehman_graph_hash(K)
        if not any(hh == h and nx.is_isomorphic(K, H) for hh, H in reps):
            reps.append((h, K)); hist.append(-1)
    return [G for _, G in reps], hist

def run(G, n):
    masks = [sum(1 << v for v in G[u]) for u in range(n)]
    out = subprocess.run([BIN], input=f"{n} " + " ".join(map(str, masks)), capture_output=True, text=True).stdout
    return list(map(int, out.split()))

def main():
    rnd = random.Random(4705)
    ns = [int(a) for a in sys.argv[1:]] or [8, 9]
    res = {}
    for n in ns:
        t0 = time.time()
        reps, hist = classes(n, rnd, 6000 if n <= 9 else 12000)
        rows = []
        for G in reps:
            bip = nx.is_bipartite(G) and nx.is_connected(G) and G.number_of_edges() == (lambda c: len(c[0]) * len(c[1]))(nx.bipartite.sets(G))
            rows.append({"edges": G.number_of_edges(), "complete_bipartite": bool(bip),
                         "chromatic_ge_3": not nx.is_bipartite(G), "maxN": run(G, n)})
        K = len(rows[0]["maxN"])
        base = [max(r["maxN"][k] for r in rows if r["complete_bipartite"]) for k in range(K)]
        allmax = [max(r["maxN"][k] for r in rows) for k in range(K)]
        viol = [k for k in range(K) if allmax[k] > base[k]]
        nonbip_best_ratio = max((r["maxN"][k] / base[k] for r in rows if r["chromatic_ge_3"] for k in range(K)), default=None)
        res[n] = {"classes": len(rows), "last_new_class_found_at_round": max(h for h in hist), "rounds": 6000 if n <= 9 else 12000,
                  "non_bipartite_classes": sum(r["chromatic_ge_3"] for r in rows),
                  "max_over_all": allmax, "max_two_tournaments": base, "k_with_counterexample": viol,
                  "best_ratio_nonbipartite_vs_two_tournaments": nonbip_best_ratio, "seconds": round(time.time() - t0, 1)}
        print(n, {k: v for k, v in res[n].items() if k not in ("max_over_all", "max_two_tournaments")}, flush=True)
        print("   max N_k (k=0..12):", allmax[:13])
    json.dump(res, open(os.path.join(HERE, "..", "data", f"exp5_maximal_{'_'.join(map(str, ns))}.json"), "w"), indent=1)

if __name__ == "__main__":
    main()
