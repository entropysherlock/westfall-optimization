import numpy as np, sys
sys.path.insert(0,'/home/claude')
from core import paley_sign
def insertion_ls(A, perm, rng):
    n=len(perm); perm=list(perm); improved=True
    while improved:
        improved=False
        for v in rng.permutation(n):
            i=perm.index(v); rest=perm[:i]+perm[i+1:]
            # gain of placing v at position k in rest: sum_{before} a_uv + sum_{after} a_vu
            col=np.array([A[u,v] for u in rest]); 
            pref=np.concatenate([[0],np.cumsum(col)])           # sum_{before} a_uv
            suf=np.concatenate([np.cumsum((-col)[::-1])[::-1],[0]])  # sum_{after} a_vu
            val=pref+suf; k=int(np.argmax(val))
            if val[k] > val[i]+1e-12:
                perm=rest[:k]+[v]+rest[k:]; improved=True
    return perm
def score(A,perm):
    idx=np.array(perm); return np.triu(A[np.ix_(idx,idx)],1).sum()
if __name__=='__main__':
  p=int(sys.argv[1]); A=paley_sign(p); rng=np.random.default_rng(1); best=-1e9
  for r in range(int(sys.argv[2])):
    s=score(A,insertion_ls(A,rng.permutation(p),rng)); best=max(best,s)
  print(p,"best local-search core score",best)
