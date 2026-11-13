import Mathlib

/-!
# Westfall Structural Optimization Theorem: foundation definitions

This module does NOT establish the Westfall Partition Recovery Theorem,
the main AutoCut theorem, or the running-time bound.

Only the elementary cut facts named below are proved here. The module
uses integer weights and DOES NOT yet impose skew-symmetry.
-/

namespace Westfall022

variable {n : ℕ}

/-- All ordered vertex pairs from outside S into S. -/
def crossingPairs (S : Finset (Fin n)) : Finset (Fin n × Fin n) :=
  (Finset.univ.filter (fun w => w ∉ S)).product
    (Finset.univ.filter (fun u => u ∈ S))

/-- Discovery 022's weak-majority cut; zero margins count as arcs. -/
def weakCut (A : Fin n → Fin n → ℤ) (S : Finset (Fin n)) : ℕ :=
  ((crossingPairs S).filter (fun p => 0 ≤ A p.1 p.2)).card

def IsKCut (A : Fin n → Fin n → ℤ) (k : ℕ)
    (S : Finset (Fin n)) : Prop :=
  weakCut A S ≤ k

theorem weakCut_le_crossingPairs
    (A : Fin n → Fin n → ℤ) (S : Finset (Fin n)) :
    weakCut A S ≤ (crossingPairs S).card := by
  unfold weakCut
  exact Finset.card_le_card (Finset.filter_subset _ _)

theorem weakCut_empty (A : Fin n → Fin n → ℤ) :
    weakCut A (∅ : Finset (Fin n)) = 0 := by
  simp [weakCut, crossingPairs]

theorem weakCut_univ (A : Fin n → Fin n → ℤ) :
    weakCut A (Finset.univ : Finset (Fin n)) = 0 := by
  simp [weakCut, crossingPairs]

theorem isKCut_of_crossing_bound
    (A : Fin n → Fin n → ℤ)
    (S : Finset (Fin n)) (k : ℕ)
    (h : (crossingPairs S).card ≤ k) :
    IsKCut A k S := by
  unfold IsKCut
  exact (weakCut_le_crossingPairs A S).trans h

theorem empty_isKCut (A : Fin n → Fin n → ℤ) (k : ℕ) :
    IsKCut A k (∅ : Finset (Fin n)) := by
  simp [IsKCut, weakCut_empty]

theorem univ_isKCut (A : Fin n → Fin n → ℤ) (k : ℕ) :
    IsKCut A k (Finset.univ : Finset (Fin n)) := by
  simp [IsKCut, weakCut_univ]

#print axioms Westfall022.weakCut_le_crossingPairs
#print axioms Westfall022.weakCut_empty
#print axioms Westfall022.weakCut_univ
#print axioms Westfall022.isKCut_of_crossing_bound
#print axioms Westfall022.empty_isKCut
#print axioms Westfall022.univ_isKCut

end Westfall022
