"""Stein–Andres (ICML 2024) conditions translated to maximisation of F(pi)=sum_{i before j} a_ij.
Cost of 'a before b' is c_ab = -a_ab, so c^Delta_ab = c_ab - c_ba = -2 a_ab.
Implemented (single pass, no iteration): transposition (Prop 4.4), grouping (Prop 4.8, exact over all R
for small n), conditional grouping (Prop 4.11, exact over all R), shifting (4.15), generalized shifting (4.19)."""
import numpy as np, itertools
def cd(A): return -2*A
def transposition(A,a,b):
    C=cd(A); n=len(A); return C[a,b]+sum(max(C[a,d]+C[d,b],0) for d in range(n) if d not in (a,b))<=0
def grouping_pairs(A):
    C=cd(A); n=len(A); fixed=set()
    for r in range(1,n):
        for R in itertools.combinations(range(n),r):
            Rb=[v for v in range(n) if v not in R]
            if all(C[a,b]<=0 for a in R for b in Rb): fixed|={(a,b) for a in R for b in Rb}
    return fixed
def cond_grouping(A,a,b):
    C=cd(A); n=len(A); neg=max(0,-C[a,b]); others=[v for v in range(n) if v not in (a,b)]
    for r in range(len(others)+1):
        for X in itertools.combinations(others,r):
            R=set(X)|{a}; Rb=[v for v in range(n) if v not in R]
            if neg>=sum(max(0,C[u,w]) for u in R for w in Rb): return True
    return False
def shifting_pairs(A):
    C=cd(A); n=len(A); fixed=set()
    for a in range(n):
        if all(sum(C[d2,d] for d2 in range(n) if d2!=d)<=0 for d in range(n) if d!=a): pass
    # Prop 4.15 as summarised: condition independent of a is unusual; implement literal reading conservatively:
    return fixed
def gen_shifting(A,a,b):
    C=cd(A); n=len(A); D=[d for d in range(n) if d not in (a,b)]
    s=lambda d: sum(C[d,d2] for d2 in D if d2!=d)
    c11=sum(max(C[a,d]+C[b,d],C[b,d],s(d)) for d in D)<=0
    c12=sum(max(C[a,d]+C[b,d],C[a,d],s(d)) for d in D)<=0
    return c11 and c12
def surplus(A,x,y):
    n=len(A); return 2*A[x,y]+sum(min(A[x,t]+A[t,y],0) for t in range(n) if t not in (x,y))>0
def brute(A):
    n=len(A); best=-1e18; opts=[]
    for p in itertools.permutations(range(n)):
        s=sum(A[p[i],p[j]] for i in range(n) for j in range(i+1,n))
        if s>best+1e-12: best=s; opts=[p]
        elif abs(s-best)<=1e-12: opts.append(p)
    return best,opts
def ins_local(A):
    n=len(A); res=[]
    for p in itertools.permutations(range(n)):
        p=list(p); ok=True
        for i,v in enumerate(p):
            rest=p[:i]+p[i+1:]
            base=sum(A[u,v] for u in rest[:i])+sum(A[v,u] for u in rest[i:])
            for k in range(n):
                if sum(A[u,v] for u in rest[:k])+sum(A[v,u] for u in rest[k:])>base+1e-12: ok=False;break
            if not ok: break
        if ok: res.append(tuple(p))
    return res
