"""Driver: run one solver over the manifest, one fresh process per instance, hard wall-clock limit.
Usage: python3 run_suite.py atlas|highs|scip --tl SECONDS [--families IO,SGB,...] [--max-n N] [--tag TAG] [--shard i/k] [--sample K]
Writes results/<solver>.<tag>.jsonl (append, resumable). A run counts as SOLVED only if the solver proves
optimality AND the measured wall time (process start to result, including model build) is within the limit.
Instances above --max-n are recorded as NOT_ATTEMPTED with the reason (e.g. the 3-cycle MIP model is too large)."""
import argparse, json, os, subprocess, sys, time
here = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser(); ap.add_argument("solver"); ap.add_argument("--tl", type=float, required=True)
ap.add_argument("--families", default=""); ap.add_argument("--max-n", type=int, default=10**9); ap.add_argument("--tag", default="main")
ap.add_argument("--grace", type=float, default=3.0)
ap.add_argument("--shard", default="0/1"); ap.add_argument("--sample", type=int, default=0, help="first K instances of each (family, n) class")
a = ap.parse_args()
man = json.load(open(os.path.join(here, "manifest.json")))
fams = [f for f in a.families.split(",") if f]
os.makedirs(os.path.join(here, "results"), exist_ok=True)
si, sk = map(int, a.shard.split("/"))
out = os.path.join(here, "results", f"{a.solver}.{a.tag}" + (f".shard{si}" if sk > 1 else "") + ".jsonl")
done = set()
if os.path.exists(out):
    for l in open(out):
        if l.strip(): done.add(json.loads(l)["id"])
runner = os.path.join(here, "runners")
seen = {}
for ii, inst in enumerate(man["instances"]):
    if fams and inst["family"] not in fams: continue
    cls = (inst["family"], inst["n"]); seen[cls] = seen.get(cls, 0) + 1
    if a.sample and seen[cls] > a.sample: continue
    if ii % sk != si: continue
    iid = f"{inst['family']}/{inst['name']}"
    if iid in done: continue
    row = {"id": iid, "family": inst["family"], "name": inst["name"], "n": inst["n"], "bks": inst["bks"], "solver": a.solver, "tl_s": a.tl}
    if inst["n"] > a.max_n:
        row.update(status="NOT_ATTEMPTED", solved=False, wall_s=None, reason=f"n > {a.max_n}: model too large for this machine")
    else:
        f = os.path.join(here, inst["path"])
        cmd = (["node", os.path.join(runner, "atlas_runner.mjs"), f, str(int(a.tl * 1000))] if a.solver == "atlas"
               else [sys.executable, "-I", os.path.join(runner, "mip_runner.py"), a.solver, f, str(a.tl)])
        t0 = time.perf_counter()
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=a.tl + a.grace)
            wall = time.perf_counter() - t0
            if p.returncode != 0 or not p.stdout.strip():
                oom = p.returncode in (-9, 137)
                row.update(status="OUT_OF_MEMORY" if oom else "ERROR", solved=False, wall_s=wall, returncode=p.returncode,
                           reason="killed by the kernel out-of-memory killer (8 GB machine)" if oom else (p.stderr or "")[-400:])
            else:
                r = json.loads(p.stdout.strip().splitlines()[-1])
                ok = bool(r.get("optimal")) and wall <= a.tl
                row.update(status="SOLVED" if ok else ("OPTIMAL_OVER_LIMIT" if r.get("optimal") else "LIMIT"), solved=ok, wall_s=wall,
                           benefit=r.get("benefit"), upperBound=r.get("upperBound"), detail={k: v for k, v in r.items() if k not in ("order", "benefit", "upperBound", "optimal")},
                           order=r.get("order"))
        except subprocess.TimeoutExpired:
            row.update(status="KILLED_AT_LIMIT", solved=False, wall_s=a.tl + a.grace, reason="no result before the wall-clock limit")
    with open(out, "a") as fh: fh.write(json.dumps(row) + "\n")
    b = row.get("benefit")
    print(f"{iid} n={inst['n']} {row['status']} B={b} BKS={inst['bks']} wall={row['wall_s'] and round(row['wall_s'], 2)}", flush=True)
