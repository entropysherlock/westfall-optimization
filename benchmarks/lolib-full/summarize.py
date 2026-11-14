"""Summarise results/*.<tag>.jsonl into reviewer-standard tables (RESULTS.md, summary.json).
Metrics: proved-optimal within the limit; shifted geometric mean of wall time (shift 10 s, unsolved counted at the
limit; Mittelmann/MIPLIB convention); performance-profile data; for unsolved runs the certified gap from the
solver's own bound. Consistency checks (hard failures): every returned ordering's objective is recomputed from the
raw matrix; all solvers that prove optimality on an instance must agree; a proved optimum can never be below the
best-known value (BKS), and any proved optimum above BKS is flagged as a new best-known value."""
import json, math, os, sys
import numpy as np
here = os.path.dirname(os.path.abspath(__file__))
TAG = sys.argv[1] if len(sys.argv) > 1 else "exact"
SOLVERS = [s for s in ["atlas", "highs", "scip"] if os.path.exists(os.path.join(here, "results", f"{s}.{TAG}.jsonl"))]
man = {f"{r['family']}/{r['name']}": r for r in json.load(open(os.path.join(here, "manifest.json")))["instances"]}
R = {s: {json.loads(l)["id"]: json.loads(l) for l in open(os.path.join(here, "results", f"{s}.{TAG}.jsonl")) if l.strip()} for s in SOLVERS}
ids = sorted(set.intersection(*[set(R[s]) for s in SOLVERS]), key=lambda i: (list(man).index(i)))
fams = list(dict.fromkeys(man[i]["family"] for i in ids))

def recompute(iid, order):
    tok = open(os.path.join(here, man[iid]["path"])).read().split(); n = int(tok[0])
    C = np.array(list(map(int, tok[1:1 + n * n])), dtype=np.int64).reshape(n, n)
    assert sorted(order) == list(range(n)), iid
    return int(np.triu(C[np.ix_(order, order)], 1).sum())

problems, newbest = [], []
proved = {}
for iid in ids:
    vals = {}
    for s in SOLVERS:
        r = R[s][iid]
        if r.get("order") is not None and r.get("benefit") is not None:
            b = recompute(iid, r["order"])
            if b != r["benefit"]: problems.append(f"{s} {iid}: reported {r['benefit']} recomputed {b}")
        if r["solved"]: vals[s] = r["benefit"]
    if len(set(vals.values())) > 1: problems.append(f"{iid}: solvers disagree on the optimum {vals}")
    if vals:
        opt = next(iter(vals.values())); proved[iid] = opt; bks = man[iid]["bks"]
        if bks is not None and opt < bks: problems.append(f"{iid}: proved optimum {opt} below BKS {bks}")
        if bks is not None and opt > bks: newbest.append((iid, opt, bks))

def sgm(ts, shift=10.0):
    return math.exp(sum(math.log(t + shift) for t in ts) / len(ts)) - shift
def tcount(s, sub):
    tl = R[s][sub[0]]["tl_s"]
    return [R[s][i]["wall_s"] if R[s][i]["solved"] else tl for i in sub]

lines = [f"# Full-LOLIB benchmark — tier `{TAG}`", "",
         f"Solvers: {', '.join(SOLVERS)}. Instances: {len(ids)} (all present in every solver's results).", ""]
hdr = "| Family | n | Instances | " + " | ".join(f"{s} solved" for s in SOLVERS) + " | " + " | ".join(f"{s} SGM (s)" for s in SOLVERS) + " |"
lines += [hdr, "|" + "---|" * (3 + 2 * len(SOLVERS))]
summary = {"tag": TAG, "solvers": SOLVERS, "families": {}, "problems": problems, "new_best": newbest}
for fam in fams + ["All"]:
    sub = [i for i in ids if fam == "All" or man[i]["family"] == fam]
    ns = sorted({man[i]["n"] for i in sub}); nrange = f"{ns[0]}–{ns[-1]}" if len(ns) > 1 else str(ns[0])
    solved = {s: sum(R[s][i]["solved"] for i in sub) for s in SOLVERS}
    g = {s: sgm(tcount(s, sub)) for s in SOLVERS}
    summary["families"][fam] = {"instances": len(sub), "n": nrange, "solved": solved, "sgm": g}
    b = "**" if fam == "All" else ""
    lines.append(f"| {b}{fam}{b} | {nrange} | {len(sub)} | " + " | ".join(str(solved[s]) for s in SOLVERS) + " | " + " | ".join(f"{g[s]:.2f}" for s in SOLVERS) + " |")
