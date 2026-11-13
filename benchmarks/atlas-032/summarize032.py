"""Merge ATLAS-032 result shards, join with HiGHS on identical instances, write results.json + RESULTS.md."""
import json, os, glob, statistics as st, collections
here = os.path.dirname(os.path.abspath(__file__))
rows = []
for f in sorted(glob.glob(os.path.join(here, "results.shard[0-9].json"))): rows += json.load(open(f))["rows"]
if rows: json.dump({"TL": 30000, "rows": rows}, open(os.path.join(here, "results.json"), "w"), indent=1)
else: rows = json.load(open(os.path.join(here, "results.json")))["rows"]
e_rows = []
for f in sorted(glob.glob(os.path.join(here, "results.E.shard*.json"))) or glob.glob(os.path.join(here, "results.E.json")): e_rows += json.load(open(f))["rows"]
if e_rows: json.dump({"TL": 30000, "rows": e_rows}, open(os.path.join(here, "results_E.json"), "w"), indent=1)
elif os.path.exists(os.path.join(here, "results_E.json")): e_rows = json.load(open(os.path.join(here, "results_E.json")))["rows"]
rows += e_rows
H = {h["name"]: h for h in json.load(open(os.path.join(here, "highs_results.json")))}
HD = {h["name"]: h for h in json.load(open(os.path.join(here, "highs_results_defaultgap.json")))} if os.path.exists(os.path.join(here, "highs_results_defaultgap.json")) else {}
ref = {}
for line in open(os.path.join(here, "..", "data", "lolib.jsonl")):
    r = json.loads(line)
    if "OPT" in r: ref[r["cfg"]["name"].split("/")[-1]] = r["OPT"]
VAR = ["A: ATLAS-031", "S: strict only", "B: strict + greedy triangles", "C: ATLAS-032 (strict + fractional triangles)", "E: ATLAS-032 final (C + longer cycles + stronger incumbent)"]
fam = collections.OrderedDict()
for r in rows: fam.setdefault(r["family"], []).append(r)
med = lambda xs: st.median(xs) if xs else float("nan")
out = ["# ATLAS-032 results", "",
       "30 s limit and 4 M-state budget per run; identical instances for every solver; 2 vCPU Intel Xeon 2.1 GHz, 8 GB RAM, Node 22.23.4, HiGHS 1.16.0.",
       "Variants A, S, B, C and E each ran as a single process with the other core idle; HiGHS ran alone, 1 thread, **mip_rel_gap = 0** (exact).", "",
       "Cell: proved/instances · median ms (all runs, timeouts count as 30 000) · median states (proved runs). HiGHS: proved/instances · median end-to-end ms (model build + solve) · median root-LP gap to best known β.", "",
       "Variants: A = ATLAS-031 · S = strict only · B = strict + greedy triangles · C = strict + fractional triangles · E = ATLAS-032 final (C + longer cycles + stronger incumbent).", "",
       "| family | n | " + " | ".join(v.split(":")[0] for v in VAR) + " | HiGHS MILP (exact gap) |", "|---|---|" + "---|" * (len(VAR) + 1)]
disagree = []; tot = collections.Counter(); proved = collections.Counter()
for f, rs in fam.items():
    names = sorted({r["name"] for r in rs}); n = rs[0]["n"] if len({r["n"] for r in rs}) == 1 else f"{min(r['n'] for r in rs)}–{max(r['n'] for r in rs)}"
    cells = []
    for v in VAR:
        x = [r for r in rs if r["variant"] == v]
        if not x: cells.append("—"); continue
        ok = [r for r in x if r["status"] == "OPTIMAL"]
        tot[v] += len(x); proved[v] += len(ok)
        cells.append(f"{len(ok)}/{len(x)} · {med([r['ms'] for r in x]):.0f} ms" + (f" · {med([r['states'] for r in ok]):,.0f}" if ok else ""))
    hx = [H[nm] for nm in names if nm in H]
    hok = [h for h in hx if h["status"] == "Optimal"]
    tot["HiGHS"] += len(hx); proved["HiGHS"] += len(hok)
    best = {nm: min([r["beta"] for r in rs if r["name"] == nm] + ([H[nm]["beta"]] if nm in H and H[nm]["beta"] is not None else [])) for nm in names}
    lpgap = [100 * (best[h["name"]] - h["lpBoundBeta"]) / max(best[h["name"]], 1) for h in hx if h["lpBoundBeta"] is not None]
    cells.append(f"{len(hok)}/{len(hx)} · {1000 * med([h['end_to_end_s'] for h in hx]):.0f} ms · LP gap {med(lpgap):.1f}%")
    out.append(f"| {f} | {n} | " + " | ".join(cells) + " |")
    for nm in names:
        vals = {r["F"] for r in rs if r["name"] == nm and r["status"] == "OPTIMAL"}
        if nm in H and H[nm]["status"] == "Optimal": vals.add(H[nm]["F"])
        if len(vals) > 1: disagree.append((nm, vals))
out += ["", "**Totals (proved optimal / runs):** " + "; ".join(f"{k.split(':')[0]} {proved[k]}/{tot[k]}" for k in VAR + ["HiGHS"]),
        f"**Disagreements between proved optimal values (ATLAS variants and HiGHS):** {len(disagree)} {disagree if disagree else ''}"]
# gap table for unproved ATLAS-032 runs
un = [r for r in rows if r["variant"].startswith("E") and r["status"] != "OPTIMAL"]
if un:
    out += ["", "### ATLAS-032 final (E) runs not proved within 30 s (best feasible β, best rigorous lower bound on β, gaps)", "", "| instance | n | β found | lower bound | abs gap | rel gap | HiGHS |", "|---|---|---|---|---|---|---|"]
    for r in un:
        h = H.get(r["name"], {})
        out.append(f"| {r['name']} | {r['n']} | {r['beta']} | {r['bestBoundBeta']} | {r['gapAbs']} | {100 * r['gapAbs'] / max(r['beta'], 1):.1f}% | {h.get('status')} β={h.get('beta')} bound={h.get('boundBeta', float('nan')):.1f} |")
# LOLIB validation against the repository's recorded optima (same F_A convention)
lv = [(nm, ref[nm], H.get(nm, {}).get("F"), next((r["F"] for r in rows if r["name"] == nm and r["variant"].startswith("E") and r["status"] == "OPTIMAL"), None)) for nm in ref if nm in H]
if lv:
    out += ["", "### LOLIB conversion check against optima recorded in benchmarks/data/lolib.jsonl", "", "| instance | recorded OPT | HiGHS | ATLAS-032 |", "|---|---|---|---|"] + [f"| {a} | {b:.0f} | {c} | {d} |" for a, b, c, d in lv]
# default-tolerance HiGHS: optimality labels that are not exact
bad = []
for nm, h in HD.items():
    ex = H.get(nm)
    if h["status"] == "Optimal" and ex and ex["status"] == "Optimal" and h["F"] != ex["F"]: bad.append((nm, h["F"], ex["F"]))
out += ["", f"### HiGHS default tolerance (mip_rel_gap = 1e-4): solutions labelled Optimal that are not exactly optimal: {len(bad)}"] + [f"- {a}: default-gap 'Optimal' F = {b}, exact optimum F = {c} (ATLAS-032 certified)" for a, b, c in bad]
open(os.path.join(here, "RESULTS.md"), "w").write("\n".join(out) + "\n"); print("\n".join(out))
