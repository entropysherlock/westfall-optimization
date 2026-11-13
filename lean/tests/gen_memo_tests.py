"""Mission 024 benchmark generator: identical Mission 023 instances (seed 23023) plus an extended
suite (seed 24024), compiled into timed native harnesses for autoCutM (memoised) and autoCutX."""
import json, random, sys
from fractions import Fraction as F
from gen_exec_tests import instances, skew, perm, lean_q
def extended():
    rng = random.Random(24024); out = []
    for n in (6, 7):
        for r in range(3):
            out.append(('uniform', skew(n, lambda i, j: F(rng.randint(-9, 9), rng.randint(1, 4)))))
            out.append(('ties_zeros', skew(n, lambda i, j: rng.choice([0, 0, 1, -1, 2]))))
            out.append(('near_transitive', perm(skew(n, lambda i, j: rng.choice([1, 2, 3]) if rng.random() > 0.2 else -1), rng)))
            out.append(('planted', perm(skew(n, lambda i, j: F(j - i) + F(rng.randint(-2, 2), 2)), rng)))
            out.append(('blocks', perm(skew(n, lambda i, j: (rng.choice([-2, -1, 1, 2]) if i // 3 == j // 3 else (3 if rng.random() > 0.15 else -1))), rng)))
            out.append(('equal_thresholds', skew(n, lambda i, j: rng.choice([-1, 1]))))
        out.append(('all_zero_max_cuts', skew(n, lambda i, j: 0)))
        M = 2 * n + 1
        out.append(('band', skew(n, lambda i, j: 1 if j - i == 1 else (-1 if j - i == 2 else M))))
    for p in (4, 5):
        n = p + 2; A = [[F(0)] * n for _ in range(n)]
        def s(i, j, w): A[i][j] = F(w); A[j][i] = -F(w)
        for x in range(1, p + 1): s(0, x, 1); s(x, n - 1, 1)
        for x in range(1, p + 1):
            for y in range(x + 1, p + 1): s(x, y, 1)
        s(n - 1, 0, p + 1); out.append(('H_p', A))
    return out
def write(mode, inst, ids, fname):
    fn = {'M': 'autoCutM', 'X': 'autoCutX'}[mode]
    L = ['import Westfall022.PartitionCountDP', 'open Westfall022', '',
         'def showRes {n : ℕ} (A : WMat n) : String :=',
         f'  match {fn} A with', '  | none => "NONE"', '  | some r =>',
         '    let v : String := match (r.1 : Option ℚ) with | none => "bot" | some q => toString q',
         '    s!"{v}|{List.ofFn (fun i => (r.2.1 i).val)}|{objective A r.2.1}|{List.ofFn (fun v => (r.2.2.1 v).val)}|{lamB A r.2.2.1}|{r.2.2.2}|{(reachable A r.2.2.2).card}|{(nodes A r.2.2.2).card}"', '']
    for i in ids:
        f, A = inst[i]; n = len(A)
        rows = ', '.join('![' + ', '.join(lean_q(x) for x in r) + ']' for r in A)
        L.append(f'def A{i} : WMat {n} := ![{rows}]')
    L += ['', 'def runOne (i : ℕ) (f : Unit → String) : IO Unit := do',
          '  let t0 ← IO.monoMsNow',
          '  IO.print s!"{i}|{f ()}"', '  (← IO.getStdout).flush',
          '  let t1 ← IO.monoMsNow',
          '  IO.println s!"|ms={t1 - t0}"', '  (← IO.getStdout).flush', '']
    chunks = [ids[c:c + 10] for c in range(0, len(ids), 10)]
    for c, ch in enumerate(chunks):
        L.append(f'def chunk{c} : IO Unit := do')
        for i in ch: L.append(f'  runOne {i} (fun _ => showRes A{i})')
        L.append('')
    L.append('def main : IO Unit := do')
    for c in range(len(chunks)): L.append(f'  chunk{c}')
    open(fname, 'w').write('\n'.join(L) + '\n')
if __name__ == '__main__':
    base = instances(); ext = extended(); allinst = base + ext
    json.dump([dict(id=i, family=f, suite='mission023' if i < len(base) else 'extended024', A=[[str(x) for x in r] for r in A])
               for i, (f, A) in enumerate(allinst)], open('memo_instances.json', 'w'), indent=0)
    write('M', allinst, list(range(len(allinst))), 'MemoHarness.lean')
    write('X', allinst, list(range(len(base))), 'UnmemoHarness.lean')
    print(len(base), 'base +', len(ext), 'extended instances')
