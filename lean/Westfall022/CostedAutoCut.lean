import Westfall022.CostModel

/-!
# Mission 025: the costed AutoCut program and its refinement

`autoCutCosted A : Cost (...)` is the AutoCut algorithm written in the cost monad of
`CostModel.lean`. The executable algorithm is its value projection,

  `autoCutC A := (autoCutCosted A).val`,

so the program that runs and the program whose cost is counted are literally the same term.
`autoCutC_eq` proves `autoCutC A = autoCutM A` (and hence `= autoCutX A`) for **every** matrix.

## What changed relative to `autoCutM` (Challenge 1)

* The node set `𝒩` is computed **once per round** and passed to every shortest-path table, every
  predecessor scan and the extraction. `autoCutM` recomputes `nodes A k`, and with it all of
  `𝒞_k`, inside every `preds` call.
* The doubling loop returns the accepted partition together with the round. `autoCutM`
  recomputes the accepting round.
* Every leaf charge is listed below. Nothing else in the program is free.

| leaf | operation | charge |
|---|---|---|
| `wmcLeaf n` | `weakMajorityCut A T` (filter over `n²` pairs, two `O(n)` membership tests) plus a size test | `3(n+1)³` |
| `edgeLeaf n` | `C' \ C`, then `edgeCost A τ C Y` (`≤ n²` terms of `φ_τ`) | `5(n+1)²` |
| `setEq n` | equality / subset / `sdiff`-card on subsets of `Fin n` | `(n+1)²` |
| `n+1` | `insert`, `erase`, `card`, `gain` (sum over `≤ n` entries) | `n+1` |
| `candLeaf n k` | building `candidates A k` (dedup of `≤ n²` rationals, product with `range (√k+1)`) | `4(n+1)⁴(k+1)` |
| `20(k+1)` | evaluating `abortBound n k` (unit-cost ℕ arithmetic; `2^m` by `m ≤ 15k+5` products) | `20(k+1)` |
| `j+1` | evaluating `2^j` | `j+1` |
| `(n+1)³` | evaluating the extracted labelling (closure chain of depth `≤ n`) inside `partOf` | `(n+1)³ + n + 1` |
-/

namespace Westfall022

open Finset Cost

variable {n : ℕ}

/-- Leaf charge for a weak-majority-cut evaluation together with a size test. -/
def wmcLeaf (n : ℕ) : ℕ := 3 * (n + 1) ^ 3

/-- Leaf charge for one edge cost `edgeCost A τ C (C' \ C)`. -/
def edgeLeaf (n : ℕ) : ℕ := 5 * (n + 1) ^ 2

/-- Leaf charge for building the candidate set. -/
def candLeaf (n k : ℕ) : ℕ := 4 * (n + 1) ^ 4 * (k + 1)

/-! ## Stage 1: layers -/

/-- Costed `nextLayer`: extend every set of the layer by every vertex, deduplicate, then keep
the `k`-cuts of the right size. -/
def nextLayerC (A : WMat n) (k s : ℕ) (L : Finset (Finset (Fin n))) :
    Cost (Finset (Finset (Fin n))) := do
  let X ← cBiUnion (setEq n) L (fun S =>
    cImage (setEq n) univ (fun v => charge (n + 1) (insert v S)))
  cFilter X (fun T => charge (wmcLeaf n) (decide (T.card = s + 1 ∧ weakMajorityCut A T ≤ k)))

/-- Costed layer `s` of `𝒞_k`. -/
def reachLayerC (A : WMat n) (k : ℕ) : ℕ → Cost (Finset (Finset (Fin n)))
  | 0 => charge 1 {∅}
  | s + 1 => do
    let L ← reachLayerC A k s
    nextLayerC A k s L

/-- Costed capped generation with a running count. -/
def capLayersC (A : WMat n) (k U : ℕ) : ℕ → Cost (Option (Finset (Finset (Fin n)) × ℕ))
  | 0 => charge 1 (if 1 > U then none else some ({∅}, 1))
  | s + 1 => do
    let o ← capLayersC A k U s
    match o with
    | none => charge 1 none
    | some (L, c) => do
      let L' ← nextLayerC A k s L
      charge (L'.card + 2) (if c + L'.card > U then none else some (L', c + L'.card))

/-- Costed `𝒞_k`. -/
def reachableC (A : WMat n) (k : ℕ) : Cost (Finset (Finset (Fin n))) :=
  cBiUnion (setEq n) (range (n + 1)) (reachLayerC A k)

