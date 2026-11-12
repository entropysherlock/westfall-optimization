"""Pairwise block dual decomposition (PBD) certificate.
Theorem: write A = sum_{i<j} A^{(ij)}, A^{(ij)} supported on B_i ∪ B_j, carrying all cross entries of (B_i,B_j)
and a fraction w_i^{(j)} of B_i's internal entries (sum_j w_i^{(j)} = 1).  If for every i<j every optimal
ordering of A^{(ij)} puts B_i entirely before B_j, then OPT(A) = sum_i OPT(B_i) + sum_{i<j} R_ij and every
global optimum is B_1 < ... < B_m with internally optimal blocks."""
import numpy as np
from vdp import subset_dp
def pair_margin(A,Bi,Bj,wi,wj):
    V=list(Bi)+list(Bj); k=len(V); bi=len(Bi)
    M=A[np.ix_(V,V)].copy(); M[:bi,:bi]*=wi; M[bi:,bi:]*=wj
    dp,_,_=subset_dp(M); full=(1<<k)-1; S=np.arange(1<<k,dtype=np.int64)
    r=(((S[:,None]>>np.arange(k))&1)*M.sum(1)).sum(1)
    thr=dp+r+dp[full^S]
    mi=(1<<bi)-1; mj=full^mi
    inter=((S&mj)!=0)&((S&mi)!=mi)
    return thr[mi]-thr[inter].max()
def pbd_certify(A,blocks):
    m=len(blocks); mixed=[[False]*m for _ in range(m)]
    for i in range(m):
        for j in range(i+1,m):
            mixed[i][j]=bool((A[np.ix_(blocks[i],blocks[j])]<=0).any())
    deg=[sum(mixed[min(i,j)][max(i,j)] for j in range(m) if j!=i) for i in range(m)]
    margins={}
    for i in range(m):
        for j in range(i+1,m):
            if mixed[i][j]:
                margins[(i,j)]=pair_margin(A,blocks[i],blocks[j],1/deg[i],1/deg[j])
    ok=all(v>1e-9 for v in margins.values())
    return ok, margins
