import Westfall044
import Mathlib.Data.Sym.Card
import Mathlib.Data.List.Sort

/-!
WESTFALL Mission 044 — bounded Ferrers box cardinality via stars and bars.
The bound and its corollaries are not claimed as checked before CI succeeds.
-/
open Finset Westfall040 Westfall041

namespace Westfall044

/-- An h-row box profile determines an unordered h-tuple over h+1 symbols. -/
def boxSym (h : ℕ) (r : Fin h → Fin (h + 1)) : Sym (Fin (h + 1)) h :=
  ⟨(List.ofFn r : Multiset (Fin (h + 1))), by simp⟩

theorem boxSym_inj_on (h : ℕ)
    {r s : Fin h → Fin (h + 1)}
    (hr : r ∈ BoxSet h) (hs : s ∈ BoxSet h)
    (heq : boxSym h r = boxSym h s) : r = s := by
  have hm : (List.ofFn r : Multiset (Fin (h + 1))) =
      (List.ofFn s : Multiset (Fin (h + 1))) :=
    congrArg Subtype.val heq
  have hp : List.ofFn r ~ List.ofFn s := Multiset.coe_eq_coe.mp hm
  have hpr : (List.ofFn r).Pairwise (fun x y => y ≤ x) := by
    rw [List.pairwise_ofFn]
    intro i j hij
    exact (mem_filter.mp hr).2 i j hij.le
  have hps : (List.ofFn s).Pairwise (fun x y => y ≤ x) := by
    rw [List.pairwise_ofFn]
    intro i j hij
    exact (mem_filter.mp hs).2 i j hij.le
  have hl : List.ofFn r = List.ofFn s :=
    List.Perm.eq_of_pairwise' hpr hps hp
  exact List.ofFn_injective hl

/-- The number of bounded Ferrers profiles is the central binomial coefficient or less. -/
theorem B_le_choose (h : ℕ) : B h ≤ (2 * h).choose h := by
  classical
  unfold B
  calc
    (BoxSet h).card ≤ (univ : Finset (Sym (Fin (h + 1)) h)).card := by
      refine card_le_card_of_injOn (boxSym h) ?_ ?_
      · intro x _; exact mem_univ _
      · intro x hx y hy hxy; exact boxSym_inj_on h hx hy hxy
    _ = (2 * h).choose h := by
      rw [card_univ]
      have hc := Sym.card_sym_eq_choose (α := Fin (h + 1)) h
      simpa only [Fintype.card_fin] using
        (show Fintype.card (Sym (Fin (h + 1)) h) = (2 * h).choose h from
          hc.trans (by congr 1; omega))

/-- The central binomial coefficient is at most 4^h. -/
theorem choose_le_four_pow (h : ℕ) : (2 * h).choose h ≤ 4 ^ h := by
  calc
    (2 * h).choose h ≤ 2 ^ (2 * h) := Nat.choose_le_two_pow _ _
    _ = 4 ^ h := by ring

/-- THE MAIN SHARP DEFECT PROFILE BOUND. -/
theorem R_le_choose_mul_H (h K : ℕ) :
    R h K ≤ (2 * h).choose h * H K := by
  calc
    R h K ≤ H K * B h := R_le_H_mul_B h K
    _ ≤ H K * (2 * h).choose h := Nat.mul_le_mul_left _ (B_le_choose h)
    _ = _ := Nat.mul_comm _ _

/-- The 4^h form, adequate for the sharp parameterized running time. -/
theorem R_le_four_pow_mul_H (h K : ℕ) :
    R h K ≤ 4 ^ h * H K := by
  calc
    R h K ≤ (2 * h).choose h * H K := R_le_choose_mul_H h K
    _ ≤ 4 ^ h * H K := Nat.mul_le_mul_right _ (choose_le_four_pow h)

/-- A defect-sensitive k-cut count with h additive in the exponential complexity. -/
theorem card_kcuts_le_defect_sharp
    {V : Type*} [Fintype V] [LinearOrder V] [DecidableEq V]
    (D : V → V → Prop) [DecidableRel D]
    {h : ℕ} (hD : HSemicomplete D h) {c : ℕ} (hw : WidthLe D c) (k : ℕ) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card ≤
      (Fintype.card V + 1) * 4 ^ h * (H (c + k)) ^ 2 := by
  have hc := card_kcuts_le_defect D hD hw k
  have hh := R_le_four_pow_mul_H h (c + k)
  calc
    _ ≤ (Fintype.card V + 1) * R h (c + k) * H (c + k) := hc
    _ ≤ (Fintype.card V + 1) * (4 ^ h * H (c + k)) * H (c + k) :=
      Nat.mul_le_mul_right _ (Nat.mul_le_mul_left _ hh)
    _ = _ := by ring

end Westfall044
