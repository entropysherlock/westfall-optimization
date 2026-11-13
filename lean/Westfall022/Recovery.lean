import Westfall022.CutDP

/-!
# Discovery 022, Theorem 3: the partition-recovery procedure (Stage C)

The procedure of the manuscript (Section C, proof of Theorem 3):

* **Stage 1.** Generate the reachable `k`-cuts `𝒞_k` layer by layer (`reachLayer`).
* **Stage 2.** Let `𝒩 ⊆ 𝒞_k` be the sets with weak cut `≤ ⌊k/3⌋` (`nodes`). For every threshold
  `τ` (each positive entry of `A`, or `∞`) and every block cap `b ≤ ⌊√k⌋`, compute the shortest
  path from `∅` to `V` in the DAG on `𝒩` with an edge `C → C'` when `C ⊂ C'` and
  `|C' ∖ C| ≤ b`, of length `Σ_{u ∈ C, v ∈ C' ∖ C} φ_τ(a_uv)` (`dist`), where
  `φ_τ(c) = 1 + |c|/τ` if `c < 0`, `1` if `0 ≤ c < τ`, `0` otherwise, and `φ_∞ ≡ 1`.
  Report `b² + 3⌊dist(V)⌋` and the partition read off a minimising path (`extract`).

The shortest path is computed by the Bellman recursion over *nodes* (pairs of nodes), never by
enumerating ordered partitions. Ties between minimising predecessors are broken by an
arbitrary choice (`Classical.choose`); the manuscript specifies no tie-break and the theorems
hold for every choice.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-! ## Stage 1: reachable `k`-cuts -/

/-- Layer `s` of `𝒞_k`: sets of size `s` reachable from `∅` by adding one vertex at a time
through weak-majority `k`-cuts. -/
def reachLayer (A : WMat n) (k : ℕ) : ℕ → Finset (Finset (Fin n))
  | 0 => {∅}
  | s + 1 => ((reachLayer A k s).biUnion (fun S => univ.image (fun v => insert v S))).filter
      (fun T => T.card = s + 1 ∧ weakMajorityCut A T ≤ k)

/-- `𝒞_k`: all reachable `k`-cuts. -/
def reachable (A : WMat n) (k : ℕ) : Finset (Finset (Fin n)) :=
  (range (n + 1)).biUnion (reachLayer A k)

/-- `𝒩`: reachable `k`-cuts with weak cut at most `⌊k/3⌋`. -/
def nodes (A : WMat n) (k : ℕ) : Finset (Finset (Fin n)) :=
  (reachable A k).filter (fun S => weakMajorityCut A S ≤ k / 3)

theorem card_of_mem_reachLayer (A : WMat n) (k : ℕ) :
    ∀ s, ∀ S ∈ reachLayer A k s, S.card = s := by
  intro s
  cases s with
  | zero => intro S hS; simp [reachLayer] at hS; simp [hS]
  | succ s => intro S hS; exact (Finset.mem_filter.mp hS).2.1

theorem empty_mem_reachable (A : WMat n) (k : ℕ) : (∅ : Finset (Fin n)) ∈ reachable A k := by
  simp only [reachable, Finset.mem_biUnion, Finset.mem_range]
  exact ⟨0, Nat.succ_pos _, by simp [reachLayer]⟩

theorem insert_mem_reachable (A : WMat n) (k : ℕ) {S : Finset (Fin n)} (hS : S ∈ reachable A k)
    {v : Fin n} (hv : v ∉ S) (hcut : weakMajorityCut A (insert v S) ≤ k) :
    insert v S ∈ reachable A k := by
  simp only [reachable, Finset.mem_biUnion, Finset.mem_range] at hS ⊢
  obtain ⟨s, -, hs⟩ := hS
  have hcard := card_of_mem_reachLayer A k s S hs
  have hle : (insert v S).card ≤ n := by
    have := Finset.card_le_univ (insert v S); simpa using this
  refine ⟨s + 1, ?_, ?_⟩
  · rw [Finset.card_insert_of_notMem hv] at hle; omega
  · simp only [reachLayer, Finset.mem_filter, Finset.mem_biUnion, Finset.mem_image,
      Finset.mem_univ, true_and]
    exact ⟨⟨S, hs, v, rfl⟩, by rw [Finset.card_insert_of_notMem hv, hcard], hcut⟩

