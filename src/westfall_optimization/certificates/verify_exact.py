"""
Exact certificate format + independent exact verifier (Discovery 019).

All arithmetic is exact: every input weight / packing value is a dyadic rational (IEEE doubles are), so the
producer multiplies everything by one common power of two D and the verifier works in Python integers.

Certificate (dict):
  'D'      : int, common scale (power of two)
  'A'      : n x n list of ints  (exact a_ij * D), must be skew-symmetric
  'order0' : incumbent permutation  (threshold t := F(order0), recomputed here, never trusted)
  'order'  : claimed optimal permutation
  'layers' : list (k = 0..n) of sorted lists of kept prefix masks
  'pack'   : list of (mask, y_int)  global directed-triangle packing (y_int = y * D)
  'hyb'    : None or {'blocks': list of vertex lists, 'tri': list of (mask, y_int)}  (transversal packing)
Accept => OPT(A) = F(order) exactly (Lemma 0 of Discovery 017 + Theorem 1 of Discovery 018).
"""
from itertools import combinations

class Reject(Exception): pass

def _score(A, order):
    return sum(A[order[i]][order[j]] for i in range(len(order)) for j in range(i + 1, len(order)))

def _is_perm(o, n): return sorted(o) == list(range(n))

def _arcs_of_triangle(A, mask, n):
    vs = [v for v in range(n) if mask >> v & 1]
    if len(vs) != 3: raise Reject(f"packing mask {mask} is not a 3-set")
    i, j, k = vs
    if A[i][j] > 0 and A[j][k] > 0 and A[k][i] > 0: return [(i, j), (j, k), (k, i)]
    if A[j][i] > 0 and A[k][j] > 0 and A[i][k] > 0: return [(j, i), (k, j), (i, k)]
    raise Reject(f"mask {mask} is not a directed 3-cycle of the strict preference digraph")

def _check_packing(A, tri, n, blk=None):
    load = {}
    for mask, y in tri:
        if y < 0: raise Reject("negative packing value")
        arcs = _arcs_of_triangle(A, mask, n)
        if blk is not None and len({blk[v] for e in arcs for v in e}) != 3:
            raise Reject("hybrid packing uses a non-transversal triangle (would double count)")
        for e in arcs: load[e] = load.get(e, 0) + y
    for (u, v), s in load.items():
        if s > A[u][v]: raise Reject(f"arc capacity violated on {(u, v)}: {s} > {A[u][v]}")

def _block_beta_table(A, B):
    """beta*(X) * D for every X subset of block B, by an exact subset DP written independently here."""
    b = len(B); full = (1 << b) - 1
    best = [None] * (1 << b); best[0] = 0          # best = max internal score of X
    for m in range(1, 1 << b):
        cand = None
        for k in range(b):
            if m >> k & 1:
                prev = m ^ (1 << k)
                g = best[prev] + sum(A[B[j]][B[k]] for j in range(b) if prev >> j & 1)
                if cand is None or g > cand: cand = g
        best[m] = cand
    tab = []
    for m in range(1 << b):
        W = sum(abs(A[B[i]][B[j]]) for i in range(b) for j in range(i + 1, b) if m >> i & 1 and m >> j & 1)
        if (W - best[m]) % 2: raise Reject("internal parity error")
        tab.append((W - best[m]) // 2)            # beta* in units of 1/D (W - OPT is always even in these units? see note)
    return tab

def verify(cert, A_input=None):
    """A_input: the user's own matrix (floats or Fractions). If given, the certificate must be about exactly it."""
    A = cert['A']; n = len(A)
    if A_input is not None:
        from fractions import Fraction
        D = cert['D']
        if len(A_input) != n or any(Fraction(float(A_input[i][j])) * D != A[i][j] for i in range(n) for j in range(n)):
            raise Reject("certificate is not about the supplied instance")
    for i in range(n):
        if A[i][i] != 0: raise Reject("nonzero diagonal")
        for j in range(n):
            if A[i][j] != -A[j][i]: raise Reject("matrix not skew-symmetric")
    if not (_is_perm(cert['order0'], n) and _is_perm(cert['order'], n)): raise Reject("orders are not permutations")
    t = _score(A, cert['order0'])
    _check_packing(A, cert['pack'], n)
    tabs = None
    if cert.get('hyb'):
        blocks = cert['hyb']['blocks']
        if sorted(v for B in blocks for v in B) != list(range(n)): raise Reject("blocks are not a partition")
        blk = {v: k for k, B in enumerate(blocks) for v in B}
        _check_packing(A, cert['hyb']['tri'], n, blk)
        tabs = [(B, _block_beta_table(A, B)) for B in blocks]
    absA = [[abs(x) for x in r] for r in A]
    def U2(T):      # returns 2*U(T)*... we keep everything doubled to stay integral: 2*U = 2W - 4*LB
        W = sum(absA[i][j] for i in range(n) for j in range(i + 1, n) if T >> i & 1 and T >> j & 1)
        lb = sum(y for m, y in cert['pack'] if T & m == m)
        if tabs is not None:
            lbh = sum(tab[sum(1 << k for k, v in enumerate(B) if T >> v & 1)] for B, tab in tabs) * 2  # tab is beta*, doubled below
            lbh_tri = sum(y for m, y in cert['hyb']['tri'] if T & m == m)
            lb2 = max(2 * lb, lbh + 2 * lbh_tri)
        else:
            lb2 = 2 * lb
        return 2 * W - 2 * lb2          # = 2*(W - 2*LB)
    layers = cert['layers']
    if len(layers) != n + 1 or layers[0] != [0]: raise Reject("layer structure malformed")
    full = (1 << n) - 1
    f_prev = {0: 0}; checked = 0
    for k in range(1, n + 1):
        cand = {}
        for S, fS in f_prev.items():
            for v in range(n):
                if not S >> v & 1:
                    C = S | (1 << v); val = fS + sum(A[u][v] for u in range(n) if S >> u & 1)
                    if C not in cand or val > cand[C]: cand[C] = val
        kept = set(layers[k])
        if not kept <= set(cand): raise Reject(f"layer {k}: a kept state has no kept parent")
        for C, fc in cand.items():
            if C in kept: continue
            checked += 1
            r = sum(A[u][w] for u in range(n) if C >> u & 1 for w in range(n) if not C >> w & 1)
            if not (2 * (fc + r) + U2(full ^ C) < 2 * t):
                raise Reject(f"layer {k}: excluded state {C} not justified")
        f_prev = {C: cand[C] for C in kept}
    if full not in f_prev: raise Reject("no kept chain reaches V")
    opt = _score(A, cert['order'])
    if f_prev[full] != opt: raise Reject(f"claimed order scores {opt}, but the kept DAG reaches {f_prev[full]}")
    if opt < t: raise Reject("claimed optimum below the incumbent threshold")
    return dict(accepted=True, OPT_scaled=opt, D=cert['D'], OPT=opt / cert['D'], excluded_checked=checked,
                kept=sum(len(L) for L in layers))
