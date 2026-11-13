import Westfall022.Prelude

/-!
# Discovery 021–022: exact definitions (Stage A)

Faithful to `research/discovery-022/WESTFALL_Discovery_022_Report.md`, Section B, and
`research/discovery-021` (definition of `K₀`).

Modelling conventions (each checked against the exact Python reference in `lean/tests/`):

* Weights are rational: `A : Fin n → Fin n → ℚ`; skew-symmetry is the hypothesis `IsSkew A`.
* An ordering is a permutation `π : Equiv.Perm (Fin n)` read as *position ↦ vertex*,
  so `F_A(π) = Σ_{r<s} a_{π r, π s}` is `objective A π` literally.
* An ordered partition `(B₁, …, B_m)` is recorded by its block-index function
  `B : Fin n → Fin n` (vertex `v` lies in block number `B v`; blocks are ordered by index).
  Every ordered partition of `Fin n` has `m ≤ n` blocks and so arises this way; conversely
  empty indices do not change any parameter (`b`, `N⁻`, `z`, `X`, `Z(τ)`, `K₀` depend only
  on the relations `B u < B v` and `B u = B v`). Check M1 in `tests/model_checks.py`
  confirms `λ` agrees with the minimum over genuine ordered partitions for all `n ≤ 5`.
* Thresholds `τ ∈ (0, ∞]`: the manuscript's minimum over all thresholds is the finite
  minimum `K0` below; the equivalence is the theorem `K0_spec` (Section `Thresholds`).

These names are distinct from those in `Westfall022.Foundations` (integer weights), so both
modules can be imported together.
-/

namespace Westfall022

open Finset

variable {n : ℕ}

/-- A rational weight matrix on `n` vertices. -/
abbrev WMat (n : ℕ) := Fin n → Fin n → ℚ

/-- Skew-symmetry `a_uv = -a_vu`. -/
def IsSkew (A : WMat n) : Prop := ∀ u v, A u v = -A v u

/-- The weighted ordering objective `F_A(π) = Σ_{r<s} a_{π_r π_s}` (`π` maps positions to vertices). -/
def objective (A : WMat n) (π : Equiv.Perm (Fin n)) : ℚ :=
  ∑ r : Fin n, ∑ s : Fin n, if r < s then A (π r) (π s) else 0

/-- The exact optimum `OPT(A) = max_π F_A(π)` (a maximum over the finite set of permutations). -/
def OPT (A : WMat n) : ℚ :=
  (Finset.univ : Finset (Equiv.Perm (Fin n))).sup' Finset.univ_nonempty (objective A)

/-- `π` is an optimal ordering. -/
def IsOptimal (A : WMat n) (π : Equiv.Perm (Fin n)) : Prop := objective A π = OPT A

theorem objective_le_OPT (A : WMat n) (σ : Equiv.Perm (Fin n)) : objective A σ ≤ OPT A :=
  Finset.le_sup' (objective A) (Finset.mem_univ σ)

theorem exists_optimal (A : WMat n) : ∃ π, IsOptimal A π := by
  obtain ⟨π, -, h⟩ := Finset.exists_mem_eq_sup' (Finset.univ_nonempty (α := Equiv.Perm (Fin n)))
    (objective A)
  exact ⟨π, h.symm⟩

theorem isOptimal_iff (A : WMat n) (π : Equiv.Perm (Fin n)) :
    IsOptimal A π ↔ ∀ σ, objective A σ ≤ objective A π := by
  constructor
  · intro h σ; rw [h]; exact objective_le_OPT A σ
  · intro h
    apply le_antisymm (objective_le_OPT A π)
    exact Finset.sup'_le _ _ (fun σ _ => h σ)

/-! ## Ordered partitions and their parameters -/

/-- An ordered partition, as a block-index function (see the module docstring). -/
abbrev OrdPart (n : ℕ) := Fin n → Fin n

/-- Block number `k`. -/
def block (B : OrdPart n) (k : Fin n) : Finset (Fin n) := univ.filter (fun v => B v = k)

/-- `b(𝓑)`: the maximum block size. -/
def bmax (B : OrdPart n) : ℕ := univ.sup (fun k => (block B k).card)

/-- Oriented cross-block pairs `(u, v)` with `blk u < blk v`; their margin is `c_uv = a_uv`. -/
def crossPairs (B : OrdPart n) : Finset (Fin n × Fin n) := univ.filter (fun p => B p.1 < B p.2)

/-- `N⁻`: the number of cross pairs with negative margin. -/
def Nneg (A : WMat n) (B : OrdPart n) : ℕ := ((crossPairs B).filter (fun p => A p.1 p.2 < 0)).card

/-- `z`: the number of cross pairs with zero margin. -/
def zeroCount (A : WMat n) (B : OrdPart n) : ℕ :=
  ((crossPairs B).filter (fun p => A p.1 p.2 = 0)).card

