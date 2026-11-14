"""Certified bracket  LB <= lambda(A) <= UB  for every instance with a proved-optimal ordering.
Skew form A = C - C^T. Definitions follow website/src/lib/studio/autocut.ts (port of the Lean-checked AutoCut):
  cut(S)  = #{(w not in S, u in S) : A[w][u] >= 0}            (weak-majority cut, `wmc`)
  K0(P)   = min over tau in {inf} U {positive cross values} of  N_neg + #{0 <= c < tau} + floor(X / tau),
            over cross pairs c = A[u][v] with block(u) < block(v); N_neg = #{c < 0}, X = sum(-c for c < 0)
  lambda  = min over ordered partitions P of  b(P)^2 + 3 K0(P).
UB is computed for every instance from its best ordering (any ordering yields a valid partition);
LB only where the ordering is proved optimal.
LB: Theorem 1 (Lean kernel-checked) says every prefix S of every optimal ordering has cut(S) <= lambda, so the
    largest prefix cut of a proved-optimal ordering is a lower bound.
UB: any explicit ordered partition gives an upper bound. We search partitions of the optimal ordering into
    consecutive blocks (DP for each max block size b and a grid of tau), then evaluate K0 EXACTLY by the formula.
Usage: python3 lambda_bounds.py  -> results/lambda.jsonl  (uses optimal orders from results/*.exact.jsonl)"""
import glob, json, os
import numpy as np
here = os.path.dirname(os.path.abspath(__file__))
man = {f"{r['family']}/{r['name']}": r for r in json.load(open(os.path.join(here, "manifest.json")))["instances"]}

def load_A(path):
    tok = open(path).read().split(); n = int(tok[0])
    C = np.array(list(map(int, tok[1:1 + n * n])), dtype=np.int64).reshape(n, n)
    A = C - C.T; np.fill_diagonal(A, 0); return C, A

def benefit(C, order):
    P = C[np.ix_(order, order)]; return int(np.triu(P, 1).sum())

def lower_bound(A, order):
    n = len(order); B = A[np.ix_(order, order)] >= 0   # B[a][b]: item at position a weakly beats item at b
    np.fill_diagonal(B, False)
    # cut(prefix of length p) = #{a >= p, b < p : B[a][b]}
    best = 0; cur = 0
    for p in range(1, n + 1):
        x = p - 1   # item moves from suffix into prefix
        cur += int(B[x + 1:, x].sum()) - int(B[x, :x].sum())
        best = max(best, cur)
    return best

def k0_exact(A, order, blocks_end):
    blk = np.zeros(len(order), dtype=np.int64); s = 0
    for k, e in enumerate(blocks_end): blk[s:e] = k; s = e
    P = A[np.ix_(order, order)]; a, b = np.triu_indices(len(order), 1)
    cross = P[a, b][blk[a] < blk[b]]
    neg = cross[cross < 0]; Nneg = len(neg); X = int(-neg.sum()); nonneg = np.sort(cross[cross >= 0])
    best = Nneg + len(nonneg)
    for t in np.unique(nonneg[nonneg > 0]):
        val = Nneg + int(np.searchsorted(nonneg, t, side="left")) + X // int(t)
        best = min(best, val)
    return best

def upper_bound(A, order):
    n = len(order); P = A[np.ix_(order, order)].astype(np.float64)
    pos = np.unique(P[P > 0]); taus = [np.inf] + ([float(np.quantile(pos, q)) for q in (0.05, 0.25, 0.5, 0.75, 0.95)] if len(pos) else [])
    sizes = sorted({b for b in [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128, 192, 256, n] if b <= n})
    best = (float(n * n), None)
    for tau in taus:
        w = np.where(P < 0, 1.0 + (-P) / tau, np.where(P < tau, 1.0, 0.0)); w = np.triu(w, 1)  # cost if (a,b) is a cross pair
        total = w.sum()
        rowcum = np.cumsum(w, axis=1)  # rowcum[a][j] = sum_{b<=j} w[a][b]
        for bmax in sizes:
            f = np.full(n + 1, -np.inf); f[0] = 0.0; arg = np.zeros(n + 1, dtype=np.int64)
            for j in range(1, n + 1):
                lo = max(0, j - bmax)
                # saved(i, j) = sum_{i<=a<b<j} w[a][b] = sum_{a=i}^{j-1} (rowcum[a][j-1] - rowcum[a][a])
                r = rowcum[lo:j, j - 1] - rowcum[np.arange(lo, j), np.arange(lo, j)]
                saved = np.cumsum(r[::-1])[::-1]          # saved[i-lo] for i in [lo, j)
                cand = f[lo:j] + saved
                k = int(np.argmax(cand)); f[j] = cand[k]; arg[j] = lo + k
            ends = []; j = n
            while j > 0: ends.append(j); j = arg[j]
            ends = ends[::-1]; starts = [0] + ends[:-1]
            b = max(e - s for s, e in zip(starts, ends))
            if b * b >= best[0]: continue
            lam = b * b + 3 * k0_exact(A, order, ends)
            if lam < best[0]: best = (lam, {"b": int(b), "blocks": len(ends)})
    return int(best[0]), best[1]

if __name__ == "__main__":
    # best ordering per instance: a proved-optimal one if any solver proved optimality, else the best found
    best = {}
    for f in sorted(glob.glob(os.path.join(here, "results", "*.exact.jsonl"))):
        for l in open(f):
            r = json.loads(l)
            if not r.get("order"): continue
            key = (bool(r.get("solved")), r["benefit"]); cur = best.get(r["id"])
            if cur is None or key > cur[0]: best[r["id"]] = (key, r["order"], r["benefit"], r["solver"])
    out = open(os.path.join(here, "results", "lambda.jsonl"), "w")
    for iid, ((proved, _), order, B, src) in sorted(best.items()):
        m = man[iid]; C, A = load_A(os.path.join(here, m["path"]))
        assert benefit(C, order) == B, iid
        lb = lower_bound(A, order) if proved else None; ub, wit = upper_bound(A, order)
        assert lb is None or lb <= ub, (iid, lb, ub)
        out.write(json.dumps({"id": iid, "n": m["n"], "lambda_lb": lb, "lambda_ub": ub, "witness": wit, "order_from": src, "order_proved_optimal": proved}) + "\n"); out.flush()
        print(iid, m["n"], lb, ub, wit, flush=True)
