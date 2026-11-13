# WESTFALL / OPTIMIZATION

**Discover the structure. Prove the optimum.**

An independent research project in **exact weighted linear ordering, parameterized algorithms, block-localized exclusion, and checkable optimality certificates**.

- **Research website:** https://entropysherlock.github.io/westfall-optimization/
- **Westfall Structural Optimization Theorem (Discovery 022):** https://entropysherlock.github.io/westfall-optimization/research/discovery-022/
- **Full original Westfall theorem manuscript:** https://entropysherlock.github.io/westfall-optimization/research/manuscript/
- **Formal verification status:** https://entropysherlock.github.io/westfall-optimization/formal-verification/
- **Interactive laboratory:** https://entropysherlock.github.io/westfall-optimization/lab/
- **Benchmarks:** https://entropysherlock.github.io/westfall-optimization/benchmarks/

Independent research led by **Caleb Westfall**, using AI-assisted discovery, adversarial computation and written proof development. Not affiliated with a university or institute; no research funding or peer-reviewed publication is claimed.

## Research status — November 2026

| Discovery | Contribution | Evidence status |
|---|---|---|
| **019** | Square-root block-localization counting for a supplied ordered partition | Written public provisional manuscript; tests reported |
| **021** | Gap-free localization quantity \(K_0\) for a supplied partition | Research report and code reported on unpublished local branch |
| **022 — Westfall Structural Optimization Theorem** | Candidate intrinsic \(\lambda(A)\), minimum-partition recognition and partition-free exact algorithm | **Internal Level 3 candidate**, unreviewed and **not Lean-verified** |

The provisional Westfall Structural Optimization Theorem proposes

\[
\lambda(A)=\min_{\mathcal B}\bigl(b(\mathcal B)^2+3K_0(\mathcal B)\bigr)
\quad\text{and}\quad
T(A)=\mathrm{poly}(n)2^{O(\sqrt{\lambda(A)})}.
\]

This algorithm is based on existing **Fomin–Pilipczuk cut enumeration and dynamic programming**. The potential novelty lies in the structural parameter and the **Westfall Partition Recovery Theorem**, which claims recognition of its minimizing partition. The [full original written report](research/discovery-022/WESTFALL_Discovery_022_Report.md) is now public, along with [this editorial summary](papers/discovery-022-research-summary.md). The original AutoCut code and raw benchmarks remain unrecovered from the reported local branch.

**Level 3** is the program's own research classification, **not an external endorsement**. Neither the new theorem nor its asymptotic runtime claim has passed a Lean kernel check. See [the formal verification protocol](docs/formal-verification.md).

### Negative results matter

The Westfall Structural Optimization Theorem's AutoCut prototype reportedly proved **7/20** benchmark cases, while BLX 2.0 and packing SLDP each proved **20/20**, and AutoCut was slower wherever it succeeded. The new claim is theoretical, not a new fastest solver. The original published benchmarks also include cases where generic HiGHS MILP beats BLX.

## What you can run today

The public repository contains:

- Python package \`westfall_optimization\`: BLX 2.0 portfolio, SLDP, subset DP, local search, MILP wrapper
- Exact integer certificate generator and independent verifier with input binding and tamper tests
- Static Next.js research website with interactive browser-only solvers, explainer and BigInt certificate verification
- Benchmark logs and provisional Discovery 019 manuscript
- Original complete Discovery 022 written report and editorial summary, but **not** its unrecovered AutoCut prototype
- Independent exhaustive small-n reference checker in `research/discovery_022/`, not a substitute for AutoCut
- Six elementary Lean weak-cut lemmas verified by GitHub Actions with an axiom audit; **not** a proof of the flagship theorem

**The website's TypeScript solver is not the Python BLX 2.0 algorithm.** The browser demonstration and real solver presets are labeled separately.

### Install and test

\`\`\`bash
git clone https://github.com/entropysherlock/westfall-optimization.git
cd westfall-optimization
python -m pip install -e ".[test]"
python -m pytest
\`\`\`

### Solve and verify

\`\`\`bash
westfall-opt solve examples/paley11.json
westfall-opt solve examples/paley11.json --mode sldp --certificate cert.json --out result.json
westfall-opt verify cert.json --instance examples/paley11.json
\`\`\`

Input: JSON \`{"matrix":[...]}\` with skew-symmetric weights, or raw \`.npy\`. Use \`westfall-opt lolib PATH\` for LOLIB files.

Certificate verifier implementations:

- [Python exact checker](src/westfall_optimization/certificates/verify_exact.py)
- [TypeScript BigInt browser checker](website/src/lib/verify.ts)

Exact arithmetic verification of one supported solution is **not a formal proof assistant certification**.

### Website development

\`\`\`bash
cd website
npm ci
npm run typecheck
npm run lint
npm test
npm run build
\`\`\`

GitHub Actions runs the Python and website checks and deploys a static Next.js export to GitHub Pages.

## Mathematical manuscripts and documentation

- [Original Westfall Structural Optimization Theorem full report](research/discovery-022/WESTFALL_Discovery_022_Report.md)
- [Discovery 019: Square-Root Block Localization](papers/square-root-block-localization-v2.md)
- [Westfall Structural Optimization Theorem: Provisional Research Summary](papers/discovery-022-research-summary.md)
- [Formal verification protocol and tracker](docs/formal-verification.md)
- [Release-status and remaining gaps](docs/RELEASE_STATUS.md)
- [Targeted prior-art novelty audit](docs/novelty-audit.md)
- [Verified foundational Lean workflow](https://github.com/entropysherlock/westfall-optimization/actions/runs/43359133881)
- [Architecture](docs/architecture.md)
- [Certificates](docs/certificates.md)
- [Grant application draft](docs/grant-application-draft.md) — **not submitted for Westfall Optimization**
- [Contribution guidelines](CONTRIBUTING.md)

## Key prior art

- [Fomin & Pilipczuk — cut enumeration / FAST](https://arxiv.org/abs/1301.7314)
- [Karpinski & Schudy — subexponential weighted FAST](https://arxiv.org/abs/1006.4396)
- [Feige — Faster FAST](https://arxiv.org/abs/0911.5094)
- [Kawashima & Sukegawa — Condorcet structure](https://arxiv.org/abs/2609.19593)

No claim of universal superiority to specialized linear-ordering solvers is made; that head-to-head comparison is still missing.

## License

**Pending project-owner decision.** Until a license is selected, all rights are reserved; public source visibility is not a redistribution license. See [LICENSE-PENDING.md](LICENSE-PENDING.md).
