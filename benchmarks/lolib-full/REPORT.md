# Full LOLIB benchmark: ATLAS-032 against HiGHS and SCIP

**Date:** 14 November 2026 · **Status:** measured on one machine; not independently replicated · **Solver:** ATLAS-032 final
default, unchanged (no algorithm changes were made for this benchmark).

## Summary

We ran the exact solver ATLAS-032 and two open-source MIP solvers, HiGHS 1.16 and SCIP 10.0, on the complete
standard LOLIB library for the linear ordering problem: 685 instances in nine families. The comparison used one
protocol for all three: one thread, a 30-second wall-clock limit enforced by killing the process, and exact
optimality (zero gap).

- **Families with attainable optima** (IO, SGB, RandB, MB, Spec; 232 instances, all run by all three solvers):
  - **Proved optimal:** ATLAS **89**, HiGHS **90**, SCIP **76**.
  - **Shifted geometric mean time** (10 s shift, unsolved counted at 30 s): ATLAS 15.8 s, HiGHS 17.0 s, SCIP 17.4 s.
  - **Instances only one solver proved:**
    - ATLAS (10): four RandB, the five MB n = 100 instances, and Spec/N-pal19.
    - HiGHS (13): twelve SGB and Spec/N-econ59.
  - **Where they differ:**
    - IO: all three solve 50/50.
    - SGB: HiGHS 12/25, ATLAS 0/25.
    - RandB: ATLAS 21/90, HiGHS 15/90.
    - MB: ATLAS 5/30, the MIPs 0/30.
  - **Unsolved:** 130 instances were proved by no solver within 30 s.
- **Large families** (RandA1, RandA2, xLOLIB, xLOLIB2):
  - We ran a stratified sample: the first three instances of each of the 13 size classes, 39 instances in all.
  - ATLAS proves 3/39 (RandA2, n = 100). HiGHS and SCIP prove 0/39.
  - ATLAS returns no result at all within the limit for n ≥ 200, and for RandA1 from n = 100.
  - No proven optima for these families exist in the literature.
- **Consistency checks:**
  - Every returned ordering's objective was recomputed from the raw matrix.
  - The solvers' 102 proved optima agree with each other on every instance where more than one solver proved
    optimality.
  - Every proved optimum equals the published best-known value, and none is above it.
- **Theory against practice:** λ correlates with solve time (Spearman 0.47 for ATLAS, against 0.33 for n alone), but
  equally for the MIP solvers. The certified λ bounds also place every standard instance at λ ≥ 0.05·n². On these
  benchmarks the 2^{O(√λ)} guarantee is therefore exponential in n. It does not explain ATLAS's results here.

Charts: [`charts/performance_profile.svg`](charts/performance_profile.svg),
[`charts/solved_by_family.svg`](charts/solved_by_family.svg), [`charts/lambda_regime.svg`](charts/lambda_regime.svg).
Full tables: [`RESULTS.exact.md`](RESULTS.exact.md), [`RESULTS.large.md`](RESULTS.large.md).

## 1. Instances

The source is the LOLIB suite as redistributed with *Linear Ordering Problem: Time for a Change* (Fagiolo, Baioletti,
Santucci, 2026), pinned to commit `a32e2cb24a9cb7bf3b754ebe4435adeaf34ffd9f` of
`github.com/F-a-b-r-i-z-i-o/Lop-Time-For-a-Change`. That repository holds all nine families: IO 50, SGB 25, RandB 90,
MB 30, Spec 37, RandA1 100, RandA2 75, xLOLIB 78, xLOLIB2 200.

- **Manifest:** [`manifest.json`](manifest.json) records the SHA-256 of every raw file.
- **No redistribution:** the matrices are third-party data and are not committed here. `fetch_suite.py` re-fetches
  them at the pinned commit.
- **Reference values:** the best-known values (BKS) come from the permutations published with MA-EDM (Lugo, Segura,
  Miranda; `github.com/carlossegurag/LOP_MA-EDM`).
  - We **recomputed** every value from its permutation and the raw matrix rather than copying a table.
  - 681 of 685 matched the stated value exactly, with 0 mismatches.
  - The remaining 4 have no BKS file.
- **Objective:** LOLIB convention, maximise Σ_{r<s} C[π_r][π_s].

## 2. Protocol

| Item | Setting |
|---|---|
| Machine | 2 vCPU Intel Xeon @ 2.10 GHz, 8 GB RAM (cgroup limit), Linux |
| ATLAS | ATLAS-032 final default (`bound: "cycles"`, strict pruning, 4 M state budget), Node 22.23.4, bundled unchanged by `build_runner.sh` |
| HiGHS | 1.16.0, 1 thread, `mip_rel_gap = mip_abs_gap = 0` |
| SCIP | 10.0 via PySCIPOpt 6.3.0, 1 thread, `limits/gap = limits/absgap = 0` |
| MIP model | Standard 3-cycle formulation: binary x_ij (i < j), 0 ≤ x_ij + x_jk − x_ik ≤ 1 for all triples |
| Limit | 30 s wall clock per instance, **including model build**. The driver kills the process at 33 s |
| Solved | The solver proves optimality **and** the measured wall time ≤ 30 s |
| Concurrency | At most two solver processes at a time, one per core |
| MIP model size | Not built for n > 250, where the 3-cycle model has more than 2.6 M constraints. One Spec instance (n = 452) is affected |

