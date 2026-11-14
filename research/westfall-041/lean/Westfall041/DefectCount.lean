/-
WESTFALL Mission 041 — formal proof of the defect-robust (h-semicomplete) k-cut counting theorem.

Setting as in `Westfall040.CutCount`: `V` finite, linearly ordered (the reference ordering); `D` a digraph;
`back D X` = number of arcs from `Xᶜ` into `X`; `WidthLe D c` = every prefix has `back ≤ c`.

`HSemicomplete D h`: every vertex `u` has at most `h` non-neighbours, i.e. vertices `v ≠ u` with neither
`u → v` nor `v → u`.  `h = 0` is exactly semicompleteness.

Main results.
* `defect_rectangle`: |P\X|·|X\P| ≤ back P + back X + h·|P\X|   and   ≤ … + h·|X\P|.
* `shifted_hyperbola`: for a k-cut X and every s:  s·(μ_s − h) ≤ c+k  and  μ_s·(s − h) ≤ c+k  (ℕ subtraction).
* `card_kcuts_le_defect`:  #{X : back X ≤ k} ≤ (|V|+1) · R h (c+k) · H (c+k),
  where `R h K` counts antitone `r : Fin h → Fin (K+h+1)` with `(i+1)·(r i − h) ≤ K`.
* `R_le_pow`: R h K ≤ (K+h+1)^h, giving the crude bound (|V|+1)·(K+h+1)^h·H K.
* `card_kcuts_le_defect_poly`: #k-cuts ≤ (|V|+1)^(h+1) · H (c+k)   (rows have length ≤ |V|).
* `conjecture_041A`: #k-cuts ≤ (|V|+1)^(2h+1) · H (c+k), the conjecture as posed.
* `card_kcuts_le_semicomplete_recovered`: the h = 0 instance is exactly Mission 040's bound.
-/
import Westfall040.CutCount
import Mathlib.Algebra.Order.BigOperators.Group.Finset
import Mathlib.Data.Fintype.BigOperators

open Finset Westfall040

namespace Westfall041

variable {V : Type*} [Fintype V] [LinearOrder V] [DecidableEq V]

set_option linter.unusedSectionVars false

section Digraph
variable (D : V → V → Prop) [DecidableRel D]

/-- Non-neighbours of `u`: vertices `v ≠ u` with no arc in either direction. -/
def nonNbr (u : V) : Finset V := univ.filter (fun v => v ≠ u ∧ ¬ D u v ∧ ¬ D v u)

/-- `h`-semicomplete: every vertex has at most `h` non-neighbours. -/
def HSemicomplete (h : ℕ) : Prop := ∀ u : V, (nonNbr D u).card ≤ h

lemma hsemicomplete_zero_of_semicomplete (hD : Semicomplete D) : HSemicomplete D 0 := by
  intro u
  unfold nonNbr
  rw [Nat.le_zero, card_eq_zero, filter_eq_empty_iff]
  intro v _ hv
  rcases hD u v (Ne.symm hv.1) with h | h
  · exact hv.2.1 h
  · exact hv.2.2 h

