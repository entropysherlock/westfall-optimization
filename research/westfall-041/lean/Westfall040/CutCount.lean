/-
WESTFALL Mission 040 — formal proof of the semicomplete k-cut counting theorem.

Setting. `V` is a finite, linearly ordered vertex type; the linear order is the *reference ordering*
(any ordering of any finite vertex set is an instance). `D : V → V → Prop` is a digraph; antiparallel arcs
are allowed. For `X : Finset V`, `back D X` counts arcs from the complement of `X` into `X`
(Fomin–Pilipczuk, ESA 2013, Definitions 2 and 4). The reference ordering has width ≤ `c` if
`back D P ≤ c` for every lower set `P` (every prefix). A `k`-cut is a set `X` with `back D X ≤ k`.

Main theorem (`card_kcuts_le`): if `D` is semicomplete and the reference ordering has width ≤ `c`, then
    #{X : back D X ≤ k} ≤ (|V| + 1) · H (c + k),
where `H K` is the number of antitone sequences `f : Fin K → Fin (K+1)` with `(s+1) · f s ≤ K`, i.e. the
number of integer partitions whose Ferrers diagram lies under the hyperbola `x · y ≤ K`.

Corollary (`card_kcuts_le_of_width_le_k`): width ≤ k ⇒ #k-cuts ≤ (|V|+1) · H (2k).

Not formalized here: the analytic estimate `H K ≤ (exp (2π√K) - 1)/(2π√K)`, and the algorithm.
-/
import Mathlib.Data.Fintype.Card
import Mathlib.Data.Finset.Card
import Mathlib.Data.Fintype.Pi
import Mathlib.Order.Interval.Finset.Nat
import Mathlib.Data.Finset.Max
import Mathlib.Data.Fintype.Powerset

open Finset

namespace Westfall040

variable {V : Type*} [Fintype V] [LinearOrder V] [DecidableEq V]

section Digraph
variable (D : V → V → Prop) [DecidableRel D]

/-- Arcs from `Xᶜ` into `X`. -/
def backSet (X : Finset V) : Finset (V × V) :=
  ((univ \ X) ×ˢ X).filter (fun p => D p.1 p.2)

/-- `back D X` = number of arcs from the complement of `X` into `X`. -/
def back (X : Finset V) : ℕ := (backSet D X).card

/-- Semicomplete: every pair of distinct vertices carries at least one arc (both are allowed). -/
def Semicomplete : Prop := ∀ u v : V, u ≠ v → D u v ∨ D v u

/-- The reference ordering (the linear order on `V`) has width at most `c`. -/
def WidthLe (c : ℕ) : Prop := ∀ P : Finset V, IsLowerSet (P : Set V) → back D P ≤ c

/-- Rectangle lemma. For any `P` and `X`: |P \ X| · |X \ P| ≤ back(P) + back(X). Each pair (y, x),
y ∈ P \ X, x ∈ X \ P, carries an arc y → x (counted by back X) or x → y (counted by back P). -/
theorem rectangle (hD : Semicomplete D) (P X : Finset V) :
    (P \ X).card * (X \ P).card ≤ back D P + back D X := by
  classical
  set R := (P \ X) ×ˢ (X \ P) with hR
  have hcard : R.card = (P \ X).card * (X \ P).card := card_product _ _
  have hsplit : (R.filter (fun p => D p.1 p.2)).card + (R.filter (fun p => ¬ D p.1 p.2)).card = R.card :=
    card_filter_add_card_filter_not _
  have h1 : (R.filter (fun p => D p.1 p.2)).card ≤ back D X := by
    apply card_le_card
    intro p hp
    simp only [hR, mem_filter, mem_product, mem_sdiff] at hp
    simp only [backSet, mem_filter, mem_product, mem_sdiff, mem_univ, true_and]
    exact ⟨⟨hp.1.1.2, hp.1.2.1⟩, hp.2⟩
  have h2 : (R.filter (fun p => ¬ D p.1 p.2)).card ≤ back D P := by
    have hinj : Set.InjOn (fun p : V × V => (p.2, p.1)) (R.filter (fun p => ¬ D p.1 p.2) : Set (V × V)) := by
      intro a _ b _ h
      simp only [Prod.mk.injEq] at h
      exact Prod.ext h.2 h.1
    refine card_le_card_of_injOn (fun p => (p.2, p.1)) ?_ hinj
    intro p hp
    simp only [hR, coe_filter, Set.mem_setOf_eq, mem_product, mem_sdiff] at hp
    obtain ⟨⟨⟨hyP, hyX⟩, ⟨hxX, hxP⟩⟩, hnot⟩ := hp
    have hne : p.1 ≠ p.2 := fun h => hxP (h ▸ hyP)
    have harc : D p.2 p.1 := (hD p.1 p.2 hne).resolve_left hnot
    show (p.2, p.1) ∈ backSet D P
    simp only [backSet, mem_filter, mem_product, mem_sdiff, mem_univ, true_and]
    exact ⟨⟨hxP, hyP⟩, harc⟩
  omega

