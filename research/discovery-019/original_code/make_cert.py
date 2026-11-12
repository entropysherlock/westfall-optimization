"""Producer: run SLDP/BLX, rationalize all data exactly, emit an integer certificate for verify_exact."""
from fractions import Fraction
from math import lcm
import numpy as np
from sldp import sldp, triangle_packing
def _feasible_rational(A, masks, ys, n):
    yq=[Fraction(float(y)) for y in ys]; load={}; cap={}
    for m,y in zip(masks,yq):
        vs=[v for v in range(n) if int(m)>>v&1]; i,j,k=vs
        arcs=[(i,j),(j,k),(k,i)] if (A[i,j]>0 and A[j,k]>0 and A[k,i]>0) else [(j,i),(k,j),(i,k)]
        for e in arcs: load[e]=load.get(e,0)+y; cap[e]=Fraction(float(A[e]))
    s=min([Fraction(1)]+[cap[e]/l for e,l in load.items() if l>cap[e]])
    return [y*s for y in yq], s
def reconstruct(A, layers, fs):
    n=A.shape[0]; S=(1<<n)-1; order=[]
    for k in range(n,0,-1):
        idx=np.searchsorted(layers[k],S); fS=fs[k][idx]; prev=layers[k-1]
        for v in range(n):
            if S>>v&1:
                P=S^(1<<v); j=np.searchsorted(prev,P)
                if j<len(prev) and prev[j]==P:
                    g=sum(A[u,v] for u in range(n) if P>>u&1)
                    if abs(fs[k-1][j]+g-fS)<=1e-7*max(1,abs(fS)): order.append(v); S=P; break
    return order[::-1]
def make_certificate(A, order0, H=None):
    n=A.shape[0]; L=float(sum(A[order0[i],order0[j]] for i in range(n) for j in range(i+1,n)))
    r=sldp(A,L,ub_kind='packing',hybrid=H,keep_layers=True,want_pairs=False)
    order=reconstruct(A,r['layers'],r['fs'])
    pm,py=triangle_packing(A); yq,s1=_feasible_rational(A,pm,py,n)
    hyb=None; s2=1
    if H is not None and len(H.ty):
        tq,s2=_feasible_rational(A,H.tm,H.ty,n)
    Aq=[[Fraction(float(A[i,j])) for j in range(n)] for i in range(n)]
    dens=[x.denominator for row in Aq for x in row]+[y.denominator for y in yq]
    if H is not None and len(H.ty): dens+=[y.denominator for y in tq]
    D=1
    for d in dens: D=lcm(D,d)
    cert=dict(D=D, A=[[int(x*D) for x in row] for row in Aq], order0=list(map(int,order0)), order=list(map(int,order)),
              layers=[sorted(int(s) for s in Ly) for Ly in r['layers']], pack=[(int(m),int(y*D)) for m,y in zip(pm,yq)], hyb=None)
    if H is not None:
        cert['hyb']=dict(blocks=[list(map(int,B)) for B in H.blocks], tri=[(int(m),int(y*D)) for m,y in zip(H.tm,tq)] if len(H.ty) else [])
    return cert, r, dict(scale_pack=float(s1), scale_hyb=float(s2))
