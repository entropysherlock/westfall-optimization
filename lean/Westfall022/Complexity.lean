import Westfall022.Exec

/-!
# Mission 023, Phase 3: complexity — what is proved and what is not

## Not proved: `autoCut_complexity`

The manuscript's Theorem 4 claims running time `poly(n)·P(6λ)² ≤ poly(n)·2^{O(√λ(A))}`.
`autoCut_complexity` is **deliberately absent**. Three independent obstacles remain, and the
first one shows that the claim cannot currently be proved about any implementation in this
project:

1. **The executable implementation does not have the claimed running time.** `autoCutX`
   (Exec.lean) evaluates the shortest-path recursion `dist` and the cut DP `cutDP` as plain
   recursions without memoisation. Each call recomputes its sub-calls, so evaluation cost grows
   with the number of *chains* in the node DAG (up to the ordered Bell number of `n`), not with
   the number of *nodes* `|𝒩| ≤ (n+1)·P(3k)`. The manuscript's bound presupposes a
   memoised, layer-by-layer DP whose table has one entry per node. A complexity theorem of the
   manuscript's form would be FALSE for `autoCutX` as written. Measured: 4 minutes in the Lean
   interpreter for `n = 4` (see `tests/`).
2. **No operational cost semantics.** A faithful statement needs the memoised program written in
   an instrumented model (for example, a tick-counting monad with a fixed set of primitive
   operations), together with refinement to the verified specification. It must separately
   bound arithmetic operations over ℚ and bit complexity (shortest-path sums are sums of up to
   `n²` rationals `1 + |a|/τ`, whose denominators are products of entries of `A`).
3. **The partition-number estimate** `p(M) ≤ e^{π√(2M/3)}` (hence `P(M) ≤ (M+1)·e^{π√(2M/3)}`) is
   not in Mathlib and is not proved here.

## Proved here: state and round bounds for the executable algorithm

`autoCutX_state_bounds` transfers the combinatorial facts the running-time claim rests on to the
executable algorithm. In the accepting round, `|𝒞_k|` and `|𝒩|` are at most `(n+1)·P(3k)`,
`k ≤ max 1 (2λ(A))`, and hence `|𝒞_k| ≤ (n+1)·P(6λ(A))` when `λ(A) ≥ 1`. At most `2n+1`
rounds are tried. These are state-enumeration bounds, **not** a running-time theorem.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-- State-count and round bounds for the executable AutoCut (not a running-time theorem). -/
theorem autoCutX_state_bounds (A : WMat n) (hA : IsSkew A) :
    ∃ r, autoCutX A = some r ∧
      (reachable A r.2.2.2).card ≤ (n + 1) * Pcum (3 * r.2.2.2) ∧
      (nodes A r.2.2.2).card ≤ (n + 1) * Pcum (3 * r.2.2.2) ∧
      r.2.2.2 ≤ max 1 (2 * lam A) ∧
      (1 ≤ lam A → (reachable A r.2.2.2).card ≤ (n + 1) * Pcum (6 * lam A)) ∧
      r.2.2.2 ≤ 2 ^ (2 * n) := by
  obtain ⟨r, hr, -, -, -, -, -, hk, -⟩ := autoCutX_correct A hA
  have hs := autoCut_state_bounds A hA
  simp only at hs
  rw [← hk] at hs
  obtain ⟨h1, h2, h3, h4⟩ := hs
  refine ⟨r, hr, h1, h2, h3, h4, ?_⟩
  -- the accepted round is one of `0, …, 2n`
  unfold autoCutX at hr
  rcases hj : firstAccept A (2 * n + 1) 0 with _ | j
  · rw [hj] at hr; exact absurd hr (by simp)
  · rw [hj] at hr
    simp only at hr
    rcases hB : recognizeX A (2 ^ j) with _ | B
    · rw [hB] at hr; exact absurd hr (by simp)
    · rw [hB] at hr
      rw [Option.some.injEq] at hr
      rw [← hr]
      simp only
      have hjle : j ≤ 2 * n := by
        have hlt : ∀ fuel i r, firstAccept A fuel i = some r → r < i + fuel := by
          intro fuel
          induction fuel with
          | zero => intro i r h; simp [firstAccept] at h
          | succ fuel ih =>
            intro i r h
            unfold firstAccept at h
            split_ifs at h
            · rw [Option.some.injEq] at h; omega
            · have := ih (i + 1) r h; omega
        have := hlt _ _ _ hj; omega
      exact Nat.pow_le_pow_right (by norm_num) hjle

end Westfall022
