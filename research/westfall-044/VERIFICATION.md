# WESTFALL Mission 044 — kernel verification record

**Status: SUCCESS — central sharp counting theorem machine verified.**

## Exact verification evidence

GitHub Actions workflow: https://github.com/entropysherlock/westfall-optimization/actions/runs/43533991215

Verified source commit: `043dcfc129c06046911fa7eb7ef4628cb34cace2`

Compiler: Lean 4.32.0. Mathlib pinned to v4.32.0.

Build command from GitHub Actions:
```sh
cd research/westfall-041/lean
lake update
lake exe cache get
lake build Westfall042 Westfall043 Westfall044 Westfall044Sharp
lake env lean Audit044.lean
lake env lean Audit044Sharp.lean
```

The `lean-scaffold` and `exact-profiles` jobs both **completed successfully**.

## Kernel-checked declarations and printed axiom sets

- `Westfall044.B_le_choose`
- `Westfall044.choose_le_four_pow`
- `Westfall044.R_le_choose_mul_H`
- `Westfall044.R_le_four_pow_mul_H`
- `Westfall044.card_kcuts_le_defect_sharp`

For each declaration, `#print axioms` reported exactly the ordinary foundation axioms:
`[propext, Classical.choice, Quot.sound]`.

No `sorryAx`, `admit`, or custom axioms appeared in this audit.

## Mathematical statements

```
R h K <= (2*h).choose h * H K
R h K <= 4^h * H K

For h-semicomplete D with a reference ordering of width <=c:
card {X : Finset V | back D X <= k} <=
  (Fintype.card V + 1) * 4^h * (H (c+k))^2.
```

The proof reduces R profiles to hyperbola partitions and bounded box partitions. It applies Mathlib's stars-and-bars theorem for size-h multisets over h+1 symbols, and then the binomial bound.

## Scope / unverified material

The asymptotic estimate `H(K) <= exp(2*pi*sqrt(K))` and the full algorithms for cutwidth and OLA remain **paper-only**. Their claimed complexities `2^{O(sqrt(k)+h)} n^{O(1)}` and `2^{O(k^(1/3)+h)} n^{O(1)}` are mathematical consequences conditional on these unformalized analytic and algorithmic steps.

This formal result does **not** establish originality against all prior literature, acceptance by experts, or Level 4.

The current pull request is draft and stacked on Mission 043. No changes are merged into `main` or deployed.
