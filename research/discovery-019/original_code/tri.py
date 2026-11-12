import numpy as np, itertools
from scipy.optimize import linprog
from scipy.sparse import lil_matrix
def tri_lp(A, fix=None):
    """Triangle LP for max sum_{i<j} a_ij(2z_ij-1); z_ij (i<j) = P(i before j).
    fix=(u,v): u before v. Returns value."""
    n=A.shape[0]; pairs=[(i,j) for i in range(n) for j in range(i+1,n)]
    idx={pq:k for k,pq in enumerate(pairs)}
    def zv(i,j):  # returns (k,sign,const) such that z_ij = const + sign*z_k
        return (idx[(i,j)],1,0) if i<j else (idx[(j,i)],-1,1)
    rows=[];b=[]
    for i,j,k in itertools.combinations(range(n),3):
        for (a,bb,c) in [(i,j,k),(i,k,j)]:
            # z_ab+z_bc+z_ca <=2 and >=1
            coef={};const=0
            for (s,t) in [(a,bb),(bb,c),(c,a)]:
                q,sg,cs=zv(s,t); coef[q]=coef.get(q,0)+sg; const+=cs
            rows.append((coef,2-const))
    M=lil_matrix((len(rows),len(pairs)))
    for r,(coef,rhs) in enumerate(rows):
        for q,v in coef.items(): M[r,q]=v
        b.append(rhs)
    c=np.array([-2*A[i,j] for i,j in pairs]); const=-sum(A[i,j] for i,j in pairs)
    bounds=[(0,1)]*len(pairs)
    if fix:
        u,v=fix; q,sg,cs=zv(u,v); val=1  # z_uv=1
        zq = 1 if sg==1 else 0
        bounds[q]=(zq,zq)
    r=linprog(c,A_ub=M.tocsr(),b_ub=b,bounds=bounds,method='highs')
    return -r.fun+const if False else -(r.fun) - sum(A[i,j] for i,j in pairs)
