import Westfall022.CostedAutoCut

/-!
# Mission 025: cost bounds for every component of `autoCutCosted`

All bounds are explicit polynomials in `N = n + 1` and in a size parameter `V`. The hypotheses
only say that the relevant state families have at most `V - 1` members. These hypotheses are
discharged in `Complexity.lean` from the closed-form abort bound and the round structure.
-/

namespace Westfall022

open Finset Cost

variable {n : ℕ}

/-! ## Arithmetic helpers -/

theorem pow_le_pow_of_le_one {N a b : ℕ} (hN : 1 ≤ N) (h : a ≤ b) : N ^ a ≤ N ^ b :=
  Nat.pow_le_pow_right hN h

theorem card_finset_fin_le (S : Finset (Fin n)) : S.card ≤ n := by
  simpa using Finset.card_le_univ S

/-! ## Layers -/

theorem image_univ_cost_le (S : Finset (Fin n)) :
    (cImage (setEq n) univ (fun v => charge (n + 1) (insert v S))).cost ≤ 3 * (n + 1) ^ 4 := by
  have h := cImage_cost_le (setEq n) (univ : Finset (Fin n))
    (fun v => charge (n + 1) (insert v S)) (n + 1) (fun _ _ => le_rfl)
  simp only [Finset.card_univ, Fintype.card_fin, setEq] at h ⊢
  nlinarith [Nat.zero_le n]

theorem image_univ_card_le (S : Finset (Fin n)) :
    (cImage (setEq n) univ (fun v => charge (n + 1) (insert v S))).val.card ≤ n + 1 := by
  rw [cImage_val]
  exact (Finset.card_image_le).trans (by simp)

theorem nextLayerC_cost_le (A : WMat n) (k s : ℕ) (L : Finset (Finset (Fin n))) (V : ℕ)
    (hL : L.card ≤ V) : (nextLayerC A k s L).cost ≤ 9 * (n + 1) ^ 4 * V ^ 2 := by
  unfold nextLayerC
  simp only [bind_cost]
  have h1 := cBiUnion_cost_le (setEq n) L (fun S =>
    cImage (setEq n) univ (fun v => charge (n + 1) (insert v S))) (3 * (n + 1) ^ 4) (n + 1)
    (fun S _ => image_univ_cost_le S) (fun S _ => image_univ_card_le S)
  have h2 := cBiUnion_card_le (setEq n) L (fun S =>
    cImage (setEq n) univ (fun v => charge (n + 1) (insert v S))) (n + 1)
    (fun S _ => image_univ_card_le S)
  generalize cBiUnion (setEq n) L (fun S =>
    cImage (setEq n) univ (fun v => charge (n + 1) (insert v S))) = X at h1 h2 ⊢
  have h3 := cFilter_cost_le X.val
    (fun T => charge (wmcLeaf n) (decide (T.card = s + 1 ∧ weakMajorityCut A T ≤ k)))
    (wmcLeaf n) (fun _ _ => le_rfl)
  simp only [setEq, wmcLeaf] at h1 h3 ⊢
  have hN : 1 ≤ n + 1 := Nat.succ_pos n
  have hX : X.val.card ≤ V * (n + 1) := h2.trans (Nat.mul_le_mul_right _ hL)
  have e1 : L.card * (3 * (n + 1) ^ 4 + 1) ≤ V * (4 * (n + 1) ^ 4) :=
    Nat.mul_le_mul hL (by nlinarith [Nat.one_le_pow 4 (n + 1) hN])
  have e2 : L.card * (n + 1) * (L.card * (n + 1)) * (n + 1) ^ 2 ≤ V ^ 2 * (n + 1) ^ 4 := by
    have := Nat.mul_le_mul (Nat.mul_le_mul_right (n + 1) hL) (Nat.mul_le_mul_right (n + 1) hL)
    calc L.card * (n + 1) * (L.card * (n + 1)) * (n + 1) ^ 2
        ≤ V * (n + 1) * (V * (n + 1)) * (n + 1) ^ 2 := Nat.mul_le_mul_right _ this
      _ = V ^ 2 * (n + 1) ^ 4 := by ring
  have e3 : X.val.card * (3 * (n + 1) ^ 3 + 1) ≤ V * (n + 1) * (4 * (n + 1) ^ 3) :=
    Nat.mul_le_mul hX (by nlinarith [Nat.one_le_pow 3 (n + 1) hN])
  have hV2 : V ≤ V ^ 2 := by nlinarith [Nat.zero_le V]
  have e4 : V * (n + 1) ^ 4 ≤ V ^ 2 * (n + 1) ^ 4 := Nat.mul_le_mul_right _ hV2
  nlinarith

theorem nextLayerC_card_le (A : WMat n) (k s : ℕ) (L : Finset (Finset (Fin n))) :
    (nextLayerC A k s L).val.card ≤ L.card * (n + 1) := by
  rw [nextLayerC_val]
  unfold nextLayer
  refine (Finset.card_filter_le _ _).trans ?_
  refine (Finset.card_biUnion_le).trans ?_
  have := Finset.sum_le_card_nsmul L (fun S => (univ.image (fun v => insert v S)).card) (n + 1)
    (fun S _ => (Finset.card_image_le).trans (by simp))
  simpa using this

/-- Every layer is a subfamily of `𝒞_k` (or empty). -/
theorem card_reachLayer_le (A : WMat n) (k s : ℕ) :
    (reachLayer A k s).card ≤ (reachable A k).card := by
  by_cases hs : s ≤ n
  · apply Finset.card_le_card
    intro S hS
    simp only [reachable, Finset.mem_biUnion, Finset.mem_range]
    exact ⟨s, by omega, hS⟩
  · have : reachLayer A k s = ∅ := by
      apply Finset.eq_empty_of_forall_notMem
      intro S hS
      have h1 := card_of_mem_reachLayer A k s S hS
      have h2 := card_finset_fin_le S
      omega
    rw [this]; simp

