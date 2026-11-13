import Westfall022.Exec

/-!
# Mission 024, Challenge 1: memoised AutoCut and its refinement theorems

`autoCutX` (Exec.lean) evaluates the shortest-path recursion `dist` and the ordering DP `cutDP`
as plain recursions, so evaluation cost grows with the number of chains in the cut DAG.
This module computes both **bottom-up, layer by layer**, storing exactly one entry per state:

* `dpTab A k s` — table of `(T, f_k(T))` for the reachable `k`-cuts `T` of size `s`, computed
  from the size-`s-1` table (bound once with `let`);
* `distTab A k τ b s` — table of `(C, dist(C))` for `∅` and the nodes `C` of size `≤ s`, each new
  entry computed from the previous table by one minimisation over admissible predecessors;
* `extractM`, `dpOrderM` — path and ordering extraction by table lookups (one recursive call
  per step, so linear depth).

Lookups are filtered `sup`/`inf` over the table (default `⊥`/`⊤` for an absent key).

**Refinement.** `cutDPM_eq`, `distM_eq`, `extractM_eq`, `dpOrderM_eq` prove that each memoised
value equals the verified recursive value, and `autoCutM_eq` proves `autoCutM A = autoCutX A`
for every matrix, so every guarantee of `autoCutX_correct` transfers verbatim.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-! ## Lookup tables -/

/-- Lookup with default `⊥`. -/
def lookupBot (tab : Finset (Finset (Fin n) × WithBot ℚ)) (T : Finset (Fin n)) : WithBot ℚ :=
  (tab.filter (fun e => e.1 = T)).sup Prod.snd

/-- Lookup with default `⊤`. -/
def lookupTop (tab : Finset (Finset (Fin n) × WithTop ℚ)) (T : Finset (Fin n)) : WithTop ℚ :=
  (tab.filter (fun e => e.1 = T)).inf Prod.snd

theorem lookupBot_of_mem {tab : Finset (Finset (Fin n) × WithBot ℚ)} {T : Finset (Fin n)}
    {v : WithBot ℚ} (hkey : ∀ e ∈ tab, e.1 = T → e = (T, v)) (h : (T, v) ∈ tab) :
    lookupBot tab T = v := by
  unfold lookupBot
  rw [show tab.filter (fun e => e.1 = T) = {(T, v)} by
    ext e; simp only [Finset.mem_filter, Finset.mem_singleton]
    exact ⟨fun he => hkey e he.1 he.2, fun he => he ▸ ⟨h, rfl⟩⟩]
  simp

theorem lookupBot_of_not_mem {tab : Finset (Finset (Fin n) × WithBot ℚ)} {T : Finset (Fin n)}
    (h : ∀ e ∈ tab, e.1 ≠ T) : lookupBot tab T = ⊥ := by
  unfold lookupBot
  rw [Finset.filter_false_of_mem (fun e he => h e he)]; rfl

theorem lookupTop_of_mem {tab : Finset (Finset (Fin n) × WithTop ℚ)} {T : Finset (Fin n)}
    {v : WithTop ℚ} (hkey : ∀ e ∈ tab, e.1 = T → e = (T, v)) (h : (T, v) ∈ tab) :
    lookupTop tab T = v := by
  unfold lookupTop
  rw [show tab.filter (fun e => e.1 = T) = {(T, v)} by
    ext e; simp only [Finset.mem_filter, Finset.mem_singleton]
    exact ⟨fun he => hkey e he.1 he.2, fun he => he ▸ ⟨h, rfl⟩⟩]
  simp

theorem lookupTop_of_not_mem {tab : Finset (Finset (Fin n) × WithTop ℚ)} {T : Finset (Fin n)}
    (h : ∀ e ∈ tab, e.1 ≠ T) : lookupTop tab T = ⊤ := by
  unfold lookupTop
  rw [Finset.filter_false_of_mem (fun e he => h e he)]; rfl

/-! ## Memoised ordering DP -/

