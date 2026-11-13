# Mission 025 — Final report: the running-time theorem

**Branch:** `formal/westfall-theorem`. Not merged to `main`; website and public announcements
untouched.
**Baseline preserved:** the seven flagship proofs and all Mission 023/024 modules are unchanged.
Mission 025 adds new modules only:
- `CostModel.lean`, `CostedAutoCut.lean`, `CostBounds.lean`;
- a rewritten `Complexity.lean` (Mission 023's `autoCutX_state_bounds` is kept verbatim);
- `Main.lean` audit entries;
- `tests/CostedHarness.lean` and `tests/check_costed_results.py`, with raw output in `tests/m025/`.

## 1. The theorem

```lean
theorem Westfall022.autoCut_complexity {n : ℕ} (A : WMat n) (hA : IsSkew A) :
    autoCutC A = autoCutX A ∧
    (autoCutCosted A).val = autoCutC A ∧
    (autoCutCosted A).cost ≤ 1000 * (n + 1) ^ 9 * (abortBound n (max 1 (2 * lam A)) + 1) ^ 3 ∧
    (autoCutCosted A).cost ≤ 1728000 * (n + 1) ^ 18 * 2 ^ (45 * (Nat.sqrt (lam A) + 1))
```

where `abortBound n k = (n+1)(3k+1)·2^{5(⌊√(3k)⌋+1)} ≥ (n+1)·P(3k)`.

**What it says.**
- **Same program.** The executable `autoCutC` is the value projection of the costed program
  `autoCutCosted`. It returns exactly what the verified Mission 023 executable `autoCutX` returns,
  so it inherits `autoCutX_correct`:
  - value = OPT(A);
  - an optimal ordering;
  - a partition attaining λ(A);
  - λ(A) ≤ k, and (k = 1 or k < 2λ).
- **Cost bound.** The counted cost of that same program is at most `poly(n)·2^{O(√λ(A))}`, with
  explicit constants: `q(n) = 1 728 000·(n+1)¹⁸` and `C = 45` in `2^{C(⌊√λ⌋+1)}`.
- **Case `λ(A) = 0`** (only for `n = 0`) is covered by the same statement.
- **λ(A) is used only in the analysis.** The program receives only the matrix. The mechanical
  oracle audit (`tests/oracle_audit_log_025.txt`) finds none of the following in the definition
  closures of `autoCutCosted`, `autoCutC` or `recognizeC`: `lam`, `lamB`, `OPT`, `objective`,
  `Pcum`, `Nat.Partition`, `dist`, `cutDP`, `Classical.choice`/`choose`, `Nat.find`.

**What it does not say.** See §5. In short:
- not the manuscript's sharper `poly(n)·P(6λ)²`;
- no bit complexity;
- no formal memory model.

## 2. The computation model (Challenge 2)

**The cost monad.** `Cost α` is a pair `(val, cost)`; `bind` adds costs. The algorithm is written
once, in this monad. Projecting away the cost gives the executable (`autoCutC := (autoCutCosted
A).val`), so the counted program and the run program are the same term. No cost function is
written beside the algorithm.

**Charged operations.**

| Operation | Charge | Justification |
|---|---|---|
| `cFilter s p` | Σ_{a∈s} (cost(p a) + 1) | one visit per element plus the predicate |
| `cImage E s f` | Σ (cost(f a) + 1) + \|s\|²·E | `Finset.image` deduplicates by pairwise comparison (list-based `Finset`) |
| `cBiUnion E s f` | Σ (cost(f a) + 1) + (Σ\|f a\|)²·E | union with pairwise deduplication |
| `cUnion E s t` | (\|s\|+1)(\|t\|+1)·E | pairwise deduplication |
| `cSup`, `cInf` | Σ (cost(f a) + 1) | one comparison per element |
| `cLookupTop/Bot tab T` | built from `cFilter` + `cInf`/`cSup`: \|tab\|·(setEq+1) + matches | **linear scan**; no `O(1)` lookup is assumed |
| `cSelMinSet`, `cSelMaxV`, `cSelCand` | 2·Σ (cost(f)+1) + (\|s\|+1)²·E | an `inf'` pass and a `filter` pass, each evaluating `f`; `image` with deduplication; `min'` |
| `setEq n` | (n+1)² | equality, subset, or `sdiff`-card on subsets of `Fin n` (list representation) |
| `wmcLeaf n` | 3(n+1)³ | `weakMajorityCut`: filter over n² pairs with two `O(n)` membership tests, plus a size test |
| `edgeLeaf n` | 5(n+1)² | `C' \ C` (≤ n² comparisons), then `edgeCost` (≤ \|C\|·\|Y\| ≤ n²/4 terms of φ_τ, ≤ 5 operations each) |
| `n + 1` | n+1 | `insert`, `erase`, `card`, `gain` (sum of ≤ n entries) |
| `candLeaf n k` | 4(n+1)⁴(k+1) | `candidates`: filter of n² entries, deduplication of ≤ n² rationals, product with `range(⌊√k⌋+1)` |
| `20(k+1)` | — | evaluating `abortBound n k` (unit-cost ℕ arithmetic; `2^m` by `m ≤ 15k+5` products) |
| `j + 1` | — | evaluating `2^j` |
| `(n+1)³ + n + 1` | — | evaluating the extracted labelling (closure chain of depth ≤ n) in `partOf` |
| per extraction or ordering step | (n+1)² | building the label closure, or `extendPerm` and `S.card` |
| single-cell `charge` sites | 1–4 | one rational addition or comparison, or the floor in a candidate value |

**Arithmetic.** Every rational or natural-number addition, comparison, division or floor counts
as one step (unit-cost model). Constant-size control flow (pattern matching, tuple construction,
a single comparison per round) is not charged; there are `O(1)` such steps per charged operation.

**Trust boundary.** The cost model is a *semantics of the algorithm*. The collection-operation
formulas and leaf charges are declared definitions. Each is an upper bound on the list-based
implementation of the corresponding `Finset` operation, but Lean has no operational semantics
for compiled code, so the agreement between these charges and machine time is **not**
machine-checked. Everything downstream of the declarations is kernel-checked. The structure of
the program decides which operations run, how often, and on what sizes.

## 3. How the bound is proved (Challenges 1 and 3)

**The executable (`autoCutC`).** It has the same algorithm as `autoCutM`, re-engineered so that
the per-query recomputations are gone:
- the node set 𝒩 is computed once per round and passed to every predecessor scan, every
  shortest-path table, and the extraction;
- the doubling loop returns the accepted partition directly instead of re-running the accepting
  round.

**Bounds, with `N = n+1`.** Let `V` be any number above every state family of the round
(`V = U + 1` with `U = abortBound n k`).

| Component | Bound | Lemma |
|---|---|---|
| capped layer generation (runs in every round) | ≤ (n+1)·12N⁴V² | `capLayersC_cost_le` |
| 𝒞_k, 𝒩 | ≤ 11N⁶V², 4N³V | `reachableC_cost_le`, `nodesC_cost_le` |
| one shortest-path table | ≤ (n+1)·30N²V³ | `distTabC_cost_le` |
| one candidate value | ≤ 38N³V³ | `candValC_cost_le` |
| all candidates (≤ 2N⁴ of them) | ≤ 80N⁷V³ | `candInf_cost_le` |
| selection | ≤ 170N⁸V³ | `cSelCand_cost_le` |
| extraction | ≤ (n+1)·34N²V² | `extractC_cost_le` |
| **one round** (aborted, rejected or accepted) | **≤ 400N⁸V³** | `recognizeC_cost_le` |
| ordering DP | ≤ (n+1)·20N⁵V², (n+1)·40N⁶V² | `dpTabC_cost_le`, `dpOrderC_cost_le` |

The round bound needs two facts:
- the hypothesis `abortBound n k + 1 ≤ V`;
- in a round that passes the test, `|𝒞_k| ≤ abortBound n k` (`capLayers_none_iff`).

An aborted round is paid for by the capped generator alone. That generator stops as soon as its
running count exceeds `U`, so it never builds a layer from more than `U` sets.

**All rounds** (`firstAcceptC_cost_le`). The loop pays for every round `t = 0, …, j` up to the
first accepted round `j`. From `autoCutX_correct`:
- `2^j ≤ K := max 1 (2λ)`;
- `j ≤ 2n`.

**Why the final scale dominates.** Every attempted round has `k = 2^t ≤ K`. `abortBound` is
monotone in `k` (`abortBound_mono`), so every round is bounded with the same `V = U(n,K)+1`.
`λ ≤ n²` (`lam_le_sq`) gives `k + 1 ≤ 2N²`, which bounds the number of candidates `(n²+1)(⌊√k⌋+1)`.

**The final accepting round.** It passed the abort test, so `|𝒞_k| ≤ U(n,K)`, which bounds the
ordering DP.

**Total.** `≤ 1000·N⁹·V³`. Finally (`abortBound_K_le`):
- `⌊√(3K)⌋ ≤ 3⌊√λ⌋+2` and `3K+1 ≤ 6N²`;
- hence `U(n,K)+1 ≤ 12N³·2^{15(⌊√λ⌋+1)}`;
- cubing gives the closed form.

## 4. Hostile-referee checks

| Concern | Status |
|---|---|
| Cost of a different algorithm? | No. `autoCutC_eq : autoCutC A = autoCutM A` and `autoCutC_eq_X` for **every** matrix (kernel-checked). |
| Hypothesis assuming the runtime? | No. The only hypothesis is `IsSkew A`, the algorithm's domain (needed for termination within 2n+1 rounds). |
| Only the accepting round counted? | No. Every attempted round 0..j is charged, including aborted and rejected rounds, and the final DP. |
| Table size bounded, construction ignored? | No. Construction (generation, deduplication, scans, unions) is charged per element. |
| `O(1)` lookup claimed? | No. All lookups are linear scans built from `cFilter`. |
| λ(A) used as input or oracle? | No (mechanical audit). |
| Partition enumeration? | No. `Pcum` and `Nat.Partition` are not in the program's closure; the abort test is the closed form. |
| `sorry`/`admit`/`native_decide`/user axioms? | None. The 68 audited declarations use only `propext`, `Classical.choice`, `Quot.sound`. |
| Leaf charges arbitrary? | They are declared polynomials. Each is an upper bound on the list-based operation it charges (§2). This is the trust boundary. |

## 5. What is NOT established

1. **The manuscript's sharp form `poly(n)·P(6λ)²`.** Two reasons, both properties of *this*
   implementation:
   - Shortest-path tables are scanned linearly, so one table costs `Θ(|𝒩|³)` in this model, not
     `|𝒩|²`.
   - Aborted rounds are charged through the closed form `U(n,k) = 2^{O(√k)}`, which is larger
     than `(n+1)·P(3k)`.

   The proved exponent is therefore `2^{45⌊√λ⌋}` rather than `P(6λ)² ≈ 2^{2π√(4λ)}`. Recovering
   `P(6λ)²` would need indexed tables (for example sorted arrays with binary search, or a
   verified hash map) and storage of predecessors. That is a further engineering-and-proof
   project. The manuscript's Theorem 3 claim `O(n⁶√k·N²)` is not established either.
2. **Bit complexity (Challenge 4): NOT VERIFIED.** All arithmetic is unit cost. Informal analysis
   (**not formalized**): let the input entries be `p_uv/q_uv` with total encoding size `L`.
   - Threshold candidates are input entries.
   - Every finite shortest-path value is a sum, over a set of cross pairs, of `1` or
     `1 + |a_uv|/τ`. With τ fixed, its denominator divides `num(τ)·Π q_uv`, and its numerator is
     at most `n²·(1 + max|a|/τ)`·(that denominator). So its bit length is `O(L + log n)`.
   - DP values are sums of input entries, so their bit length is also `O(L + log n)`.

   If this is right, each unit operation costs `Õ(L)` bit operations, and the bit complexity is
   the proved operation count times `Õ(L)`. This argument is **not** in Lean.
3. **Memory (Challenge 5): NOT VERIFIED as a theorem about a memory model.** Kernel-checked
   structural facts:
   - shortest-path tables ≤ |𝒩| + 1 entries (`distTab_card_le`);
   - DP tables ≤ layer size (`dpTab_card_le`);
   - |𝒞_k| ≤ U(n,k) in every round that passes the test (`capLayers_none_iff`);
   - candidates ≤ 2(n+1)⁴ (`card_candidates_le`);
   - intermediate layer unions ≤ (n+1)·|layer| (`nextLayerC_card_le`).

   There is no space semantics, and closure chains (label functions, permutations built by
   `extendPerm`) are not counted.
4. **Optimised executable: PARTIAL.**
   - Hoisting removes the per-query recomputation of 𝒩.
   - Not done: indexed state numbering, cached transition lists, stored predecessors, and
     single evaluation of the candidate tables. Candidate values are evaluated up to three
     times: in `recogVal`, and in the `inf'` and `filter` passes of selection.

## 6. Adversarial benchmark (Challenge 6)

**Setup.**
- **Inputs:** the same as Mission 024 (`tests/memo_instances.json`): the 77 Mission 023 instances
  (seed 23023) plus 42 adversarial instances (seed 24024). The adversarial families, at
  n = 6 and 7, are random, ties/zeros, near-transitive, planted, blocks, all-equal thresholds,
  the all-zero matrix (maximum number of reachable cuts), band, and H₆/H₇.
- **Runs:** native binaries with a 3600 s limit each. `autoCutC` and `autoCutM` ran concurrently,
  one per core, on identical inputs, under the same conditions.
- **Earlier comparison:** the Mission 024 `autoCutX` run (`tests/unmemo_raw.txt`) is used for
  output comparison.
- **Oracle:** an exhaustive exact oracle checks value, ordering, λ(A), the partition
  certificate, λ ≤ k, k < 2λ, and |𝒞_k| ≤ (n+1)P(3k).
- **Bounds:** each counted cost is also checked against both proved bounds.
- **Raw data:** `tests/m025/costed_raw.txt`, `memo_rerun_raw.txt`, `*.meta`,
  `costed_comparison.json`, `costed_summary.json`.

| | `autoCutC` (costed) | `autoCutM` (rerun) | `autoCutX` (Mission 024 run) |
|---|---|---|---|
| completed / 119 | **103** | 83 | 60 |
| exact-oracle PASS | **103 / 103**, 0 failures | (83, identical outputs to `autoCutC`) | (60, identical outputs to `autoCutC`) |
| n = 6 completed (of 20 + H₆) | 20 of 20 (H₆ not reached) | 6 | 0 |
| n = 7 completed (of 22) | 6 (instances 97–102) | 0 | 0 |
| max time, n = 5 | 17.0 s | 195.4 s | not completed |
| max time, n = 6 | 267.3 s | 1113.8 s | — |
| max time, n = 7 | 1409.5 s | — | — |
| peak RSS | 77.5 MB | 65.5 MB | 80.8 MB |

**Not completed (16):** instances 103–116 (n = 7) and the H₆ and H₇ instances (117, 118). The
time limit was reached; there were no errors.

**Speed.** On the 50 shared instances where `autoCutM` took ≥ 200 ms, `autoCutC` is 4.0× to
104.6× faster (median 13.1×). This is the effect of hoisting 𝒩.

**Counted cost.**
- The largest counted costs are 3.8·10⁷ (n = 5), 4.6·10⁸ (n = 6) and 2.5·10⁹ (n = 7).
- Every counted cost is below both proved bounds. The first bound is loose by a factor of at
  least 2⁶⁵, as expected from the crude constants.
- Counted cost and wall time have Spearman rank correlation 0.93 over the 53 instances
  ≥ 100 ms. The measured time per counted step ranges over 12–583 ns.
- The counter is a model, not a profiler: it does not count garbage collection, closure
  evaluation, or the arithmetic needed to compute the counter itself.
- These benchmarks support the theorem but are not a proof of asymptotic complexity.

**Rounds.** At most 7 doubling rounds (k ≤ 64) were used; the theory allows ≤ 2n + 1.

## 7. Reproduce

```bash
cd lean
lake build Westfall022.Main                       # kernel check + axiom audit (68 declarations)
lake env lean tests/OracleAudit.lean              # definition-closure audit
python tests/gen_memo_tests.py                    # identical inputs (seeds 23023 / 24024)
lake build westfall-costed-bench westfall-memo-bench
python tests/run_with_rss.py .lake/build/bin/westfall-costed-bench tests/m025/costed_raw.txt 3600
python tests/run_with_rss.py .lake/build/bin/westfall-memo-bench tests/m025/memo_rerun_raw.txt 3600
cd tests && python3 check_costed_results.py
```