theorem reachLayerC_cost_le (A : WMat n) (k : ℕ) (V : ℕ) (hV : 1 ≤ V)
    (hR : (reachable A k).card ≤ V) :
    ∀ s, (reachLayerC A k s).cost ≤ (s + 1) * (9 * (n + 1) ^ 4 * V ^ 2)
  | 0 => by
    simp only [reachLayerC, charge_cost]
    have : 1 ≤ (n + 1) ^ 4 * V ^ 2 := Nat.mul_le_mul (Nat.one_le_pow _ _ (Nat.succ_pos n))
      (Nat.one_le_pow _ _ hV)
    nlinarith
  | s + 1 => by
    simp only [reachLayerC, bind_cost]
    have ih := reachLayerC_cost_le A k V hV hR s
    have h := nextLayerC_cost_le A k s (reachLayerC A k s).val V
      (by rw [reachLayerC_val]; exact (card_reachLayer_le A k s).trans hR)
    nlinarith

theorem capLayersC_cost_le (A : WMat n) (k U V : ℕ) (hV : 1 ≤ V) (hU : U ≤ V) :
    ∀ s, (capLayersC A k U s).cost ≤ (s + 1) * (12 * (n + 1) ^ 4 * V ^ 2)
  | 0 => by
    simp only [capLayersC, charge_cost]
    have : 1 ≤ (n + 1) ^ 4 * V ^ 2 := Nat.mul_le_mul (Nat.one_le_pow _ _ (Nat.succ_pos n))
      (Nat.one_le_pow _ _ hV)
    nlinarith
  | s + 1 => by
    have ih := capLayersC_cost_le A k U V hV hU s
    simp only [capLayersC, bind_cost]
    have hval := capLayersC_val A k U s
    have hP : 1 ≤ (n + 1) ^ 4 * V ^ 2 := Nat.mul_le_mul (Nat.one_le_pow _ _ (Nat.succ_pos n))
      (Nat.one_le_pow _ _ hV)
    rcases hc : (capLayersC A k U s).val with _ | ⟨L, c⟩
    · simp only [charge_cost]; nlinarith
    · simp only [bind_cost, charge_cost]
      rw [hval] at hc
      rcases capLayers_spec A k U s with ⟨h1, h2⟩ | ⟨h1, -⟩
      · rw [hc] at h1
        simp only [Option.some.injEq, Prod.mk.injEq] at h1
        obtain ⟨rfl, rfl⟩ := h1
        have hLc : (reachLayer A k s).card ≤ layerCount A k s := by
          unfold layerCount
          exact Finset.single_le_sum (f := fun i => (reachLayer A k i).card)
            (fun _ _ => Nat.zero_le _) (Finset.self_mem_range_succ s)
        have hL : (reachLayer A k s).card ≤ V := hLc.trans (h2.trans hU)
        have hn := nextLayerC_cost_le A k s (reachLayer A k s) V hL
        have hcard := nextLayerC_card_le A k s (reachLayer A k s)
        have e : (reachLayer A k s).card * (n + 1) ≤ (n + 1) ^ 4 * V ^ 2 := by
          have a1 : (reachLayer A k s).card * (n + 1) ≤ V * (n + 1) := Nat.mul_le_mul_right _ hL
          have a2 : V * (n + 1) ≤ (n + 1) ^ 4 * V ^ 2 := by
            have := mono_le (N := n + 1) (V := V) (a := 1) (b := 1) (A := 4) (B := 2)
              (Nat.succ_pos n) hV (by norm_num) (by norm_num)
            simpa [mul_comm] using this
          exact a1.trans a2
        nlinarith
      · rw [hc] at h1; exact absurd h1 (by simp)

theorem reachableC_cost_le (A : WMat n) (k V : ℕ) (hV : 1 ≤ V) (hR : (reachable A k).card ≤ V) :
    (reachableC A k).cost ≤ 11 * (n + 1) ^ 6 * V ^ 2 := by
  unfold reachableC
  have hN : 1 ≤ n + 1 := Nat.succ_pos n
  have h := cBiUnion_cost_le (setEq n) (range (n + 1)) (reachLayerC A k)
    ((n + 1) * (9 * (n + 1) ^ 4 * V ^ 2)) V
    (fun s hs => (reachLayerC_cost_le A k V hV hR s).trans
      (Nat.mul_le_mul_right _ (by simpa using hs)))
    (fun s _ => by rw [reachLayerC_val]; exact (card_reachLayer_le A k s).trans hR)
  simp only [Finset.card_range, setEq] at h ⊢
  have hP : 1 ≤ (n + 1) ^ 4 * V ^ 2 := Nat.mul_le_mul (Nat.one_le_pow _ _ hN)
    (Nat.one_le_pow _ _ hV)
  have e : (n + 1) * ((n + 1) * (9 * (n + 1) ^ 4 * V ^ 2) + 1) ≤ 10 * (n + 1) ^ 6 * V ^ 2 := by
    have : (n + 1) ≤ (n + 1) ^ 6 * V ^ 2 := by
      have := mono_le (N := n + 1) (V := V) (a := 1) (b := 0) (A := 6) (B := 2) hN hV
        (by norm_num) (by norm_num)
      simpa using this
    nlinarith
  have e2 : (n + 1) * V * ((n + 1) * V) * (n + 1) ^ 2 ≤ (n + 1) ^ 6 * V ^ 2 := by
    have : (n + 1) * V * ((n + 1) * V) * (n + 1) ^ 2 = (n + 1) ^ 4 * V ^ 2 := by ring
    rw [this]
    exact mono_le hN hV (by norm_num) le_rfl
  nlinarith

theorem nodesC_cost_le (A : WMat n) (k : ℕ) (R : Finset (Finset (Fin n))) (V : ℕ)
    (hR : R.card ≤ V) : (nodesC A k R).cost ≤ 4 * (n + 1) ^ 3 * V := by
  unfold nodesC
  have h := cFilter_cost_le R (fun S => charge (wmcLeaf n) (decide (weakMajorityCut A S ≤ k / 3)))
    (wmcLeaf n) (fun _ _ => le_rfl)
  simp only [wmcLeaf] at h ⊢
  have hN : 1 ≤ (n + 1) ^ 3 := Nat.one_le_pow _ _ (Nat.succ_pos n)
  have := Nat.mul_le_mul hR (le_refl (3 * (n + 1) ^ 3 + 1))
  nlinarith

