# Mission 042 reproducibility

## Exact profile tests (independent Python)
At repository root:

```bash
python research/westfall-042/tests/test_bound042.py
```

No nonstandard Python packages needed. It independently computes H(K) and R_h(K) using exact-integer recurrences, checks all 0<=h<=8 and 0<=K<=19 (180 cases), checks both binomial(2h,h)*H(K) and 4^h*H(K), and verifies base tables.

## Lean coordinate lemmas (not the main counting theorem)
The pinned project lives in `research/westfall-041/lean` (Lean 4.32.0 and Mathlib v4.32.0):

```bash
cd research/westfall-041/lean
lake update
lake exe cache get
lake build Westfall042
lake env lean Audit042.lean
```

The `Westfall042` module is currently **only a partial formalization**. It proves the coordinate decomposition and monotonicity building blocks, NOT the cardinality inequality R_h(K) <= binomial(2h,h)*H(K). The target theorem is paper-proved in H_DEPENDENCE.md and remains to be formalized.

GitHub Actions `.github/workflows/research-042.yml` checks the Python tests and the Lean scaffold separately. Green CI for the scaffold must never be presented as validation of the unformalized bound.

## Manuscript
See MANUSCRIPT_ADDENDUM.md for the new theorem and consequences and the precise verification distinction.