Each run is a fresh process (`run_suite.py`). Raw per-instance records are in `results/*.jsonl` and include the
returned ordering.

## 3. Results: families with attainable optima

| Family | n | Instances | ATLAS | HiGHS | SCIP | ATLAS SGM (s) | HiGHS SGM (s) | SCIP SGM (s) |
|---|---|---|---|---|---|---|---|---|
| IO | 44–79 | 50 | 50 | 50 | 50 | 1.56 | 0.75 | 0.93 |
| SGB | 75 | 25 | 0 | 12 | 0 | 30.00 | 28.49 | 30.00 |
| RandB | 40–50 | 90 | 21 | 15 | 15 | 20.79 | 25.25 | 25.22 |
| MB | 100–250 | 30 | 5 | 0 | 0 | 29.81 | 30.00 | 30.00 |
| Spec | 11–452 | 37 | 13 | 13 | 11 | 16.11 | 17.75 | 19.58 |
| **All** | 11–452 | 232 | **89** | **90** | **76** | **15.82** | **16.95** | **17.44** |

How to read this:

- **IO (real economic input–output tables):** solved by all three. HiGHS is about twice as fast; its LP relaxation is
  tight on these tables.
- **SGB:** ATLAS solves none and HiGHS solves half. This family is a clear ATLAS weakness.
- **RandB and MB n = 100:** ATLAS proves instances the general-purpose MIPs do not within 30 s.
- **Overall:** solve counts are effectively tied with HiGHS, 89 against 90. The results support **"competitive with
  general-purpose open-source MIP at a 30 s limit, with complementary strengths."** They do not support a claim of
  overall superiority.

## 4. Results: large families (stratified sample)

The first three instances of each (family, n) class, 39 in all, at the same 30 s limit:

Gaps are measured against the best-known value. "No result" means the process was killed at the limit before
returning anything.

| Class | ATLAS | HiGHS | SCIP |
|---|---|---|---|
| RandA2 n = 100 | **3/3 proved optimal** (5–8 s), equal to BKS | 0/3; orderings equal to BKS, not proved | 0/3; 20–21 % below BKS |
| RandA2 n = 150 | 0/3; equal to BKS on 2, 3 units below on 1 | 0/3; ≤ 0.01 % below BKS | 0/3; 16–23 % below |
| RandA1 n = 100–150 | no result | 0/6; 0.3–0.9 % below BKS | 0/6; 15–19 % below |
| xLOLIB n = 150 | 0/3; 0.09–0.19 % below BKS on 2; no result on 1 | 0/3; 0.25 % and 29.7 % below; no result on 1 | 0/3; 31–36 % below |
| xLOLIB n = 250 | 0/3; 1.1 % below on 1; no result on 2 | no result | no result |
| RandA2/RandA1 n = 200 | no result | no result | no result |
| RandA1 n = 500, xLOLIB2 n = 300–1000 | no result | not attempted (model > 2.6 M rows) | not attempted |

Overall: **ATLAS 3/39 proved, HiGHS 0/39, SCIP 0/39.** On RandA1, HiGHS's incumbents are better than ATLAS, which
returns nothing.

We sampled rather than ran all 453 large instances because, after the first sampled instances, almost every ATLAS run
was killed without output. Running the remainder would have cost about four machine-hours to record the same outcome.
The full run is the first thing to repeat once the defect in §6 is fixed. HiGHS and SCIP were not run above n = 250:
the 3-cycle model alone exceeds this machine's memory.

## 5. Does the theory predict the practice?

The white paper's AutoCut guarantee is poly(n)·2^{O(√λ)}. Exact λ is only computable for small n, so for every
benchmark instance we computed a **certified bracket** ([`lambda_bounds.py`](lambda_bounds.py)).

- **Lower bound (Theorem 1, Lean-checked):** every prefix of every optimal ordering has weak-majority cut at most λ.
  The largest prefix cut of a proved-optimal ordering is therefore a lower bound. Available for the 102 proved
  instances.
- **Upper bound:** any explicit ordered partition gives one. We search partitions of the best ordering into
  consecutive blocks by dynamic programming, then evaluate b² + 3K₀ exactly as the Lean-ported code defines K₀.
  Available for 216 instances.
