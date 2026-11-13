import Westfall022.PartitionCountDP

/-!
# Mission 025: the cost semantics

## The computation model

A program is written in the **cost monad** `Cost`. A value `x : Cost α` is a pair: the result
`x.val` and the number `x.cost` of primitive steps used to compute it. Sequencing adds costs
(`bind_cost`), and `pure` costs nothing. The executable algorithm `autoCutC` is *defined* as the
`val` projection of the costed program `autoCutCosted` (`CostedAutoCut.lean`). The program that
runs and the program whose cost is bounded are therefore the same term, so no separate,
hand-written cost function needs to be trusted.

Costs are charged in exactly two ways:

1. **Collection operations** (`cFilter`, `cImage`, `cBiUnion`, `cUnion`, `cSup`, `cInf`, the
   selectors `cSelMinSet`, `cSelMaxV`, `cSelMin`). Each one charges one step per element visited,
   plus the cost of every costed callback it evaluates on that element. Operations that remove
   duplicates (`image`, `biUnion`, `∪`) are charged a **quadratic** number of equality tests,
   `E` steps each. This is the cost of the list-based `Finset` implementation, which
   deduplicates by pairwise comparison; there is no hashing and no `O(1)` lookup. Table lookups
   are linear scans built from `cFilter` and `cInf`.
2. **Leaf operations** (`charge c a`). These apply to one subset of `Fin n`, one matrix entry, or
   one fixed `O(n²)`-size computation (a weak-majority cut, an edge cost, a gain, a
   permutation update). Every `charge` site in `CostedAutoCut.lean` uses an explicit polynomial
   in `n`. Each polynomial is an upper bound for the leaf's definition, which is a filter or
   sum over at most `n²` pairs with `O(n)` membership tests (see the table in
   `MISSION_025_REPORT.md`).

**Arithmetic.** Rational addition, comparison, division and floor, and natural-number
arithmetic, are unit cost (the arithmetic, or "unit-cost RAM", model). Bit complexity is
*not* modelled here; see `MISSION_025_REPORT.md`.
-/

namespace Westfall022

universe u v

/-- A computation with a step count. -/
structure Cost (α : Type u) : Type u where
  /-- The result. -/
  val : α
  /-- The number of primitive steps. -/
  cost : ℕ

namespace Cost

instance : Monad Cost where
  pure a := ⟨a, 0⟩
  bind x f := ⟨(f x.val).val, x.cost + (f x.val).cost⟩

variable {α β : Type u}

@[simp] theorem pure_val (a : α) : (pure a : Cost α).val = a := rfl
@[simp] theorem pure_cost (a : α) : (pure a : Cost α).cost = 0 := rfl
@[simp] theorem bind_val (x : Cost α) (f : α → Cost β) : (x >>= f).val = (f x.val).val := rfl
@[simp] theorem bind_cost (x : Cost α) (f : α → Cost β) :
    (x >>= f).cost = x.cost + (f x.val).cost := rfl

/-- A leaf operation with declared cost `c`. -/
def charge (c : ℕ) (a : α) : Cost α := ⟨a, c⟩

@[simp] theorem charge_val (c : ℕ) (a : α) : (charge c a).val = a := rfl
@[simp] theorem charge_cost (c : ℕ) (a : α) : (charge c a).cost = c := rfl

theorem ite_val (p : Prop) [Decidable p] (x y : Cost α) :
    (if p then x else y).val = if p then x.val else y.val := by split_ifs <;> rfl
theorem ite_cost (p : Prop) [Decidable p] (x y : Cost α) :
    (if p then x else y).cost = if p then x.cost else y.cost := by split_ifs <;> rfl

end Cost

open Cost Finset

variable {α : Type u} {β : Type v}

/-! ## Costed collection operations -/

/-- `filter` with a costed predicate: one step per element plus the predicate's cost. -/
def cFilter (s : Finset α) (p : α → Cost Bool) : Cost (Finset α) :=
  ⟨s.filter (fun a => (p a).val = true), ∑ a ∈ s, ((p a).cost + 1)⟩