/-- Costed `𝒩` from a precomputed `𝒞_k`. -/
def nodesC (A : WMat n) (k : ℕ) (R : Finset (Finset (Fin n))) : Cost (Finset (Finset (Fin n))) :=
  cFilter R (fun S => charge (wmcLeaf n) (decide (weakMajorityCut A S ≤ k / 3)))

theorem nextLayerC_val (A : WMat n) (k s : ℕ) (L : Finset (Finset (Fin n))) :
    (nextLayerC A k s L).val = nextLayer A k s L := by
  simp [nextLayerC, nextLayer]

theorem reachLayerC_val (A : WMat n) (k : ℕ) : ∀ s, (reachLayerC A k s).val = reachLayer A k s
  | 0 => rfl
  | s + 1 => by
    simp only [reachLayerC, bind_val, reachLayerC_val A k s, nextLayerC_val]
    rfl

theorem capLayersC_val (A : WMat n) (k U : ℕ) : ∀ s, (capLayersC A k U s).val = capLayers A k U s
  | 0 => rfl
  | s + 1 => by
    simp only [capLayersC, bind_val, capLayersC_val A k U s, capLayers]
    rcases capLayers A k U s with _ | ⟨L, c⟩
    · rfl
    · simp only [bind_val, charge_val, nextLayerC_val]

theorem reachableC_val (A : WMat n) (k : ℕ) : (reachableC A k).val = reachable A k := by
  simp [reachableC, reachable, reachLayerC_val]

theorem nodesC_val (A : WMat n) (k : ℕ) : (nodesC A k (reachable A k)).val = nodes A k := by
  simp [nodesC, nodes]

/-! ## Stage 2: shortest-path tables with the hoisted node set -/