/-- **Defect rectangle lemma.** -/
theorem defect_rectangle {h : ℕ} (hD : HSemicomplete D h) (P X : Finset V) :
    (P \ X).card * (X \ P).card ≤ back D P + back D X + h * (P \ X).card ∧
    (P \ X).card * (X \ P).card ≤ back D P + back D X + h * (X \ P).card := by
  classical
  set A := P \ X
  set B := X \ P
  set R := A ×ˢ B with hR
  have hcard : R.card = A.card * B.card := card_product _ _
  set Q := R.filter (fun p => ¬ D p.1 p.2) with hQ
  set N := Q.filter (fun p => ¬ D p.2 p.1) with hN
  have hs1 : (R.filter (fun p => D p.1 p.2)).card + Q.card = R.card := card_filter_add_card_filter_not _
  have hs2 : (Q.filter (fun p => D p.2 p.1)).card + N.card = Q.card := card_filter_add_card_filter_not _
  -- arcs y → x (y ∈ P\X, x ∈ X\P) are counted by back X
  have h1 : (R.filter (fun p => D p.1 p.2)).card ≤ back D X := by
    apply card_le_card
    intro p hp
    simp only [hR, A, B, mem_filter, mem_product, mem_sdiff] at hp
    simp only [backSet, mem_filter, mem_product, mem_sdiff, mem_univ, true_and]
    exact ⟨⟨hp.1.1.2, hp.1.2.1⟩, hp.2⟩
  -- arcs x → y are counted by back P
  have h2 : (Q.filter (fun p => D p.2 p.1)).card ≤ back D P := by
    have hinj : Set.InjOn (fun p : V × V => (p.2, p.1)) (Q.filter (fun p => D p.2 p.1) : Set (V × V)) := by
      intro a _ b _ hab
      simp only [Prod.mk.injEq] at hab
      exact Prod.ext hab.2 hab.1
    refine card_le_card_of_injOn (fun p => (p.2, p.1)) ?_ hinj
    intro p hp
    simp only [hQ, hR, A, B, coe_filter, Set.mem_setOf_eq, mem_filter, mem_product, mem_sdiff] at hp
    obtain ⟨⟨⟨⟨hyP, _⟩, ⟨_, hxP⟩⟩, _⟩, harc⟩ := hp
    show (p.2, p.1) ∈ backSet D P
    simp only [backSet, mem_filter, mem_product, mem_sdiff, mem_univ, true_and]
    exact ⟨⟨hxP, hyP⟩, harc⟩
  have hmemN : ∀ p ∈ N, p.1 ∈ A ∧ p.2 ∈ B ∧ ¬ D p.1 p.2 ∧ ¬ D p.2 p.1 := by
    intro p hp
    simp only [hN, hQ, hR, mem_filter, mem_product] at hp
    exact ⟨hp.1.1.1, hp.1.1.2, hp.1.2, hp.2⟩
  have hAB : ∀ p ∈ N, p.1 ≠ p.2 := by
    intro p hp heq
    obtain ⟨ha, hb, _, _⟩ := hmemN p hp
    simp only [A, B, mem_sdiff] at ha hb
    exact ha.2 (heq ▸ hb.1)
  -- non-adjacent pairs: at most h per row and at most h per column
  have hNA : N.card ≤ h * A.card := by
    refine card_le_mul_card_image_of_maps_to (f := Prod.fst) (fun p hp => (hmemN p hp).1) h ?_
    intro y _
    calc (N.filter (fun p => p.1 = y)).card ≤ (nonNbr D y).card := by
          refine card_le_card_of_injOn Prod.snd ?_ ?_
          · intro p hp
            simp only [coe_filter, Set.mem_setOf_eq] at hp
            obtain ⟨hpN, rfl⟩ := hp
            obtain ⟨_, _, n1, n2⟩ := hmemN p hpN
            simp only [nonNbr, coe_filter, mem_univ, true_and, Set.mem_setOf_eq]
            exact ⟨fun e => hAB p hpN e.symm, n1, n2⟩
          · intro a ha b hb e
            simp only [coe_filter, Set.mem_setOf_eq] at ha hb
            exact Prod.ext (ha.2.trans hb.2.symm) e
      _ ≤ h := hD y
  have hNB : N.card ≤ h * B.card := by
    refine card_le_mul_card_image_of_maps_to (f := Prod.snd) (fun p hp => (hmemN p hp).2.1) h ?_
    intro x _
    calc (N.filter (fun p => p.2 = x)).card ≤ (nonNbr D x).card := by
          refine card_le_card_of_injOn Prod.fst ?_ ?_
          · intro p hp
            simp only [coe_filter, Set.mem_setOf_eq] at hp
            obtain ⟨hpN, rfl⟩ := hp
            obtain ⟨_, _, n1, n2⟩ := hmemN p hpN
            simp only [nonNbr, coe_filter, mem_univ, true_and, Set.mem_setOf_eq]
            exact ⟨hAB p hpN, n2, n1⟩
          · intro a ha b hb e
            simp only [coe_filter, Set.mem_setOf_eq] at ha hb
            exact Prod.ext e (ha.2.trans hb.2.symm)
      _ ≤ h := hD x
  constructor <;> omega