/-! ## Shortest-path tables -/

theorem one_le_NV (V : ℕ) (hV : 1 ≤ V) (a b : ℕ) : 1 ≤ (n + 1) ^ a * V ^ b :=
  Nat.mul_le_mul (Nat.one_le_pow _ _ (Nat.succ_pos n)) (Nat.one_le_pow _ _ hV)

theorem stepC_cost_le (A : WMat n) (τ : Option ℚ) (T : Finset (Finset (Fin n) × WithTop ℚ))
    (C' C : Finset (Fin n)) (V : ℕ) (hV : 1 ≤ V) (hT : T.card ≤ V) :
    (stepC A τ T C' C).cost ≤ 10 * (n + 1) ^ 2 * V + 1 := by
  simp only [stepC, bind_cost, charge_cost]
  have h := cLookupTop_cost_le T C
  simp only [setEq, edgeLeaf] at h ⊢
  have := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) (Nat.mul_le_mul_left 2 hT)
  have hN : 1 ≤ (n + 1) ^ 2 := Nat.one_le_pow _ _ (Nat.succ_pos n)
  have e1 : (n + 1) ^ 2 ≤ (n + 1) ^ 2 * V := Nat.le_mul_of_pos_right _ hV
  nlinarith

theorem predsC_cost_le (Nd : Finset (Finset (Fin n))) (b : ℕ) (C' : Finset (Fin n)) (V : ℕ)
    (hNd : Nd.card ≤ V) : (predsC Nd b C').cost ≤ 4 * (n + 1) ^ 2 * V := by
  unfold predsC
  have h := cFilter_cost_le Nd (fun C => charge (3 * setEq n) (decide (C ⊂ C' ∧ (C' \ C).card ≤ b)))
    (3 * setEq n) (fun _ _ => le_rfl)
  simp only [setEq] at h ⊢
  have := Nat.mul_le_mul_right (3 * (n + 1) ^ 2 + 1) hNd
  have hN : 1 ≤ (n + 1) ^ 2 := Nat.one_le_pow _ _ (Nat.succ_pos n)
  nlinarith

theorem predsC_card_le (Nd : Finset (Finset (Fin n))) (b : ℕ) (C' : Finset (Fin n)) :
    (predsC Nd b C').val.card ≤ Nd.card := by
  unfold predsC; rw [cFilter_val]; exact Finset.card_filter_le _ _

theorem freshElem_cost_le (A : WMat n) (Nd : Finset (Finset (Fin n))) (τ : Option ℚ) (b : ℕ)
    (prev : Finset (Finset (Fin n) × WithTop ℚ)) (C' : Finset (Fin n)) (V : ℕ) (hV : 1 ≤ V)
    (hNd : Nd.card ≤ V) (hprev : prev.card ≤ V) :
    (do let ps ← predsC Nd b C'
        let v ← cInf ps (stepC A τ prev C')
        pure (C', v) : Cost (Finset (Fin n) × WithTop ℚ)).cost ≤ 16 * (n + 1) ^ 2 * V ^ 2 := by
  simp only [bind_cost, pure_cost, add_zero]
  have h1 := predsC_cost_le Nd b C' V hNd
  have h2 := cInf_cost_le (predsC Nd b C').val (stepC A τ prev C') (10 * (n + 1) ^ 2 * V + 1)
    (fun C _ => stepC_cost_le A τ prev C' C V hV hprev)
  have hc := (predsC_card_le Nd b C').trans hNd
  have h3 := Nat.mul_le_mul_right (10 * (n + 1) ^ 2 * V + 1 + 1) hc
  have hP := one_le_NV (n := n) V hV 2 1
  have e : (n + 1) ^ 2 * V ≤ (n + 1) ^ 2 * V ^ 2 :=
    Nat.mul_le_mul_left _ (by nlinarith)
  nlinarith

theorem distTabC_card_le (A : WMat n) (k : ℕ) (τ : Option ℚ) (b s : ℕ) :
    (distTabC A (nodes A k) τ b s).val.card ≤ (nodes A k).card + 1 := by
  rw [distTabC_val]; exact distTab_card_le A k τ b s

theorem distTabC_cost_le (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (V : ℕ) (hV : 1 ≤ V)
    (hNd : (nodes A k).card + 1 ≤ V) :
    ∀ s, (distTabC A (nodes A k) τ b s).cost ≤ (s + 1) * (30 * (n + 1) ^ 2 * V ^ 3)
  | 0 => by
    simp only [distTabC, charge_cost]
    have := one_le_NV (n := n) V hV 2 3
    nlinarith
  | s + 1 => by
    have ih := distTabC_cost_le A k τ b V hV hNd s
    simp only [distTabC, bind_cost]
    have hprev : (distTabC A (nodes A k) τ b s).val.card ≤ V :=
      (distTabC_card_le A k τ b s).trans hNd
    have hNd' : (nodes A k).card ≤ V := by omega
    generalize (distTabC A (nodes A k) τ b s) = P at ih hprev ⊢
    have hl := cFilter_cost_le (nodes A k) (fun C => charge (n + 1) (decide (C.card = s + 1)))
      (n + 1) (fun _ _ => le_rfl)
    have hlc : (cFilter (nodes A k) (fun C => charge (n + 1) (decide (C.card = s + 1)))).val.card
        ≤ V := by rw [cFilter_val]; exact (Finset.card_filter_le _ _).trans hNd'
    generalize cFilter (nodes A k) (fun C => charge (n + 1) (decide (C.card = s + 1))) = Ly
      at hl hlc ⊢
    have hi := cImage_cost_le (setEq n + 1) Ly.val (fun C' => do
      let ps ← predsC (nodes A k) b C'
      let v ← cInf ps (stepC A τ P.val C')
      pure (C', v)) (16 * (n + 1) ^ 2 * V ^ 2)
      (fun C' _ => freshElem_cost_le A (nodes A k) τ b P.val C' V hV hNd' hprev)
    have hic : (cImage (setEq n + 1) Ly.val (fun C' => do
      let ps ← predsC (nodes A k) b C'
      let v ← cInf ps (stepC A τ P.val C')
      pure (C', v))).val.card ≤ V := by
      rw [cImage_val]; exact Finset.card_image_le.trans hlc
    generalize cImage (setEq n + 1) Ly.val (fun C' => do
      let ps ← predsC (nodes A k) b C'
      let v ← cInf ps (stepC A τ P.val C')
      pure (C', v)) = F at hi hic ⊢
    simp only [cUnion, setEq] at hi ⊢
    have hP := one_le_NV (n := n) V hV 2 3
    have a1 := Nat.mul_le_mul_right (n + 1 + 1) hNd'
    have a2 := Nat.mul_le_mul_right (16 * (n + 1) ^ 2 * V ^ 2 + 1) hlc
    have a3 := Nat.mul_le_mul hlc hlc
    have a4 := Nat.mul_le_mul (Nat.add_le_add_right hprev 1) (Nat.add_le_add_right hic 1)
    have a5 := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) a3
    have a6 := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) a4
    have m1 : V * (n + 1 + 1) ≤ 2 * ((n + 1) ^ 2 * V ^ 3) := by
      have := mono_le (N := n + 1) (V := V) (a := 1) (b := 1) (A := 2) (B := 3) (Nat.succ_pos n) hV
        (by norm_num) (by norm_num)
      nlinarith
    have m2 : V * V * ((n + 1) ^ 2 + 1) ≤ 2 * ((n + 1) ^ 2 * V ^ 3) := by
      have := mono_le (N := n + 1) (V := V) (a := 2) (b := 2) (A := 2) (B := 3) (Nat.succ_pos n) hV
        le_rfl (by norm_num)
      have hN : 1 ≤ (n + 1) ^ 2 := Nat.one_le_pow _ _ (Nat.succ_pos n)
      nlinarith
    have m3 : (V + 1) * (V + 1) * ((n + 1) ^ 2 + 1) ≤ 8 * ((n + 1) ^ 2 * V ^ 3) := by
      have := mono_le (N := n + 1) (V := V) (a := 2) (b := 2) (A := 2) (B := 3) (Nat.succ_pos n) hV
        le_rfl (by norm_num)
      have hN : 1 ≤ (n + 1) ^ 2 := Nat.one_le_pow _ _ (Nat.succ_pos n)
      nlinarith
    have m4 : V * (16 * (n + 1) ^ 2 * V ^ 2 + 1) ≤ 17 * ((n + 1) ^ 2 * V ^ 3) := by
      have h1 : V * (16 * (n + 1) ^ 2 * V ^ 2) = 16 * ((n + 1) ^ 2 * V ^ 3) := by ring
      nlinarith
    linarith

/-! ## Candidate values, selection and extraction -/

theorem candValC_cost_le (A : WMat n) (k : ℕ) (q : Option ℚ × ℕ) (V : ℕ) (hV : 1 ≤ V)
    (hNd : (nodes A k).card + 1 ≤ V) :
    (candValC A (nodes A k) q).cost ≤ 38 * (n + 1) ^ 3 * V ^ 3 := by
  simp only [candValC, bind_cost, charge_cost]
  have h1 := distTabC_cost_le A k q.1 q.2 V hV hNd n
  have hT := (distTabC_card_le A k q.1 q.2 n).trans hNd
  have h2 := cLookupTop_cost_le (distTabC A (nodes A k) q.1 q.2 n).val univ
  simp only [setEq] at h2
  have a1 := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) (Nat.mul_le_mul_left 2 hT)
  have m1 : (n + 1) * (30 * (n + 1) ^ 2 * V ^ 3) = 30 * ((n + 1) ^ 3 * V ^ 3) := by ring
  have m2 : 2 * V * ((n + 1) ^ 2 + 1) + 4 ≤ 8 * ((n + 1) ^ 3 * V ^ 3) := by
    have p1 := mono_le (N := n + 1) (V := V) (a := 2) (b := 1) (A := 3) (B := 3) (Nat.succ_pos n)
      hV (by norm_num) (by norm_num)
    have p2 := mono_le (N := n + 1) (V := V) (a := 0) (b := 1) (A := 3) (B := 3) (Nat.succ_pos n)
      hV (by norm_num) (by norm_num)
    have p3 := one_le_NV (n := n) V hV 3 3
    simp only [pow_zero, one_mul, pow_one] at p1 p2
    nlinarith
  linarith

theorem card_tauSet_le (A : WMat n) : (tauSet A).card ≤ n * n + 1 := by
  unfold tauSet
  refine (Finset.card_insert_le _ _).trans (Nat.add_le_add_right ?_ 1)
  refine Finset.card_image_le.trans ((Finset.card_filter_le _ _).trans ?_)
  simp

theorem card_candidates_le (A : WMat n) (k : ℕ) (hk : k + 1 ≤ 2 * (n + 1) ^ 2) :
    (candidates A k).card ≤ 2 * (n + 1) ^ 4 := by
  unfold candidates
  rw [Finset.card_product, Finset.card_range]
  have h1 := card_tauSet_le A
  have h2 : Nat.sqrt k + 1 ≤ 2 * (n + 1) ^ 2 := (Nat.add_le_add_right (Nat.sqrt_le_self k) 1).trans hk
  have h3 : n * n + 1 ≤ (n + 1) ^ 2 := by nlinarith
  calc (tauSet A).card * (Nat.sqrt k + 1) ≤ (n + 1) ^ 2 * (2 * (n + 1) ^ 2) :=
        Nat.mul_le_mul (h1.trans h3) h2
    _ = 2 * (n + 1) ^ 4 := by ring

theorem candInf_cost_le (A : WMat n) (k : ℕ) (V : ℕ) (hV : 1 ≤ V)
    (hNd : (nodes A k).card + 1 ≤ V) (hk : k + 1 ≤ 2 * (n + 1) ^ 2) :
    (cInf (candidates A k) (candValC A (nodes A k))).cost ≤ 80 * (n + 1) ^ 7 * V ^ 3 := by
  have h := cInf_cost_le (candidates A k) (candValC A (nodes A k)) (38 * (n + 1) ^ 3 * V ^ 3)
    (fun q _ => candValC_cost_le A k q V hV hNd)
  have hc := Nat.mul_le_mul_right (38 * (n + 1) ^ 3 * V ^ 3 + 1) (card_candidates_le A k hk)
  have p := one_le_NV (n := n) V hV 3 3
  have m : 2 * (n + 1) ^ 4 * (38 * (n + 1) ^ 3 * V ^ 3 + 1) ≤ 80 * (n + 1) ^ 7 * V ^ 3 := by
    have e : 2 * (n + 1) ^ 4 * (38 * (n + 1) ^ 3 * V ^ 3) = 76 * ((n + 1) ^ 7 * V ^ 3) := by ring
    have p2 := mono_le (N := n + 1) (V := V) (a := 4) (b := 0) (A := 7) (B := 3) (Nat.succ_pos n)
      hV (by norm_num) (by norm_num)
    simp only [pow_zero, mul_one] at p2
    nlinarith
  linarith

theorem cSelCand_cost_le (A : WMat n) (k : ℕ) (V : ℕ) (hV : 1 ≤ V)
    (hNd : (nodes A k).card + 1 ≤ V) (hk : k + 1 ≤ 2 * (n + 1) ^ 2) (hs : (candidates A k).Nonempty) :
    (cSelCand (candidates A k) hs (candValC A (nodes A k))).cost ≤ 170 * (n + 1) ^ 8 * V ^ 3 := by
  unfold cSelCand
  simp only
  have h := sum_succ_le (candidates A k) (fun q => (candValC A (nodes A k) q).cost)
    (38 * (n + 1) ^ 3 * V ^ 3) (fun q _ => candValC_cost_le A k q V hV hNd)
  have hc0 := card_candidates_le A k hk
  have hc := Nat.mul_le_mul_right (38 * (n + 1) ^ 3 * V ^ 3 + 1) hc0
  have hsq := Nat.mul_le_mul (Nat.add_le_add_right hc0 1) (Nat.add_le_add_right hc0 1)
  have p := one_le_NV (n := n) V hV 3 3
  have e : 2 * (n + 1) ^ 4 * (38 * (n + 1) ^ 3 * V ^ 3) = 76 * ((n + 1) ^ 7 * V ^ 3) := by ring
  have p2 := mono_le (N := n + 1) (V := V) (a := 4) (b := 0) (A := 8) (B := 3) (Nat.succ_pos n)
    hV (by norm_num) (by norm_num)
  have p3 := mono_le (N := n + 1) (V := V) (a := 7) (b := 3) (A := 8) (B := 3) (Nat.succ_pos n)
    hV (by norm_num) le_rfl
  have p4 := mono_le (N := n + 1) (V := V) (a := 8) (b := 0) (A := 8) (B := 3) (Nat.succ_pos n)
    hV le_rfl (by norm_num)
  simp only [pow_zero, mul_one] at p2 p4
  have e2 : (2 * (n + 1) ^ 4 + 1) * (2 * (n + 1) ^ 4 + 1) ≤ 9 * (n + 1) ^ 8 := by
    have q := Nat.one_le_pow 4 (n + 1) (Nat.succ_pos n)
    nlinarith
  nlinarith

theorem extractC_cost_le (A : WMat n) (Nd : Finset (Finset (Fin n))) (τ : Option ℚ) (b : ℕ)
    (T : Finset (Finset (Fin n) × WithTop ℚ)) (V : ℕ) (hV : 1 ≤ V) (hNd : Nd.card ≤ V)
    (hT : T.card ≤ V) :
    ∀ (s : ℕ) (C' : Finset (Fin n)), C'.card = s →
      (extractC A Nd τ b T C').cost ≤ (s + 1) * (34 * (n + 1) ^ 2 * V ^ 2) := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
    intro C' hC'
    have hK : 1 ≤ (n + 1) ^ 2 * V ^ 2 := one_le_NV (n := n) V hV 2 2
    have hp := predsC_cost_le Nd b C' V hNd
    have hpc := (predsC_card_le Nd b C').trans hNd
    have m1 : 4 * (n + 1) ^ 2 * V ≤ 4 * ((n + 1) ^ 2 * V ^ 2) := by
      have := mono_le (N := n + 1) (V := V) (a := 2) (b := 1) (A := 2) (B := 2) (Nat.succ_pos n)
        hV le_rfl (by norm_num)
      simp only [pow_one] at this; linarith
    rw [extractC]
    split_ifs with h
    · simp only
      have hsel := cSelMinSet_cost_le (predsC Nd b C').val (stepC A τ T C') h
        (10 * (n + 1) ^ 2 * V + 1) (fun C _ => stepC_cost_le A τ T C' C V hV hT)
      have hmem := (selMinSet_spec (predsC Nd b C').val (fun C => (stepC A τ T C' C).val) h).1
      have hlt : (cSelMinSet (predsC Nd b C').val (stepC A τ T C') h).val.card < s := by
        have key : ∀ x ∈ (predsC Nd b C').val, x.card < C'.card := by
          intro x hx
          simp only [predsC, cFilter_val, charge_val, decide_eq_true_eq, Finset.mem_filter] at hx
          exact Finset.card_lt_card hx.2.1
        rw [← hC']; exact key _ hmem
      have hr := ih _ hlt _ rfl
      have hr' := Nat.mul_le_mul_right (34 * (n + 1) ^ 2 * V ^ 2) (Nat.succ_le_of_lt hlt)
      simp only [setEq] at hsel ⊢
      have a1 := Nat.mul_le_mul_right (10 * (n + 1) ^ 2 * V + 1 + 1) hpc
      have a2 := Nat.mul_le_mul (Nat.add_le_add_right hpc 1) (Nat.add_le_add_right hpc 1)
      have a3 := Nat.mul_le_mul_right ((n + 1) ^ 2) a2
      have m2 : V * (10 * (n + 1) ^ 2 * V + 1 + 1) ≤ 12 * ((n + 1) ^ 2 * V ^ 2) := by
        have e : V * (10 * (n + 1) ^ 2 * V) = 10 * ((n + 1) ^ 2 * V ^ 2) := by ring
        have := mono_le (N := n + 1) (V := V) (a := 0) (b := 1) (A := 2) (B := 2) (Nat.succ_pos n)
          hV (by norm_num) (by norm_num)
        simp only [pow_zero, one_mul, pow_one] at this
        nlinarith
      have m3 : (V + 1) * (V + 1) * (n + 1) ^ 2 ≤ 4 * ((n + 1) ^ 2 * V ^ 2) := by
        have : (V + 1) * (V + 1) ≤ 4 * V ^ 2 := by nlinarith
        calc (V + 1) * (V + 1) * (n + 1) ^ 2 ≤ 4 * V ^ 2 * (n + 1) ^ 2 :=
              Nat.mul_le_mul_right _ this
          _ = 4 * ((n + 1) ^ 2 * V ^ 2) := by ring
      have m4 : (n + 1) ^ 2 ≤ (n + 1) ^ 2 * V ^ 2 := Nat.le_mul_of_pos_right _ (by positivity)
      nlinarith
    · simp only
      nlinarith

/-! ## Ordering DP -/

theorem dpTabC_card_le (A : WMat n) (k V : ℕ) (hV : 1 ≤ V) (hR : (reachable A k).card ≤ V) :
    ∀ s, (dpTabC A k s).val.card ≤ V
  | 0 => by simp [dpTabC, charge]; exact hV
  | s + 1 => by
    rw [dpTabC_val]
    exact (dpTab_card_le A k s).trans ((card_reachLayer_le A k (s + 1)).trans hR)

theorem dpElem_cost_le (A : WMat n) (prev : Finset (Finset (Fin n) × WithBot ℚ))
    (T : Finset (Fin n)) (V : ℕ) (hV : 1 ≤ V) (hprev : prev.card ≤ V) :
    (do
      let v ← cSup T (fun v => do
        let T' ← charge (n + 1) (T.erase v)
        let a ← cLookupBot prev T'
        let g ← charge (n + 1) (gain A T' v)
        charge 1 (a + (g : WithBot ℚ)))
      pure (T, v) : Cost (Finset (Fin n) × WithBot ℚ)).cost ≤ 8 * (n + 1) ^ 3 * V := by
  simp only [bind_cost, pure_cost, add_zero]
  have hb : ∀ v ∈ T, (do
        let T' ← charge (n + 1) (T.erase v)
        let a ← cLookupBot prev T'
        let g ← charge (n + 1) (gain A T' v)
        charge 1 (a + (g : WithBot ℚ)) : Cost (WithBot ℚ)).cost ≤ 7 * (n + 1) ^ 2 * V := by
    intro v _
    simp only [bind_cost, charge_cost, charge_val]
    have h := cLookupBot_cost_le prev (T.erase v)
    simp only [setEq] at h
    have := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) (Nat.mul_le_mul_left 2 hprev)
    have p1 : (n + 1) ≤ (n + 1) ^ 2 * V := by
      have := mono_le (N := n + 1) (V := V) (a := 1) (b := 0) (A := 2) (B := 1) (Nat.succ_pos n)
        hV (by norm_num) (by norm_num)
      simpa using this
    have p2 : V ≤ (n + 1) ^ 2 * V := Nat.le_mul_of_pos_left _ (by positivity)
    nlinarith
  have h := cSup_cost_le T _ _ hb
  have hT := Nat.mul_le_mul_right (7 * (n + 1) ^ 2 * V + 1) (card_finset_fin_le T)
  have p : 1 ≤ (n + 1) ^ 2 * V := by simpa using one_le_NV (n := n) V hV 2 1
  have e : n * (7 * (n + 1) ^ 2 * V + 1) ≤ 8 * (n + 1) ^ 3 * V := by
    have e1 : n * (7 * (n + 1) ^ 2 * V) ≤ 7 * ((n + 1) ^ 3 * V) := by
      have : n * (7 * (n + 1) ^ 2 * V) = 7 * (n * ((n + 1) ^ 2 * V)) := by ring
      rw [this]; apply Nat.mul_le_mul_left
      calc n * ((n + 1) ^ 2 * V) ≤ (n + 1) * ((n + 1) ^ 2 * V) := Nat.mul_le_mul_right _ (by omega)
        _ = (n + 1) ^ 3 * V := by ring
    have e2 : n ≤ (n + 1) ^ 3 * V := by
      have := mono_le (N := n + 1) (V := V) (a := 1) (b := 0) (A := 3) (B := 1) (Nat.succ_pos n)
        hV (by norm_num) (by norm_num)
      simp only [pow_one, pow_zero, mul_one] at this
      omega
    nlinarith
  linarith

theorem dpTabC_cost_le (A : WMat n) (k V : ℕ) (hV : 1 ≤ V) (hR : (reachable A k).card ≤ V) :
    ∀ s, s ≤ n → (dpTabC A k s).cost ≤ (s + 1) * (20 * (n + 1) ^ 5 * V ^ 2)
  | 0, _ => by
    simp only [dpTabC, charge_cost]
    have := one_le_NV (n := n) V hV 5 2
    nlinarith
  | s + 1, hs => by
    have ih := dpTabC_cost_le A k V hV hR s (by omega)
    have hprev := dpTabC_card_le A k V hV hR s
    simp only [dpTabC, bind_cost]
    have hl := reachLayerC_cost_le A k V hV hR (s + 1)
    have hlc : (reachLayerC A k (s + 1)).val.card ≤ V := by
      rw [reachLayerC_val]; exact (card_reachLayer_le A k (s + 1)).trans hR
    generalize dpTabC A k s = P at ih hprev ⊢
    generalize reachLayerC A k (s + 1) = L at hl hlc ⊢
    have hi := cImage_cost_le (setEq n + 1) L.val _ (8 * (n + 1) ^ 3 * V)
      (fun T _ => dpElem_cost_le A P.val T V hV hprev)
    simp only [setEq] at hi ⊢
    have a1 := Nat.mul_le_mul_right (8 * (n + 1) ^ 3 * V + 1) hlc
    have a2 := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) (Nat.mul_le_mul hlc hlc)
    have a3 : (s + 1 + 1) * (9 * (n + 1) ^ 4 * V ^ 2) ≤ 9 * ((n + 1) ^ 5 * V ^ 2) := by
      have := Nat.mul_le_mul_right (9 * (n + 1) ^ 4 * V ^ 2) (show s + 1 + 1 ≤ n + 1 by omega)
      calc _ ≤ (n + 1) * (9 * (n + 1) ^ 4 * V ^ 2) := this
        _ = 9 * ((n + 1) ^ 5 * V ^ 2) := by ring
    have m1 : V * (8 * (n + 1) ^ 3 * V + 1) ≤ 9 * ((n + 1) ^ 5 * V ^ 2) := by
      have e : V * (8 * (n + 1) ^ 3 * V) = 8 * ((n + 1) ^ 3 * V ^ 2) := by ring
      have p1 := mono_le (N := n + 1) (V := V) (a := 3) (b := 2) (A := 5) (B := 2) (Nat.succ_pos n)
        hV (by norm_num) le_rfl
      have p2 := mono_le (N := n + 1) (V := V) (a := 0) (b := 1) (A := 5) (B := 2) (Nat.succ_pos n)
        hV (by norm_num) (by norm_num)
      simp only [pow_zero, one_mul, pow_one] at p2
      nlinarith
    have m2 : V * V * ((n + 1) ^ 2 + 1) ≤ 2 * ((n + 1) ^ 5 * V ^ 2) := by
      have p1 := mono_le (N := n + 1) (V := V) (a := 2) (b := 2) (A := 5) (B := 2) (Nat.succ_pos n)
        hV (by norm_num) le_rfl
      have p2 := mono_le (N := n + 1) (V := V) (a := 0) (b := 2) (A := 5) (B := 2) (Nat.succ_pos n)
        hV (by norm_num) le_rfl
      simp only [pow_zero, one_mul] at p2
      nlinarith
    nlinarith

theorem lastC_cost_le (A : WMat n) (tab : Finset (Finset (Fin n) × WithBot ℚ)) (S : Finset (Fin n))
    (v : Fin n) (V : ℕ) (hV : 1 ≤ V) (htab : tab.card ≤ V) :
    (lastC A tab S v).cost ≤ 7 * (n + 1) ^ 2 * V := by
  simp only [lastC, bind_cost, charge_cost, charge_val]
  have h := cLookupBot_cost_le tab (S.erase v)
  simp only [setEq] at h
  have := Nat.mul_le_mul_right ((n + 1) ^ 2 + 1) (Nat.mul_le_mul_left 2 htab)
  have p1 : (n + 1) ≤ (n + 1) ^ 2 * V := by
    have := mono_le (N := n + 1) (V := V) (a := 1) (b := 0) (A := 2) (B := 1) (Nat.succ_pos n)
      hV (by norm_num) (by norm_num)
    simpa using this
  have p2 : V ≤ (n + 1) ^ 2 * V := Nat.le_mul_of_pos_left _ (by positivity)
  nlinarith

theorem dpOrderC_cost_le (A : WMat n) (k V : ℕ) (hV : 1 ≤ V) (hR : (reachable A k).card ≤ V) :
    ∀ (s : ℕ) (S : Finset (Fin n)), S.card = s →
      (dpOrderC A k S).cost ≤ (s + 1) * (40 * (n + 1) ^ 6 * V ^ 2) := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
    intro S hS
    have hK := one_le_NV (n := n) V hV 6 2
    rw [dpOrderC]
    split_ifs with h
    · simp only
      have hSn := card_finset_fin_le S
      have ht := dpTabC_cost_le A k V hV hR (S.card - 1) (by omega)
      have htc := dpTabC_card_le A k V hV hR (S.card - 1)
      have hsel := cSelMaxV_cost_le S (lastC A (dpTabC A k (S.card - 1)).val S) h
        (7 * (n + 1) ^ 2 * V) (fun v _ => lastC_cost_le A _ S v V hV htc)
      have hmem := (selMaxV_spec S (fun v => (lastC A (dpTabC A k (S.card - 1)).val S v).val) h).1
      have hlt : (S.erase (cSelMaxV S (lastC A (dpTabC A k (S.card - 1)).val S) h).val).card < s := by
        rw [← hS]; exact Finset.card_erase_lt_of_mem hmem
      have hr := ih _ hlt _ rfl
      have hr' := Nat.mul_le_mul_right (40 * (n + 1) ^ 6 * V ^ 2) (Nat.succ_le_of_lt hlt)
      simp only [setEq]
      have a1 : (S.card - 1 + 1) * (20 * (n + 1) ^ 5 * V ^ 2) ≤ 20 * ((n + 1) ^ 6 * V ^ 2) := by
        have := Nat.mul_le_mul_right (20 * (n + 1) ^ 5 * V ^ 2) (show S.card - 1 + 1 ≤ n + 1 by omega)
        calc _ ≤ (n + 1) * (20 * (n + 1) ^ 5 * V ^ 2) := this
          _ = 20 * ((n + 1) ^ 6 * V ^ 2) := by ring
      have a2 := Nat.mul_le_mul_right (7 * (n + 1) ^ 2 * V + 1) hSn
      have m1 : n * (7 * (n + 1) ^ 2 * V + 1) ≤ 8 * ((n + 1) ^ 6 * V ^ 2) := by
        have e : n * (7 * (n + 1) ^ 2 * V + 1) ≤ (n + 1) * (8 * (n + 1) ^ 2 * V) := by
          have : 1 ≤ (n + 1) ^ 2 * V := by simpa using one_le_NV (n := n) V hV 2 1
          nlinarith
        have p := mono_le (N := n + 1) (V := V) (a := 3) (b := 1) (A := 6) (B := 2) (Nat.succ_pos n)
          hV (by norm_num) (by norm_num)
        simp only [pow_one] at p
        calc _ ≤ (n + 1) * (8 * (n + 1) ^ 2 * V) := e
          _ = 8 * ((n + 1) ^ 3 * V) := by ring
          _ ≤ 8 * ((n + 1) ^ 6 * V ^ 2) := Nat.mul_le_mul_left _ p
      have m2 : S.card + 1 + (n + 1) ^ 2 ≤ 3 * ((n + 1) ^ 6 * V ^ 2) := by
        have p := mono_le (N := n + 1) (V := V) (a := 2) (b := 0) (A := 6) (B := 2) (Nat.succ_pos n)
          hV (by norm_num) (by norm_num)
        simp only [pow_zero, mul_one] at p
        have : n + 1 ≤ (n + 1) ^ 2 := Nat.le_self_pow (by norm_num) _
        omega
      nlinarith
    · simp only [charge_cost]; nlinarith

/-! ## One recognition round (aborted, rejected or accepted) -/

theorem dom (V : ℕ) (hV : 1 ≤ V) {a b : ℕ} (ha : a ≤ 8) (hb : b ≤ 3) :
    (n + 1) ^ a * V ^ b ≤ (n + 1) ^ 8 * V ^ 3 :=
  mono_le (Nat.succ_pos n) hV ha hb

theorem recognizeC_cost_le (A : WMat n) (k V : ℕ) (hV : 1 ≤ V) (hU : abortBound n k + 1 ≤ V)
    (hk : k + 1 ≤ 2 * (n + 1) ^ 2) : (recognizeC A k).cost ≤ 400 * (n + 1) ^ 8 * V ^ 3 := by
  have d20 := dom (n := n) V hV (a := 2) (b := 0) (by norm_num) (by norm_num)
  have d52 := dom (n := n) V hV (a := 5) (b := 2) (by norm_num) (by norm_num)
  have d62 := dom (n := n) V hV (a := 6) (b := 2) (by norm_num) (by norm_num)
  have d31 := dom (n := n) V hV (a := 3) (b := 1) (by norm_num) (by norm_num)
  have d60 := dom (n := n) V hV (a := 6) (b := 0) (by norm_num) (by norm_num)
  have d73 := dom (n := n) V hV (a := 7) (b := 3) (by norm_num) (by norm_num)
  have d33 := dom (n := n) V hV (a := 3) (b := 3) (by norm_num) (by norm_num)
  have d32 := dom (n := n) V hV (a := 3) (b := 2) (by norm_num) (by norm_num)
  have d30 := dom (n := n) V hV (a := 3) (b := 0) (by norm_num) (by norm_num)
  have d00 := dom (n := n) V hV (a := 0) (b := 0) (by norm_num) (by norm_num)
  simp only [pow_zero, mul_one, one_mul, pow_one] at d20 d60 d30 d00 d31
  have hcap := capLayersC_cost_le A k (abortBound n k) V hV (by omega) n
  have e1 : (n + 1) * (12 * (n + 1) ^ 4 * V ^ 2) = 12 * ((n + 1) ^ 5 * V ^ 2) := by ring
  have e0 : 20 * (k + 1) ≤ 40 * (n + 1) ^ 2 := by omega
  simp only [recognizeC, bind_cost, charge_cost, charge_val, capLayersC_val]
  split_ifs with hg
  · simp only [charge_cost]; linarith
  · have hR : (reachable A k).card ≤ abortBound n k := by
      have : capLayers A k (abortBound n k) n ≠ none := by
        intro h; rw [h] at hg; exact hg rfl
      rw [Ne, capLayers_none_iff] at this; omega
    have hNdc : (nodes A k).card ≤ (reachable A k).card := Finset.card_filter_le _ _
    have hNd : (nodes A k).card + 1 ≤ V := by omega
    have hRV : (reachable A k).card ≤ V := by omega
    simp only [bind_cost, charge_cost, charge_val]
    have hreach := reachableC_cost_le A k V hV hRV
    have hnod := nodesC_cost_le A k (reachableC A k).val V (by rw [reachableC_val]; exact hRV)
    rw [reachableC_val] at hnod
    rw [reachableC_val, nodesC_val]
    have hinf := candInf_cost_le A k V hV hNd hk
    have hcl : candLeaf n k ≤ 8 * (n + 1) ^ 6 := by
      unfold candLeaf
      have : (n + 1) ^ 4 * (k + 1) ≤ (n + 1) ^ 4 * (2 * (n + 1) ^ 2) := Nat.mul_le_mul_left _ hk
      have e : (n + 1) ^ 4 * (2 * (n + 1) ^ 2) = 2 * (n + 1) ^ 6 := by ring
      linarith
    split_ifs with hacc hne
    · simp only [bind_cost, charge_cost, charge_val]
      have hsel := cSelCand_cost_le A k V hV hNd hk (candidates_nonempty A k)
      generalize (cSelCand (candidates A k) (candidates_nonempty A k) (candValC A (nodes A k))) = Q
        at hsel ⊢
      have hdist := distTabC_cost_le A k Q.val.1 Q.val.2 V hV hNd n
      have hdc := (distTabC_card_le A k Q.val.1 Q.val.2 n).trans hNd
      have hex := extractC_cost_le A (nodes A k) Q.val.1 Q.val.2
        (distTabC A (nodes A k) Q.val.1 Q.val.2 n).val V hV (by omega) hdc n univ (by simp)
      have e2 : (n + 1) * (30 * (n + 1) ^ 2 * V ^ 3) = 30 * ((n + 1) ^ 3 * V ^ 3) := by ring
      have e3 : (n + 1) * (34 * (n + 1) ^ 2 * V ^ 2) = 34 * ((n + 1) ^ 3 * V ^ 2) := by ring
      have e4 : n ≤ (n + 1) ^ 3 := by
        have : n + 1 ≤ (n + 1) ^ 3 := Nat.le_self_pow (by norm_num) _
        omega
      linarith
    · exact absurd (candidates_nonempty A k) hne
    · try simp only [charge_cost]
      linarith

end Westfall022
