import Westfall043

/-!
WESTFALL Mission 044 — formal counting-encoding attempt.
This module contains *no* axiom, sorry or admit.
The counting inequality is not claimed until the kernel accepts it.
-/

open Finset Westfall040 Westfall041 Westfall043

namespace Westfall044

/-- Partitions in an h by h box, encoded as weakly decreasing rows. -/
def BoxSet (h : ℕ) : Finset (Fin h → Fin (h + 1)) :=
  univ.filter (fun r => ∀ i j : Fin h, i ≤ j → r j ≤ r i)

/-- The bounded profile count. -/
def B (h : ℕ) : ℕ := (BoxSet h).card

/-- Every profile decomposes into a truncated hyperbola partition and a box partition. -/
def encode (h K : ℕ) (r : Fin h → Fin (K + h + 1)) :
    (Fin K → Fin (K + 1)) × (Fin h → Fin (h + 1)) :=
  ((fun j => if hj : j.val < h
    then ⟨min ((r ⟨j.val, hj⟩).val - h) K, by omega⟩
    else ⟨0, by omega⟩),
   (fun i => ⟨min (r i).val h, by omega⟩))

theorem encode_box_mem (h K : ℕ) (r : Fin h → Fin (K + h + 1))
    (hr : r ∈ Rset h K) : (encode h K r).2 ∈ BoxSet h := by
  classical
  simp only [BoxSet, mem_filter, mem_univ, true_and]
  intro i j hij
  have hmono := (mem_filter.mp hr).2.1 i j hij
  simp only [encode, Fin.le_def]
  exact min_le_min_right h (Fin.le_def.mp hmono)

theorem encode_residual_mem (h K : ℕ) (r : Fin h → Fin (K + h + 1))
    (hr : r ∈ Rset h K) : (encode h K r).1 ∈ Hset K := by
  classical
  have hmon := (mem_filter.mp hr).2.1
  have hbound := (mem_filter.mp hr).2.2
  simp only [Hset, mem_filter, mem_univ, true_and]
  constructor
  · intro i j hij
    by_cases hi : i.val < h
    · by_cases hj : j.val < h
      · have hle : (r ⟨j.val, hj⟩).val ≤ (r ⟨i.val, hi⟩).val :=
          Fin.le_def.mp (hmon ⟨i.val, hi⟩ ⟨j.val, hj⟩ (Fin.le_def.mpr (Fin.le_def.mp hij)))
        simp only [encode, dif_pos hi, dif_pos hj, Fin.le_def]
        omega
      · simp only [encode, dif_pos hi, dif_neg hj, Fin.le_def]
        omega
    · have hj : ¬ j.val < h := by
        intro hh
        have hle := Fin.le_def.mp hij
        omega
      simp only [encode, dif_neg hi, dif_neg hj, Fin.le_def]
      omega
  · intro i
    by_cases hi : i.val < h
    · have hb := hbound ⟨i.val, hi⟩
      simp only [encode, dif_pos hi, Fin.val_mk]
      have hm : (i.val + 1) * min ((r ⟨i.val, hi⟩).val - h) K ≤
          (i.val + 1) * ((r ⟨i.val, hi⟩).val - h) :=
        Nat.mul_le_mul_left _ (min_le_left _ _)
      exact hm.trans (by simpa using hb)
    · simp only [encode, dif_neg hi, Fin.val_zero, Nat.mul_zero]
      exact Nat.zero_le _

/-- If two Rset profiles have the same encoding, then they are identical. -/
theorem encode_injective_on (h K : ℕ)
    {r s : Fin h → Fin (K + h + 1)}
    (hr : r ∈ Rset h K) (hs : s ∈ Rset h K)
    (heq : encode h K r = encode h K s) : r = s := by
  classical
  have hres : residual r = residual s := by
    funext i
    by_cases hi : i.val < K
    · have he := congrFun (congrArg Prod.fst heq) ⟨i.val, hi⟩
      have hbR := (mem_filter.mp hr).2.2 i
      have hbS := (mem_filter.mp hs).2.2 i
      have hR : (r i).val - h ≤ K := by
        have hp : 1 * ((r i).val - h) ≤ (i.val + 1) * ((r i).val - h) :=
          Nat.mul_le_mul_right _ (by omega : 1 ≤ i.val + 1)
        omega
      have hS : (s i).val - h ≤ K := by
        have hp : 1 * ((s i).val - h) ≤ (i.val + 1) * ((s i).val - h) :=
          Nat.mul_le_mul_right _ (by omega : 1 ≤ i.val + 1)
        omega
      simpa only [encode, dif_pos i.isLt, Fin.mk.injEq,
        min_eq_left hR, min_eq_left hS, residual] using he
    · have hbR := (mem_filter.mp hr).2.2 i
      have hbS := (mem_filter.mp hs).2.2 i
      have hR : (r i).val - h = 0 := by
        by_contra hn
        have hp : (i.val + 1) * 1 ≤ (i.val + 1) * ((r i).val - h) :=
          Nat.mul_le_mul_left _ (by omega)
        omega
      have hS : (s i).val - h = 0 := by
        by_contra hn
        have hp : (i.val + 1) * 1 ≤ (i.val + 1) * ((s i).val - h) :=
          Nat.mul_le_mul_left _ (by omega)
        omega
      simpa only [residual, hR, hS]
  have hbox : boxed r = boxed s := by
    funext i
    have he := congrFun (congrArg Prod.snd heq) i
    simpa only [encode, Fin.mk.injEq, boxed] using he
  exact split_injective hres hbox

/-- The refined count, reducing R_h to hyperbola and bounded-box factors. -/
theorem R_le_H_mul_B (h K : ℕ) : R h K ≤ H K * B h := by
  classical
  unfold R H B
  let f := encode h K
  calc
    (Rset h K).card ≤ (Hset K ×ˢ BoxSet h).card := by
      refine card_le_card_of_injOn f ?_ ?_
      · intro r hr
        exact mem_product.mpr ⟨encode_residual_mem h K r hr,
          encode_box_mem h K r hr⟩
      · intro r hr s hs heq
        exact encode_injective_on h K hr hs heq
    _ = (Hset K).card * (BoxSet h).card := card_product _ _

end Westfall044