- **Validation:** on 60 random instances with n = 6–10, exact λ from AutoCut always lay inside the bracket, with 0
  violations. The upper bound equalled λ in 41 of 60 cases. The lower bound was valid but loose.

Findings:

1. **No standard instance is structurally easy in the λ sense.**
   - λ_UB/n² has a median of 0.98 and a minimum of 0.63.
   - Even the certified lower bounds lie between 0.05·n² and 0.22·n².
   - So √λ grows linearly with n on these benchmarks, and 2^{O(√λ)} is exponential in n there.
2. **λ tracks difficulty, but not specifically for ATLAS.** Spearman correlations between wall time (unsolved counted
   at the limit) and λ_UB:

   | Solver | λ_UB | n | λ_UB / n² |
   |---|---|---|---|
   | ATLAS | 0.47 | 0.33 | 0.62 |
   | HiGHS | 0.34 | 0.20 | 0.50 |
   | SCIP | 0.43 | 0.29 | 0.58 |

   λ is a better hardness predictor than size for every solver. It works as a hardness measure, not as evidence that
   the λ-mechanism drives ATLAS's speed.
3. **The bracket is wide** (lower bound about 0.1·n², upper bound about n²). A tighter lower bound would sharpen
   finding 1, but cannot reverse it.

**Implication for the research programme:** the λ theory needs its own benchmark: instances with small λ (nearly
consistent rankings with local disagreements, such as rank aggregation of mostly agreeing judges), where it predicts
an advantage. LOLIB does not test it.

## 6. Defects found

1. **The time limit is not honoured on large instances.**
   - The fractional triangle-packing bound (Garg–Könemann) runs before the first deadline check and is not
     interruptible.
   - Example: MB/N-r250e0 under a 10 s limit ran for 160 s.
   - Fix: make the packing deadline-aware and fall back to a weaker bound. This changes no answers, only when the
     solver stops.
2. **Memory blow-up on tennis-ranking instances.**
   - Spec/N-atp76, N-atp111, N-atp134, N-atp163 and N-atp452 were killed by the kernel at 8 GB, even when run alone.
   - Four binary Spec instances (N-EX1, EX2, EX3, EX5) were also killed in the first pass, while sharing the machine
     with HiGHS. Rerun alone, they finished but did not prove optimality, and are recorded that way.
   - The first-pass records are kept in `results/atlas.exact.first_pass_oom.jsonl`.
3. **The state budget is exhausted early on dense random instances.** Most ATLAS `LIMIT` outcomes on RandB end by
   budget, not by time. This is a design limit, not a bug, but it explains why ATLAS loses to SGB-type dense instances.

One SCIP run (MB/N-r150d1) failed in the first pass while sharing memory with another SCIP process. It was rerun
alone; the first-pass record is in `results/scip.exact.first_pass_error.jsonl`.

## 7. Threats to validity and what is still missing

- **The baselines are general-purpose MIP solvers, not the state of the art for exact linear ordering.**
  - Dedicated branch-and-cut codes (Grötschel–Jünger–Reinelt and successors, with facet cuts beyond 3-cycles) and
    semidefinite methods prove far more of SGB, RandB and MB.
  - Commercial MIP (Gurobi, CPLEX) was not run: both need a licence on this machine.
  - The comparison here is therefore against open-source MIP, not against the field's best exact methods.
- **The 30 s limit is short.** Literature results typically use limits from minutes to hours, so the ranking may change
  at longer limits.
- **One machine, two cores, no replication.** Run-to-run timing noise has not been measured. Each instance ran once.
- **The large families were sampled** (39 of 453), not run in full.
- **MIP solution extraction:** the returned ordering is rebuilt from the x variables, and its objective is
  recomputed. Bounds are the solvers' reported dual bounds.

## 8. Reproduce

```bash
cd benchmarks/lolib-full
python3 fetch_suite.py                    # clones the pinned suite + BKS, writes manifest.json (SHA-256 per file)
./build_runner.sh                         # bundles the unchanged ATLAS-032 solver into runners/atlas_runner.mjs
pip install highspy==1.16.0 pyscipopt==6.3.0 numpy
F=IO,SGB,RandB,MB,Spec
python3 run_suite.py atlas --tl 30 --families $F --tag exact
python3 run_suite.py highs --tl 30 --families $F --max-n 250 --tag exact
python3 run_suite.py scip  --tl 30 --families $F --max-n 250 --tag exact   # optionally --shard 0/2 and 1/2, then concatenate
python3 run_suite.py atlas --tl 30 --families RandA2,RandA1,xLOLIB,xLOLIB2 --sample 3 --tag large
python3 run_suite.py highs --tl 30 --families RandA2,RandA1,xLOLIB,xLOLIB2 --sample 3 --max-n 250 --tag large
python3 summarize.py exact && python3 summarize.py large   # tables + consistency checks (exits non-zero on any failure)
python3 lambda_bounds.py && python3 charts.py
```
