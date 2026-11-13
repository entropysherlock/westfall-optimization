# Mission 024 — Final report

**Branch:** `formal/westfall-theorem`. Not merged to `main`; website and public theorem untouched.
**Baseline preserved:** the seven flagship proofs (commit `4c6103b`) and the Mission 023 modules are unchanged. Mission 024 adds new modules only (`PartitionGrowth`, `MemoizedAutoCut`, `PartitionCountDP`), plus updated `Main.lean`, the `lakefile.toml` test targets and documentation.

## What was established (kernel-checked, standard axioms only)

### 1. The partition-function barrier is removed (Challenge 3) — `PartitionGrowth.lean`
- `partition_card_le_exp : p(M) ≤ e^{3√M}` for every M.
- `Pcum_le_exp : P(M) ≤ (M+1)·e^{3√M}`.
- Closed forms: `partition_card_le_two_pow : p(M) ≤ 2^{5(⌊√M⌋+1)}` and `Pcum_le_two_pow`.

Every analytic step is proved from Mathlib:
- finite generating-function domination via multiplicity vectors;
- the series −log(1−y) = Σ y^m/m;
- the swap of a finite sum with a series;
- 1 − x^m ≥ m·x^{m−1}(1−x);
- Σ 1/m² ≤ 2 by telescoping;
- the choice x = √M/(1+√M).

The constant 3 is larger than the sharp π√(2/3) ≈ 2.565 but keeps the 2^{O(√M)} growth. Consequently **(n+1)·P(6λ)² ≤ (n+1)·(6λ+1)²·e^{6√(6λ)} = poly(n, λ)·2^{O(√λ)}** is now a proved inequality. Only the operation-count link to the program is missing.

### 2. The abort test no longer needs P(3k) (Challenge 4) — `PartitionCountDP.lean`
- **New threshold:** U(n,k) = (n+1)(3k+1)·2^{5(⌊√(3k)⌋+1)} ≥ (n+1)·P(3k) (`Pcum_le_abortBound`).
- **Capped generation:** `capLayers` generates layers with a running count and stops as soon as the count exceeds U. `capLayers_none_iff` proves it decides |𝒞_k| > U exactly.
- **No behaviour change** (`recognizeM_eq`): the replacement test changes no decision. On rounds with (n+1)P(3k) < |𝒞_k| ≤ U, acceptance would force λ ≤ k and hence |𝒞_k| ≤ (n+1)P(3k), so both versions reject.

### 3. Recursion explosion eliminated, with exact refinement (Challenge 1) — `MemoizedAutoCut.lean`
- `dpTab` and `distTab` are bottom-up tables with one entry per state (`dpTab_card_le`, `distTab_card_le`).
- `lookup_dpTab`, `distTab_inv`, `extractM_eq` and `dpOrderM_eq` prove every memoised value equals the verified recursive one.
- **`autoCutM_eq : autoCutM A = autoCutX A` for every matrix.** So `autoCutM_correct` carries all guarantees: value = OPT, an optimal ordering, a partition attaining λ(A), λ(A) ≤ k, (k = 1 or k < 2λ), and the same round and value as the specification.
- **Mechanical audit** (`tests/oracle_audit_log_024.txt`): the definition closure of `autoCutM` contains none of `dist`, `cutDP`, `Pcum`, `Nat.Partition`, `lam`, `OPT`, `objective`, `IsOptimal`, `Classical.choose`/`choice` or `Nat.find`.

## What was NOT established

- **`autoCut_complexity`** (Challenge 5): **not proved, and deliberately absent.**
- **No `CostModel.lean`.** The memoised program is not written in an instrumented cost semantics, so no theorem links its operation count to (n+1)·P(6λ)². I did not create a cost function separate from the program.
- **No bit-complexity bound** for the rationals in `dist` sums (Challenge 4B). My expectation, unproved, is that path sums have denominators dividing products of O(n²) input denominators and thresholds, so bit size stays polynomial in n and the input length.
- **Memory bound:** only structural (table sizes); no formal memory model.

## Adversarial benchmark (Challenge 6) — measured, not extrapolated

