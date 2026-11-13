import Westfall022.PartitionGrowthPrelude
import Mathlib.Algebra.BigOperators.Field
import Mathlib.Topology.Algebra.InfiniteSum.Real

/-!
# Mission 024, Challenge 3: growth of the partition function

**Main results.**
* `partition_card_le_exp`: `p(M) ≤ e^{3√M}` for every `M`;
* `Pcum_le_exp`: `P(M) ≤ (M+1)·e^{3√M}`;
* `partition_card_le_two_pow`: `p(M) ≤ 2^{5(⌊√M⌋+1)}` (integer, closed form);
* `Pcum_le_two_pow`: `P(M) ≤ (M+1)·2^{5(⌊√M⌋+1)}`.

The constant `3` is larger than the sharp `pi·√(2/3) ≈ 2.565` but gives the same
`2^{O(√M)}` growth. All analytic steps are proved here from Mathlib (`Real.log` series,
`p`-series summability); nothing is assumed.

**Proof.** For `0 < x < 1`:
1. `p(M)·x^M ≤ ∏_{k=1}^{M} Σ_{m=0}^{M} x^{km}` (partitions inject into multiplicity vectors);
2. `Σ_{m≤M} y^m ≤ 1/(1-y) = exp(-log(1-y))`;
3. `-log(1-y) = Σ_{m≥1} y^m/m`, hence `Σ_k -log(1-x^k) = Σ_m (1/m) Σ_k x^{km} ≤ Σ_m (1/m)·x/(m(1-x)) ≤ 2t`
   with `t = x/(1-x)` (using `1 - x^m ≥ m x^{m-1}(1-x)` and `Σ 1/m² ≤ 2`);
4. with `x = t/(1+t)`, `x^{-M} = (1+1/t)^M ≤ e^{M/t}`, so `p(M) ≤ e^{2t + M/t}`; take `t = √M`.
-/

namespace Westfall022

open Finset

/-! ## Step 1: partitions inject into multiplicity vectors -/

section Combinatorial

variable {M : ℕ}

theorem parts_le_of_mem (q : Nat.Partition M) {i : ℕ} (hi : i ∈ q.parts) : i ≤ M := by
  rw [← q.parts_sum]; exact Multiset.le_sum_of_mem hi

theorem card_parts_le (q : Nat.Partition M) : Multiset.card q.parts ≤ M := by
  calc Multiset.card q.parts = (q.parts.map (fun _ => (1 : ℕ))).sum := by simp
    _ ≤ (q.parts.map id).sum := Multiset.sum_map_le_sum_map _ _ (fun i hi => q.parts_pos hi)
    _ = M := by simp [q.parts_sum]

/-- Multiplicity of the part `k + 1`, for `k : Fin M`. -/
def multVec (q : Nat.Partition M) : Fin M → ℕ := fun k => q.parts.count (k.val + 1)

theorem multVec_injective : Function.Injective (multVec (M := M)) := by
  intro q σ h
  apply Nat.Partition.ext
  apply Multiset.ext.mpr
  intro a
  by_cases ha : 1 ≤ a ∧ a ≤ M
  · have := congrFun h ⟨a - 1, by omega⟩
    simp only [multVec] at this
    rwa [show a - 1 + 1 = a by omega] at this
  · have h1 : a ∉ q.parts := fun hm => ha ⟨q.parts_pos hm, parts_le_of_mem q hm⟩
    have h2 : a ∉ σ.parts := fun hm => ha ⟨σ.parts_pos hm, parts_le_of_mem σ hm⟩
    rw [Multiset.count_eq_zero.mpr h1, Multiset.count_eq_zero.mpr h2]

