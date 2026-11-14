"""Fetch the complete LOLIB suite (nine families, 685 instances) pinned to a fixed commit, and the MA-EDM
best-known-solution (BKS) permutations. Writes manifest.json: per instance its family, n, SHA-256 of the raw
file, and the BKS objective RECOMPUTED here from the published permutation (never copied from a table).
Objective convention (LOLIB): maximise sum_{r<s} C[pi_r][pi_s] over permutations pi.
Instance matrices are third-party data and are not committed; they are cloned into ./_data.
Usage: python3 fetch_suite.py"""
import re, hashlib, json, os, subprocess, zipfile, io
here = os.path.dirname(os.path.abspath(__file__))
SUITE = ("https://github.com/F-a-b-r-i-z-i-o/Lop-Time-For-a-Change", "a32e2cb24a9cb7bf3b754ebe4435adeaf34ffd9f")
BKSREPO = ("https://github.com/carlossegurag/LOP_MA-EDM", None)
FAMILIES = ["IO", "SGB", "RandB", "MB", "Spec", "RandA2", "RandA1", "xLOLIB", "xLOLIB2"]
def clone(url, rev, dest):
    if not os.path.isdir(dest):
        subprocess.run(["git", "clone", "-q", url, dest], check=True)
    if rev: subprocess.run(["git", "-C", dest, "checkout", "-q", rev], check=True)
    return subprocess.run(["git", "-C", dest, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
def read_matrix(path):
    tok = open(path).read().split(); n = int(tok[0]); v = list(map(int, tok[1:1 + n * n]))
    assert len(v) == n * n, path
    return n, [v[i * n:(i + 1) * n] for i in range(n)]
def benefit(C, perm):
    n = len(C); s = 0
    for a in range(n):
        row = C[perm[a]]
        for b in range(a + 1, n): s += row[perm[b]]
    return s
if __name__ == "__main__":
    data = os.path.join(here, "_data"); os.makedirs(data, exist_ok=True)
    suite_rev = clone(SUITE[0], SUITE[1], os.path.join(data, "suite"))
    bks_rev = clone(BKSREPO[0], BKSREPO[1], os.path.join(data, "maedm"))
    z = zipfile.ZipFile(os.path.join(data, "maedm", "BKS.zip"))
    bks = {}
    for nm in z.namelist():
        p = nm.split("/")
        if len(p) == 3 and p[0] == "BKS" and p[2] and not p[2].startswith("."):
            txt = z.read(nm).decode(); ind = [l for l in txt.splitlines() if l.startswith("Individuo:")]
            cost = [l for l in txt.splitlines() if l.startswith("Costo:")]
            if ind: bks[(p[1], p[2])] = (list(map(int, ind[0].split(":")[1].replace(",", " ").split())), int(cost[0].split(":")[1]))
    rows = []; mism = 0
    for fam in FAMILIES:
        d = os.path.join(data, "suite", "classic_benchmarks", fam)
        for name in sorted(os.listdir(d)):
            path = os.path.join(d, name); raw = open(path, "rb").read()
            n, C = read_matrix(path)
            r = {"family": fam, "name": name, "n": n, "sha256": hashlib.sha256(raw).hexdigest(),
                 "path": os.path.relpath(path, here), "bks": None, "bks_stated": None}
            hit = [k for k in bks if k[0] == fam and (k[1] == name or re.fullmatch(re.escape(name) + r"_\d+", k[1]))]
            if len(hit) == 1:
                perm, stated = bks[hit[0]]
                if sorted(perm) == list(range(n)):
                    r["bks"] = benefit(C, perm); r["bks_stated"] = stated
                    if r["bks"] != stated: mism += 1
            rows.append(r)
    json.dump({"suite_repo": SUITE[0], "suite_commit": suite_rev, "bks_repo": BKSREPO[0], "bks_commit": bks_rev,
               "objective": "maximise sum_{r<s} C[pi_r][pi_s]", "instances": rows}, open(os.path.join(here, "manifest.json"), "w"), indent=1)
    have = sum(r["bks"] is not None for r in rows)
    print(f"{len(rows)} instances; BKS recomputed for {have}; stated-vs-recomputed mismatches: {mism}")
    for fam in FAMILIES: print(fam, sum(r['family'] == fam for r in rows), "max n", max(r['n'] for r in rows if r['family'] == fam))
