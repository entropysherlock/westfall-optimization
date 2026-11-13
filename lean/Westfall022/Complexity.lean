import Westfall022.CostBounds

/-!
# Discovery 022, Theorem 4: the running time of AutoCut

## Mission 025: `autoCut_complexity` (proved)

The theorem concerns the executable algorithm `autoCutC` (`CostedAutoCut.lean`), which is by
definition the value of the costed program `autoCutCosted`. The cost model is the one in
`CostModel.lean`:
- one step per element visited by every collection operation;
- quadratic deduplication and linear-scan table lookups;
- explicit polynomial charges for single-subset leaves;
- unit-cost arithmetic.

`autoCutC_eq_X` shows that the costed program computes exactly the Mission 023 executable
`autoCutX`. The cost is bounded over **all** doubling rounds:
- rounds aborted by the closed-form test;
- rounds that pass the test and reject;
- the accepting round;
- the final ordering DP.

Two forms are proved:

* `cost ≤ 1000·(n+1)⁹·(U(n, K) + 1)³` with `K = max 1 (2λ(A))`, where
  `U(n,k) = (n+1)(3k+1)·2^{5(⌊√(3k)⌋+1)}` is the closed-form abort bound and
  `U(n,k) ≥ (n+1)·P(3k)`;
* `cost ≤ 1 728 000·(n+1)¹⁸·2^{45(⌊√λ(A)⌋+1)}`, i.e. `poly(n)·2^{O(√λ(A))}` with explicit
  constants. The case `λ(A) = 0` is covered (the exponent is then `45`).

**Not proved:** the manuscript's sharper `poly(n)·P(6λ)²`. In this implementation the
shortest-path stage scans tables linearly, which costs the cube of the state bound. Aborted
rounds are also charged through `U(n,k)`, not `P(3k)`. Bit complexity is not modelled. See
`MISSION_025_REPORT.md`.

## Mission 023 (kept): state and round bounds for the executable algorithm

`autoCutX_state_bounds`: in the accepting round, `|𝒞_k|, |𝒩| ≤ (n+1)·P(3k)` and
`k ≤ max 1 (2λ(A))`; at most `2n+1` rounds are tried.
-/

namespace Westfall022

open Finset Cost

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

/-! ## Mission 025: the running-time theorem -/

theorem abortBound_mono (n : ℕ) {k k' : ℕ} (h : k ≤ k') : abortBound n k ≤ abortBound n k' := by
  unfold abortBound
  apply Nat.mul_le_mul_left
  apply Nat.mul_le_mul (by omega)
  apply Nat.pow_le_pow_right (by norm_num)
  have := Nat.sqrt_le_sqrt (show 3 * k ≤ 3 * k' by omega)
  omega

theorem reachable_le_of_recognizeM (A : WMat n) (k : ℕ) (h : (recognizeM A k).isSome) :
    (reachable A k).card ≤ abortBound n k := by
  unfold recognizeM at h
  by_cases hg : (capLayers A k (abortBound n k) n).isNone = true
  · rw [if_pos hg] at h; exact absurd h (by simp)
  · have : capLayers A k (abortBound n k) n ≠ none := by
      intro h'; rw [h'] at hg; exact hg rfl
    rw [Ne, capLayers_none_iff] at this; omega

/-- Cost of the doubling loop: each attempted round `t` (aborted, rejected or accepted) is paid
for, up to the first accepted round `j`. -/
theorem firstAcceptC_cost_le (A : WMat n) (R : ℕ) :
    ∀ fuel i j, firstAcceptM A fuel i = some j →
      (∀ t, i ≤ t → t ≤ j → (t + 1) + (recognizeC A (2 ^ t)).cost + 1 ≤ R) →
      (firstAcceptC A fuel i).cost ≤ (j + 1 - i) * R := by
  intro fuel
  induction fuel with
  | zero => intro i j h; simp [firstAcceptM] at h
  | succ fuel ih =>
    intro i j hj hR
    have hij : i ≤ j := by
      rw [firstAcceptM_eq] at hj; exact (firstAccept_spec A _ _ _ hj).1
    have hi := hR i le_rfl hij
    simp only [firstAcceptC, bind_cost, charge_cost, charge_val]
    rw [recognizeC_val]
    rcases hr : recognizeM A (2 ^ i) with _ | B
    · simp only
      have hj' : firstAcceptM A fuel (i + 1) = some j := by
        simp only [firstAcceptM, hr, Option.isSome_none, Bool.false_eq_true, if_false] at hj
        exact hj
      have hij' : i + 1 ≤ j := by
        rw [firstAcceptM_eq] at hj'; exact (firstAccept_spec A _ _ _ hj').1
      have := ih (i + 1) j hj' (fun t h1 h2 => hR t (by omega) h2)
      have e : j + 1 - i = (j + 1 - (i + 1)) + 1 := by omega
      rw [e, Nat.add_mul, one_mul]
      omega
    · simp only [charge_cost]
      have : j = i := by
        simp only [firstAcceptM, hr, Option.isSome_some, if_true, Option.some.injEq] at hj
        exact hj.symm
      subst this
      simp only [Nat.add_sub_cancel_left, one_mul]
      omega

