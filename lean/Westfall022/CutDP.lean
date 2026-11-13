import Westfall022.Counting

/-!
# The restricted cut dynamic program (Stage D, core)

`cutDP A k S` is the ordering DP of Discovery 022 restricted to weak-majority `k`-cuts:
`f(∅) = 0`; for `S ≠ ∅` that is a `k`-cut,
`f(S) = max_{v ∈ S} f(S ∖ {v}) + Σ_{u ∈ S∖{v}} a_uv`; otherwise `f(S) = ⊥`.
Only chains of `k`-cuts from `∅` contribute, so `f` is supported on the reachable `k`-cuts `𝒞_k`.

Main facts:
* `cutDP_le_OPT`: every value is attained by a real ordering, so `f_k(V) ≤ OPT` for every `k`;
* `cutDP_exact`: if some optimal ordering has all prefixes `k`-cuts, then `f_k(V) = OPT`;
* `cutDP_exact_of_lamB_le`: in particular whenever some ordered partition has `λ(𝓑) ≤ k`.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-- `gain T v = Σ_{u ∈ T} a_uv`: the score added by placing `v` right after the set `T`. -/
def gain (A : WMat n) (T : Finset (Fin n)) (v : Fin n) : ℚ := ∑ u ∈ T, A u v

/-- The restricted cut DP. -/
def cutDP (A : WMat n) (k : ℕ) (S : Finset (Fin n)) : WithBot ℚ :=
  if S = ∅ then 0
  else if weakMajorityCut A S ≤ k then
    S.attach.sup (fun v => cutDP A k (S.erase v.1) + (gain A (S.erase v.1) v.1 : WithBot ℚ))
  else ⊥
termination_by S.card
decreasing_by exact Finset.card_erase_lt_of_mem v.2

theorem cutDP_empty (A : WMat n) (k : ℕ) : cutDP A k ∅ = 0 := by
  rw [cutDP]; simp

theorem cutDP_of_ne (A : WMat n) (k : ℕ) {S : Finset (Fin n)} (hS : S ≠ ∅)
    (hk : weakMajorityCut A S ≤ k) :
    cutDP A k S =
      S.attach.sup (fun v => cutDP A k (S.erase v.1) + (gain A (S.erase v.1) v.1 : WithBot ℚ)) := by
  rw [cutDP]; simp [hS, hk]

/-- Partial objective of the first `t` positions: `Σ_{r<s<t} a_{π r, π s}`. -/
def partialObj (A : WMat n) (π : Equiv.Perm (Fin n)) (t : ℕ) : ℚ :=
  ∑ r : Fin n, ∑ s : Fin n, if r < s ∧ (s : ℕ) < t then A (π r) (π s) else 0

theorem partialObj_n (A : WMat n) (π : Equiv.Perm (Fin n)) : partialObj A π n = objective A π := by
  unfold partialObj objective
  refine Finset.sum_congr rfl (fun r _ => Finset.sum_congr rfl (fun s _ => ?_))
  simp [s.2]

theorem partialObj_zero (A : WMat n) (π : Equiv.Perm (Fin n)) : partialObj A π 0 = 0 := by
  simp [partialObj]

theorem prefixSet_eq_image (π : Equiv.Perm (Fin n)) (t : ℕ) :
    prefixSet π t = (univ.filter (fun r : Fin n => (r : ℕ) < t)).image π := by
  ext v
  simp only [prefixSet, Finset.mem_filter, Finset.mem_univ, true_and, Finset.mem_image]
  constructor
  · intro h; exact ⟨π.symm v, h, by simp⟩
  · rintro ⟨r, hr, rfl⟩; simpa using hr

theorem gain_prefix (A : WMat n) (π : Equiv.Perm (Fin n)) (t : ℕ) (v : Fin n) :
    gain A (prefixSet π t) v = ∑ r : Fin n, if (r : ℕ) < t then A (π r) v else 0 := by
  unfold gain
  rw [prefixSet_eq_image, Finset.sum_image (fun a _ b _ h => π.injective h), Finset.sum_filter]