/-- Bottom-up DP table for layer `s` (reachable `k`-cuts of size `s`). -/
def dpTab (A : WMat n) (k : ℕ) : ℕ → Finset (Finset (Fin n) × WithBot ℚ)
  | 0 => {(∅, 0)}
  | s + 1 =>
    let prev := dpTab A k s
    (reachLayer A k (s + 1)).image (fun T =>
      (T, T.sup (fun v => lookupBot prev (T.erase v) + (gain A (T.erase v) v : WithBot ℚ))))

theorem mem_reachLayer_succ (A : WMat n) (k s : ℕ) (T : Finset (Fin n)) :
    T ∈ reachLayer A k (s + 1) ↔
      (∃ S ∈ reachLayer A k s, ∃ v, insert v S = T) ∧ T.card = s + 1 ∧
        weakMajorityCut A T ≤ k := by
  simp [reachLayer]

/-- A finite DP value certifies reachability through `k`-cuts. -/
theorem cutDP_ne_bot_mem (A : WMat n) (k : ℕ) :
    ∀ s (T : Finset (Fin n)), T.card = s → cutDP A k T ≠ ⊥ → T ∈ reachLayer A k s := by
  intro s
  induction s with
  | zero =>
    intro T hT _
    rw [Finset.card_eq_zero.mp hT]; simp [reachLayer]
  | succ s ih =>
    intro T hT hne
    have hTne : T ≠ ∅ := by rintro rfl; simp at hT
    have hk : weakMajorityCut A T ≤ k := by
      by_contra hk; apply hne; rw [cutDP]; simp [hTne, hk]
    rw [cutDP_of_ne A k hTne hk] at hne
    obtain ⟨⟨v, hv⟩, -, hv'⟩ : ∃ w ∈ T.attach,
        cutDP A k (T.erase w.1) + (gain A (T.erase w.1) w.1 : WithBot ℚ) ≠ ⊥ := by
      by_contra hall
      push Not at hall
      exact hne ((Finset.sup_eq_bot_iff _ _).mpr hall)
    have hsub : cutDP A k (T.erase v) ≠ ⊥ := by
      intro hb; apply hv'; rw [hb]; rfl
    have hcard : (T.erase v).card = s := by rw [Finset.card_erase_of_mem hv, hT]; rfl
    rw [mem_reachLayer_succ]
    exact ⟨⟨T.erase v, ih _ hcard hsub, v, Finset.insert_erase hv⟩, hT, hk⟩

