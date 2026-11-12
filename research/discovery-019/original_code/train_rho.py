import json, numpy as np
from runone import gen
from features import full_features
rows=[json.loads(l) for l in open('grid.jsonl')]+[json.loads(l) for l in open('lolib.jsonl')]
by={}
for d in rows:
    c=d['cfg']; key=json.dumps({k:c[k] for k in ('fam','n','seed','kw') if k in c},sort_keys=True)
    by.setdefault(key,{})[d['solver']]=d
for key,v in by.items():
    c=json.loads(key); A=gen(c['fam'],c['n'],c['seed'],**c.get('kw',{}))
    if A.shape[0]>62: continue
    f=full_features(A)
    t={s:(v[s]['time'] if 'time' in v[s] and (s!='milp' or v[s].get('proved')) else 1e9) for s in v}
    print(f"{c['fam']:>9} n={A.shape[0]:>2} gap={f['gap']:.3f} zero={f['zero_frac']:.2f} rho={f['rho']:.2f} | sldp {t.get('sldp',1e9):.2f} blx {t.get('blx',1e9):.2f} milp {t.get('milp',1e9):.2f} -> best {min(t,key=t.get)}")
