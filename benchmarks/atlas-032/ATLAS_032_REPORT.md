# ATLAS-032: residual lower bounds for dense linear-ordering instances
Caleb J. Westfall (with AI assistance) · 2026-11-13 · branch `research/atlas-032-dense-barrier`

*Wording revised after the original report to remove promotional language; every result, number and limitation is unchanged.*

## 1. Summary
**On this benchmark suite ATLAS-032 proves substantially more instances than ATLAS-031, using standard techniques. It is an engineering improvement, not a new mathematical result.**

On 88 identical instances (30 s, one thread, exact optimality only):

| Solver | Proved optimal |
|---|---|
| ATLAS-031 (A) | 47 |
| **ATLAS-032 (E)** | **85** |
| HiGHS 1.16 MILP, exact gap | 83 |

- **The n = 24 cases.** All six dense random and tie-heavy n = 24 instances that ATLAS-031 failed are now proved in 0.2–0.5 s with 100–1 700× fewer states. All six are independently certified.
- **Beyond n = 24.** Every dense n = 30 instance is proved (HiGHS: 4/6). At n = 35, 3 of 6 are proved (HiGHS: 3/6). All 50 real-world LOLIB input-output instances are proved (ATLAS-031: 27/50).
- **Not new mathematics.** The bounds used are standard; see §2 and NOVELTY.md. The contribution is a correct, native, certified implementation, plus a diagnosis that pinpointed what was missing.

## 2. Mathematical results (full statements and proofs in PROOFS.md)
| Result | Statement | Novelty |
|---|---|---|
| Lemma 0 | Exact prefix identity β(π) = β(π\|S) + cut(S) + β(π\|R) | Standard |
| Lemma 1 | Any directed-cycle packing (triangles or longer) lower-bounds β | Standard (3-dicycle LP duality; Grötschel–Jünger–Reinelt) |
| Lemma 2 | Restricting one global packing gives admissible residual bounds for every R | Already in this repository's Python SLDP (Discovery 018) |
| Lemma 3 | Prune S when β_S + cut(S) + ⌈L(V∖S)⌉ ≥ B (integral A) | Standard B&B over "beginning sections" (Charon–Hudry et al.) |
| Theorem 4 | The strict DP either returns the optimum or proves the incumbent | Standard argument, written out for this DP |
| Lemma 5 | Cycle bounds are compatible with the strong-component decomposition | Immediate |

**One empirical finding worth stating precisely.** On tie-heavy and sparse inputs (the LOLIB `tiw56*` family), triangle packings reach only about 83% of the optimum. The 3-dicycle LP still matches the optimum on those instances because zero-margin pairs let it enforce longer cycles. A greedy longer-cycle top-up on residual capacity recovers 96–98%, cheaply. This is a known LP phenomenon, not a theorem, but it was the decisive fix for the real-instance failures.

## 3. Implementation (all under `website/`)
| File | Change |
|---|---|
| `src/lib/studio/bounds/packing.ts` | **New.** Directed-triangle enumeration in cyclic order. Greedy integral packing. Native Garg–Könemann fractional packing (lazy heap). Greedy longer-cycle extension (BFS, ≤ 12 arcs). Exact integer feasibility check of every packed cycle (`finalize`). |
| `src/lib/studio/cutdp.ts` | Optional residual bound L(V∖S) with a per-state loss vector d[v], making each prune test **O(1)** (a 2.3× speed-up). Strict B − 1 mode with incumbent proof. Numeric state keys. Instrumentation (`rootLB`, `layerSizes`, `pruned`). |
| `src/lib/studio/atlas.ts` | `bound: none \| greedy \| fractional \| cycles` (default `cycles`) and `strict` options for ablation. Stronger incumbent on large components. Per-component certificates. |
| `tests/atlas032.test.ts` (new), `tests/atlas.test.ts` | 10 new tests; 2 ATLAS-031 tests pinned to the ATLAS-031 configuration (see §4). |
| `bench/*032*.ts`, `benchmarks/atlas-032/*` | Benchmark, diagnosis, certificate export, HiGHS scripts, LOLIB fetcher, raw results. |

The existing solvers are unchanged. The Studio's `atlas` solver gets the new bound automatically, and only for integral (`Problem.exact`) instances.

## 4. Verification
- **Tests.** `npx vitest run` → **50/50 pass** (40 previous + 10 new):
  - admissibility of L(R) against exhaustive enumeration on random residual sets;
  - DP equals brute force for every bound/strictness combination (400 instances), and equals the subset DP for n = 10–16;
  - longer-cycle admissibility on sparse digraphs, including a 4-cycle with zero chords that no triangle packing sees;
  - non-integral fallback;
  - the n = 24 milestone.
- **Changed tests.** Two ATLAS-031 tests expected interruption on instances that ATLAS-032 now *proves*. They were pinned to `bound: "none"` so they still test interruption semantics.
- **Independent certificates.** `verify_certificate.py` is pure Python and shares no code with the solver. It accepted **10/10** certificates: the six milestone instances plus four LOLIB instances (`N-stabu70`, `N-tiw56r72`, `N-t59b11xx`, `N-be75eec`). It rejects tampered certificates: an inflated packing, a wrong β, or a suboptimal order.
- **External agreement.** 0 disagreements between ATLAS-proved and exact-HiGHS-proved values. 6/6 LOLIB optima recorded in the repository are reproduced exactly.
- **Bugs caught during development** (fixed, with tests):
  - triangles were stored in sorted rather than cyclic order (harmless for triangles, wrong for general cycles), caught by the new exact cycle check;
  - an editing error dropped state registration, caught immediately by the brute-force tests.
- **Formal verification:** **none.** Installing the Lean toolchain was blocked in this environment. Nothing here is machine-verified.

