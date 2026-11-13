import Westfall022.Thresholds

/-!
# Discovery 021, Theorem 1: the gap-free exchange / localization lemma (Stage B)

Manuscript (021, Lemma 0 and Theorem 1): for every ordered partition `𝓑` and every optimal
ordering `π*`,
1. `Σ_{Rev, c>0} c ≤ Σ_{Rev, c<0} |c| ≤ X`,
2. `R_𝓑(π*) = |Rev| ≤ K₀(𝓑)`,
3. every prefix `S` of `π*` has `I_𝓑(S) ≤ R_𝓑(π*) ≤ K₀(𝓑)`.

The proof re-sorts `π*` stably by block (the rank `v ↦ (blk v, pos v)` in lexicographic order),
shows `F(sort) - F(π*) = 2 Σ_{Rev} c` pointwise over ordered pairs, and uses optimality.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-- The score of an arbitrary rank function: `Σ_{u,v : r u < r v} a_uv`. -/
def scoreRank {α : Type*} [LinearOrder α] (A : WMat n) (r : Fin n → α) : ℚ :=
  ∑ u : Fin n, ∑ v : Fin n, if r u < r v then A u v else 0

theorem objective_eq_scoreRank (A : WMat n) (π : Equiv.Perm (Fin n)) :
    objective A π = scoreRank A π.symm := by
  unfold objective scoreRank
  rw [← Equiv.sum_comp π.symm]
  refine Finset.sum_congr rfl (fun u _ => ?_)
  rw [← Equiv.sum_comp π.symm]
  refine Finset.sum_congr rfl (fun v _ => ?_)
  simp