theorem two_pow_le_K (A : WMat n) (hA : IsSkew A) (j : ℕ)
    (hj : firstAcceptM A (2 * n + 1) 0 = some j) :
    2 ^ j ≤ max 1 (2 * lam A) ∧ j ≤ 2 * n ∧ (recognizeM A (2 ^ j)).isSome := by
  obtain ⟨r, hr, -, -, -, -, hk, -⟩ := autoCutX_correct A hA
  have hj' := hj
  rw [firstAcceptM_eq] at hj'
  obtain ⟨-, hacc, -⟩ := firstAccept_spec A _ _ _ hj'
  have hacc' : (recognizeM A (2 ^ j)).isSome := by rw [recognizeM_eq]; exact hacc
  obtain ⟨B, hB⟩ := Option.isSome_iff_exists.mp hacc
  have hrk : r.2.2.2 = 2 ^ j := by
    unfold autoCutX at hr
    simp only [hj', hB, Option.some.injEq] at hr
    rw [← hr]
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
    have := hlt _ _ _ hj'; omega
  refine ⟨?_, hjle, hacc'⟩
  rw [← hrk]
  rcases hk with h | h <;> omega

theorem max_le_sq (A : WMat n) : max 1 (2 * lam A) + 1 ≤ 2 * (n + 1) ^ 2 := by
  have := lam_le_sq A
  have : 1 ≤ (n + 1) ^ 2 := Nat.one_le_pow _ _ (Nat.succ_pos n)
  have : (n + 1) ^ 2 = n ^ 2 + 2 * n + 1 := by ring
  omega

/-- **Running time in terms of the closed-form state bound.** -/
theorem autoCutCosted_cost_le (A : WMat n) (hA : IsSkew A) :
    (autoCutCosted A).cost ≤ 1000 * (n + 1) ^ 9 * (abortBound n (max 1 (2 * lam A)) + 1) ^ 3 := by
  set K := max 1 (2 * lam A) with hKdef
  set V := abortBound n K + 1 with hVdef
  have hV : 1 ≤ V := by omega
  have hKsq : K + 1 ≤ 2 * (n + 1) ^ 2 := max_le_sq A
  -- the accepted round
  have hsome : (firstAcceptM A (2 * n + 1) 0).isSome := by
    have hX := autoCutX_correct A hA
    obtain ⟨r, hr, -⟩ := hX
    unfold autoCutX at hr
    rw [← firstAcceptM_eq] at hr
    rcases h : firstAcceptM A (2 * n + 1) 0 with _ | j
    · rw [h] at hr; exact absurd hr (by simp)
    · rfl
  obtain ⟨j, hj⟩ := Option.isSome_iff_exists.mp hsome
  obtain ⟨hjK, hjn, hacc⟩ := two_pow_le_K A hA j hj
  obtain ⟨B, hB⟩ := Option.isSome_iff_exists.mp hacc
  -- every attempted round costs at most `R`
  have hN := Nat.succ_pos n
  set R := 2 * (n + 1) + 400 * (n + 1) ^ 8 * V ^ 3 + 1 with hRdef
  have hround : ∀ t, 0 ≤ t → t ≤ j → (t + 1) + (recognizeC A (2 ^ t)).cost + 1 ≤ R := by
    intro t _ ht
    have hk : 2 ^ t ≤ K := (Nat.pow_le_pow_right (by norm_num) ht).trans hjK
    have hU : abortBound n (2 ^ t) + 1 ≤ V := by
      have := abortBound_mono n hk; omega
    have := recognizeC_cost_le A (2 ^ t) V hV hU (by omega)
    omega
  have hfa := firstAcceptC_cost_le A R _ 0 j hj hround
  -- the final ordering DP
  have hRj : (reachable A (2 ^ j)).card ≤ V := by
    have h1 := reachable_le_of_recognizeM A (2 ^ j) hacc
    have h2 : abortBound n (2 ^ j) ≤ abortBound n K := abortBound_mono n hjK
    omega
  have hdp := dpTabC_cost_le A (2 ^ j) V hV hRj n le_rfl
  have hdpc := dpTabC_card_le A (2 ^ j) V hV hRj n
  have hlk := cLookupBot_cost_le (dpTabC A (2 ^ j) n).val univ
  have hord := dpOrderC_cost_le A (2 ^ j) V hV hRj n univ (by simp)
  simp only [autoCutCosted, bind_cost]
  rw [firstAcceptC_val, hj, Option.bind_some, hB, Option.map_some]
  simp only [bind_cost, charge_cost, charge_val]
  simp only [setEq] at hlk
  have a1 := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) (Nat.mul_le_mul_left 2 hdpc)
  have d1 := mono_le (N := n + 1) (V := V) (a := 8) (b := 3) (A := 9) (B := 3) hN hV
    (by norm_num) le_rfl
  have d2 := mono_le (N := n + 1) (V := V) (a := 1) (b := 0) (A := 9) (B := 3) hN hV
    (by norm_num) (by norm_num)
  have d3 := mono_le (N := n + 1) (V := V) (a := 6) (b := 2) (A := 9) (B := 3) hN hV
    (by norm_num) (by norm_num)
  have d4 := mono_le (N := n + 1) (V := V) (a := 7) (b := 2) (A := 9) (B := 3) hN hV
    (by norm_num) (by norm_num)
  have d5 := mono_le (N := n + 1) (V := V) (a := 2) (b := 1) (A := 9) (B := 3) hN hV
    (by norm_num) (by norm_num)
  have d6 := mono_le (N := n + 1) (V := V) (a := 0) (b := 0) (A := 9) (B := 3) hN hV
    (by norm_num) (by norm_num)
  simp only [pow_zero, pow_one, mul_one, one_mul] at d2 d5 d6
  have e1 : (j + 1 - 0) * R ≤ (2 * (n + 1)) * R := Nat.mul_le_mul_right _ (by omega)
  have e2 : (2 * (n + 1)) * R = 4 * (n + 1) ^ 2 + 800 * ((n + 1) ^ 9 * V ^ 3) + 2 * (n + 1) := by
    rw [hRdef]; ring
  have e3 : (n + 1) * (20 * (n + 1) ^ 5 * V ^ 2) = 20 * ((n + 1) ^ 6 * V ^ 2) := by ring
  have e4 : (n + 1) * (40 * (n + 1) ^ 6 * V ^ 2) = 40 * ((n + 1) ^ 7 * V ^ 2) := by ring
  have d7 : (n + 1) ^ 2 ≤ (n + 1) ^ 9 * V ^ 3 := by
    have := mono_le (N := n + 1) (V := V) (a := 2) (b := 0) (A := 9) (B := 3) hN hV
      (by norm_num) (by norm_num)
    simpa using this
  have hj1 : j + 1 ≤ 2 * (n + 1) := by omega
  have ev : 2 * V * ((n + 1) ^ 2 + 1) ≤ 4 * ((n + 1) ^ 2 * V) := by
    have : 1 ≤ (n + 1) ^ 2 := Nat.one_le_pow _ _ hN
    nlinarith
  rw [← hVdef] at *
  nlinarith

