# WESTFALL Mission 043 — sharpened counting, formal-verification sprint

**Objective:** prove in the pinned Lean kernel that R_h(K) <= (2h choose h) * H(K), then combine with the Mission 041 theorem to obtain N_k <= (n+1) * (2h choose h) * H(c+k)^2.

**Status:** NOT COMPLETE as a Lean theorem. The result has a complete paper proof in Mission 042's H_DEPENDENCE.md. This branch currently formalizes preliminary split/reconstruction, monotonicity and residual-bound lemmas in Westfall043.lean, and fixes the earlier broken import/docstring ordering in Westfall042.lean. These individual declarations still require successful CI.

**Remaining task:** construct a finite injective encoding Rset h K -> Hset K × BoxSet h where BoxSet h consists of antitone h-tuples with entries in [0,h], and prove |BoxSet h| = choose (2h) h (or at least <= 4^h) without an axiom. Then use card_le_card_of_injOn and card_product, prove sharper cut-count corollary, and run axioms audit. Do not state the main inequality is Lean verified before all these steps compile.

**Reproduce:**
```bash
cd research/westfall-041/lean
lake update
lake exe cache get
lake build Westfall042 Westfall043
lake env lean Audit042.lean
lake env lean Audit043.lean
```
GitHub action: .github/workflows/research-042.yml.

No claims of published novelty, Level 4, or production readiness. Research PR only. Do not merge upstream PRs without approval.
