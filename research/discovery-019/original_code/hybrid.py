"""Hybrid hereditary bound + block-localization machinery (Discovery 018)."""
import numpy as np, itertools
from scipy.optimize import linprog
from scipy.sparse import lil_matrix
from vdp import subset_dp

def block_tables(A, blocks):
    """beta*(X) for every X subset of every block (local bitmask index)."""
    tabs=[]
    for B in blocks:
        sub=A[np.ix_(B,B)]; dp,_,_=subset_dp(sub)
        b=len(B); m=np.arange(1<<b)
        absS=np.abs(sub); W=np.zeros(1<<b)
        for i in range(b):
            for j in range(i+1,b):
                W+=absS[i,j]*(((m>>i)&1)&((m>>j)&1))
        tabs.append((W-dp)/2.0)          # beta*(X) = (W(X)-OPT(X))/2
    return tabs

def transversal_packing(A, blocks):
    """Fractional packing of directed triangles with vertices in 3 distinct blocks; capacities = cross arcs."""
    n=A.shape[0]; blk=np.empty(n,int)
    for k,B in enumerate(blocks): blk[B]=k
    tri=[]
    for i,j,k in itertools.combinations(range(n),3):
        if len({blk[i],blk[j],blk[k]})<3: continue
        if A[i,j]>0 and A[j,k]>0 and A[k,i]>0: tri.append(((i,j),(j,k),(k,i)))
        elif A[j,i]>0 and A[k,j]>0 and A[i,k]>0: tri.append(((j,i),(k,j),(i,k)))
    if not tri: return np.zeros(0,np.int64),np.zeros(0)
    arcs={}
    for T in tri:
        for e in T: arcs.setdefault(e,len(arcs))
    M=lil_matrix((len(arcs),len(tri)))
    for c,T in enumerate(tri):
        for e in T: M[arcs[e],c]=1
    r=linprog(-np.ones(len(tri)),A_ub=M.tocsr(),b_ub=np.array([A[e] for e in arcs]),bounds=(0,None),method='highs')
    y=np.maximum(r.x,0)*(1-1e-9); keep=y>1e-12
    masks=np.array([sum(1<<v for v in {u for e in T for u in e}) for T in tri],dtype=np.int64)[keep]
    return masks,y[keep]

class HybridBound:
    """U_hyb(T) = W(T) - 2*[ sum_i beta*(T∩B_i) + sum_{transversal D ⊆ T} y'_D ]  (valid for every T)."""
    def __init__(self,A,blocks):
        self.blocks=[np.array(B) for B in blocks]; self.tabs=block_tables(A,blocks)
        self.tm,self.ty=transversal_packing(A,blocks)
    def lower_beta(self,T):
        lb=np.zeros(len(T))
        for B,tab in zip(self.blocks,self.tabs):
            idx=np.zeros(len(T),np.int64)
            for k,v in enumerate(B): idx|=((T>>int(v))&1)<<k
            lb+=tab[idx]
        for m0 in range(0,len(self.ty),256):
            mm=self.tm[m0:m0+256]; lb+=((T[:,None]&mm[None,:])==mm[None,:])@self.ty[m0:m0+256]
        return lb

def segment(A, order, bmax):
    """Exact DP: split the incumbent order into contiguous segments of size <= bmax maximising the
    backward weight kept inside segments (= minimising reversed cross weight X).  O(n*bmax)."""
    n=len(order); pos=np.empty(n,int); pos[np.array(order)]=np.arange(n)
    # backward arcs w.r.t. order: pairs (p<q) with a_{order[p],order[q]}<0, weight |a|
    Bk=np.zeros((n,n))
    for p in range(n):
        for q in range(p+1,n):
            v=A[order[p],order[q]]
            if v<0: Bk[p,q]=-v
    C=np.zeros((n+1,n+1)); C[1:,1:]=np.cumsum(np.cumsum(Bk,0),1)
    def inside(s,e):  # backward weight with both ends in positions [s,e)
        return C[e,e]-C[s,e]-C[e,s]+C[s,s]
    best=np.full(n+1,-np.inf); best[0]=0; arg=np.zeros(n+1,int)
    for e in range(1,n+1):
        for s in range(max(0,e-bmax),e):
            v=best[s]+inside(s,e)
            if v>best[e]: best[e]=v; arg[e]=s
    segs=[]; e=n
    while e>0: s=arg[e]; segs.append([int(x) for x in order[s:e]]); e=s
    segs=segs[::-1]; total=Bk.sum()
    return segs, total-best[n]          # blocks, X (reversed cross weight)

def block_params2(A,blocks,delta):
    """Discovery 019 parameters: zero-weight-aware K and the square-root state bound
       N <= n * (n+1) * P(2K + b^2),  P(M) = sum_{j<=M} p(j) <= (M+1) exp(pi sqrt(2M/3))."""
    import math
    n=A.shape[0]; blk=np.empty(n,int)
    for k,B in enumerate(blocks): blk[B]=k
    X=0.0; mu=np.inf; z=0
    for i in range(n):
        for j in range(n):
            if i!=j and blk[i]<blk[j]:
                if A[i,j]==0: z+=1
                else:
                    mu=min(mu,abs(A[i,j]))
                    if A[i,j]<0: X+=-A[i,j]
    b=max(len(B) for B in blocks)
    Kp=0 if not np.isfinite(mu) else int(np.floor((delta+3*X)/mu+1e-12))
    K=Kp+z; M=2*K+b*b
    log2N=math.log2(n)+math.log2(n+1)+math.log2(M+1)+math.pi*math.sqrt(2*M/3)/math.log(2)
    return dict(X=X,mu_plus=mu,zero_cross=z,K=K,b=b,m=len(blocks),log2_state_bound=log2N)

def block_params(A,blocks,delta):
    n=A.shape[0]; blk=np.empty(n,int)
    for k,B in enumerate(blocks): blk[B]=k
    X=0.0; mu=np.inf
    for i in range(n):
        for j in range(n):
            if i!=j and blk[i]<blk[j]:
                mu=min(mu,abs(A[i,j]))
                if A[i,j]<0: X+=-A[i,j]
    b=max(len(B) for B in blocks); m=len(blocks)
    if mu<=0: return dict(X=X,mu_c=mu,K=float('inf'),b=b,m=m,log_state_bound=float('inf'))
    K=int(np.floor((delta+3*X)/mu+1e-12))
    import math
    logb=math.log(m+1)+b*math.log(2)+K*math.log(2*K*b+1)
    return dict(X=X,mu_c=mu,K=K,b=b,m=m,log_state_bound=logb)

def inv_blk(S, blocks, n):
    blk=np.empty(n,int)
    for k,B in enumerate(blocks): blk[B]=k
    pres=[(S>>v)&1 for v in range(n)]
    return sum(1 for w in range(n) for u in range(n) if blk[w]<blk[u] and not pres[w] and pres[u])
