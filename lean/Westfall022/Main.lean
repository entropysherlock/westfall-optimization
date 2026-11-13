import Westfall022.AutoCut

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
| `autoCut_complexity`           | **NOT PRESENT — blocked** (see `lean/FORMALIZATION_STATUS.md`) |

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

end Westfall022