end Digraph

/-! ### The conjugate encoding of a vertex set along the reference ordering -/

/-- Non-members of `X` strictly before `x` (zeros of the binary word preceding position `x`). -/
def zerosBefore (X : Finset V) (x : V) : ℕ := ((univ \ X).filter (· < x)).card

/-- `mu X s` = members of `X` preceded by at least `s` non-members (column heights of the Ferrers diagram). -/
def mu (X : Finset V) (s : ℕ) : ℕ := (X.filter (fun x => s ≤ zerosBefore X x)).card

lemma zerosBefore_mono (X : Finset V) {x y : V} (h : x ≤ y) : zerosBefore X x ≤ zerosBefore X y := by
  unfold zerosBefore
  apply card_le_card
  intro z hz
  simp only [mem_filter] at hz ⊢
  exact ⟨hz.1, lt_of_lt_of_le hz.2 h⟩

lemma mu_antitone (X : Finset V) {s t : ℕ} (h : s ≤ t) : mu X t ≤ mu X s := by
  unfold mu
  apply card_le_card
  intro z hz
  simp only [mem_filter] at hz ⊢
  exact ⟨hz.1, le_trans h hz.2⟩

section Digraph
variable (D : V → V → Prop) [DecidableRel D]

/-- Hyperbola inequality: for every `s`, `s · mu X s ≤ c + k` for every `k`-cut `X`. -/
theorem hyperbola (hD : Semicomplete D) {c k : ℕ} (hw : WidthLe D c) (X : Finset V) (hX : back D X ≤ k)
    (s : ℕ) : s * mu X s ≤ c + k := by
  classical
  set S := X.filter (fun x => s ≤ zerosBefore X x) with hS
  rcases S.eq_empty_or_nonempty with h0 | hne
  · have : mu X s = 0 := by simp only [mu, ← hS, h0, card_empty]
    rw [this, Nat.mul_zero]; exact Nat.zero_le _
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
    calc s * mu X s ≤ (P \ X).card * (X \ P).card := Nat.mul_le_mul hzs hos
      _ ≤ back D P + back D X := rectangle D hD P X
      _ ≤ c + k := Nat.add_le_add (hw P hlow) hX

end Digraph

/-! ### Injectivity of X ↦ (|X|, mu X) on sets satisfying the hyperbola inequality -/

