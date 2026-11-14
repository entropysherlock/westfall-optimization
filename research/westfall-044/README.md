# WESTFALL Mission 044 — sharp defect-sensitive cut counting (Lean certification attempt)

## Target

Complete and kernel-check the profile-count theorem, for all natural h,K:

```
R h K <= Nat.choose (2*h) h * H K <= 4^h * H K
```

then combine it with Mission 041's Lean theorem:

```
N_k(D) <= (n+1) * R h (c+k) * H (c+k)
```

to obtain:

```
N_k(D) <= (n+1) * 4^h * (H (c+k))^2.
```

The conditional algorithmic bounds would be CW 2^{O(sqrt(k)+h)} poly(n), OLA 2^{O(k^(1/3)+h)} poly(n). The H asymptotic estimate and full algorithms remain paper-only, regardless of success of this Lean theorem.

## Proof plan

- `Westfall044.lean`: encode Rset into Hset times BoxSet by splitting rows at h; prove injectivity and cardinality reduction `R_le_H_mul_B`.
- `Westfall044Sharp.lean`: encode antitone box profiles as size-h multisets over Fin(h+1). Since sorted lists with the same multiset are equal, the encoding is injective. Apply Mathlib's `Sym.card_sym_eq_choose` (stars and bars) to prove `B_le_choose`; deduce `R_le_choose_mul_H`, `R_le_four_pow_mul_H` and `card_kcuts_le_defect_sharp`.
- `Audit044.lean` and `Audit044Sharp.lean`: print axioms.
- CI: `.github/workflows/research-042.yml` builds these targets under pinned Lean 4.32.0 and Mathlib v4.32.0.

## Integrity

Compilation and axiom checks are authoritative only when the GitHub Actions run for the exact commit is successful. No `sorry`, `admit`, or custom axioms are intentional. Do not merge into main or claim a verified sharp theorem before a successful build.

Novelty and peer-review status: open; the combinatorial proof alone does not establish Level 4.
