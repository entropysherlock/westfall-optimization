# Release 1.0 — status

Updated: 2026-11-13

## Released

- **Website redesign** covering Technology, Research, Verification, Studio, Benchmarks, Applications, Documentation,
  About and Contact. Old routes `/lab/` and `/research/discovery-022/` redirect.
- **Westfall Optimization Studio**, a browser application:
  - CSV, TSV, JSON and edge-list input with exact rational parsing and line-level validation;
  - explicit skew, benefit or cost interpretation, with the exact affine identity and offset preserved;
  - exact subset DP (n ≤ 20), exact exclusion DP (n ≤ 26), the AutoCut port (n ≤ 9) and local search (n ≤ 400);
  - Web Worker execution with real progress, cancellation, time limits and a watchdog;
  - exact objective verification, exhaustive cross-checks for n ≤ 9, and CSV, JSON and Markdown exports that re-import.
- **Benchmark dashboard** with separated provenance: the Mission 025 AutoCut generations, exact-oracle comparisons, the
  reported prototype study, and the historical BLX series.
- **Job service** (`service/`, FastAPI): implemented with integration tests, Dockerfile and documentation.
- **Lean:** eight flagship declarations kernel-checked on the research branch (see `docs/formal-verification.md`).

## Not done or not operational

- The job service is not deployed. A container host and its configuration are required.
- The contact form is disabled until a form-delivery endpoint is configured (`docs/deployment.md`).
- There are no user accounts, saved projects, persistent job history, usage metering, payments or pricing.
- The repository license requires the owner's decision.
- Specialist novelty review and a comparison against a specialized LOP solver are outstanding.
- The original AutoCut prototype code from the first report remains unrecovered. The verified AutoCut is a new
  implementation.

A passing CI workflow certifies the stated checks only; it is not an external endorsement.