lemma card_split (X : Finset V) (v : V) :
    X.card = (X.filter (· < v)).card + (if v ∈ X then 1 else 0) + (X.filter (v < ·)).card := by
  classical
  have h1 := card_filter_add_card_filter_not (s := X) (p := (· < v))
  have h2 : X.filter (fun x => ¬ x < v) = X.filter (fun x => x = v) ∪ X.filter (v < ·) := by
    ext x; simp only [mem_filter, mem_union, not_lt]
    constructor
    · rintro ⟨hx, hle⟩; rcases hle.eq_or_lt with h | h
      · exact Or.inl ⟨hx, h.symm⟩
      · exact Or.inr ⟨hx, h⟩
    · rintro (⟨hx, rfl⟩ | ⟨hx, h⟩)
      · exact ⟨hx, le_refl _⟩
      · exact ⟨hx, h.le⟩
  have hdisj : Disjoint (X.filter (fun x => x = v)) (X.filter (v < ·)) := by
    rw [disjoint_filter]; intro x _ h; rw [h]; exact lt_irrefl v
  have h3 : (X.filter (fun x => x = v)).card = if v ∈ X then 1 else 0 := by
    split_ifs with hv
    · rw [filter_eq' X v, if_pos hv, card_singleton]
    · rw [filter_eq' X v, if_neg hv, card_empty]
  rw [← h1, h2, card_union_of_disjoint hdisj, h3]; omega

/-- Core of injectivity: if the sets agree below `v`, `v ∈ X`, `v ∉ X'`, and |X| = |X'|, then
`mu X' (s0+1) ≥ mu X (s0+1) + 1` where `s0` = zeros before `v`. -/
lemma mu_gap (X X' : Finset V) (v : V) (hvX : v ∈ X) (hvX' : v ∉ X')
    (hagree : ∀ u, u < v → (u ∈ X ↔ u ∈ X')) (hcard : X.card = X'.card) :
    mu X (zerosBefore X v + 1) + 1 ≤ mu X' (zerosBefore X v + 1) := by
  classical
  set s0 := zerosBefore X v
  have hz' : zerosBefore X' v = s0 := by
    unfold s0 zerosBefore; congr 1; ext z
    simp only [mem_filter, mem_sdiff, mem_univ, true_and]
    constructor
    · rintro ⟨h, hz⟩; exact ⟨fun hx => h ((hagree z hz).1 hx), hz⟩
    · rintro ⟨h, hz⟩; exact ⟨fun hx => h ((hagree z hz).2 hx), hz⟩
  -- (a) members of X with ≥ s0+1 zeros before them lie strictly after v
  have ha : mu X (s0 + 1) ≤ (X.filter (v < ·)).card := by
    apply card_le_card; intro x hx
    simp only [mem_filter] at hx ⊢
    refine ⟨hx.1, ?_⟩
    by_contra hle; push Not at hle
    have := zerosBefore_mono X hle
    omega
  -- (b) every member of X' after v has ≥ s0+1 zeros before it (v itself is a zero of X')
  have hb : (X'.filter (v < ·)).card ≤ mu X' (s0 + 1) := by
    apply card_le_card; intro x hx
    simp only [mem_filter] at hx ⊢
    refine ⟨hx.1, ?_⟩
    have hsub : insert v ((univ \ X').filter (· < v)) ⊆ (univ \ X').filter (· < x) := by
      intro z hz
      simp only [mem_insert, mem_filter, mem_sdiff, mem_univ, true_and] at hz ⊢
      rcases hz with rfl | ⟨hzX, hzv⟩
      · exact ⟨hvX', hx.2⟩
      · exact ⟨hzX, lt_trans hzv hx.2⟩
    have hnotin : v ∉ (univ \ X').filter (· < v) := by simp
    have := card_le_card hsub
    rw [card_insert_of_notMem hnotin] at this
    unfold zerosBefore; rw [← hz']; unfold zerosBefore at *; omega
  -- (c) the parts before v coincide, so X' has one more member after v than X
  have hbefore : X.filter (· < v) = X'.filter (· < v) := by
    ext u; simp only [mem_filter]
    constructor
    · rintro ⟨h, hu⟩; exact ⟨(hagree u hu).1 h, hu⟩
    · rintro ⟨h, hu⟩; exact ⟨(hagree u hu).2 h, hu⟩
  have hc1 := card_split X v
  have hc2 := card_split X' v
  rw [if_pos hvX] at hc1
  rw [if_neg hvX'] at hc2
  rw [hbefore] at hc1
  omega

/-- If two sets with the same cardinality have the same `mu s` for all `1 ≤ s ≤ K`, and both satisfy the
hyperbola inequality `s · mu s ≤ K`, they are equal. -/
theorem eq_of_mu_eq (K : ℕ) (X X' : Finset V) (hcard : X.card = X'.card)
    (hX : ∀ s, s * mu X s ≤ K) (hX' : ∀ s, s * mu X' s ≤ K)
    (hmu : ∀ s, 1 ≤ s → s ≤ K → mu X s = mu X' s) : X = X' := by
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
  -- a contradiction from one orientation of the difference
  have key : ∀ (A B : Finset V), A.card = B.card → (∀ s, s * mu B s ≤ K) →
      (∀ s, 1 ≤ s → s ≤ K → mu A s = mu B s) → v ∈ A → v ∉ B → (∀ u, u < v → (u ∈ A ↔ u ∈ B)) → False := by
    intro A B hAB hB hAB' hvA hvB hag
    have g := mu_gap A B v hvA hvB hag hAB
    set s := zerosBefore A v + 1
    by_cases hs : s ≤ K
    · rw [hAB' s (by omega) hs] at g; omega
    · have hb := hB s
      have hpos : 1 ≤ mu B s := by omega
      have : s * 1 ≤ s * mu B s := Nat.mul_le_mul_left s hpos
      omega
  simp only [mem_union, mem_sdiff] at hv
  rcases hv with ⟨h1, h2⟩ | ⟨h1, h2⟩
  · exact key X X' hcard hX' hmu h1 h2 hagree
  · exact key X' X hcard.symm hX (fun s h1 h2 => (hmu s h1 h2).symm) h1 h2 (fun u hu => (hagree u hu).symm)

/-! ### Hyperbola partitions and the counting theorem -/

/-- Partitions under the hyperbola `x · y ≤ K`, as antitone sequences `f : Fin K → Fin (K+1)` with
`(s+1) · f s ≤ K` (entry `s` is column `s+1`; columns beyond `K` are necessarily empty). -/
def Hset (K : ℕ) : Finset (Fin K → Fin (K + 1)) :=
  univ.filter (fun f => (∀ i j : Fin K, i ≤ j → f j ≤ f i) ∧ ∀ i : Fin K, (i.val + 1) * (f i).val ≤ K)

/-- `H K` = number of integer partitions whose Ferrers diagram lies under the hyperbola `x·y ≤ K`. -/
def H (K : ℕ) : ℕ := (Hset K).card

section Digraph
variable (D : V → V → Prop) [DecidableRel D]

/-- **Theorem (k-cut counting).** If `D` is semicomplete and the reference ordering has width ≤ `c`, the number
of `k`-cuts (ordered bipartitions `(X, Xᶜ)` with at most `k` arcs from `Xᶜ` into `X`) is at most
`(|V| + 1) · H (c + k)`. -/
theorem card_kcuts_le (hD : Semicomplete D) {c : ℕ} (hw : WidthLe D c) (k : ℕ) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card ≤ (Fintype.card V + 1) * H (c + k) := by
  classical
  set K := c + k
  set C := univ.filter (fun X : Finset V => back D X ≤ k)
  have hyp : ∀ X ∈ C, ∀ s, s * mu X s ≤ K := fun X hX s =>
    hyperbola D hD hw X (by simpa [C] using hX) s
  let F : Finset V → Fin (Fintype.card V + 1) × (Fin K → Fin (K + 1)) := fun X =>
    (⟨X.card, Nat.lt_succ_of_le (card_le_univ X)⟩, fun i => ⟨min (mu X (i.val + 1)) K, by omega⟩)
  have hmuK : ∀ X ∈ C, ∀ i : Fin K, mu X (i.val + 1) ≤ K := by
    intro X hX i
    have := hyp X hX (i.val + 1)
    have h1 : 1 * mu X (i.val + 1) ≤ (i.val + 1) * mu X (i.val + 1) := Nat.mul_le_mul_right _ (by omega)
    omega
  have hmaps : ∀ X ∈ C, F X ∈ (univ : Finset (Fin (Fintype.card V + 1))) ×ˢ Hset K := by
    intro X hX
    simp only [mem_product, mem_univ, true_and, Hset, mem_filter, F]
    refine ⟨fun i j hij => ?_, fun i => ?_⟩
    · simp only [Fin.le_def]
      have := mu_antitone X (show i.val + 1 ≤ j.val + 1 by have := Fin.le_def.mp hij; omega)
      omega
    · show (i.val + 1) * min (mu X (i.val + 1)) K ≤ K
      rw [min_eq_left (hmuK X hX i)]
      exact hyp X hX (i.val + 1)
  have hinj : Set.InjOn F (C : Set (Finset V)) := by
    intro X hX Y hY hXY
    simp only [F, Prod.mk.injEq, Fin.mk.injEq] at hXY
    obtain ⟨hc, hf⟩ := hXY
    refine eq_of_mu_eq K X Y hc (hyp X hX) (hyp Y hY) (fun s hs1 hsK => ?_)
    have := congrFun hf ⟨s - 1, by omega⟩
    simp only [Fin.mk.injEq] at this
    have e : s - 1 + 1 = s := by omega
    rw [e, min_eq_left (by simpa [e] using hmuK X hX ⟨s - 1, by omega⟩),
      min_eq_left (by simpa [e] using hmuK Y hY ⟨s - 1, by omega⟩)] at this
    exact this
  calc C.card ≤ ((univ : Finset (Fin (Fintype.card V + 1))) ×ˢ Hset K).card :=
        card_le_card_of_injOn F hmaps hinj
    _ = (Fintype.card V + 1) * H K := by
        rw [card_product, card_univ, Fintype.card_fin]; rfl

/-- **Corollary.** If the reference ordering has width ≤ `k`, the number of `k`-cuts is ≤ (|V|+1) · H (2k). -/
theorem card_kcuts_le_of_width_le_k (hD : Semicomplete D) {k : ℕ} (hw : WidthLe D k) :
    (univ.filter (fun X : Finset V => back D X ≤ k)).card ≤ (Fintype.card V + 1) * H (2 * k) := by
  have := card_kcuts_le D hD hw k
  rwa [show k + k = 2 * k by omega] at this

end Digraph

/-! ### Sanity checks of `H` against independently computed values (OEIS-free, by the Python DP) -/

example : H 0 = 1 := by decide
example : H 1 = 2 := by decide
example : H 2 = 5 := by decide
example : H 3 = 10 := by decide

end Westfall040
