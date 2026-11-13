# Architecture

```
src/westfall_optimization/
  core.py              skew matrices, scoring F_A(π), backward weight β=(W−F)/2, generators, LOLIB reader
  solvers/subset_dp.py exact O(2^n n) DP (small n)
  solvers/exclusion_dp.py  SLDP: layered exclusion DP, keep S iff f(S)+r(S)+U(V∖S) ≥ L
  solvers/local_search.py  insertion local search (incumbent L)
  solvers/milp.py      HiGHS MILP via scipy (triangle formulation)
  blx/hybrid.py        hybrid hereditary bound U_hyb(T) = W(T) − 2[Σβ*(T∩B_i) + Σ transversal y']
  blx/counting.py      state counts vs. theorem bound (n+1)·P(2K+b²)
  blx/portfolio.py     BLX 2.0 routing + `solve()`
  certificates/        make_cert.py (integer scaling), verify_exact.py (independent checker)
  cli.py               `westfall-opt`
```

## BLX 2.0 routing (from Discovery 019; thresholds fitted on Discovery 018 data)

| Condition | Route |
|---|---|
| n > 62 | MILP |
| zero_frac ≥ 0.05 and gap ≥ 0.03 | MILP, then SLDP |
| gap < 0.03 | SLDP |
| rho ≥ 0.3 | BLX (block bound) |
| otherwise | SLDP |

## Website
`website/` is a Next.js static export. `src/lib/engine.ts` is a TypeScript **browser engine** (subset DP and exclusion DP) — not BLX. `src/lib/verify.ts` is a BigInt port of `verify_exact.py`. Presets in `public/data/` are produced by the Python solver via `scripts/build_site_data.py`.


## Website and Optimization Studio (`website/`)

```
src/lib/studio/
  rational.ts      exact BigInt rationals; decimal/fraction parsing with digit limits
  parse.ts         matrix CSV/TSV, edge list, JSON and exported-result parsing; LIMITS; line-level errors
  model.ts         Problem: interpretation (skew | benefit | cost), A = C − Cᵀ or Dᵀ − D, offset S,
                   integer scaling, exact objective and identity checks, pair contributions
  solvers.ts       subset DP (progress, deadline), exclusion DP wrapper, multi-start local search, enumeration
  autocut.ts       AutoCut port (BigInt), tested for exact equality with the Lean executable
  runner.ts        solve(): statuses, cross-checks, wire format for the worker
  report.ts        results, verification record, JSON/CSV/Markdown export, improvement metrics
  studio.worker.ts Web Worker entry (cancellation = Worker.terminate()); batches measured telemetry
  atlas.ts / cutdp.ts / bounds/  ATLAS-032 engine; cutdp.ts uses flat typed-array layers (Mission 039),
                   cutdp.reference.ts is the pre-039 code kept only as a differential test oracle
  catalog.ts / config.ts  solver metadata, run settings and wire format (no engine code; page bundle)
  client.ts        browser job control: one fresh worker per job, watchdog, verifier worker
  analysis.ts      problem profile + difficulty class, per-item contributions, backward pairs, movement,
                   matrix aggregation, instance fingerprint (identities tested exactly)
  evidence.ts      six-level evidence ladder (feasible → recomputed → bound → certificate → independently
                   accepted → Lean); never reports Lean verification for browser runs
  compare.ts       comparison plan, rows, consistency checks, comparability statement, exports
  session.ts       local-only sessions (localStorage) and reproducibility bundles
  certverify.ts / verify.worker.ts  independent certificate verifier (imports no solver code)
src/components/studio/  Studio 2.0 workstation (Mission 039): Studio.tsx shell (run bar, workspace rail,
                   inspector) and one module per workspace: Problem, Solver, Results, Analysis
                   (MatrixExplorer canvas), Verification, Compare; RunMonitor shows live telemetry;
                   Viz.tsx keeps the arc diagram and graph view; RemotePanel the optional job service
```

The site is a static export. No user data leaves the browser unless a remote job service is configured and the user
submits a job. Status vocabulary:
- `OPTIMAL`: an exact solver completed in exact arithmetic;
- `FEASIBLE`: a heuristic, an interrupted exact search, or floating-point arithmetic;
- the verification record is kept separately.

## Job service (`service/`)

```
westfall_service/
  config.py   limits and settings from environment variables (no secrets in the repository)
  model.py    instance validation and the exact model transformation (Fractions)
  jobs.py     JobManager: bounded FIFO queue, one OS process per job (time limit, RLIMIT_AS, terminate on cancel),
              exact result verification, in-memory retention
  app.py      FastAPI endpoints, API-key auth (SHA-256 digests), sliding-window rate limits, body-size limit, CORS
```
