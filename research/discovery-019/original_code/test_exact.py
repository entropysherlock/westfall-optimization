import numpy as np, copy, time, itertools, json
from make_cert import make_certificate
from verify_exact import verify, Reject
from hybrid import HybridBound, segment
from ls import insertion_ls, score
from runone import gen
rng=np.random.default_rng(19)
cases=[('blocks',29,dict(cores=[19],q=0.0),1),('neartrans',30,{},3),('planted',30,dict(alpha=0.5,theta=2.0),2),('uniform',14,{},4),('ties',12,{},5)]
for fam,n,kw,seed in cases:
    A=gen(fam,n,seed,**kw)
    order0=max((insertion_ls(A,rng.permutation(n),rng) for _ in range(5)),key=lambda o:score(A,o))
    blocks,_=segment(A,order0,20 if fam=='blocks' else 8); H=HybridBound(A,blocks)
    cert,r,sc=make_certificate(A,order0,H)
    if sum(len(L) for L in cert['layers'])>40000: print(fam,n,'certificate too large for pure-Python exact check:',r['survivors']); continue
    t=time.time(); res=verify(cert); tv=time.time()-t
    # cross-check against brute force when small
    bf=''
    if n<=9: bf=f" brute={max(score(A,list(p)) for p in itertools.permutations(range(n))):.6f}"
    print(f"{fam:>9} n={n}: ACCEPTED OPT={res['OPT']:.10f} (float search {r['OPT']:.10f}){bf}; kept {res['kept']:,}, exclusions checked {res['excluded_checked']:,}, verify {tv:.1f}s, packing rescale {sc}")
    # ---------- tampering ----------
    tests={}
    c=copy.deepcopy(cert); L=c['layers']; k=max(range(1,n),key=lambda i:len(L[i])); L[k]=L[k][1:]; tests['drop a kept state']=c
    c=copy.deepcopy(cert); 
    if c['pack']: m,y=c['pack'][0]; c['pack'][0]=(m,y*3+c['D']); tests['inflate a packing value']=c
    c=copy.deepcopy(cert); c['order']=c['order'][::-1]; tests['claim a different order']=c
    c=copy.deepcopy(cert); c['A'][0][1]+=1; tests['alter one matrix entry (skew broken)']=c
    c=copy.deepcopy(cert); c['A'][0][1]+=c['D']; c['A'][1][0]-=c['D']; tests['alter matrix consistently (+1)']=c
    c=copy.deepcopy(cert); c['layers'][n-1]=[]; tests['delete a whole layer']=c
    if c.get('hyb') and len(cert['hyb']['blocks'])>=2:
        c=copy.deepcopy(cert); B=c['hyb']['blocks']; v=B[0].pop(); B[1].append(v); 
        tests['move a vertex between blocks (partition untrusted)']=c
    c=copy.deepcopy(cert); c['order0']=c['order']; tests['use the optimum as incumbent (legit)']=c
    for name,cc in tests.items():
        try: verify(cc); print(f"      tamper '{name}': accepted")
        except Reject as e: print(f"      tamper '{name}': REJECTED ({str(e)[:70]})")
