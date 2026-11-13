# Discovery 021–022 Lean formalization: status and correspondence

> **Mission 024 update.** New, all kernel-checked (55 audited declarations, standard axioms only):
> - `PartitionGrowth.lean`: **p(M) ≤ e^{3√M}** and **P(M) ≤ (M+1)·e^{3√M}**, with every analytic step proved, plus the closed forms p(M) ≤ 2^{5(⌊√M⌋+1)}.
> - `MemoizedAutoCut.lean`: bottom-up DP and shortest-path tables, each memoised value proved equal to the verified recursion.
> - `PartitionCountDP.lean`: an abort test that never evaluates P(3k), with capped layer generation. Proved: `recognizeM = recognizeX` and `autoCutM = autoCutX` (identical outputs).
> - Benchmark (measured): memoised `autoCutM` completed 83 of 119 instances, and all 83 match an exhaustive exact oracle. It completed all 77 Mission 023 instances, plus 6 of the 42 extended n = 6/7 instances within a 3600 s limit. The unmemoised `autoCutX` completed 60 instances with identical outputs.
>
> `autoCut_complexity` is still **not proved**: no cost semantics and no bit-size bound. See `MISSION_024_REPORT.md`.
>
> **Mission 023 update.** The seven proofs are unchanged from commit `4c6103b`. New:
> - `SEMANTIC_AUDIT_023.md` — independent audit. All seven declarations are EXACT MATCH or EQUIVALENT WITH EXPLAINED REFORMULATION; the mechanical oracle audit is clean.
> - `Exec.lean` — a deterministic **executable** recogniser and AutoCut, with **verified refinement** to the specification.
> - `Complexity.lean` — state and round bounds for the executable. `autoCut_complexity` remains **not proved**: the executable is not memoised, so the manuscript's running-time bound does not hold for it, and no cost semantics or partition-number estimate is formalized.
> - `tests/` — native exact comparison of `autoCutX` against an exhaustive reference.

**Toolchain:** Lean 4.32.0, Mathlib `v4.32.0` (pinned in `lean-toolchain` / `lakefile.toml`).
**Entry point:** `import Westfall022.Main`. Root module `Westfall022.lean` imports `Foundations` and `Main`.
**Integrity (Mission 024: 55 audited declarations):** no `sorry`, `admit`, `native_decide`, `implemented_by`, `extern` or user axioms. Every declaration in the audit (`#print axioms`, 55 declarations listed in `Main.lean`) depends only on `propext`, `Classical.choice`, `Quot.sound`.

**Independent checks.**
- A local kernel build was run against a source-built slice of Mathlib.
- The repository's *Lean Foundations* GitHub workflow (full Mathlib cache, `lean-action` axiom audit) was run on branch `formal/westfall-theorem`. See the run links in the final report, and the latest workflow conclusion before citing.

## Flagship declarations

| Lean name | Status | Manuscript statement (Discovery 022 report unless noted) |
|---|---|---|
| `k0_exchange_localization` | **proved** | 021 Thm 1 (2)–(3): for every ordered partition 𝓑, every optimal π\*, every prefix S: I_𝓑(S) ≤ R_𝓑(π\*) ≤ K₀(𝓑). Part (1) is `rev_weight_balance`. |
| `optimal_prefix_width_bound` | **proved** | Thm 1(1): every prefix of every optimal ordering has cut_A(S) ≤ λ(A), i.e. ω(A) ≤ λ(A). The per-partition form λ(𝓑) is `prefix_cut_le_lamB`. Thm 1(2), (3) are `blocksBelow_cut_le`, `blocksBelow_union_cut_le`. |
| `cut_count_bound` | **proved** | Lemma 2: if λ(A) ≤ k, then (i) for a minimising 𝓑\*, every k-cut S has I_{𝓑\*}(S) ≤ k + K₀(𝓑\*); (ii) #k-cuts ≤ (n+1)·P(3k). Uses 019 Thm A (`card_cutInv_le`), proved here from scratch. |
| `partition_recovery_sound` | **proved** | Thm 3, soundness: if the procedure accepts with 𝓑̂, then λ(𝓑̂) ≤ k (hence λ(A) ≤ k). Reported values are always ≥ λ(A) (`lam_le_recogVal`). |
| `partition_recovery_complete` | **proved** | Thm 3, completeness: λ(A) ≤ k ⇒ the procedure accepts (including the Stage 1 abort rule). |
| `partition_recovery_minimal` | **proved** | Thm 3: the returned partition attains the global minimum, λ(𝓑̂) = λ(A). |
| `autoCut_correct` | **proved** | Thm 4, correctness: AutoCut returns OPT(A), an ordering attaining it, a partition attaining λ(A), and a threshold k with λ(A) ≤ k and (k = 1 or k < 2λ(A)). |
| `autoCut_complexity` | **BLOCKED — not present** | Thm 4 running time poly(n)·P(6λ)² ≤ poly(n)·2^{O(√λ)}; Thm 3 time O(n⁶√k·N²). |

