import Westfall022.RecoveryThm

/-!
# AutoCut: the partition-free exact algorithm (Discovery 022, Theorem 4) — correctness

```
AutoCut(A):
  for k = 1, 2, 4, ...:
      B ← recognize(A, k)                       -- partition recovery (Theorem 3)
      if B ≠ none: return f_k(V), an ordering read off the DP, B, k
```

`autoCut_correct`: the returned value is `OPT(A)`, the returned ordering attains it, the returned
partition attains `λ(A)`, and the stopping threshold satisfies `λ(A) ≤ k` with `k < 2λ(A)` unless
`k = 1`. The running-time bound (Theorem 4's `poly(n)·2^{O(√λ)}`) is NOT formalized here.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-! ## Reading an ordering off the cut DP -/

/-- Place `v` at position `t` of `π`, swapping it with the vertex currently there. -/
def extendPerm (π : Equiv.Perm (Fin n)) (t : ℕ) (v : Fin n) : Equiv.Perm (Fin n) :=
  if ht : t < n then π.trans (Equiv.swap (π ⟨t, ht⟩) v) else π

theorem extendPerm_spec (A : WMat n) (π : Equiv.Perm (Fin n)) (t : ℕ) (ht : t < n)
    (v : Fin n) (hv : v ∉ prefixSet π t) :
    prefixSet (extendPerm π t v) (t + 1) = insert v (prefixSet π t) ∧
      partialObj A (extendPerm π t v) (t + 1) = partialObj A π t + gain A (prefixSet π t) v := by
  set p := π ⟨t, ht⟩
  set π' := extendPerm π t v with hπ'
  have hdef : π' = π.trans (Equiv.swap p v) := by rw [hπ', extendPerm, dif_pos ht]
  have hagree : ∀ r : Fin n, (r : ℕ) < t → π' r = π r := by
    intro r hr
    have h1 : π r ≠ p := by
      intro h; have := π.injective h; rw [Fin.ext_iff] at this; simp at this; omega
    have h2 : π r ≠ v := by
      intro h; apply hv; rw [← h]; simp [prefixSet, hr]
    rw [hdef]; simp [Equiv.swap_apply_of_ne_of_ne h1 h2]
  have hlast : π' ⟨t, ht⟩ = v := by rw [hdef]; simp [p]
  have hpre : prefixSet π' t = prefixSet π t := by
    rw [prefixSet_eq_image, prefixSet_eq_image]
    exact Finset.image_congr (fun r hr => hagree r (Finset.mem_filter.mp hr).2)
  have hpart : partialObj A π' t = partialObj A π t := by
    unfold partialObj
    refine Finset.sum_congr rfl (fun r _ => Finset.sum_congr rfl (fun s _ => ?_))
    by_cases h : r < s ∧ (s : ℕ) < t
    · have hr : (r : ℕ) < t := lt_trans (Fin.lt_def.mp h.1) h.2
      simp [h, hagree r hr, hagree s h.2]
    · simp [h]
  refine ⟨?_, ?_⟩
  · rw [prefixSet_succ π' t ht, hlast, hpre]
  · rw [partialObj_succ A π' t ht, hlast, hpre, hpart]

/-- The DP's choice at `S`: a maximising last vertex. -/
noncomputable def dpLast (A : WMat n) (k : ℕ) (S : Finset (Fin n)) (h : S.Nonempty) : Fin n :=
  Classical.choose (Finset.exists_max_image S
    (fun v => cutDP A k (S.erase v) + (gain A (S.erase v) v : WithBot ℚ)) h)

theorem dpLast_spec (A : WMat n) (k : ℕ) (S : Finset (Fin n)) (h : S.Nonempty) :
    dpLast A k S h ∈ S ∧ ∀ w ∈ S,
      cutDP A k (S.erase w) + (gain A (S.erase w) w : WithBot ℚ) ≤
        cutDP A k (S.erase (dpLast A k S h)) +
          (gain A (S.erase (dpLast A k S h)) (dpLast A k S h) : WithBot ℚ) :=
  Classical.choose_spec (Finset.exists_max_image S
    (fun v => cutDP A k (S.erase v) + (gain A (S.erase v) v : WithBot ℚ)) h)

/-- The ordering reconstructed from the DP by following maximising last vertices. -/
noncomputable def dpOrder (A : WMat n) (k : ℕ) (S : Finset (Fin n)) : Equiv.Perm (Fin n) :=
  if h : S.Nonempty then
    extendPerm (dpOrder A k (S.erase (dpLast A k S h))) (S.card - 1) (dpLast A k S h)
  else Equiv.refl _
termination_by S.card
decreasing_by exact Finset.card_erase_lt_of_mem (dpLast_spec A k S h).1

theorem dpOrder_spec (A : WMat n) (k : ℕ) :
    ∀ (s : ℕ) (S : Finset (Fin n)), S.card = s → cutDP A k S ≠ ⊥ →
      prefixSet (dpOrder A k S) s = S ∧
        ((partialObj A (dpOrder A k S) s : ℚ) : WithBot ℚ) = cutDP A k S := by
  intro s
  induction s with
  | zero =>
    intro S hS _
    have hS0 : S = ∅ := Finset.card_eq_zero.mp hS
    subst hS0
    have hord : dpOrder A k (∅ : Finset (Fin n)) = Equiv.refl _ := by
      rw [dpOrder]; simp
    rw [hord, cutDP_empty, partialObj_zero]
    refine ⟨by ext v; simp [prefixSet], rfl⟩
  | succ s ih =>
    intro S hS hfin
    have hne : S.Nonempty := Finset.card_pos.mp (by omega)
    have hSne : S ≠ ∅ := Finset.nonempty_iff_ne_empty.mp hne
    have hk : weakMajorityCut A S ≤ k := by
      by_contra hk; apply hfin; rw [cutDP]; simp [hSne, hk]
    obtain ⟨hvS, hvmax⟩ := dpLast_spec A k S hne
    set v := dpLast A k S hne
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
    have hord : dpOrder A k S = extendPerm (dpOrder A k (S.erase v)) s v := by
      rw [dpOrder, dif_pos hne, hS]; rfl
    have hvnot : v ∉ prefixSet (dpOrder A k (S.erase v)) s := by
      rw [ih1]; exact Finset.notMem_erase v S
    obtain ⟨e1, e2⟩ := extendPerm_spec A (dpOrder A k (S.erase v)) s hsn v hvnot
    rw [hord]
    refine ⟨?_, ?_⟩
    · rw [e1, ih1, Finset.insert_erase hvS]
    · rw [e2, WithBot.coe_add, ih2, ih1, hval]

/-! ## The doubling schedule -/

/-- Some round of the doubling schedule accepts (round `λ(A)` already does, as `2^λ ≥ λ`). -/
theorem exists_accepting_round (A : WMat n) (hA : IsSkew A) :
    ∃ j, (recognize A (2 ^ j)).isSome := by
  refine ⟨lam A, ?_⟩
  obtain ⟨B, hB⟩ := partition_recovery_complete A hA (2 ^ lam A) (Nat.lt_two_pow_self).le
  rw [hB]; rfl

/-- The first accepting round of the doubling schedule `k = 1, 2, 4, …`. -/
noncomputable def autoCutRound (A : WMat n) (hA : IsSkew A) : ℕ :=
  Nat.find (exists_accepting_round A hA)

/-- The AutoCut output: `(f_k(V), ordering, partition, k)` at the first accepting round. -/
noncomputable def autoCut (A : WMat n) (hA : IsSkew A) :
    WithBot ℚ × Equiv.Perm (Fin n) × OrdPart n × ℕ :=
  let k := 2 ^ autoCutRound A hA
  (cutDP A k univ, dpOrder A k univ,
    (recognize A k).get (Nat.find_spec (exists_accepting_round A hA)), k)

/-- **`autoCut_correct` (Discovery 022, Theorem 4, correctness part).** Given only a skew
matrix, AutoCut returns `OPT(A)`, an ordering attaining it, an ordered partition attaining
`λ(A)`, and a threshold `k` with `λ(A) ≤ k` and (`k = 1` or `k < 2λ(A)`). -/
theorem autoCut_correct (A : WMat n) (hA : IsSkew A) :
    let r := autoCut A hA
    r.1 = (OPT A : WithBot ℚ) ∧ objective A r.2.1 = OPT A ∧ lamB A r.2.2.1 = lam A ∧
      lam A ≤ r.2.2.2 ∧ (r.2.2.2 = 1 ∨ r.2.2.2 < 2 * lam A) := by
  intro r
  set j := autoCutRound A hA with hj
  set k := 2 ^ j
  have hsome := Nat.find_spec (exists_accepting_round A hA)
  set B := (recognize A k).get hsome with hB
  have hrec : recognize A k = some B := by rw [hB]; exact Option.some_get hsome |>.symm
  obtain ⟨hBk, hlamk⟩ := partition_recovery_sound A k B hrec
  have hval : cutDP A k univ = OPT A := cutDP_exact_of_lamB_le A hA k B hBk
  have hr1 : r.1 = cutDP A k univ := rfl
  have hr2 : r.2.1 = dpOrder A k univ := rfl
  have hr3 : r.2.2.1 = B := rfl
  have hr4 : r.2.2.2 = k := rfl
  refine ⟨by rw [hr1, hval], ?_, by rw [hr3]; exact partition_recovery_minimal A hA k B hrec,
    by rw [hr4]; exact hlamk, ?_⟩
  · rw [hr2]
    have hne : cutDP A k univ ≠ ⊥ := by rw [hval]; exact WithBot.coe_ne_bot
    obtain ⟨-, h2⟩ := dpOrder_spec A k n univ (by simp) hne
    rw [hval, partialObj_n] at h2
    exact WithBot.coe_injective h2
  · rw [hr4]
    rcases Nat.eq_zero_or_pos j with hj0 | hjpos
    · left; show 2 ^ j = 1; rw [hj0]; rfl
    · right
      -- round `j - 1` did not accept, so `2^(j-1) < λ(A)` by completeness
      have hjfind : j = Nat.find (exists_accepting_round A hA) := rfl
      have hprev : ¬ (recognize A (2 ^ (j - 1))).isSome :=
        Nat.find_min (exists_accepting_round A hA)
          (show j - 1 < Nat.find (exists_accepting_round A hA) by omega)
      have hlt : 2 ^ (j - 1) < lam A := by
        by_contra hge
        push Not at hge
        obtain ⟨B', hB'⟩ := partition_recovery_complete A hA _ hge
        exact hprev (by rw [hB']; rfl)
      have : k = 2 * 2 ^ (j - 1) := by
        show 2 ^ j = 2 * 2 ^ (j - 1)
        rw [← pow_succ']; congr 1; omega
      omega

/-! ## State-count bounds (NOT a running-time theorem) -/

/-- The combinatorial facts the running-time claim rests on, for the accepting round `k`:
the reachable cut family and the node set have at most `(n+1)·P(3k)` members (Stage 1 abort
rule), the round satisfies `k ≤ max 1 (2λ(A))`, so for `λ(A) ≥ 1` these families have at most
`(n+1)·P(6λ(A))` members. This is **not** `autoCut_complexity`: no operation-counting model is
formalized and the bound `P(M) ≤ (M+1)·e^{π√(2M/3)}` is not proved. -/
theorem autoCut_state_bounds (A : WMat n) (hA : IsSkew A) :
    let k := (autoCut A hA).2.2.2
    (reachable A k).card ≤ (n + 1) * Pcum (3 * k) ∧
      (nodes A k).card ≤ (n + 1) * Pcum (3 * k) ∧
      k ≤ max 1 (2 * lam A) ∧
      (1 ≤ lam A → (reachable A k).card ≤ (n + 1) * Pcum (6 * lam A)) := by
  intro k
  have hsome := Nat.find_spec (exists_accepting_round A hA)
  have hk : k = 2 ^ autoCutRound A hA := rfl
  have hreach : (reachable A k).card ≤ (n + 1) * Pcum (3 * k) := by
    have h : (recognize A k).isSome := hsome
    unfold recognize at h
    by_contra hc
    push Not at hc
    rw [if_pos hc] at h
    exact absurd h (by simp)
  have hcorr := autoCut_correct A hA
  simp only at hcorr
  obtain ⟨-, -, -, hlam, hk2⟩ := hcorr
  have hkmax : k ≤ max 1 (2 * lam A) := by
    rcases hk2 with h | h
    · exact h ▸ le_max_left _ _
    · exact le_trans h.le (le_max_right _ _)
  refine ⟨hreach, le_trans (Finset.card_le_card (Finset.filter_subset _ _)) hreach, hkmax, ?_⟩
  intro hl
  refine hreach.trans (Nat.mul_le_mul_left _ (Pcum_mono ?_))
  have : k ≤ 2 * lam A := le_trans hkmax (max_le (by omega) le_rfl)
  omega

end Westfall022
