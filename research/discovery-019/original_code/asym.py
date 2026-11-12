import numpy as np, math
def counts(b, m, K):
    """float counts cnt[A,I] after m blocks of size b; A capped at K+b+1 (absorbing: no further present vertices possible)."""
    Amax=K+b+1
    cnt=np.zeros((Amax+1,K+1)); cnt[0,0]=1.0
    for _ in range(m):
        new=np.zeros_like(cnt)
        for A in range(Amax+1):
            row=cnt[A]
            if not row.any(): continue
            for x in range(b+1):
                A2=min(A+b-x,Amax); sh=A*x
                if sh>K: break
                new[A2,sh:]+=math.comb(b,x)*row[:K+1-sh]
        cnt=new
    return cnt.sum()
def per_block(b,K):
    m=max(4,(2*K+2*b)//b+4)
    return counts(b,m+1,K)-counts(b,m,K)
print(" b    K   log2(per-block count)   /sqrt(K)   /sqrt(K*b)   (log2-b)/sqrt(K)")
res={}
for b in [1,2,4,8,16,32]:
    for K in [16,64,144,256]:
        L=per_block(b,K); lg=math.log2(L); res[(b,K)]=lg
        print(f"{b:>2} {K:>4}   {lg:10.2f}   {lg/math.sqrt(K):8.3f}   {lg/math.sqrt(K*b):8.3f}   {(lg-b)/math.sqrt(K):8.3f}",flush=True)
