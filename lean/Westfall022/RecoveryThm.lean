import Westfall022.Recovery

/-!
# Discovery 022, Theorem 3: the Westfall Partition Recovery Theorem (Stage C)

`recognize A k` runs the procedure of `Recovery.lean`:
* Stage 1 abort rule: if `|𝒞_k| > (n+1)·P(3k)`, answer "no" (justified by `cut_count_bound`);
* Stage 2: minimise `b² + 3⌊dist_{τ,b}(V)⌋` over the candidate thresholds `τ` (positive entries
  of `A`, or `∞`) and block caps `b ≤ ⌊√k⌋`; accept iff the minimum is `≤ k`, and return the
  partition extracted from a minimising `(τ, b)`.

Proved here:
* `partition_recovery_sound`  — an accepted partition satisfies `λ(𝓑̂) ≤ k` (so `λ(A) ≤ k`);
* `partition_recovery_complete` — if `λ(A) ≤ k`, the procedure accepts;
* `partition_recovery_minimal` — an accepted partition attains the global minimum `λ(A)`.
The ingredients "every accepted path is a valid ordered partition", "the threshold cost has the
intended meaning" and "the floor preserves the minimum" are `extract_spec`, `costPartition_some`
/ `costPartition_none` and `floor_costPartition_*`.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-! ## The threshold cost of a partition has the intended meaning -/

/-- `Σ_{(u,v) cross} φ_τ(c_uv)`. -/
def costPartition (A : WMat n) (B : OrdPart n) (τ : Option ℚ) : ℚ :=
  ∑ p ∈ crossPairs B, phi τ (A p.1 p.2)

theorem costPartition_none (A : WMat n) (B : OrdPart n) :
    costPartition A B none = (valInf A B : ℚ) := by
  unfold costPartition phi valInf Nneg
  rw [Finset.sum_const, nsmul_eq_mul, mul_one]
  have hsplit := Finset.card_filter_add_card_filter_not (s := crossPairs B)
    (p := fun p => A p.1 p.2 < 0)
  have hnot : (crossPairs B).filter (fun p => ¬ A p.1 p.2 < 0) =
      (crossPairs B).filter (fun p => 0 ≤ A p.1 p.2) :=
    Finset.filter_congr (fun p _ => not_lt)
  rw [hnot] at hsplit
  rw [← hsplit]

/-- For a finite threshold `t`: `Σ φ_t = N⁻ + Z(t) + X/t`. -/
theorem costPartition_some (A : WMat n) (B : OrdPart n) (t : ℚ) :
    costPartition A B (some t) = (Nneg A B : ℚ) + (Zthr A B t : ℚ) + Xneg A B / t := by
  unfold costPartition Nneg Zthr Xneg
  have hpt : ∀ p ∈ crossPairs B, phi (some t) (A p.1 p.2) =
      (if A p.1 p.2 < 0 then (1 : ℚ) else 0) +
        (if 0 ≤ A p.1 p.2 ∧ A p.1 p.2 < t then (1 : ℚ) else 0) +
        (if A p.1 p.2 < 0 then -A p.1 p.2 / t else 0) := by
    intro p _
    simp only [phi]
    by_cases h0 : A p.1 p.2 < 0
    · simp [h0, not_le.mpr h0]
    · by_cases h1 : A p.1 p.2 < t
      · simp [h0, h1, not_lt.mp h0]
      · simp [h0, h1]
  rw [Finset.sum_congr rfl hpt, Finset.sum_add_distrib, Finset.sum_add_distrib,
    Finset.sum_boole, Finset.sum_boole, ← Finset.sum_filter]
  simp_rw [div_eq_mul_inv]
  rw [← Finset.sum_mul]

theorem floor_costPartition_none (A : WMat n) (B : OrdPart n) :
    ⌊costPartition A B none⌋₊ = valInf A B := by
  rw [costPartition_none, Nat.floor_natCast]

