"""Re-score the ATLAS-032 Studio orderings from the raw matrices (Python integers). Run from this directory."""
import json
for r, n in (("round1_20items", 20), ("round2_50items", 50)):
    tok = open(f"../instances/{r}.lolib").read().split(); assert int(tok[0]) == n
    A = [[int(tok[1 + i * n + j]) for j in range(n)] for i in range(n)]
    assert all(A[i][j] == -A[j][i] for i in range(n) for j in range(n)), "matrix must be skew-symmetric"
    J = json.load(open(f"../instances/{r.split('_')[0]}_studio_atlas032.json"))
    assert [[int(x) for x in row] for row in J["input"]["matrix"]] == A, "Studio file matrix differs"
    o = [int(v[1:]) - 1 for v in J["result"]["order"]]; assert sorted(o) == list(range(n))
    F = sum(A[o[a]][o[b]] for a in range(n) for b in range(a + 1, n))
    print(r, "F =", F, "| Studio file says", J["result"]["objective"], "| match", str(F) == J["result"]["objective"])
