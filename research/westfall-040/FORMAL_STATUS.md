# E. Formal verification report (Lean 4)

**Kernel-checked:** Theorem 1 (the k-cut counting bound) and its corollary for width ≤ k, with all supporting lemmas.
**Not formalized:** Theorem 2 (H(K) ≤ e^{2π√K}), the algorithms (Theorems 3–4), and the literature comparison.
Nothing about executable solver code is claimed: this is a proof of the mathematical statement only.

## Environment

* Lean `leanprover/lean4:v4.32.0` (commit 8c9756b28d64), Linux x86_64. Installed from the official GitHub release
  tarball (the session's network blocked elan's own downloader; the binary is the same release).
* Mathlib `v4.32.0` (git revision pinned in `lean/lake-manifest.json`). The prebuilt Mathlib cache host was not reachable,
  so the required Mathlib modules (763 build jobs including Batteries) were **compiled from source** in this session.
* Project: `research/westfall-040/lean/` (`lakefile.toml`, `lean-toolchain`, `Westfall040/CutCount.lean`).
* `CutCount.lean` SHA-256 `b08304dde02bd15de653390b1bc6a675be0d91954b75cdd3318188dfaba1d212`.

Reproduce: `cd research/westfall-040/lean && lake update && lake build Westfall040 && lake env lean Audit.lean`
(with a working Mathlib cache, `lake exe cache get` replaces most of the build).

## Declaration-level status

| Declaration | Statement | Status |
|---|---|---|
| `backSet`, `back`, `Semicomplete`, `WidthLe` | definitions (arcs from complement into X; ≥ 1 arc per pair; width ≤ c over all lower sets of the reference order) | defined |
| `rectangle` | |P∖X|·|X∖P| ≤ back(P) + back(X) for semicomplete D, any P, X | **kernel-checked** |
| `zerosBefore`, `mu`, `zerosBefore_mono`, `mu_antitone` | conjugate encoding and monotonicity | **kernel-checked** |
| `hyperbola` | width ≤ c, back(X) ≤ k ⇒ s·μ_s(X) ≤ c + k for all s | **kernel-checked** |
| `card_split`, `mu_gap`, `eq_of_mu_eq` | injectivity of X ↦ (|X|, μ_1..μ_K) on hyperbola sets | **kernel-checked** |
| `Hset`, `H` | antitone f : Fin K → Fin (K+1) with (s+1)·f(s) ≤ K | defined; H 0..3 = 1, 2, 5, 10 by `decide`; equal to the paper's H for K ≤ 15 (Python cross-check `H_formal`) |
| `card_kcuts_le` | Semicomplete D → WidthLe D c → #{X : back D X ≤ k} ≤ (|V|+1)·H(c+k) | **kernel-checked** |
| `card_kcuts_le_of_width_le_k` | WidthLe D k → #k-cuts ≤ (|V|+1)·H(2k) | **kernel-checked** |

## Axiom audit (`lean/AXIOM_AUDIT.txt`)

Every main declaration depends only on `[propext, Classical.choice, Quot.sound]` — Lean's standard axioms.
No `sorry`, no `admit`, no custom `axiom`, no `native_decide` (grep count 0). The build log is in `lean/BUILD_LOG.txt`.

## Fidelity of the formal statement

* Vertices: any finite type with a linear order; the order *is* the reference ordering. An ordering of an arbitrary
  vertex set is obtained by transporting the order, so every reference ordering is covered.
* `WidthLe D c` quantifies over all lower sets; in a finite linear order these are exactly the n + 1 prefixes.
* Digraph: an arbitrary decidable relation; loops are irrelevant (no pair (v, v) is ever counted, since X and its
  complement are disjoint); antiparallel arcs are allowed.
* `H` counts hyperbola partitions via their column sequences, which is the same set as the paper's definition
  (conjugation preserves the hyperbola condition; columns beyond K are empty).
* The formal theorem is about the number of subsets X, i.e. ordered bipartitions (X, V∖X), as in the paper.

## Not checked by Lean

Theorem 2 (analytic), Lemma 4 and Theorems 3–4 (algorithms and running times), the ETH lower-bound citations, and all
novelty statements. These rest on the human-readable proofs in `MANUSCRIPT.md` and on numerical evidence.
