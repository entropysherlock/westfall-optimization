import json, subprocess
D='/home/claude/igards/lolib_study/data/'
def run(c,solver,f,to=300):
    try:
        r=subprocess.run(['python3','runone.py',json.dumps(c),solver],capture_output=True,text=True,timeout=to)
        line=[l for l in r.stdout.splitlines() if l.startswith('{')]
        f.write((line[0] if line else json.dumps(dict(cfg=c,solver=solver,error=r.stderr[-300:])))+'\n')
    except subprocess.TimeoutExpired:
        f.write(json.dumps(dict(cfg=c,solver=solver,error=f'TIMEOUT {to}s'))+'\n')
    f.flush()
test=[]
for n,cores,qs in [(29,[19],[0.0,0.02,0.05]),(35,[19],[0.0,0.02,0.05]),(45,[19,11],[0.0,0.02,0.05]),(50,[11,11,11],[0.0,0.03,0.08])]:
    for q in qs: test.append(dict(fam='blocks',n=n,seed=101,kw=dict(cores=cores,q=q),family='C'))
test.append(dict(fam='blocks',n=29,seed=101,kw=dict(cores=[19],q=0.25),family='C-adv'))
for n in [40,60]: test.append(dict(fam='neartrans',n=n,seed=101,family='A'))
for a,th in [(0.5,2.0),(0.5,4.0),(1.0,4.0)]: test.append(dict(fam='planted',n=50,seed=101,kw=dict(alpha=a,theta=th),family='B'))
test.append(dict(fam='uniform',n=22,seed=101,family='D')); test.append(dict(fam='ties',n=22,seed=101,family='D'))
for p in ['IO/N-t59d11xx','IO/N-t65d11xx','IO/N-t70d11xx','IO/N-t74d11xx','IO/N-t75e11xx','IO/N-tiw56n54','IO/N-stabu70','IO/N-be75oi','xLOLIB/N-be75np_150','xLOLIB/N-be75eec_150']:
    test.append(dict(fam='lolib',n=0,seed=0,kw=dict(path=D+p),name=p,family='LOLIB-test'))
with open('test19.jsonl','w') as f:
    for c in test:
        c['tl']=60
        big = 'xLOLIB' in c.get('name','') or 'stabu' in c.get('name','') or 'tiw' in c.get('name','')
        for s in ['blx2','milp','sldp','blx']:
            if big and s in ('sldp','blx') and 'xLOLIB' in c.get('name',''): continue   # n>62: DP inapplicable
            run(c,s,f)
# in-sample: blx2 on the Discovery 018 instances
rows=[json.loads(l) for l in open('grid.jsonl')]+[json.loads(l) for l in open('lolib.jsonl')]
seen=set()
with open('insample19.jsonl','w') as f:
    for d in rows:
        c=d['cfg']; key=json.dumps(c,sort_keys=True)
        if key in seen: continue
        seen.add(key); run(c,'blx2',f)
