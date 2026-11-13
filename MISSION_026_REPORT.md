# Mission 026 — Website reconstruction and Optimization Studio

**Branch:** `product/westfall-studio` (based on `main` at `ecc15c5`). **Pull request:** [#5](https://github.com/entropysherlock/westfall-optimization/pull/5), merged as `84b2962`.
The Lean research branch `formal/westfall-theorem` was not modified.

## 1. Architecture decisions

| Decision | Reason |
|---|---|
| Keep a **static Next.js 16 export on GitHub Pages** | It is the existing, working deployment. GitHub Pages cannot run server code. |
| Run the **Studio's solvers in the browser** (Web Worker) | This is the only way a GitHub Pages site can solve real instances. It also keeps data private, gives real progress, and makes cancellation reliable (`Worker.terminate()`). |
| **Exact rational parsing (BigInt)**, then integer scaling | Decimal inputs such as 0.1 + 0.2 are exact. The solvers run on exact integers whenever every partial sum fits in 2⁵³. Otherwise exact solvers downgrade their status to “feasible only”. |
| **Explicit interpretation** (skew, benefit or cost) | Asymmetric data is never silently reinterpreted. The exact affine identity objective = (F_A ± S)/2 and the offset S are preserved and re-checked for every result. |
| **TypeScript port of AutoCut**, tested against the Lean executable | The Lean binary cannot run on Pages. The port reproduces the Lean output exactly on all 103 archived runs. It is labelled as tested, not verified. |
| A **separate FastAPI job service** for the Python BLX solver | Larger exact runs need a server: process isolation, time and memory limits, cancellation, API keys and rate limits. It is implemented and tested, and needs a container host. |
| **Configuration only through public build variables** (`STUDIO_API_URL`, `CONTACT_ENDPOINT`) | No secrets in the frontend or the repository. When a variable is empty, the UI says so honestly. |

## 2. Implementation status by page

| Route | Status |
|---|---|
| `/` Home | Rebuilt: positioning, capabilities, a live exact-solve visualization (user-driven, no auto-animation), the problem statement, verification summary with qualifications, product, applications, research and calls to action. |
| `/technology/` | New: weighted linear ordering, pairwise matrices and transformations, exact methods, λ(A), parameterized complexity, certificates, exact vs heuristic, and an evidence ledger (proved, tested, open). |
| `/research/` | Rebuilt as a research program: main theorem, supporting results, manuscripts, technical notes, literature and reproducibility. |
| `/research/theorem/` | New. Replaces the numbered-discovery page: definitions, statement, a lemma table with Lean names, proof outline, and evidence and limitations. |
| `/research/manuscript/`, `/research/paper/` | Kept (archival manuscripts); labels updated. |
| `/formal-verification/` | Rebuilt for Mission 025: the 8 flagship declarations, each linked to source at commit `5de1b5b`; the eighth theorem's bound and computation model; all five mandatory qualifications; CI and axiom audit. |
| `/studio/` | **New product** (see §3). |
| `/benchmarks/` | Rebuilt with separated provenance: (A) AutoCut algorithm generations from Mission 025 data, with a scatter plot and a 119-row table including unsolved cases; (B) exact-oracle comparisons; (C) the reported prototype study; (D) the historical BLX/SLDP/MILP dashboard. Hardware and limits are stated. |
| `/applications/` | New: when a problem is linear ordering; manufacturing sequencing (weighted completion time), changeover, rank aggregation, preferences, tournaments, scheduling subproblems, research. Adjacency changeover costs are explicitly excluded. |
| `/docs/`, `/docs/api/` | New: specification, formats, edge cases, limits, solvers, statuses, verification, export and re-import, capacity (measured), worked examples (values verified by enumeration), privacy, and the job API. |
| `/about/`, `/contact/` | New. The contact form is **disabled with an explanation** until `CONTACT_ENDPOINT` is configured; GitHub issues (enabled on the repository) are offered as a working channel. |
| `/verify/`, `/explainer/`, `/roadmap/` | Kept and restyled. The roadmap is rewritten as open questions. |
| `/lab/`, `/research/discovery-022/` | Redirects (meta refresh, client navigation and a link). |

## 3. Optimization Studio

**Input**
- Upload CSV, TSV, TXT or JSON (≤ 2 MB), paste or edit text, or load one of 6 examples.
- Matrix files may have a header and row labels. Edge lists are `from,to,weight`. JSON may hold a matrix, edges, or an exported result.
- Items can be renamed. The parsed model is shown before running: interpretation, objective, transformation, identity, S, scale, arithmetic mode, and the matrix A for n ≤ 12.

**Validation**
- Errors are reported by line and column.
- Duplicate edges are summed (with a warning) for benefit and cost data, and rejected for skew data.
- Self-edges are rejected. Missing off-diagonal entries are errors.
- Asymmetric matrices under the skew interpretation are rejected, with an instruction to choose benefit or cost.
- Limits: 400 items, 80 000 edges, |value| ≤ 10¹², 30 digits per value.

**Solvers**

| Solver | Size limit | Guarantee |
|---|---|---|
| Exact subset DP | n ≤ 20 | optimal; reports real progress |
| Exact exclusion DP | n ≤ 26 | optimal if it completes within a 3M-state budget; otherwise feasible only |
| AutoCut port | n ≤ 9 | optimal, plus a partition attaining λ(A) |
| Local search | n ≤ 400 | feasible only |

**Statuses**
- “Optimality established”: an exact solver completed in exact arithmetic.
- “Feasible solution only”: a heuristic, an interrupted exact search, or floating-point arithmetic.
- “Verification passed”: shown separately.
- Browser runs are always labelled “not the Lean-verified executable”.

**Dashboard**
- Objective comparison and improvement. Percentages are shown only when the baseline is strictly positive; the β reduction is always meaningful.
- Arc diagrams of the initial and optimized orders, heatmaps (with block outlines when available), a directed graph, a pairwise-contribution table, structure (λ, blocks), and run details.

**Progress and cancellation**
- Each job has an id and a state. Progress is real (DP states processed) or explicitly absent.
- Cancel terminates the worker. The time limit is 0.1–600 s, enforced inside the solver plus a watchdog.

**Export**
- JSON with the exact input, model, solver version and configuration, status, exact objectives, verification and reproduction instructions.
- CSV, a Markdown summary report, and Print/PDF.
- Re-import uses the exported order as the initial order.

## 4. Test results (local; CI evidence in §7)

| Suite | Result |
|---|---|
| Vitest unit tests (`website/tests`) | **27 / 27** pass. Includes the AutoCut port ≡ Lean executable on **103 / 103** runs (value, order, partition, λ, k, cut and node counts), AutoCut optimum = enumeration on **119 / 119** instances, and the transformation identity on random benefit and cost instances. |
| Playwright end-to-end tests (real Chrome, built static site) | **21 / 21** pass: 13 desktop Studio and navigation tests, plus 8 navigation tests on a mobile viewport. |
| Service integration tests (`service/tests`, real worker processes) | **16 / 16** pass. |
| Python package tests (existing) | **19 / 19** pass. |
| Typecheck, lint, link check, production build | pass (lint: one pre-existing warning in `postcss.config.mjs`) |

### Acceptance tests (Part VI)

| # | Test | Where | Result |
|---|---|---|---|
| 1 | Upload a matrix, solve exactly, verify by exhaustive enumeration | e2e `1:` + unit | **pass**: optimum 15, confirmed on all 120 orderings, by three exact solvers |
| 2 | Edge list gives an equivalent result | e2e `2:` + unit | **pass**: same optimum 15; the benefit edge list and matrix give the same offset S = 12 |
| 3 | Malformed input gives a useful error | e2e `3:` + unit | **pass**: “entry "x" at row 2, column 3 is not a number”, missing entries, non-square, and an asymmetric-matrix message; Run is disabled |
| 4 | A heuristic does not claim optimality | e2e `4:`, `9c` + unit | **pass**: “Feasible solution only”, with the note “NOT established” |
| 5 | Export and re-import | e2e `5:` + unit | **pass**: the JSON and CSV downloads are parsed, and re-import reproduces objective 15 as the initial objective |
| 6 | Negative weights and ties | e2e `6:` + unit | **pass**: several optimal orderings; agreement with enumeration on 40 random tie-heavy instances |
| 7 | Displayed claims match the Lean source and the Mission 025 report | manual audit (below) | **pass** |
| 8 | Navigation and responsiveness on all pages | e2e navigation (desktop + mobile) | **pass**: 17 routes, one h1 each, no console errors, no horizontal overflow, every internal link returns 200, menus, redirects |
| 9 | Resource limits and cancellation | e2e `9a–9c` + service tests | **pass**: cancel → CANCELLED with no result; 0.1 s limit → FAILED with no result; per-solver size limits; service queue, time, memory, auth and rate limits |
| 10 | Production deployment serves the built software | §7 | see §7 |

**Test 7 audit (claims vs source).**
- The bound `1 728 000 (n+1)¹⁸ 2^{45(⌊√λ⌋+1)}` matches `autoCut_complexity` in `lean/Westfall022/Complexity.lean` at `5de1b5b` (line 284).
- The 8 flagship names and their line numbers were taken from that commit.
- The CI run 43419080867 and its 963 audited declarations come from the Mission 025 log.
- 103 / 119 completed and the 4.0–104.6× speed range (median 13.1×) are computed at build time from the Mission 025 data file.
- The 7 / 20 and 650 figures are labelled as transcribed from the original report.
- The four mandatory qualifications plus the novelty and superiority disclaimer appear on the Verification page; the shorter disclaimers appear on Home, Technology and the Theorem page.

## 5. Performance measurements (Chrome 153, Intel Xeon 2.10 GHz)

- **Subset DP:** 33 ms at n = 15 and 0.54 s at n = 20.
- **AutoCut port:** all 103 Lean-completed archived instances run in 0.6 s in total under Node. That includes the n = 7 cases that took up to 1409 s in the Lean binary: the port uses bitmask-indexed tables, while the verified Lean implementation uses linear scans.
- **Local search:** n = 60 runs until its time budget and is used for the cancellation test.
- **Job service:** BLX on the 5-item example completes in about 0.01 s solver time, plus about 1 s process start-up (spawn).

## 6. Security findings

- **npm audit:** 0 critical, 0 high, 8 moderate, 4 low. This is unchanged from `main`. The moderate findings are in the build-time lint chain; the low findings are in KaTeX, which renders only trusted site text and never user input.
- **pip-audit** (FastAPI, Uvicorn, NumPy, SciPy, Pydantic, Starlette): no known vulnerabilities.
- **Controls**, detailed in `docs/security.md`: input limits, no evaluation of input, worker isolation, watchdog, per-job processes with `RLIMIT_AS`, bounded queue, rate limits, hashed API keys, per-client job isolation, CORS, in-memory retention, non-root container. There are no secrets in the repository, and no cookies or analytics.
- **Not done:** penetration testing; distributed rate limiting; key rotation.

## 7. Deployment status

| Item | Evidence |
|---|---|
| PR #5 merged into `main` | merge commit [`84b2962`](https://github.com/entropysherlock/westfall-optimization/commit/84b296280a608a15ba85b46f9c57c9fae3f1cf3d) |
| CI on the final PR head `3cabbcb` | [run 43427128963](https://github.com/entropysherlock/westfall-optimization/actions/runs/43427128963): website (typecheck, lint, unit tests, link check, build, **21 Playwright tests**), service (**16**), Python 3.11 and 3.13 (**19** each), all success |
| CI on the merge commit | [run 43427472938](https://github.com/entropysherlock/westfall-optimization/actions/runs/43427472938): success |
| GitHub Pages deployment of the merge commit | [run 43427472977](https://github.com/entropysherlock/westfall-optimization/actions/runs/43427472977): build and deploy success |
| Dependency security audit | [run 43427473007](https://github.com/entropysherlock/westfall-optimization/actions/runs/43427473007): success (artifact; 0 high, 0 critical) |
| Live site serves the new application | The live pages `/studio/` and `/formal-verification/` were fetched after deployment. They contain the Studio panels, examples and solvers, and the eight-declaration table with its qualification callouts. |
| Production build behaves correctly | The merge commit was rebuilt locally with `NEXT_PUBLIC_BASE_PATH=/westfall-optimization` (the Pages configuration) and driven in Chrome. AutoCut and subset DP each returned optimum 15 (“Optimality established”); the heuristic returned 15 (“Feasible solution only”); `/lab/` redirected; there were no console errors and no failed requests. |

**Limits of the live verification.** This workspace cannot open `github.io` in a browser: its network allowlist blocks
it, and it also blocks downloading the Pages artifact. The live check therefore confirms the served content, and the
solver behaviour was confirmed on an identical-source build under the production base path, not by clicking through
the live site. A one-minute manual check on the live site is recommended.

**Not deployed.**
- The job service needs a hosting account and billing decision by the owner, then the `STUDIO_API_URL` repository
  variable. Until then, the Studio states that no remote service is configured.
- The contact form needs a form-delivery endpoint registered by the owner (`CONTACT_ENDPOINT`).

## 8. Commercial readiness

**Ready**
- A public, working browser product that solves real instances, with honest status labelling, exports and documentation.
- A tested backend that a host can deploy.

**Not ready: blockers before accepting paying customers**
1. **License and terms.** No repository license, terms of service, privacy policy or licensing terms exist. Selecting them is the owner's decision.
2. **Deployed backend.** Hosting, TLS, monitoring and backups for the job service, plus a decision on persistent job storage.
3. **Contact and sales channel.** Configure `CONTACT_ENDPOINT` (or another delivery provider) and verify end-to-end delivery.
4. **Accounts and billing.** User and organization accounts, persistent API-key management and rotation, usage metering, and a payment provider (none is integrated; none is claimed).
5. **Service hardening.** Distributed rate limiting, persistent queue, penetration test, logging and alerting, SLAs.
6. **Solver scope.** Exact browser solving is practical to about n = 20–26. Larger exact instances need the deployed BLX service, and even then the problem is NP-hard. The verified AutoCut implementation is slow beyond n ≈ 7.
7. **External validation.** A specialist novelty review of the theorem, and benchmarks against specialized linear-ordering solvers before any performance positioning.

## 9. Remaining work

- Indexed and faster verified AutoCut (and the sharper P(6λ)² bound); bit complexity; memory bound (Lean).
- Optional: compile the Lean AutoCut to WebAssembly or run it in the job service, so the “Lean-verified implementation” status could be shown for genuinely verified runs.
- Saved projects and job history (requires accounts and storage).
