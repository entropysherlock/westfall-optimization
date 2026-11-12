"""Run one (instance, solver) pair in a fresh process; print JSON incl. peak RSS."""
import numpy as np, sys, json, time, resource
from core import build, paley_sign
from ls import insertion_ls, score
from sldp import sldp
from hybrid import HybridBound, segment, block_params
from cfd import pbd_certify
def gen(fam, n, seed, **kw):
    rng=np.random.default_rng(seed); A=np.zeros((n,n))
    if fam=='paley': return build(n)
    if fam=='lolib':
        raw=open(kw['path'],'rb').read().decode('latin1').replace('\x00',' ').split()
        N=int(raw[0]); C=np.array(raw[1:1+N*N],dtype=float).reshape(N,N)
        return C-C.T          # skew form: F_A = 2*LOP - sum(C) (diagonal ignored)
    if fam=='blocks':      # Family C: transitive frame + embedded Paley cores, mixed cross edges
        cores=kw['cores']; q=kw['q']; s=kw.get('s',1.0)
        lab=-np.ones(n,int); start=[int(x) for x in np.linspace(3, n-3-cores[-1], len(cores))]
        for c,(st,p) in enumerate(zip(start,cores)): lab[st:st+p]=c
        Ps={p:paley_sign(p) for p in set(cores)}
        for i in range(n):
            for j in range(i+1,n):
                if lab[i]>=0 and lab[i]==lab[j]:
                    st=start[lab[i]]; v=Ps[cores[lab[i]]][i-st,j-st]
                else:
                    v=s
                    if rng.random()<q: v=-s*rng.uniform(0.3,1.0)
                A[i,j]=v+rng.uniform(-.05,.05)
        perm=rng.permutation(n); A=A-A.T; return A[np.ix_(perm,perm)]
    for i in range(n):
        for j in range(i+1,n):
            if fam=='neartrans': v=(1 if rng.random()>0.10 else -1)+rng.uniform(-.05,.05)
            elif fam=='planted': v=(j-i)**kw['alpha']+kw['theta']*rng.standard_normal()
            elif fam=='uniform': v=rng.uniform(-1,1)
            elif fam=='ties': v=float(rng.integers(-3,4))
            A[i,j]=v
    A=A-A.T; perm=rng.permutation(n); return A[np.ix_(perm,perm)]
def milp(A,tl):
    from bench import milp_solve
    v,t,ok,_=milp_solve(A,tl); return dict(OPT=v,time=t,proved=ok)
if __name__=='__main__':
    cfg=json.loads(sys.argv[1]); solver=sys.argv[2]
    A=gen(cfg['fam'],cfg['n'],cfg['seed'],**cfg.get('kw',{})); n=A.shape[0]
    out=dict(cfg=cfg,solver=solver); t0=time.time()
    if solver=='milp':
        out.update(milp(A,cfg.get('tl',60)))
    elif solver=='blx2':
        from features import full_features
        from hybrid import block_params2
        if n>62:
            f=dict(gap=float('nan'),zero_frac=float((A[np.triu_indices(n,1)]==0).mean()),rho=float('nan')); route='milp'
        else:
            f=full_features(A); route=None
        tfeat=time.time()-t0
        if n>62: pass
        elif f['zero_frac']>=0.05 and f['gap']>=0.03: route='milp->sldp'
        elif f['gap']<0.03: route='sldp'
        elif f['rho']>=0.3: route='blx'
        else: route='sldp'
        out.update(route=route,feat=dict(gap=round(f['gap'],4),zero=round(f['zero_frac'],3),rho=round(f['rho'],3)),feat_time=round(tfeat,2))
        if n<=62 and f.get('blocks'):
            par=block_params2(A,f['blocks'],0.0); out.update(K=par['K'],b=par['b'],log2_bound=round(par['log2_state_bound'],1))
        done=False
        if route.startswith('milp'):
            mres=milp(A,cfg.get('tl_milp',30) if n<=62 else cfg.get('tl',60)); out.update(milp_time=round(mres['time'],2))
            if mres['proved']: out.update(OPT=mres['OPT'],proved_by='milp'); done=True
            elif n>62: out.update(status='UNRESOLVED (n>62, MILP not proved)'); done=True
        if not done:
            H=f.get('H') if route=='blx' else None
            r=sldp(A,f['L'],ub_kind='packing',hybrid=H)
            out.update(OPT=r['OPT'],generated=r['generated'],survivors=r['survivors'],certified=r['certified'],pairs=r['pairs'],proved_by=route.split('->')[-1])
        out['time']=round(time.time()-t0,2)
    else:
        rng=np.random.default_rng(1); order=max((insertion_ls(A,rng.permutation(n),rng) for _ in range(5)),key=lambda o:score(A,o))
        L=score(A,order); tls=time.time()-t0; H=None; extra={}
        if solver=='blx':
            t1=time.time(); best=None
            for bmax in [8,12,16,20]:
                blocks,X=segment(A,order,bmax); par=block_params(A,blocks,0.0)
                key=par['log_state_bound']
                if best is None or key<best[0]: best=(key,bmax,blocks,par)
            _,bmax,blocks,par=best
            # PBD certificate first (only when every mixed pair problem is small)
            pbd_ok=False
            if max(len(B) for B in blocks)<=11 and len(blocks)>=3:
                try: pbd_ok,marg=pbd_certify(A,blocks)
                except MemoryError: pbd_ok=False
            H=HybridBound(A,blocks); tpre=time.time()-t1
            extra=dict(bmax=bmax,m=len(blocks),b=par['b'],X=round(par['X'],3),K=par['K'],pbd=pbd_ok,pre_time=round(tpre,2))
        r=sldp(A,L,ub_kind=('trivial' if solver=='sldp0' else 'packing'),hybrid=H)
        out.update(OPT=r['OPT'],generated=r['generated'],survivors=r['survivors'],certified=r['certified'],
                   pairs=r['pairs'],ls_time=round(tls,2),**extra)
        out['time']=round(time.time()-t0,2)
    out['peak_MB']=round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss/1024,1)
    print(json.dumps(out,default=float))
