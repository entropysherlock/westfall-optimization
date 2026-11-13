"""Independent verifier for ATLAS-032 optimality certificates (pure Python, exact integers; shares no code
with the TypeScript solver).

Certificate = {"A": skew integer matrix, "order": claimed optimal ordering of all vertices,
               "components": [{"vertices", "order", "beta", "packing": {"D", "tri", "w"} | null}]}.
Checks
 1. A is skew-symmetric and integral; `order` is a permutation; component orders concatenate to `order`.
 2. Decomposition: no strict arc (A_uv > 0) from a later component to an earlier one (Lemma D).
 3. Per component: beta = backward weight of its order, recomputed exactly.
 4. Per component: the packing is non-negative and feasible: sum_{T containing e} w_T <= D * P_e for every arc
    (triangles must be directed 3-cycles of the strict preference digraph).
 5. Per component: an independent exhaustive search over prefix sets, pruning S only when
    beta_S + cut(S) + ceil(L(V\\S)/D) >= beta (Lemmas 1-3), finds NO complete ordering with backward weight
    < beta. If ceil(L(V)/D) == beta the packing alone certifies optimality and the search is skipped.
 6. The global objective equals W - 2 * sum(beta).
Usage: python3 verify_certificate.py certificates.json"""
import json, sys

def ceil_div(a, b): return -((-a) // b)

def verify_component(A, verts, order, beta, packing):
    k = len(verts); loc = {v: i for i, v in enumerate(verts)}
    assert sorted(order) == sorted(verts), "component order is not a permutation of its vertices"
    P = [[max(A[u][v], 0) for v in verts] for u in verts]
    pos = {v: i for i, v in enumerate(order)}
    b = sum(P[loc[order[t]]][loc[order[r]]] for r in range(k) for t in range(r + 1, k))
    assert b == beta, f"claimed beta {beta} but order has backward weight {b}"
    D, tris = 1, []
    if packing:
        D = packing["D"]; tri = packing["tri"]; w = packing["w"]
        load = {}
        for t in range(len(w)):
            a, b_, c = tri[3 * t:3 * t + 3]  # indices local to the component
            y = w[t]; assert isinstance(y, int) and y >= 0
            cyc = None
            if P[a][b_] > 0 and P[b_][c] > 0 and P[c][a] > 0: cyc = [(a, b_), (b_, c), (c, a)]
            elif P[b_][a] > 0 and P[c][b_] > 0 and P[a][c] > 0: cyc = [(b_, a), (c, b_), (a, c)]
            assert cyc is not None, "packing uses a triple that is not a directed 3-cycle"
            for e in cyc: load[e] = load.get(e, 0) + y
            tris.append((a, b_, c, y))
        for (u, v), l in load.items(): assert l <= D * P[u][v], "packing exceeds an arc capacity"
    total = sum(t[3] for t in tris)
    if ceil_div(total, D) >= beta: return "packing certificate (L(V) = beta)", 0
    # exhaustive pruned prefix search: does any ordering have backward weight <= beta - 1 ?
    byv = [[] for _ in range(k)]
    for a, b_, c, y in tris:
        byv[a].append((b_, c, y)); byv[b_].append((a, c, y)); byv[c].append((a, b_, y))
    colP = [sum(P[u][v] for u in range(k)) for v in range(k)]
    layer = {0: (0, 0, total)}  # mask -> (min beta_S, cut(S), L(V\S))
    states = 1
    for _ in range(k):
        nxt = {}
        for S, (bS, cS, L) in layer.items():
            for v in range(k):
                if S >> v & 1: continue
                inS = lambda x: S >> x & 1
                add = sum(P[v][x] for x in range(k) if inS(x))
                into = sum(P[x][v] for x in range(k) if inS(x))
                nb = bS + add; nc = cS - add + colP[v] - into
                nL = L - sum(y for (x1, x2, y) in byv[v] if not inS(x1) and not inS(x2))
                if nb + nc + ceil_div(nL, D) >= beta: continue
                T = S | 1 << v
                if T not in nxt or nb < nxt[T][0]: nxt[T] = (nb, nc, nL)
        layer = nxt; states += len(nxt)
        if not layer: return "exhaustive pruned search found no better ordering", states
    raise AssertionError("an ordering with smaller backward weight exists — certificate REJECTED")

def main(path):
    certs = json.load(open(path)); ok = 0
    for name, c in certs.items():
        A = c["A"]; n = len(A)
        assert all(A[i][j] == -A[j][i] and isinstance(A[i][j], int) for i in range(n) for j in range(n)), "A not skew/integral"
        assert sorted(c["order"]) == list(range(n))
        comp_of = {}
        for ci, comp in enumerate(c["components"]):
            for v in comp["vertices"]: comp_of[v] = ci
        assert len(comp_of) == n
        assert all(not (comp_of[u] > comp_of[v] and A[u][v] > 0) for u in range(n) for v in range(n)), "decomposition invalid"
        assert sum((comp["order"] for comp in c["components"]), []) == c["order"], "component orders do not concatenate to order"
        W = sum(abs(A[i][j]) for i in range(n) for j in range(i + 1, n))
        F = sum(A[c["order"][r]][c["order"][t]] for r in range(n) for t in range(r + 1, n))
        how = []
        for comp in c["components"]:
            if len(comp["vertices"]) < 2: continue
            assert comp.get("verifiable", True), "component solved by a method without an exported certificate"
            h, s = verify_component(A, comp["vertices"], comp["order"], comp["beta"], comp["packing"]); how.append(f"{h} [{s} states]")
        assert F == W - 2 * sum(comp["beta"] for comp in c["components"]), "objective identity fails"
        print(f"ACCEPTED {name}: F = {F}; " + "; ".join(how)); ok += 1
    print(f"{ok}/{len(certs)} certificates accepted")

if __name__ == "__main__": main(sys.argv[1])