theorem lookup_dpTab (A : WMat n) (k : ℕ) :
    ∀ s (T : Finset (Fin n)), T.card = s → lookupBot (dpTab A k s) T = cutDP A k T := by
  intro s
  induction s with
  | zero =>
    intro T hT
    rw [Finset.card_eq_zero.mp hT, cutDP_empty]
    exact lookupBot_of_mem (fun e he _ => by simpa [dpTab] using he) (by simp [dpTab])
  | succ s ih =>
    intro T hT
    have hTne : T ≠ ∅ := by rintro rfl; simp at hT
    by_cases hmem : T ∈ reachLayer A k (s + 1)
    · have hk : weakMajorityCut A T ≤ k := ((mem_reachLayer_succ A k s T).mp hmem).2.2
      set val := T.sup (fun v => lookupBot (dpTab A k s) (T.erase v) +
        (gain A (T.erase v) v : WithBot ℚ))
      have hentry : (T, val) ∈ dpTab A k (s + 1) := by
        simp only [dpTab]; exact Finset.mem_image.mpr ⟨T, hmem, rfl⟩
      rw [lookupBot_of_mem (fun e he heq => by
        simp only [dpTab, Finset.mem_image] at he
        obtain ⟨T', -, rfl⟩ := he
        simp only at heq; subst heq; rfl) hentry]
      rw [cutDP_of_ne A k hTne hk, Finset.sup_attach T (fun v => cutDP A k (T.erase v) +
        (gain A (T.erase v) v : WithBot ℚ))]
      apply Finset.sup_congr rfl
      intro v hv
      rw [ih (T.erase v) (by rw [Finset.card_erase_of_mem hv, hT]; rfl)]
    · rw [lookupBot_of_not_mem (fun e he heq => by
        simp only [dpTab, Finset.mem_image] at he
        obtain ⟨T', hT', rfl⟩ := he
        exact hmem (heq ▸ hT'))]
      by_contra hne
      exact hmem (cutDP_ne_bot_mem A k (s + 1) T hT (Ne.symm hne))

/-- Memoised `f_k(V)`. -/
def cutDPM (A : WMat n) (k : ℕ) : WithBot ℚ := lookupBot (dpTab A k n) univ

theorem cutDPM_eq (A : WMat n) (k : ℕ) : cutDPM A k = cutDP A k univ :=
  lookup_dpTab A k n univ (by simp)

/-! ## Memoised shortest paths -/

/-- Cumulative shortest-path table over `∅` and the nodes of size `≤ s`. -/
def distTab (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) : ℕ → Finset (Finset (Fin n) × WithTop ℚ)
  | 0 => {(∅, 0)}
  | s + 1 =>
    let prev := distTab A k τ b s
    prev ∪ ((nodes A k).filter (fun C => C.card = s + 1)).image (fun C' =>
      (C', (preds A k b C').inf (fun C => lookupTop prev C + (edgeCost A τ C (C' \ C) : WithTop ℚ))))

/-- Invariant of the shortest-path table: (a) every entry is `(C, dist C)` with `C = ∅` or a node
of size `≤ s`; (b) every such `C` has an entry. -/
theorem distTab_inv (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) :
    ∀ s, (∀ e ∈ distTab A k τ b s, e.1.card ≤ s ∧ (e.1 = ∅ ∨ e.1 ∈ nodes A k) ∧
        e.2 = dist A k τ b e.1) ∧
      (∀ C : Finset (Fin n), (C = ∅ ∨ C ∈ nodes A k) → C.card ≤ s →
        (C, dist A k τ b C) ∈ distTab A k τ b s) := by
  intro s
  induction s with
  | zero =>
    refine ⟨fun e he => ?_, fun C _ hC => ?_⟩
    · simp only [distTab, Finset.mem_singleton] at he
      subst he; simp [dist_empty]
    · rw [Finset.card_eq_zero.mp (Nat.le_zero.mp hC), dist_empty]; simp [distTab]
  | succ s ih =>
    obtain ⟨ihA, ihB⟩ := ih
    have hlook : ∀ C : Finset (Fin n), (C = ∅ ∨ C ∈ nodes A k) → C.card ≤ s →
        lookupTop (distTab A k τ b s) C = dist A k τ b C := by
      intro C hC hcard
      apply lookupTop_of_mem _ (ihB C hC hcard)
      intro e he heq
      obtain ⟨-, -, hv⟩ := ihA e he
      exact Prod.ext heq (by rw [hv, heq])
    have hnew : ∀ C' ∈ nodes A k, C'.card = s + 1 →
        (preds A k b C').inf (fun C => lookupTop (distTab A k τ b s) C +
          (edgeCost A τ C (C' \ C) : WithTop ℚ)) = dist A k τ b C' := by
      intro C' hnode hcard
      have hne : C' ≠ ∅ := by rintro rfl; simp at hcard
      rw [dist_of_mem A k τ b hne hnode]
      apply Finset.inf_congr rfl
      intro C hC
      rw [hlook C (Or.inr (Finset.mem_filter.mp hC).1)
        (by have := card_lt_of_mem_preds hC; omega)]
    refine ⟨fun e he => ?_, fun C hC hcard => ?_⟩
    · simp only [distTab, Finset.mem_union, Finset.mem_image, Finset.mem_filter] at he
      rcases he with he | ⟨C', ⟨hnode, hcard⟩, rfl⟩
      · obtain ⟨h1, h2, h3⟩ := ihA e he; exact ⟨by omega, h2, h3⟩
      · exact ⟨le_of_eq hcard, Or.inr hnode, hnew C' hnode hcard⟩
    · simp only [distTab, Finset.mem_union, Finset.mem_image, Finset.mem_filter]
      rcases Nat.lt_or_ge C.card (s + 1) with hlt | hge
      · exact Or.inl (ihB C hC (by omega))
      · have hc : C.card = s + 1 := by omega
        have hnode : C ∈ nodes A k := by
          rcases hC with rfl | h
          · simp at hc
          · exact h
        exact Or.inr ⟨C, ⟨hnode, hc⟩, by rw [hnew C hnode hc]⟩

theorem lookup_distTab (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) (s : ℕ)
    (C : Finset (Fin n)) (hC : C.card ≤ s) :
    lookupTop (distTab A k τ b s) C = dist A k τ b C := by
  obtain ⟨hA, hB⟩ := distTab_inv A k τ b s
  by_cases hkey : C = ∅ ∨ C ∈ nodes A k
  · apply lookupTop_of_mem _ (hB C hkey hC)
    intro e he heq
    obtain ⟨-, -, hv⟩ := hA e he
    exact Prod.ext heq (by rw [hv, heq])
  · have hk1 : C ≠ ∅ := fun h => hkey (Or.inl h)
    have hk2 : C ∉ nodes A k := fun h => hkey (Or.inr h)
    rw [lookupTop_of_not_mem (fun e he heq => by
      obtain ⟨-, h2, -⟩ := hA e he
      rw [heq] at h2
      rcases h2 with h | h
      · exact hk1 h
      · exact hk2 h)]
    exact (dist_of_not_mem A k τ b hk1 hk2).symm

/-- Memoised `dist(V)`. -/
def distM (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) : WithTop ℚ :=
  lookupTop (distTab A k τ b n) univ

theorem distM_eq (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) :
    distM A k τ b = dist A k τ b univ :=
  lookup_distTab A k τ b n univ (by simp)

/-! ## Selection congruence -/

theorem selMinSet_congr (s : Finset (Finset (Fin n))) {f g : Finset (Fin n) → WithTop ℚ}
    (h : s.Nonempty) (hfg : ∀ C ∈ s, f C = g C) : selMinSet s f h = selMinSet s g h := by
  unfold selMinSet
  have hinf : s.inf' h f = s.inf' h g := Finset.inf'_congr h rfl hfg
  have hfil : s.filter (fun C => f C = s.inf' h f) = s.filter (fun C => g C = s.inf' h g) := by
    apply Finset.filter_congr; intro C hC; rw [hfg C hC, hinf]
  simp only [hfil]

theorem selMaxV_congr (S : Finset (Fin n)) {f g : Fin n → WithBot ℚ} (h : S.Nonempty)
    (hfg : ∀ v ∈ S, f v = g v) : selMaxV S f h = selMaxV S g h := by
  unfold selMaxV
  have hsup : S.sup' h f = S.sup' h g := Finset.sup'_congr h rfl hfg
  have hfil : S.filter (fun v => f v = S.sup' h f) = S.filter (fun v => g v = S.sup' h g) := by
    apply Finset.filter_congr; intro v hv; rw [hfg v hv, hsup]
  simp only [hfil]

/-! ## Memoised extraction -/

/-- Path extraction using a precomputed shortest-path table `T`. -/
def extractM (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ)
    (T : Finset (Finset (Fin n) × WithTop ℚ)) (C' : Finset (Fin n)) : ℕ × (Fin n → ℕ) :=
  if h : (preds A k b C').Nonempty then
    let C := selMinSet (preds A k b C')
      (fun C => lookupTop T C + (edgeCost A τ C (C' \ C) : WithTop ℚ)) h
    let r := extractM A k τ b T C
    (r.1 + 1, fun v => if v ∈ C then r.2 v else r.1)
  else (0, fun _ => 0)
termination_by C'.card
decreasing_by exact card_lt_of_mem_preds (selMinSet_spec _ _ h).1

theorem extractM_eq (A : WMat n) (k : ℕ) (τ : Option ℚ) (b : ℕ) :
    ∀ (s : ℕ) (C' : Finset (Fin n)), C'.card = s →
      extractM A k τ b (distTab A k τ b n) C' = extractX A k τ b C' := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
  intro C' hcard
  rw [extractM, extractX]
  by_cases h : (preds A k b C').Nonempty
  · simp only [h, dite_true]
    have hsel : selMinSet (preds A k b C')
        (fun C => lookupTop (distTab A k τ b n) C + (edgeCost A τ C (C' \ C) : WithTop ℚ)) h =
        argPredX A k τ b C' h := by
      unfold argPredX
      apply selMinSet_congr
      intro C hC
      unfold stepVal
      rw [lookup_distTab A k τ b n C (by simpa using Finset.card_le_univ C)]
    rw [hsel]
    have hlt : (argPredX A k τ b C' h).card < s :=
      hcard ▸ card_lt_of_mem_preds (argPredX_spec A k τ b C' h).1
    rw [ih _ hlt _ rfl]
  · simp only [h, dite_false]

/-! ## Memoised ordering extraction -/

def dpOrderM (A : WMat n) (k : ℕ) (S : Finset (Fin n)) : Equiv.Perm (Fin n) :=
  if h : S.Nonempty then
    let tab := dpTab A k (S.card - 1)
    let v := selMaxV S (fun v => lookupBot tab (S.erase v) + (gain A (S.erase v) v : WithBot ℚ)) h
    extendPerm (dpOrderM A k (S.erase v)) (S.card - 1) v
  else Equiv.refl _
termination_by S.card
decreasing_by exact Finset.card_erase_lt_of_mem (selMaxV_spec _ _ h).1

theorem dpOrderM_eq (A : WMat n) (k : ℕ) :
    ∀ (s : ℕ) (S : Finset (Fin n)), S.card = s → dpOrderM A k S = dpOrderX A k S := by
  intro s
  induction s using Nat.strong_induction_on with
  | _ s ih =>
  intro S hS
  rw [dpOrderM, dpOrderX]
  by_cases h : S.Nonempty
  · simp only [h, dite_true]
    have hsel : selMaxV S (fun v => lookupBot (dpTab A k (S.card - 1)) (S.erase v) +
        (gain A (S.erase v) v : WithBot ℚ)) h = dpLastX A k S h := by
      unfold dpLastX
      apply selMaxV_congr
      intro v hv
      rw [lookup_dpTab A k (S.card - 1) (S.erase v) (Finset.card_erase_of_mem hv)]
    rw [hsel]
    have hlt : (S.erase (dpLastX A k S h)).card < s :=
      hS ▸ Finset.card_erase_lt_of_mem (dpLastX_spec A k S h).1
    rw [ih _ hlt _ rfl]
  · simp only [h, dite_false]

/-! ## Memoised candidate values -/

def candValM (A : WMat n) (k : ℕ) (q : Option ℚ × ℕ) : WithTop ℕ :=
  if h : distM A k q.1 q.2 = ⊤ then ⊤
  else ((q.2 ^ 2 + 3 * ⌊(distM A k q.1 q.2).untop h⌋₊ : ℕ) : WithTop ℕ)

theorem candValM_eq (A : WMat n) (k : ℕ) : candValM A k = candValX A k := by
  funext q
  unfold candValM candValX
  simp only [distM_eq]

def recogValM (A : WMat n) (k : ℕ) : WithTop ℕ := (candidates A k).inf (candValM A k)

theorem recogValM_eq (A : WMat n) (k : ℕ) : recogValM A k = recogValX A k := by
  unfold recogValM recogValX; rw [candValM_eq]

def selCandM (A : WMat n) (k : ℕ) : Option ℚ × ℕ :=
  let s := candidates A k
  let ties := s.filter (fun q => candValM A k q = s.inf' (candidates_nonempty A k) (candValM A k))
  let m := (ties.image candKey).min' (by
    obtain ⟨q, hq, hqeq⟩ := Finset.exists_mem_eq_inf' (candidates_nonempty A k) (candValM A k)
    exact ⟨candKey q, Finset.mem_image.mpr ⟨q, Finset.mem_filter.mpr ⟨hq, hqeq.symm⟩, rfl⟩⟩)
  ((ofLex m).1, (ofLex m).2)

theorem selCandM_eq (A : WMat n) (k : ℕ) : selCandM A k = selCand A k := by
  unfold selCandM selCand
  simp only [candValM_eq]

end Westfall022