## Mission 023: executable implementation and refinement

| Lean name | Statement |
|---|---|
| `recognizeX`, `autoCutX` | Deterministic executable code. Ties: colex-least set, least vertex, lexicographic (τ, b). Doubling loop bounded by 2n + 1 rounds. Abort test short-circuited by P(M) ≥ M + 1 (`pcumGuard_iff`). |
| `recognizeX_isSome` | `(recognizeX A k).isSome = (recognize A k).isSome`: same decisions as the specification |
| `partition_recoveryX_sound/complete/minimal` | Theorem 3's guarantees for the executable recogniser |
| `autoCutX_correct` | ∀ skew A, `autoCutX A = some r` with value = OPT, ordering attaining OPT, λ(partition) = λ(A), λ(A) ≤ k, (k = 1 ∨ k < 2λ), and the same round and value as `autoCut` |
| `autoCutX_state_bounds` | accepting-round state counts ≤ (n+1)·P(3k), ≤ (n+1)·P(6λ) for λ ≥ 1, k ≤ 4ⁿ |

## Mission 024: memoised implementation, partition growth, abort test

| Lean name | Statement |
|---|---|
| `partition_card_le_exp` | p(M) ≤ e^{3√M} for all M (constant 3 instead of the sharp π√(2/3)) |
| `Pcum_le_exp`, `Pcum_le_two_pow` | P(M) ≤ (M+1)·e^{3√M}; P(M) ≤ (M+1)·2^{5(⌊√M⌋+1)} |
| `lookup_dpTab`, `cutDPM_eq` | memoised DP table entries equal `cutDP`; f_k(V) from the table equals `cutDP A k V` |
| `distTab_inv`, `distM_eq` | memoised shortest-path table entries equal `dist`; every node is present once |
| `extractM_eq`, `dpOrderM_eq` | memoised path and ordering extraction equal the executable ones |
| `capLayers_none_iff` | capped layer generation stops iff \|𝒞_k\| > U(n,k) |
| `recognizeM_eq`, `autoCutM_eq` | memoised recogniser and AutoCut return **exactly** the outputs of `recognizeX` / `autoCutX` |
| `autoCutM_correct` | all guarantees of `autoCutX_correct` for the memoised algorithm |
| `dpTab_card_le`, `distTab_card_le` | each state is stored once (table size ≤ layer size; ≤ \|𝒩\| + 1) |

## Why `autoCut_complexity` is blocked

0. *(Resolved structurally in Mission 024.)* The memoised implementation (`autoCutM`) removes the chain explosion and provably equals `autoCutX`. But its helper sets (`reachable`, `nodes`, `preds`) are recomputed per query: polynomial overhead, not formally bounded.
0′. **Original Mission 023 finding:** the executable does not have the claimed running time. `dist` and `cutDP` are evaluated as plain recursions without memoisation, so evaluation cost grows with the number of chains in the node DAG, not with the number of nodes. A faithful complexity theorem needs a memoised, layer-by-layer implementation with its own refinement proof.
1. **No operational cost model.** The algorithm is formalized as mathematical (noncomputable) definitions. A faithful runtime theorem needs the same program written in an instrumented model, for example a tick-counting monad over a fixed set of primitive operations. It must then state both:
   - arithmetic-operation counts over ℚ;
   - separately, bit complexity, since rational sizes grow along shortest-path sums.

   Writing a cost function beside the specification would not certify the algorithm's actual cost.
