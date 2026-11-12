import numpy as np, itertools, math
from hybrid import HybridBound, segment, block_params2, inv_blk
from sldp import sldp
from ls import insertion_ls, score
from counting import P
rng=np.random.default_rng(190)
def inst(kind,n):
    A=np.zeros((n,n))
    for i in range(n):
        for j in range(i+1,n):
            if kind=='ties': v=float(rng.integers(-2,3))                     # many zero weights
            elif kind=='zeromix': v=0.0 if rng.random()<0.15 else (1 if rng.random()>.2 else -1)+rng.uniform(-.05,.05)
            elif kind=='uniform': v=rng.uniform(-1,1)
            else: v=(1 if rng.random()>.2 else -1)+rng.uniform(-.05,.05)
            A[i,j]=v; A[j,i]=-v
    return A
fails=0; runs=0; bound_viol=0; maxslack=-1e9
for kind in ['ties','zeromix','uniform','neartrans']:
    for _ in range(10):
        n=8 if _<4 else 11; A=inst(kind,n)
        from vdp import subset_dp
        opt=subset_dp(A)[0][-1] if n>8 else max(score(A,list(p)) for p in itertools.permutations(range(n)))
        order=insertion_ls(A,rng.permutation(n),rng); L=score(A,order)
        pos=np.empty(n,int); pos[np.array(order)]=np.arange(n)
        for blocks in [segment(A,order,3)[0], sorted([list(c) for c in np.array_split(rng.permutation(n),3)],key=lambda B:np.mean(pos[B]))]:
            H=HybridBound(A,blocks); r=sldp(A,L,hybrid=H,keep_layers=True,want_pairs=False); runs+=1
            par=block_params2(A,blocks,(opt-L)/2)
            mx=max(inv_blk(int(S),blocks,n) for Ly in r['layers'] for S in Ly)
            fails+= mx>par["K"]; maxslack=max(maxslack,mx-par["K"])
            N=r['generated']; B=n*(n+1)*P(2*par['K']+par['b']**2)
            bound_viol+= N>B
print(f"{runs} runs (ties / zero-weight mixes / uniform / near-transitive, segmentation and random partitions):")
print(f"  survivors violating I(S) <= K (zero-aware K = floor((delta+3X)/mu_+) + z): {fails}; max(I-K) = {maxslack}")
print(f"  generated-state count exceeding n(n+1)P(2K+b^2): {bound_viol}")
