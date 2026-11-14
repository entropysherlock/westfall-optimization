#!/usr/bin/env python3
"""Measure RSS of ATLAS-033 on previously OOM benchmark instances.

Linux /usr/bin/time -f %M provides kernel peak RSS in KiB. Each benchmark
is a fresh child process and matrix data is read from the pinned manifest.
No optima are inferred from a process status: read runner's optimal flag.
"""
from __future__ import annotations
import json
import os
import re
import subprocess
import time
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root/"manifest.json").read_text())
wanted = [
    "Spec/N-atp76", "Spec/N-atp111", "Spec/N-atp134",
    "Spec/N-atp163", "Spec/N-atp452",
    "MB/N-r250e0", "xLOLIB2/N-be75eec_1000",
]
by_id = {f"{r['family']}/{r['name']}": r for r in manifest["instances"]}
results = []
for iid in wanted:
    inst=by_id[iid]
    source=root/inst["path"]
    cmd=["/usr/bin/time","-f","MAX_RSS_KIB=%M",
         "node",str(root/"runners/atlas_runner.mjs"),str(source),"30000"]
    begin=time.monotonic()
    try:
        run=subprocess.run(cmd,text=True,capture_output=True,timeout=33)
        status="RETURNED" if run.returncode==0 else "PROCESS_ERROR"
        result=json.loads(run.stdout.splitlines()[-1]) if run.returncode==0 and run.stdout.strip() else {}
        rss_matches=re.findall(r"MAX_RSS_KIB=(\\d+)",run.stderr)
        rss=int(rss_matches[-1]) * 1024 if rss_matches else None
    except subprocess.TimeoutExpired:
        status="HARD_TIMEOUT"
        result={}
        rss=None
    wall=time.monotonic()-begin
    row={"instance":iid,"n":inst["n"],"status":status,"wall_s":round(wall,3),
         "rss_bytes":rss,"rss_MiB":None if rss is None else round(rss/1048576,2),
         "optimal":result.get("optimal"),"benefit":result.get("benefit")}
    results.append(row)
    print(row,flush=True)
    (root/"results/atlas.v033.rss-smoke.json").write_text(json.dumps(results,indent=2))
bad=[r for r in results if r["rss_bytes"] is None or r["rss_bytes"]>=2_000_000_000 or r["status"]!="RETURNED"]
print("Measured samples:",len(results),"failures:",len(bad))
if bad:
    raise SystemExit(1)
print("PASS: selected previously-OOM cases each returned, RSS <2 GB")