**Setup.** Native binaries; both runs concurrently, one per core.
- Same 77 inputs as Mission 023 (seed 23023), plus 42 extended instances (seed 24024): n = 6, 7; random, ties/zeros, near-transitive, planted, blocks, all-equal thresholds, the all-zero matrix (maximum reachable cuts), band, and H₄/H₅.
- Exhaustive exact oracle for every completed instance.
- Raw data: `tests/memo_raw.txt`, `tests/unmemo_raw.txt`, `*.meta`; comparison: `tests/memo_comparison.json`, `tests/memo_summary.json`.

| | memoised `autoCutM` | unmemoised `autoCutX` |
|---|---|---|
| Mission 023 suite (77) completed | **77 / 77, all PASS** | 60 / 77 (the n = 5 instances never finish) |
| Identical outputs where both finished | 60 / 60 | — |
| Max time, n = 4 | 16.6 s | 94.7 s |
| Max time, n = 5 | 210.7 s (32 reachable cuts) | not completed |
| Extended n = 6, 7 suite (42) | **6 / 42 completed, 6 / 6 PASS** (instances 77–82, n = 6; 8.7 s – 1197 s; up to 64 reachable cuts). The other 36 (rest of n = 6, all n = 7, H₆, H₇) were not reached within the 3600 s limit. | not run (budget exhausted on the n = 5 instance at 1500 s) |
| **Total** | **83 / 119 completed, 83 / 83 PASS, 0 failures** | 60 / 119 completed |
| Peak RSS | 76.8 MB | 80.8 MB |

**Interpretation.**
- Memoisation removes the chain explosion: all n = 5 instances now finish.
- The constants are very poor. Helper sets (`reachable`, `nodes`, `preds`) are recomputed per query, and candidate values several times per round, across up to (n² + 1)(⌊√k⌋ + 1) threshold/block-cap pairs.
- This is polynomial overhead per state, consistent with poly(n)·N², but it makes n ≥ 6 impractical in this implementation. An efficient implementation must hoist these computations out of the loops.

## Hostile-referee hypotheses

| | Verdict |
|---|---|
| **H1** each state evaluated polynomially often | **PARTIAL.** DP and shortest-path states are stored once (proved). Helper sets are recomputed per query: polynomial, but not formally bounded. |
| **H2** reachable enumeration bounded, including failed rounds | **STRUCTURALLY YES, NOT FORMALLY COSTED.** Capped generation stops above U; after a passed guard all families have ≤ U members. |
| **H3** rational and zero-margin cases | **YES.** Proofs cover all rational skew inputs; tie/zero instances pass the exact oracle. |
| **H4** P(3k) evaluation | **YES.** `autoCutM` never evaluates `Pcum` or `Nat.Partition` (audit). |
| **H5** rational bit-length | **NOT VERIFIED.** No formal bound. |
| **H6** all doubling rounds counted | **STRUCTURALLY.** At most 2n + 1 rounds, each guarded by U(n, k). Not formally costed. |
| **H7** bound applies to the actual executable, including tie-breaks | Correctness: **yes** (identical outputs). Runtime: **no** runtime theorem. |
| **H8** no oracle | **YES** (mechanical audit). |

## Is the manuscript's bound false?

No counterexample was found. The mathematics now supports it as follows:
- state counts ≤ (n+1)·P(3k) (`cut_count_bound`);
- k < 2λ (`autoCut_correct`);
- P(M) ≤ (M+1)e^{3√M} (proved).

The remaining gap is **engineering plus semantics**: an implementation with hoisted helper computations, written in an instrumented cost model, with a bit-size lemma. The manuscript's O(n⁶·√k·N²) count for recovery should be restated once a concrete implementation is costed.

## Reproduce

```bash
cd lean && lake build && lake build Westfall022.Main      # axiom audit (55 declarations)
lake env lean tests/OracleAudit.lean                       # definition-closure audit
python tests/gen_memo_tests.py                             # identical inputs, seeds 23023 / 24024
lake build westfall-memo-bench westfall-unmemo-bench
python tests/run_with_rss.py .lake/build/bin/westfall-memo-bench tests/memo_raw.txt 3600
python tests/run_with_rss.py .lake/build/bin/westfall-unmemo-bench tests/unmemo_raw.txt 1500
python tests/check_memo_results.py
```