theorem floor_costPartition_some (A : WMat n) (B : OrdPart n) {t : ℚ} (ht : 0 < t) :
    ⌊costPartition A B (some t)⌋₊ = valFin A B t := by
  rw [costPartition_some, add_comm, ← Nat.cast_add,
    Nat.floor_add_natCast (div_nonneg (Xneg_nonneg A B) ht.le)]
  unfold valFin; ring

/-! ## Labellings are ordered partitions -/

/-- The ordered partition with block index `g v` (all indices below `n`). -/
def partOf (g : Fin n → ℕ) : OrdPart n := fun v => ⟨g v % n, Nat.mod_lt _ (Fin.pos v)⟩

theorem partOf_val (g : Fin n → ℕ) (hg : ∀ v, g v < n) (v : Fin n) :
    ((partOf g v : Fin n) : ℕ) = g v := by
  simp [partOf, Nat.mod_eq_of_lt (hg v)]

theorem partOf_lt_iff (g : Fin n → ℕ) (hg : ∀ v, g v < n) (u v : Fin n) :
    partOf g u < partOf g v ↔ g u < g v := by
  rw [Fin.lt_def, partOf_val g hg, partOf_val g hg]

theorem labelCost_univ_eq (A : WMat n) (τ : Option ℚ) (g : Fin n → ℕ) (hg : ∀ v, g v < n) :
    labelCost A τ univ g = costPartition A (partOf g) τ := by
  unfold labelCost costPartition crossPairs
  rw [Finset.sum_filter, ← Finset.univ_product_univ, Finset.sum_product]
  refine Finset.sum_congr rfl (fun u _ => Finset.sum_congr rfl (fun v _ => ?_))
  rw [if_congr (partOf_lt_iff g hg u v).symm rfl rfl]

theorem bmax_partOf_le (g : Fin n → ℕ) (hg : ∀ v, g v < n) (b : ℕ)
    (hb : ∀ j, (univ.filter (fun v => g v = j)).card ≤ b) : bmax (partOf g) ≤ b := by
  unfold bmax
  apply Finset.sup_le
  intro k _
  refine le_trans (le_of_eq ?_) (hb k)
  unfold block
  congr 1; ext v
  simp only [Finset.mem_filter, Finset.mem_univ, true_and, Fin.ext_iff, partOf_val g hg]

/-! ## The recognition procedure -/

/-- Candidate thresholds: `∞` (`none`) and every positive entry of `A`. -/
def tauSet (A : WMat n) : Finset (Option ℚ) :=
  insert none ((univ.filter (fun p : Fin n × Fin n => 0 < A p.1 p.2)).image
    (fun p => some (A p.1 p.2)))

/-- Candidate `(τ, b)` pairs, `b ≤ ⌊√k⌋`. -/
def candidates (A : WMat n) (k : ℕ) : Finset (Option ℚ × ℕ) :=
  tauSet A ×ˢ range (Nat.sqrt k + 1)

theorem candidates_nonempty (A : WMat n) (k : ℕ) : (candidates A k).Nonempty :=
  ⟨(none, 0), Finset.mem_product.mpr ⟨Finset.mem_insert_self _ _, by simp⟩⟩

/-- Reported value for one candidate: `b² + 3⌊dist_{τ,b}(V)⌋`, or `⊤` if `V` is unreachable. -/
noncomputable def candVal (A : WMat n) (k : ℕ) (q : Option ℚ × ℕ) : WithTop ℕ :=
  if h : dist A k q.1 q.2 univ = ⊤ then ⊤
  else ((q.2 ^ 2 + 3 * ⌊(dist A k q.1 q.2 univ).untop h⌋₊ : ℕ) : WithTop ℕ)

/-- The minimised reported value. -/
noncomputable def recogVal (A : WMat n) (k : ℕ) : WithTop ℕ :=
  (candidates A k).inf (candVal A k)

