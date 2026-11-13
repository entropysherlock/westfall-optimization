# WESTFALL Mission 031 — Project ATLAS: final engineering report
Caleb J. Westfall (with AI assistance) · 2026-11-13 · branch `engineering/atlas-031` (local; see §G)

## J. Verdict first
**Yes, on measured evidence — with one clearly bounded exception.**

- **Capacity.** On the same 64-instance suite and limits, the production exact solvers (subset DP, exclusion DP) proved optimality on **36** instances. ATLAS proved **59**, including instances of **30–400 items** that the old 20/26-item limits rejected outright.
- **Speed.** Where both succeed, ATLAS is faster on every family (typically **3–30×** fewer states and less wall time than the exclusion DP).
- **Correctness.** **Zero** exact-value disagreements against exhaustive enumeration, the subset DP, the exclusion DP, and HiGHS 1.16 MILP (24 shared instances).
- **Exception.** On *dense random* and *tie-heavy* instances at n = 24, ATLAS is no better than the old exclusion DP: both prove 1 of 3. **HiGHS proves all three in 0.06–6.6 s.** On that family WESTFALL is not competitive with an LP-based MILP solver.
- **Counting theorem.** The hyperbola counting theorem does **not** speed up weighted ordering. Its bound is 15–24 orders of magnitude above the observed state counts. It is shipped as a separate, tested directed-cutwidth capability.

## A. Baseline (before changes; verified against the code)
| Solver | Limit in code | Measured behaviour (this suite) |
|---|---|---|
| Subset DP | n ≤ 20 (`solvers.ts`) | always 2ⁿ states; 262 144 states / ~105 ms at n = 18 |
| Exclusion DP | n ≤ 26, 3 M state budget | 36/42 solved within limits; fails 2/3 random-int and 2/3 ties at n = 24 |
| AutoCut | n ≤ 9 (`AUTOCUT_MAX_N`) | not benchmarked (outside scope of larger instances) |
| Local search | n ≤ 400 (parser `maxVertices`) | never proves optimality; **suboptimal on 6/12 multi-component instances (n = 240, 400)** |

The limits match the mission brief.

## B. Implementation (new / modified files, all under `website/`)
| File | What |
|---|---|
| `src/lib/studio/decompose.ts` | Iterative Tarjan SCC on the strict preference digraph (a_uv > 0), topological order, cross-value, property checker. Recursion-free, so safe at n = 400+. |
| `src/lib/studio/cutdp.ts` | **Cut-bounded exact prefix DP** for weighted ordering, for any n. Layered by \|S\|, exact dedup, incremental O(n) updates, per-layer memory release, state budget and deadline. |
| `src/lib/studio/atlas.ts` | Adaptive pipeline: SCC → per component (trivial / subset DP ≤ 13 / local-search incumbent + cut-bounded DP / subset-DP fallback ≤ 20) → concatenation. Statuses OPTIMAL or INTERRUPTED. |
| `src/lib/studio/cutwidth.ts` | **Separate** directed-cutwidth solver: exact H(K) in BigInt, safe state cap with vacuity shortcut, bitset prefix search, ordering reconstruction, binary search for the minimum, subset-DP reference. |
| `src/lib/studio/solvers.ts`, `runner.ts`, `report.ts` | New solver id `atlas` (n ≤ 400), runner branch, new status `INTERRUPTED`. Existing solvers are unchanged. |
| `tests/atlas.test.ts` | 13 tests (below). |
| `bench/*.ts`, `../benchmarks/atlas-031/*` | Benchmark harness, HiGHS script, raw JSON, summaries. |

**Key algorithm (cut-bounded DP).** Let P_uv = max(a_uv, 0) and β(π) = backward weight, so maximising F ⇔ minimising β. For a prefix set S:

- cut(S) = Σ_{u∉S, v∈S} P_uv.
- β_S = the least backward weight inside S.
- **Rule:** discard S when β_S + cut(S) > β(incumbent).

**Proof of admissibility.** For an optimal π* and any prefix S of π*, the pairs counted in β_S(π*) and in cut(S) are disjoint and all backward in π*. So β_S(π*) + cut(S) ≤ β(π*) ≤ β(incumbent). Keeping the minimum β_S per set never discards the prefixes of an optimal ordering. Hence the DP returns a true optimum whenever it completes. ∎

