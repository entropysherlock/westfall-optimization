import Westfall022.PrefixWidth

/-!
# Counting cuts with integer partitions

* Discovery 019, Theorem A: `|{S : I_𝓑(S) ≤ K}| ≤ (n+1)·P(2K + b²)`.
* Discovery 022, Lemma 2 (`cut_count_bound`): if `λ(A) ≤ k`, every `k`-cut `S` satisfies
  `I_{𝓑*}(S) ≤ k + K₀(𝓑*)` for a minimising `𝓑*`, and the number of `k`-cuts is at most
  `(n+1)·P(3k)`.

`P(M) = Σ_{j ≤ M} p(j)` with `p(j) = #(Nat.Partition j)`.

The partition encoding: for `S ⊆ Fin n` and `q ∈ S`, `gap S q = #{p ∉ S : p < q}`.
The multiset of gaps sums to the inversion number of `S`, and together with `|S|` it determines
`S` (the maximum of `S` is `max gap + |S| - 1`, and removing it removes that gap). Dropping
the zero gaps gives an integer partition of the inversion number, injectively for fixed `|S|`.
-/

namespace Westfall022

open Finset

/-- The cumulative partition function `P(M) = Σ_{j ≤ M} p(j)`. -/
def Pcum (M : ℕ) : ℕ := ∑ j ∈ range (M + 1), Fintype.card (Nat.Partition j)

theorem Pcum_mono {M M' : ℕ} (h : M ≤ M') : Pcum M ≤ Pcum M' := by
  unfold Pcum
  apply Finset.sum_le_sum_of_subset_of_nonneg
  · intro j hj; simp only [Finset.mem_range] at hj ⊢; omega
  · intros; exact Nat.zero_le _

variable {n : ℕ}

/-- Inversions of `S` with respect to the natural order of `Fin n`. -/
def invNat (S : Finset (Fin n)) : ℕ :=
  (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ p.1 < p.2)).card

/-- `gap S q = #{p ∉ S : p < q}`. -/
def gap (S : Finset (Fin n)) (q : Fin n) : ℕ := (univ.filter (fun p => p ∉ S ∧ p < q)).card

/-- The multiset of gaps of the members of `S`. -/
def gapMS (S : Finset (Fin n)) : Multiset ℕ := S.val.map (gap S)

