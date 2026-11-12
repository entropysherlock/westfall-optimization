"""
Self-Localizing Exclusion DP (SLDP) for weighted linear ordering.

Survival rule for prefix S (layer by layer, only children of survivors are generated):
      f(S) + r(S) + U(V\\S) >= t,      t = score of a real incumbent ordering,
where f(S) = best chain value to S through survivors, r(S) = sum_{u in S, w notin S} a_uw,
and U(T) = sum_{pairs in T} |a| (trivial admissible bound) or any tighter admissible bound.
Every ordering scoring >= t survives (chain induction), so OPT and exact pair certificates follow.

Theorem (Competitive Ball): every survivor S satisfies  wInv_pi*(S) <= 3 beta* + delta  for every optimal pi*,
with beta* = min backward weight, delta = (OPT - t)/2, wInv = weight of pairs (w notin S before u in S in pi*).
"""
import numpy as np, time

def bits(S, n):
    return ((S[:, None] >> np.arange(n)) & 1).astype(np.float64)

def triangle_packing(A):
    """Max fractional packing of directed 3-cycles (positive digraph a_uv>0 means u->v preferred),
    sum_{D containing arc e} y_D <= a_e.  Returns (masks, y) for y>0.  One LP on the whole instance."""
    from scipy.optimize import linprog
    from scipy.sparse import lil_matrix
    n=A.shape[0]; tri=[]
    for i in range(n):
        for j in range(i+1,n):
            for k in range(j+1,n):
                if A[i,j]>0 and A[j,k]>0 and A[k,i]>0: tri.append(((i,j),(j,k),(k,i)))
                elif A[j,i]>0 and A[k,j]>0 and A[i,k]>0: tri.append(((j,i),(k,j),(i,k)))
    if not tri: return np.zeros(0,np.int64), np.zeros(0)
    arcs={}; 
    for T in tri:
        for e in T: arcs.setdefault(e,len(arcs))
    M=lil_matrix((len(arcs),len(tri)))
    for c,T in enumerate(tri):
        for e in T: M[arcs[e],c]=1
    cap=np.array([A[e] for e in arcs])
    r=linprog(-np.ones(len(tri)),A_ub=M.tocsr(),b_ub=cap,bounds=(0,None),method='highs')
    y=np.maximum(r.x,0)*(1-1e-9)           # tiny shrink keeps the packing feasible under rounding
    keep=y>1e-12
    masks=np.array([sum(1<<v for v in {u for e in T for u in e}) for T in tri],dtype=np.int64)[keep]
    return masks, y[keep]

