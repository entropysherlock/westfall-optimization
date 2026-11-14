#!/usr/bin/env python3
"""Compare one ATLAS-033 shard against frozen ATLAS-032 LOLIB results.

Never suppress regressions: any previously SOLVED instance that no longer
finishes within the 30-second limit is a failure. This does not establish
independent exact certification; it audits the solver-reported result
and independently recomputed raw objective via run_suite.py.
"""
import argparse
import json
from pathlib import Path

ap=argparse.ArgumentParser()
ap.add_argument("new")
args=ap.parse_args()
root=Path(__file__).resolve().parent
old={r["id"]:r for r in map(json.loads,(root/"results/atlas.exact.jsonl").read_text().splitlines()) if r}
new=[json.loads(s) for s in Path(args.new).read_text().splitlines() if s]
errors=[]
for r in new:
    before=old.get(r["id"])
    if not before:
        errors.append((r["id"],"missing frozen baseline"))
        continue
    if r["status"]=="SOLVED" and r["bks"] is not None and r["benefit"]<r["bks"]:
        errors.append((r["id"],"new claimed optimum is below published feasible BKS"))
    if before["status"]=="SOLVED" and (r["status"]!="SOLVED" or r["benefit"]!=before["benefit"]):
        errors.append((r["id"],f"regression: old SOLVED {before['benefit']}, new {r['status']} {r.get('benefit')}"))
print("ATLAS-033 shard:",len(new),"instances;",sum(r["status"]=="SOLVED" for r in new),"solved; regressions",len(errors))
print("Observed maximum wall-clock:",max((r.get("wall_s") or 0) for r in new))
for e in errors: print("REGRESSION",*e)
if not new or errors: raise SystemExit(1)
