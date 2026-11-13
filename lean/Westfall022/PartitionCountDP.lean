import Westfall022.MemoizedAutoCut
import Westfall022.PartitionGrowth

/-!
# Mission 024, Challenge 4: an abort test that never computes `P(3k)`

The manuscript aborts round `k` when more than `(n+1)·P(3k)` reachable `k`-cuts appear. Evaluating
`P(3k)` naively enumerates integer partitions. This module replaces the threshold with the closed
form

  `U(n,k) = (n+1)·(3k+1)·2^{5(⌊√(3k)⌋+1)}  ≥  (n+1)·P(3k)`   (`Pcum_le_two_pow`),

and generates the reachable cuts **layer by layer with a running count**, stopping as soon as the
count exceeds `U` (`capLayers`). Generating layer `s+1` from a layer of at most `U` sets examines
at most `n·U` candidates, so failed rounds never enumerate more than `O(n·U)` sets (H2).

**Exactness of the replacement** (`recognizeM_eq`): the memoised recogniser with the new test
returns *exactly* the same output as `recognizeX`. The test can only differ on rounds with
`(n+1)·P(3k) < |𝒞_k| ≤ U`, and on such rounds both recognisers reject, because acceptance forces
`λ(A) ≤ k` and hence `|𝒞_k| ≤ (n+1)·P(3k)` (`cut_count_bound`).
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-- The closed-form abort threshold. -/
def abortBound (n k : ℕ) : ℕ := (n + 1) * ((3 * k + 1) * 2 ^ (5 * (Nat.sqrt (3 * k) + 1)))

theorem Pcum_le_abortBound (n k : ℕ) : (n + 1) * Pcum (3 * k) ≤ abortBound n k :=
  Nat.mul_le_mul_left _ (Pcum_le_two_pow (3 * k))

/-! ## Capped layer generation -/

/-- Generate layer `s+1` from layer `s`. -/
def nextLayer (A : WMat n) (k s : ℕ) (L : Finset (Finset (Fin n))) : Finset (Finset (Fin n)) :=
  (L.biUnion (fun S => univ.image (fun v => insert v S))).filter
    (fun T => T.card = s + 1 ∧ weakMajorityCut A T ≤ k)

/-- Layers with a running count; `none` as soon as the count exceeds `U`. -/
def capLayers (A : WMat n) (k U : ℕ) : ℕ → Option (Finset (Finset (Fin n)) × ℕ)
  | 0 => if 1 > U then none else some ({∅}, 1)
  | s + 1 =>
    match capLayers A k U s with
    | none => none
    | some (L, c) =>
      let L' := nextLayer A k s L
      if c + L'.card > U then none else some (L', c + L'.card)

/-- Partial counts `Σ_{i ≤ s} |layer i|`. -/
def layerCount (A : WMat n) (k : ℕ) (s : ℕ) : ℕ := ∑ i ∈ range (s + 1), (reachLayer A k i).card

theorem capLayers_spec (A : WMat n) (k U : ℕ) :
    ∀ s, (capLayers A k U s = some (reachLayer A k s, layerCount A k s) ∧ layerCount A k s ≤ U) ∨
      (capLayers A k U s = none ∧ layerCount A k s > U) := by
  intro s
  induction s with
  | zero =>
    have hc : layerCount A k 0 = 1 := by simp [layerCount, reachLayer]
    rw [hc]
    by_cases h : 1 > U
    · right; exact ⟨by simp [capLayers, h], h⟩
    · left; exact ⟨by simp [capLayers, h, reachLayer], by omega⟩
  | succ s ih =>
    have hc : layerCount A k (s + 1) = layerCount A k s + (reachLayer A k (s + 1)).card := by
      simp [layerCount, Finset.sum_range_succ]
    have hnext : ∀ L, L = reachLayer A k s → nextLayer A k s L = reachLayer A k (s + 1) := by
      intro L hL; rw [hL]; rfl
    rcases ih with ⟨h1, h2⟩ | ⟨h1, h2⟩
    · by_cases h : layerCount A k s + (reachLayer A k (s + 1)).card > U
      · right
        refine ⟨?_, by rw [hc]; exact h⟩
        simp only [capLayers, h1, hnext _ rfl, if_pos h]
      · left
        refine ⟨?_, by rw [hc]; omega⟩
        simp only [capLayers, h1, hnext _ rfl, if_neg h, hc]
    · right
      exact ⟨by simp only [capLayers, h1], by rw [hc]; omega⟩