/-- Closed-form estimate of the abort bound at the final scale. -/
theorem abortBound_K_le (A : WMat n) :
    abortBound n (max 1 (2 * lam A)) + 1 ≤ 12 * (n + 1) ^ 3 * 2 ^ (15 * (Nat.sqrt (lam A) + 1)) := by
  have hKsq : max 1 (2 * lam A) + 1 ≤ 2 * (n + 1) ^ 2 := max_le_sq A
  have hlt : lam A < (Nat.sqrt (lam A) + 1) ^ 2 := Nat.lt_succ_sqrt' (lam A)
  have h3K : 3 * max 1 (2 * lam A) < (3 * Nat.sqrt (lam A) + 3) ^ 2 := by
    have e : (3 * Nat.sqrt (lam A) + 3) ^ 2 = 9 * (Nat.sqrt (lam A) + 1) ^ 2 := by ring
    rw [e]
    have : 1 ≤ (Nat.sqrt (lam A) + 1) ^ 2 := Nat.one_le_pow _ _ (Nat.succ_pos _)
    rcases le_total 1 (2 * lam A) with h | h
    · rw [max_eq_right h]; omega
    · rw [max_eq_left h]; omega
  generalize max 1 (2 * lam A) = K at hKsq h3K ⊢
  generalize Nat.sqrt (lam A) = s at h3K ⊢
  have hsq : Nat.sqrt (3 * K) ≤ 3 * s + 2 := by
    have := Nat.sqrt_lt'.mpr h3K; omega
  have hexp : 2 ^ (5 * (Nat.sqrt (3 * K) + 1)) ≤ 2 ^ (15 * (s + 1)) :=
    Nat.pow_le_pow_right (by norm_num) (by omega)
  have h3 : 3 * K + 1 ≤ 6 * (n + 1) ^ 2 := by omega
  unfold abortBound
  have m : (n + 1) * ((3 * K + 1) * 2 ^ (5 * (Nat.sqrt (3 * K) + 1))) ≤
      (n + 1) * (6 * (n + 1) ^ 2 * 2 ^ (15 * (s + 1))) :=
    Nat.mul_le_mul_left _ (Nat.mul_le_mul h3 hexp)
  have m2 : 0 < (n + 1) * (6 * (n + 1) ^ 2 * 2 ^ (15 * (s + 1))) :=
    Nat.mul_pos (Nat.succ_pos n) (Nat.mul_pos (Nat.mul_pos (by norm_num) (pow_pos (Nat.succ_pos n) 2))
      (pow_pos (by norm_num) _))
  have e : (n + 1) * (6 * (n + 1) ^ 2 * 2 ^ (15 * (s + 1))) =
      6 * (n + 1) ^ 3 * 2 ^ (15 * (s + 1)) := by ring
  rw [e] at m m2
  linarith

