import Westfall022.AutoCut
import Mathlib.Combinatorics.Colex

/-!
# Mission 023, Phase 2: a deterministic, executable AutoCut and its refinement theorems

The verified specification (`Recovery*.lean`, `AutoCut.lean`) leaves three tie-breaks to
`Classical.choose` (`argPred`, `bestCand`, `dpLast`) and finds the accepting round with
`Nat.find`. Everything else (`reachable`, `nodes`, `dist`, `cutDP`, `K0`, `candVal`) is an
ordinary computable definition. This module replaces each non-executable step:

* `selMinSet`  — minimising predecessor; ties broken by the **colexicographic** order on sets;
* `selMaxV`    — maximising last vertex of the DP; ties broken by the **least vertex index**;
* `selCand`    — minimising `(τ, b)`; ties broken by `(τ as WithTop ℚ, b)` lexicographically;
* `firstAccept` — the doubling schedule `k = 2^0, 2^1, …, 2^(2n)` as a bounded loop
  (round `2n` always suffices because `λ(A) ≤ n² ≤ 4ⁿ`, `lam_le_sq`);
* `pcumGuard`  — the Stage 1 abort test, evaluated as `card > (n+1)(3k+1) ∧ card > (n+1)P(3k)`,
  which is equivalent to the original test because `P(M) ≥ M+1` (`succ_le_Pcum`), and avoids
  enumerating partitions when the family is small.

**Refinement theorems** (bottom of the file):
* `recognizeX_isSome` — the executable recogniser accepts exactly when the specification does;
* `partition_recoveryX_sound/complete/minimal` — the same guarantees as Theorem 3;
* `autoCutX_correct` — on every skew matrix, `autoCutX` returns some result whose value is `OPT`,
  whose ordering attains `OPT`, whose partition attains `λ(A)`, and whose round and value
  coincide with those of the verified specification `autoCut`.

**Scope.** This is executable, deterministic code, but `dist` and `cutDP` are plain recursions
without memoisation, so evaluating them is exponential-time. It refines the specification; it is
NOT an implementation with the manuscript's running time (see `Complexity.lean`).
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-! ## Deterministic selectors -/

