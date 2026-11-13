# Mission 023 — Independent semantic audit of the seven verified declarations

**Baseline:** `formal/westfall-theorem` @ `4c6103b5ef12a54e96d8c9ef98fa12058fb2eaa2`. The seven proofs and their files were not modified in Mission 023. New work is confined to `Exec.lean` and `Complexity.lean`, which import the baseline.

**Method.**
- Exact kernel types were printed with `#check` (`pp.proofs true`).
- Each was translated literally and compared with the manuscript, `research/discovery-022/WESTFALL_Discovery_022_Report.md` (Sections B–C) and Discovery 021.
- Definition closures were checked mechanically for oracles (`tests/OracleAudit.lean`, log `tests/oracle_audit_log.txt`).
- Modelling choices were tested exactly on small instances (`tests/model_checks.py`).

## 1. Definitions

| Concept | Lean | Manuscript | Verdict |
|---|---|---|---|
| Weights | `WMat n = Fin n → Fin n → ℚ`, hypothesis `IsSkew A : ∀ u v, A u v = -A v u` | real skew-symmetric matrix | Rational instead of real: the manuscript's algorithm and certificates are rational/exact. Skew forces a zero diagonal. **Equivalent for the algorithmic claims; real inputs are out of scope.** |
| Objective | `objective A π = Σ_r Σ_s [r<s] A (π r) (π s)`, `π : Perm (Fin n)` position→vertex | F_A(π) = Σ_{r<s} a_{π_r π_s} | exact |
| OPT | `sup'` of `objective` over all permutations | max_π F_A(π) | exact (a definition, never used by the algorithm) |
| Ordered partition | `OrdPart n = Fin n → Fin n` (block index) | (B₁,…,B_m), blocks ordered by index | Reformulation. Empty indices change no parameter; λ agrees with the minimum over genuine ordered partitions on 250/250 random instances (`model_checks.py` M1). |
| b, N⁻, z, X, Z(τ) | `bmax`, `Nneg`, `zeroCount`, `Xneg`, `Zthr`, over oriented cross pairs `B u < B v` with c = A u v | same | exact |
| K₀ | `fold min valInf valFin` over the positive cross margins | min over τ ∈ (0,∞] of N⁻ + Z(τ) + ⌊X/τ⌋, with Z(∞) = #{c ≥ 0} and ⌊X/∞⌋ = 0 | **Proved equivalent** (`K0_spec`: attained, and ≤ the value at ∞ and at every τ > 0). Dense-grid check M2: 176,155/176,155. |
| λ(A) | `inf'` of b² + 3K₀ over all `OrdPart n` | min_𝓑 (b² + 3K₀) | exact (a definition; see §3 for its non-use by the algorithm) |
| Weak-majority cut | #{(w,u) : w ∉ S, u ∈ S, 0 ≤ A w u} | zero margins counted as arcs | exact (zero margins counted; w = u excluded automatically) |
| Prefixes | `prefixSet π t = {v : π⁻¹ v < t}`, all t : ℕ | prefixes of π | exact (t > n gives V) |
| ∞ threshold | `none : Option ℚ`, `phi none ≡ 1` | φ_∞ ≡ 1 | exact |
| Empty instance n = 0 | handled; λ = 0 | manuscript claims 1 ≤ λ(A) | manuscript erratum E1 (n = 0 only) |
| Ties | `Classical.choose` minimiser (specification); colex / least index / lexicographic key (executable) | unspecified | the specification theorems hold for every tie-break |

## 2. The seven flagship declarations

**1. `k0_exchange_localization`** — **EXACT MATCH** (to 021 Theorem 1, parts 2–3).
- *Lean:* ∀ A skew, ∀ 𝓑, ∀ π optimal, ∀ t: `cutInv 𝓑 (prefix_t π) ≤ |Rev_𝓑(π)| ∧ |Rev_𝓑(π)| ≤ K₀(𝓑)`.
- *Mathematics:* for every ordered partition and every optimal ordering, I_𝓑(S) ≤ R_𝓑(π\*) ≤ K₀(𝓑) for every prefix S.
- *Notes:*
  - `cutInv` is the pair-count form; `I_eq_sum` proves it equals Σ_{i<j} |B_i∖S||B_j∩S|.
  - Part 1 (weight balance) is the separate theorem `rev_weight_balance`.
  - Part 4 (K₀ ≤ K₀₁₉) is **not formalized**; it is not a flagship claim.

**2. `optimal_prefix_width_bound`** — **EXACT MATCH** (to 022 Theorem 1(1)).
- *Lean:* ∀ A skew, ∀ π optimal, ∀ t: `weakMajorityCut A (prefix_t π) ≤ λ(A)`.
- *Mathematics:* every prefix of every optimal ordering has weak cut ≤ λ(A), i.e. ω(A) ≤ λ(A).
- *Notes:* the per-partition bound λ(𝓑) is `prefix_cut_le_lamB`.

