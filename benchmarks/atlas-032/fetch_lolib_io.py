"""Fetch the 50 real-world LOLIB IO instances from RPLIB (github.com/IGARDS/RPLib, data/lolib) and convert
them to WESTFALL skew-symmetric form A = C - C^T (benefit interpretation; diagonal ignored).
Writes lolib_io.json: {name: {"A": [[...]], "S": sum_{i!=j} c_ij}}.  Benefit objective = (F_A + S) / 2.
Usage: python3 fetch_lolib_io.py [path-to-RPLib-clone]   (clones it with git if no path is given)."""
import json, os, subprocess, sys, csv
here = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "_rplib")
if not os.path.isdir(root):
    subprocess.run(["git", "clone", "--depth", "1", "https://github.com/IGARDS/RPLib", root], check=True)
names = {}
with open(os.path.join(root, "data", "unprocessed_datasets.tsv")) as f:
    for row in csv.reader(f, delimiter="\t"):
        if row and row[0].isdigit() and row[1].startswith("LO Lib IO/"): names[int(row[0])] = row[1].split("/", 1)[1]
proc = {}
with open(os.path.join(root, "data", "processed_datasets.tsv")) as f:
    for row in csv.reader(f, delimiter="\t"):
        if row and row[0].isdigit() and int(row[1]) in names: proc[int(row[0])] = names[int(row[1])]
out = {}
for pid, name in sorted(proc.items(), key=lambda x: x[1]):
    D = json.load(open(os.path.join(root, "data", "lolib", f"{pid}.json")))["data"]
    keys = sorted(D.keys(), key=int); idx = {k: i for i, k in enumerate(keys)}; n = len(keys)
    C = [[0] * n for _ in range(n)]
    for i in keys:
        for j, v in D[i].items():
            if j in idx and i != j and v is not None: C[idx[i]][idx[j]] = int(round(float(v)))
    A = [[C[i][j] - C[j][i] for j in range(n)] for i in range(n)]
    out[name] = {"A": A, "S": sum(C[i][j] for i in range(n) for j in range(n) if i != j)}
json.dump(out, open(os.path.join(here, "lolib_io.json"), "w"))
print(len(out), "instances;", ", ".join(f"{k}(n={len(v['A'])})" for k, v in list(out.items())[:5]), "...")
