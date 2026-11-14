# WESTFALL Optimization — initial product pilot and evidence gates

Status: **proposal, not validated demand** · November 14, 2026 · No customer interviews or revenue claimed.

## Decision: specialize before broadening

WESTFALL currently solves weighted linear-ordering objectives: for every pair `(i,j)`, a fixed benefit or cost depends on which item comes first. The browser Studio supports exact/heuristic solvers, exports and verification, and bounded locally computed workloads. It **does not** solve general constrained scheduling, route planning, or adjacency-only setup costs. The code is licensed under GPL-3.0 (see `LICENSE`), and terms other than the GPL are not yet set; the remote FastAPI job service is not deployed.

**Initial beachhead hypothesis:** research teams that aggregate pairwise human or model preferences into a small, auditable consensus ranking. Their problem maps to Kemeny-style weighted linear ordering, and a real 6-item example is included in Studio. We do **not** yet know whether they need this, how many would use it, or whether they would pay.

**Do not market WESTFALL as a general alternative to Gurobi or Hexaly.** Those products have broad optimization models. Nextmv already offers versioned decision applications, cloud runs, experiments and an API; Hexaly Studio provides cloud-backed modeling and optimization. WESTFALL should compete only where independently checkable optimality evidence plus a specialized workflow matters to actual users.

Sources for comparator capabilities (read November 2026):
- Nextmv platform documentation: https://docs.nextmv.io/learn/
- Hexaly Studio: https://www.hexaly.com/hexaly-studio
- Hexaly solution states: https://www.hexaly.com/docs/last/pythonapi/optimizer/index.html

## Testable first-user workflow

1. From the homepage or Applications page, follow a link such as `/studio/?example=kemeny`.
2. See the included six-candidate pairwise agreement matrix and a clear explanation of what the columns mean.
3. Solve it and distinguish **feasible** from **proven optimal**.
4. Inspect the exact objective, check the evidence, export the result, and explain the winning ranking to another person.
5. Optionally replace the example with the user's own pairwise CSV or JSON.

The bundled example is demonstration data, not a customer case. Full raw ballot upload is **not** implemented; a prospective user must currently provide a pairwise matrix or edge list. That conversion is an important user-journey gap to validate before prioritizing it.

## Validation design (not results)

Recruit 10 unaffiliated prospective users via research groups or communities doing preference aggregation. Do not present any participant as a customer or endorsement without permission. Ask each to bring a non-sensitive real task and observe them navigating the Studio with no guided setup.

Record for each test: problem description, whether the objective actually fits weighted linear ordering, size, whether they can prepare the input, successful independent verification, time to first result, errors, alternative tools used, and willingness to repeat use. Obtain consent before collecting or publishing any data.

**Pre-register decision gates:**

- **Proceed to focused MVP:** at least 5/10 can complete their own representative task, at least 3/10 independently say the exact certificate or verification materially improves their workflow, and at least 2 request a follow-up pilot.
- **Improve onboarding first:** most fit the model but fail on data ingestion, terminology, or first-time setup. Prioritize ballot-to-pairwise conversion and clear explanation over new mathematical solver classes.
- **Pivot target segment:** fewer than 3/10 bring a genuine weighted-linear-ordering problem, or they report no meaningful reason to choose WESTFALL over their existing process.

These thresholds are hypotheses for a small exploratory sample, not statistical evidence of a market. Keep outcomes, including negative ones, publicly documented in aggregate and with permission.

## Engineering and scientific gates

Before any production or paid offering:

1. Full CI green with *all* required browser acceptance tests and certificates. No skipped tests or relaxed mathematical assertions to conceal failures.
2. Independent checker accepts every claimed exact certificate; known malformed/tampered certificates are rejected.
3. Clear size, precision, timeout, memory, privacy and browser execution limits.
4. Specialist comparison against at least one dedicated linear-ordering solver on pre-registered, unseen cases, matched hardware and exact status criteria.
5. Privacy/data terms for any hosted service. The repository license is decided: GPL-3.0 (`LICENSE`).
6. Secure remote-job architecture and cost assessment **before** deploying any backend; maintain local browser fallback.
7. No user account collection or payments until interview evidence identifies a real need and the owner approves the model.

## Technology roadmap priorities

| Priority | Work | Completion evidence |
| --- | --- | --- |
| P0 | Repair Playwright/CI drift | Fresh required CI successful; no hidden regressions |
| P1 | Shareable, preloaded, verifiable ranking example | Browser deep-link tests plus actual demonstration solve |
| P1 | Stronger ATLAS residual bounds | Frozen ATLAS-032 suite and fresh test set, exact certificates, no regressions |
| P2 | Ballot list to pairwise matrix importer (only if requested) | Exact conversion identity plus independently checked consensus objective |
| P2 | Structured reproducible pilot report | 10 consent-based interviews, including negative findings |
| P3 | Cloud execution/API | Deployment review, rate limits, resource ceilings, privacy approval |

## Status separation

- **Implemented today:** browser Studio, bundled ranking example, exact optimizers, reproducibility/certificate features documented in the repository.
- **In review:** direct example links; P0 browser-test repair in separate draft PRs.
- **Hypotheses only:** pilot segment, uptake, purchase interest, need for ballot importer, competitive product differentiation.
- **Not approved:** paid services, accounts, remote deployment, pricing, licenses, publication or external funding claims.
