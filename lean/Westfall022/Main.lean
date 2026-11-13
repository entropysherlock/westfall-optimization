import Westfall022.Counting

/-!
# Westfall Discovery 022 — formalization entry point

Flagship declarations available here (all in namespace `Westfall022`, no `sorry`, no axioms
beyond Lean's standard `propext`, `Classical.choice`, `Quot.sound`):

| Flagship name                    | Status |
|----------------------------------|--------|
| `k0_exchange_localization`       | proved (Discovery 021, Theorem 1) |
| `optimal_prefix_width_bound`     | proved (Discovery 022, Theorem 1(1)) |
| `cut_count_bound`                | proved (Discovery 022, Lemma 2, via 019 Theorem A) |
| `partition_recovery_sound`       | NOT PRESENT — blocked, see `lean/FORMALIZATION_STATUS.md` |
| `partition_recovery_complete`    | NOT PRESENT — blocked |
| `partition_recovery_minimal`     | NOT PRESENT — blocked |
| `autoCut_correct`                | NOT PRESENT — blocked |
| `autoCut_complexity`             | NOT PRESENT — blocked |

Blocked names are deliberately absent rather than stated with assumed hypotheses.
-/

namespace Westfall022

-- Stage A: definitions and the finite-threshold equivalence
#print axioms K0_spec
#print axioms Nneg_add_zero_le_K0
-- Stage B: structure
#print axioms sort_exchange_identity
#print axioms rev_weight_balance
#print axioms k0_exchange_localization
#print axioms lemma1_arith
#print axioms I_eq_sum
#print axioms sameBlockCut_le
#print axioms prefix_cut_le_lamB
#print axioms optimal_prefix_width_bound
#print axioms blocksBelow_cut_le
#print axioms blocksBelow_union_cut_le
-- counting
#print axioms card_fixed_size_inv_le
#print axioms card_cutInv_le
#print axioms cut_count_bound

end Westfall022