## C. Correctness evidence
**Proof obligations.**

- The SCC decomposition theorem (proof in the `decompose.ts` header).
- Cut-bounded DP admissibility (above).
- The cutwidth reachability equivalence (`cutwidth.ts` header).
- The cut increment formula.
- The cutwidth state cap relies on **Theorem A, which is not yet Lean-verified**. The code applies it only to semicomplete inputs, and it never fired in any benchmark (see D2).

**Independent tests** (all pass: `npx vitest run` → 5 files, **40/40 tests**; 27 pre-existing + 13 new):

- **Decomposition:** 400 random instances (ties, near-transitive, components, weights around 10⁶, all-zero) — topological validity and a vertex partition.
- **Exhaustive enumeration:** 600 instances with n ≤ 8, half forced through the cut-bounded DP — the optimum value matches every time.
- **Subset-DP cross-check:** 80 instances with n = 9–16, compared against subset DP, with and without decomposition, and the cut-bounded DP alone from the *worst* incumbent (identity).
- **Budget and deadline:** budget exhaustion gives INTERRUPTED plus a valid permutation; a deadline of 0 is honoured.
- **300-item instance:** solved exactly and matched against an independent per-component subset DP plus the cross value.
- **Cutwidth:** 300 random digraphs, semicomplete and not, with two-way arcs. The minimum cutwidth equals the subset-DP reference, the reconstructed ordering has that width, and the NO side is checked with and without the cap.
- **Cap safety:** never applied to non-semicomplete digraphs; H(K) matches the exact values.
- **End to end (Studio runner):** rational benefit and cost matrices, negatives and ties → OPTIMAL, with brute force and cross-checks agreeing.
- **External:** HiGHS agrees on all 24 shared instances (§E).

**Counterexample hunt.** No exact-value failure was found. One *apparent* disagreement on the floating-point `paley11` example was rounding at 2·10⁻¹⁵ between summation orders. It is preserved in `results.json`. This is exactly why the Studio never labels non-integer inputs OPTIMAL; the harness now compares integer instances exactly.

## D. Performance (same instances, same limits)
Full table: `benchmarks/atlas-031/results.md`. Raw data: `results.json`. Limit 20 s per run; 3 seeds per configuration; 2-vCPU Xeon @ 2.1 GHz; Node 22.23.4.

| Family | n | Production exact (best of subset/exclusion) | ATLAS |
|---|---|---|---|
| near-transitive | 24 | 3/3 · 1036 ms · 402 564 states | 3/3 · **234 ms · 85 878** |
| random-int | 18 | 3/3 · 106 ms (subset) | 3/3 · **83 ms · 28 602** |
| random-int | 24 | 1/3 | 1/3 (no gain) |
| ties | 24 | 1/3 | 1/3 (no gain) |
| blocks | 24 | 3/3 · 336 ms · 22 588 | 3/3 · **11 ms · 2 923** |
| cyclic (single SCC) | 21 | 1/1 · 1527 ms · 626 274 | 1/1 · **913 ms · 257 073** |
| planted, r = 10 / 20 / 30 reversals | 30 / 60 / 100 | rejected (n > 26) | **3/3 each** · 9 / 46 / 791 ms |
| planted, r = 40 | 200 | rejected | 2/3 · ~17 s |
| multi-component | 60 / 120 / 240 / 400 | rejected | **3/3 each** · 4 / 17 / 128 / 486 ms |

**Ablation (decomposition off).**

- Multi-component instances drop from **12/12 to 0/12**. Decomposition is what unlocks n = 60–400.
- On single-SCC families the two variants are identical within noise, so decomposition costs nothing.

**Memory.** Peak memory is driven by retained states. ATLAS's cut-bounded DP keeps the per-state O(n) vectors for two layers only, and its state counts are 2–10× lower than the exclusion DP's on every family both solve. RSS was not isolated per run (a single process ran all solvers); that is a limitation of this measurement.

