import numpy as np, time, sys, resource
from scipy.optimize import milp, LinearConstraint, Bounds
from scipy.sparse import lil_matrix
from sldp import sldp
from ls import insertion_ls, score
from vdp import subset_dp
from core import build, paley_sign
def surplus_closure(A):
    n=len(A); P=np.zeros((n,n),bool); changed=True
    while changed:
        changed=False
        for x in range(n):
            for y in range(n):
                if x==y or P[x,y] or P[y,x]: continue
                U=[t for t in range(n) if t not in (x,y) and not P[t,y] and not P[x,t]]
                if 2*A[x,y]+sum(min(A[x,t]+A[t,y],0) for t in U)>0:
                    P[x,y]=True
                    for _ in range(2):
                        P|= (P.astype(int)@P.astype(int))>0
                    changed=True
    return int(P.sum())
def milp_solve(A,tl):
    n=len(A); pairs=[(i,j) for i in range(n) for j in range(i+1,n)]; idx={p:k for k,p in enumerate(pairs)}
    rows=[];M=lil_matrix((n*(n-1)*(n-2)//6,len(pairs)));r=0
    for i in range(n):
        for j in range(i+1,n):
            for k in range(j+1,n):
                M[r,idx[(i,j)]]=1;M[r,idx[(j,k)]]=1;M[r,idx[(i,k)]]=-1;r+=1
    c=np.array([-2*A[i,j] for i,j in pairs]); const=-sum(A[i,j] for i,j in pairs)
    t=time.time()
    res=milp(c,constraints=LinearConstraint(M.tocsr(),0,1),integrality=np.ones(len(pairs)),bounds=Bounds(0,1),
             options=dict(time_limit=tl,disp=False))
    dt=time.time()-t
    ub=-(res.mip_dual_bound if res.mip_dual_bound is not None else np.nan)-const if hasattr(res,'mip_dual_bound') else np.nan
    val=-res.fun+const if res.x is not None else np.nan
    return val, dt, res.status==0, ub
def gen(kind,n,rng):
    if kind.startswith('paley'): return build(n)
    A=np.zeros((n,n))
    if kind=='embed':      # transitive outer order, Paley(19) block in the middle, noise 0.05
        p=19; S0=paley_sign(p); off=(n-p)//2
        for i in range(n):
            for j in range(i+1,n):
                v=1.0
                if off<=i<off+p and off<=j<off+p: v=S0[i-off,j-off]
                A[i,j]=v+rng.uniform(-.05,.05);A[j,i]=-A[i,j]
        return A
    for i in range(n):
        for j in range(i+1,n):
            if kind=='neartrans': v=(1 if rng.random()>0.10 else -1)+rng.uniform(-.05,.05)
            elif kind=='planted1': v=(j-i)+2*rng.standard_normal()
            elif kind=='planted05': v=(j-i)**0.5+2*rng.standard_normal()
            elif kind=='randint': v=float(rng.integers(-5,6)) or 1.0
            elif kind=='uniform': v=rng.uniform(-1,1)
            A[i,j]=v;A[j,i]=-v
    return A
if __name__=='__main__':
    rng=np.random.default_rng(17); TL=300
    plan=[('neartrans',24),('neartrans',30),('planted1',30),('planted1',45),('planted1',60),
          ('planted05',30),('planted05',40),('uniform',20),('randint',20),('paley',11),('paley',19),('embed',29)]
    print("family n | SLDP: OPT, generated, survivors, excluded, DP s, pair s, certified | subsetDP s | MILP s (status) | surplus-closure pairs")
    for kind,n in plan:
        A=gen(kind,n,rng)
        t=time.time(); inc=max(score(A,insertion_ls(A,rng.permutation(n),rng)) for _ in range(5)); tls=time.time()-t
        r=sldp(A,inc,want_pairs=True)
        sd='-'
        if n<=22:
            t=time.time(); dp,_,_=subset_dp(A); sd=f"{time.time()-t:.1f}s"; assert abs(dp[-1]-r['OPT'])<1e-7
        mv,mt,mok,_=milp_solve(A,TL)
        agree = abs(mv-r['OPT'])<1e-6 if mok else None
        sc=surplus_closure(A)
        print(f"{kind:>9} {n:>2} | {r['OPT']:.4f} gen {r['generated']:,} surv {r['survivors']:,} excl {r['excluded']:,} "
              f"DP {r['dp_time']:.1f}s pairs {r['pair_time']:.1f}s cert {r['certified']}/{r['pairs']} (LS {tls:.1f}s) | {sd} | "
              f"{mt:.1f}s ({'opt' if mok else 'NOT proved'}, agree={agree}) | {sc}/{n*(n-1)//2}", flush=True)
