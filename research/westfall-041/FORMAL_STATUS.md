# Mission 041 — Formal status

## Setup

- **Lean:** 4.32.0 (commit 8c9756b2…). **Mathlib:** v4.32.0. Both are pinned in `lean/lean-toolchain` and
  `lean/lakefile.toml`.
- **Source:** `lean/Westfall041/DefectCount.lean` (sha256 in `lean/BUILD_LOG.txt`). It imports Mission 040's
  `Westfall040/CutCount.lean`, included unchanged with sha256 b08304dd…, identical to PR #16.
- **Build:** `lake build Westfall041` completes with no errors and no warnings in the 041 file.
- **`sorry` / `admit` / custom `axiom`:** none (grep in `AXIOM_AUDIT.txt`).
- **Axioms:** every theorem depends only on `propext`, `Classical.choice` and `Quot.sound`. Full output is in
  `lean/AXIOM_AUDIT.txt`.

## What is kernel-checked

| Lean name | Statement |
|---|---|
| `HSemicomplete D h` | definition: every vertex has ≤ h non-neighbours (no arc either way) |
| `hsemicomplete_zero_of_semicomplete` | semicomplete ⇒ 0-semicomplete |
| `defect_rectangle` | Theorem A: \|P∖X\|·\|X∖P\| ≤ back P + back X + h·\|P∖X\| and the same with h·\|X∖P\| |
| `shifted_hyperbola` | Theorem B: s·(μ_s − h) ≤ c+k and μ_s·(s − h) ≤ c+k (ℕ subtraction) |
| `eq_of_mu_eq'` | injectivity of (\|X\|, μ) given a support bound L |
| `row_iff` | row criterion: i+1 ≤ μ_s ⟺ s ≤ rowCount X L i |
| `Rset`, `R` | definition of R_h(K) |
| `R_le_pow`, `R_zero` | R h K ≤ (K+h+1)^h, and R 0 K = 1 |
| `card_kcuts_le_defect` | Theorem C: #k-cuts ≤ (\|V\|+1)·R h (c+k)·H (c+k) |
| `card_kcuts_le_defect_pow` | #k-cuts ≤ (\|V\|+1)·(c+k+h+1)^h·H (c+k) |
| `card_kcuts_le_defect_poly` | #k-cuts ≤ (\|V\|+1)^(h+1)·H (c+k) |
| `conjecture_041A` | **Conjecture 041-A:** #k-cuts ≤ (\|V\|+1)^(2h+1)·H (c+k) |
| `card_kcuts_le_defect_of_width_le_k` | width ≤ k ⇒ #k-cuts ≤ (\|V\|+1)·R h (2k)·H (2k) |
| `card_kcuts_le_semicomplete_recovered` | **h = 0 specialization:** exactly Mission 040's `card_kcuts_le` |
| `example`s | R 0 3 = 1, R 1 0 = 2, R 1 2 = 4, R 2 1 = 9 by `decide`, matching `defect_lib.R` |

## What is *not* formalized

- **R_h(K) ≤ C(K+2h, h)** and the asymptotic forms 2^{O(√K + h log(K+h))}. These rely on Mission 040's analytic
  bound for H, which is also unformalized there.
- **Theorem L.** The lower-bound construction is checked exhaustively in Python, not in Lean.
- **Theorem D** (degenerate defect), **Theorem F** (bounded-α obstruction), and the abstract principle with linear
  defect.
- **The algorithms**, including the enumeration delay, the flow subroutine and the running times.
- **The modeling step.** "Directed cutwidth on n vertices" is modeled by the linear order on `V` as the reference
  ordering, as in Mission 040.

## How to reproduce

```
cd research/westfall-041/lean
lake build Westfall041            # needs Mathlib v4.32.0 (git) — the cache host was blocked here, so modules built from source
lake env lean Audit041.lean       # prints the axiom list
```