/-- `image` with a costed map; duplicates are removed by `|s|²` equality tests of cost `E`. -/
def cImage [DecidableEq β] (E : ℕ) (s : Finset α) (f : α → Cost β) : Cost (Finset β) :=
  ⟨s.image (fun a => (f a).val), ∑ a ∈ s, ((f a).cost + 1) + s.card * s.card * E⟩

/-- `biUnion` with a costed family; the union is deduplicated by pairwise comparison over the
total size `Σ |f a|`. -/
def cBiUnion [DecidableEq β] (E : ℕ) (s : Finset α) (f : α → Cost (Finset β)) :
    Cost (Finset β) :=
  ⟨s.biUnion (fun a => (f a).val),
    ∑ a ∈ s, ((f a).cost + 1) + (∑ a ∈ s, (f a).val.card) * (∑ a ∈ s, (f a).val.card) * E⟩

/-- Binary union by pairwise comparison. -/
def cUnion [DecidableEq α] (E : ℕ) (s t : Finset α) : Cost (Finset α) :=
  ⟨s ∪ t, (s.card + 1) * (t.card + 1) * E⟩

/-- `sup` with a costed map. -/
def cSup {γ : Type v} [SemilatticeSup γ] [OrderBot γ] (s : Finset α) (f : α → Cost γ) : Cost γ :=
  ⟨s.sup (fun a => (f a).val), ∑ a ∈ s, ((f a).cost + 1)⟩

/-- `inf` with a costed map. -/
def cInf {γ : Type v} [SemilatticeInf γ] [OrderTop γ] (s : Finset α) (f : α → Cost γ) : Cost γ :=
  ⟨s.inf (fun a => (f a).val), ∑ a ∈ s, ((f a).cost + 1)⟩

@[simp] theorem cFilter_val (s : Finset α) (p : α → Cost Bool) :
    (cFilter s p).val = s.filter (fun a => (p a).val = true) := rfl
@[simp] theorem cImage_val [DecidableEq β] (E : ℕ) (s : Finset α) (f : α → Cost β) :
    (cImage E s f).val = s.image (fun a => (f a).val) := rfl
@[simp] theorem cBiUnion_val [DecidableEq β] (E : ℕ) (s : Finset α) (f : α → Cost (Finset β)) :
    (cBiUnion E s f).val = s.biUnion (fun a => (f a).val) := rfl
@[simp] theorem cUnion_val [DecidableEq α] (E : ℕ) (s t : Finset α) : (cUnion E s t).val = s ∪ t :=
  rfl
@[simp] theorem cSup_val {γ : Type v} [SemilatticeSup γ] [OrderBot γ] (s : Finset α)
    (f : α → Cost γ) : (cSup s f).val = s.sup (fun a => (f a).val) := rfl
@[simp] theorem cInf_val {γ : Type v} [SemilatticeInf γ] [OrderTop γ] (s : Finset α)
    (f : α → Cost γ) : (cInf s f).val = s.inf (fun a => (f a).val) := rfl

/-! ## Cost bounds for the combinators -/

theorem sum_succ_le (s : Finset α) (g : α → ℕ) (B : ℕ) (h : ∀ a ∈ s, g a ≤ B) :
    ∑ a ∈ s, (g a + 1) ≤ s.card * (B + 1) := by
  have := Finset.sum_le_card_nsmul s (fun a => g a + 1) (B + 1) (fun a ha => by simp [h a ha])
  simpa using this

theorem cFilter_cost_le (s : Finset α) (p : α → Cost Bool) (B : ℕ)
    (h : ∀ a ∈ s, (p a).cost ≤ B) : (cFilter s p).cost ≤ s.card * (B + 1) :=
  sum_succ_le s _ B h

theorem cImage_cost_le [DecidableEq β] (E : ℕ) (s : Finset α) (f : α → Cost β) (B : ℕ)
    (h : ∀ a ∈ s, (f a).cost ≤ B) : (cImage E s f).cost ≤ s.card * (B + 1) + s.card * s.card * E :=
  Nat.add_le_add_right (sum_succ_le s _ B h) _

