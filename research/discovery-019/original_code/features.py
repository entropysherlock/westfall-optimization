"""Cheap pre-search features (no exact search): incumbent backward weight b0, triangle-packing lower bound P,
hybrid lower bound H at V, relative gaps."""
import numpy as np, time
from sldp import triangle_packing
from hybrid import HybridBound, segment, block_params
from ls import insertion_ls, score
def features(A, bmax_list=(8,12,16,20)):
    n=A.shape[0]; rng=np.random.default_rng(1); W=np.abs(np.triu(A,1)).sum()
    order=max((insertion_ls(A,rng.permutation(n),rng) for _ in range(5)),key=lambda o:score(A,o))
    L=score(A,order); b0=(W-L)/2
    t=time.time(); pm,py=triangle_packing(A); P=py.sum(); tp=time.time()-t
    gap=(b0-P)/max(b0,1e-12)
    return dict(n=n,b0=b0,P=P,gap=gap,order=order,L=L,t_pack=tp)

def full_features(A):
    f=features(A); n=A.shape[0]
    iu=np.triu_indices(n,1); f['zero_frac']=float((A[iu]==0).mean())
    f['rho']=0.0; f['blocks']=None
    if f['gap']>=0.03 and n<=62:
        best=None
        for bmax in (8,12,16,20):
            blocks,X=segment(A,f['order'],bmax); par=block_params(A,blocks,0.0)
            if best is None or par['log_state_bound']<best[0]: best=(par['log_state_bound'],blocks)
        H=HybridBound(A,best[1]); full=np.array([(1<<n)-1],dtype=np.int64)
        Hlb=float(H.lower_beta(full)[0])
        f['rho']=(Hlb-f['P'])/max(f['b0']-f['P'],1e-12); f['blocks']=best[1]; f['H']=H
    return f
