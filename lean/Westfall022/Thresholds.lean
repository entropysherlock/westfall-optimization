import Westfall022.Defs

/-!
# The threshold minimum defining `K₀` (Stage A audit)

The manuscript defines `K₀(𝓑) = min_{τ ∈ (0,∞]} (N⁻ + Z(τ) + ⌊X/τ⌋)`, with `Z(∞) = #{c ≥ 0}`
and `⌊X/∞⌋ := 0`. `K0` in `Defs.lean` takes the minimum only over `τ = ∞` and the positive
cross margins. `K0_spec` proves the two agree: `K0` is attained by an admissible threshold
and is a lower bound for the value at **every** threshold `τ ∈ (0, ∞]`.
-/

namespace Westfall022

open Finset

variable {n : ℕ} (A : WMat n) (B : OrdPart n)

theorem Xneg_nonneg : 0 ≤ Xneg A B := by
  unfold Xneg
  apply Finset.sum_nonneg
  intro p hp
  have := (Finset.mem_filter.mp hp).2
  linarith

theorem K0_le_valInf : K0 A B ≤ valInf A B := by
  unfold K0
  rw [Finset.fold_min_le]
  exact Or.inl le_rfl

theorem K0_le_valFin_of_mem {τ : ℚ} (hτ : τ ∈ thresholds A B) : K0 A B ≤ valFin A B τ := by
  unfold K0
  rw [Finset.fold_min_le]
  exact Or.inr ⟨τ, hτ, le_rfl⟩

theorem pos_of_mem_thresholds {τ : ℚ} (hτ : τ ∈ thresholds A B) : 0 < τ := by
  unfold thresholds at hτ
  obtain ⟨p, hp, rfl⟩ := Finset.mem_image.mp hτ
  exact (Finset.mem_filter.mp hp).2

/-- `K₀` is attained: it equals the value at `∞` or at some positive cross margin. -/
theorem K0_attained : K0 A B = valInf A B ∨ ∃ τ ∈ thresholds A B, K0 A B = valFin A B τ := by
  have h := (Finset.fold_min_le (s := thresholds A B) (b := valInf A B) (f := valFin A B)
    (c := K0 A B)).mp le_rfl
  rcases h with h | ⟨τ, hτ, h⟩
  · exact Or.inl (le_antisymm (K0_le_valInf A B) h)
  · exact Or.inr ⟨τ, hτ, le_antisymm (K0_le_valFin_of_mem A B hτ) h⟩

/-- `K₀` is a lower bound for the value at every finite threshold `τ > 0`. -/
theorem K0_le_valFin {τ : ℚ} (hτ : 0 < τ) : K0 A B ≤ valFin A B τ := by
  classical
  set T := (thresholds A B).filter (fun c => τ ≤ c) with hT
  by_cases hne : T.Nonempty
  · -- the least admissible threshold `c₀ ≥ τ` does at least as well as `τ`
    set c₀ := T.min' hne with hc₀
    have hc₀T : c₀ ∈ T := Finset.min'_mem T hne
    have hc₀thr : c₀ ∈ thresholds A B := (Finset.mem_filter.mp hc₀T).1
    have hτc₀ : τ ≤ c₀ := (Finset.mem_filter.mp hc₀T).2
    refine (K0_le_valFin_of_mem A B hc₀thr).trans ?_
    unfold valFin
    have hZ : Zthr A B c₀ ≤ Zthr A B τ := by
      unfold Zthr
      apply Finset.card_le_card
      intro p hp
      simp only [Finset.mem_filter] at hp ⊢
      refine ⟨hp.1, hp.2.1, ?_⟩
      by_contra hge
      push Not at hge
      -- `A p.1 p.2 ∈ [τ, c₀)` would be an admissible threshold below `c₀`
      have hpos : 0 < A p.1 p.2 := lt_of_lt_of_le hτ hge
      have hmemT : A p.1 p.2 ∈ T := by
        rw [hT, Finset.mem_filter]
        refine ⟨?_, hge⟩
        unfold thresholds
        exact Finset.mem_image.mpr ⟨p, Finset.mem_filter.mpr ⟨hp.1, hpos⟩, rfl⟩
      have := Finset.min'_le T _ hmemT
      linarith [hp.2.2]
    have hF : ⌊Xneg A B / c₀⌋₊ ≤ ⌊Xneg A B / τ⌋₊ := by
      apply Nat.floor_le_floor
      exact div_le_div_of_nonneg_left (Xneg_nonneg A B) hτ hτc₀
    omega
  · -- no positive margin reaches `τ`: then `Z(τ) = #{c ≥ 0}` and the value is ≥ `valInf`
    refine (K0_le_valInf A B).trans ?_
    unfold valInf valFin
    have hZ : ((crossPairs B).filter (fun p => 0 ≤ A p.1 p.2)).card ≤ Zthr A B τ := by
      unfold Zthr
      apply Finset.card_le_card
      intro p hp
      simp only [Finset.mem_filter] at hp ⊢
      refine ⟨hp.1, hp.2, ?_⟩
      rcases hp.2.lt_or_eq with hpos | hzero
      · by_contra hge
        push Not at hge
        apply hne
        refine ⟨A p.1 p.2, Finset.mem_filter.mpr ⟨?_, hge⟩⟩
        unfold thresholds
        exact Finset.mem_image.mpr ⟨p, Finset.mem_filter.mpr ⟨hp.1, hpos⟩, rfl⟩
      · rw [← hzero]; exact hτ
    omega

/-- **Finite-threshold equivalence.** `K0` is exactly the minimum over all thresholds
`τ ∈ (0, ∞]` of `N⁻ + Z(τ) + ⌊X/τ⌋` (with the `τ = ∞` conventions): it is attained, and it
is below the value at `∞` and at every finite `τ > 0`. -/
theorem K0_spec :
    (K0 A B = valInf A B ∨ ∃ τ : ℚ, 0 < τ ∧ K0 A B = valFin A B τ) ∧
    K0 A B ≤ valInf A B ∧ ∀ τ : ℚ, 0 < τ → K0 A B ≤ valFin A B τ := by
  refine ⟨?_, K0_le_valInf A B, fun τ hτ => K0_le_valFin A B hτ⟩
  rcases K0_attained A B with h | ⟨τ, hτ, h⟩
  · exact Or.inl h
  · exact Or.inr ⟨τ, pos_of_mem_thresholds A B hτ, h⟩

/-- `N⁻ + z ≤ K₀`: every candidate value counts all negative and all zero cross pairs. -/
theorem Nneg_add_zero_le_K0 : Nneg A B + zeroCount A B ≤ K0 A B := by
  rcases K0_attained A B with h | ⟨τ, hτ, h⟩
  · rw [h]; unfold valInf zeroCount
    have : ((crossPairs B).filter (fun p => A p.1 p.2 = 0)).card ≤
        ((crossPairs B).filter (fun p => 0 ≤ A p.1 p.2)).card := by
      apply Finset.card_le_card
      intro p hp
      simp only [Finset.mem_filter] at hp ⊢
      exact ⟨hp.1, hp.2.ge⟩
    omega
  · rw [h]; unfold valFin zeroCount
    have hτpos := pos_of_mem_thresholds A B hτ
    have : ((crossPairs B).filter (fun p => A p.1 p.2 = 0)).card ≤ Zthr A B τ := by
      unfold Zthr
      apply Finset.card_le_card
      intro p hp
      simp only [Finset.mem_filter] at hp ⊢
      exact ⟨hp.1, hp.2.ge, hp.2 ▸ hτpos⟩
    omega

end Westfall022