/-- `partialObj (t+1) = partialObj t + gain(prefix_t, π t)`. -/
theorem partialObj_succ (A : WMat n) (π : Equiv.Perm (Fin n)) (t : ℕ) (ht : t < n) :
    partialObj A π (t + 1) = partialObj A π t + gain A (prefixSet π t) (π ⟨t, ht⟩) := by
  rw [gain_prefix]
  unfold partialObj
  rw [← Finset.sum_add_distrib]
  refine Finset.sum_congr rfl (fun r _ => ?_)
  have hsplit : ∀ s : Fin n, (if r < s ∧ (s : ℕ) < t + 1 then A (π r) (π s) else 0) =
      (if r < s ∧ (s : ℕ) < t then A (π r) (π s) else 0) +
        (if s = ⟨t, ht⟩ then (if (r : ℕ) < t then A (π r) (π ⟨t, ht⟩) else 0) else 0) := by
    intro s
    by_cases hs : s = ⟨t, ht⟩
    · subst hs
      simp [Fin.lt_def]
    · have hs' : (s : ℕ) ≠ t := fun h => hs (Fin.ext h)
      by_cases h1 : r < s ∧ (s : ℕ) < t
      · have : r < s ∧ (s : ℕ) < t + 1 := ⟨h1.1, by omega⟩
        simp [h1, this, hs]
      · have : ¬ (r < s ∧ (s : ℕ) < t + 1) := by
          rintro ⟨a, b⟩; exact h1 ⟨a, by omega⟩
        rw [if_neg this, if_neg h1, if_neg hs]; simp
  rw [Finset.sum_congr rfl (fun s _ => hsplit s), Finset.sum_add_distrib, Finset.sum_ite_eq']
  simp

theorem prefixSet_succ (π : Equiv.Perm (Fin n)) (t : ℕ) (ht : t < n) :
    prefixSet π (t + 1) = insert (π ⟨t, ht⟩) (prefixSet π t) := by
  ext v
  simp only [prefixSet, Finset.mem_filter, Finset.mem_univ, true_and, Finset.mem_insert]
  constructor
  · intro h
    rcases Nat.lt_succ_iff_lt_or_eq.mp h with h | h
    · exact Or.inr h
    · left; rw [← Equiv.apply_symm_apply π v]; congr 1; exact Fin.ext h
  · rintro (rfl | h)
    · simp
    · omega

theorem card_prefixSet (π : Equiv.Perm (Fin n)) (t : ℕ) (ht : t ≤ n) :
    (prefixSet π t).card = t := by
  rw [prefixSet_eq_image, Finset.card_image_of_injective _ π.injective]
  rw [show univ.filter (fun r : Fin n => (r : ℕ) < t) = (Finset.range t).attachFin
      (fun m hm => lt_of_lt_of_le (Finset.mem_range.mp hm) ht) by
    ext r; simp]
  simp

theorem not_mem_prefixSet_self (π : Equiv.Perm (Fin n)) (t : ℕ) (ht : t < n) :
    π ⟨t, ht⟩ ∉ prefixSet π t := by
  simp [prefixSet]

/-! ## Lower bound: an ordering whose prefixes are `k`-cuts is seen by the DP -/

theorem cutDP_prefix_ge (A : WMat n) (k : ℕ) (π : Equiv.Perm (Fin n))
    (hπ : ∀ t, weakMajorityCut A (prefixSet π t) ≤ k) :
    ∀ t, t ≤ n → (partialObj A π t : WithBot ℚ) ≤ cutDP A k (prefixSet π t) := by
  intro t
  induction t with
  | zero =>
    intro _
    have h0 : prefixSet π 0 = ∅ := by ext v; simp [prefixSet]
    rw [h0, cutDP_empty, partialObj_zero]; rfl
  | succ t ih =>
    intro ht
    have ht' : t < n := by omega
    set v := π ⟨t, ht'⟩
    have hins := prefixSet_succ π t ht'
    have hne : prefixSet π (t + 1) ≠ ∅ := by
      rw [hins]; exact Finset.insert_ne_empty _ _
    rw [cutDP_of_ne A k hne (hπ (t + 1)), partialObj_succ A π t ht']
    have hvmem : v ∈ prefixSet π (t + 1) := by rw [hins]; exact Finset.mem_insert_self _ _
    have herase : (prefixSet π (t + 1)).erase v = prefixSet π t := by
      rw [hins, Finset.erase_insert (not_mem_prefixSet_self π t ht')]
    refine le_trans ?_ (Finset.le_sup (f := fun w : {x // x ∈ prefixSet π (t + 1)} =>
      cutDP A k ((prefixSet π (t + 1)).erase w.1) +
        (gain A ((prefixSet π (t + 1)).erase w.1) w.1 : WithBot ℚ))
      (Finset.mem_attach _ ⟨v, hvmem⟩))
    simp only [herase]
    rw [WithBot.coe_add]
    exact add_le_add (ih (by omega)) le_rfl

/-! ## Upper bound: every DP value is attained by a genuine ordering -/

/-- The best partial objective over orderings that start with the set `S`. -/
def bestStart (A : WMat n) (S : Finset (Fin n)) : WithBot ℚ :=
  (univ : Finset (Equiv.Perm (Fin n))).sup
    (fun π => if prefixSet π S.card = S then (partialObj A π S.card : WithBot ℚ) else ⊥)

/-- Moving `v` to position `t` without disturbing the first `t` positions. -/
theorem extend_ordering (A : WMat n) (π : Equiv.Perm (Fin n)) (t : ℕ) (ht : t < n)
    (v : Fin n) (hv : v ∉ prefixSet π t) :
    ∃ π' : Equiv.Perm (Fin n), prefixSet π' (t + 1) = insert v (prefixSet π t) ∧
      partialObj A π' (t + 1) = partialObj A π t + gain A (prefixSet π t) v := by
  set p := π ⟨t, ht⟩
  set π' : Equiv.Perm (Fin n) := π.trans (Equiv.swap p v)
  have hagree : ∀ r : Fin n, (r : ℕ) < t → π' r = π r := by
    intro r hr
    have h1 : π r ≠ p := by
      intro h; have := π.injective h; rw [Fin.ext_iff] at this; simp at this; omega
    have h2 : π r ≠ v := by
      intro h; apply hv; rw [← h]; simp [prefixSet, hr]
    simp [π', Equiv.swap_apply_of_ne_of_ne h1 h2]
  have hlast : π' ⟨t, ht⟩ = v := by simp [π', p]
  have hpre : prefixSet π' t = prefixSet π t := by
    rw [prefixSet_eq_image, prefixSet_eq_image]
    apply Finset.image_congr
    intro r hr
    exact hagree r (Finset.mem_filter.mp hr).2
  have hpart : partialObj A π' t = partialObj A π t := by
    unfold partialObj
    refine Finset.sum_congr rfl (fun r _ => Finset.sum_congr rfl (fun s _ => ?_))
    by_cases h : r < s ∧ (s : ℕ) < t
    · have hr : (r : ℕ) < t := lt_trans (Fin.lt_def.mp h.1) h.2
      simp [h, hagree r hr, hagree s h.2]
    · simp [h]
  refine ⟨π', ?_, ?_⟩
  · rw [prefixSet_succ π' t ht, hlast, hpre]
  · rw [partialObj_succ A π' t ht, hlast, hpre, hpart]

theorem cutDP_le_bestStart (A : WMat n) (k : ℕ) :
    ∀ (s : ℕ) (S : Finset (Fin n)), S.card = s → cutDP A k S ≤ bestStart A S := by
  intro s
  induction s with
  | zero =>
    intro S hS
    rw [Finset.card_eq_zero.mp hS, cutDP_empty]
    unfold bestStart
    refine le_trans ?_ (Finset.le_sup (f := fun π : Equiv.Perm (Fin n) =>
      if prefixSet π (∅ : Finset (Fin n)).card = ∅ then
        (partialObj A π (∅ : Finset (Fin n)).card : WithBot ℚ) else ⊥)
      (Finset.mem_univ (Equiv.refl _)))
    have h0 : prefixSet (Equiv.refl (Fin n)) 0 = ∅ := by ext v; simp [prefixSet]
    simp [h0, partialObj_zero]
  | succ s ih =>
    intro S hS
    have hne : S ≠ ∅ := by rintro rfl; simp at hS
    by_cases hk : weakMajorityCut A S ≤ k
    · rw [cutDP_of_ne A k hne hk]
      apply Finset.sup_le
      rintro ⟨v, hv⟩ _
      have hcard : (S.erase v).card = s := by rw [Finset.card_erase_of_mem hv, hS]; rfl
      have hrec := ih (S.erase v) hcard
      -- unfold the best start for `S.erase v` and extend the witnessing ordering by `v`
      unfold bestStart at hrec ⊢
      rw [hcard] at hrec
      rw [hS]
      have hsn : s < n := by
        have := Finset.card_le_univ S; simp only [Fintype.card_fin] at this; omega
      calc cutDP A k (S.erase v) + (gain A (S.erase v) v : WithBot ℚ)
          ≤ (univ : Finset (Equiv.Perm (Fin n))).sup (fun π =>
              if prefixSet π s = S.erase v then (partialObj A π s : WithBot ℚ) else ⊥) +
            (gain A (S.erase v) v : WithBot ℚ) := add_le_add hrec le_rfl
        _ ≤ _ := by
          obtain ⟨π, -, hπeq⟩ := Finset.exists_mem_eq_sup (univ : Finset (Equiv.Perm (Fin n)))
            Finset.univ_nonempty (fun π =>
              if prefixSet π s = S.erase v then (partialObj A π s : WithBot ℚ) else ⊥)
          rw [hπeq]
          by_cases hpre : prefixSet π s = S.erase v
          · have hvnot : v ∉ prefixSet π s := by rw [hpre]; exact Finset.notMem_erase v S
            obtain ⟨π', h1, h2⟩ := extend_ordering A π s hsn v hvnot
            have hS' : prefixSet π' (s + 1) = S := by
              rw [h1, hpre, Finset.insert_erase hv]
            refine le_trans ?_ (Finset.le_sup (f := fun π =>
              if prefixSet π (s + 1) = S then (partialObj A π (s + 1) : WithBot ℚ) else ⊥)
              (Finset.mem_univ π'))
            simp only [hpre, if_true, hS', h2]
            rw [← hpre, WithBot.coe_add]
          · simp [hpre]
    · rw [cutDP]; simp [hne, hk]

theorem prefixSet_n (π : Equiv.Perm (Fin n)) : prefixSet π n = univ := by
  ext v; simp [prefixSet]

theorem bestStart_univ_le (A : WMat n) : bestStart A univ ≤ OPT A := by
  unfold bestStart
  apply Finset.sup_le
  intro π _
  rw [Finset.card_univ, Fintype.card_fin, prefixSet_n, partialObj_n]
  simp only [if_true]
  exact WithBot.coe_le_coe.mpr (objective_le_OPT A π)

/-- **Soundness of the cut DP:** `f_k(V) ≤ OPT` for every threshold `k`. -/
theorem cutDP_le_OPT (A : WMat n) (k : ℕ) : cutDP A k univ ≤ OPT A :=
  (cutDP_le_bestStart A k n univ (by simp)).trans (bestStart_univ_le A)

/-- **Exactness of the cut DP:** if some optimal ordering has all its prefixes `k`-cuts,
then `f_k(V) = OPT`. -/
theorem cutDP_exact (A : WMat n) (k : ℕ) (π : Equiv.Perm (Fin n)) (hπ : IsOptimal A π)
    (hcut : ∀ t, weakMajorityCut A (prefixSet π t) ≤ k) : cutDP A k univ = OPT A := by
  apply le_antisymm (cutDP_le_OPT A k)
  have h := cutDP_prefix_ge A k π hcut n le_rfl
  rw [prefixSet_n, partialObj_n, hπ] at h
  exact h

/-- **The structural certificate is valid:** if some ordered partition `𝓑` has
`λ(𝓑) = b² + 3K₀(𝓑) ≤ k`, the cut DP at threshold `k` returns `OPT` (Theorem 1 + `cutDP_exact`). -/
theorem cutDP_exact_of_lamB_le (A : WMat n) (hA : IsSkew A) (k : ℕ) (B : OrdPart n)
    (hB : lamB A B ≤ k) : cutDP A k univ = OPT A := by
  obtain ⟨π, hπ⟩ := exists_optimal A
  exact cutDP_exact A k π hπ (fun t => (prefix_cut_le_lamB A hA B π hπ t).trans hB)

/-- In particular `f_k(V) = OPT` for every `k ≥ λ(A)`. -/
theorem cutDP_exact_of_lam_le (A : WMat n) (hA : IsSkew A) (k : ℕ) (hk : lam A ≤ k) :
    cutDP A k univ = OPT A := by
  obtain ⟨B, hB⟩ := exists_lamB_eq_lam A
  exact cutDP_exact_of_lamB_le A hA k B (hB ▸ hk)

end Westfall022
