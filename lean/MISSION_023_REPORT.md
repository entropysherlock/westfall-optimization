# Mission 023 — Final hostile-referee report

**Branch:** `formal/westfall-theorem` (not merged to `main`; website and public theorem untouched).
**Baseline:** `4c6103b` (seven verified declarations). The baseline proof files are byte-identical in Mission 023.

## Mandatory verdict

| Item | Verdict |
|---|---|
| Seven original Lean declarations | **PASS** (unchanged; re-checked by local build and GitHub Actions) |
| Semantic correspondence to manuscript | **PASS**, with documented reformulations and the n = 0 erratum (`SEMANTIC_AUDIT_023.md`) |
| Executable AutoCut implementation | **COMPLETE as deterministic executable code; NOT an efficient implementation** (no memoisation) |
| Executable-to-specification refinement | **VERIFIED** (`recognizeX_isSome`, `partition_recoveryX_*`, `autoCutX_correct`) |
| Full running-time complexity theorem | **NOT VERIFIED** |
| Eight flagship declarations | **7 / 8** |

**Mathematical correctness status.** The structural mathematics of Discoveries 021–022, partition recovery and AutoCut correctness are kernel-verified, with only the standard axioms, for rational skew-symmetric inputs. The theorem as published claims a running time that is unverified. The project's only executable implementation provably refines the specification but does **not** achieve that running time.

**Publication readiness.**
- *The correctness half* (Theorems 1 and 3, Lemma 2, and Theorem 4 correctness) is ready for external expert review, with the Lean development as supporting artefact.
- *The complexity half of Theorem 4* must be presented as a **pen-and-paper claim** until it is formalized against a memoised implementation.
- *Novelty* remains unassessed by any external party.

## What Mission 023 established

1. **Semantic audit (Phase 1).**
   - All seven declarations are EXACT MATCH (2) or EQUIVALENT WITH EXPLAINED REFORMULATION (5); none is weaker or mis-modelled.
   - A mechanical definition-closure audit shows the specification `recognize` reaches only tie-break choices (`Classical.choose`). The executable `recognizeX` and `autoCutX` reach no `lam`, `OPT`, `objective`, `IsOptimal`, `Classical.choose` or `Nat.find`.
   - There is no oracle, assumed witness or enumeration of partitions.
2. **Executable recovery (Phase 2).**
   - `Exec.lean` gives deterministic code: reachable k-cuts by layers; the abort test; nodes and the Bellman shortest path; exact rational threshold costs; predecessor extraction; K₀ and λ(𝓑); ordering extraction from the cut DP; and a doubling loop bounded by 2n + 1 rounds (`lam_le_sq`).
   - Tie-breaks are explicit: colex-least set, least vertex, lexicographic (τ, b).
   - **Refinement:**
     - the executable accepts at exactly the same thresholds as the specification;
     - it satisfies Theorem 3's three guarantees;
     - on every skew matrix it returns OPT, an optimal ordering and a λ-minimising partition, at the same round and with the same value as the verified specification.
3. **Complexity (Phase 3) — negative finding.**
   - The manuscript's bound poly(n)·P(6λ)² presupposes a memoised DP with one table entry per node.
   - The executable evaluates `dist` and `cutDP` as plain recursions, so its cost grows with the number of chains in the node DAG.
   - Measured on the native harness: all 3- and 4-vertex instances finished within minutes. Two 5-vertex instances finished (band, H₃), while the first random 5-vertex instance ran for ~29 minutes without finishing (`tests/exec_time_limits.txt`).
   - **A theorem of the manuscript's form would be false for this implementation.** `autoCut_complexity` is therefore absent. What is proved is `autoCutX_state_bounds`: accepting-round family sizes ≤ (n+1)·P(3k) ≤ (n+1)·P(6λ), and k ≤ 4ⁿ.
4. **Adversarial reproducibility (Phase 4).** See `tests/` (seed 23023):
   - families: uniform rational, zero/tie-heavy, near-transitive, planted, block-structured, and the manuscript's band, H_p, tight T₁, D2 and n = 1 cases;
   - each completed output was compared with exhaustive enumeration in exact rationals: optimal value, ordering optimality, true λ, the independently recomputed λ of the returned partition, the k bounds, and the reachable and all-k-cut counts against (n+1)·P(3k).
   - **Results:** 77 instances generated; **66 completed, 66 PASS, 0 FAIL**. Completed instances cover every random family at n = 3 and 4, plus band (n = 4, 5), H₂, H₃, T₁ and n = 1.
   - **11 did not complete:** all ten random n = 5 instances and the n = 5 D2 matrix were stopped after about 29 and 16 minutes of CPU respectively. This is the measured consequence of the missing memoisation (`tests/exec_time_limits.txt`).
   - Raw outputs are in `tests/exec_raw_results*.txt`; the comparison is in `tests/exec_comparison.json` and `tests/exec_summary.json`.

## Remaining problems (specific blockers)

1. **Memoised implementation.** A layer-by-layer `dist` and `cutDP`, storing one value per node (for example as finite maps), with a refinement proof to `dist` / `cutDP`.
2. **Cost semantics.** Write that implementation in an instrumented monad. Prove separate bounds for:
   - (a) arithmetic operations;
   - (b) bit size of the rationals (path sums of terms 1 + |a|/τ);
   - (c) memory;
   - (d) the enumeration of states;
   - (e) witness and ordering extraction.
3. **The partition-number estimate** p(M) ≤ e^{π√(2M/3)}. An elementary proof exists: bound p(M)·x^M by the finite generating-function product, use −log(1−y) = Σ y^m/m and Σ 1/m² = π²/6, then optimise x. It is not in Mathlib and not formalized.
4. **Cheap evaluation of P(3k).** The executable's abort test evaluates P(3k) by enumerating partitions when the reachable family is large (`pcumGuard`). A verified polynomial-time partition-count DP would be needed for the runtime claim.

## Reproduce

```bash
cd lean
lake update && lake exe cache get        # full Mathlib (CI path)
lake build                               # 7 baseline + Mission 023 modules; axiom audit in Main.lean
lake env lean tests/OracleAudit.lean     # definition-closure oracle audit
python tests/gen_exec_tests.py           # regenerate instances (seed 23023) and harness
lake build westfall-exec-tests && .lake/build/bin/westfall-exec-tests > tests/exec_raw_results.txt
python tests/check_exec_results.py       # exact comparison with exhaustive reference
```
