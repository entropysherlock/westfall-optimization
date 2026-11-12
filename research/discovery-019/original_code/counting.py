"""Phase A: exact counts of S_K = {S : I_B(S) <= K} for ordered block partitions.
I_B(S) = #{(w,u): w notin S, u in S, blk(w) < blk(u)}."""
import itertools, math
from functools import lru_cache
def brute_counts(sizes, Kmax):
    n=sum(sizes); blk=[k for k,s in enumerate(sizes) for _ in range(s)]
    cnt=[0]*(Kmax+1)
    for S in range(1<<n):
        I=0; absent_before=[0]*len(sizes)
        # count pairs (w absent, u present, blk(w)<blk(u))
        ab=0; cur=-1; ab_prev_blocks=0; ab_in_block=0
        for v in range(n):
            if blk[v]!=cur: ab_prev_blocks+=ab_in_block; ab_in_block=0; cur=blk[v]
            if S>>v&1: I+=ab_prev_blocks
            else: ab_in_block+=1
            if I>Kmax: break
        if I<=Kmax: cnt[I]+=1
    return [sum(cnt[:k+1]) for k in range(Kmax+1)]
def dp_counts(sizes, Kmax):
    """Exact: process blocks in order; state (A = absent so far, I so far)."""
    states={(0,0):1}
    for b in sizes:
        new={}
        for (A,I),c in states.items():
            for x in range(b+1):
                I2=I+A*x
                if I2>Kmax: continue
                key=(A+b-x,I2); new[key]=new.get(key,0)+c*math.comb(b,x)
        states=new
    cnt=[0]*(Kmax+1)
    for (A,I),c in states.items(): cnt[I]+=c
    out=[];s=0
    for k in range(Kmax+1): s+=cnt[k]; out.append(s)
    return out
@lru_cache(None)
def p(j):  # partition numbers
    a=[1]+[0]*j
    for part in range(1,j+1):
        for s in range(part,j+1): a[s]+=a[s-part]
    return a[j]
_PT=[1]
def _extend(M):
    global _PT
    if len(_PT)>M: return
    a=[0]*(M+1); a[0]=1
    for part in range(1,M+1):
        for s in range(part,M+1): a[s]+=a[s-part]
    _PT=a
def P(M):
    _extend(M); return sum(_PT[:M+1])
def thmA_bound(sizes,K):
    n=sum(sizes); b=max(sizes); M=K*(b+1)+b*b//4
    return (n+1)*P(M)

def thmS_bound(sizes,K):
    """Square-root theorem: |S_K| <= (n+1) * sum_{j <= 2K + b^2} p(j)."""
    n=sum(sizes); b=max(sizes); return (n+1)*P(2*K+b*b)
def lower_halfchain(b,K):
    """Explicit family: r consecutive blocks with exactly floor(b/2) present each (any subset), earlier full, later empty."""
    h=b//2; r=1
    while (r+1)*r//2*h*(b-h)<=K: r+=1
    return math.comb(b,h)**r
