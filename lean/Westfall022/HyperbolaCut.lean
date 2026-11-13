import Mathlib.Data.Finset.Card
import Mathlib.Data.Finset.Prod
import Mathlib.Data.Finset.Image
import Mathlib.Data.Fintype.Basic
import Mathlib.Data.Fintype.Prod
import Mathlib.Data.Fin.Basic
import Mathlib.Tactic.Linarith

/-!
# Mission 028: the hyperbola inequality for cuts of semi-complete digraphs

`cut adj S` is the number of arcs from outside `S` into `S`. In a semi-complete digraph (every
pair of distinct vertices is joined by at least one arc), any two vertex sets `P`, `S` satisfy

  `|P \ S| * |S \ P| ≤ cut P + cut S`     (`card_sdiff_mul_card_sdiff_le`).

Applied to a prefix `P` of an ordering of width `≤ c` and a `k`-cut `S`, it says that
(number of non-members of `S` inside the prefix) × (number of members of `S` after the prefix)
is at most `c + k` (`kcut_hyperbola`). This is the digraph part of the counting theorem for
`k`-cuts (research/discovery-028/REPORT.md, Theorem A).

**Not formalized here:** the injection from such sets into partitions under a hyperbola, and the
bound `H(K) ≤ exp(2π√K)`.
-/

namespace Westfall028

open Finset

variable {V : Type*} [Fintype V] [DecidableEq V]

/-- Arcs `(w, u)` with `w ∉ S`, `u ∈ S`. -/
def inArcs (adj : V → V → Prop) [DecidableRel adj] (S : Finset V) : Finset (V × V) :=
  univ.filter (fun p => p.1 ∉ S ∧ p.2 ∈ S ∧ adj p.1 p.2)

/-- `cut S`: the number of arcs entering `S`. -/
def cut (adj : V → V → Prop) [DecidableRel adj] (S : Finset V) : ℕ := (inArcs adj S).card

/-- A digraph is semi-complete if every two distinct vertices are joined by an arc. -/
def SemiComplete (adj : V → V → Prop) : Prop := ∀ u v, u ≠ v → adj u v ∨ adj v u

/-- **Hyperbola inequality.** In a semi-complete digraph, `|P \ S| * |S \ P| ≤ cut P + cut S`. -/
theorem card_sdiff_mul_card_sdiff_le (adj : V → V → Prop) [DecidableRel adj]
    (hsc : SemiComplete adj) (P S : Finset V) :
    (P \ S).card * (S \ P).card ≤ cut adj P + cut adj S := by
  have hsub : (P \ S) ×ˢ (S \ P) ⊆ inArcs adj S ∪ (inArcs adj P).image Prod.swap := by
    intro p hp
    obtain ⟨hu, hv⟩ := Finset.mem_product.mp hp
    obtain ⟨huP, huS⟩ := Finset.mem_sdiff.mp hu
    obtain ⟨hvS, hvP⟩ := Finset.mem_sdiff.mp hv
    have hne : p.1 ≠ p.2 := fun h => huS (h ▸ hvS)
    rcases hsc p.1 p.2 hne with h | h
    · exact Finset.mem_union_left _ (by simp [inArcs, huS, hvS, h])
    · refine Finset.mem_union_right _ (Finset.mem_image.mpr ⟨(p.2, p.1), ?_, rfl⟩)
      simp [inArcs, hvP, huP, h]
  calc (P \ S).card * (S \ P).card = ((P \ S) ×ˢ (S \ P)).card := (Finset.card_product _ _).symm
    _ ≤ (inArcs adj S ∪ (inArcs adj P).image Prod.swap).card := Finset.card_le_card hsub
    _ ≤ (inArcs adj S).card + ((inArcs adj P).image Prod.swap).card := Finset.card_union_le _ _
    _ ≤ (inArcs adj S).card + (inArcs adj P).card := Nat.add_le_add_left Finset.card_image_le _
    _ = cut adj P + cut adj S := by unfold cut; omega

variable {n : ℕ}

/-- The first `t` vertices in the natural order of `Fin n`. -/
def pre (t : ℕ) : Finset (Fin n) := univ.filter (fun v => v.val < t)

/-- **`k`-cuts lie under the hyperbola.** If every prefix of the natural ordering of `Fin n` has
cut at most `c` and `S` is a `k`-cut, then for every position `t`
(non-members of `S` among the first `t` vertices) × (members of `S` after them) `≤ c + k`. -/
theorem kcut_hyperbola (adj : Fin n → Fin n → Prop) [DecidableRel adj] (hsc : SemiComplete adj)
    (c k : ℕ) (hwidth : ∀ t, cut adj (pre t) ≤ c) (S : Finset (Fin n)) (hS : cut adj S ≤ k)
    (t : ℕ) :
    (univ.filter (fun v : Fin n => v.val < t ∧ v ∉ S)).card *
      (univ.filter (fun v : Fin n => t ≤ v.val ∧ v ∈ S)).card ≤ c + k := by
  have h := card_sdiff_mul_card_sdiff_le adj hsc (pre t) S
  have e1 : (pre t : Finset (Fin n)) \ S = univ.filter (fun v : Fin n => v.val < t ∧ v ∉ S) := by
    ext v; simp [pre]
  have e2 : S \ (pre t : Finset (Fin n)) = univ.filter (fun v : Fin n => t ≤ v.val ∧ v ∈ S) := by
    ext v; simp [pre]; tauto
  rw [e1, e2] at h
  have := hwidth t
  omega

end Westfall028