/-- `X`: the negative cross mass `Σ max(0, -c_uv)`. -/
def Xneg (A : WMat n) (B : OrdPart n) : ℚ :=
  ∑ p ∈ (crossPairs B).filter (fun p => A p.1 p.2 < 0), -A p.1 p.2

/-- `Z(τ)`: the number of cross pairs with `0 ≤ c < τ`, for a finite threshold `τ`. -/
def Zthr (A : WMat n) (B : OrdPart n) (τ : ℚ) : ℕ :=
  ((crossPairs B).filter (fun p => 0 ≤ A p.1 p.2 ∧ A p.1 p.2 < τ)).card

/-- The value `N⁻ + Z(τ) + ⌊X/τ⌋` at a finite threshold `τ > 0`. -/
def valFin (A : WMat n) (B : OrdPart n) (τ : ℚ) : ℕ := Nneg A B + Zthr A B τ + ⌊Xneg A B / τ⌋₊

/-- The value at `τ = ∞`: `Z(∞) = #{c ≥ 0}` and `⌊X/∞⌋ := 0`. -/
def valInf (A : WMat n) (B : OrdPart n) : ℕ :=
  Nneg A B + ((crossPairs B).filter (fun p => 0 ≤ A p.1 p.2)).card

/-- The candidate finite thresholds: the distinct positive cross margins. -/
def thresholds (A : WMat n) (B : OrdPart n) : Finset ℚ :=
  ((crossPairs B).filter (fun p => 0 < A p.1 p.2)).image (fun p => A p.1 p.2)

/-- `K₀(𝓑) = min_{τ ∈ (0,∞]} (N⁻ + Z(τ) + ⌊X/τ⌋)`, computed over the finite candidate set
(`τ = ∞` and the positive cross margins); see `K0_spec` for the equivalence. -/
def K0 (A : WMat n) (B : OrdPart n) : ℕ := (thresholds A B).fold min (valInf A B) (valFin A B)

/-- `λ(𝓑) = b² + 3K₀`. -/
def lamB (A : WMat n) (B : OrdPart n) : ℕ := bmax B ^ 2 + 3 * K0 A B

/-- The robust Condorcet number `λ(A) = min_𝓑 (b² + 3K₀(𝓑))` over all ordered partitions. -/
def lam (A : WMat n) : ℕ :=
  (Finset.univ : Finset (OrdPart n)).inf' ⟨id, Finset.mem_univ _⟩ (lamB A)

theorem lam_le_lamB (A : WMat n) (B : OrdPart n) : lam A ≤ lamB A B :=
  Finset.inf'_le _ (Finset.mem_univ B)

theorem exists_lamB_eq_lam (A : WMat n) : ∃ B, lamB A B = lam A := by
  obtain ⟨B, -, h⟩ := Finset.exists_mem_eq_inf' (⟨id, Finset.mem_univ _⟩ :
    (Finset.univ : Finset (OrdPart n)).Nonempty) (lamB A)
  exact ⟨B, h.symm⟩

/-! ## Cuts, prefixes, inversions -/

/-- Weak-majority cut of `S`: pairs `(w, u)` with `w ∉ S`, `u ∈ S`, `a_wu ≥ 0`
(zero margins are counted, as in Discovery 022). -/
def weakMajorityCut (A : WMat n) (S : Finset (Fin n)) : ℕ :=
  (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ 0 ≤ A p.1 p.2)).card

/-- The set of the first `t` vertices of the ordering `π`. -/
def prefixSet (π : Equiv.Perm (Fin n)) (t : ℕ) : Finset (Fin n) :=
  univ.filter (fun v => ((π.symm v : Fin n) : ℕ) < t)

/-- Cross-block inversions `I_𝓑(S) = Σ_{i<j} |B_i ∖ S| |B_j ∩ S|`, as a count of pairs
(`I_eq_sum` proves the two forms agree). -/
def cutInv (B : OrdPart n) (S : Finset (Fin n)) : ℕ :=
  (univ.filter (fun p : Fin n × Fin n => p.1 ∉ S ∧ p.2 ∈ S ∧ B p.1 < B p.2)).card

/-- `Rev_𝓑(π)`: cross pairs that `π` orders against the block order. -/
def Rev (B : OrdPart n) (π : Equiv.Perm (Fin n)) : Finset (Fin n × Fin n) :=
  (crossPairs B).filter (fun p => π.symm p.2 < π.symm p.1)

/-- Optimal-prefix width: the largest weak-majority cut of a prefix of an optimal ordering. -/
def IsPrefixOfOptimal (A : WMat n) (S : Finset (Fin n)) : Prop :=
  ∃ π t, IsOptimal A π ∧ S = prefixSet π t

end Westfall022
