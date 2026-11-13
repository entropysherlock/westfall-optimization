# WESTFALL Mission 040 — k-cuts of semicomplete digraphs

**Verdict: NEW THEOREM ESTABLISHED — IMPACT UNDER REVIEW.** No independent human review has taken place.

**Result.** If a semicomplete digraph on n vertices has an ordering of width ≤ c, it has at most (n+1)·H(c+k) k-cuts.
Here H(K) is the number of partitions under the hyperbola xy ≤ K, and H(K) ≤ e^{2π√K}. This answers the open problem of
Fomin–Pilipczuk (ESA 2013). It also gives 2^{O(√k)}·n^{O(1)} cutwidth and 2^{O(k^{1/3})}·n^{O(1)} OLA algorithms for
semicomplete digraphs, both tight under ETH.

| File | Content |
|---|---|
| `MANUSCRIPT.md` | A. Theorem manuscript: definitions, proofs, algorithms, limitations, references |
| `NOVELTY.md` | B. Side-by-side literature comparison and novelty verdict |
| `PROOF_AUDIT.md` | C. Audit questions, objections, counterexample hunt, prototype results |
| `REPRODUCE.md` | D. Commands, seeds, environment, hashes |
| `FORMAL_STATUS.md` | E. Lean report: what the kernel checked and what it did not |
| `REFEREE_BRIEFING.md` | F. One-page briefing for an external referee |
| `RISKS.md` | G. Outstanding risks |
| `GRANT_ASSESSMENT.md` | Scientific-achievement and grant-credibility assessments |
| `tests/` | Independent Python checker (`kcut_lib.py`, `hunt.py`) and algorithm prototype (`algo.py`) |
| `data/` | Recorded outputs |
| `lean/` | Lean 4 + Mathlib project (`Westfall040/CutCount.lean`), axiom audit, build log |

This directory supersedes the draft `research/kcuts-2026/PROOF_NOTE.md` of PR #10. That draft's mathematics is
confirmed. Its Theorem 1 wording "for any digraph" is corrected to semicomplete digraphs, which is necessary because
counterexamples exist otherwise.
