# Exact small-instance checks for the Lean modelling choices

`model_checks.py` (exact integer arithmetic, n ≤ 5) checks, before formalization:

- **M1:** λ over block-index functions equals λ over genuine ordered partitions.
- **M2:** the finite-threshold K₀ equals the minimum over a dense rational grid of thresholds.
- **M3:** 019 Lemma 1 in pair-count form, for all subsets.
- **M4:** 022 Theorem 1(1) for every partition (not just the minimiser).
- **Edge cases:** n = 0 (λ = 0, erratum E1), n = 1, all-zero matrices.

`exact_reference.py` is a copy of the Discovery 022 exact reference implementation.

Last run: M1 250/250, M2 176,155/176,155, M3 5,404,502/5,404,502, M4 2,734,833/2,734,833, 0 violations.