theorem card_reachable_eq (A : WMat n) (k : ℕ) : (reachable A k).card = layerCount A k n := by
  unfold reachable layerCount
  apply Finset.card_biUnion
  intro i _ j _ hij
  simp only [Function.onFun]
  rw [Finset.disjoint_left]
  intro T hTi hTj
  exact hij ((card_of_mem_reachLayer A k i T hTi).symm.trans (card_of_mem_reachLayer A k j T hTj))

/-- The capped generator decides `|𝒞_k| > U` exactly. -/
theorem capLayers_none_iff (A : WMat n) (k U : ℕ) :
    capLayers A k U n = none ↔ (reachable A k).card > U := by
  rw [card_reachable_eq]
  rcases capLayers_spec A k U n with ⟨h1, h2⟩ | ⟨h1, h2⟩
  · rw [h1]; simp; omega
  · rw [h1]; simp; omega

/-! ## The memoised recogniser -/

/-- **Memoised partition recovery** with the closed-form, capped abort test. -/
def recognizeM (A : WMat n) (k : ℕ) : Option (OrdPart n) :=
  if (capLayers A k (abortBound n k) n).isNone then none
  else if recogValM A k ≤ (k : WithTop ℕ) then
    let q := selCandM A k
    some (partOf (extractM A k q.1 q.2 (distTab A k q.1 q.2 n) univ).2)
  else none

theorem reachable_card_le_of_lam (A : WMat n) (k : ℕ) (hk : lam A ≤ k) :
    (reachable A k).card ≤ (n + 1) * Pcum (3 * k) := by
  refine le_trans (Finset.card_le_card ?_) (cut_count_bound A k hk).2
  intro S hS
  exact Finset.mem_filter.mpr ⟨Finset.mem_univ _, cut_le_of_mem_reachable A k hS⟩

