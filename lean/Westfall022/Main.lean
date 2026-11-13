import Westfall022.AutoCut
import Westfall022.Exec
import Westfall022.Complexity
import Westfall022.PartitionCountDP

/-!
# Westfall Discovery 022 — formalization entry point

All declarations live in namespace `Westfall022`. No `sorry`, `admit`, `native_decide` or
user axioms; the axiom audit below reports only Lean's standard `propext`,
`Classical.choice`, `Quot.sound`.

| Flagship name                  | Status | Manuscript statement |
|--------------------------------|--------|----------------------|
| `k0_exchange_localization`     | proved | 021 Theorem 1 (2)–(3) |
| `optimal_prefix_width_bound`   | proved | 022 Theorem 1 (1)     |
| `cut_count_bound`              | proved | 022 Lemma 2           |
| `partition_recovery_sound`     | proved | 022 Theorem 3, soundness |
| `partition_recovery_complete`  | proved | 022 Theorem 3, completeness |
| `partition_recovery_minimal`   | proved | 022 Theorem 3, returns a partition attaining `λ(A)` |
| `autoCut_correct`              | proved | 022 Theorem 4, correctness part |
| `autoCut_complexity`           | proved (Mission 025) | 022 Theorem 4, running time `poly(n)·2^{O(√λ)}` in the cost model of `CostModel.lean`. Not the sharper `poly(n)·P(6λ)²`; unit-cost arithmetic |

Mission 023 additions (the seven proofs above are unchanged from commit `4c6103b`):
* `Exec.lean` — deterministic, executable `recognizeX` / `autoCutX` (no `Classical.choose`,
  no `Nat.find`, no proof argument) and refinement theorems `recognizeX_isSome`,
  `partition_recoveryX_sound/complete/minimal`, `autoCutX_correct` (same round and value as
  the specification).
* `Complexity.lean` — `autoCutX_state_bounds` (state counts and rounds only). The running-time
  theorem is not proved; the executable is not memoised and does not have the claimed running
  time.

Mission 024 additions:
* `PartitionGrowth.lean` — `partition_card_le_exp` (`p(M) ≤ e^{3√M}`), `Pcum_le_exp`,
  `partition_card_le_two_pow`, `Pcum_le_two_pow` (all analytic steps proved).
* `MemoizedAutoCut.lean` — bottom-up DP and shortest-path tables (`dpTab`, `distTab`), memoised
  extraction; each memoised value is proved equal to the verified recursive one.
* `PartitionCountDP.lean` — closed-form, capped abort test (never evaluates `P(3k)`),
  `recognizeM_eq : recognizeM = recognizeX`, `autoCutM_eq : autoCutM = autoCutX`,
  `autoCutM_correct`.

Mission 025 additions:
* `CostModel.lean` — the cost monad `Cost`, costed collection operations (per-element charges,
  quadratic deduplication, linear-scan lookups) and their bound lemmas.
* `CostedAutoCut.lean` — the costed program `autoCutCosted`, the executable
  `autoCutC := (autoCutCosted A).val`, and `autoCutC_eq : autoCutC = autoCutM`.
* `CostBounds.lean` — a cost bound for every component and for one full round
  (`recognizeC_cost_le`), covering aborted, rejected and accepted rounds.
* `Complexity.lean` — `autoCut_complexity`.

`autoCut_state_bounds` proves the state-count facts the running-time claim rests on; it is
deliberately not named `autoCut_complexity`.
-/

namespace Westfall022

-- Stage A
#print axioms K0_spec
#print axioms Nneg_add_zero_le_K0
-- Stage B
#print axioms sort_exchange_identity
#print axioms rev_weight_balance
#print axioms k0_exchange_localization
#print axioms lemma1_arith
#print axioms I_eq_sum
#print axioms prefix_cut_le_lamB
#print axioms optimal_prefix_width_bound
#print axioms blocksBelow_cut_le
#print axioms blocksBelow_union_cut_le
#print axioms card_fixed_size_inv_le
#print axioms card_cutInv_le
#print axioms cut_count_bound
-- Stage C
#print axioms extract_spec
#print axioms costPartition_some
#print axioms floor_costPartition_some
#print axioms lam_le_recogVal
#print axioms recogVal_le_lam
#print axioms partition_recovery_sound
#print axioms partition_recovery_complete
#print axioms partition_recovery_minimal
-- Stage D
#print axioms cutDP_le_OPT
#print axioms cutDP_exact
#print axioms cutDP_exact_of_lam_le
#print axioms dpOrder_spec
#print axioms autoCut_correct
-- Stage E (partial; not a running-time theorem)
#print axioms autoCut_state_bounds
-- Mission 023: executable implementation and refinement
#print axioms selMinSet_spec
#print axioms selCand_spec
#print axioms extractX_spec
#print axioms recognizeX_isSome
#print axioms partition_recoveryX_sound
#print axioms partition_recoveryX_complete
#print axioms partition_recoveryX_minimal
#print axioms dpOrderX_spec
#print axioms lam_le_sq
#print axioms autoCutX_correct
#print axioms autoCutX_state_bounds
-- Mission 024
#print axioms partition_card_le_exp
#print axioms Pcum_le_exp
#print axioms partition_card_le_two_pow
#print axioms Pcum_le_two_pow
#print axioms lookup_dpTab
#print axioms cutDPM_eq
#print axioms distTab_inv
#print axioms distM_eq
#print axioms extractM_eq
#print axioms dpOrderM_eq
#print axioms capLayers_none_iff
#print axioms recognizeM_eq
#print axioms autoCutM_eq
#print axioms autoCutM_correct
#print axioms dpTab_card_le
#print axioms distTab_card_le
-- Mission 025
#print axioms autoCutC_eq
#print axioms autoCutC_eq_X
#print axioms recognizeC_val
#print axioms capLayersC_cost_le
#print axioms distTabC_cost_le
#print axioms extractC_cost_le
#print axioms dpTabC_cost_le
#print axioms dpOrderC_cost_le
#print axioms recognizeC_cost_le
#print axioms firstAcceptC_cost_le
#print axioms autoCutCosted_cost_le
#print axioms abortBound_K_le
#print axioms autoCut_complexity

end Westfall022