theorem cBiUnion_cost_le [DecidableEq β] (E : ℕ) (s : Finset α) (f : α → Cost (Finset β))
    (B D : ℕ) (h : ∀ a ∈ s, (f a).cost ≤ B) (hD : ∀ a ∈ s, (f a).val.card ≤ D) :
    (cBiUnion E s f).cost ≤ s.card * (B + 1) + (s.card * D) * (s.card * D) * E := by
  have h1 := sum_succ_le s _ B h
  have h2 : ∑ a ∈ s, (f a).val.card ≤ s.card * D := by
    have := Finset.sum_le_card_nsmul s (fun a => (f a).val.card) D hD
    simpa using this
  unfold cBiUnion
  simp only
  have h3 := Nat.mul_le_mul h2 h2
  have h4 := Nat.mul_le_mul_right E h3
  omega

theorem cBiUnion_card_le [DecidableEq β] (E : ℕ) (s : Finset α) (f : α → Cost (Finset β))
    (D : ℕ) (hD : ∀ a ∈ s, (f a).val.card ≤ D) : (cBiUnion E s f).val.card ≤ s.card * D := by
  rw [cBiUnion_val]
  refine (Finset.card_biUnion_le).trans ?_
  have := Finset.sum_le_card_nsmul s (fun a => (f a).val.card) D hD
  simpa using this

theorem cSup_cost_le {γ : Type v} [SemilatticeSup γ] [OrderBot γ] (s : Finset α) (f : α → Cost γ)
    (B : ℕ) (h : ∀ a ∈ s, (f a).cost ≤ B) : (cSup s f).cost ≤ s.card * (B + 1) :=
  sum_succ_le s _ B h

theorem cInf_cost_le {γ : Type v} [SemilatticeInf γ] [OrderTop γ] (s : Finset α) (f : α → Cost γ)
    (B : ℕ) (h : ∀ a ∈ s, (f a).cost ≤ B) : (cInf s f).cost ≤ s.card * (B + 1) :=
  sum_succ_le s _ B h

/-! ## Costed table lookups (linear scans) and selectors -/

variable {n : ℕ}

/-- Cost of comparing two subsets of `Fin n` for equality (list-based `Finset`: `O(n²)`). -/
def setEq (n : ℕ) : ℕ := (n + 1) ^ 2

/-- Linear-scan lookup with default `⊤`: one key comparison per table entry, then an `inf`
over the matches. -/
def cLookupTop (tab : Finset (Finset (Fin n) × WithTop ℚ)) (T : Finset (Fin n)) :
    Cost (WithTop ℚ) := do
  let m ← cFilter tab (fun e => charge (setEq n) (decide (e.1 = T)))
  cInf m (fun e => pure e.2)

/-- Linear-scan lookup with default `⊥`. -/
def cLookupBot (tab : Finset (Finset (Fin n) × WithBot ℚ)) (T : Finset (Fin n)) :
    Cost (WithBot ℚ) := do
  let m ← cFilter tab (fun e => charge (setEq n) (decide (e.1 = T)))
  cSup m (fun e => pure e.2)

@[simp] theorem cLookupTop_val (tab : Finset (Finset (Fin n) × WithTop ℚ)) (T : Finset (Fin n)) :
    (cLookupTop tab T).val = lookupTop tab T := by
  simp [cLookupTop, lookupTop]

@[simp] theorem cLookupBot_val (tab : Finset (Finset (Fin n) × WithBot ℚ)) (T : Finset (Fin n)) :
    (cLookupBot tab T).val = lookupBot tab T := by
  simp [cLookupBot, lookupBot]

theorem cLookupTop_cost_le (tab : Finset (Finset (Fin n) × WithTop ℚ)) (T : Finset (Fin n)) :
    (cLookupTop tab T).cost ≤ 2 * tab.card * (setEq n + 1) := by
  simp only [cLookupTop, bind_cost]
  have h1 := cFilter_cost_le tab (fun e => charge (setEq n) (decide (e.1 = T))) (setEq n)
    (fun _ _ => le_rfl)
  have h2 := cInf_cost_le (cFilter tab (fun e => charge (setEq n) (decide (e.1 = T)))).val
    (fun e => (pure e.2 : Cost (WithTop ℚ))) 0 (fun _ _ => by simp)
  have h3 : (cFilter tab (fun e => charge (setEq n) (decide (e.1 = T)))).val.card ≤ tab.card :=
    Finset.card_filter_le _ _
  have h4 := Nat.mul_le_mul_right 1 h3
  nlinarith