2. **The analytic partition bound is not in Mathlib.** The step P(M) ≤ (M+1)·e^{π√(2M/3)} needs p(M) ≤ e^{π√(2M/3)}. Its elementary proof (via the generating function) is a separate formalization project.
3. **What is proved instead:** `autoCut_state_bounds`. In the accepting round, |𝒞_k| and |𝒩| are ≤ (n+1)·P(3k), k ≤ max(1, 2λ(A)), and hence |𝒞_k| ≤ (n+1)·P(6λ(A)) for λ ≥ 1. These are the combinatorial facts the runtime claim rests on, and they are **not** a runtime theorem.

## Faithfulness notes (hostile-referee audit)

- **Ordered partitions** are block-index functions `B : Fin n → Fin n`. Empty indices change no parameter. `tests/model_checks.py` (M1) confirms λ agrees with the minimum over genuine ordered partitions for every n ≤ 5 instance tested.
- **K₀ thresholds.** `K0` takes the minimum over τ = ∞ and the positive cross margins. `K0_spec` proves this equals the manuscript's minimum over all τ ∈ (0, ∞], including the τ = ∞ conventions.
- **The procedure is not enumeration.**
  - `recognize` generates 𝒞_k layer by layer (`reachLayer`), applies the abort rule, and restricts to the nodes 𝒩.
  - It runs the Bellman recursion `dist` over pairs of nodes, for τ ∈ {∞} ∪ {positive entries of A} and b ≤ ⌊√k⌋. It also tries b = 0, which is harmless.
  - It reads the partition off minimising predecessors (`extract`).
  - No ordered partition is ever enumerated. The definition of λ(A) itself is a minimum over all partitions, as in the manuscript, but the algorithm does not use it.
- **Not executable.** Tie-breaks between equal minimisers use `Classical.choose` (the manuscript fixes none), and the doubling schedule uses `Nat.find`. These are faithful mathematical definitions, not extracted executable code.
- **`autoCut` takes the proof `hA : IsSkew A`.** It is only needed to show that some round accepts (termination); no computation depends on it.
- **Weights** are rational. Skew-symmetry is a hypothesis wherever the manuscript uses it. `partition_recovery_sound` and `cutDP_le_OPT` hold without it.

## Manuscript errata found during formalization

- **E1 (minor, n = 0).** "Always 1 ≤ λ(A) ≤ n²" fails for n = 0: λ = 0. Likewise "the loop stops at some k < 2λ(A)" fails only when λ(A) = 0 (then k = 1). The Lean statement uses `k = 1 ∨ k < 2λ(A)`.
- No gap was found in Theorems 1, 3, 4 (correctness), Lemma 2, or 019 Lemma 1 / Theorem A.

## Files

| File | Content |
|---|---|
| `Prelude.lean` | Mathlib imports (a slice; builds without the full library) |
| `Defs.lean`, `Thresholds.lean` | Stage A definitions; `K0_spec` |
| `Exchange.lean` | stable-sort exchange identity; `k0_exchange_localization` |
| `Lemma1.lean` | 019 Lemma 1; block decomposition `I_eq_sum` |
| `PrefixWidth.lean` | 022 Theorem 1 (1)–(3) |
| `Counting.lean` | 019 Theorem A via gap multisets → integer partitions; `cut_count_bound` |
| `CutDP.lean` | restricted cut DP; `cutDP_exact` |
| `Recovery.lean`, `RecoveryThm.lean` | Theorem 3 procedure and its three theorems |
| `AutoCut.lean` | Theorem 4 procedure, `autoCut_correct`, `autoCut_state_bounds` |
| `Main.lean` | entry point and axiom audit |
| `tests/model_checks.py` | exact small-instance checks of the modelling choices |

## Reproduce

```bash
cd lean
lake update && lake exe cache get   # or build the Mathlib slice from source
lake build Westfall022.Main         # prints the axiom audit
lake build                          # whole library incl. Foundations (needs full Mathlib)
python tests/model_checks.py        # exact modelling checks (n <= 5)
```