/-- **Shifted hyperbola.** For a `k`-cut `X` (prefix width ≤ `c`) and every `s`:
`s · (μ_s − h) ≤ c + k` and `μ_s · (s − h) ≤ c + k`. -/
theorem shifted_hyperbola {h : ℕ} (hD : HSemicomplete D h) {c k : ℕ} (hw : WidthLe D c) (X : Finset V)
    (hX : back D X ≤ k) (s : ℕ) :
    s * (mu X s - h) ≤ c + k ∧ mu X s * (s - h) ≤ c + k := by
  classical
  set S := X.filter (fun x => s ≤ zerosBefore X x) with hS
  rcases S.eq_empty_or_nonempty with h0 | hne
  · have : mu X s = 0 := by simp only [mu, ← hS, h0, card_empty]
    rw [this]; simp
  · set x0 := S.min' hne
    have hx0 : x0 ∈ S := S.min'_mem hne
    set P : Finset V := univ.filter (· < x0) with hP
    have hlow : IsLowerSet (P : Set V) := by
      intro a b hba ha
      simp only [hP, coe_filter, mem_univ, true_and, Set.mem_setOf_eq] at ha ⊢
      exact lt_of_le_of_lt hba ha
    have hz : P \ X = (univ \ X).filter (· < x0) := by
      ext z; simp [hP, mem_sdiff, mem_filter]; tauto
    have hzs : s ≤ (P \ X).card := by
      rw [hz]; simp only [hS, mem_filter] at hx0; exact hx0.2
    have hos : mu X s ≤ (X \ P).card := by
      apply card_le_card
      intro x hx
      have hxS : x ∈ S := hx
      have hle : x0 ≤ x := S.min'_le x hxS
      simp only [hS, mem_filter] at hxS
      simp only [mem_sdiff, hP, mem_filter, mem_univ, true_and, not_lt]
      exact ⟨hxS.1, hle⟩
    obtain ⟨r1, r2⟩ := defect_rectangle D hD P X
    have hwP := hw P hlow
    set a := (P \ X).card
    set b := (X \ P).card
    have e1 : a * (b - h) = a * b - a * h := Nat.mul_sub a b h
    have e2 : b * (a - h) = b * a - b * h := Nat.mul_sub b a h
    have c1 : h * a = a * h := Nat.mul_comm h a
    have c2 : h * b = b * h := Nat.mul_comm h b
    have c3 : b * a = a * b := Nat.mul_comm b a
    constructor
    · calc s * (mu X s - h) ≤ a * (b - h) := Nat.mul_le_mul hzs (Nat.sub_le_sub_right hos h)
        _ ≤ c + k := by omega
    · calc mu X s * (s - h) ≤ b * (a - h) := Nat.mul_le_mul hos (Nat.sub_le_sub_right hzs h)
        _ ≤ c + k := by omega

end Digraph

/-! ### Injectivity with an explicit support bound -/