/-- Every member of `𝒞_k` is a `k`-cut. -/
theorem cut_le_of_mem_reachable (A : WMat n) (k : ℕ) {S : Finset (Fin n)}
    (hS : S ∈ reachable A k) : weakMajorityCut A S ≤ k := by
  simp only [reachable, Finset.mem_biUnion] at hS
  obtain ⟨s, -, hs⟩ := hS
  cases s with
  | zero => simp [reachLayer] at hs; subst hs; simp [weakMajorityCut]
  | succ s => exact (Finset.mem_filter.mp hs).2.2

/-! ## Stage 2: threshold costs and the Bellman recursion -/

/-- `φ_τ(c)`; `τ = none` encodes `τ = ∞`. -/
def phi (τ : Option ℚ) (c : ℚ) : ℚ :=
  match τ with
  | none => 1
  | some t => if c < 0 then 1 + (-c) / t else if c < t then 1 else 0

/-- Length of the edge `C → C ∪ Y`. -/
def edgeCost (A : WMat n) (τ : Option ℚ) (C Y : Finset (Fin n)) : ℚ :=
  ∑ u ∈ C, ∑ v ∈ Y, phi τ (A u v)

/-- Admissible predecessors of `C'`: nodes `C ⊂ C'` with `|C' ∖ C| ≤ b`. -/
def preds (A : WMat n) (k b : ℕ) (C' : Finset (Fin n)) : Finset (Finset (Fin n)) :=
  (nodes A k).filter (fun C => C ⊂ C' ∧ (C' \ C).card ≤ b)