### D2. Directed cutwidth (`cutwidth.json`)
- **Instances:** semicomplete near-transitive digraphs with two-way arcs, n = 16 to 150.
- **Speed:** exact minimum cutwidth in **≤ 50 ms** at n = 150. The subset-DP reference agrees on every n ≤ 20 and takes ~300 ms there.
- **The theorem's cap never triggered.** Real k-cut counts (14 to 4 145) are far below (n+1)·H(2k). The cap is a sound worst-case certificate, not a practical accelerator.

## E. External comparison (actually run)
HiGHS 1.16.0 MILP: one thread, 20 s limit, standard 3-cycle LOP formulation. Times cover the solve only, not model building. Full table: `highs_comparison.md`.

- **Planted (n = 30–100):** ATLAS is **4–10× faster**.
- **Multi-component (n = 60–120):** ATLAS is **100–400× faster** (e.g. 17 ms vs 6.5 s at n = 120).
- **Dense random and near-transitive, n ≤ 24:** **HiGHS is faster**, and it proves the two random n = 24 instances both WESTFALL solvers could not.
- **Not tested:** SCIP and specialised LOP codes (e.g. LOLIB-era branch-and-cut). No superiority over them is claimed.

## F. Limitations
- **Dense random and tie-heavy single components with n ≳ 22:** exponential prefix blow-up. There is no LP or triangle-packing lower bound in the browser DP. *This is the single biggest remaining gap*, and HiGHS shows that LP bounds close it.
- **Single strongly connected components with large backward weight** (e.g. planted with 40 reversals at n = 200): one of three runs out of budget.
- **Real-world data:** LOLIB files are not in the repository (the benchmark records point at a local path) and could not be downloaded in this environment, so there are no real-world results yet.
- **Theorem A** (cutwidth cap) is still not formally verified.

## G. Production readiness
- **Safe to deploy now:**
  - SCC decomposition plus the ATLAS solver. It is an opt-in solver id; the defaults and the existing solvers are unchanged.
  - The `INTERRUPTED` status. The UI already treats any non-OPTIMAL status as amber; `Studio.tsx` should get a dedicated label in a follow-up.
- **Experimental, keep off the UI for now:** the cutwidth module. It is correct and tested, but no UI or input format exists yet, and its cap depends on an unverified theorem.
- **Not done:** push and deploy. The session has read-only GitHub access (attaching the repository with write access was refused here). The branch `engineering/atlas-031` exists in a local clone, and a tested patch is delivered: `atlas-031.patch`. To apply it:
  1. `git checkout -b engineering/atlas-031`
  2. `git am atlas-031.patch` (or `git apply`)
  3. `cd website && npm ci && npx vitest run`

## H. Future mathematical / algorithmic opportunities
1. **Biggest win:** add an admissible *lower bound on the remaining backward weight* to the cut-bounded DP. Candidates are an edge-disjoint 3-cycle packing on V∖S, or an LP relaxation; packing is already in the Python BLX 2.0. The rule becomes β_S + cut(S) + LB(V∖S) > B. HiGHS's results on random n = 24 show such bounds matter.
2. Run the counting-theorem question in reverse: an *instance-adaptive* bound on surviving states (counting actual B-cuts) could steer solver selection better than any worst-case formula.
3. Incremental SCC refinement inside the DP: fixing a prefix can split the remaining instance into new components.

## I. Reproduction
```bash
git clone https://github.com/entropysherlock/westfall-optimization && cd westfall-optimization
git am /path/to/atlas-031.patch            # or check out engineering/atlas-031 once pushed
cd website && npm ci
npx vitest run                              # 40 tests
npx vitest run --config bench/vitest.config.ts   # ~10 min; writes benchmarks/atlas-031/results.json + cutwidth.json
python3 ../benchmarks/atlas-031/summarize.py
pip install highspy==1.16.0 && npx vitest run --config bench/vitest.config.ts bench/export.bench.test.ts && python3 ../benchmarks/atlas-031/highs_lop.py && python3 ../benchmarks/atlas-031/compare_highs.py
```
- **Seeds:** generator seeds 1–3 (mulberry32); local search seed 1.
- **Environment:** Node v22.23.4, vitest 5.1.0, HiGHS 1.16.0, 2 vCPU Intel Xeon @ 2.1 GHz, 7 GB RAM, Linux.