/-- A minimising candidate. -/
noncomputable def bestCand (A : WMat n) (k : ℕ) : Option ℚ × ℕ :=
  Classical.choose (Finset.exists_min_image (candidates A k) (candVal A k)
    (candidates_nonempty A k))

theorem bestCand_spec (A : WMat n) (k : ℕ) :
    bestCand A k ∈ candidates A k ∧ candVal A k (bestCand A k) = recogVal A k := by
  have h := Classical.choose_spec (Finset.exists_min_image (candidates A k) (candVal A k)
    (candidates_nonempty A k))
  refine ⟨h.1, le_antisymm (Finset.le_inf (fun q hq => h.2 q hq)) (Finset.inf_le h.1)⟩

/-- **The Westfall partition-recovery procedure.** Returns `some 𝓑̂` (accept) or `none`. -/
noncomputable def recognize (A : WMat n) (k : ℕ) : Option (OrdPart n) :=
  if (reachable A k).card > (n + 1) * Pcum (3 * k) then none
  else if recogVal A k ≤ (k : WithTop ℕ) then
    some (partOf (extract A k (bestCand A k).1 (bestCand A k).2 univ).2)
  else none

/-! ## Soundness of reported values -/

theorem tau_pos_of_mem {A : WMat n} {t : ℚ} (h : some t ∈ tauSet A) : 0 < t := by
  simp only [tauSet, Finset.mem_insert, reduceCtorEq, false_or, Finset.mem_image,
    Finset.mem_filter, Finset.mem_univ, true_and, Option.some.injEq] at h
  obtain ⟨p, hp, rfl⟩ := h
  exact hp

/-- A finite candidate value bounds `λ` of the extracted partition. -/
theorem lamB_extract_le (A : WMat n) (k : ℕ) (q : Option ℚ × ℕ) (hq : q ∈ candidates A k)
    (hfin : dist A k q.1 q.2 univ ≠ ⊤) :
    ((lamB A (partOf (extract A k q.1 q.2 univ).2) : ℕ) : WithTop ℕ) ≤ candVal A k q := by
  obtain ⟨h1, h2, h3, h4⟩ := extract_spec A k q.1 q.2 n univ (by simp) hfin
  set g := (extract A k q.1 q.2 univ).2
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

/-- Every reported value is at least `λ(A)`. -/
theorem lam_le_recogVal (A : WMat n) (k : ℕ) : ((lam A : ℕ) : WithTop ℕ) ≤ recogVal A k := by
  unfold recogVal
  apply Finset.le_inf
  intro q hq
  by_cases hfin : dist A k q.1 q.2 univ = ⊤
  · simp [candVal, hfin]
  · exact le_trans (WithTop.coe_le_coe.mpr (lam_le_lamB A _)) (lamB_extract_le A k q hq hfin)

/-! ## Completeness: the chain of a minimising partition is a path in the node DAG -/

theorem blocksBelow_zero (B : OrdPart n) : blocksBelow B 0 = ∅ := by
  ext v; simp [blocksBelow]

theorem blocksBelow_succ (B : OrdPart n) (i : ℕ) (hi : i < n) :
    blocksBelow B (i + 1) = blocksBelow B i ∪ block B ⟨i, hi⟩ := by
  ext v
  simp only [blocksBelow, block, Finset.mem_union, Finset.mem_filter, Finset.mem_univ, true_and,
    Fin.ext_iff]
  omega

theorem blocksBelow_n (B : OrdPart n) : blocksBelow B n = univ := by
  ext v; simp [blocksBelow]

