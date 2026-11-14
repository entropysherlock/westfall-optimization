"""Charts for the exact tier (results/*.exact.jsonl, results/lambda.jsonl) -> charts/*.svg and *.png.
Palette: validated categorical slots 1-3 (blue/orange/aqua); every series also carries a distinct line style or
marker and a direct label, so identity never depends on colour alone."""
import json, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
here = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(here, "charts"), exist_ok=True)
S = ["atlas", "highs", "scip"]; LABEL = {"atlas": "ATLAS-032", "highs": "HiGHS 1.16", "scip": "SCIP 10.0"}
COL = {"atlas": "#2a78d6", "highs": "#eb6834", "scip": "#1baf7a"}; LS = {"atlas": "-", "highs": "--", "scip": ":"}
INK, MUTED, GRID = "#1f1f1e", "#5f5e5a", "#e6e5e0"
plt.rcParams.update({"font.family": "Inter", "font.size": 10, "axes.edgecolor": MUTED, "axes.labelcolor": INK,
                     "xtick.color": MUTED, "ytick.color": MUTED, "axes.spines.top": False, "axes.spines.right": False,
                     "svg.fonttype": "none"})
R = {s: {json.loads(l)["id"]: json.loads(l) for l in open(os.path.join(here, "results", f"{s}.exact.jsonl"))} for s in S}
ids = sorted(R["atlas"]); TL = 30.0
def save(fig, name):
    for ext in ("svg", "png"): fig.savefig(os.path.join(here, "charts", f"{name}.{ext}"), dpi=180, bbox_inches="tight", facecolor="#fcfcfb")
    plt.close(fig)

# 1. Performance profile (Dolan-More): fraction of instances solved within tau x the best solver's time
t = {s: np.array([R[s][i]["wall_s"] if R[s][i]["solved"] else np.inf for i in ids]) for s in S}
best = np.minimum.reduce([t[s] for s in S]); has = np.isfinite(best)
taus = np.logspace(0, 2, 400)
fig, ax = plt.subplots(figsize=(7.2, 4.2)); ax.grid(axis="y", color=GRID, lw=0.8); ax.set_axisbelow(True)
for s in S:
    ratio = t[s][has] / best[has]
    y = [(ratio <= x).sum() / len(ids) for x in taus]
    ax.plot(taus, y, color=COL[s], lw=2, ls=LS[s])
    ax.annotate(f"{LABEL[s]}  {int(np.isfinite(t[s]).sum())}/{len(ids)}", (taus[-1], y[-1]), xytext=(6, {"atlas": -7, "highs": 7, "scip": 0}[s]), textcoords="offset points", va="center", color=INK, fontsize=9)
ax.set_xscale("log"); ax.set_xlim(1, 100); ax.set_ylim(0, 0.5)
ax.set_xlabel("Within this factor of the fastest solver (τ, log scale)"); ax.set_ylabel("Share of the 232 instances solved")
ax.set_title("Performance profile, five LOLIB families where optima are attainable (30 s limit)", loc="left", fontsize=11, color=INK)
save(fig, "performance_profile")

# 2. Proved optimal by family
fams = ["IO", "SGB", "RandB", "MB", "Spec"]; tot = {f: sum(R["atlas"][i]["family"] == f for i in ids) for f in fams}
fig, ax = plt.subplots(figsize=(7.2, 3.8)); w = 0.26; x = np.arange(len(fams))
for k, s in enumerate(S):
    v = [sum(R[s][i]["solved"] for i in ids if R[s][i]["family"] == f) for f in fams]
    bars = ax.bar(x + (k - 1) * (w + 0.02), v, w, color=COL[s], label=LABEL[s], hatch=["", "///", "..."][k], edgecolor="#fcfcfb", linewidth=0)
    for b, val in zip(bars, v): ax.text(b.get_x() + b.get_width() / 2, val + 0.8, str(val), ha="center", fontsize=8, color=INK)
ax.set_xticks(x, [f"{f}\n({tot[f]})" for f in fams]); ax.set_ylabel("Instances proved optimal")
ax.grid(axis="y", color=GRID, lw=0.8); ax.set_axisbelow(True); ax.legend(frameon=False, ncol=3, loc="upper right")
ax.set_title("Proved optimal within 30 s, by family (instance count in brackets)", loc="left", fontsize=11, color=INK)
save(fig, "solved_by_family")

# 3. Where the instances sit relative to the small-lambda regime
L = [json.loads(l) for l in open(os.path.join(here, "results", "lambda.jsonl"))]
fig, ax = plt.subplots(figsize=(7.2, 4.0)); ax.grid(axis="x", color=GRID, lw=0.8); ax.set_axisbelow(True)
for k, f in enumerate(fams):
    rows = [r for r in L if r["id"].startswith(f + "/")]
    ub = [r["lambda_ub"] / r["n"] ** 2 for r in rows]; lb = [r["lambda_lb"] / r["n"] ** 2 for r in rows if r["lambda_lb"] is not None]
    jit = np.random.default_rng(k).uniform(-0.15, 0.15, len(ub))
    ax.scatter(ub, k + 0.18 + jit * 0.6, s=14, color="#2a78d6", marker="o", lw=0)
    if lb: ax.scatter(lb, k - 0.18 + np.random.default_rng(k + 9).uniform(-0.09, 0.09, len(lb)), s=18, color="#c4501f", marker="D", lw=0)
ax.set_yticks(range(len(fams)), fams); ax.set_xlim(0, 1.05); ax.invert_yaxis()
ax.set_xlabel("λ divided by n²   (0 = highly structured, 1 = the trivial maximum)")
ax.text(0.02, -0.75, "◆ certified lower bound (proved-optimal instances)     ● certified upper bound (all instances)     true λ lies between", fontsize=8.5, color=MUTED)
ax.set_title("Even the certified lower bounds put λ at a constant fraction of n²", loc="left", fontsize=11, color=INK, pad=22)
save(fig, "lambda_regime")
print("charts written")
