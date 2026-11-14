<div align="center">

# WESTFALL Optimization

**Exact optimization for complex ordering decisions.**

Research-driven algorithms and verifiable software for sequencing, ranking, and weighted pairwise optimization.

[**Launch Optimization Studio**](https://entropysherlock.github.io/westfall-optimization/studio/) · [Website](https://entropysherlock.github.io/westfall-optimization/) · [Research & Verification](https://entropysherlock.github.io/westfall-optimization/formal-verification/) · [Documentation](https://entropysherlock.github.io/westfall-optimization/docs/)

</div>

---

## Overview

WESTFALL Optimization is an independent, AI-assisted research and software project developing exact algorithms for weighted ordering problems. It combines structural decomposition, combinatorial search, rigorous lower bounds, and reproducible optimality evidence.

The project has three complementary parts:

| Component | Purpose |
|:--|:--|
| **ATLAS / Optimization Studio** | Solve and inspect ordering problems in a browser, with exact and heuristic modes, progress reporting, and exports. |
| **BLX and AutoCut** | Python optimization algorithms, structural methods, and independently checkable solution certificates. |
| **Mathematical foundations** | Lean-formalized structural and cut-counting results, alongside paper proofs and explicitly identified open problems. |

### Measured results

| Benchmark | Recorded result |
|:--|--:|
| ATLAS-032, exact instances solved within 30 s | **85 / 88** |
| HiGHS 1.16.0, same instances and time limit | **83 / 88** |
| ATLAS-032 on 50 LOLIB input-output instances | **50 / 50** proved optimal |
| 40-item synthetic near-transitive instance | **1.287 s** to certified optimality |

The 40-item instance (seed 1) attained objective **1,647** and backward penalty **319**. The ATLAS-032 study used an Intel Xeon 2.1 GHz machine with two vCPUs and 8 GB RAM; HiGHS used a zero relative MIP gap. These are **specific benchmark results**, not a claim of general superiority over HiGHS or commercial optimization software. The study documents cases where HiGHS was faster and cases ATLAS did not prove within the limit.

[**Read the benchmark report**](benchmarks/atlas-032/ATLAS_032_REPORT.md) · [Detailed results](benchmarks/atlas-032/RESULTS.md) · [Raw records](benchmarks/atlas-032/results_E.json) · [Reproduction instructions](benchmarks/atlas-032/REPRODUCE.md)

## Optimization Studio

[**Open the browser application**](https://entropysherlock.github.io/westfall-optimization/studio/)

The Studio accepts CSV, TSV, JSON, and edge-list data. It provides input validation, multiple solving strategies, solver progress and cancellation, result inspection, and export formats. Exact modes are subject to problem-size and computational budgets.

The website runs TypeScript solver implementations in the browser. The full Python BLX system is separate, and the browser code should not be confused with the Lean-verified mathematical programs.

[Studio performance measurements](benchmarks/studio-039/README.md) · [Release status](docs/RELEASE_STATUS.md)

## Research and formal verification

The project maintains mathematical proofs, formal verification artifacts, and computational experiments as separate forms of evidence.

| Research line | Verified or established scope | Source |
|:--|:--|:--|
| **Structural decomposition & AutoCut** | Eight selected flagship Lean declarations covering structural bounds, partition recovery, correctness, and a unit-cost operation bound. | [Formal verification record](docs/formal-verification.md) |
| **Semicomplete digraphs (040)** | Lean-checked bound on the number of bounded cuts via hyperbola partitions. | [Formal status](research/westfall-040/FORMAL_STATUS.md) |
| **Bounded defect (041)** | Lean-checked defect and shifted-hyperbola results. | [Formal status](research/westfall-041/FORMAL_STATUS.md) |
| **Sharpened cut counting (044)** | Five audited Lean declarations, including the bound \(N_k\le(n+1)4^h H(c+k)^2\). | [Verification and CI](research/westfall-044/VERIFICATION.md) |
| **Bounded independence (046–047)** | Paper-level pivot and core-decomposition arguments, computational investigations, and unresolved extremal conjectures. | [Research report](research/westfall-046/REPORT.md) |

The **eight flagship declarations** describe the original AutoCut formalization, **not** the total number of Lean-checked results across subsequent missions. The original audit reports 963 declarations including supporting lemmas; that number must not be interpreted as 963 independent new theorems.

[Original Lean CI](https://github.com/entropysherlock/westfall-optimization/actions/runs/43419080867) · [Mission 044 Lean CI](https://github.com/entropysherlock/westfall-optimization/actions/runs/43533991215) · [Research directory](research/)

### Scope and limitations

Formal verification applies to the statements and models in the linked Lean files. It does not establish mathematical novelty, verify the entire browser solver, or prove commercial performance advantages. The full AutoCut bit-complexity and memory bounds remain unestablished; the broader independence-two cut-counting conjecture remains open. Independent specialist review of novelty is still needed.

## Installation and reproducibility

```bash
# Python package and tests
python -m pip install -e ".[test]"
python -m pytest

# Solve and independently verify a result
westfall-opt solve examples/paley11.json --mode sldp --certificate cert.json --out result.json
westfall-opt verify cert.json --instance examples/paley11.json

# Web application
cd website
npm ci
npm run typecheck && npm run lint && npm test
npm run build
```

For benchmark-specific commands, toolchains, and datasets, use the [ATLAS-032 reproduction guide](benchmarks/atlas-032/REPRODUCE.md). The optional FastAPI job service is implemented but **not deployed**; there are no hosted accounts, billing, or persistent jobs.

## Project structure

- [`website/`](website/) — Next.js site, Optimization Studio, frontend tests
- [`src/westfall_optimization/`](src/westfall_optimization/) — Python solvers, CLI, verification
- [`research/`](research/) and [`papers/`](papers/) — manuscripts, Lean developments, proof audits
- [`benchmarks/`](benchmarks/) — datasets, scripts, raw results
- [`docs/`](docs/) — architecture, deployment, formal verification, release notes

## About and licensing

**Caleb Westfall · Independent Researcher**

Developed with AI-assisted research and programming. The project does not claim university affiliation, research funding, peer-reviewed acceptance, or independent confirmation of all originality claims.

The repository currently contains the **GNU General Public License v3.0** ([LICENSE](LICENSE)), **not AGPLv3**. No separate commercial licensing agreement is published. The older [license-pending document](LICENSE-PENDING.md) is outdated.

---

<div align="center">

[**Optimization Studio**](https://entropysherlock.github.io/westfall-optimization/studio/) · [Full Website](https://entropysherlock.github.io/westfall-optimization/) · [Verification](https://entropysherlock.github.io/westfall-optimization/formal-verification/)

</div>
