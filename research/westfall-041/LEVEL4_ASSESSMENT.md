# Mission 041 — Level-4 assessment

## The question

Does Mission 041 produce a *generalization* of the Mission 040 theorem with:
- a correct, checkable proof;
- a quantitatively sharp form; and
- a new algorithmic consequence that is not available from prior work?

## Evidence for

1. **Correctness is machine-checked.** Theorems A, B and C, Conjecture 041-A, and the h = 0 specialization are
   formalized in Lean 4 + Mathlib. There is no `sorry` and no custom axiom. The exhaustive and adversarial search
   found no violation (see EXPERIMENTS.md).
2. **The conjecture as posed is proved and improved.**
   - The exponent improves from (n+1)^{2h+1} to (n+1)^{h+1}.
   - Through R_h, the bound becomes linear in n with an FPT factor in h.
3. **The h-dependence is the right order at K = 0.** Upper bound 4^h and lower bound 2^h/poly(h), from Theorem L. Both
   are exponential in h, and neither is polynomial in n^h.
4. **New algorithm.** Cutwidth on h-semicomplete digraphs runs in 2^{O(√k + h log(k+h))}·n⁴. Before this:
   - Kitsunai–Kobayashi–Tamaki (KKT) and Nagamochi give no subexponential-in-k bound.
   - Misra et al. give n^{O(h)}.

   For fixed h, the new algorithm is ETH-tight.
5. **A sharp boundary.** The bounded-α obstruction (Theorem F) shows that the same counting cannot reach bounded
   independence number. The degenerate-defect theorem (Theorem D) shows how far it does reach. Together they
   locate a dichotomy:
   - min-defect costs an FPT factor;
   - additive defect costs n^{α+β};
   - dense defect is impossible.

## Evidence against / limits

1. **The proof is short and the key idea is simple.** The defect lemma is a one-paragraph extension of the
   semicomplete rectangle lemma. A referee may view the paper as a natural corollary of Mission 040, not a
   separate result. Impact therefore depends heavily on whether Mission 040 itself is accepted as new; it is
   under review in PR #16.
2. **h-semicomplete digraphs are a niche class.** They are studied mainly by KKT 2015 and Gomes–Lopes–Mnich 2026.
3. **The h·log k term may be an artifact.** Its necessity is open (Theorem L covers only K = 0).
4. **Not every result is formalized.** The asymptotic estimates, Theorem D, Theorem F and the algorithms are not
   formalized.
5. **The literature screen has gaps.** Nagamochi 2012 was not read in full, and an unindexed prior statement of the
   defect lemma cannot be excluded.

## Verdict

**NEW GENERALIZATION ESTABLISHED — IMPACT UNDER REVIEW.**

The mathematics is established: it is kernel-checked and has survived refutation attempts. Level 4 would need
three further things:
1. independent confirmation that Mission 040 is new;
2. a resolution of the h·log k question, or a matching lower bound;
3. an expert reading of the Nagamochi route.

Until then the impact is under review. The work is appropriate as a section or corollary paper alongside the
Mission 040 manuscript, not as a standalone headline.
