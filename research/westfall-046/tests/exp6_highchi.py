"""
Mission 047, Experiment 6 — high-chromatic triangle-free non-adjacency graphs.
Their complements cannot be covered by two cliques, so they are exactly the instances where the conjecture is not a
trivial product bound. Every maximal one is tested, together with two classical non-maximal ones (Petersen, Chvátal).

For each G we hill-climb over vertex orders to maximise N_k (forward model, c = 0), using the same budget for the
complete bipartite graphs K_{a,n-a} (two tournaments). Prediction of the conjecture: max_G <= max_two_tournaments.
Hill-climbing is not exhaustive over orders: this is adversarial search, not verification.
"""
import itertools, json, os, subprocess, sys
import networkx as nx
HERE = os.path.dirname(os.path.abspath(__file__)); BIN = os.path.join(HERE, "c", "order_climb")

def clebsch():
    G = nx.Graph(); V = list(itertools.product([0, 1], repeat=4)); G.add_nodes_from(range(16))
    for i, a in enumerate(V):
        for j, b in enumerate(V):
            d = sum(x != y for x, y in zip(a, b))
            if i < j and d in (1, 4): G.add_edge(i, j)
    return G

def climb(G, k, R, I, seed):
    G = nx.convert_node_labels_to_integers(G); n = G.number_of_nodes()
    masks = [sum(1 << v for v in G[u]) for u in range(n)]
    inp = f"{n} {' '.join(map(str, masks))} {k} {R} {I} {seed}"
    return int(subprocess.run([BIN], input=inp, capture_output=True, text=True).stdout)

graphs = {"Petersen (n=10, chi=3)": nx.petersen_graph(), "Groetzsch (n=11, chi=4)": nx.mycielski_graph(4),
          "Chvatal (n=12, chi=4)": nx.chvatal_graph(), "Clebsch (n=16, chi=4)": clebsch()}
res = []
for name, G in graphs.items():
    assert not any(nx.triangles(G).values())
    n = G.number_of_nodes(); big = n >= 16
    R, I = (4, 250) if big else (8, 1500)
    for k in ([1, 2, 4] if big else [1, 2, 4, 6, 8]):
        v = climb(G, k, R, I, 7)
        base = max(climb(nx.complete_bipartite_graph(a, n - a), k, R, I, 7) for a in range(1, n // 2 + 1))
        row = {"graph": name, "n": n, "k": k, "max_found": v, "two_tournaments_found": base, "ratio": round(v / base, 4)}
        res.append(row); print(row, flush=True)
json.dump(res, open(os.path.join(HERE, "..", "data", "exp6_highchi.json"), "w"), indent=1)