theorem multVec_weighted_sum (q : Nat.Partition M) :
    ∑ k : Fin M, (k.val + 1) * multVec q k = M := by
  classical
  have hsum : q.parts.sum = ∑ m ∈ Finset.Ico 1 (M + 1), q.parts.count m * m := by
    rw [Finset.sum_multiset_count]
    apply Finset.sum_subset
    · intro m hm
      rw [Multiset.mem_toFinset] at hm
      rw [Finset.mem_Ico]
      exact ⟨q.parts_pos hm, Nat.lt_succ_of_le (parts_le_of_mem q hm)⟩
    · intro m _ hm
      rw [Multiset.mem_toFinset] at hm
      simp [Multiset.count_eq_zero.mpr hm]
  have hrange : ∑ m ∈ Finset.Ico 1 (M + 1), q.parts.count m * m =
      ∑ k : Fin M, (k.val + 1) * multVec q k := by
    rw [Finset.sum_Ico_eq_sum_range, show M + 1 - 1 = M by omega,
      ← Fin.sum_univ_eq_sum_range (fun k => q.parts.count (1 + k) * (1 + k)) M]
    refine Finset.sum_congr rfl (fun k _ => ?_)
    simp only [multVec]; rw [add_comm 1 k.val, mul_comm]
  conv_rhs => rw [← q.parts_sum]
  rw [hsum, hrange]

theorem multVec_mem (q : Nat.Partition M) :
    multVec q ∈ Fintype.piFinset (fun _ : Fin M => range (M + 1)) := by
  rw [Fintype.mem_piFinset]
  intro k
  rw [Finset.mem_range]
  exact Nat.lt_succ_of_le ((Multiset.count_le_card _ _).trans (card_parts_le q))

/-- **Finite generating-function domination.** -/
theorem card_mul_pow_le_prod (x : ℝ) (hx : 0 ≤ x) :
    (Fintype.card (Nat.Partition M) : ℝ) * x ^ M ≤
      ∏ k : Fin M, ∑ m ∈ range (M + 1), x ^ ((k.val + 1) * m) := by
  classical
  rw [Finset.prod_univ_sum]
  have hterm : ∀ q : Nat.Partition M,
      ∏ k : Fin M, x ^ ((k.val + 1) * multVec q k) = x ^ M := by
    intro q
    rw [Finset.prod_pow_eq_pow_sum, multVec_weighted_sum]
  calc (Fintype.card (Nat.Partition M) : ℝ) * x ^ M
      = ∑ q : Nat.Partition M, x ^ M := by simp [Finset.sum_const, Finset.card_univ]
    _ = ∑ q : Nat.Partition M, ∏ k : Fin M, x ^ ((k.val + 1) * multVec q k) :=
        Finset.sum_congr rfl (fun q _ => (hterm q).symm)
    _ = ∑ f ∈ (univ : Finset (Nat.Partition M)).image multVec,
          ∏ k : Fin M, x ^ ((k.val + 1) * f k) :=
        (Finset.sum_image (f := fun f : Fin M → ℕ => ∏ k : Fin M, x ^ ((k.val + 1) * f k))
          (fun a _ b _ h => multVec_injective h)).symm
    _ ≤ _ := by
        apply Finset.sum_le_sum_of_subset_of_nonneg
        · intro f hf
          obtain ⟨q, -, rfl⟩ := Finset.mem_image.mp hf
          exact multVec_mem q
        · intro f _ _
          exact Finset.prod_nonneg (fun k _ => pow_nonneg hx _)

end Combinatorial

/-! ## Step 2–3: analytic estimates -/

theorem geom_sum_le_inv {y : ℝ} (hy0 : 0 ≤ y) (hy1 : y < 1) (N : ℕ) :
    ∑ m ∈ range N, y ^ m ≤ 1 / (1 - y) := by
  have h1 : 0 < 1 - y := by linarith
  rw [le_div_iff₀ h1, mul_comm, mul_neg_geom_sum]
  linarith [pow_nonneg hy0 N]