theorem cLookupBot_cost_le (tab : Finset (Finset (Fin n) × WithBot ℚ)) (T : Finset (Fin n)) :
    (cLookupBot tab T).cost ≤ 2 * tab.card * (setEq n + 1) := by
  simp only [cLookupBot, bind_cost]
  have h1 := cFilter_cost_le tab (fun e => charge (setEq n) (decide (e.1 = T))) (setEq n)
    (fun _ _ => le_rfl)
  have h2 := cSup_cost_le (cFilter tab (fun e => charge (setEq n) (decide (e.1 = T)))).val
    (fun e => (pure e.2 : Cost (WithBot ℚ))) 0 (fun _ _ => by simp)
  have h3 : (cFilter tab (fun e => charge (setEq n) (decide (e.1 = T)))).val.card ≤ tab.card :=
    Finset.card_filter_le _ _
  nlinarith

/-- Costed `selMinSet`: an `inf'` pass and a `filter` pass (each evaluating `f` once per
element), then `image toColex` (quadratic deduplication) and `min'` (a linear scan of
colex comparisons, `setEq n` each). -/
def cSelMinSet (s : Finset (Finset (Fin n))) (f : Finset (Fin n) → Cost (WithTop ℚ))
    (h : s.Nonempty) : Cost (Finset (Fin n)) :=
  ⟨selMinSet s (fun C => (f C).val) h,
    2 * ∑ C ∈ s, ((f C).cost + 1) + (s.card + 1) * (s.card + 1) * setEq n⟩

/-- Costed `selMaxV` over a set of vertices: `sup'` and `filter` passes, then `min'`. -/
def cSelMaxV (S : Finset (Fin n)) (f : Fin n → Cost (WithBot ℚ)) (h : S.Nonempty) : Cost (Fin n) :=
  ⟨selMaxV S (fun v => (f v).val) h, 2 * ∑ v ∈ S, ((f v).cost + 1) + (S.card + 1)⟩

@[simp] theorem cSelMinSet_val (s : Finset (Finset (Fin n))) (f : Finset (Fin n) → Cost (WithTop ℚ))
    (h : s.Nonempty) : (cSelMinSet s f h).val = selMinSet s (fun C => (f C).val) h := rfl
@[simp] theorem cSelMaxV_val (S : Finset (Fin n)) (f : Fin n → Cost (WithBot ℚ)) (h : S.Nonempty) :
    (cSelMaxV S f h).val = selMaxV S (fun v => (f v).val) h := rfl

theorem cSelMinSet_cost_le (s : Finset (Finset (Fin n))) (f : Finset (Fin n) → Cost (WithTop ℚ))
    (h : s.Nonempty) (B : ℕ) (hB : ∀ C ∈ s, (f C).cost ≤ B) :
    (cSelMinSet s f h).cost ≤ 2 * (s.card * (B + 1)) + (s.card + 1) * (s.card + 1) * setEq n := by
  have := sum_succ_le s _ B hB
  unfold cSelMinSet; simp only; omega

theorem cSelMaxV_cost_le (S : Finset (Fin n)) (f : Fin n → Cost (WithBot ℚ)) (h : S.Nonempty)
    (B : ℕ) (hB : ∀ v ∈ S, (f v).cost ≤ B) :
    (cSelMaxV S f h).cost ≤ 2 * (S.card * (B + 1)) + (S.card + 1) := by
  have := sum_succ_le S _ B hB
  unfold cSelMaxV; simp only; omega

/-! ## Arithmetic helpers for the bounds -/

theorem mono_le {N V a b A B : ℕ} (hN : 1 ≤ N) (hV : 1 ≤ V) (ha : a ≤ A) (hb : b ≤ B) :
    N ^ a * V ^ b ≤ N ^ A * V ^ B :=
  Nat.mul_le_mul (Nat.pow_le_pow_right hN ha) (Nat.pow_le_pow_right hV hb)

end Westfall022