/-- If two sets of equal size have `mu` vanishing beyond `L` and equal `mu s` for `1 ≤ s ≤ L`, they are equal. -/
theorem eq_of_mu_eq' (L : ℕ) (X X' : Finset V) (hcard : X.card = X'.card)
    (hX : ∀ s, L < s → mu X s = 0) (hX' : ∀ s, L < s → mu X' s = 0)
    (hmu : ∀ s, 1 ≤ s → s ≤ L → mu X s = mu X' s) : X = X' := by
  classical
  by_contra hne
  have hsd : ((X \ X') ∪ (X' \ X)).Nonempty := by
    by_contra h
    rw [not_nonempty_iff_eq_empty, union_eq_empty, sdiff_eq_empty_iff_subset, sdiff_eq_empty_iff_subset] at h
    exact hne (Subset.antisymm h.1 h.2)
  set v := ((X \ X') ∪ (X' \ X)).min' hsd
  have hv := ((X \ X') ∪ (X' \ X)).min'_mem hsd
  have hagree : ∀ u, u < v → (u ∈ X ↔ u ∈ X') := by
    intro u hu
    by_contra h
    have hmem : u ∈ (X \ X') ∪ (X' \ X) := by
      simp only [mem_union, mem_sdiff]; tauto
    exact absurd (((X \ X') ∪ (X' \ X)).min'_le u hmem) (not_le.mpr hu)
  have key : ∀ (A B : Finset V), A.card = B.card → (∀ s, L < s → mu B s = 0) →
      (∀ s, 1 ≤ s → s ≤ L → mu A s = mu B s) → v ∈ A → v ∉ B → (∀ u, u < v → (u ∈ A ↔ u ∈ B)) → False := by
    intro A B hAB hB hAB' hvA hvB hag
    have g := mu_gap A B v hvA hvB hag hAB
    set s := zerosBefore A v + 1
    by_cases hs : s ≤ L
    · rw [hAB' s (by omega) hs] at g; omega
    · rw [hB s (by omega)] at g; omega
  simp only [mem_union, mem_sdiff] at hv
  rcases hv with ⟨h1, h2⟩ | ⟨h1, h2⟩
  · exact key X X' hcard hX' hmu h1 h2 hagree
  · exact key X' X hcard.symm hX (fun s h1 h2 => (hmu s h1 h2).symm) h1 h2 (fun u hu => (hagree u hu).symm)

/-! ### The first `h` rows of the Ferrers diagram -/

/-- `rowCount X L i` = #{s ∈ [1, L] : μ_s ≥ i+1}, the length of row `i+1` (truncated at `L`). -/
def rowCount (X : Finset V) (L i : ℕ) : ℕ := ((Icc 1 L).filter (fun s => i + 1 ≤ mu X s)).card

lemma rowCount_le (X : Finset V) (L i : ℕ) : rowCount X L i ≤ L := by
  have := card_le_card (filter_subset (fun s => i + 1 ≤ mu X s) (Icc 1 L))
  rw [Nat.card_Icc] at this
  unfold rowCount; omega

lemma row_iff (X : Finset V) (L i s : ℕ) (hs1 : 1 ≤ s) (hsL : s ≤ L) :
    i + 1 ≤ mu X s ↔ s ≤ rowCount X L i := by
  constructor
  · intro hm
    have hsub : Icc 1 s ⊆ (Icc 1 L).filter (fun t => i + 1 ≤ mu X t) := by
      intro t ht
      simp only [mem_Icc] at ht
      simp only [mem_filter, mem_Icc]
      exact ⟨⟨ht.1, le_trans ht.2 hsL⟩, le_trans hm (mu_antitone X ht.2)⟩
    have := card_le_card hsub
    rw [Nat.card_Icc] at this
    unfold rowCount; omega
  · intro hr
    by_contra hm
    have hsub : (Icc 1 L).filter (fun t => i + 1 ≤ mu X t) ⊆ Icc 1 (s - 1) := by
      intro t ht
      simp only [mem_filter, mem_Icc] at ht
      simp only [mem_Icc]
      refine ⟨ht.1.1, ?_⟩
      by_contra hts
      have := mu_antitone X (show s ≤ t by omega)
      omega
    have := card_le_card hsub
    rw [Nat.card_Icc] at this
    unfold rowCount at hr; omega

/-! ### Row sets and the counting theorem -/

/-- Admissible first-`h`-row profiles: antitone `r : Fin h → Fin (K+h+1)` with `(i+1)·(r i − h) ≤ K`. -/
def Rset (h K : ℕ) : Finset (Fin h → Fin (K + h + 1)) :=
  univ.filter (fun r => (∀ i j : Fin h, i ≤ j → r j ≤ r i) ∧ ∀ i : Fin h, (i.val + 1) * ((r i).val - h) ≤ K)

/-- `R h K` = number of admissible row profiles. -/
def R (h K : ℕ) : ℕ := (Rset h K).card

lemma R_le_pow (h K : ℕ) : R h K ≤ (K + h + 1) ^ h := by
  unfold R
  calc (Rset h K).card ≤ (univ : Finset (Fin h → Fin (K + h + 1))).card := card_le_univ _
    _ = (K + h + 1) ^ h := by rw [card_univ, Fintype.card_fun]; simp

lemma R_zero (K : ℕ) : R 0 K = 1 := by
  unfold R Rset
  rw [filter_true_of_mem (fun r _ => ⟨fun i => i.elim0, fun i => i.elim0⟩)]
  simp

section Digraph
variable (D : V → V → Prop) [DecidableRel D]

/-- **Theorem (defect-robust k-cut counting).** If every vertex of `D` has at most `h` non-neighbours and the
reference ordering has width ≤ `c`, then #{X : back D X ≤ k} ≤ (|V|+1) · R h (c+k) · H (c+k). -/
theorem card_kcuts_le_defect {h : ℕ} (hD : HSemicomplete D h) {c : ℕ} (hw : WidthLe D c) (k : ℕ) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card
      ≤ (Fintype.card V + 1) * R h (c + k) * H (c + k) := by
  classical
  set K := c + k
  set L := K + h
  set C := univ.filter (fun X : Finset V => back D X ≤ k)
  have hyp : ∀ X ∈ C, ∀ s, s * (mu X s - h) ≤ K ∧ mu X s * (s - h) ≤ K := fun X hX s =>
    shifted_hyperbola D hD hw X (by simpa [C] using hX) s
  -- residual entries are at most K
  have hres : ∀ X ∈ C, ∀ s, 1 ≤ s → mu X s - h ≤ K := by
    intro X hX s hs
    have := (hyp X hX s).1
    have : 1 * (mu X s - h) ≤ s * (mu X s - h) := Nat.mul_le_mul_right _ hs
    omega
  -- beyond K, every column has height ≤ h
  have hsmall : ∀ X ∈ C, ∀ s, K < s → mu X s ≤ h := by
    intro X hX s hs
    by_contra hm
    have := (hyp X hX s).1
    have : s * 1 ≤ s * (mu X s - h) := Nat.mul_le_mul_left s (by omega)
    omega
  -- beyond K + h, every column is empty
  have hvan : ∀ X ∈ C, ∀ s, L < s → mu X s = 0 := by
    intro X hX s hs
    by_contra hm
    have := (hyp X hX s).2
    have : 1 * (s - h) ≤ mu X s * (s - h) := Nat.mul_le_mul_right _ (by omega)
    omega
  let F : Finset V → Fin (Fintype.card V + 1) × ((Fin h → Fin (K + h + 1)) × (Fin K → Fin (K + 1))) :=
    fun X => (⟨X.card, Nat.lt_succ_of_le (card_le_univ X)⟩,
      (fun i => ⟨rowCount X L i.val, Nat.lt_succ_of_le (rowCount_le X L i.val)⟩,
       fun j => ⟨min (mu X (j.val + 1) - h) K, by omega⟩))
  have hmaps : ∀ X ∈ C, F X ∈ (univ : Finset (Fin (Fintype.card V + 1))) ×ˢ (Rset h K ×ˢ Hset K) := by
    intro X hX
    simp only [mem_product, mem_univ, true_and, Rset, Hset, mem_filter, F]
    refine ⟨⟨fun i j hij => ?_, fun i => ?_⟩, fun i j hij => ?_, fun i => ?_⟩
    · simp only [Fin.le_def]
      apply card_le_card
      intro s hs
      simp only [mem_filter] at hs ⊢
      exact ⟨hs.1, le_trans (by have := Fin.le_def.mp hij; omega) hs.2⟩
    · show (i.val + 1) * (rowCount X L i.val - h) ≤ K
      set m := rowCount X L i.val with hm
      rcases Nat.eq_zero_or_pos m with h0 | hpos
      · rw [h0]; simp
      · have hmL : m ≤ L := rowCount_le X L i.val
        have hmu : i.val + 1 ≤ mu X m := (row_iff X L i.val m hpos hmL).2 le_rfl
        calc (i.val + 1) * (m - h) ≤ mu X m * (m - h) := Nat.mul_le_mul_right _ hmu
          _ ≤ K := (hyp X hX m).2
    · simp only [Fin.le_def]
      have := mu_antitone X (show i.val + 1 ≤ j.val + 1 by have := Fin.le_def.mp hij; omega)
      omega
    · show (i.val + 1) * min (mu X (i.val + 1) - h) K ≤ K
      rw [min_eq_left (hres X hX _ (by omega))]
      exact (hyp X hX (i.val + 1)).1
  have hinj : Set.InjOn F (C : Set (Finset V)) := by
    intro X hX Y hY hXY
    simp only [F, Prod.mk.injEq, Fin.mk.injEq] at hXY
    obtain ⟨hc, hr, hf⟩ := hXY
    have hrow : ∀ i : Fin h, rowCount X L i.val = rowCount Y L i.val := by
      intro i; have := congrFun hr i; simpa using this
    refine eq_of_mu_eq' L X Y hc (hvan X hX) (hvan Y hY) (fun s hs1 hsL => ?_)
    by_cases hb : mu X s ≤ h ∧ mu Y s ≤ h
    · -- both columns are within the first h rows: read them off the row lengths
      have side : ∀ A B : Finset V, (∀ i : Fin h, rowCount A L i.val = rowCount B L i.val) →
          mu A s < mu B s → mu B s ≤ h → False := by
        intro A B hAB hlt hBh
        have hiB : (mu A s) + 1 ≤ mu B s := hlt
        have h1 := (row_iff B L (mu A s) s hs1 hsL).1 hiB
        rw [← hAB ⟨mu A s, by omega⟩] at h1
        have h2 := (row_iff A L (mu A s) s hs1 hsL).2 h1
        omega
      rcases lt_trichotomy (mu X s) (mu Y s) with hlt | heq | hgt
      · exact (side X Y hrow hlt hb.2).elim
      · exact heq
      · exact (side Y X (fun i => (hrow i).symm) hgt hb.1).elim
    · -- some column exceeds h, so s ≤ K and the residual entry determines it
      have hsK : s ≤ K := by
        by_contra hsK
        exact hb ⟨hsmall X hX s (by omega), hsmall Y hY s (by omega)⟩
      have := congrFun hf ⟨s - 1, by omega⟩
      simp only [Fin.mk.injEq] at this
      have e : s - 1 + 1 = s := by omega
      rw [e, min_eq_left (hres X hX s hs1), min_eq_left (hres Y hY s hs1)] at this
      omega
  calc C.card ≤ ((univ : Finset (Fin (Fintype.card V + 1))) ×ˢ (Rset h K ×ˢ Hset K)).card :=
        card_le_card_of_injOn F hmaps hinj
    _ = (Fintype.card V + 1) * R h K * H K := by
        rw [card_product, card_product, card_univ, Fintype.card_fin, Nat.mul_assoc]; rfl

/-- **Crude explicit form.** #k-cuts ≤ (|V|+1) · (c+k+h+1)^h · H (c+k). -/
theorem card_kcuts_le_defect_pow {h : ℕ} (hD : HSemicomplete D h) {c : ℕ} (hw : WidthLe D c) (k : ℕ) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card
      ≤ (Fintype.card V + 1) * (c + k + h + 1) ^ h * H (c + k) := by
  calc _ ≤ (Fintype.card V + 1) * R h (c + k) * H (c + k) := card_kcuts_le_defect D hD hw k
    _ ≤ _ := Nat.mul_le_mul_right _ (Nat.mul_le_mul_left _ (R_le_pow h (c + k)))

/-- **Width ≤ k form.** -/
theorem card_kcuts_le_defect_of_width_le_k {h : ℕ} (hD : HSemicomplete D h) {k : ℕ} (hw : WidthLe D k) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card
      ≤ (Fintype.card V + 1) * R h (2 * k) * H (2 * k) := by
  have := card_kcuts_le_defect D hD hw k
  rwa [show k + k = 2 * k by omega] at this

/-- Columns beyond `|V|` are empty: no vertex is preceded by more than `|V|` non-members. -/
lemma mu_eq_zero_of_card_lt (X : Finset V) (s : ℕ) (hs : Fintype.card V < s) : mu X s = 0 := by
  unfold mu
  rw [card_eq_zero, filter_eq_empty_iff]
  intro x _ hx
  have : zerosBefore X x ≤ Fintype.card V := by
    unfold zerosBefore; exact card_le_univ _
  omega

/-- **Polynomial-in-n form (proves Conjecture 041-A, with exponent h+1 instead of 2h+1).**
#k-cuts ≤ (|V|+1)^(h+1) · H (c+k). -/
theorem card_kcuts_le_defect_poly {h : ℕ} (hD : HSemicomplete D h) {c : ℕ} (hw : WidthLe D c) (k : ℕ) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card
      ≤ (Fintype.card V + 1) ^ (h + 1) * H (c + k) := by
  classical
  set n := Fintype.card V
  set K := c + k
  set C := univ.filter (fun X : Finset V => back D X ≤ k)
  have hyp : ∀ X ∈ C, ∀ s, s * (mu X s - h) ≤ K ∧ mu X s * (s - h) ≤ K := fun X hX s =>
    shifted_hyperbola D hD hw X (by simpa [C] using hX) s
  have hres : ∀ X ∈ C, ∀ s, 1 ≤ s → mu X s - h ≤ K := by
    intro X hX s hs
    have := (hyp X hX s).1
    have : 1 * (mu X s - h) ≤ s * (mu X s - h) := Nat.mul_le_mul_right _ hs
    omega
  have hsmall : ∀ X ∈ C, ∀ s, K < s → mu X s ≤ h := by
    intro X hX s hs
    by_contra hm
    have := (hyp X hX s).1
    have : s * 1 ≤ s * (mu X s - h) := Nat.mul_le_mul_left s (by omega)
    omega
  let F : Finset V → Fin (n + 1) × ((Fin h → Fin (n + 1)) × (Fin K → Fin (K + 1))) :=
    fun X => (⟨X.card, Nat.lt_succ_of_le (card_le_univ X)⟩,
      (fun i => ⟨rowCount X n i.val, Nat.lt_succ_of_le (rowCount_le X n i.val)⟩,
       fun j => ⟨min (mu X (j.val + 1) - h) K, by omega⟩))
  have hmaps : ∀ X ∈ C, F X ∈ (univ : Finset (Fin (n + 1))) ×ˢ
      ((univ : Finset (Fin h → Fin (n + 1))) ×ˢ Hset K) := by
    intro X hX
    simp only [mem_product, mem_univ, true_and, Hset, mem_filter, F]
    refine ⟨fun i j hij => ?_, fun i => ?_⟩
    · simp only [Fin.le_def]
      have := mu_antitone X (show i.val + 1 ≤ j.val + 1 by have := Fin.le_def.mp hij; omega)
      omega
    · show (i.val + 1) * min (mu X (i.val + 1) - h) K ≤ K
      rw [min_eq_left (hres X hX _ (by omega))]
      exact (hyp X hX (i.val + 1)).1
  have hinj : Set.InjOn F (C : Set (Finset V)) := by
    intro X hX Y hY hXY
    simp only [F, Prod.mk.injEq, Fin.mk.injEq] at hXY
    obtain ⟨hc, hr, hf⟩ := hXY
    have hrow : ∀ i : Fin h, rowCount X n i.val = rowCount Y n i.val := by
      intro i; have := congrFun hr i; simpa using this
    refine eq_of_mu_eq' n X Y hc (mu_eq_zero_of_card_lt X) (mu_eq_zero_of_card_lt Y) (fun s hs1 hsL => ?_)
    by_cases hb : mu X s ≤ h ∧ mu Y s ≤ h
    · have side : ∀ A B : Finset V, (∀ i : Fin h, rowCount A n i.val = rowCount B n i.val) →
          mu A s < mu B s → mu B s ≤ h → False := by
        intro A B hAB hlt hBh
        have hiB : (mu A s) + 1 ≤ mu B s := hlt
        have h1 := (row_iff B n (mu A s) s hs1 hsL).1 hiB
        rw [← hAB ⟨mu A s, by omega⟩] at h1
        have h2 := (row_iff A n (mu A s) s hs1 hsL).2 h1
        omega
      rcases lt_trichotomy (mu X s) (mu Y s) with hlt | heq | hgt
      · exact (side X Y hrow hlt hb.2).elim
      · exact heq
      · exact (side Y X (fun i => (hrow i).symm) hgt hb.1).elim
    · have hsK : s ≤ K := by
        by_contra hsK
        exact hb ⟨hsmall X hX s (by omega), hsmall Y hY s (by omega)⟩
      have := congrFun hf ⟨s - 1, by omega⟩
      simp only [Fin.mk.injEq] at this
      have e : s - 1 + 1 = s := by omega
      rw [e, min_eq_left (hres X hX s hs1), min_eq_left (hres Y hY s hs1)] at this
      omega
  calc C.card ≤ ((univ : Finset (Fin (n + 1))) ×ˢ ((univ : Finset (Fin h → Fin (n + 1))) ×ˢ Hset K)).card :=
        card_le_card_of_injOn F hmaps hinj
    _ = (n + 1) ^ (h + 1) * H K := by
        rw [card_product, card_product, card_univ, card_univ, Fintype.card_fun, Fintype.card_fin,
          Fintype.card_fin, pow_succ, Nat.mul_comm ((n + 1) ^ h) (n + 1), Nat.mul_assoc]; rfl

/-- **Conjecture 041-A (as posed).** #k-cuts ≤ (|V|+1)^(2h+1) · H (c+k). -/
theorem conjecture_041A {h : ℕ} (hD : HSemicomplete D h) {c : ℕ} (hw : WidthLe D c) (k : ℕ) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card
      ≤ (Fintype.card V + 1) ^ (2 * h + 1) * H (c + k) := by
  calc _ ≤ (Fintype.card V + 1) ^ (h + 1) * H (c + k) := card_kcuts_le_defect_poly D hD hw k
    _ ≤ _ := Nat.mul_le_mul_right _ (Nat.pow_le_pow_right (by omega) (by omega))

/-- **h = 0 specialization**: recovers the Mission 040 bound (|V|+1)·H(c+k) for semicomplete digraphs. -/
theorem card_kcuts_le_semicomplete_recovered (hD : Semicomplete D) {c : ℕ} (hw : WidthLe D c) (k : ℕ) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card ≤ (Fintype.card V + 1) * H (c + k) := by
  have := card_kcuts_le_defect D (hsemicomplete_zero_of_semicomplete D hD) hw k
  rwa [R_zero, Nat.mul_one] at this

end Digraph

/-! ### Sanity checks of `R` against the Python enumeration (`defect_lib.R`) -/

example : R 0 3 = 1 := by decide
example : R 1 0 = 2 := by decide
example : R 1 2 = 4 := by decide
example : R 2 1 = 9 := by decide

end Westfall041