/-- The costed step value `dist(C) + edgeCost(C, C' \ C)` read from the table `T`. -/
def stepC (A : WMat n) (τ : Option ℚ) (T : Finset (Finset (Fin n) × WithTop ℚ))
    (C' C : Finset (Fin n)) : Cost (WithTop ℚ) := do
  let a ← cLookupTop T C
  let e ← charge (edgeLeaf n) (edgeCost A τ C (C' \ C))
  charge 1 (a + (e : WithTop ℚ))

/-- Costed predecessor scan over the node set `Nd`. -/
def predsC (Nd : Finset (Finset (Fin n))) (b : ℕ) (C' : Finset (Fin n)) :
    Cost (Finset (Finset (Fin n))) :=
  cFilter Nd (fun C => charge (3 * setEq n) (decide (C ⊂ C' ∧ (C' \ C).card ≤ b)))

theorem stepC_val (A : WMat n) (τ : Option ℚ) (T : Finset (Finset (Fin n) × WithTop ℚ))
    (C' C : Finset (Fin n)) :
    (stepC A τ T C' C).val = lookupTop T C + (edgeCost A τ C (C' \ C) : WithTop ℚ) := by
  simp [stepC]

theorem predsC_val (A : WMat n) (k b : ℕ) (C' : Finset (Fin n)) :
    (predsC (nodes A k) b C').val = preds A k b C' := by
  simp [predsC, preds]

/-- Costed cumulative shortest-path table. -/
def distTabC (A : WMat n) (Nd : Finset (Finset (Fin n))) (τ : Option ℚ) (b : ℕ) :
    ℕ → Cost (Finset (Finset (Fin n) × WithTop ℚ))
  | 0 => charge 1 {(∅, 0)}
  | s + 1 => do
    let prev ← distTabC A Nd τ b s
    let layer ← cFilter Nd (fun C => charge (n + 1) (decide (C.card = s + 1)))
    let fresh ← cImage (setEq n + 1) layer (fun C' => do
      let ps ← predsC Nd b C'
      let v ← cInf ps (stepC A τ prev C')
      pure (C', v))
    cUnion (setEq n + 1) prev fresh

theorem distTabC_val (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) :
    ∀ s, (distTabC A (nodes A k) τ b s).val = distTab A k τ b s
  | 0 => rfl
  | s + 1 => by
    simp only [distTabC, bind_val, cUnion_val, cImage_val, cFilter_val, charge_val,
      decide_eq_true_eq, pure_val, cInf_val, distTabC_val A k τ b s, predsC_val, stepC_val]
    rfl

/-- Costed candidate value `b² + 3⌊dist(V)⌋`. -/
def candValC (A : WMat n) (Nd : Finset (Finset (Fin n))) (q : Option ℚ × ℕ) :
    Cost (WithTop ℕ) := do
  let T ← distTabC A Nd q.1 q.2 n
  let d ← cLookupTop T univ
  charge 4 (if h : d = ⊤ then ⊤ else ((q.2 ^ 2 + 3 * ⌊d.untop h⌋₊ : ℕ) : WithTop ℕ))

theorem candValC_val (A : WMat n) (k : ℕ) (q : Option ℚ × ℕ) :
    (candValC A (nodes A k) q).val = candValM A k q := by
  simp only [candValC, bind_val, charge_val, cLookupTop_val, distTabC_val, candValM, distM]

/-- Generic deterministic candidate selection (same body as `selCandM`). -/
def selCandOf (s : Finset (Option ℚ × ℕ)) (hs : s.Nonempty) (f : Option ℚ × ℕ → WithTop ℕ) :
    Option ℚ × ℕ :=
  let ties := s.filter (fun q => f q = s.inf' hs f)
  let m := (ties.image candKey).min' (by
    obtain ⟨q, hq, hqeq⟩ := Finset.exists_mem_eq_inf' hs f
    exact ⟨candKey q, Finset.mem_image.mpr ⟨q, Finset.mem_filter.mpr ⟨hq, hqeq.symm⟩, rfl⟩⟩)
  ((ofLex m).1, (ofLex m).2)

theorem selCandOf_eq (A : WMat n) (k : ℕ) :
    selCandOf (candidates A k) (candidates_nonempty A k) (candValM A k) = selCandM A k := rfl

/-- Costed candidate selection: `inf'` and `filter` passes evaluating `f`, then `image candKey`
(quadratic deduplication) and `min'`. -/
def cSelCand (s : Finset (Option ℚ × ℕ)) (hs : s.Nonempty) (f : Option ℚ × ℕ → Cost (WithTop ℕ)) :
    Cost (Option ℚ × ℕ) :=
  ⟨selCandOf s hs (fun q => (f q).val), 2 * ∑ q ∈ s, ((f q).cost + 1) + (s.card + 1) * (s.card + 1)⟩

/-! ## Path extraction with the hoisted node set -/

/-- Costed extraction from a shortest-path table `T`. -/
def extractC (A : WMat n) (Nd : Finset (Finset (Fin n))) (τ : Option ℚ) (b : ℕ)
    (T : Finset (Finset (Fin n) × WithTop ℚ)) (C' : Finset (Fin n)) : Cost (ℕ × (Fin n → ℕ)) :=
  if h : (predsC Nd b C').val.Nonempty then
    let sel := cSelMinSet (predsC Nd b C').val (stepC A τ T C') h
    let r := extractC A Nd τ b T sel.val
    ⟨(r.val.1 + 1, fun v => if v ∈ sel.val then r.val.2 v else r.val.1),
      (predsC Nd b C').cost + sel.cost + r.cost + setEq n⟩
  else ⟨(0, fun _ => 0), (predsC Nd b C').cost + 1⟩
termination_by C'.card
decreasing_by
  have hm := (selMinSet_spec (predsC Nd b C').val (fun C => (stepC A τ T C' C).val) h).1
  have key : ∀ x ∈ (predsC Nd b C').val, x.card < C'.card := by
    intro x hx
    simp only [predsC, cFilter_val, charge_val, decide_eq_true_eq, Finset.mem_filter] at hx
    exact Finset.card_lt_card hx.2.1
  exact key _ hm

theorem extractC_val (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ)
    (T : Finset (Finset (Fin n) × WithTop ℚ)) :
    ∀ (s : ℕ) (C' : Finset (Fin n)), C'.card = s →
      (extractC A (nodes A k) τ b T C').val = extractM A k τ b T C' := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
    intro C' hC'
    rw [extractC, extractM]
    have hps := predsC_val A k b C'
    by_cases h : (preds A k b C').Nonempty
    · have h' : (predsC (nodes A k) b C').val.Nonempty := hps ▸ h
      rw [dif_pos h', dif_pos h]
      have hsel : (cSelMinSet (predsC (nodes A k) b C').val (stepC A τ T C') h').val =
          selMinSet (preds A k b C')
            (fun C => lookupTop T C + (edgeCost A τ C (C' \ C) : WithTop ℚ)) h := by
        rw [cSelMinSet_val]
        have key : ∀ (s s' : Finset (Finset (Fin n))) (e : s = s') (h1 : s.Nonempty)
            (h2 : s'.Nonempty) (f : Finset (Fin n) → WithTop ℚ),
            selMinSet s f h1 = selMinSet s' f h2 := by
          intro s s' e h1 h2 f; subst e; rfl
        rw [key _ _ hps h' h]
        congr 1; funext C; exact stepC_val A τ T C' C
      simp only
      rw [hsel]
      have hlt : (selMinSet (preds A k b C')
          (fun C => lookupTop T C + (edgeCost A τ C (C' \ C) : WithTop ℚ)) h).card < s := by
        rw [← hC']; exact card_lt_of_mem_preds (selMinSet_spec _ _ h).1
      rw [ih _ hlt _ rfl]
    · have h' : ¬ (predsC (nodes A k) b C').val.Nonempty := hps ▸ h
      rw [dif_neg h', dif_neg h]

/-! ## Ordering DP -/

/-- Costed DP table for layer `s`. -/
def dpTabC (A : WMat n) (k : ℕ) : ℕ → Cost (Finset (Finset (Fin n) × WithBot ℚ))
  | 0 => charge 1 {(∅, 0)}
  | s + 1 => do
    let prev ← dpTabC A k s
    let L ← reachLayerC A k (s + 1)
    cImage (setEq n + 1) L (fun T => do
      let v ← cSup T (fun v => do
        let T' ← charge (n + 1) (T.erase v)
        let a ← cLookupBot prev T'
        let g ← charge (n + 1) (gain A T' v)
        charge 1 (a + (g : WithBot ℚ)))
      pure (T, v))

theorem dpTabC_val (A : WMat n) (k : ℕ) : ∀ s, (dpTabC A k s).val = dpTab A k s
  | 0 => rfl
  | s + 1 => by
    simp only [dpTabC, bind_val, cImage_val, cSup_val, charge_val, cLookupBot_val, pure_val,
      dpTabC_val A k s, reachLayerC_val]
    rfl

/-- The costed value maximised by the ordering extraction. -/
def lastC (A : WMat n) (tab : Finset (Finset (Fin n) × WithBot ℚ)) (S : Finset (Fin n))
    (v : Fin n) : Cost (WithBot ℚ) := do
  let T' ← charge (n + 1) (S.erase v)
  let a ← cLookupBot tab T'
  let g ← charge (n + 1) (gain A T' v)
  charge 1 (a + (g : WithBot ℚ))

theorem lastC_val (A : WMat n) (tab : Finset (Finset (Fin n) × WithBot ℚ)) (S : Finset (Fin n))
    (v : Fin n) : (lastC A tab S v).val = lookupBot tab (S.erase v) + (gain A (S.erase v) v : WithBot ℚ) := by
  simp [lastC]

/-- Costed ordering extraction. -/
def dpOrderC (A : WMat n) (k : ℕ) (S : Finset (Fin n)) : Cost (Equiv.Perm (Fin n)) :=
  if h : S.Nonempty then
    let tab := dpTabC A k (S.card - 1)
    let sel := cSelMaxV S (lastC A tab.val S) h
    let r := dpOrderC A k (S.erase sel.val)
    ⟨extendPerm r.val (S.card - 1) sel.val, tab.cost + sel.cost + r.cost + setEq n⟩
  else charge 1 (Equiv.refl _)
termination_by S.card
decreasing_by exact Finset.card_erase_lt_of_mem (selMaxV_spec _ _ h).1

theorem dpOrderC_val (A : WMat n) (k : ℕ) :
    ∀ (s : ℕ) (S : Finset (Fin n)), S.card = s → (dpOrderC A k S).val = dpOrderM A k S := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
    intro S hS
    rw [dpOrderC, dpOrderM]
    by_cases h : S.Nonempty
    · rw [dif_pos h, dif_pos h]
      have hsel : (cSelMaxV S (lastC A (dpTabC A k (S.card - 1)).val S) h).val =
          selMaxV S (fun v => lookupBot (dpTab A k (S.card - 1)) (S.erase v) +
            (gain A (S.erase v) v : WithBot ℚ)) h := by
        rw [cSelMaxV_val]; congr 1; funext v; rw [lastC_val, dpTabC_val]
      simp only
      rw [hsel]
      have hlt : (S.erase (selMaxV S (fun v => lookupBot (dpTab A k (S.card - 1)) (S.erase v) +
          (gain A (S.erase v) v : WithBot ℚ)) h)).card < s := by
        rw [← hS]; exact Finset.card_erase_lt_of_mem (selMaxV_spec _ _ h).1
      rw [ih _ hlt _ rfl]
    · rw [dif_neg h, dif_neg h]; rfl

/-! ## One round of recognition -/

/-- The costed recogniser for threshold `k`. The capped generator runs first; if it aborts,
nothing else is computed. -/
def recognizeC (A : WMat n) (k : ℕ) : Cost (Option (OrdPart n)) := do
  let U ← charge (20 * (k + 1)) (abortBound n k)
  let g ← capLayersC A k U n
  if g.isNone then charge 1 none else do
    let R ← reachableC A k
    let Nd ← nodesC A k R
    let cs ← charge (candLeaf n k) (candidates A k)
    let rv ← cInf cs (candValC A Nd)
    if rv ≤ (k : WithTop ℕ) then do
      let q ← (if hs : cs.Nonempty then cSelCand cs hs (candValC A Nd) else charge 1 (none, 0))
      let T ← distTabC A Nd q.1 q.2 n
      let r ← extractC A Nd q.1 q.2 T univ
      charge ((n + 1) ^ 3 + n + 1) (some (partOf r.2))
    else charge 1 none

theorem recognizeC_val (A : WMat n) (k : ℕ) : (recognizeC A k).val = recognizeM A k := by
  simp only [recognizeC, bind_val, charge_val, capLayersC_val]
  unfold recognizeM
  by_cases hg : (capLayers A k (abortBound n k) n).isNone = true
  · rw [if_pos hg, if_pos hg]; rfl
  · rw [if_neg hg, if_neg hg]
    simp only [bind_val, charge_val, reachableC_val, nodesC_val, cInf_val, candValC_val]
    have hrv : (candidates A k).inf (fun q => candValM A k q) = recogValM A k := rfl
    rw [hrv]
    by_cases hle : recogValM A k ≤ (k : WithTop ℕ)
    · rw [if_pos hle, if_pos hle]
      rw [dif_pos (candidates_nonempty A k)]
      have hq : (cSelCand (candidates A k) (candidates_nonempty A k)
          (candValC A (nodes A k))).val = selCandM A k := by
        simp only [cSelCand, candValC_val]; rfl
      simp only [bind_val, hq, distTabC_val, charge_val]
      rw [extractC_val A k _ _ _ n univ (by simp)]
    · rw [if_neg hle, if_neg hle]; rfl

/-! ## The doubling loop and the full algorithm -/

/-- Costed doubling loop: returns the first accepted round and its partition. -/
def firstAcceptC (A : WMat n) : ℕ → ℕ → Cost (Option (ℕ × OrdPart n))
  | 0, _ => charge 1 none
  | fuel + 1, j => do
    let k ← charge (j + 1) (2 ^ j)
    let r ← recognizeC A k
    match r with
    | some B => charge 1 (some (j, B))
    | none => firstAcceptC A fuel (j + 1)

theorem firstAcceptC_val (A : WMat n) : ∀ fuel j,
    (firstAcceptC A fuel j).val =
      (firstAcceptM A fuel j).bind (fun i => (recognizeM A (2 ^ i)).map (fun B => (i, B)))
  | 0, j => rfl
  | fuel + 1, j => by
    simp only [firstAcceptC, bind_val, charge_val, recognizeC_val, firstAcceptM]
    rcases hr : recognizeM A (2 ^ j) with _ | B
    · simp only [Option.isSome_none, Bool.false_eq_true, if_false]
      exact firstAcceptC_val A fuel (j + 1)
    · simp [hr]

/-- **The costed AutoCut program.** -/
def autoCutCosted (A : WMat n) :
    Cost (Option (WithBot ℚ × Equiv.Perm (Fin n) × OrdPart n × ℕ)) := do
  let o ← firstAcceptC A (2 * n + 1) 0
  match o with
  | none => charge 1 none
  | some (j, B) => do
    let k ← charge (j + 1) (2 ^ j)
    let tab ← dpTabC A k n
    let v ← cLookupBot tab univ
    let π ← dpOrderC A k univ
    charge 1 (some (v, π, B, k))

/-- **The executable AutoCut of Mission 025**: the value of the costed program. -/
def autoCutC (A : WMat n) : Option (WithBot ℚ × Equiv.Perm (Fin n) × OrdPart n × ℕ) :=
  (autoCutCosted A).val

/-- **Refinement:** the costed program computes exactly `autoCutM`. -/
theorem autoCutC_eq (A : WMat n) : autoCutC A = autoCutM A := by
  unfold autoCutC autoCutCosted autoCutM
  simp only [bind_val, firstAcceptC_val]
  rcases hj : firstAcceptM A (2 * n + 1) 0 with _ | j
  · rfl
  · rcases hB : recognizeM A (2 ^ j) with _ | B
    · simp only [Option.bind_some, hB, Option.map_none]; rfl
    · simp only [Option.bind_some, hB, Option.map_some, bind_val, charge_val, dpTabC_val,
        cLookupBot_val, dpOrderC_val A _ n univ (by simp)]
      rfl

/-- The costed program also refines the Mission 023 executable `autoCutX`. -/
theorem autoCutC_eq_X (A : WMat n) : autoCutC A = autoCutX A := by
  rw [autoCutC_eq, autoCutM_eq]

end Westfall022
