import Westfall022.Lemma1

/-!
# Discovery 022, Theorem 1: optima are narrow in the weak-majority digraph

For every ordered partition `𝓑`:
1. every prefix `S` of every optimal ordering has `cut_A(S) ≤ b² + 2K₀ + N⁻ + z ≤ λ(𝓑)`,
   hence `ω(A) ≤ λ(A)`;
2. every prefix union `C_i = B₁ ∪ … ∪ B_i` has `cut_A(C_i) ≤ N⁻ + z ≤ K₀(𝓑)`;
3. every set `C_{i-1} ∪ Y` with `Y ⊆ B_i` has `cut_A ≤ ⌊b²/4⌋ + K₀(𝓑)`.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-- Crossing pairs that point *backwards* across blocks with a non-negative margin inject (by
swapping) into the cross pairs with margin `≤ 0`, so there are at most `N⁻ + z` of them. -/
theorem card_backward_weak_le (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (P : Fin n × Fin n → Prop) [DecidablePred P] :
    (univ.filter (fun p : Fin n × Fin n => P p ∧ B p.2 < B p.1 ∧ 0 ≤ A p.1 p.2)).card ≤
      Nneg A B + zeroCount A B := by
  classical
  have hinj : (univ.filter (fun p : Fin n × Fin n => P p ∧ B p.2 < B p.1 ∧ 0 ≤ A p.1 p.2)).card ≤
      ((crossPairs B).filter (fun p => A p.1 p.2 ≤ 0)).card := by
    apply Finset.card_le_card_of_injOn Prod.swap
    · intro p hp
      simp only [Finset.coe_filter, Set.mem_setOf_eq, Finset.mem_univ, true_and] at hp
      simp only [crossPairs, Finset.coe_filter, Finset.mem_filter, Finset.mem_univ, true_and,
        Prod.fst_swap, Prod.snd_swap, Set.mem_setOf_eq]
      refine ⟨hp.2.1, ?_⟩
      rw [hA p.2 p.1]; linarith [hp.2.2]
    · intro p _ q _ h
      exact Prod.swap_injective h
  have hsplit : ((crossPairs B).filter (fun p => A p.1 p.2 ≤ 0)).card ≤
      Nneg A B + zeroCount A B := by
    unfold Nneg zeroCount
    calc _ ≤ ((crossPairs B).filter (fun p => A p.1 p.2 < 0) ∪
              (crossPairs B).filter (fun p => A p.1 p.2 = 0)).card := by
          apply Finset.card_le_card
          intro p hp
          simp only [Finset.mem_filter, Finset.mem_union] at hp ⊢
          rcases hp.2.lt_or_eq with h | h
          · exact Or.inl ⟨hp.1, h⟩
          · exact Or.inr ⟨hp.1, h⟩
      _ ≤ _ := Finset.card_union_le _ _
  exact hinj.trans hsplit

/-- Theorem 1(1), per partition: every prefix of every optimum has
`cut_A(S) ≤ b² + 2·I_𝓑(S) + N⁻ + z ≤ b² + 3K₀(𝓑)`. -/
theorem prefix_cut_le_lamB (A : WMat n) (hA : IsSkew A) (B : OrdPart n)
    (π : Equiv.Perm (Fin n)) (hπ : IsOptimal A π) (t : ℕ) :
    weakMajorityCut A (prefixSet π t) ≤ lamB A B := by
  classical
  set S := prefixSet π t
  have hcover : univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ 0 ≤ A p.1 p.2) ⊆
      (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 = B p.2) ∪
        univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 < B p.2)) ∪
        univ.filter (fun p : Fin n × Fin n =>
          (p.1 ∉ S ∧ p.2 ∈ S) ∧ B p.2 < B p.1 ∧ 0 ≤ A p.1 p.2) := by
    intro p hp
    simp only [Finset.mem_filter, Finset.mem_univ, true_and, Finset.mem_union] at hp ⊢
    rcases lt_trichotomy (B p.1) (B p.2) with h | h | h
    · exact Or.inl (Or.inr ⟨hp.1, hp.2.1, h⟩)
    · exact Or.inl (Or.inl ⟨hp.1, hp.2.1, h⟩)
    · exact Or.inr ⟨⟨hp.1, hp.2.1⟩, h, hp.2.2⟩
  have hc := Finset.card_le_card hcover
  have hu1 := Finset.card_union_le
    (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 = B p.2) ∪
      univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 < B p.2))
    (univ.filter (fun p : Fin n × Fin n => (p.1 ∉ S ∧ p.2 ∈ S) ∧ B p.2 < B p.1 ∧ 0 ≤ A p.1 p.2))
  have hu2 := Finset.card_union_le
    (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 = B p.2))
    (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 < B p.2))
  have hSB : sameBlockCut B S ≤ bmax B ^ 2 + cutInv B S := sameBlockCut_le B S
  have hI : cutInv B S ≤ K0 A B := by
    obtain ⟨h1, h2⟩ := k0_exchange_localization A hA B π hπ t
    exact h1.trans h2
  have hback := card_backward_weak_le A hA B (fun p => p.1 ∉ S ∧ p.2 ∈ S)
  have hNZ := Nneg_add_zero_le_K0 A B
  unfold weakMajorityCut lamB
  unfold sameBlockCut at hSB
  unfold cutInv at hSB hI
  omega

