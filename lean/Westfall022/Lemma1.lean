import Westfall022.Exchange

/-!
# Discovery 019, Lemma 1 and the block decomposition of pair counts

`Σ_k a_k x_k ≤ b² + I`, where `a_k = |B_k ∖ S|`, `x_k = |B_k ∩ S|` and
`I = Σ_{k<l} a_k x_l` (019, Lemma 1). The proof follows the manuscript:
`t_k = min(a_k, x_k)`, `Σ a_k x_k ≤ b·s`, `Σ_{k<l} t_k t_l ≤ I`, `s² ≤ (b/2)s + 2I`, then
`b·s ≤ b² + I` because `2s² - 5bs + 4b² ≥ 0` always.
-/

namespace Westfall022

open Finset

section Arithmetic

variable {ι : Type*} [Fintype ι] [LinearOrder ι]

/-- `(Σ t)² = Σ t² + 2 Σ_{k<l} t_k t_l`. -/
theorem sq_sum_eq (t : ι → ℕ) :
    (∑ k, t k) ^ 2 = ∑ k, t k ^ 2 + 2 * ∑ k, ∑ l, (if k < l then t k * t l else 0) := by
  have hpt : ∀ k l, t k * t l = (if k < l then t k * t l else 0) +
      (if k = l then t k * t l else 0) + (if l < k then t k * t l else 0) := by
    intro k l
    rcases lt_trichotomy k l with h | h | h
    · simp [h, h.ne, h.not_gt]
    · simp [h]
    · simp [h, h.ne', h.not_gt]
  rw [sq, Finset.sum_mul_sum]
  rw [Finset.sum_congr rfl (fun k _ => Finset.sum_congr rfl (fun l _ => hpt k l))]
  simp only [Finset.sum_add_distrib]
  have hdiag : ∑ k, ∑ l, (if k = l then t k * t l else 0) = ∑ k, t k ^ 2 := by
    refine Finset.sum_congr rfl (fun k _ => ?_)
    rw [Finset.sum_ite_eq]; simp [sq]
  have hswap : ∑ k, ∑ l, (if l < k then t k * t l else 0) =
      ∑ k, ∑ l, (if k < l then t k * t l else 0) := by
    rw [Finset.sum_comm]
    refine Finset.sum_congr rfl (fun k _ => Finset.sum_congr rfl (fun l _ => ?_))
    rw [mul_comm]
  rw [hdiag, hswap]; ring

/-- **Discovery 019, Lemma 1** (arithmetic form). -/
theorem lemma1_arith (a x : ι → ℕ) (b : ℕ) (h : ∀ k, a k + x k ≤ b) :
    ∑ k, a k * x k ≤ b ^ 2 + ∑ k, ∑ l, (if k < l then a k * x l else 0) := by
  set t : ι → ℕ := fun k => min (a k) (x k) with ht
  have h1 : ∑ k, a k * x k ≤ b * ∑ k, t k := by
    rw [Finset.mul_sum]
    apply Finset.sum_le_sum
    intro k _
    have hk := h k
    simp only [ht]
    rcases le_total (a k) (x k) with hle | hle
    · rw [min_eq_left hle, mul_comm b]; exact Nat.mul_le_mul_left _ (by omega)
    · rw [min_eq_right hle]; exact Nat.mul_le_mul_right _ (by omega)
  have h2 : 2 * ∑ k, t k ^ 2 ≤ b * ∑ k, t k := by
    rw [Finset.mul_sum, Finset.mul_sum]
    apply Finset.sum_le_sum
    intro k _
    have hk := h k
    have htk : 2 * t k ≤ b := by simp only [ht]; omega
    calc 2 * t k ^ 2 = (2 * t k) * t k := by ring
      _ ≤ b * t k := Nat.mul_le_mul_right _ htk
  have h4 : ∑ k, ∑ l, (if k < l then t k * t l else 0) ≤
      ∑ k, ∑ l, (if k < l then a k * x l else 0) := by
    apply Finset.sum_le_sum; intro k _
    apply Finset.sum_le_sum; intro l _
    split_ifs
    · exact Nat.mul_le_mul (min_le_left _ _) (min_le_right _ _)
    · exact le_rfl
  have h3 := sq_sum_eq t
  -- move to ℤ and finish with the quadratic inequality `2s² - 5bs + 4b² ≥ 0`
  set s := ∑ k, t k
  set T2 := ∑ k, t k ^ 2
  set D := ∑ k, ∑ l, (if k < l then t k * t l else 0)
  set I := ∑ k, ∑ l, (if k < l then a k * x l else 0)
  set Sax := ∑ k, a k * x k
  have z1 : (Sax : ℤ) ≤ b * s := by exact_mod_cast h1
  have z2 : 2 * (T2 : ℤ) ≤ b * s := by exact_mod_cast h2
  have z3 : (s : ℤ) ^ 2 = T2 + 2 * D := by exact_mod_cast h3
  have z4 : (D : ℤ) ≤ I := by exact_mod_cast h4
  have key : (b : ℤ) * s ≤ b ^ 2 + I := by
    nlinarith [sq_nonneg (4 * (s : ℤ) - 5 * b), sq_nonneg (b : ℤ)]
  have : (Sax : ℤ) ≤ b ^ 2 + I := by linarith
  exact_mod_cast this

end Arithmetic

/-! ## Decomposing pair counts by blocks -/

variable {n : ℕ}

/-- `a_k = |B_k ∖ S|`. -/
def absentIn (B : OrdPart n) (S : Finset (Fin n)) (k : Fin n) : ℕ :=
  ((block B k).filter (fun v => v ∉ S)).card

/-- `x_k = |B_k ∩ S|`. -/
def presentIn (B : OrdPart n) (S : Finset (Fin n)) (k : Fin n) : ℕ :=
  ((block B k).filter (fun v => v ∈ S)).card

theorem absent_add_present (B : OrdPart n) (S : Finset (Fin n)) (k : Fin n) :
    absentIn B S k + presentIn B S k = (block B k).card := by
  unfold absentIn presentIn
  have := Finset.card_filter_add_card_filter_not (s := block B k) (p := fun v => v ∈ S)
  omega

theorem absent_add_present_le_bmax (B : OrdPart n) (S : Finset (Fin n)) (k : Fin n) :
    absentIn B S k + presentIn B S k ≤ bmax B := by
  rw [absent_add_present]
  exact Finset.le_sup (f := fun k => (block B k).card) (Finset.mem_univ k)

/-- Counting crossing pairs `(w ∉ S, u ∈ S)` whose block indices satisfy a relation `R`,
block by block. -/
theorem card_crossing_by_blocks (B : OrdPart n) (S : Finset (Fin n))
    (R : Fin n → Fin n → Prop) [DecidableRel R] :
    (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ R (B p.1) (B p.2))).card =
      ∑ k, ∑ l, (if R k l then absentIn B S k * presentIn B S l else 0) := by
  classical
  rw [Finset.card_eq_sum_ones, Finset.sum_filter, ← Finset.univ_product_univ,
    Finset.sum_product]
  -- regroup the outer sum by the block of `w`, then the inner by the block of `u`
  rw [← Finset.sum_fiberwise (s := univ) (g := B)]
  refine Finset.sum_congr rfl (fun k _ => ?_)
  have hin : ∀ w ∈ univ.filter (fun w => B w = k),
      (∑ u : Fin n, if w ∉ S ∧ u ∈ S ∧ R (B w) (B u) then (1 : ℕ) else 0) =
        ∑ l, ∑ u ∈ univ.filter (fun u => B u = l),
          (if w ∉ S ∧ u ∈ S ∧ R k l then (1 : ℕ) else 0) := by
    intro w hw
    have hwk : B w = k := (Finset.mem_filter.mp hw).2
    rw [← Finset.sum_fiberwise (s := univ) (g := B)]
    refine Finset.sum_congr rfl (fun l _ => Finset.sum_congr rfl (fun u hu => ?_))
    have hul : B u = l := (Finset.mem_filter.mp hu).2
    rw [hwk, hul]
  rw [Finset.sum_congr rfl hin, Finset.sum_comm]
  refine Finset.sum_congr rfl (fun l _ => ?_)
  by_cases hR : R k l
  · simp only [hR, and_true]
    unfold absentIn presentIn block
    rw [Finset.card_filter, Finset.card_filter, Finset.sum_mul_sum]
    refine Finset.sum_congr rfl (fun w _ => Finset.sum_congr rfl (fun u _ => ?_))
    by_cases hw : w ∈ S <;> by_cases hu : u ∈ S <;> simp [hw, hu]
  · simp [hR]