/-- A minimiser of `f` over a nonempty family of sets, ties broken by the colex order. -/
def selMinSet (s : Finset (Finset (Fin n))) (f : Finset (Fin n) → WithTop ℚ) (h : s.Nonempty) :
    Finset (Fin n) :=
  ofColex (((s.filter (fun C => f C = s.inf' h f)).image toColex).min' (by
    obtain ⟨C, hC, hCeq⟩ := Finset.exists_mem_eq_inf' h f
    exact ⟨toColex C, Finset.mem_image.mpr ⟨C, Finset.mem_filter.mpr ⟨hC, hCeq.symm⟩, rfl⟩⟩))

theorem selMinSet_spec (s : Finset (Finset (Fin n))) (f : Finset (Fin n) → WithTop ℚ)
    (h : s.Nonempty) : selMinSet s f h ∈ s ∧ ∀ C ∈ s, f (selMinSet s f h) ≤ f C := by
  unfold selMinSet
  set T := (s.filter (fun C => f C = s.inf' h f)).image toColex
  have hT : T.Nonempty := by
    obtain ⟨C, hC, hCeq⟩ := Finset.exists_mem_eq_inf' h f
    exact ⟨toColex C, Finset.mem_image.mpr ⟨C, Finset.mem_filter.mpr ⟨hC, hCeq.symm⟩, rfl⟩⟩
  obtain ⟨C, hC, hCm⟩ := Finset.mem_image.mp (T.min'_mem hT)
  have hC' := Finset.mem_filter.mp hC
  have hsel : ofColex (T.min' hT) = C := by rw [← hCm]; rfl
  rw [hsel]
  exact ⟨hC'.1, fun C₂ hC₂ => hC'.2 ▸ Finset.inf'_le f hC₂⟩

/-- A maximiser of `f` over a nonempty set of vertices, ties broken by the least index. -/
def selMaxV (S : Finset (Fin n)) (f : Fin n → WithBot ℚ) (h : S.Nonempty) : Fin n :=
  (S.filter (fun v => f v = S.sup' h f)).min' (by
    obtain ⟨v, hv, hveq⟩ := Finset.exists_mem_eq_sup' h f
    exact ⟨v, Finset.mem_filter.mpr ⟨hv, hveq.symm⟩⟩)

theorem selMaxV_spec (S : Finset (Fin n)) (f : Fin n → WithBot ℚ) (h : S.Nonempty) :
    selMaxV S f h ∈ S ∧ ∀ w ∈ S, f w ≤ f (selMaxV S f h) := by
  unfold selMaxV
  have hm := Finset.min'_mem (S.filter (fun v => f v = S.sup' h f)) (by
    obtain ⟨v, hv, hveq⟩ := Finset.exists_mem_eq_sup' h f
    exact ⟨v, Finset.mem_filter.mpr ⟨hv, hveq.symm⟩⟩)
  have hm' := Finset.mem_filter.mp hm
  exact ⟨hm'.1, fun w hw => (Finset.le_sup' f hw).trans (le_of_eq hm'.2.symm)⟩

/-- Computable copy of `candVal` (the baseline marks it `noncomputable`; it is not). -/
def candValX (A : WMat n) (k : ℕ) (q : Option ℚ × ℕ) : WithTop ℕ :=
  if h : dist A k q.1 q.2 univ = ⊤ then ⊤
  else ((q.2 ^ 2 + 3 * ⌊(dist A k q.1 q.2 univ).untop h⌋₊ : ℕ) : WithTop ℕ)

theorem candValX_eq (A : WMat n) (k : ℕ) : candValX A k = candVal A k := rfl

/-- Computable copy of `recogVal`. -/
def recogValX (A : WMat n) (k : ℕ) : WithTop ℕ := (candidates A k).inf (candValX A k)

theorem recogValX_eq (A : WMat n) (k : ℕ) : recogValX A k = recogVal A k := rfl

/-- Lexicographic key on candidates: `τ` as an element of `WithTop ℚ` (`none = ∞`), then `b`. -/
def candKey (q : Option ℚ × ℕ) : WithTop ℚ ×ₗ ℕ := toLex ((q.1 : WithTop ℚ), q.2)

theorem candKey_injective : Function.Injective (candKey) := by
  intro q q' h
  have h' := congrArg ofLex h
  simp only [candKey, ofLex_toLex, Prod.mk.injEq] at h'
  exact Prod.ext h'.1 h'.2

/-- A minimising candidate, ties broken by `candKey`. -/
def selCand (A : WMat n) (k : ℕ) : Option ℚ × ℕ :=
  let s := candidates A k
  let ties := s.filter (fun q => candValX A k q = s.inf' (candidates_nonempty A k) (candValX A k))
  let m := (ties.image candKey).min' (by
    obtain ⟨q, hq, hqeq⟩ := Finset.exists_mem_eq_inf' (candidates_nonempty A k) (candValX A k)
    exact ⟨candKey q, Finset.mem_image.mpr ⟨q, Finset.mem_filter.mpr ⟨hq, hqeq.symm⟩, rfl⟩⟩)
  ((ofLex m).1, (ofLex m).2)

theorem selCand_spec (A : WMat n) (k : ℕ) :
    selCand A k ∈ candidates A k ∧ candVal A k (selCand A k) = recogVal A k := by
  set s := candidates A k
  set ties := s.filter (fun q => candValX A k q = s.inf' (candidates_nonempty A k) (candValX A k))
  have hT : (ties.image candKey).Nonempty := by
    obtain ⟨q, hq, hqeq⟩ := Finset.exists_mem_eq_inf' (candidates_nonempty A k) (candValX A k)
    exact ⟨candKey q, Finset.mem_image.mpr ⟨q, Finset.mem_filter.mpr ⟨hq, hqeq.symm⟩, rfl⟩⟩
  obtain ⟨q, hq, hqm⟩ := Finset.mem_image.mp ((ties.image candKey).min'_mem hT)
  have hq' := Finset.mem_filter.mp hq
  have hsel : selCand A k = q := by
    have : selCand A k = ((ofLex ((ties.image candKey).min' hT)).1,
        (ofLex ((ties.image candKey).min' hT)).2) := rfl
    rw [this, ← hqm]; rfl
  rw [hsel]
  refine ⟨hq'.1, ?_⟩
  rw [← candValX_eq, hq'.2, recogVal, Finset.inf'_eq_inf]; rfl

/-! ## Executable recovery -/

/-- Deterministic minimising predecessor. -/
def argPredX (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' : Finset (Fin n))
    (h : (preds A k b C').Nonempty) : Finset (Fin n) :=
  selMinSet (preds A k b C') (stepVal A k τ b C') h

theorem argPredX_spec (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' : Finset (Fin n))
    (h : (preds A k b C').Nonempty) :
    argPredX A k τ b C' h ∈ preds A k b C' ∧
      ∀ C ∈ preds A k b C', stepVal A k τ b C' (argPredX A k τ b C' h) ≤ stepVal A k τ b C' C :=
  selMinSet_spec _ _ h

/-- Deterministic path extraction. -/
def extractX (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' : Finset (Fin n)) :
    ℕ × (Fin n → ℕ) :=
  if h : (preds A k b C').Nonempty then
    let C := argPredX A k τ b C' h
    let r := extractX A k τ b C
    (r.1 + 1, fun v => if v ∈ C then r.2 v else r.1)
  else (0, fun _ => 0)
termination_by C'.card
decreasing_by exact card_lt_of_mem_preds (argPredX_spec A k τ b C' h).1

theorem extractX_spec (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) :
    ∀ (s : ℕ) (C' : Finset (Fin n)), C'.card = s → dist A k τ b C' ≠ ⊤ →
      (extractX A k τ b C').1 ≤ C'.card ∧
      (∀ v ∈ C', (extractX A k τ b C').2 v < (extractX A k τ b C').1) ∧
      (∀ j, (C'.filter (fun v => (extractX A k τ b C').2 v = j)).card ≤ b) ∧
      dist A k τ b C' = (labelCost A τ C' (extractX A k τ b C').2 : WithTop ℚ) := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
  intro C' hcard hfin
  by_cases hne : C' = ∅
  · subst hne
    rw [extractX]
    have hp : ¬ (preds A k b (∅ : Finset (Fin n))).Nonempty := by
      rintro ⟨C, hC⟩
      exact Finset.not_ssubset_empty C (Finset.mem_filter.mp hC).2.1
    simp only [hp, dite_false]
    refine ⟨by simp, by simp, by intro j; simp, ?_⟩
    rw [dist_empty]; simp [labelCost]
  · have hnode : C' ∈ nodes A k := by
      by_contra h; exact hfin (dist_of_not_mem A k τ b hne h)
    have hd := dist_of_mem A k τ b hne hnode
    have hpne : (preds A k b C').Nonempty := by
      by_contra h
      rw [Finset.not_nonempty_iff_eq_empty] at h
      rw [hd, h, Finset.inf_empty] at hfin; exact hfin rfl
    obtain ⟨hCmem, hCmin⟩ := argPredX_spec A k τ b C' hpne
    set C := argPredX A k τ b C' hpne with hCdef
    have hCsub : C ⊂ C' := (Finset.mem_filter.mp hCmem).2.1
    have hYb : (C' \ C).card ≤ b := (Finset.mem_filter.mp hCmem).2.2
    have hdC : dist A k τ b C' = stepVal A k τ b C' C := by
      rw [hd]
      apply le_antisymm
      · exact Finset.inf_le hCmem
      · exact Finset.le_inf (fun C₂ hC₂ => hCmin C₂ hC₂)
    have hfinC : dist A k τ b C ≠ ⊤ := by
      intro htop; apply hfin; rw [hdC, stepVal, htop]; rfl
    obtain ⟨ih1, ih2, ih3, ih4⟩ := ih C.card (hcard ▸ Finset.card_lt_card hCsub) C rfl hfinC
    set m := (extractX A k τ b C).1
    set g := (extractX A k τ b C).2
    have hext : extractX A k τ b C' = (m + 1, fun v => if v ∈ C then g v else m) := by
      rw [extractX]; simp only [hpne, dite_true]; rfl
    rw [hext]
    simp only
    refine ⟨?_, ?_, ?_, ?_⟩
    · have := Finset.card_lt_card hCsub; omega
    · intro v hv
      by_cases hvC : v ∈ C
      · simp only [hvC, if_true]; have := ih2 v hvC; omega
      · simp [hvC]
    · intro j
      by_cases hj : j = m
      · subst hj
        refine le_trans (Finset.card_le_card ?_) hYb
        intro v hv
        simp only [Finset.mem_filter] at hv
        rw [Finset.mem_sdiff]
        refine ⟨hv.1, fun hvC => ?_⟩
        simp only [hvC, if_true] at hv; have := ih2 v hvC; omega
      · refine le_trans (Finset.card_le_card ?_) (ih3 j)
        intro v hv
        simp only [Finset.mem_filter] at hv ⊢
        by_cases hvC : v ∈ C
        · simp only [hvC, if_true] at hv; exact ⟨hvC, hv.2⟩
        · simp only [hvC, if_false] at hv; exact absurd hv.2.symm hj
    · rw [hdC, stepVal, ih4, ← WithTop.coe_add]
      congr 1
      unfold labelCost edgeCost
      set g' : Fin n → ℕ := fun v => if v ∈ C then g v else m
      have hlt : ∀ v ∈ C, g v < m := ih2
      have h1 : ∀ u ∈ C, (∑ v ∈ C', if g' u < g' v then phi τ (A u v) else 0) =
          (∑ v ∈ C, if g u < g v then phi τ (A u v) else 0) + ∑ v ∈ C' \ C, phi τ (A u v) := by
        intro u hu
        rw [← Finset.sum_sdiff hCsub.1, add_comm]
        congr 1
        · refine Finset.sum_congr rfl (fun v hv => ?_)
          simp [g', hu, hv]
        · refine Finset.sum_congr rfl (fun v hv => ?_)
          have hvC : v ∉ C := (Finset.mem_sdiff.mp hv).2
          simp [g', hu, hvC, hlt u hu]
      have h2 : ∀ u ∈ C' \ C, (∑ v ∈ C', if g' u < g' v then phi τ (A u v) else 0) = 0 := by
        intro u hu
        have huC : u ∉ C := (Finset.mem_sdiff.mp hu).2
        apply Finset.sum_eq_zero
        intro v _
        by_cases hvC : v ∈ C
        · have := hlt v hvC; simp [g', huC, hvC]; omega
        · simp [g', huC, hvC]
      rw [← Finset.sum_sdiff hCsub.1, Finset.sum_congr rfl h2, Finset.sum_const_zero, zero_add,
        Finset.sum_congr rfl h1, Finset.sum_add_distrib]

theorem lamB_extractX_le (A : WMat n) (k : ℕ) (q : Option ℚ × ℕ) (hq : q ∈ candidates A k)
    (hfin : dist A k q.1 q.2 univ ≠ ⊤) :
    ((lamB A (partOf (extractX A k q.1 q.2 univ).2) : ℕ) : WithTop ℕ) ≤ candVal A k q := by
  obtain ⟨h1, h2, h3, h4⟩ := extractX_spec A k q.1 q.2 n univ (by simp) hfin
  set g := (extractX A k q.1 q.2 univ).2
  have hg : ∀ v, g v < n := by
    intro v
    have := h2 v (Finset.mem_univ v)
    simp only [Finset.card_univ, Fintype.card_fin] at h1
    omega
  have hb : bmax (partOf g) ≤ q.2 := bmax_partOf_le g hg q.2 h3
  have hcost : (dist A k q.1 q.2 univ).untop hfin = costPartition A (partOf g) q.1 := by
    rw [← labelCost_univ_eq A q.1 g hg]
    apply WithTop.coe_injective
    rw [WithTop.coe_untop]; exact h4
  have hK : K0 A (partOf g) ≤ ⌊costPartition A (partOf g) q.1⌋₊ := by
    rcases hτ : q.1 with _ | t
    · rw [floor_costPartition_none]; exact K0_le_valInf A _
    · have ht : 0 < t := by
        apply tau_pos_of_mem (A := A)
        rw [← hτ]; exact (Finset.mem_product.mp hq).1
      rw [floor_costPartition_some A _ ht]; exact K0_le_valFin A _ ht
  unfold candVal
  rw [dif_neg hfin, hcost]
  apply WithTop.coe_le_coe.mpr
  unfold lamB
  exact Nat.add_le_add (Nat.pow_le_pow_left hb 2) (Nat.mul_le_mul_left 3 hK)

/-! ## Stage 1 abort test, evaluated cheaply -/

theorem succ_le_Pcum (M : ℕ) : M + 1 ≤ Pcum M := by
  unfold Pcum
  calc M + 1 = ∑ j ∈ range (M + 1), 1 := by simp
    _ ≤ _ := Finset.sum_le_sum (fun j _ => Fintype.card_pos)

/-- The abort test `card > (n+1)·P(3k)`, short-circuited by the cheap lower bound
`(n+1)(3k+1) ≤ (n+1)·P(3k)`. -/
def pcumGuard (n c k : ℕ) : Bool :=
  decide (c > (n + 1) * (3 * k + 1)) && decide (c > (n + 1) * Pcum (3 * k))

theorem pcumGuard_iff (n c k : ℕ) : pcumGuard n c k = true ↔ c > (n + 1) * Pcum (3 * k) := by
  unfold pcumGuard
  simp only [Bool.and_eq_true, decide_eq_true_eq]
  constructor
  · exact fun h => h.2
  · intro h
    refine ⟨lt_of_le_of_lt (Nat.mul_le_mul_left _ (succ_le_Pcum _)) h, h⟩

/-- **The executable partition-recovery procedure.** -/
def recognizeX (A : WMat n) (k : ℕ) : Option (OrdPart n) :=
  if pcumGuard n (reachable A k).card k then none
  else if recogValX A k ≤ (k : WithTop ℕ) then
    some (partOf (extractX A k (selCand A k).1 (selCand A k).2 univ).2)
  else none

/-- Refinement: the executable recogniser accepts exactly when the specification does. -/
theorem recognizeX_isSome (A : WMat n) (k : ℕ) :
    (recognizeX A k).isSome = (recognize A k).isSome := by
  unfold recognizeX recognize
  rw [recogValX_eq]
  by_cases h1 : (reachable A k).card > (n + 1) * Pcum (3 * k)
  · have : pcumGuard n (reachable A k).card k = true := (pcumGuard_iff _ _ _).mpr h1
    simp [this, h1]
  · have : pcumGuard n (reachable A k).card k = false := by
      cases hg : pcumGuard n (reachable A k).card k
      · rfl
      · exact absurd ((pcumGuard_iff _ _ _).mp hg) h1
    simp only [this, h1, if_false, Bool.false_eq_true]
    split_ifs <;> rfl

theorem partition_recoveryX_sound (A : WMat n) (k : ℕ) (B : OrdPart n)
    (h : recognizeX A k = some B) : lamB A B ≤ k ∧ lam A ≤ k := by
  unfold recognizeX at h
  rw [recogValX_eq] at h
  split_ifs at h with h1 h2
  obtain ⟨hmem, hval⟩ := selCand_spec A k
  have hfin : dist A k (selCand A k).1 (selCand A k).2 univ ≠ ⊤ := by
    intro htop
    have : candVal A k (selCand A k) = ⊤ := by simp [candVal, htop]
    rw [hval] at this; rw [this] at h2; exact absurd h2 (by simp)
  have hle := lamB_extractX_le A k (selCand A k) hmem hfin
  rw [hval] at hle
  have hB : lamB A B ≤ k := by
    rw [Option.some.injEq] at h; rw [← h]
    exact WithTop.coe_le_coe.mp (le_trans hle h2)
  exact ⟨hB, (lam_le_lamB A B).trans hB⟩

theorem partition_recoveryX_complete (A : WMat n) (hA : IsSkew A) (k : ℕ) (hk : lam A ≤ k) :
    ∃ B, recognizeX A k = some B := by
  obtain ⟨B, hB⟩ := partition_recovery_complete A hA k hk
  have h := recognizeX_isSome A k
  rw [hB] at h
  exact Option.isSome_iff_exists.mp (by rw [h]; rfl)

theorem partition_recoveryX_minimal (A : WMat n) (hA : IsSkew A) (k : ℕ) (B : OrdPart n)
    (h : recognizeX A k = some B) : lamB A B = lam A := by
  obtain ⟨-, hk⟩ := partition_recoveryX_sound A k B h
  apply le_antisymm _ (lam_le_lamB A B)
  unfold recognizeX at h
  rw [recogValX_eq] at h
  split_ifs at h with h1 h2
  obtain ⟨hmem, hval⟩ := selCand_spec A k
  have hfin : dist A k (selCand A k).1 (selCand A k).2 univ ≠ ⊤ := by
    intro htop
    have : candVal A k (selCand A k) = ⊤ := by simp [candVal, htop]
    rw [hval] at this; rw [this] at h2; exact absurd h2 (by simp)
  have hle := lamB_extractX_le A k (selCand A k) hmem hfin
  rw [hval] at hle
  rw [Option.some.injEq] at h; rw [← h]
  exact WithTop.coe_le_coe.mp (le_trans hle (recogVal_le_lam A hA k hk))

/-! ## Executable ordering extraction -/

def dpLastX (A : WMat n) (k : ℕ) (S : Finset (Fin n)) (h : S.Nonempty) : Fin n :=
  selMaxV S (fun v => cutDP A k (S.erase v) + (gain A (S.erase v) v : WithBot ℚ)) h

theorem dpLastX_spec (A : WMat n) (k : ℕ) (S : Finset (Fin n)) (h : S.Nonempty) :
    dpLastX A k S h ∈ S ∧ ∀ w ∈ S,
      cutDP A k (S.erase w) + (gain A (S.erase w) w : WithBot ℚ) ≤
        cutDP A k (S.erase (dpLastX A k S h)) +
          (gain A (S.erase (dpLastX A k S h)) (dpLastX A k S h) : WithBot ℚ) :=
  selMaxV_spec _ _ h

def dpOrderX (A : WMat n) (k : ℕ) (S : Finset (Fin n)) : Equiv.Perm (Fin n) :=
  if h : S.Nonempty then
    extendPerm (dpOrderX A k (S.erase (dpLastX A k S h))) (S.card - 1) (dpLastX A k S h)
  else Equiv.refl _
termination_by S.card
decreasing_by exact Finset.card_erase_lt_of_mem (selMaxV_spec _ _ h).1

theorem dpOrderX_spec (A : WMat n) (k : ℕ) :
    ∀ (s : ℕ) (S : Finset (Fin n)), S.card = s → cutDP A k S ≠ ⊥ →
      prefixSet (dpOrderX A k S) s = S ∧
        ((partialObj A (dpOrderX A k S) s : ℚ) : WithBot ℚ) = cutDP A k S := by
  intro s
  induction s with
  | zero =>
    intro S hS _
    have hS0 : S = ∅ := Finset.card_eq_zero.mp hS
    subst hS0
    have hord : dpOrderX A k (∅ : Finset (Fin n)) = Equiv.refl _ := by
      rw [dpOrderX]; simp
    rw [hord, cutDP_empty, partialObj_zero]
    refine ⟨by ext v; simp [prefixSet], rfl⟩
  | succ s ih =>
    intro S hS hfin
    have hne : S.Nonempty := Finset.card_pos.mp (by omega)
    have hSne : S ≠ ∅ := Finset.nonempty_iff_ne_empty.mp hne
    have hk : weakMajorityCut A S ≤ k := by
      by_contra hk; apply hfin; rw [cutDP]; simp [hSne, hk]
    obtain ⟨hvS, hvmax⟩ := dpLastX_spec A k S hne
    set v := dpLastX A k S hne
    have hval : cutDP A k S = cutDP A k (S.erase v) + (gain A (S.erase v) v : WithBot ℚ) := by
      rw [cutDP_of_ne A k hSne hk]
      apply le_antisymm
      · exact Finset.sup_le (fun w _ => hvmax w.1 w.2)
      · exact Finset.le_sup (f := fun w : {x // x ∈ S} =>
          cutDP A k (S.erase w.1) + (gain A (S.erase w.1) w.1 : WithBot ℚ))
          (Finset.mem_attach S ⟨v, hvS⟩)
    have hcard : (S.erase v).card = s := by rw [Finset.card_erase_of_mem hvS, hS]; rfl
    have hfin' : cutDP A k (S.erase v) ≠ ⊥ := by
      intro hbot; apply hfin; rw [hval, hbot]; rfl
    obtain ⟨ih1, ih2⟩ := ih (S.erase v) hcard hfin'
    have hsn : s < n := by
      have := Finset.card_le_univ S; simp only [Fintype.card_fin] at this; omega
    have hord : dpOrderX A k S = extendPerm (dpOrderX A k (S.erase v)) s v := by
      rw [dpOrderX, dif_pos hne, hS]; rfl
    have hvnot : v ∉ prefixSet (dpOrderX A k (S.erase v)) s := by
      rw [ih1]; exact Finset.notMem_erase v S
    obtain ⟨e1, e2⟩ := extendPerm_spec A (dpOrderX A k (S.erase v)) s hsn v hvnot
    rw [hord]
    refine ⟨?_, ?_⟩
    · rw [e1, ih1, Finset.insert_erase hvS]
    · rw [e2, WithBot.coe_add, ih2, ih1, hval]

/-! ## Bounded doubling schedule -/

/-- The one-block partition gives `λ(A) ≤ n²`. -/
theorem lam_le_sq (A : WMat n) : lam A ≤ n ^ 2 := by
  by_cases hn : n = 0
  · subst hn
    refine le_trans (lam_le_lamB A id) (le_of_eq ?_)
    simp [lamB, bmax, K0, thresholds, valInf, Nneg, crossPairs, block]
  · set B0 : OrdPart n := fun _ => ⟨0, Nat.pos_of_ne_zero hn⟩
    have hcross : crossPairs B0 = ∅ := by
      ext p; simp [crossPairs, B0]
    have hK : K0 A B0 = 0 := by
      simp [K0, thresholds, valInf, Nneg, hcross]
    have hb : bmax B0 ≤ n := by
      unfold bmax
      apply Finset.sup_le
      intro k _
      have := Finset.card_le_univ (block B0 k)
      simpa using this
    refine le_trans (lam_le_lamB A B0) ?_
    unfold lamB; rw [hK]
    simpa using Nat.pow_le_pow_left hb 2

theorem sq_le_four_pow (n : ℕ) : n ^ 2 ≤ 2 ^ (2 * n) := by
  rw [pow_mul, show (2 : ℕ) ^ 2 = 4 by norm_num]
  have h := (Nat.lt_two_pow_self (n := n)).le
  calc n ^ 2 ≤ (2 ^ n) ^ 2 := Nat.pow_le_pow_left h 2
    _ = 4 ^ n := by rw [← pow_mul, mul_comm, pow_mul]; norm_num

/-- `firstAccept A fuel j`: the first round `j, j+1, …, j+fuel-1` whose recogniser accepts. -/
def firstAccept (A : WMat n) : ℕ → ℕ → Option ℕ
  | 0, _ => none
  | fuel + 1, j => if (recognizeX A (2 ^ j)).isSome then some j else firstAccept A fuel (j + 1)

theorem firstAccept_spec (A : WMat n) :
    ∀ fuel j r, firstAccept A fuel j = some r →
      j ≤ r ∧ (recognizeX A (2 ^ r)).isSome ∧ ∀ i, j ≤ i → i < r → ¬ (recognizeX A (2 ^ i)).isSome := by
  intro fuel
  induction fuel with
  | zero => intro j r h; simp [firstAccept] at h
  | succ fuel ih =>
    intro j r h
    unfold firstAccept at h
    split_ifs at h with hj
    · rw [Option.some.injEq] at h; subst h
      exact ⟨le_rfl, hj, fun i h1 h2 => absurd h2 (not_lt.mpr h1)⟩
    · obtain ⟨a, b, c⟩ := ih (j + 1) r h
      refine ⟨by omega, b, fun i h1 h2 => ?_⟩
      rcases Nat.eq_or_lt_of_le h1 with rfl | h1'
      · simpa using hj
      · exact c i (by omega) h2

theorem firstAccept_isSome (A : WMat n) :
    ∀ fuel j i, j ≤ i → i < j + fuel → (recognizeX A (2 ^ i)).isSome →
      (firstAccept A fuel j).isSome := by
  intro fuel
  induction fuel with
  | zero => intro j i h1 h2; omega
  | succ fuel ih =>
    intro j i h1 h2 hi
    unfold firstAccept
    split_ifs with hj
    · rfl
    · rcases Nat.eq_or_lt_of_le h1 with rfl | h1'
      · exact absurd hi hj
      · exact ih (j + 1) i (by omega) (by omega) hi

/-- **Executable AutoCut.** Returns `(f_k(V), ordering, partition, k)`, or `none` if no round
`k = 2^0, …, 2^(2n)` accepts (impossible for skew matrices, `autoCutX_correct`). -/
def autoCutX (A : WMat n) : Option (WithBot ℚ × Equiv.Perm (Fin n) × OrdPart n × ℕ) :=
  match firstAccept A (2 * n + 1) 0 with
  | none => none
  | some j =>
    match recognizeX A (2 ^ j) with
    | none => none
    | some B => some (cutDP A (2 ^ j) univ, dpOrderX A (2 ^ j) univ, B, 2 ^ j)

/-- **Refinement theorem for AutoCut.** On every skew matrix the executable algorithm returns a
result; its value is `OPT(A)`, its ordering attains `OPT(A)`, its partition attains `λ(A)`, its
threshold satisfies `λ(A) ≤ k` and (`k = 1` or `k < 2λ(A)`), and its round and value coincide
with those of the verified specification `autoCut`. -/
theorem autoCutX_correct (A : WMat n) (hA : IsSkew A) :
    ∃ r, autoCutX A = some r ∧
      r.1 = (OPT A : WithBot ℚ) ∧ objective A r.2.1 = OPT A ∧ lamB A r.2.2.1 = lam A ∧
      lam A ≤ r.2.2.2 ∧ (r.2.2.2 = 1 ∨ r.2.2.2 < 2 * lam A) ∧
      r.2.2.2 = (autoCut A hA).2.2.2 ∧ r.1 = (autoCut A hA).1 := by
  -- round `2n` accepts, so the bounded loop finds a round
  have hacc2n : (recognizeX A (2 ^ (2 * n))).isSome := by
    obtain ⟨B, hB⟩ := partition_recoveryX_complete A hA (2 ^ (2 * n))
      ((lam_le_sq A).trans (sq_le_four_pow n))
    rw [hB]; rfl
  have hsome := firstAccept_isSome A (2 * n + 1) 0 (2 * n) (Nat.zero_le _) (by omega) hacc2n
  obtain ⟨j, hj⟩ := Option.isSome_iff_exists.mp hsome
  obtain ⟨-, hjacc, hjmin⟩ := firstAccept_spec A _ _ _ hj
  obtain ⟨B, hB⟩ := Option.isSome_iff_exists.mp hjacc
  -- the round coincides with the specification's `Nat.find`
  have hround : autoCutRound A hA = j := by
    unfold autoCutRound
    rw [Nat.find_eq_iff]
    refine ⟨by rw [← recognizeX_isSome]; exact hjacc, fun i hi => ?_⟩
    rw [← recognizeX_isSome]; exact hjmin i (Nat.zero_le _) hi
  set k := 2 ^ j
  obtain ⟨hBk, hlamk⟩ := partition_recoveryX_sound A k B hB
  have hval : cutDP A k univ = OPT A := cutDP_exact_of_lamB_le A hA k B hBk
  have hspec := autoCut_correct A hA
  simp only at hspec
  obtain ⟨-, -, -, -, hk2⟩ := hspec
  have hkspec : (autoCut A hA).2.2.2 = k := by
    show 2 ^ autoCutRound A hA = k; rw [hround]
  refine ⟨(cutDP A k univ, dpOrderX A k univ, B, k), ?_, hval, ?_,
    partition_recoveryX_minimal A hA k B hB, hlamk, ?_, hkspec.symm, ?_⟩
  · unfold autoCutX
    rw [hj]
    simp only
    rw [hB]
  · have hne : cutDP A k univ ≠ ⊥ := by rw [hval]; exact WithBot.coe_ne_bot
    obtain ⟨-, h2⟩ := dpOrderX_spec A k n univ (by simp) hne
    rw [hval, partialObj_n] at h2
    exact WithBot.coe_injective h2
  · rw [← hkspec]; exact hk2
  · show cutDP A k univ = cutDP A (2 ^ autoCutRound A hA) univ
    rw [hround]

end Westfall022