def sldp(A, t, chunk=200000, want_pairs=True, check_ball=None, ub_kind='trivial', hybrid=None, keep_layers=False):
    n = A.shape[0]; absA = np.abs(A); rs = A.sum(1)
    if ub_kind=='packing':
        tmask, ty = triangle_packing(A)
    layers = [np.array([0], dtype=np.int64)]; fs = [np.array([0.0])]
    generated = 1; t0 = time.time(); peak = 1
    for k in range(1, n + 1):
        Sp, fp = layers[-1], fs[-1]
        ch = np.unique(np.concatenate([Sp[((Sp >> v) & 1) == 0] | (1 << v) for v in range(n)]))
        generated += len(ch)
        keepS, keepf = [], []
        for c0 in range(0, len(ch), chunk):
            C = ch[c0:c0 + chunk]; best = np.full(len(C), -np.inf)
            for v in range(n):
                has = ((C >> v) & 1).astype(bool)
                if not has.any(): continue
                par = C[has] ^ (1 << v)
                idx = np.searchsorted(Sp, par); idx[idx >= len(Sp)] = 0
                ok = Sp[idx] == par
                if not ok.any(): continue
                Bp = bits(par[ok], n)
                val = fp[idx[ok]] + Bp @ A[:, v]
                tmp = np.full(has.sum(), -np.inf); tmp[ok] = val
                best[has] = np.maximum(best[has], tmp)
            B = bits(C, n); Bc = 1 - B
            ub = 0.5 * ((Bc @ absA) * Bc).sum(1)
            if ub_kind=='packing' and len(ty):
                comp = (~C) & ((1 << n) - 1)
                lb = np.zeros(len(C))
                for m0 in range(0, len(ty), 256):
                    mm = tmask[m0:m0+256]; inside = (comp[:, None] & mm[None, :]) == mm[None, :]
                    lb += inside @ ty[m0:m0+256]
                ub = ub - 2 * lb
            if hybrid is not None:
                comp = (~C) & ((1 << n) - 1)
                ub = np.minimum(ub, 0.5 * ((Bc @ absA) * Bc).sum(1) - 2 * hybrid.lower_beta(comp))
            r = B @ rs
            keep = best + r + ub >= t - 1e-9
            keepS.append(C[keep]); keepf.append(best[keep])
        layers.append(np.concatenate(keepS)); fs.append(np.concatenate(keepf))
        peak = max(peak, len(layers[-1]))
    full = (1 << n) - 1
    if len(layers[-1]) == 0 or layers[-1][0] != full:
        return dict(status='threshold above OPT', generated=generated)
    OPT = fs[-1][0]
    survivors = sum(len(L) for L in layers)
    # backward pass
    bs = [None] * (n + 1); bs[n] = np.array([0.0])
    for k in range(n - 1, -1, -1):
        S, Sn = layers[k], layers[k + 1]; b = np.full(len(S), -np.inf)
        for c0 in range(0, len(S), chunk):
            C = S[c0:c0 + chunk]; G = bits(C, n) @ A; bb = np.full(len(C), -np.inf)
            for v in range(n):
                no = ((C >> v) & 1) == 0
                if not no.any(): continue
                c = C[no] | (1 << v); idx = np.searchsorted(Sn, c); idx[idx >= len(Sn)] = 0
                ok = Sn[idx] == c
                val = np.full(no.sum(), -np.inf); val[ok] = G[no][ok, v] + bs[k + 1][idx[ok]]
                bb[no] = np.maximum(bb[no], val)
            b[c0:c0 + chunk] = bb
        bs[k] = b
    t1 = time.time()
    res = dict(layers=layers if keep_layers else None, fs=fs if keep_layers else None, status='optimal (proved)', OPT=OPT, generated=generated, survivors=survivors,
               excluded=generated - survivors, peak_layer=peak, dp_time=t1 - t0)
    if want_pairs:
        W = np.full((n, n), -np.inf)
        for k in range(n):
            S, Sn = layers[k], layers[k + 1]
            for c0 in range(0, len(S), chunk):
                C = S[c0:c0 + chunk]; B = bits(C, n).astype(bool); G = B.astype(float) @ A
                fC = fs[k][c0:c0 + chunk]
                for x in range(n):
                    no = ((C >> x) & 1) == 0
                    if not no.any(): continue
                    c = C[no] | (1 << x); idx = np.searchsorted(Sn, c); idx[idx >= len(Sn)] = 0
                    ok = Sn[idx] == c
                    if not ok.any(): continue
                    val = fC[no][ok] + G[no][ok, x] + bs[k + 1][idx[ok]]
                    Bm = B[no][ok]
                    W[:, x] = np.maximum(W[:, x], np.where(Bm, val[:, None], -np.inf).max(0))
        cert = [(x, y) for x in range(n) for y in range(n) if x != y and W[y, x] < OPT - 1e-9]
        marg = min((OPT - W[y, x] for x, y in cert), default=np.nan)
        res.update(certified=len(cert), pairs=n * (n - 1) // 2, min_margin=marg, pair_time=time.time() - t1)
    if check_ball is not None:            # check_ball = an optimal order (list)
        pos = np.empty(n, int); pos[np.array(check_ball)] = np.arange(n)
        beta = sum(absA[i, j] for i in range(n) for j in range(n) if pos[i] < pos[j] and A[i, j] < 0)
        delta = (OPT - t) / 2; R = 3 * beta + delta; worst = 0
        for L in layers:
            for c0 in range(0, len(L), chunk):
                B = bits(L[c0:c0 + chunk], n)
                # wInv(S) = sum over pairs (w notin S, u in S, pos[w]<pos[u]) |a_wu|
                M = absA * (pos[:, None] < pos[None, :])
                w = (((1 - B) @ M) * B).sum(1)
                worst = max(worst, w.max())
        res.update(ball_radius=R, max_wInv_survivor=worst, ball_ok=bool(worst <= R + 1e-7))
    return res

def order_from_layers_free(A, order):
    idx = np.array(order); return float(np.triu(A[np.ix_(idx, idx)], 1).sum())