/-- Same-block crossing pairs: `Σ_k a_k x_k`. -/
def sameBlockCut (B : OrdPart n) (S : Finset (Fin n)) : ℕ :=
  (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 = B p.2)).card

theorem sameBlockCut_eq_sum (B : OrdPart n) (S : Finset (Fin n)) :
    sameBlockCut B S = ∑ k, absentIn B S k * presentIn B S k := by
  unfold sameBlockCut
  rw [card_crossing_by_blocks B S (fun k l => k = l)]
  refine Finset.sum_congr rfl (fun k _ => ?_)
  rw [Finset.sum_ite_eq]; simp

/-- `I_𝓑(S) = Σ_{i<j} |B_i ∖ S| |B_j ∩ S|` (the manuscript's formula). -/
theorem I_eq_sum (B : OrdPart n) (S : Finset (Fin n)) :
    cutInv B S = ∑ k, ∑ l, (if k < l then absentIn B S k * presentIn B S l else 0) := by
  unfold cutInv
  exact card_crossing_by_blocks B S (fun k l => k < l)

/-- **Discovery 019, Lemma 1** in the form used by Theorem 1: `Σ_k a_k x_k ≤ b² + I_𝓑(S)`. -/
theorem sameBlockCut_le (B : OrdPart n) (S : Finset (Fin n)) :
    sameBlockCut B S ≤ bmax B ^ 2 + cutInv B S := by
  rw [sameBlockCut_eq_sum, I_eq_sum]
  exact lemma1_arith (absentIn B S) (presentIn B S) (bmax B)
    (absent_add_present_le_bmax B S)

end Westfall022