## 5. Performance
Full table in RESULTS.md. Raw data: `results.json` (A, S, B, C), `results_E.json`, `highs_results.json`, `highs_results_defaultgap.json`.

**n = 24 failure set: diagnosis.** In all six cases the local-search incumbent was **already optimal**. The search failed because ATLAS-031 had **no bound on the remaining vertices**. Strict pruning alone barely helps; the residual bound is what does it.

| Instance | ATLAS-031 states | ATLAS-032 states | Time |
|---|---|---|---|
| random-int n=24 s=2 | > 3 000 000 (failed) | 5 853 | 90 ms |
| ties n=24 s=2 | > 3 000 000 (failed) | 4 876 | 37 ms |

**Ablation (n = 24 dense, 6 instances).** Median states:

| Variant | Median states |
|---|---|
| A: ATLAS-031 | 1.9 M |
| S: strict only | 1.8 M |
| B: + greedy triangles | 71 k |
| C: + fractional triangles | ≈ 1 k |
| E: + longer cycles | ≈ 1 k |

**Memory.** ATLAS-031 runs reached 2.5 GB RSS. Two of them in parallel were OOM-killed on the 8 GB machine, twice. ATLAS-032's 1 000× smaller state counts remove that failure mode on everything it proves.

## 6. External competition (HiGHS 1.16.0, 1 thread, identical instances, 30 s, model building included)
- **ATLAS-032 ahead:**
  - dense random n = 30: 3/3 vs 1/3;
  - tie-heavy n = 30: 3/3 in a median 3.9 s vs 25.7 s;
  - multi-component n = 120: 14 ms vs 6.4 s;
  - planted n = 100: 1.8 s vs 3.0 s.
- **HiGHS ahead:**
  - most LP-tight families (near-transitive, cyclic, LOLIB) by 2–10× in median time, though both solve everything;
  - on the open n = 35 instances, HiGHS's bounds and incumbents are stronger (e.g. β 509 vs 510; bound 490 vs 484).
- **Tolerance finding.** With **default tolerances** (`mip_rel_gap = 1e-4`), HiGHS labelled a *suboptimal* solution of `N-stabu70` "Optimal" (F = 336 764 vs the certified optimum 336 776). All headline comparisons therefore use `mip_rel_gap = 0`; both runs are preserved.
- **Not tested:** SCIP and specialised LOP branch-and-cut codes (not available here). No claim is made against them.

## 7. Failure cases
- **Dense random / tie-heavy n = 35:** 3 of 6 unproved, with a 4.8–5.1% gap.
  - **Cause:** static packing restriction weakens as the prefix grows, and the 3-dicycle LP itself has a 2–5% gap on these instances. More cycles cannot fix that.
  - **Requires:** stronger relaxations (e.g. Möbius-ladder or mod-k cuts) or per-node re-bounding.
- **Run time:** ATLAS-032 is slower than HiGHS whenever the LP relaxation is tight (most real data).
- **Memory:** states are held in memory, so memory remains the hard ceiling for unprovable instances.

## 8. GitHub
- Branch: `research/atlas-032-dense-barrier` (from `main` at 13772c4).
- Draft PR against `main` (not merged); the link is in the final message.
- LOLIB matrices are **not committed** (third-party data). `fetch_lolib_io.py` regenerates them from github.com/IGARDS/RPLib.

## 9. Next research frontier
The strongest remaining limitation is that **the residual bound is static**: one global packing, restricted. The 3-dicycle LP gap at n ≥ 35 shows that restriction alone cannot close the remaining gap.

The precise open engineering-mathematics question: can a packing be **re-optimised incrementally along the prefix layers**, re-using the capacity freed by removed vertices, at amortised cost per state well below one packing solve, with a provable monotone guarantee? That question would also connect ATLAS to Lagrangean B&B (Charon–Hudry), which does this per node at higher cost.

## 10. Publication assessment
- **Not a mathematics paper:** there is no new theorem.
- **Possible venue:** a short experimental/software paper (exact, independently certified, client-side LOP solving) after a comparison with published exact LOP codes and SCIP.
- **Worth a note in such a paper:** the default-tolerance mislabelling by a general MILP solver is a cautionary observation, not a discovery.

## Reproduction
```bash
git clone https://github.com/entropysherlock/westfall-optimization && cd westfall-optimization
git checkout research/atlas-032-dense-barrier
cd website && npm ci && npx vitest run                                    # 50 tests
python3 ../benchmarks/atlas-032/fetch_lolib_io.py                         # LOLIB IO from RPLib (git clone)
npx vitest run --config bench/vitest.config.ts bench/export032.bench.test.ts
npx vitest run --config bench/vitest.config.ts bench/atlas032.bench.test.ts            # A,S,B,C (~35 min; run alone)
ATLAS_VARIANTS=E npx vitest run --config bench/vitest.config.ts bench/atlas032.bench.test.ts
pip install highspy==1.16.0 && python3 ../benchmarks/atlas-032/highs_032.py            # exact gap
CERT_EXTRA=N-stabu70,N-tiw56r72 npx vitest run --config bench/vitest.config.ts bench/cert032.bench.test.ts
python3 ../benchmarks/atlas-032/verify_certificate.py ../benchmarks/atlas-032/certificates.json
python3 ../benchmarks/atlas-032/summarize032.py
```
- **Seeds:** generators use seeds 1–3; local search uses seed 1.
- **Hardware:** 2 vCPU Intel Xeon @ 2.1 GHz, 8 GB RAM. Node 22.23.4, vitest 5.1.0.
- **Run one benchmark process at a time.** Two parallel ATLAS-031 runs exceed 8 GB.
