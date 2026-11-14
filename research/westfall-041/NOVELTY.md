# Mission 041 — Novelty screen

Sources were checked on 2026-11-13. Every claim below records what we actually read: an abstract, the full text,
or a summary of a fetched page. Each entry is marked with its exact access level.

## Prior work on the same objects

| Work | What it gives on h-semicomplete / bounded-α digraphs | Relation to Mission 041 |
|---|---|---|
| Fomin–Pilipczuk, ESA 2013 and full version 2019 | k-cut counting framework; 2^{O(√(k log k))}·n^{O(1)} cutwidth for semicomplete digraphs | Framework reused. h = 0 is Mission 040. |
| Barbero–Paul–Pilipczuk, ICALP 2017 / TALG 2018 | ETH lower bounds 2^{o(√k)} (cutwidth) and 2^{o(k^{1/3})} (OLA) on tournaments, Theorem 14 | These apply to h = 0 ⊂ h-semicomplete, so Theorem E is ETH-tight in k for fixed h. |
| Kitsunai–Kobayashi–Tamaki, ESA 2015, arXiv:1507.01934 (full text read in Mission 041 Phase 4) | Introduce h-semicomplete digraphs. Pathwidth ≤ k in (h+2k+1)^{2k}·n^{O(1)}. Remark that cutwidth is "an immediate corollary" of Nagamochi (ISAAC 2012). Proposition 1: at most h+2k+1 vertices v with d⁺(U ∪ {v}) ≤ k. | No k-cut counting lemma. No explicit cutwidth running time. No subexponential results. No lower bounds. The natural reading of the Nagamochi route is (h+k)^{O(k)}·n^{O(1)} (**our inference**). Theorem E is 2^{O(√k + h log(k+h))}·n⁴, subexponential in k. |
| Misra–Saurabh–Sharma–Zehavi, FSTTCS 2018 / Algorithmica 85(7) 2023 (full text, Lemma 5 and Theorems 2–3 read via fetch) | Digraphs of independence number α. Number of k-cuts ≤ 2^{c√k log k}·(n+1)^{2α⌈√k⌉}·log n. Cutwidth in 2^{O(α²√k log(αk))}·n^{O(α)}. OLA in 2^{O(α²k^{1/3} log(αk))}·n^{O(α)}. | h-semicomplete ⇒ α ≤ h+1, so they apply with exponent n^{O(h)}. Theorem C/E removes h from the exponent of n (n⁴ for every h) and removes the log k from the exponent of 2. Theorem F shows the n^{Ω(α)} in their counting is necessary for the bounded-α class. |
| Gomes–Lopes–Mnich, arXiv:2610.41840, 30 Oct 2026 (abstract page fetched) | k-triples in h-semicomplete digraphs of large directed pathwidth, found in polynomial time. Pathwidth bound (h+1)·k·2^{27k+9}. Arc-disjoint paths. Lower bound: no bound subexponential in k or sublinear in h is possible for their function f. | Cutwidth, k-cut counting and subexponential algorithms are **not mentioned** (checked by fetch). Their lower bound concerns the pathwidth–k-triple function, not k-cut counts. The text we fetched does not contain the phrase "open parameterized by k+h". We cannot confirm that a cutwidth open problem is posed there. |
| Nagamochi, "Linear layouts in submodular systems", ISAAC 2012 | Generic layout algorithms for submodular systems | Not read in full. We rely on KKT's characterization of it. |

## What is new, as far as we can determine

1. **The defect rectangle lemma** ab ≤ back(P) + back(X) + h·min(a,b), and its shifted hyperbola consequences.
2. **A k-cut bound for h-semicomplete digraphs that is linear in n and FPT in h:** (n+1)·R_h(K)·H(K). We found no
   prior k-cut counting result for h-semicomplete digraphs except via the bounded-α results, which are n^{O(α)}.
3. **Cutwidth on h-semicomplete digraphs in 2^{O(√k + h log(k+h))}·n⁴.** For fixed h this is subexponential in k and
   ETH-tight. It is FPT in k + h with an n-exponent independent of h. We found no prior subexponential-in-k bound
   for this class with n-exponent independent of h.
4. **OLA in 2^{O(k^{1/3} + h log(k+h))}·n^{O(1)}**, with the same caveat.
5. **The 2^{Ω(h)} lower bound on k-cut counts**, the bounded-α counting obstruction n^{Ω(α)}, and the degenerate-defect
   generalization (Theorem D).
6. **Machine-checked proofs** (Lean 4 + Mathlib) of Theorems A, B, C and Conjecture 041-A.

## Residual risks

- **Nagamochi route.** The Nagamochi-based cutwidth algorithm referred to by KKT might be faster than our inference.
  Even so, it would not be subexponential in k: their methods are branching on (h+2k+1) candidates per step.
  This is still to be confirmed by a reader of Nagamochi 2012.
- **Unread work.** A paper we did not find, for example a thesis or a workshop paper, might contain the defect
  rectangle lemma. The idea is short, and someone familiar with Fomin–Pilipczuk could find it quickly.
- **Bound for the bounded-α class.** The Misra et al. bound we quote is Lemma 5 of the FSTTCS version. It is a bound
  for yes-instances, and the journal version may differ in constants.