/-- **`optimal_prefix_width_bound` (Discovery 022, Theorem 1(1)).**
Every prefix of every optimal ordering has weak-majority cut at most `λ(A)`;
equivalently `ω(A) ≤ λ(A)`. -/
theorem optimal_prefix_width_bound (A : WMat n) (hA : IsSkew A) (π : Equiv.Perm (Fin n))
    (hπ : IsOptimal A π) (t : ℕ) : weakMajorityCut A (prefixSet π t) ≤ lam A := by
  obtain ⟨B, hB⟩ := exists_lamB_eq_lam A
  rw [← hB]
  exact prefix_cut_le_lamB A hA B π hπ t

/-- The union of the blocks with index `< k`. -/
def blocksBelow (B : OrdPart n) (k : ℕ) : Finset (Fin n) := univ.filter (fun v => (B v : ℕ) < k)

/-- Theorem 1(2): prefix unions `C_i` have `cut_A(C_i) ≤ N⁻ + z ≤ K₀(𝓑)`. -/
theorem blocksBelow_cut_le (A : WMat n) (hA : IsSkew A) (B : OrdPart n) (k : ℕ) :
    weakMajorityCut A (blocksBelow B k) ≤ K0 A B := by
  classical
  refine le_trans ?_ ((card_backward_weak_le A hA B (fun _ => True)).trans
    (Nneg_add_zero_le_K0 A B))
  unfold weakMajorityCut
  apply Finset.card_le_card
  intro p hp
  simp only [blocksBelow, Finset.mem_filter, Finset.mem_univ, true_and, not_lt] at hp ⊢
  refine ⟨?_, hp.2.2⟩
  rw [Fin.lt_def]; omega

/-- Theorem 1(3): `C_{k} ∪ Y` with `Y ⊆ B_k` has `cut_A ≤ ⌊b²/4⌋ + K₀(𝓑)`. -/
theorem blocksBelow_union_cut_le (A : WMat n) (hA : IsSkew A) (B : OrdPart n) (k : Fin n)
    (Y : Finset (Fin n)) (hY : Y ⊆ block B k) :
    weakMajorityCut A (blocksBelow B k ∪ Y) ≤ bmax B ^ 2 / 4 + K0 A B := by
  classical
  set S := blocksBelow B k ∪ Y
  have hcover : univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ 0 ≤ A p.1 p.2) ⊆
      ((block B k \ Y) ×ˢ Y) ∪
        univ.filter (fun p : Fin n × Fin n => True ∧ B p.2 < B p.1 ∧ 0 ≤ A p.1 p.2) := by
    intro p hp
    simp only [S, blocksBelow, Finset.mem_filter, Finset.mem_univ, true_and, Finset.mem_union,
      not_or, not_lt] at hp
    simp only [Finset.mem_union, Finset.mem_product, Finset.mem_sdiff, Finset.mem_filter,
      Finset.mem_univ, true_and]
    obtain ⟨⟨hw1, hw2⟩, hu, ha⟩ := hp
    have hwk : k ≤ B p.1 := by rw [Fin.le_def]; exact hw1
    rcases hu with hu | hu
    · right; refine ⟨?_, ha⟩; rw [Fin.lt_def]; rw [Fin.le_def] at hwk; omega
    · have huk : B p.2 = k := (Finset.mem_filter.mp (hY hu)).2
      rcases hwk.lt_or_eq with hlt | heq
      · right; exact ⟨huk ▸ hlt, ha⟩
      · left
        refine ⟨⟨?_, hw2⟩, hu⟩
        exact Finset.mem_filter.mpr ⟨Finset.mem_univ _, heq.symm⟩
  have hc := (Finset.card_le_card hcover).trans (Finset.card_union_le _ _)
  have hback := card_backward_weak_le A hA B (fun _ => True)
  have hNZ := Nneg_add_zero_le_K0 A B
  -- the same-block part: `|B_k ∖ Y| · |Y| ≤ ⌊b²/4⌋`
  have hprod : ((block B k \ Y) ×ˢ Y).card ≤ bmax B ^ 2 / 4 := by
    rw [Finset.card_product, Finset.card_sdiff_of_subset hY]
    have hb : (block B k).card ≤ bmax B :=
      Finset.le_sup (f := fun k => (block B k).card) (Finset.mem_univ k)
    have hYc : Y.card ≤ (block B k).card := Finset.card_le_card hY
    rw [Nat.le_div_iff_mul_le (by norm_num)]
    have key : ∀ c y : ℕ, y ≤ c → (c - y) * y * 4 ≤ c ^ 2 := by
      intro c y h
      obtain ⟨d, rfl⟩ := Nat.exists_eq_add_of_le h
      rw [Nat.add_sub_cancel_left]
      have h0 : (0 : ℤ) ≤ ((d : ℤ) - y) ^ 2 := sq_nonneg _
      zify
      nlinarith
    calc ((block B k).card - Y.card) * Y.card * 4 ≤ (block B k).card ^ 2 := key _ _ hYc
      _ ≤ bmax B ^ 2 := Nat.pow_le_pow_left hb 2
  unfold weakMajorityCut
  omega

end Westfall022