/-- **Discovery 022, Theorem 4 (Mission 025).** The executable AutoCut `autoCutC`
(= `autoCutX`) runs in `poly(n)·2^{O(√λ(A))}` steps of the cost model of `CostModel.lean`,
with explicit constants. The bound covers every attempted doubling round. -/
theorem autoCut_complexity (A : WMat n) (hA : IsSkew A) :
    autoCutC A = autoCutX A ∧
    (autoCutCosted A).val = autoCutC A ∧
    (autoCutCosted A).cost ≤ 1000 * (n + 1) ^ 9 * (abortBound n (max 1 (2 * lam A)) + 1) ^ 3 ∧
    (autoCutCosted A).cost ≤ 1728000 * (n + 1) ^ 18 * 2 ^ (45 * (Nat.sqrt (lam A) + 1)) := by
  refine ⟨autoCutC_eq_X A, rfl, autoCutCosted_cost_le A hA, ?_⟩
  have h1 := autoCutCosted_cost_le A hA
  have h2 := abortBound_K_le A
  have h3 := Nat.pow_le_pow_left h2 3
  have e : (12 * (n + 1) ^ 3 * 2 ^ (15 * (Nat.sqrt (lam A) + 1))) ^ 3 =
      1728 * (n + 1) ^ 9 * 2 ^ (45 * (Nat.sqrt (lam A) + 1)) := by
    rw [mul_pow, mul_pow, ← pow_mul, ← pow_mul]; ring_nf
  rw [e] at h3
  calc (autoCutCosted A).cost
      ≤ 1000 * (n + 1) ^ 9 * (abortBound n (max 1 (2 * lam A)) + 1) ^ 3 := h1
    _ ≤ 1000 * (n + 1) ^ 9 * (1728 * (n + 1) ^ 9 * 2 ^ (45 * (Nat.sqrt (lam A) + 1))) :=
        Nat.mul_le_mul_left _ h3
    _ = 1728000 * (n + 1) ^ 18 * 2 ^ (45 * (Nat.sqrt (lam A) + 1)) := by ring

end Westfall022
