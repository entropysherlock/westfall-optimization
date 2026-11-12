# Grant application — working draft

> **Status: draft.** Nothing has been submitted, and no funding has been requested, offered or awarded. This is a reusable template. Adapt it to each program's actual call, eligibility rules and page limits before use. Budget figures are intentionally left blank.

**Applicant:** Caleb Westfall, independent researcher (Westfall Optimization, an independent research initiative. It is not incorporated and has no institutional affiliation).
**Project title:** Certified exact algorithms for ordering problems via block-localized exclusion dynamic programming
**Repository:** https://github.com/entropysherlock/westfall-optimization

---

## 1. Summary (≈200 words)
The weighted linear ordering problem (LOP) and feedback arc set in tournaments (FAST) appear in many settings: ranking aggregation, scheduling and input–output analysis. Both are NP-hard. This project develops *exclusion dynamic programming*, an exact method that discards partial orderings whose optimistic completion cannot beat a known solution. Its main result so far is a square-root block-localization theorem: when the instance splits into blocks of size at most b and K measures the weight that crosses the blocks, the number of surviving states is at most (n+1)·P(2K+b²). That gives running time poly(n)·2^O(b+√K). Every run can emit an exact integer certificate. An independent verifier can re-check the certificate without trusting the solver.

The theorem is proved in an internal manuscript that has not yet been peer-reviewed. The project seeks support for four things: independent review, a Lean formalization of the core counting lemma, a fast compiled implementation, and honest benchmarking against specialised solvers.

## 2. Background and prior work
- Karpinski & Schudy (2010) and Feige (2009) give subexponential algorithms parameterized by the optimal cost.
- Stein & Andres (2024) give polynomial-time partial optimality conditions.
- Akbari & Escobedo (2023) give approximate Condorcet partitioning.
- Branch-and-cut methods (Grötschel–Jünger–Reinelt; Charon–Hudry) are the strongest practical exact solvers.

*Claimed difference (to be independently assessed):* our bound charges frustration *inside* small blocks only through b, not through K.

## 3. Current results (with evidence level)
| Result | Evidence |
|---|---|
| \|S_K\| ≤ (n+1)·P(2K+b²); necessity of the zero-weight term | proved in manuscript, provisional |
| BLX 2.0 Python implementation; exact certificate verifier with tamper/binding tests | open source, unit-tested |
| Mixed benchmark picture: wins on structured block families, losses to generic MILP on many LOLIB instances | observed; raw logs public |

"Level 3" in the project's records is an internal classification, not an external endorsement.

## 4. Objectives and work plan
| ID | Objective | Deliverable | Indicative timing |
|---|---|---|---|
| M1 | Independent mathematical review | Review reports, errata log, submission decision | months 0–6 |
| M2 | Lean 4 formalization of the counting lemma and partition bound | Lean repository, checked in CI | months 3–12 |
| M3 | Compiled exclusion-DP core with the same certificate format | Rust/C++ library + Python bindings | months 3–12 |
| M4 | Benchmarks on full LOLIB/xLOLIB against a specialised LOP solver | Public logs, dashboard, negative results included | months 6–18 |
| M5 | Open problems: lower bounds in K, automatic block discovery | Technical reports | months 12–24 |

## 5. Expected outcomes and success criteria
- Review outcome documented publicly, whether positive or negative.
- Lean proof of the counting lemma that compiles without `sorry`.
- Reproducible benchmark suite with pinned environments.
- A clear statement of which instance families benefit and which do not.

## 6. Risks and mitigations
| Risk | Mitigation |
|---|---|
| A gap is found in the proof | Errata process; the certificates remain valid run by run even if the asymptotic bound needs revision |
| Prior art subsumes the result | Early expert review (M1) before further investment |
| Practical gains are limited to narrow families | Report this honestly; the certificate tooling remains useful on its own |
| Eligibility (independent applicant) | Seek a host institution or collaborating PI where required |

## 7. Open science and integrity
- All code, data and logs are public, under a license still pending the author's decision.
- No benchmark result is entered by hand.
- No publication, citation, partnership or endorsement is claimed.

## 8. Budget structure (amounts intentionally blank)
| Category | Description | Amount |
|---|---|---|
| Researcher time | Principal investigator effort, months × rate | ___ |
| Expert review | Honoraria for independent reviewers (M1) | ___ |
| Formalization support | Lean consultant or student support (M2) | ___ |
| Compute | Cloud time for benchmarks (M4) | ___ |
| Software & services | Licences, e.g. commercial MILP for comparison, if needed | ___ |
| Dissemination | Conference registration and travel, open-access fees | ___ |
| Indirect costs | Host-institution overhead, if applicable | ___ |
| **Total** | | ___ |

## 9. Applicant
Caleb Westfall leads Westfall Optimization, an independent research initiative. *(Add CV, prior work and references here. Do not list affiliations that do not exist.)*

## Checklist before submitting anywhere
- [ ] Confirm eligibility of an independent applicant for the specific program
- [ ] Choose a license (see `LICENSE-PENDING.md`)
- [ ] Obtain at least one independent expert opinion on the manuscript
- [ ] Fill in the budget from real quotes
- [ ] Tailor sections to the program's page limits and review criteria
