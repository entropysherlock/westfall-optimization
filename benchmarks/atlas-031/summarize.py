"""Aggregate results.json -> results.md (solved counts, median ms, median states, value agreement)."""
import json, statistics as st, os, collections
here = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(here, "results.json")))
rows = R["rows"]
fam = collections.OrderedDict()
for r in rows: fam.setdefault((r["family"], r["n"]), []).append(r)
solvers = ["subset-dp (prod)", "exclusion (prod)", "local-search (prod heuristic)", "ATLAS", "ATLAS (no decomposition)"]
out = [f"# ATLAS-031 benchmark (time limit {R['TL']/1000:.0f} s per run, node {R['node']}, 2-vCPU Xeon 2.1 GHz, 1 run per solver)\n",
       "Cell = optimal-proved/instances · median ms · median states (exact solvers). `—` = solver not applicable (item limit).\n",
       "| family | n | " + " | ".join(solvers) + " |", "|---|---|" + "---|" * len(solvers)]
heur_gaps = []; agree_fail = 0; prod_solved = atlas_solved = total = 0; better_than_heur = 0
for (f, n), rs in fam.items():
    cells = []
    seeds = sorted({r["seed"] for r in rs})
    for s in solvers:
        x = [r for r in rs if r["solver"] == s]
        if not x: cells.append("—"); continue
        ok = [r for r in x if r["status"] == "OPTIMAL"]
        ms = st.median([r["ms"] for r in x])
        sts = [r["states"] for r in ok if r["states"] is not None]
        tag = f"{len(ok)}/{len(x)}" if s != "local-search (prod heuristic)" else "heur"
        cells.append(f"{tag} · {ms:.0f} ms" + (f" · {st.median(sts):,.0f}" if sts else ""))
    out.append(f"| {f} | {n} | " + " | ".join(cells) + " |")
    for sd in seeds:
        x = {r["solver"]: r for r in rs if r["seed"] == sd}
        total += 1
        opt_vals = sorted({r["value"] for r in x.values() if r["status"] == "OPTIMAL"})
        integral = all(float(v).is_integer() for v in opt_vals)
        if integral and len(opt_vals) > 1: agree_fail += 1
        if not integral and opt_vals and opt_vals[-1] - opt_vals[0] > 1e-9 * max(1, abs(opt_vals[-1])): agree_fail += 1
        if any(x[s]["status"] == "OPTIMAL" for s in ["subset-dp (prod)", "exclusion (prod)"] if s in x): prod_solved += 1
        if x["ATLAS"]["status"] == "OPTIMAL":
            atlas_solved += 1
            if x["ATLAS"]["value"] > x["local-search (prod heuristic)"]["value"] + 1e-9:
                better_than_heur += 1; heur_gaps.append(f"{f} n={n} seed={sd}: optimum {x['ATLAS']['value']:g} vs heuristic {x['local-search (prod heuristic)']['value']:g}")
out += ["", f"**Instances:** {total}. **Proved optimal — production exact solvers (subset DP or exclusion):** {prod_solved}. **ATLAS:** {atlas_solved}.",
        f"**Disagreements between OPTIMAL values of different exact solvers:** {agree_fail} (integer instances compared exactly; the floating-point `paley11` example agrees to 2e-15 — such inputs are never labelled OPTIMAL by the Studio).",
        f"**ATLAS optimum strictly better than the production heuristic's ordering:** {better_than_heur} instances:"] + [f"- {g}" for g in heur_gaps]
open(os.path.join(here, "results.md"), "w").write("\n".join(out) + "\n")
print("\n".join(out))
