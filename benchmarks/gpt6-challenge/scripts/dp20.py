"""Independent exact optimum for the 20-item instance: subset DP over all 2^20 prefix sets (numpy int64, exact)."""
import numpy as np,time
t=time.time()
M=np.array([list(map(int,l.split())) for l in open('../instances/round1_20items.lolib').read().splitlines()[1:]]); n=len(M); N=1<<n
# gain of appending x after set S = sum_{u in S} M[u][x]
gain=np.zeros((n,N),dtype=np.int64)
for x in range(n):
    g=np.zeros(1,dtype=np.int64)
    for u in range(n): g=np.concatenate([g,g+M[u,x]])
    gain[x]=g
f=np.full(N,-(1<<60),dtype=np.int64); f[0]=0; arg=np.full(N,-1,dtype=np.int8)
pc=np.array([bin(i).count('1') for i in range(N)],dtype=np.int8); masks=np.arange(N)
for k in range(n):
    L=masks[pc==k]
    for x in range(n):
        sel=L[(L>>x)&1==0]; tgt=sel|(1<<x); val=f[sel]+gain[x][sel]
        better=val>f[tgt]; f[tgt[better]]=val[better]; arg[tgt[better]]=x
S=N-1; order=[]
while S: x=int(arg[S]); order.append(x); S^=1<<x
order.reverse()
F=sum(int(M[order[a],order[b]]) for a in range(n) for b in range(a+1,n))
# count optimal orderings' uniqueness proxy: number of optimal last items
print('exact optimum F* =',int(f[N-1]),'| reconstructed order scores',F,'| order (1-based):',[x+1 for x in order],'| %.1fs'%(time.time()-t))
