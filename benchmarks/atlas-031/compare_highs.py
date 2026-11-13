"""Join highs_results.json with results.json (ATLAS rows) on identical instances."""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
H = json.load(open(os.path.join(here, "highs_results.json")))
R = json.load(open(os.path.join(here, "results.json")))["rows"]
key = lambda f, n, s: f"{f} n={n} s={s}"
A = {key(r["family"], r["n"], r["seed"]): r for r in R if r["solver"] == "ATLAS"}
E = {key(r["family"], r["n"], r["seed"]): r for r in R if r["solver"] == "exclusion (prod)"}
out = ["| instance | HiGHS 1.16 MILP (1 thread) | ATLAS | production exclusion DP | values agree |", "|---|---|---|---|---|"]
for h in H:
    a = A[h["instance"]]; e = E.get(h["instance"])
    hv = h["value"]; agree = (a["status"] == "OPTIMAL" and abs(a["value"] - hv) < 1e-6) or (a["status"] != "OPTIMAL" and a["value"] <= hv + 1e-6)
    out.append(f"| {h['instance']} | {h['status']} {hv:.0f} · {h['s']*1000:.0f} ms | {a['status']} {a['value']:.0f} · {a['ms']} ms | " +
               (f"{e['status']} · {e['ms']} ms" if e else "— (n > 26)") + f" | {'yes' if agree else 'NO'} |")
open(os.path.join(here, "highs_comparison.md"), "w").write("\n".join(out) + "\n"); print("\n".join(out))
