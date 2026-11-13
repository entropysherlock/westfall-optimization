"""Mission 023 Phase 4: generate seeded instances and a native Lean harness running autoCutX.
Families: uniform rationals, zero/tie-heavy integers, block-structured, planted order,
near-transitive, and the manuscript's families (band, H_p, tight family T_k, the D2 matrix)."""
import json, random, sys
from fractions import Fraction as F
SEED = 23023
def skew(n, f):
    A = [[F(0)] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = F(f(i, j)); A[i][j] = v; A[j][i] = -v
    return A
def perm(A, rng):
    n = len(A); p = list(range(n)); rng.shuffle(p)
    return [[A[p[i]][p[j]] for j in range(n)] for i in range(n)]
def instances():
    rng = random.Random(SEED); out = []
    for n in (3, 4, 5):
        reps = 6 if n < 5 else 2
        for r in range(reps):
            out.append(('uniform', skew(n, lambda i, j: F(rng.randint(-9, 9), rng.randint(1, 4)))))
            out.append(('ties_zeros', skew(n, lambda i, j: rng.choice([0, 0, 1, -1, 2]))))
            out.append(('near_transitive', perm(skew(n, lambda i, j: rng.choice([1, 2, 3]) if rng.random() > 0.2 else -1), rng)))
            out.append(('planted', perm(skew(n, lambda i, j: F(j - i) + F(rng.randint(-2, 2), 2)), rng)))
            out.append(('blocks', perm(skew(n, lambda i, j: (rng.choice([-2, -1, 1, 2]) if i // 2 == j // 2 else (3 if rng.random() > 0.15 else -1))), rng)))
    # manuscript families
    def band(n):
        M = 2 * n + 1
        return skew(n, lambda i, j: 1 if j - i == 1 else (-1 if j - i == 2 else M))
    for n in (4, 5): out.append(('band', band(n)))
    def Hp(p):
        n = p + 2; A = [[F(0)] * n for _ in range(n)]
        def s(i, j, w): A[i][j] = F(w); A[j][i] = -F(w)
        for x in range(1, p + 1): s(0, x, 1); s(x, n - 1, 1)
        for x in range(1, p + 1):
            for y in range(x + 1, p + 1): s(x, y, 1)
        s(n - 1, 0, p + 1); return A
    for p in (2, 3): out.append(('H_p', Hp(p)))
    def Tk(k):
        n = 2 * k + 2; W = 4 * k + 4; A = [[F(0)] * n for _ in range(n)]
        def s(i, j, w): A[i][j] = F(w); A[j][i] = -F(w)
        P = list(range(1, k + 1)); N = list(range(k + 1, 2 * k + 2))
        for p in P: s(0, p, 1)
        for q in N: s(0, q, -1)
        b2 = P + N
        for i in range(len(b2)):
            for j in range(i + 1, len(b2)): s(b2[i], b2[j], W)
        return A
    out.append(('tight_T1', Tk(1)))
    D2 = [[0, -1, -1, -2, 3], [1, 0, -3, -2, -2], [1, 3, 0, 1, 0], [2, 2, -1, 0, -1], [-3, 2, 0, 1, 0]]
    out.append(('D2_matrix', [[F(x) for x in r] for r in D2]))
    out.append(('empty_n1', [[F(0)]]))
    return out
def lean_q(x):
    x = F(x); return f"({x.numerator}/{x.denominator} : ℚ)" if x.denominator != 1 else f"({x.numerator} : ℚ)"
if __name__ == '__main__':
    inst = instances()
    only = set(int(x) for x in sys.argv[1].split(',')) if len(sys.argv) > 1 else None
    target = 'ExecHarness2.lean' if only else 'ExecHarness.lean'
    json.dump([dict(id=i, family=f, A=[[str(x) for x in r] for r in A]) for i, (f, A) in enumerate(inst)],
              open('exec_instances.json', 'w'), indent=0)
    L = ['import Westfall022.Exec', 'open Westfall022', '',
         'def showRes {n : ℕ} (A : WMat n) : String :=',
         '  match autoCutX A with',
         '  | none => "NONE"',
         '  | some r =>',
         '    let v : String := match (r.1 : Option ℚ) with | none => "bot" | some q => toString q',
         '    s!"{v}|{List.ofFn (fun i => (r.2.1 i).val)}|{objective A r.2.1}|{List.ofFn (fun v => (r.2.2.1 v).val)}|{lamB A r.2.2.1}|{r.2.2.2}"', '']
    for i, (f, A) in enumerate(inst):
        if only is not None and i not in only: continue
        n = len(A)
        rows = ', '.join('![' + ', '.join(lean_q(x) for x in r) + ']' for r in A)
        L.append(f'def A{i} : WMat {n} := ![{rows}]')
    L += ['', 'def main : IO Unit := do']
    for i, _ in enumerate(inst):
        if only is not None and i not in only: continue
        L.append(f'  IO.println s!"{i}|{{showRes A{i}}}"')
        L.append('  (← IO.getStdout).flush')
    open(target, 'w').write('\n'.join(L) + '\n')
    print(len(inst), 'instances; seed', SEED)