**3. `cut_count_bound`** — **EQUIVALENT WITH EXPLAINED REFORMULATION** (to 022 Lemma 2).
- *Lean:* ∀ A, ∀ k, λ(A) ≤ k → (∃ 𝓑, λ(𝓑) = λ(A) ∧ ∀ S, cut(S) ≤ k → I_𝓑(S) ≤ k + K₀(𝓑)) ∧ #{S : cut(S) ≤ k} ≤ (n+1)·P(3k).
- *Notes:*
  - Part (i) is stated existentially, matching the manuscript's "for a minimising 𝓑\*". The stronger universal form, for every 𝓑 and with no skew hypothesis, is `cutInv_le_of_kcut`.
  - Part (ii) counts **all** k-cuts, exactly as the manuscript does.
  - P is Σ_{j≤M} `Fintype.card (Nat.Partition j)`, which is exactly the cumulative partition function.

**4. `partition_recovery_sound`** — **EQUIVALENT WITH EXPLAINED REFORMULATION** (to 022 Theorem 3, soundness).
- *Lean:* ∀ A, k, 𝓑: `recognize A k = some 𝓑 → λ(𝓑) ≤ k ∧ λ(A) ≤ k`.
- *Notes:*
  - The decision "λ(A) ≤ k?" is encoded as `Option`.
  - The manuscript's "every reported value is ≥ λ(A)" is `lam_le_recogVal`.
  - No skew hypothesis is needed, so this is slightly **stronger** in that respect.

**5. `partition_recovery_complete`** — **EQUIVALENT WITH EXPLAINED REFORMULATION** (to 022 Theorem 3, completeness).
- *Lean:* ∀ A skew, k: λ(A) ≤ k → ∃ 𝓑, `recognize A k = some 𝓑`.
- *Notes:* this includes the Stage 1 abort rule, whose safety rests on `cut_count_bound`.

**6. `partition_recovery_minimal`** — **EQUIVALENT WITH EXPLAINED REFORMULATION** (to 022 Theorem 3, "returns a partition attaining λ(A)").
- *Lean:* ∀ A skew, k, 𝓑: `recognize A k = some 𝓑 → λ(𝓑) = λ(A)`.
- *Notes:* the manuscript's procedure uses b ≤ ⌊√k⌋; the Lean version also tries b = 0, which never yields a path to a nonempty V.

**7. `autoCut_correct`** — **EQUIVALENT WITH EXPLAINED REFORMULATION** (to 022 Theorem 4, correctness).
- *Lean:* ∀ A, ∀ hA : skew, with r = `autoCut A hA`: r.value = OPT ∧ objective(r.order) = OPT ∧ λ(r.partition) = λ(A) ∧ λ(A) ≤ r.k ∧ (r.k = 1 ∨ r.k < 2λ(A)).
- *Notes:*
  - (a) The manuscript's "stops at some k < 2λ(A)" is false when λ(A) = 0 (n = 0). The disjunct `k = 1` handles that case, and for λ ≥ 1 the two statements coincide.
  - (b) λ(A) itself is returned implicitly, as λ(r.partition).
  - (c) The specification `autoCut` takes the skew proof `hA`, used only to define the stopping round through `Nat.find`. The executable `autoCutX` (Mission 023) takes no proof argument and is proved to stop at the same round (`autoCutX_correct`).

**No declaration is WEAKER THAN MANUSCRIPT, INCORRECTLY MODELED or UNRESOLVED.**

## 3. Oracle and shortcut audit (mechanical)

`tests/OracleAudit.lean` computes the transitive closure of constants reachable through **definition bodies** (proofs carry no computational content and are not followed), then searches it for `lam`, `lamB`, `OPT`, `objective`, `IsOptimal`, the specification selectors and `Classical.choose` / `Classical.choice` / `Nat.find`. Log: `tests/oracle_audit_log.txt`.

| Root | Forbidden constants reachable |
|---|---|
| `recognize` (specification) | `argPred`, `bestCand`, `Classical.choose`, `Classical.choice`: the tie-break selectors only |
| `recognizeX` (executable) | **none** |
| `autoCutX` (executable) | **none** |

So neither the specification nor the executable obtains the minimising partition from λ, OPT, an assumed witness or an enumeration of partitions. The only enumeration is of thresholds (`tauSet`, at most n² + 1 values) and block caps (b ≤ ⌊√k⌋ + 1 values), as in the manuscript.

## 4. Axioms and dependencies

Every audited declaration depends only on `propext`, `Classical.choice`, `Quot.sound` (`#print axioms` in `Main.lean`; the GitHub `lean-action` axiom audit uses the same allow-list).
- `Classical.choice` enters **proofs** (classical logic in Mathlib).
- In the baseline it also enters the **specification's** tie-breaks.
- It enters **no** executable definition.

## 5. Conclusion

**Semantic correspondence: PASS**, with the documented reformulations:
- block-index partitions;
- rational weights;
- `Option`-encoded decisions;
- the extra b = 0 candidate;
- the n = 0 erratum.

No substantive discrepancy was found.
