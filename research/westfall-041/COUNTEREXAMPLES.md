# Mission 041 — Refutation attempts and counterexamples

As the brief required, we tried to refute each claim before proving it.

## 1. Claims that survived refutation (and were then proved)

| Claim | How we attacked it | Outcome |
|---|---|---|
| Defect rectangle ab ≤ K + h·min(a,b) | 3.39·10⁹ (P, X) checks over 843,887 digraphs, every arc pattern for n ≤ 5 (h ≤ 2) | no violation; proved (Lean `defect_rectangle`) |
| Shifted hyperbola (both forms) | 1.01·10⁹ checks | no violation; proved (Lean `shifted_hyperbola`) |
| Injectivity of the (\|X\|, rows, residual) encoding | 1.9·10⁸ checks | no collision; proved (Lean `card_kcuts_le_defect`) |
| Conjecture 041-A: N_k ≤ (n+1)^{2h+1}·H(K) | 10⁷ bound checks, extremal families | no violation; proved (Lean `conjecture_041A`) and improved |

## 2. Variants that are FALSE

**(a) The semicomplete bound itself, (n+1)·H(c+k), fails for h ≥ 1.** The smallest counterexample is the arcless
digraph on 2 vertices. It has h = 1, ctw = 0 and N_0 = 4 > 3 = (n+1)·H(0). The full search records 21,206 failures,
so some h-dependent factor is necessary.

**(b) Absorbing the defect linearly into H's argument, N_k ≤ (n+1)·H(c+k+C·h) for a constant C, is false for every
C.**
- **Counterexample (C = 1):** the arcless digraph E_27. It is 26-semicomplete, has ctw 0, and has
  N_0 = 2²⁷ = 134,217,728, while 28·H(26) = 116,692,856.
- **Other constants.** For C = 2, 3, 4 the smallest single-block counterexamples are at h = 85, 149 and 219.
- **Why it fails in general.** A single independent block gives N_0 = 2^{h+1}, while H(Ch) = e^{O(√(Ch))}. So the
  dependence on h must be exponential in h, not merely exponential in √h. Any absorption must be at least
  H(K + Ω(h²)).

**(c) Any bound f(h)·g(n)·H(K) with f(h)g(n) = o(n·2^h/h) is false**, by Theorem L (independent blocks):
N_0 = 1 + (n/(h+1))(2^{h+1}−1) at ctw = 0.

**(d) The rectangle lemma for bounded independence number is false in every additive form.** Two disjoint transitive
tournaments of size m, with no arcs between them (α = 2), have P = T_1, X = T_2, a = b = m and back(P) = back(X) = 0.
For any fixed f, ab = m² exceeds f·(a+b) once m is large enough.

**(e) Any k-cut bound for α-bounded digraphs with n-exponent independent of α is false.** α disjoint transitive
tournaments have ctw = 0 and N_0 = (n/α + 1)^α.

## 3. Open (neither proved nor refuted)

- **Is N_k ≤ (n+1)·2^{O(√K + h)} true?** That is, can the h·log(K+h) term be removed? (b) shows that H(K + O(h²))
  is the most one could absorb, and e^{2π√(K+h²)} ≤ e^{2π√K}·e^{2πh} has exactly this shape. Our search found
  nothing against it, but the instances are too small to be informative.
- **Is the 2^{Ω(h)} lower bound needed for *deciding* cutwidth**, as opposed to enumerating cuts?
- **Is Theorem D's n^{2d+1} tight for d-degenerate defects?** We have no n^{Ω(d)} lower-bound example. The hub
  constructions we tried give far fewer cuts than the bound.
