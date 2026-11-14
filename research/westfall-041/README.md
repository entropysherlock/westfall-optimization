# WESTFALL Mission 041: defect-robust k-cut counting

**Status: NEW GENERALIZATION ESTABLISHED — IMPACT UNDER REVIEW.** These are research results under review. Nothing
here is published on the website.

**Main result.** A digraph in which every vertex has at most h non-neighbours, and which has an ordering of width
≤ c, has at most

  (n+1) · min{R_h(c+k), (n+1)^h} · H(c+k)

k-cuts. Here R_h(K) ≤ C(K+2h, h). The case h = 0 is Mission 040's theorem.

**Consequences.**
- Conjecture 041-A, the bound (n+1)^{2h+1}·H, holds, and its exponent improves to h+1.
- Directed cutwidth on h-semicomplete digraphs runs in 2^{O(√k + h log(k+h))}·n⁴, which is FPT in k + h.
- OLA runs in 2^{O(k^{1/3} + h log(k+h))}·n^{O(1)}.
- Exponential dependence on h is necessary for k-cut counting.
- For bounded independence number, k-cut counting is necessarily n^{Ω(α)}, so the result does not extend there.

| File | Contents |
|---|---|
| THEOREM.md | precise statements, each labeled [Lean] or [paper] |
| PROOF.md | full proofs |
| NOVELTY.md | literature comparison (FP 2013/19, BPP 2017/18, KKT 2015, Misra et al. 2018/23, Gomes–Lopes–Mnich 2026) |
| COUNTEREXAMPLES.md | refutation attempts and the counterexamples to the variants that fail |
| ALGORITHM.md | cutwidth and OLA algorithms, with proofs of the stopping rule, reconstruction, time and space |
| EXPERIMENTS.md | exhaustive and adversarial search, with hashes |
| FORMAL_STATUS.md | Lean 4.32 / Mathlib v4.32.0 formalization and axiom audit |
| LEVEL4_ASSESSMENT.md, REFEREE_BRIEFING.md | assessment and a five-minute review guide |
| lean/ | Lean project: `Westfall041/DefectCount.lean`, plus Mission 040's `CutCount.lean`, unchanged |
| tests/, data/ | Python checkers and their outputs |

**Reproduce.**
- `python3 tests/hunt041.py`: full adversarial search, about 1 hour. Add `--quick` for about 6 s.
- `python3 tests/algo041.py`
- `python3 tests/degenerate041.py`
- `cd lean && lake build Westfall041`

The tests import `research/westfall-040/tests/kcut_lib.py`, so this branch is stacked on Mission 040 (PR #16).