/-- **Exact refinement:** the memoised recogniser returns exactly `recognizeX`'s output. -/
theorem recognizeM_eq (A : WMat n) (k : ℕ) : recognizeM A k = recognizeX A k := by
  have hguard : (capLayers A k (abortBound n k) n).isNone = true ↔
      (reachable A k).card > abortBound n k := by
    rw [Option.isNone_iff_eq_none]; exact capLayers_none_iff A k _
  have hEx : ∀ (τ : Option ℚ) (b : ℕ),
      extractM A k τ b (distTab A k τ b n) univ = extractX A k τ b univ :=
    fun τ b => extractM_eq A k τ b n univ (by simp)
  unfold recognizeM recognizeX
  simp only [recogValM_eq, selCandM_eq, hEx]
  by_cases hU : (reachable A k).card > abortBound n k
  · have hP : (reachable A k).card > (n + 1) * Pcum (3 * k) :=
      lt_of_le_of_lt (Pcum_le_abortBound n k) hU
    rw [if_pos (hguard.mpr hU), if_pos ((pcumGuard_iff _ _ _).mpr hP)]
  · have hg : (capLayers A k (abortBound n k) n).isNone = false := by
      cases h : (capLayers A k (abortBound n k) n).isNone
      · rfl
      · exact absurd (hguard.mp h) hU
    simp only [hg, Bool.false_eq_true, if_false]
    by_cases hP : (reachable A k).card > (n + 1) * Pcum (3 * k)
    · -- the old test aborts; the new one does not, but acceptance is impossible
      have hgT : pcumGuard n (reachable A k).card k = true := (pcumGuard_iff _ _ _).mpr hP
      simp only [hgT, if_true]
      rw [if_neg]
      intro hacc
      have hlam : lam A ≤ k := by
        have h1 := lam_le_recogVal A k
        rw [← recogValX_eq] at h1
        exact WithTop.coe_le_coe.mp (h1.trans hacc)
      exact absurd (reachable_card_le_of_lam A k hlam) (not_le.mpr hP)
    · have hg' : pcumGuard n (reachable A k).card k = false := by
        cases h : pcumGuard n (reachable A k).card k
        · rfl
        · exact absurd ((pcumGuard_iff _ _ _).mp h) hP
      simp only [hg', Bool.false_eq_true, if_false]

/-! ## Memoised AutoCut -/

def firstAcceptM (A : WMat n) : ℕ → ℕ → Option ℕ
  | 0, _ => none
  | fuel + 1, j => if (recognizeM A (2 ^ j)).isSome then some j else firstAcceptM A fuel (j + 1)

theorem firstAcceptM_eq (A : WMat n) : ∀ fuel j, firstAcceptM A fuel j = firstAccept A fuel j := by
  intro fuel
  induction fuel with
  | zero => intro j; rfl
  | succ fuel ih => intro j; simp only [firstAcceptM, firstAccept, recognizeM_eq, ih]

/-- **Memoised executable AutoCut.** -/
def autoCutM (A : WMat n) : Option (WithBot ℚ × Equiv.Perm (Fin n) × OrdPart n × ℕ) :=
  match firstAcceptM A (2 * n + 1) 0 with
  | none => none
  | some j =>
    match recognizeM A (2 ^ j) with
    | none => none
    | some B => some (cutDPM A (2 ^ j), dpOrderM A (2 ^ j) univ, B, 2 ^ j)

/-- **Refinement:** `autoCutM A = autoCutX A` for every matrix. -/
theorem autoCutM_eq (A : WMat n) : autoCutM A = autoCutX A := by
  unfold autoCutM autoCutX
  rw [firstAcceptM_eq]
  rcases firstAccept A (2 * n + 1) 0 with _ | j
  · rfl
  · simp only [recognizeM_eq]
    rcases recognizeX A (2 ^ j) with _ | B
    · rfl
    · simp only [cutDPM_eq, dpOrderM_eq A _ n univ (by simp)]

/-- All guarantees of `autoCutX_correct` hold for the memoised algorithm. -/
theorem autoCutM_correct (A : WMat n) (hA : IsSkew A) :
    ∃ r, autoCutM A = some r ∧
      r.1 = (OPT A : WithBot ℚ) ∧ objective A r.2.1 = OPT A ∧ lamB A r.2.2.1 = lam A ∧
      lam A ≤ r.2.2.2 ∧ (r.2.2.2 = 1 ∨ r.2.2.2 < 2 * lam A) ∧
      r.2.2.2 = (autoCut A hA).2.2.2 ∧ r.1 = (autoCut A hA).1 := by
  rw [autoCutM_eq]; exact autoCutX_correct A hA

/-! ## Each state is stored once (H1, structural) -/

theorem dpTab_card_le (A : WMat n) (k s : ℕ) : (dpTab A k (s + 1)).card ≤ (reachLayer A k (s + 1)).card := by
  simp only [dpTab]; exact Finset.card_image_le

theorem distTab_card_le (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) :
    ∀ s, (distTab A k τ b s).card ≤ (nodes A k).card + 1 := by
  intro s
  -- every key is `∅` or a node, and keys are unique (values are determined by keys)
  obtain ⟨hA, -⟩ := distTab_inv A k τ b s
  have hinj : Set.InjOn Prod.fst (distTab A k τ b s : Set (Finset (Fin n) × WithTop ℚ)) := by
    intro e he e' he' h
    obtain ⟨-, -, hv⟩ := hA e he
    obtain ⟨-, -, hv'⟩ := hA e' he'
    exact Prod.ext h (by rw [hv, hv', h])
  calc (distTab A k τ b s).card = ((distTab A k τ b s).image Prod.fst).card :=
        (Finset.card_image_of_injOn hinj).symm
    _ ≤ (insert ∅ (nodes A k)).card := by
        apply Finset.card_le_card
        intro C hC
        obtain ⟨e, he, rfl⟩ := Finset.mem_image.mp hC
        rcases (hA e he).2.1 with h | h
        · rw [h]; exact Finset.mem_insert_self _ _
        · exact Finset.mem_insert_of_mem h
    _ ≤ (nodes A k).card + 1 := Finset.card_insert_le _ _

end Westfall022
