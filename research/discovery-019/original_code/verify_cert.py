"""Independent certificate checker (pure Python, no shared code with the search).
Certificate = (incumbent order, kept states per layer with f-values, bound data).
Checks: (1) packing is a feasible fractional packing of directed 3-cycles; (2) block tables equal independently
recomputed beta*(X); (3) every stored f equals the max over kept predecessors; (4) every non-kept child of a kept
state violates the exclusion inequality f + r + U(V\\C) >= t; (5) f(V) equals the incumbent score.
By the completeness lemma, (3)-(5) prove the incumbent optimal."""
import itertools
def check(A, order, layers, fs, t, pack=None, hyb=None, tol=1e-7):
    n=len(A); a=[[float(A[i][j]) for j in range(n)] for i in range(n)]
    absw=lambda S: sum(abs(a[i][j]) for i in range(n) for j in range(i+1,n) if S>>i&1 and S>>j&1)
    def lbeta(T):
        lb=0.0
        if pack is not None:
            for m,y in zip(*pack):
                if T&m==m: lb+=y
        return lb
    # (1) packing feasibility
    for P in [pack] + ([ (hyb['tm'],hyb['ty']) ] if hyb else []):
        if P is None: continue
        cap={}
        for m,y in zip(*P):
            vs=[v for v in range(n) if m>>v&1]; assert len(vs)==3,'mask not a triangle'
            i,j,k=vs
            if a[i][j]>0 and a[j][k]>0 and a[k][i]>0: arcs=[(i,j),(j,k),(k,i)]
            elif a[j][i]>0 and a[k][j]>0 and a[i][k]>0: arcs=[(j,i),(k,j),(i,k)]
            else: raise AssertionError('not a directed 3-cycle')
            for e in arcs: cap[e]=cap.get(e,0)+y
        for e,s in cap.items(): assert s<=a[e[0]][e[1]]+1e-12, ('capacity violated',e)
    # (2) independent block tables: beta*(X) by brute force over permutations of X
    tabs=None
    if hyb:
        tabs=[]
        for B in hyb['blocks']:
            B=list(B); tab={}
            for mask in range(1<<len(B)):
                X=[B[k] for k in range(len(B)) if mask>>k&1]; best=float('inf')
                if len(X)<=8:
                    for p in itertools.permutations(X):
                        bw=sum(abs(a[p[r]][p[s]]) for r in range(len(p)) for s in range(r+1,len(p)) if a[p[r]][p[s]]<0)
                        best=min(best,bw)
                else: best=hyb['tabs'][len(tabs)][mask]   # too large for brute force: trust (flagged)
                tab[mask]=best
            tabs.append((B,tab))
    def U(T):
        u=absw(T)
        lb=lbeta(T); best=u-2*lb
        if hyb:
            lbh=sum(tab[sum(1<<k for k,v in enumerate(B) if T>>v&1)] for B,tab in tabs)
            for m,y in zip(hyb['tm'],hyb['ty']):
                if T&m==m: lbh+=y
            best=min(best,u-2*lbh)
        return best
    full=(1<<n)-1; kept=[dict(zip(map(int,L),map(float,F))) for L,F in zip(layers,fs)]
    gain=lambda v,S: sum(a[u][v] for u in range(n) if S>>u&1)
    r=lambda S: sum(a[u][w] for u in range(n) if S>>u&1 for w in range(n) if not S>>w&1)
    nchk=0
    for k in range(1,n+1):
        prev=kept[k-1]; cur=kept[k]; cand={}
        for S,fS in prev.items():
            for v in range(n):
                if not S>>v&1:
                    C=S|1<<v; val=fS+gain(v,S)
                    if C not in cand or val>cand[C]: cand[C]=val
        for C,fc in cand.items():
            nchk+=1
            if C in cur: assert abs(cur[C]-fc)<=tol, ('f mismatch',C)
            else: assert fc+r(C)+U(full^C) < t+tol, ('excluded state not justified',C)
        assert set(cur)<=set(cand), 'kept state without kept parent'
    sc=sum(a[order[i]][order[j]] for i in range(n) for j in range(i+1,n))
    assert abs(kept[n][full]-sc)<=tol, 'optimum not attained by order'
    return dict(ok=True, states_checked=nchk, OPT=sc, block_tables_bruteforced=all(len(B)<=8 for B,_ in tabs) if tabs else None)