/-- Two rank functions inducing the same strict order have the same score. -/
theorem scoreRank_congr {α β : Type*} [LinearOrder α] [LinearOrder β] (A : WMat n)
    (r : Fin n → α) (r' : Fin n → β) (h : ∀ u v, r u < r v ↔ r' u < r' v) :
    scoreRank A r = scoreRank A r' := by
  unfold scoreRank
  refine Finset.sum_congr rfl (fun u _ => Finset.sum_congr rfl (fun v _ => ?_))
  rw [if_congr (h u v) rfl rfl]

/-- Every injective rank function into a linear order is realised by a permutation. -/
theorem exists_perm_of_injective {α : Type*} [LinearOrder α] (r : Fin n → α)
    (hr : Function.Injective r) :
    ∃ σ : Equiv.Perm (Fin n), ∀ u v, σ.symm u < σ.symm v ↔ r u < r v := by
  classical
  set T : Finset α := Finset.univ.image r with hT
  have hcard : T.card = n := by
    rw [hT, Finset.card_image_of_injective _ hr, Finset.card_univ, Fintype.card_fin]
  set e := T.orderIsoOfFin hcard
  let p : Fin n → Fin n := fun u => e.symm ⟨r u, Finset.mem_image_of_mem r (Finset.mem_univ u)⟩
  have hp : ∀ u v, p u < p v ↔ r u < r v := by
    intro u v
    simp only [p, e.symm.lt_iff_lt]
    exact Subtype.mk_lt_mk
  have hinj : Function.Injective p := by
    intro u v huv
    apply hr
    have h1 : (⟨r u, _⟩ : T) = ⟨r v, _⟩ := e.symm.injective huv
    exact congrArg Subtype.val h1
  have hbij : Function.Bijective p := (Finite.injective_iff_bijective).mp hinj
  refine ⟨(Equiv.ofBijective p hbij).symm, fun u v => ?_⟩
  simp only [Equiv.symm_symm, Equiv.ofBijective_apply]
  exact hp u v

theorem scoreRank_le_OPT {α : Type*} [LinearOrder α] (A : WMat n) (r : Fin n → α)
    (hr : Function.Injective r) : scoreRank A r ≤ OPT A := by
  obtain ⟨σ, hσ⟩ := exists_perm_of_injective r hr
  have : scoreRank A r = objective A σ := by
    rw [objective_eq_scoreRank]
    exact scoreRank_congr A r σ.symm (fun u v => (hσ u v).symm)
  rw [this]
  exact objective_le_OPT A σ

/-- The stable block sort of `π`: rank `v ↦ (blk v, pos_π v)` in lexicographic order. -/
def sortRank (B : OrdPart n) (π : Equiv.Perm (Fin n)) (v : Fin n) : Fin n ×ₗ Fin n :=
  toLex (B v, π.symm v)

theorem sortRank_injective (B : OrdPart n) (π : Equiv.Perm (Fin n)) :
    Function.Injective (sortRank B π) := by
  intro u v h
  have h' := congrArg (fun x => (ofLex x).2) h
  simpa [sortRank] using h'

/-- The indicator-weighted reversed margin, `e(u,v) = [ (u,v) ∈ Rev ] a_uv`. -/
private def revTerm (A : WMat n) (B : OrdPart n) (π : Equiv.Perm (Fin n)) (u v : Fin n) : ℚ :=
  if B u < B v ∧ π.symm v < π.symm u then A u v else 0

/-- Pointwise exchange identity for one ordered pair. -/
private theorem exchange_pointwise (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (π : Equiv.Perm (Fin n)) (u v : Fin n) :
    (if sortRank B π u < sortRank B π v then A u v else 0) -
      (if π.symm u < π.symm v then A u v else 0) =
      revTerm A B π u v + revTerm A B π v u := by
  unfold revTerm sortRank
  have hlex : (toLex (B u, π.symm u) < toLex (B v, π.symm v)) ↔
      (B u < B v ∨ (B u = B v ∧ π.symm u < π.symm v)) := Prod.Lex.toLex_lt_toLex
  rw [if_congr hlex rfl rfl]
  have hskew := hA u v
  rcases lt_trichotomy (B u) (B v) with h1 | h1 | h1 <;>
    rcases lt_trichotomy (π.symm u) (π.symm v) with h2 | h2 | h2
  · simp [h1, h2, h1.not_gt, h2.not_gt, h1.ne]
  · have : u = v := π.symm.injective h2
    subst this; exact absurd h1 (lt_irrefl _)
  · simp [h1, h2, h1.not_gt, h2.not_gt, h1.ne]
  · simp [h1, h2, h2.not_gt]
  · have : u = v := π.symm.injective h2
    subst this; simp
  · simp [h1, h2, h2.not_gt]
  · simp [h1, h2, h1.not_gt, h2.not_gt, hskew, h1.ne']
  · have : u = v := π.symm.injective h2
    subst this; exact absurd h1 (lt_irrefl _)
  · simp [h1, h2, h1.not_gt, h2.not_gt, h1.ne']

/-- **Lemma 0 (021): stable-sort exchange identity.**
`F(sort_𝓑 π) - F(π) = 2 Σ_{(u,v) ∈ Rev} c_uv`. -/
theorem sort_exchange_identity (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (π : Equiv.Perm (Fin n)) :
    scoreRank A (sortRank B π) - objective A π = 2 * ∑ p ∈ Rev B π, A p.1 p.2 := by
  rw [objective_eq_scoreRank]
  unfold scoreRank
  rw [← Finset.sum_sub_distrib]
  simp_rw [← Finset.sum_sub_distrib, exchange_pointwise A hA B π, Finset.sum_add_distrib]
  rw [Finset.sum_comm (f := fun u v => revTerm A B π v u)]
  have hRev : ∑ u : Fin n, ∑ v : Fin n, revTerm A B π u v = ∑ p ∈ Rev B π, A p.1 p.2 := by
    unfold Rev crossPairs revTerm
    rw [Finset.filter_filter, Finset.sum_filter, ← Finset.univ_product_univ, Finset.sum_product]
  rw [hRev]; ring

/-- Weighted balance (021 Theorem 1, part 1): `Σ_{Rev} c ≤ 0` for an optimal ordering. -/
theorem rev_sum_nonpos (A : WMat n) (hA : IsSkew A) (B : OrdPart n) (π : Equiv.Perm (Fin n))
    (hπ : IsOptimal A π) : ∑ p ∈ Rev B π, A p.1 p.2 ≤ 0 := by
  have h1 := sort_exchange_identity A hA B π
  have h2 := scoreRank_le_OPT A (sortRank B π) (sortRank_injective B π)
  rw [hπ] at h1
  linarith

/-- 021 Theorem 1, part 1, in the manuscript's form:
`Σ_{Rev, c>0} c ≤ Σ_{Rev, c<0} |c| ≤ X`. -/
theorem rev_weight_balance (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (π : Equiv.Perm (Fin n)) (hπ : IsOptimal A π) :
    ∑ p ∈ (Rev B π).filter (fun p => 0 < A p.1 p.2), A p.1 p.2 ≤
        ∑ p ∈ (Rev B π).filter (fun p => A p.1 p.2 < 0), -A p.1 p.2 ∧
      ∑ p ∈ (Rev B π).filter (fun p => A p.1 p.2 < 0), -A p.1 p.2 ≤ Xneg A B := by
  constructor
  · have hsplit := Finset.sum_filter_add_sum_filter_not (Rev B π) (fun p => 0 < A p.1 p.2)
      (fun p => A p.1 p.2)
    have hneg : ∑ p ∈ (Rev B π).filter (fun p => ¬ 0 < A p.1 p.2), A p.1 p.2 =
        ∑ p ∈ (Rev B π).filter (fun p => A p.1 p.2 < 0), A p.1 p.2 := by
      rw [Finset.sum_filter, Finset.sum_filter]
      refine Finset.sum_congr rfl (fun p _ => ?_)
      by_cases h0 : A p.1 p.2 < 0
      · simp [h0, h0.not_gt]
      · by_cases hpos : 0 < A p.1 p.2
        · simp [hpos, h0]
        · have : A p.1 p.2 = 0 := by linarith [not_lt.mp h0, not_lt.mp hpos]
          simp [this]
    have hnonpos := rev_sum_nonpos A hA B π hπ
    rw [Finset.sum_neg_distrib]
    linarith
  · unfold Xneg Rev
    apply Finset.sum_le_sum_of_subset_of_nonneg
    · intro p hp
      simp only [Finset.mem_filter] at hp ⊢
      exact ⟨hp.1.1, hp.2⟩
    · intro p hp _
      have := (Finset.mem_filter.mp hp).2
      linarith

/-- `|Rev| ≤ N⁻ + Z(τ) + ⌊X/τ⌋` for every finite threshold `τ > 0`. -/
theorem card_rev_le_valFin (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (π : Equiv.Perm (Fin n)) (hπ : IsOptimal A π) {τ : ℚ} (hτ : 0 < τ) :
    (Rev B π).card ≤ valFin A B τ := by
  classical
  set R := Rev B π
  have hR3 : (R.filter (fun p => τ ≤ A p.1 p.2)).card ≤ ⌊Xneg A B / τ⌋₊ := by
    apply Nat.le_floor
    rw [le_div_iff₀ hτ]
    have hbal := rev_weight_balance A hA B π hπ
    have hsub : ∑ p ∈ R.filter (fun p => τ ≤ A p.1 p.2), A p.1 p.2 ≤
        ∑ p ∈ R.filter (fun p => 0 < A p.1 p.2), A p.1 p.2 := by
      apply Finset.sum_le_sum_of_subset_of_nonneg
      · intro p hp
        simp only [Finset.mem_filter] at hp ⊢
        exact ⟨hp.1, lt_of_lt_of_le hτ hp.2⟩
      · intro p hp _
        exact le_of_lt (Finset.mem_filter.mp hp).2
    have hlow : ((R.filter (fun p => τ ≤ A p.1 p.2)).card : ℚ) * τ ≤
        ∑ p ∈ R.filter (fun p => τ ≤ A p.1 p.2), A p.1 p.2 := by
      rw [show ((R.filter (fun p => τ ≤ A p.1 p.2)).card : ℚ) * τ =
          ∑ p ∈ R.filter (fun p => τ ≤ A p.1 p.2), τ by rw [Finset.sum_const, nsmul_eq_mul]]
      exact Finset.sum_le_sum (fun p hp => (Finset.mem_filter.mp hp).2)
    linarith [hbal.1, hbal.2]
  have hR1 : (R.filter (fun p => A p.1 p.2 < 0)).card ≤ Nneg A B := by
    unfold Nneg
    apply Finset.card_le_card
    intro p hp
    simp only [R, Rev, Finset.mem_filter] at hp ⊢
    exact ⟨hp.1.1, hp.2⟩
  have hR2 : (R.filter (fun p => 0 ≤ A p.1 p.2 ∧ A p.1 p.2 < τ)).card ≤ Zthr A B τ := by
    unfold Zthr
    apply Finset.card_le_card
    intro p hp
    simp only [R, Rev, Finset.mem_filter] at hp ⊢
    exact ⟨hp.1.1, hp.2⟩
  have hsplit : R.card ≤ (R.filter (fun p => A p.1 p.2 < 0)).card +
      (R.filter (fun p => 0 ≤ A p.1 p.2 ∧ A p.1 p.2 < τ)).card +
      (R.filter (fun p => τ ≤ A p.1 p.2)).card := by
    have hcover : R ⊆ R.filter (fun p => A p.1 p.2 < 0) ∪
        R.filter (fun p => 0 ≤ A p.1 p.2 ∧ A p.1 p.2 < τ) ∪
        R.filter (fun p => τ ≤ A p.1 p.2) := by
      intro p hp
      simp only [Finset.mem_union, Finset.mem_filter]
      by_cases h0 : A p.1 p.2 < 0
      · exact Or.inl (Or.inl ⟨hp, h0⟩)
      · by_cases h1 : A p.1 p.2 < τ
        · exact Or.inl (Or.inr ⟨hp, not_lt.mp h0, h1⟩)
        · exact Or.inr ⟨hp, not_lt.mp h1⟩
    calc R.card ≤ _ := Finset.card_le_card hcover
      _ ≤ _ := Finset.card_union_le _ _
      _ ≤ _ := by gcongr; exact Finset.card_union_le _ _
  unfold valFin
  omega

/-- `|Rev| ≤ N⁻ + #{c ≥ 0}` (the value at `τ = ∞`). -/
theorem card_rev_le_valInf (B : OrdPart n) (A : WMat n) (π : Equiv.Perm (Fin n)) :
    (Rev B π).card ≤ valInf A B := by
  unfold valInf Nneg
  have hsub : (Rev B π).card ≤ (crossPairs B).card :=
    Finset.card_le_card (Finset.filter_subset _ _)
  have hsplit := Finset.card_filter_add_card_filter_not (s := crossPairs B)
    (p := fun p => A p.1 p.2 < 0)
  have hnot : (crossPairs B).filter (fun p => ¬ A p.1 p.2 < 0) =
      (crossPairs B).filter (fun p => 0 ≤ A p.1 p.2) := by
    apply Finset.filter_congr
    intro p _
    exact not_lt
  rw [hnot] at hsplit
  omega

/-- 021 Theorem 1, part 2: `R_𝓑(π*) ≤ K₀(𝓑)` for every optimal ordering. -/
theorem card_rev_le_K0 (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (π : Equiv.Perm (Fin n)) (hπ : IsOptimal A π) : (Rev B π).card ≤ K0 A B := by
  rcases K0_attained A B with h | ⟨τ, hτ, h⟩
  · rw [h]; exact card_rev_le_valInf B A π
  · rw [h]; exact card_rev_le_valFin A hA B π hπ (pos_of_mem_thresholds A B hτ)

/-- Every prefix of `π` has `I_𝓑(S) ≤ |Rev_𝓑(π)|`. -/
theorem cutInv_prefix_le_card_rev (B : OrdPart n) (π : Equiv.Perm (Fin n)) (t : ℕ) :
    cutInv B (prefixSet π t) ≤ (Rev B π).card := by
  unfold cutInv Rev crossPairs prefixSet
  apply Finset.card_le_card
  intro p hp
  simp only [Finset.mem_filter, Finset.mem_univ, true_and] at hp ⊢
  refine ⟨hp.2.2, ?_⟩
  rw [Fin.lt_def]
  have h1 := hp.1
  have h2 := hp.2.1
  push Not at h1
  omega

/-- **`k0_exchange_localization` (Discovery 021, Theorem 1, parts 2–3).**
For a skew-symmetric matrix, every ordered partition `𝓑`, every optimal ordering `π*` and
every prefix length `t`: `I_𝓑(prefix_t π*) ≤ R_𝓑(π*) ≤ K₀(𝓑)`. -/
theorem k0_exchange_localization (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (π : Equiv.Perm (Fin n)) (hπ : IsOptimal A π) (t : ℕ) :
    cutInv B (prefixSet π t) ≤ (Rev B π).card ∧ (Rev B π).card ≤ K0 A B :=
  ⟨cutInv_prefix_le_card_rev B π t, card_rev_le_K0 A hA B π hπ⟩

end Westfall022
