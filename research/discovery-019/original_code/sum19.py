import json, sys, collections
rows=[json.loads(l) for l in open(sys.argv[1])]
by=collections.OrderedDict()
for d in rows:
    c=d['cfg']; key=c.get('name') or f"{c['fam']} n={c['n']} {c.get('kw','')}".replace("'",'')
    by.setdefault((c.get('family',''),key),{})[d['solver']]=d
def cell(d):
    if d is None: return '—'
    if 'error' in d: return 'timeout' if 'TIMEOUT' in d['error'] else 'error'
    if d['solver']=='milp': return f"{d['time']:.1f}" if d.get('proved') else 'not proved (60)'
    if 'status' in d: return d['status']
    return f"{d['time']:.2f}"
print("| family | instance | SLDP-pack s | BLX 1.0 s | BLX 2.0 s (route) | MILP s | OPT agree |")
print("|---|---|---|---|---|---|---|")
wins=collections.Counter()
for (fam,key),v in by.items():
    b2=v.get('blx2'); route=b2.get('route','') if b2 else ''
    opts=[x['OPT'] for x in v.values() if 'OPT' in x and (x['solver']!='milp' or x.get('proved'))]
    agree = all(abs(o-opts[0])<=1e-6*max(1,abs(opts[0])) for o in opts) if opts else '—'
    times={s:(x['time'] if 'time' in x and 'error' not in x and (s!='milp' or x.get('proved')) and 'status' not in x else 1e9) for s,x in v.items()}
    best=min(times,key=times.get); wins[best]+=1
    print(f"| {fam} | {key} | {cell(v.get('sldp'))} | {cell(v.get('blx'))} | {cell(b2)} ({route}) | {cell(v.get('milp'))} | {agree} |")
print("\nfastest solver counts:",dict(wins))
# regret of blx2 vs best single solver among (sldp, blx, milp)
reg=[]
for (fam,key),v in by.items():
    t={s:(x['time'] if 'time' in x and 'error' not in x and (s!='milp' or x.get('proved')) and 'status' not in x else 1e9) for s,x in v.items()}
    others=min(t.get(s,1e9) for s in ('sldp','blx','milp'))
    if 'blx2' in t and others<1e9: reg.append(t['blx2']/others)
import statistics
print("BLX 2.0 time / best-of-(SLDP,BLX1,MILP): median %.2f, max %.2f, n=%d"%(statistics.median(reg),max(reg),len(reg)))