# status breakdown
lines += ["", "## Outcome breakdown", "", "| Solver | " + " | ".join(["SOLVED", "LIMIT", "KILLED_AT_LIMIT", "OUT_OF_MEMORY", "OPTIMAL_OVER_LIMIT", "NOT_ATTEMPTED", "ERROR"]) + " |", "|---|---|---|---|---|---|---|---|"]
for s in SOLVERS:
    c = {k: sum(R[s][i]["status"] == k for i in ids) for k in ["SOLVED", "LIMIT", "KILLED_AT_LIMIT", "OUT_OF_MEMORY", "OPTIMAL_OVER_LIMIT", "NOT_ATTEMPTED", "ERROR"]}
    summary.setdefault("status", {})[s] = c
    lines.append(f"| {s} | " + " | ".join(str(v) for v in c.values()) + " |")
# unique wins
lines += ["", "## Solved by exactly one solver", ""]
for s in SOLVERS:
    only = [i for i in ids if R[s][i]["solved"] and not any(R[t][i]["solved"] for t in SOLVERS if t != s)]
    summary.setdefault("only", {})[s] = only
    lines.append(f"- **{s}** ({len(only)}): " + (", ".join(only) if only else "none"))
none = [i for i in ids if not any(R[s][i]["solved"] for s in SOLVERS)]
summary["unsolved_by_all"] = none
lines.append(f"- **no solver** ({len(none)}): " + (", ".join(none) if none else "none"))
# gaps on unsolved
lines += ["", "## Certified gaps where a solver did not prove optimality", "",
          "Gap = (solver's proven upper bound − best known value) / best known value. Blank = solver returned no bound.", "",
          "| Instance | n | BKS | " + " | ".join(f"{s} best found | {s} gap" for s in SOLVERS) + " |", "|" + "---|" * (3 + 2 * len(SOLVERS))]
for i in ids:
    if all(R[s][i]["solved"] for s in SOLVERS): continue
    ref = proved.get(i, man[i]["bks"]); cells = []
    for s in SOLVERS:
        r = R[s][i]; bf = r.get("benefit"); ub = r.get("upperBound")
        gap = "" if (ub is None or ref in (None, 0)) else f"{max(0.0, (ub - ref) / ref) * 100:.3f}%"
        cells += [("✓ " if r["solved"] else "") + ("—" if bf is None else str(bf)), "0 (proved)" if r["solved"] else (gap or r["status"].lower())]
    lines.append(f"| {i} | {man[i]['n']} | {man[i]['bks']} | " + " | ".join(cells) + " |")
lines += ["", "## Consistency checks", "",
          f"- Orderings recomputed from the raw matrices: every reported objective {'matches' if not any('recomputed' in p for p in problems) else 'DOES NOT match'}.",
          f"- Proved optima: {len(proved)}; disagreements between solvers: {sum('disagree' in p for p in problems)}; below BKS: {sum('below BKS' in p for p in problems)}.",
          f"- Proved optima above the published best-known value: {len(newbest)}" + (": " + ", ".join(f'{i} ({o} > {b})' for i, o, b in newbest) if newbest else ".")]
open(os.path.join(here, f"RESULTS.{TAG}.md"), "w").write("\n".join(lines) + "\n")
json.dump(summary, open(os.path.join(here, f"summary.{TAG}.json"), "w"), indent=1)
print("\n".join(lines[:4 + len(fams) + 3]))
if problems: print("PROBLEMS:", *problems, sep="\n"); sys.exit(1)
