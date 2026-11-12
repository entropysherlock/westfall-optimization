import json, numpy as np
from runone import gen
from features import features
rows=[json.loads(l) for l in open('grid.jsonl')]+[json.loads(l) for l in open('lolib.jsonl')]
by={}
for d in rows:
    c=d['cfg']; key=json.dumps({k:c[k] for k in ('fam','n','seed','kw') if k in c},sort_keys=True)
    by.setdefault(key,{})[d['solver']]=d
out=[]
for key,v in by.items():
    c=json.loads(key); A=gen(c['fam'],c['n'],c['seed'],**c.get('kw',{}))
    if A.shape[0]>62: continue
    f=features(A)
    t={s:(v[s]['time'] if 'time' in v[s] and (s!='milp' or v[s].get('proved')) else 1e9) for s in v}
    best=min(t,key=t.get)
    out.append((c['fam'],A.shape[0],round(f['gap'],4),round(t.get('sldp',1e9),2),round(t.get('blx',1e9),2),round(t.get('milp',1e9),2),best))
for o in sorted(out,key=lambda r:r[2]): print(o)