/-- `1 - x^m ≥ m·x^{m-1}·(1-x)`, in the form `m·x^m·(1-x) ≤ x·(1-x^m)`. -/
theorem pow_gap (x : ℝ) (hx0 : 0 ≤ x) (hx1 : x ≤ 1) (m : ℕ) :
    (m : ℝ) * x ^ m * (1 - x) ≤ x * (1 - x ^ m) := by
  have hg : 1 - x ^ m = (1 - x) * ∑ j ∈ range m, x ^ j := by
    have := geom_sum_mul x m; linarith
  rw [hg]
  have hlow : (m : ℝ) * x ^ m ≤ x * ∑ j ∈ range m, x ^ j := by
    rw [Finset.mul_sum]
    calc (m : ℝ) * x ^ m = ∑ j ∈ range m, x ^ m := by simp
      _ ≤ ∑ j ∈ range m, x * x ^ j := by
          apply Finset.sum_le_sum
          intro j hj
          rw [Finset.mem_range] at hj
          rw [← pow_succ']
          exact pow_le_pow_of_le_one hx0 hx1 (by omega)
  nlinarith [sub_nonneg.mpr hx1]

theorem sum_inv_sq_le_two (N : ℕ) : ∑ i ∈ range N, 1 / ((i : ℝ) + 1) ^ 2 ≤ 2 := by
  have key : ∀ N : ℕ, ∑ i ∈ range (N + 1), 1 / ((i : ℝ) + 1) ^ 2 ≤ 2 - 1 / ((N : ℝ) + 1) := by
    intro N
    induction N with
    | zero => norm_num
    | succ N ih =>
      rw [Finset.sum_range_succ]
      have hN : (0 : ℝ) < (N : ℝ) + 1 := by positivity
      have hstep : 1 / (((N + 1 : ℕ) : ℝ) + 1) ^ 2 ≤
          1 / ((N : ℝ) + 1) - 1 / (((N + 1 : ℕ) : ℝ) + 1) := by
        push_cast
        rw [div_sub_div _ _ (ne_of_gt hN) (by positivity), div_le_div_iff₀ (by positivity)
          (by positivity)]
        nlinarith
      linarith
  rcases N with _ | N
  · simp
  · linarith [key N, show (0 : ℝ) ≤ 1 / ((N : ℝ) + 1) by positivity]

theorem summable_inv_sq : Summable (fun i : ℕ => 1 / ((i : ℝ) + 1) ^ 2) := by
  have h := (summable_nat_add_iff 1).mpr (Real.summable_one_div_nat_pow.mpr (by norm_num : 1 < 2))
  refine h.congr (fun i => ?_)
  push_cast; ring

theorem tsum_inv_sq_le_two : ∑' i : ℕ, 1 / ((i : ℝ) + 1) ^ 2 ≤ 2 :=
  Real.tsum_le_of_sum_range_le (fun i => by positivity) sum_inv_sq_le_two

/-- `Σ_{k<M} -log(1 - x^{k+1}) ≤ 2·x/(1-x)` for `0 ≤ x < 1`. -/
theorem sum_neg_log_le (x : ℝ) (hx0 : 0 ≤ x) (hx1 : x < 1) (M : ℕ) :
    ∑ k ∈ range M, -Real.log (1 - x ^ (k + 1)) ≤ 2 * (x / (1 - x)) := by
  have h1x : 0 < 1 - x := by linarith
  set t := x / (1 - x) with ht
  have ht0 : 0 ≤ t := div_nonneg hx0 h1x.le
  -- the log series for each factor
  have hser : ∀ k ∈ range M, HasSum (fun i : ℕ => (x ^ (k + 1)) ^ (i + 1) / ((i : ℝ) + 1))
      (-Real.log (1 - x ^ (k + 1))) := by
    intro k _
    have hy : |x ^ (k + 1)| < 1 := by
      rw [abs_of_nonneg (pow_nonneg hx0 _)]
      exact pow_lt_one₀ hx0 hx1 (by omega)
    simpa using Real.hasSum_pow_div_log_of_abs_lt_one hy
  -- swap the finite sum over k with the series over i
  have hswap : ∑ k ∈ range M, -Real.log (1 - x ^ (k + 1)) =
      ∑' i : ℕ, ∑ k ∈ range M, (x ^ (k + 1)) ^ (i + 1) / ((i : ℝ) + 1) := by
    rw [Summable.tsum_finsetSum (fun k hk => (hser k hk).summable)]
    exact Finset.sum_congr rfl (fun k hk => (hser k hk).tsum_eq.symm)
  -- bound each inner sum by t / (i+1)^2
  have hbound : ∀ i : ℕ, ∑ k ∈ range M, (x ^ (k + 1)) ^ (i + 1) / ((i : ℝ) + 1) ≤
      t * (1 / ((i : ℝ) + 1) ^ 2) := by
    intro i
    set y := x ^ (i + 1) with hy
    have hy0 : 0 ≤ y := pow_nonneg hx0 _
    have hy1 : y < 1 := pow_lt_one₀ hx0 hx1 (by omega)
    have hm : (0 : ℝ) < (i : ℝ) + 1 := by positivity
    have h1y : 0 < 1 - y := by linarith
    have hrw : ∀ k, (x ^ (k + 1)) ^ (i + 1) = y * y ^ k := by
      intro k; rw [hy, ← pow_mul, mul_comm, pow_mul, pow_succ']
    have hgeom := geom_sum_le_inv hy0 hy1 M
    have hgap := pow_gap x hx0 hx1.le (i + 1)
    push_cast at hgap
    have hfrac : y * (1 / (1 - y)) ≤ t / ((i : ℝ) + 1) := by
      rw [ht, div_div, mul_one_div, div_le_div_iff₀ h1y (by positivity)]
      nlinarith [hgap]
    calc ∑ k ∈ range M, (x ^ (k + 1)) ^ (i + 1) / ((i : ℝ) + 1)
        = (y * ∑ k ∈ range M, y ^ k) / ((i : ℝ) + 1) := by
          rw [Finset.mul_sum, Finset.sum_div]
          exact Finset.sum_congr rfl (fun k _ => by rw [hrw])
      _ ≤ (y * (1 / (1 - y))) / ((i : ℝ) + 1) := by gcongr
      _ ≤ (t / ((i : ℝ) + 1)) / ((i : ℝ) + 1) := by gcongr
      _ = t * (1 / ((i : ℝ) + 1) ^ 2) := by field_simp
  have hsumL : Summable (fun i : ℕ => ∑ k ∈ range M, (x ^ (k + 1)) ^ (i + 1) / ((i : ℝ) + 1)) :=
    summable_sum (fun k hk => (hser k hk).summable)
  have hsumR : Summable (fun i : ℕ => t * (1 / ((i : ℝ) + 1) ^ 2)) := summable_inv_sq.mul_left t
  rw [hswap]
  calc ∑' i : ℕ, ∑ k ∈ range M, (x ^ (k + 1)) ^ (i + 1) / ((i : ℝ) + 1)
      ≤ ∑' i : ℕ, t * (1 / ((i : ℝ) + 1) ^ 2) := hsumL.tsum_le_tsum hbound hsumR
    _ = t * ∑' i : ℕ, 1 / ((i : ℝ) + 1) ^ 2 := tsum_mul_left
    _ ≤ t * 2 := mul_le_mul_of_nonneg_left tsum_inv_sq_le_two ht0
    _ = 2 * t := by ring

/-! ## Step 4: the bound -/

theorem card_partition_mul_pow_le_exp (M : ℕ) (x : ℝ) (hx0 : 0 ≤ x) (hx1 : x < 1) :
    (Fintype.card (Nat.Partition M) : ℝ) * x ^ M ≤ Real.exp (2 * (x / (1 - x))) := by
  refine (card_mul_pow_le_prod x hx0).trans ?_
  have hfac : ∀ k : Fin M, ∑ m ∈ range (M + 1), x ^ ((k.val + 1) * m) ≤
      Real.exp (-Real.log (1 - x ^ (k.val + 1))) := by
    intro k
    have hy0 : 0 ≤ x ^ (k.val + 1) := pow_nonneg hx0 _
    have hy1 : x ^ (k.val + 1) < 1 := pow_lt_one₀ hx0 hx1 (by omega)
    have h1 : 0 < 1 - x ^ (k.val + 1) := by linarith
    rw [Real.exp_neg, Real.exp_log h1, ← one_div]
    simp_rw [pow_mul]
    exact geom_sum_le_inv hy0 hy1 _
  calc ∏ k : Fin M, ∑ m ∈ range (M + 1), x ^ ((k.val + 1) * m)
      ≤ ∏ k : Fin M, Real.exp (-Real.log (1 - x ^ (k.val + 1))) :=
        Finset.prod_le_prod (fun k _ => Finset.sum_nonneg (fun m _ => pow_nonneg hx0 _))
          (fun k _ => hfac k)
    _ = Real.exp (∑ k : Fin M, -Real.log (1 - x ^ (k.val + 1))) := (Real.exp_sum _ _).symm
    _ = Real.exp (∑ k ∈ range M, -Real.log (1 - x ^ (k + 1))) := by
        rw [Fin.sum_univ_eq_sum_range (fun k => -Real.log (1 - x ^ (k + 1)))]
    _ ≤ Real.exp (2 * (x / (1 - x))) := Real.exp_le_exp.mpr (sum_neg_log_le x hx0 hx1 M)

/-- **`p(M) ≤ e^{3√M}`.** -/
theorem partition_card_le_exp (M : ℕ) :
    (Fintype.card (Nat.Partition M) : ℝ) ≤ Real.exp (3 * Real.sqrt M) := by
  rcases Nat.eq_zero_or_pos M with rfl | hM
  · simp [Fintype.card_unique]
  set s := Real.sqrt M with hs
  have hs0 : 0 < s := Real.sqrt_pos.mpr (by exact_mod_cast hM)
  have hss : s * s = M := Real.mul_self_sqrt (by positivity)
  set x := s / (1 + s) with hx
  have hx0 : 0 ≤ x := by positivity
  have hx1 : x < 1 := by rw [hx, div_lt_one (by positivity)]; linarith
  have hxpos : 0 < x := by positivity
  have h1x : 1 - x = 1 / (1 + s) := by rw [hx]; field_simp; ring
  have hratio : x / (1 - x) = s := by rw [h1x, hx]; field_simp
  have hmain := card_partition_mul_pow_le_exp M x hx0 hx1
  rw [hratio] at hmain
  -- 1/x = 1 + 1/s ≤ e^{1/s}, so x^{-M} ≤ e^{M/s} = e^{s}
  have hinv : 1 / x ≤ Real.exp (1 / s) := by
    rw [hx, one_div_div, show (1 + s) / s = 1 / s + 1 by field_simp]
    exact Real.add_one_le_exp _
  have hpowinv : (1 / x) ^ M ≤ Real.exp s := by
    calc (1 / x) ^ M ≤ Real.exp (1 / s) ^ M := pow_le_pow_left₀ (by positivity) hinv M
      _ = Real.exp (M * (1 / s)) := (Real.exp_nat_mul _ M).symm
      _ = Real.exp s := by congr 1; rw [← hss]; field_simp
  have hxM : 0 < x ^ M := pow_pos hxpos M
  have hp : (Fintype.card (Nat.Partition M) : ℝ) ≤ Real.exp (2 * s) * (1 / x) ^ M := by
    rw [one_div_pow, mul_one_div, le_div_iff₀ hxM]; exact hmain
  calc (Fintype.card (Nat.Partition M) : ℝ) ≤ Real.exp (2 * s) * (1 / x) ^ M := hp
    _ ≤ Real.exp (2 * s) * Real.exp s := mul_le_mul_of_nonneg_left hpowinv (Real.exp_pos _).le
    _ = Real.exp (3 * s) := by rw [← Real.exp_add]; ring_nf

/-- `P(M) ≤ (M+1)·e^{3√M}`. -/
theorem Pcum_le_exp (M : ℕ) : (Pcum M : ℝ) ≤ (M + 1) * Real.exp (3 * Real.sqrt M) := by
  unfold Pcum
  push_cast
  calc ∑ j ∈ range (M + 1), (Fintype.card (Nat.Partition j) : ℝ)
      ≤ ∑ j ∈ range (M + 1), Real.exp (3 * Real.sqrt M) := by
        apply Finset.sum_le_sum
        intro j hj
        refine (partition_card_le_exp j).trans (Real.exp_le_exp.mpr ?_)
        have : (j : ℝ) ≤ M := by exact_mod_cast Nat.lt_succ_iff.mp (Finset.mem_range.mp hj)
        nlinarith [Real.sqrt_le_sqrt this]
    _ = (M + 1) * Real.exp (3 * Real.sqrt M) := by
        rw [Finset.sum_const, Finset.card_range, nsmul_eq_mul]; push_cast; ring

/-! ## Closed-form integer bounds (used by the executable abort test) -/

theorem exp_three_le_32 : Real.exp 3 ≤ 32 := by
  have h := Real.exp_one_lt_d9
  have h3 : Real.exp 3 = Real.exp 1 ^ 3 := by rw [← Real.exp_nat_mul]; norm_num
  rw [h3]
  have h0 : 0 ≤ Real.exp 1 := (Real.exp_pos 1).le
  nlinarith [pow_le_pow_left₀ h0 h.le 3]

/-- **`p(M) ≤ 2^{5(⌊√M⌋+1)}`.** -/
theorem partition_card_le_two_pow (M : ℕ) :
    Fintype.card (Nat.Partition M) ≤ 2 ^ (5 * (Nat.sqrt M + 1)) := by
  have hsq : Real.sqrt M ≤ (Nat.sqrt M : ℝ) + 1 := by
    rw [Real.sqrt_le_left (by positivity)]
    have := Nat.lt_succ_sqrt M
    have : (M : ℝ) < ((Nat.sqrt M + 1 : ℕ) : ℝ) ^ 2 := by
      rw [sq]; exact_mod_cast (by simpa [sq] using this)
    push_cast at this; linarith
  have hreal : (Fintype.card (Nat.Partition M) : ℝ) ≤ (2 : ℝ) ^ (5 * (Nat.sqrt M + 1)) := by
    refine (partition_card_le_exp M).trans ?_
    calc Real.exp (3 * Real.sqrt M) ≤ Real.exp (3 * ((Nat.sqrt M + 1 : ℕ) : ℝ)) := by
          apply Real.exp_le_exp.mpr; push_cast; linarith
      _ = Real.exp 3 ^ (Nat.sqrt M + 1) := by rw [mul_comm, Real.exp_nat_mul]
      _ ≤ (32 : ℝ) ^ (Nat.sqrt M + 1) := pow_le_pow_left₀ (Real.exp_pos 3).le exp_three_le_32 _
      _ = (2 : ℝ) ^ (5 * (Nat.sqrt M + 1)) := by rw [pow_mul]; norm_num
  exact_mod_cast hreal

/-- **`P(M) ≤ (M+1)·2^{5(⌊√M⌋+1)}`.** -/
theorem Pcum_le_two_pow (M : ℕ) : Pcum M ≤ (M + 1) * 2 ^ (5 * (Nat.sqrt M + 1)) := by
  unfold Pcum
  calc ∑ j ∈ range (M + 1), Fintype.card (Nat.Partition j)
      ≤ ∑ j ∈ range (M + 1), 2 ^ (5 * (Nat.sqrt M + 1)) := by
        apply Finset.sum_le_sum
        intro j hj
        refine (partition_card_le_two_pow j).trans (Nat.pow_le_pow_right (by norm_num) ?_)
        have := Nat.sqrt_le_sqrt (Nat.lt_succ_iff.mp (Finset.mem_range.mp hj))
        omega
    _ = (M + 1) * 2 ^ (5 * (Nat.sqrt M + 1)) := by rw [Finset.sum_const, Finset.card_range,
        smul_eq_mul]

end Westfall022
