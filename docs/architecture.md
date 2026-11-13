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
  studio.worker.ts Web Worker entry (cancellation = Worker.terminate())
src/components/studio/  Studio UI, visualizations (heatmap, arc diagram, graph), remote-service panel
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