theorem disjoint_blocksBelow_block (B : OrdPart n) (i : ℕ) (hi : i < n) :
    Disjoint (blocksBelow B i) (block B ⟨i, hi⟩) := by
  rw [Finset.disjoint_left]
  intro v hv hv'
  simp only [blocksBelow, block, Finset.mem_filter, Finset.mem_univ, true_and] at hv hv'
  rw [hv'] at hv; simp at hv

/-- If `λ(𝓑) ≤ k`, all sets `C_i ∪ Y` (`Y ⊆ B_i`) are reachable `k`-cuts. -/
theorem blocksBelow_union_reachable (A : WMat n) (hA : IsSkew A) (B : OrdPart n) (k : ℕ)
    (hk : lamB A B ≤ k) :
    ∀ i (hi : i < n), ∀ Y ⊆ block B ⟨i, hi⟩, blocksBelow B i ∪ Y ∈ reachable A k := by
  have hcut : ∀ (i : ℕ) (hi : i < n), ∀ Y ⊆ block B ⟨i, hi⟩,
      weakMajorityCut A (blocksBelow B i ∪ Y) ≤ k := by
    intro i hi Y hY
    have h := blocksBelow_union_cut_le A hA B ⟨i, hi⟩ Y hY
    unfold lamB at hk
    have : bmax B ^ 2 / 4 ≤ bmax B ^ 2 := Nat.div_le_self _ _
    simp only at h
    omega
  intro i
  induction i with
  | zero =>
    intro hi Y hY
    rw [blocksBelow_zero, Finset.empty_union]
    induction Y using Finset.induction_on with
    | empty => exact empty_mem_reachable A k
    | insert v Y hvY ih =>
      have hsub : Y ⊆ block B ⟨0, hi⟩ := (Finset.subset_insert v Y).trans hY
      have h := insert_mem_reachable A k (ih hsub) hvY
      apply h
      have := hcut 0 hi (insert v Y) hY
      rwa [blocksBelow_zero, Finset.empty_union] at this
  | succ i ih =>
    intro hi Y hY
    have hi' : i < n := by omega
    have hbase : blocksBelow B (i + 1) ∈ reachable A k := by
      rw [blocksBelow_succ B i hi']
      exact ih hi' _ le_rfl
    induction Y using Finset.induction_on with
    | empty => rw [Finset.union_empty]; exact hbase
    | insert v Y hvY ihY =>
      have hsub : Y ⊆ block B ⟨i + 1, hi⟩ := (Finset.subset_insert v Y).trans hY
      by_cases hvC : v ∈ blocksBelow B (i + 1) ∪ Y
      · have : blocksBelow B (i + 1) ∪ insert v Y = blocksBelow B (i + 1) ∪ Y := by
          rw [Finset.union_insert, Finset.insert_eq_of_mem hvC]
        rw [this]; exact ihY hsub
      · rw [Finset.union_insert]
        exact insert_mem_reachable A k (ihY hsub) hvC (by
          rw [← Finset.union_insert]; exact hcut (i + 1) hi (insert v Y) hY)

theorem blocksBelow_mem_nodes (A : WMat n) (hA : IsSkew A) (B : OrdPart n) (k : ℕ)
    (hk : lamB A B ≤ k) (i : ℕ) (hi : i ≤ n) : blocksBelow B i ∈ nodes A k := by
  unfold nodes
  rw [Finset.mem_filter]
  constructor
  · rcases Nat.eq_zero_or_pos i with rfl | hpos
    · rw [blocksBelow_zero]; exact empty_mem_reachable A k
    · obtain ⟨j, rfl⟩ : ∃ j, i = j + 1 := ⟨i - 1, by omega⟩
      rw [blocksBelow_succ B j (by omega)]
      exact blocksBelow_union_reachable A hA B k hk j (by omega) _ le_rfl
  · have h := blocksBelow_cut_le A hA B i
    unfold lamB at hk
    rw [Nat.le_div_iff_mul_le (by norm_num)]
    omega

/-- Partial cost of the first `i` blocks. -/
def chainCost (A : WMat n) (B : OrdPart n) (τ : Option ℚ) (i : ℕ) : ℚ :=
  ∑ u ∈ blocksBelow B i, ∑ v ∈ blocksBelow B i, if B u < B v then phi τ (A u v) else 0

theorem chainCost_succ (A : WMat n) (B : OrdPart n) (τ : Option ℚ) (i : ℕ) (hi : i < n) :
    chainCost A B τ (i + 1) = chainCost A B τ i + edgeCost A τ (blocksBelow B i) (block B ⟨i, hi⟩) := by
  unfold chainCost edgeCost
  have hdisj := disjoint_blocksBelow_block B i hi
  rw [blocksBelow_succ B i hi, Finset.sum_union hdisj]
  have hC : ∀ u ∈ blocksBelow B i,
      (∑ v ∈ blocksBelow B i ∪ block B ⟨i, hi⟩, if B u < B v then phi τ (A u v) else 0) =
        (∑ v ∈ blocksBelow B i, if B u < B v then phi τ (A u v) else 0) +
          ∑ v ∈ block B ⟨i, hi⟩, phi τ (A u v) := by
    intro u hu
    rw [Finset.sum_union hdisj]
    congr 1
    refine Finset.sum_congr rfl (fun v hv => ?_)
    have hu' : (B u : ℕ) < i := (Finset.mem_filter.mp hu).2
    have hv' : B v = ⟨i, hi⟩ := (Finset.mem_filter.mp hv).2
    have : B u < B v := by rw [hv', Fin.lt_def]; exact hu'
    simp [this]
  have hY : ∀ u ∈ block B ⟨i, hi⟩,
      (∑ v ∈ blocksBelow B i ∪ block B ⟨i, hi⟩, if B u < B v then phi τ (A u v) else 0) = 0 := by
    intro u hu
    apply Finset.sum_eq_zero
    intro v hv
    have hu' : B u = ⟨i, hi⟩ := (Finset.mem_filter.mp hu).2
    have : ¬ B u < B v := by
      rw [hu', not_lt, Fin.le_def]
      rcases Finset.mem_union.mp hv with hv | hv
      · exact le_of_lt (Finset.mem_filter.mp hv).2
      · rw [(Finset.mem_filter.mp hv).2]
    simp [this]
  rw [Finset.sum_congr rfl hC, Finset.sum_congr rfl hY, Finset.sum_const_zero, add_zero,
    Finset.sum_add_distrib]

theorem chainCost_n (A : WMat n) (B : OrdPart n) (τ : Option ℚ) :
    chainCost A B τ n = costPartition A B τ := by
  unfold chainCost costPartition crossPairs
  rw [blocksBelow_n, Finset.sum_filter, ← Finset.univ_product_univ, Finset.sum_product]

/-- Shortest-path completeness: along the chain of `𝓑`, `dist(C_i) ≤ chainCost(i)`. -/
theorem dist_blocksBelow_le (A : WMat n) (hA : IsSkew A) (B : OrdPart n) (k : ℕ)
    (hk : lamB A B ≤ k) (τ : Option ℚ) (b : ℕ) (hb : bmax B ≤ b) :
    ∀ i, i ≤ n → dist A k τ b (blocksBelow B i) ≤ (chainCost A B τ i : WithTop ℚ) := by
  intro i
  induction i with
  | zero => intro _; rw [blocksBelow_zero, dist_empty]; simp [chainCost, blocksBelow_zero]
  | succ i ih =>
    intro hi
    have hi' : i < n := by omega
    have hrec := ih (by omega)
    rw [chainCost_succ A B τ i hi']
    by_cases hemp : block B ⟨i, hi'⟩ = ∅
    · have hsame : blocksBelow B (i + 1) = blocksBelow B i := by
        rw [blocksBelow_succ B i hi', hemp, Finset.union_empty]
      rw [hsame, hemp]; simpa [edgeCost] using hrec
    · have hC'node := blocksBelow_mem_nodes A hA B k hk (i + 1) hi
      have hCnode := blocksBelow_mem_nodes A hA B k hk i (by omega)
      have hdisj := disjoint_blocksBelow_block B i hi'
      have hsucc := blocksBelow_succ B i hi'
      have hne : blocksBelow B (i + 1) ≠ ∅ := by
        rw [hsucc]; intro h
        exact hemp (Finset.subset_empty.mp (h ▸ Finset.subset_union_right))
      have hdiff : blocksBelow B (i + 1) \ blocksBelow B i = block B ⟨i, hi'⟩ := by
        rw [hsucc, Finset.union_sdiff_left, Finset.sdiff_eq_self_of_disjoint hdisj.symm]
      have hpred : blocksBelow B i ∈ preds A k b (blocksBelow B (i + 1)) := by
        unfold preds
        rw [Finset.mem_filter]
        refine ⟨hCnode, ?_, ?_⟩
        · rw [hsucc]
          refine Finset.ssubset_iff_subset_ne.mpr ⟨Finset.subset_union_left, fun h => hemp ?_⟩
          rw [Finset.eq_empty_iff_forall_notMem]
          intro v hv
          have hvC : v ∈ blocksBelow B i := by
            rw [h]; exact Finset.mem_union_right _ hv
          exact Finset.disjoint_left.mp hdisj hvC hv
        · rw [hdiff]
          exact le_trans (Finset.le_sup (f := fun k => (block B k).card)
            (Finset.mem_univ _)) hb
      rw [dist_of_mem A k τ b hne hC'node]
      refine le_trans (Finset.inf_le hpred) ?_
      rw [hdiff, WithTop.coe_add]
      exact add_le_add hrec le_rfl

/-- If `λ(A) ≤ k`, the reported minimum is at most `λ(A)`. -/
theorem recogVal_le_lam (A : WMat n) (hA : IsSkew A) (k : ℕ) (hk : lam A ≤ k) :
    recogVal A k ≤ ((lam A : ℕ) : WithTop ℕ) := by
  obtain ⟨B, hB⟩ := exists_lamB_eq_lam A
  have hBk : lamB A B ≤ k := hB ▸ hk
  have hbsq : bmax B ≤ Nat.sqrt k := by
    rw [Nat.le_sqrt']; unfold lamB at hBk; omega
  -- the threshold attaining `K₀(𝓑)` is a candidate
  obtain ⟨τ, hτmem, hτK⟩ : ∃ τ ∈ tauSet A, ⌊costPartition A B τ⌋₊ = K0 A B := by
    rcases K0_attained A B with h | ⟨t, ht, h⟩
    · exact ⟨none, Finset.mem_insert_self _ _, by rw [floor_costPartition_none, h]⟩
    · refine ⟨some t, ?_, by rw [floor_costPartition_some A B (pos_of_mem_thresholds A B ht), h]⟩
      unfold thresholds at ht
      obtain ⟨p, hp, rfl⟩ := Finset.mem_image.mp ht
      have hp' := Finset.mem_filter.mp hp
      exact Finset.mem_insert_of_mem (Finset.mem_image.mpr
        ⟨p, Finset.mem_filter.mpr ⟨Finset.mem_univ _, hp'.2⟩, rfl⟩)
  have hq : (τ, bmax B) ∈ candidates A k :=
    Finset.mem_product.mpr ⟨hτmem, Finset.mem_range.mpr (by omega)⟩
  have hd := dist_blocksBelow_le A hA B k hBk τ (bmax B) le_rfl n le_rfl
  rw [blocksBelow_n, chainCost_n] at hd
  have hfin : dist A k τ (bmax B) univ ≠ ⊤ := ne_top_of_le_ne_top WithTop.coe_ne_top hd
  refine le_trans (Finset.inf_le hq) ?_
  unfold candVal
  simp only [dif_neg hfin]
  rw [← hB]
  apply WithTop.coe_le_coe.mpr
  unfold lamB
  have hx : (dist A k τ (bmax B) univ).untop hfin ≤ costPartition A B τ := by
    rw [← WithTop.coe_le_coe, WithTop.coe_untop]; exact hd
  have := Nat.floor_le_floor (a := (dist A k τ (bmax B) univ).untop hfin) hx
  rw [hτK] at this
  exact Nat.add_le_add le_rfl (Nat.mul_le_mul_left 3 this)

/-! ## The three recovery theorems -/

/-- **`partition_recovery_sound`.** If the procedure accepts with `𝓑̂`, then `𝓑̂` is an ordered
partition with `λ(𝓑̂) ≤ k`; in particular `λ(A) ≤ k`. -/
theorem partition_recovery_sound (A : WMat n) (k : ℕ) (B : OrdPart n)
    (h : recognize A k = some B) : lamB A B ≤ k ∧ lam A ≤ k := by
  unfold recognize at h
  split_ifs at h with h1 h2
  obtain ⟨hmem, hval⟩ := bestCand_spec A k
  have hfin : dist A k (bestCand A k).1 (bestCand A k).2 univ ≠ ⊤ := by
    intro htop
    have : candVal A k (bestCand A k) = ⊤ := by simp [candVal, htop]
    rw [hval] at this; rw [this] at h2; exact absurd h2 (by simp)
  have hle := lamB_extract_le A k (bestCand A k) hmem hfin
  rw [hval] at hle
  have hB : lamB A B ≤ k := by
    rw [Option.some.injEq] at h; rw [← h]
    exact WithTop.coe_le_coe.mp (le_trans hle h2)
  exact ⟨hB, (lam_le_lamB A B).trans hB⟩

/-- **`partition_recovery_complete`.** If `λ(A) ≤ k`, the procedure accepts. -/
theorem partition_recovery_complete (A : WMat n) (hA : IsSkew A) (k : ℕ) (hk : lam A ≤ k) :
    ∃ B, recognize A k = some B := by
  unfold recognize
  have hcount : (reachable A k).card ≤ (n + 1) * Pcum (3 * k) := by
    refine le_trans (Finset.card_le_card ?_) (cut_count_bound A k hk).2
    intro S hS
    exact Finset.mem_filter.mpr ⟨Finset.mem_univ _, cut_le_of_mem_reachable A k hS⟩
  have hval : recogVal A k ≤ (k : WithTop ℕ) :=
    (recogVal_le_lam A hA k hk).trans (WithTop.coe_le_coe.mpr hk)
  rw [if_neg (not_lt.mpr hcount), if_pos hval]
  exact ⟨_, rfl⟩

/-- **`partition_recovery_minimal`.** An accepted partition attains the global minimum:
`λ(𝓑̂) = λ(A) = min_𝓑 (b² + 3K₀(𝓑))`. -/
theorem partition_recovery_minimal (A : WMat n) (hA : IsSkew A) (k : ℕ) (B : OrdPart n)
    (h : recognize A k = some B) : lamB A B = lam A := by
  obtain ⟨-, hk⟩ := partition_recovery_sound A k B h
  apply le_antisymm _ (lam_le_lamB A B)
  unfold recognize at h
  split_ifs at h with h1 h2
  obtain ⟨hmem, hval⟩ := bestCand_spec A k
  have hfin : dist A k (bestCand A k).1 (bestCand A k).2 univ ≠ ⊤ := by
    intro htop
    have : candVal A k (bestCand A k) = ⊤ := by simp [candVal, htop]
    rw [hval] at this; rw [this] at h2; exact absurd h2 (by simp)
  have hle := lamB_extract_le A k (bestCand A k) hmem hfin
  rw [hval] at hle
  rw [Option.some.injEq] at h; rw [← h]
  exact WithTop.coe_le_coe.mp (le_trans hle (recogVal_le_lam A hA k hk))

end Westfall022