theorem invNat_eq_sum_gap (S : Finset (Fin n)) : invNat S = ∑ q ∈ S, gap S q := by
  classical
  unfold invNat gap
  rw [Finset.card_filter, ← Finset.univ_product_univ, Finset.sum_product_right]
  rw [← Finset.sum_filter_add_sum_filter_not univ (fun q => q ∈ S)]
  have h0 : ∑ q ∈ univ.filter (fun q => q ∉ S),
      ∑ p : Fin n, (if p ∉ S ∧ q ∈ S ∧ p < q then 1 else 0) = 0 := by
    apply Finset.sum_eq_zero
    intro q hq
    have hq' := (Finset.mem_filter.mp hq).2
    simp [hq']
  rw [h0, add_zero, Finset.filter_mem_eq_inter, Finset.univ_inter]
  refine Finset.sum_congr rfl (fun q hq => ?_)
  rw [Finset.card_filter]
  refine Finset.sum_congr rfl (fun p _ => ?_)
  simp [hq]

theorem sum_gapMS (S : Finset (Fin n)) : (gapMS S).sum = invNat S := by
  rw [invNat_eq_sum_gap, gapMS, Finset.sum_eq_multiset_sum]

theorem card_gapMS (S : Finset (Fin n)) : Multiset.card (gapMS S) = S.card := by
  simp [gapMS]

theorem gap_mono (S : Finset (Fin n)) {q q' : Fin n} (h : q ≤ q') : gap S q ≤ gap S q' := by
  unfold gap
  apply Finset.card_le_card
  intro p hp
  simp only [Finset.mem_filter, Finset.mem_univ, true_and] at hp ⊢
  exact ⟨hp.1, lt_of_lt_of_le hp.2 h⟩

/-- For the maximum `M` of `S`: `gap S M + (|S| - 1) = M`. -/
theorem gap_max_add (S : Finset (Fin n)) (hS : S.Nonempty) :
    gap S (S.max' hS) + (S.card - 1) = ((S.max' hS : Fin n) : ℕ) := by
  classical
  set M := S.max' hS
  have hM : M ∈ S := S.max'_mem hS
  have hsplit := Finset.card_filter_add_card_filter_not (s := univ.filter (fun p : Fin n => p < M))
    (p := fun p => p ∉ S)
  have hlt : (univ.filter (fun p : Fin n => p < M)).card = (M : ℕ) := by
    rw [show univ.filter (fun p : Fin n => p < M) = Finset.Iio M by ext; simp, Fin.card_Iio]
  have hin : ((univ.filter (fun p : Fin n => p < M)).filter (fun p => ¬ p ∉ S)) = S.erase M := by
    ext p
    simp only [Finset.mem_filter, Finset.mem_univ, true_and, not_not, Finset.mem_erase]
    constructor
    · rintro ⟨h1, h2⟩; exact ⟨ne_of_lt h1, h2⟩
    · rintro ⟨h1, h2⟩; exact ⟨lt_of_le_of_ne (S.le_max' p h2) h1, h2⟩
  have hgap : gap S M = ((univ.filter (fun p : Fin n => p < M)).filter (fun p => p ∉ S)).card := by
    unfold gap; rw [Finset.filter_filter]
    congr 1; ext p; simp [and_comm]
  rw [hin, Finset.card_erase_of_mem hM] at hsplit
  omega

theorem gapMS_sup (S : Finset (Fin n)) (hS : S.Nonempty) :
    (gapMS S).sup = gap S (S.max' hS) := by
  rw [gapMS, ← Finset.sup_def]
  apply le_antisymm
  · exact Finset.sup_le (fun q hq => gap_mono S (S.le_max' q hq))
  · exact Finset.le_sup (f := gap S) (S.max'_mem hS)

theorem gap_erase_max (S : Finset (Fin n)) (hS : S.Nonempty) {q : Fin n} (hq : q < S.max' hS) :
    gap (S.erase (S.max' hS)) q = gap S q := by
  unfold gap
  congr 1; ext p
  simp only [Finset.mem_filter, Finset.mem_univ, true_and, Finset.mem_erase, not_and_or,
    not_not]
  constructor
  · rintro ⟨h1 | h1, h2⟩
    · exact absurd (h1 ▸ h2) (not_lt.mpr hq.le)
    · exact ⟨h1, h2⟩
  · rintro ⟨h1, h2⟩; exact ⟨Or.inr h1, h2⟩

theorem gapMS_erase_max (S : Finset (Fin n)) (hS : S.Nonempty) :
    gapMS (S.erase (S.max' hS)) = (gapMS S).erase (gap S (S.max' hS)) := by
  classical
  set M := S.max' hS
  have hM : M ∈ S := S.max'_mem hS
  have hval : S.val = M ::ₘ (S.erase M).val := by
    rw [← Finset.insert_val_of_notMem (Finset.notMem_erase M S), Finset.insert_erase hM]
  unfold gapMS
  rw [hval, Multiset.map_cons, Multiset.erase_cons_head]
  apply Multiset.map_congr rfl
  intro q hq
  have hq' : q ∈ S.erase M := hq
  have hlt : q < M := lt_of_le_of_ne (S.le_max' q (Finset.mem_of_mem_erase hq'))
    (Finset.ne_of_mem_erase hq')
  exact (gap_erase_max S hS hlt)

/-- The gap multiset and the size determine the set. -/
theorem eq_of_gapMS_eq : ∀ (s : ℕ) (S T : Finset (Fin n)), S.card = s → T.card = s →
    gapMS S = gapMS T → S = T := by
  intro s
  induction s with
  | zero =>
    intro S T hS hT _
    rw [Finset.card_eq_zero.mp hS, Finset.card_eq_zero.mp hT]
  | succ s ih =>
    intro S T hS hT hg
    have hSn : S.Nonempty := Finset.card_pos.mp (by omega)
    have hTn : T.Nonempty := Finset.card_pos.mp (by omega)
    have hmS := gap_max_add S hSn
    have hmT := gap_max_add T hTn
    have hsup : gap S (S.max' hSn) = gap T (T.max' hTn) := by
      rw [← gapMS_sup S hSn, ← gapMS_sup T hTn, hg]
    have hmax : S.max' hSn = T.max' hTn := by
      apply Fin.ext; rw [hS] at hmS; rw [hT] at hmT; omega
    have herase : S.erase (S.max' hSn) = T.erase (T.max' hTn) := by
      apply ih
      · rw [Finset.card_erase_of_mem (S.max'_mem hSn), hS]; rfl
      · rw [Finset.card_erase_of_mem (T.max'_mem hTn), hT]; rfl
      · rw [gapMS_erase_max S hSn, gapMS_erase_max T hTn, hg, hsup]
    rw [← Finset.insert_erase (S.max'_mem hSn), ← Finset.insert_erase (T.max'_mem hTn),
      herase, hmax]

/-- The non-zero gaps: an integer partition of `invNat S`. -/
def gapParts (S : Finset (Fin n)) : Multiset ℕ := (gapMS S).filter (fun x => x ≠ 0)

theorem gapMS_eq_parts_add (S : Finset (Fin n)) :
    gapMS S = gapParts S + Multiset.replicate (S.card - Multiset.card (gapParts S)) 0 := by
  classical
  have h := Multiset.filter_add_not (fun x : ℕ => x ≠ 0) (gapMS S)
  have hz : (gapMS S).filter (fun x => ¬ x ≠ 0) =
      Multiset.replicate (Multiset.card ((gapMS S).filter (fun x => ¬ x ≠ 0))) 0 := by
    apply Multiset.eq_replicate_card.mpr
    intro b hb
    simpa using (Multiset.mem_filter.mp hb).2
  have hc := congrArg Multiset.card h
  rw [Multiset.card_add, card_gapMS] at hc
  unfold gapParts
  conv_lhs => rw [← h, hz]
  congr 2
  omega

theorem eq_of_gapParts_eq {S T : Finset (Fin n)} (hc : S.card = T.card)
    (hp : gapParts S = gapParts T) : S = T := by
  apply eq_of_gapMS_eq S.card S T rfl hc.symm
  rw [gapMS_eq_parts_add S, gapMS_eq_parts_add T, hp, hc]

/-- Subsets of size `s` with `j` inversions number at most `p(j)`. -/
theorem card_fixed_size_inv_le (s j : ℕ) :
    (univ.filter (fun S : Finset (Fin n) => S.card = s ∧ invNat S = j)).card ≤
      Fintype.card (Nat.Partition j) := by
  classical
  have hmem : ∀ S ∈ univ.filter (fun S : Finset (Fin n) => S.card = s ∧ invNat S = j),
      gapParts S ∈ (univ : Finset (Nat.Partition j)).image Nat.Partition.parts := by
    intro S hS
    have hS' := (Finset.mem_filter.mp hS).2
    refine Finset.mem_image.mpr ⟨⟨gapParts S, ?_, ?_⟩, Finset.mem_univ _, rfl⟩
    · intro i hi
      have := (Multiset.mem_filter.mp hi).2
      omega
    · unfold gapParts
      rw [← hS'.2, ← sum_gapMS]
      have h := Multiset.filter_add_not (fun x : ℕ => x ≠ 0) (gapMS S)
      have hz : ((gapMS S).filter (fun x => ¬ x ≠ 0)).sum = 0 := by
        apply Multiset.sum_eq_zero
        intro x hx
        simpa using (Multiset.mem_filter.mp hx).2
      conv_rhs => rw [← h]
      rw [Multiset.sum_add, hz, add_zero]
  calc _ ≤ ((univ : Finset (Nat.Partition j)).image Nat.Partition.parts).card := by
        apply Finset.card_le_card_of_injOn gapParts hmem
        intro S hS T hT h
        have hS' := (Finset.mem_filter.mp hS).2
        have hT' := (Finset.mem_filter.mp hT).2
        exact eq_of_gapParts_eq (hS'.1.trans hT'.1.symm) h
    _ ≤ (univ : Finset (Nat.Partition j)).card := Finset.card_image_le
    _ = Fintype.card (Nat.Partition j) := Finset.card_univ

/-- Subsets of `Fin n` with at most `M` inversions number at most `(n+1)·P(M)`. -/
theorem card_invNat_le (M : ℕ) :
    (univ.filter (fun S : Finset (Fin n) => invNat S ≤ M)).card ≤ (n + 1) * Pcum M := by
  classical
  have hcover : univ.filter (fun S : Finset (Fin n) => invNat S ≤ M) ⊆
      (range (n + 1)).biUnion (fun s => (range (M + 1)).biUnion
        (fun j => univ.filter (fun S : Finset (Fin n) => S.card = s ∧ invNat S = j))) := by
    intro S hS
    have hS' := (Finset.mem_filter.mp hS).2
    simp only [Finset.mem_biUnion, Finset.mem_range, Finset.mem_filter, Finset.mem_univ,
      true_and]
    refine ⟨S.card, ?_, invNat S, by omega, rfl, rfl⟩
    have := Finset.card_le_univ S
    simp only [Fintype.card_fin] at this
    omega
  calc _ ≤ _ := Finset.card_le_card hcover
    _ ≤ ∑ s ∈ range (n + 1), ((range (M + 1)).biUnion
          (fun j => univ.filter (fun S : Finset (Fin n) => S.card = s ∧ invNat S = j))).card :=
        Finset.card_biUnion_le
    _ ≤ ∑ s ∈ range (n + 1), Pcum M := by
        apply Finset.sum_le_sum
        intro s _
        calc _ ≤ ∑ j ∈ range (M + 1),
              (univ.filter (fun S : Finset (Fin n) => S.card = s ∧ invNat S = j)).card :=
              Finset.card_biUnion_le
          _ ≤ _ := Finset.sum_le_sum (fun j _ => card_fixed_size_inv_le s j)
    _ = (n + 1) * Pcum M := by rw [Finset.sum_const, Finset.card_range, smul_eq_mul]

/-- Inversions with respect to an arbitrary rank function. -/
def invRank {α : Type*} [LinearOrder α] (r : Fin n → α) (S : Finset (Fin n)) : ℕ :=
  (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ r p.1 < r p.2)).card

/-- For any injective rank function the same bound holds (relabel by the realising permutation). -/
theorem card_invRank_le {α : Type*} [LinearOrder α] (r : Fin n → α) (hr : Function.Injective r)
    (M : ℕ) :
    (univ.filter (fun S : Finset (Fin n) => invRank r S ≤ M)).card ≤ (n + 1) * Pcum M := by
  classical
  obtain ⟨σ, hσ⟩ := exists_perm_of_injective r hr
  have hinv : ∀ S : Finset (Fin n), invNat (S.map σ.symm.toEmbedding) = invRank r S := by
    intro S
    unfold invNat invRank
    symm
    apply Finset.card_equiv (Equiv.prodCongr σ.symm σ.symm)
    intro p
    simp only [Finset.mem_filter, Finset.mem_univ, true_and, Equiv.prodCongr_apply,
      Prod.map_fst, Prod.map_snd, Finset.mem_map, Equiv.coe_toEmbedding]
    constructor
    · rintro ⟨h1, h2, h3⟩
      refine ⟨?_, ⟨p.2, h2, rfl⟩, (hσ p.1 p.2).mpr h3⟩
      rintro ⟨w, hw, hw'⟩
      exact h1 (σ.symm.injective hw' ▸ hw)
    · rintro ⟨h1, ⟨u, hu, hu'⟩, h3⟩
      have hu2 : u = p.2 := σ.symm.injective hu'
      refine ⟨fun h => h1 ⟨p.1, h, rfl⟩, hu2 ▸ hu, (hσ p.1 p.2).mp h3⟩
  calc _ ≤ (univ.filter (fun T : Finset (Fin n) => invNat T ≤ M)).card := by
        apply Finset.card_le_card_of_injOn (fun S => S.map σ.symm.toEmbedding)
        · intro S hS
          simp only [Finset.coe_filter, Set.mem_setOf_eq, Finset.mem_univ, true_and] at hS ⊢
          rw [hinv]; exact hS
        · intro S _ T _ h
          exact Finset.map_injective _ h
    _ ≤ _ := card_invNat_le M

/-- The block-consecutive vertex order: blocks in index order, vertices by label inside. -/
def blockRank (B : OrdPart n) (v : Fin n) : Fin n ×ₗ Fin n := toLex (B v, v)

theorem blockRank_injective (B : OrdPart n) : Function.Injective (blockRank B) := by
  intro u v h
  have h' := congrArg (fun x => (ofLex x).2) h
  simpa [blockRank] using h'

/-- `inv_σ(S) ≤ b² + 2 I_𝓑(S)` for the block-consecutive order `σ` (019, Theorem A, step 3). -/
theorem invRank_block_le (B : OrdPart n) (S : Finset (Fin n)) :
    invRank (blockRank B) S ≤ bmax B ^ 2 + 2 * cutInv B S := by
  classical
  have hcover : univ.filter (fun p : Fin n × Fin n =>
        p.1 ∉ S ∧ p.2 ∈ S ∧ blockRank B p.1 < blockRank B p.2) ⊆
      univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 = B p.2) ∪
        univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 < B p.2) := by
    intro p hp
    simp only [Finset.mem_filter, Finset.mem_univ, true_and, Finset.mem_union, blockRank,
      Prod.Lex.toLex_lt_toLex] at hp ⊢
    rcases hp.2.2 with h | ⟨h, -⟩
    · exact Or.inr ⟨hp.1, hp.2.1, h⟩
    · exact Or.inl ⟨hp.1, hp.2.1, h⟩
  have h1 := (Finset.card_le_card hcover).trans (Finset.card_union_le _ _)
  have h2 := sameBlockCut_le B S
  unfold invRank
  unfold sameBlockCut at h2
  unfold cutInv at h2 ⊢
  omega

/-- **Discovery 019, Theorem A.** `|{S : I_𝓑(S) ≤ K}| ≤ (n+1)·P(2K + b²)`. -/
theorem card_cutInv_le (B : OrdPart n) (K : ℕ) :
    (univ.filter (fun S : Finset (Fin n) => cutInv B S ≤ K)).card ≤
      (n + 1) * Pcum (2 * K + bmax B ^ 2) := by
  classical
  calc _ ≤ (univ.filter (fun S : Finset (Fin n) =>
          invRank (blockRank B) S ≤ 2 * K + bmax B ^ 2)).card := by
        apply Finset.card_le_card
        intro S hS
        simp only [Finset.mem_filter, Finset.mem_univ, true_and] at hS ⊢
        have := invRank_block_le B S
        omega
    _ ≤ _ := card_invRank_le (blockRank B) (blockRank_injective B) _

/-- Lemma 2, first part: a `k`-cut `S` has `I_𝓑(S) ≤ k + N⁻ ≤ k + K₀(𝓑)` for every `𝓑`. -/
theorem cutInv_le_of_kcut (A : WMat n) (B : OrdPart n) (S : Finset (Fin n)) (k : ℕ)
    (hS : weakMajorityCut A S ≤ k) : cutInv B S ≤ k + K0 A B := by
  classical
  have hcover : univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 < B p.2) ⊆
      univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ 0 ≤ A p.1 p.2) ∪
        (crossPairs B).filter (fun p => A p.1 p.2 < 0) := by
    intro p hp
    simp only [Finset.mem_filter, Finset.mem_univ, true_and, Finset.mem_union, crossPairs] at hp ⊢
    rcases le_or_gt 0 (A p.1 p.2) with h | h
    · exact Or.inl ⟨hp.1, hp.2.1, h⟩
    · exact Or.inr ⟨hp.2.2, h⟩
  have h1 := (Finset.card_le_card hcover).trans (Finset.card_union_le _ _)
  have h2 := Nneg_add_zero_le_K0 A B
  unfold cutInv
  unfold weakMajorityCut at hS
  unfold Nneg at h2
  omega

/-- **`cut_count_bound` (Discovery 022, Lemma 2).** If `λ(A) ≤ k`, then (i) for a minimising
partition `𝓑*`, every `k`-cut `S` has `I_{𝓑*}(S) ≤ k + K₀(𝓑*)`, and (ii) the number of
`k`-cuts is at most `(n+1)·P(3k)`. -/
theorem cut_count_bound (A : WMat n) (k : ℕ) (hk : lam A ≤ k) :
    (∃ B : OrdPart n, lamB A B = lam A ∧
      ∀ S : Finset (Fin n), weakMajorityCut A S ≤ k → cutInv B S ≤ k + K0 A B) ∧
    (univ.filter (fun S : Finset (Fin n) => weakMajorityCut A S ≤ k)).card ≤
      (n + 1) * Pcum (3 * k) := by
  classical
  obtain ⟨B, hB⟩ := exists_lamB_eq_lam A
  refine ⟨⟨B, hB, fun S hS => cutInv_le_of_kcut A B S k hS⟩, ?_⟩
  have hlamB : bmax B ^ 2 + 3 * K0 A B ≤ k := by
    have := hB ▸ hk; unfold lamB at this; exact this
  calc _ ≤ (univ.filter (fun S : Finset (Fin n) => cutInv B S ≤ k + K0 A B)).card := by
        apply Finset.card_le_card
        intro S hS
        simp only [Finset.mem_filter, Finset.mem_univ, true_and] at hS ⊢
        exact cutInv_le_of_kcut A B S k hS
    _ ≤ (n + 1) * Pcum (2 * (k + K0 A B) + bmax B ^ 2) := card_cutInv_le B _
    _ ≤ (n + 1) * Pcum (3 * k) := by
        apply Nat.mul_le_mul_left
        apply Pcum_mono
        omega

end Westfall022
