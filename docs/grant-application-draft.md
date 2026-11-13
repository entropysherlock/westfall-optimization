# Westfall Optimization — Grant application working draft

> **Status:** Not submitted for Westfall Optimization. A separate ProofScope
> proposal exists; it is not an application for this project. No funding has
> been received for Westfall Optimization. This document is a working outline,
> not an application to any named funder.

**Applicant:** Caleb Westfall, independent researcher  
**Program:** Westfall Optimization  
**Working title:** Automatic Structural Decomposition and Formal Verification
for Exact Weighted Linear Ordering  
**Website:** https://entropysherlock.github.io/westfall-optimization/

## Abstract

Weighted linear ordering and the tournament feedback-arc-set problem are
NP-hard exact ordering problems. This program investigates structural
parameterizations that permit exact optimal solutions and independent
certification on favorable instances.

Discovery 019 establishes a provisional square-root bound when an ordered
block partition is provided. The **structural decomposition theorem**
(Discovery 022) proposes an intrinsic parameter

\[
\lambda(A)=\min_{\mathcal B}\{b(\mathcal B)^2+3K_0(\mathcal B)\},
\]

and an exact algorithm with claimed running time
\(\mathrm{poly}(n)2^{O(\sqrt{\lambda(A)})}\), recovering a minimizing
partition rather than receiving one. The specific recovery assertion is the
**Westfall Partition Recovery Theorem**. This result remains **provisional**:
the full written report is now public, but its original prototype, complete
independent implementation and flagship Lean formalization are not complete.

The proposed contribution reuses established cut-enumeration and
dynamic-programming machinery. Originality relative to the work of
Fomin–Pilipczuk and more recent width-based methods remains under audit.

## Research objectives

| Area | Work | Testable deliverable |
|---|---|---|
| M1 | Formal proof validation | Lean kernels check the full statement and dependencies, with axiom audit |
| M2 | Theorem reproducibility | Original AutoCut code, exact reference, instance generator, and full logs |
| M3 | Novelty verification | Detailed theorem-by-theorem comparison to prior art |
| M4 | Exact optimization engineering | Compiled solver and independent certificates, if benchmark evidence supports it |
| M5 | Benchmark fairness | Specialized LOP solver, HiGHS, BLX, packing SLDP, AutoCut; matched input and hardware |

## Evidence and limitations

- **Written proof:** The original 339-line Discovery 022 research report has
  been archived in `research/discovery-022/`; written proof does not imply
  machine correctness.
- **Prototype benchmark (reported, not reproduced from source in public repo):**
  AutoCut solved 7/20; BLX 2.0 and packing SLDP each solved 20/20.
- **Independent small-n reference:** An exact exhaustive checker has been
  added as independent research infrastructure; it is *not* a substitute for
  the AutoCut implementation or the claimed subexponential algorithm.
- **Formal verification:** Lean foundations are in progress; all flagship
  theorem statements remain unverified until checked in CI.
- **Publication:** There has been no peer review or third-party endorsement.
- **License:** A software license has not been selected. Public source alone
  does not grant redistribution rights.

## Funding and eligibility

No dollar amounts or eligibility claims are asserted here. Any actual funding
proposal requires program-specific rules, a realistic budget, a checked
timeline and a decision on intellectual-property/licensing terms.

A useful funding narrative should be about independently verifiable
AI-assisted mathematical discovery, with explicit proof-status tracking and
reproducibility, **not** an unsupported claim of faster optimization.

## Risks and controls

1. **Proved-in-report theorem may be wrong.** Lean formalization and adversarial
   small-case testing are acceptance gates.
2. **Novelty may be absent.** Compare statements, proof dependencies and
   running-time guarantees against specialist prior art.
3. **Practical performance may be poor.** Report losses, resource limits and
   incompatible benchmarks.
4. **Original source availability.** Do not claim that the unpublished original
   AutoCut experiments are reproducible until the files are actually archived.
5. **Grant eligibility.** Independent applicants may require a fiscal sponsor
   or institutional partner; check the specific call.

## Before submission

- [ ] Independent proof and novelty screening completed or limitations documented
- [ ] Flagship Lean theorem check status documented accurately
- [ ] Source and raw benchmark log release
- [ ] Specialized exact-solver comparison
- [ ] License decision by the project owner
- [ ] Eligibility, timeline and budget tailored to a real call

**The program's “Level 3” assessment is an internal research label, not an
academic endorsement or certification.**