theorem card_lt_of_mem_preds {A : WMat n} {k b : ℕ} {C' C : Finset (Fin n)}
    (h : C ∈ preds A k b C') : C.card < C'.card :=
  Finset.card_lt_card (Finset.mem_filter.mp h).2.1

/-- Shortest-path length from `∅` to `C'` in the node DAG (`⊤` if unreachable). -/
def dist (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' : Finset (Fin n)) : WithTop ℚ :=
  if C' = ∅ then 0
  else if C' ∈ nodes A k then
    (preds A k b C').attach.inf
      (fun C => dist A k τ b C.1 + (edgeCost A τ C.1 (C' \ C.1) : WithTop ℚ))
  else ⊤
termination_by C'.card
decreasing_by exact card_lt_of_mem_preds C.2

theorem dist_empty (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) : dist A k τ b ∅ = 0 := by
  rw [dist]; simp

theorem dist_of_mem (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) {C' : Finset (Fin n)}
    (hne : C' ≠ ∅) (hC' : C' ∈ nodes A k) :
    dist A k τ b C' = (preds A k b C').inf
      (fun C => dist A k τ b C + (edgeCost A τ C (C' \ C) : WithTop ℚ)) := by
  rw [dist]; simp only [hne, hC', if_false, if_true]
  exact Finset.inf_attach (preds A k b C') (fun C => dist A k τ b C +
    (edgeCost A τ C (C' \ C) : WithTop ℚ))

theorem dist_of_not_mem (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) {C' : Finset (Fin n)}
    (hne : C' ≠ ∅) (hC' : C' ∉ nodes A k) : dist A k τ b C' = ⊤ := by
  rw [dist]; simp [hne, hC']

/-! ## Path extraction -/

/-- The value minimised at `C'`. -/
def stepVal (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' C : Finset (Fin n)) : WithTop ℚ :=
  dist A k τ b C + (edgeCost A τ C (C' \ C) : WithTop ℚ)

/-- A minimising predecessor (arbitrary tie-break). -/
noncomputable def argPred (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' : Finset (Fin n))
    (h : (preds A k b C').Nonempty) : Finset (Fin n) :=
  Classical.choose (Finset.exists_min_image (preds A k b C') (stepVal A k τ b C') h)

theorem argPred_spec (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' : Finset (Fin n))
    (h : (preds A k b C').Nonempty) :
    argPred A k τ b C' h ∈ preds A k b C' ∧
      ∀ C ∈ preds A k b C', stepVal A k τ b C' (argPred A k τ b C' h) ≤ stepVal A k τ b C' C :=
  Classical.choose_spec (Finset.exists_min_image (preds A k b C') (stepVal A k τ b C') h)

/-- Follow minimising predecessors back to `∅`; returns the number of blocks `m` and the
block index `g v < m` of every vertex of `C'` (blocks are the successive differences). -/
noncomputable def extract (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (C' : Finset (Fin n)) :
    ℕ × (Fin n → ℕ) :=
  if h : (preds A k b C').Nonempty then
    let C := argPred A k τ b C' h
    let r := extract A k τ b C
    (r.1 + 1, fun v => if v ∈ C then r.2 v else r.1)
  else (0, fun _ => 0)
termination_by C'.card
decreasing_by exact card_lt_of_mem_preds (argPred_spec A k τ b C' h).1

/-- The cost of a block-index labelling of `C'`: `Σ_{u,v ∈ C', g u < g v} φ_τ(a_uv)`. -/
def labelCost (A : WMat n) (τ : Option ℚ) (C' : Finset (Fin n)) (g : Fin n → ℕ) : ℚ :=
  ∑ u ∈ C', ∑ v ∈ C', if g u < g v then phi τ (A u v) else 0

/-- **Extraction invariant.** If `dist(C')` is finite, `extract` returns a labelling of `C'` into
`m ≤ |C'|` blocks of size at most `b`, whose cost is exactly `dist(C')`. -/
theorem extract_spec (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) :
    ∀ (s : ℕ) (C' : Finset (Fin n)), C'.card = s → dist A k τ b C' ≠ ⊤ →
      (extract A k τ b C').1 ≤ C'.card ∧
      (∀ v ∈ C', (extract A k τ b C').2 v < (extract A k τ b C').1) ∧
      (∀ j, (C'.filter (fun v => (extract A k τ b C').2 v = j)).card ≤ b) ∧
      dist A k τ b C' = (labelCost A τ C' (extract A k τ b C').2 : WithTop ℚ) := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
  intro C' hcard hfin
  by_cases hne : C' = ∅
  · subst hne
    rw [extract]
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
    obtain ⟨hCmem, hCmin⟩ := argPred_spec A k τ b C' hpne
    set C := argPred A k τ b C' hpne with hCdef
    have hCsub : C ⊂ C' := (Finset.mem_filter.mp hCmem).2.1
    have hYb : (C' \ C).card ≤ b := (Finset.mem_filter.mp hCmem).2.2
    -- the infimum is attained at the chosen predecessor
    have hdC : dist A k τ b C' = stepVal A k τ b C' C := by
      rw [hd]
      apply le_antisymm
      · exact Finset.inf_le hCmem
      · exact Finset.le_inf (fun C₂ hC₂ => hCmin C₂ hC₂)
    have hfinC : dist A k τ b C ≠ ⊤ := by
      intro htop; apply hfin; rw [hdC, stepVal, htop]; rfl
    obtain ⟨ih1, ih2, ih3, ih4⟩ := ih C.card (hcard ▸ Finset.card_lt_card hCsub) C rfl hfinC
    set m := (extract A k τ b C).1
    set g := (extract A k τ b C).2
    have hext : extract A k τ b C' = (m + 1, fun v => if v ∈ C then g v else m) := by
      rw [extract]; simp only [hpne, dite_true]; rfl
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
    · -- cost of the extended labelling = old cost + edge cost
      rw [hdC, stepVal, ih4, ← WithTop.coe_add]
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

end Westfall022
