<div align="center">

# WESTFALL Optimization

### Structural Algorithms · Exact Optimization · Verifiable Results

**An AI-assisted, independent mathematical research and software program for weighted ordering, sequencing, ranking, and combinatorial optimization.**

### [🌐 Explore the Website](https://entropysherlock.github.io/westfall-optimization/) · [🚀 Launch Optimization Studio](https://entropysherlock.github.io/westfall-optimization/studio/)

[Formal Verification](https://entropysherlock.github.io/westfall-optimization/formal-verification/) · [Benchmarks](benchmarks/atlas-032/RESULTS.md) · [Research](research/) · [Documentation](https://entropysherlock.github.io/westfall-optimization/docs/)

</div>

---

## At a glance

WESTFALL Optimization combines mathematical research on **structural decomposition and parameterized algorithms** with practical software for finding and checking high-quality or provably optimal orderings. Its tools include the **ATLAS** browser solver, the Python **BLX** engine, **AutoCut**, and Lean-formalized mathematical foundations.

| Evidence-backed milestone | Result |
|---|---|
| **ATLAS-032 exact benchmark** | **85/88** instances proved optimal; HiGHS 1.16.0 proved **83/88** on the same test set, both with a 30-second limit and zero relative MIP gap |
| **Real-world benchmark family** | **50/50** LOLIB input-output instances proved optimal by ATLAS-032, with 0 disagreements against independently proved values |
| **40-item weighted ordering** | Seed-1 near-transitive instance: certified backward penalty **319**, objective **1,647**, recorded ATLAS runtime **1.287 s** |
| **Original AutoCut formalization** | **8 flagship** Lean kernel-checked declarations, including correctness and a unit-cost running-time upper bound |
| **Later formal mathematics** | Additional kernel-checked cut-counting theorems in WESTFALL-040, -041, and -044, with source and audit records |
| **Optimization Studio** | Browser-based input, solver execution, result inspection, verification, and export |

**Benchmark scope matters.** These are results on the named, reproducible instances and hardware, **not** evidence that WESTFALL generally outperforms HiGHS, Gurobi, Hexaly, or specialized linear-ordering solvers. The 40-item example is synthetic; its recorded runtime is not a customer deployment or an estimate of money saved.

**Evidence:** [ATLAS-032 results](benchmarks/atlas-032/RESULTS.md) · [ATLAS-032 report](benchmarks/atlas-032/ATLAS_032_REPORT.md) · [Raw ATLAS results](benchmarks/atlas-032/results_E.json) · [Benchmark methodology](benchmarks/atlas-032/REPRODUCE.md)

## Try the Optimization Studio

**[Open the live Studio →](https://entropysherlock.github.io/westfall-optimization/studio/)**

The Studio is a client-side optimization workspace for weighted pairwise ordering problems. It supports CSV, TSV, JSON, and edge-list input; explicit cost/benefit interpretation; validation; multiple exact and heuristic solution methods; progress and cancellation; and exportable results. Exact methods have instance-size and resource limits. The browser implementation is **TypeScript**, not the Lean proof executable.

The repo also contains a Python solver package with BLX 2.0, exclusion and subset dynamic programming, MILP integration, local search, and independently checkable exact certificates.

**[Software release status](docs/RELEASE_STATUS.md)** · **[Studio engineering benchmarks](benchmarks/studio-039/README.md)** · **[Software architecture](docs/architecture.md)**

## Mathematical research and formal verification

The program includes multiple distinct research lines. **The original eight flagship declarations are not the total number of verified Lean results across the repository.** Avoid combining unrelated audits into a single inflated theorem count; the tracks, scopes, and supporting declarations must be distinguished.

| Research track | What is established | Evidence |
|---|---|---|
| **WESTFALL-022 / AutoCut** | Lean-checked structural bounds, partition recovery, AutoCut correctness, and an explicit operation-count bound under a declared unit-cost arithmetic model | [Verification protocol](docs/formal-verification.md) · [CI](https://github.com/entropysherlock/westfall-optimization/actions/runs/43419080867) |
| **WESTFALL-040** | Lean-checked semicomplete digraph cut-count bound `N_k ≤ (n+1) H(c+k)` | [Formal status](research/westfall-040/FORMAL_STATUS.md) |
| **WESTFALL-041** | Lean-checked defect and shifted-hyperbola bounds for h-semicomplete digraphs | [Formal status](research/westfall-041/FORMAL_STATUS.md) |
| **WESTFALL-044** | Lean-checked sharpened bound `N_k ≤ (n+1) 4^h H(c+k)²` | [Five audited declarations and CI](research/westfall-044/VERIFICATION.md) · [CI](https://github.com/entropysherlock/westfall-optimization/actions/runs/43533991215) |
| **WESTFALL-045** | Paper-level algorithm audit and independent small-instance experiments; not a claim that the whole algorithm was formally verified | [Verdict](research/westfall-045/VERDICT.md) |
| **WESTFALL-046–047** | Pivot/core-decomposition and forward-model extremal research, including proved subresults, counterexamples to proposed proof approaches, and open conjectures | [046 report](research/westfall-046/REPORT.md) · [047 mission/results](research/westfall-046/MISSION047.md) |

For the first AutoCut research branch, the recorded axiom audit covered **963 Lean declarations**; this is *not* 963 independent flagship theorems. Later verification records establish additional results separately. See the [online formal verification page](https://entropysherlock.github.io/westfall-optimization/formal-verification/) for the original eight and the linked later mission reports for newer results.

**Still open or not established:** complete bit-complexity and memory bounds for AutoCut; a universally superior solver; independent priority/novelty assessment of every research claim; and the conjectured log-free cut-count bounds for the full independence-two class. The ATLAS-032 optimization methods are not themselves Lean-verified.

## Reproducible ATLAS benchmark

In the ATLAS-032 study, **88 identical instances** were run with a **30-second time limit**, **4-million-state ATLAS budget**, a **2-vCPU Intel Xeon 2.1 GHz / 8 GB RAM** machine, and **HiGHS 1.16.0 configured for exact MIP gap (0)**.

| Solver | Instances proved optimal |
|---|---:|
| ATLAS-031 | 47 / 88 |
| **ATLAS-032 final** | **85 / 88** |
| HiGHS MILP | 83 / 88 |

ATLAS was stronger on some dense/tie-heavy families; HiGHS was considerably faster on several LP-tight and real-world families. Three of the 35-item dense/tie-heavy ATLAS cases remained unproved within the limit. The report also records independent certificate checks, exact-optimum agreement, and known engineering limitations.

**[Inspect full per-instance results →](benchmarks/atlas-032/RESULTS.md)** · **[Read strengths, failures, and verification →](benchmarks/atlas-032/ATLAS_032_REPORT.md)**

## Repository map

| Directory | Contents |
|---|---|
| [`website/`](website/) | Next.js website, browser Optimization Studio, tests and frontend benchmarks |
| [`src/westfall_optimization/`](src/westfall_optimization/) | Python optimization engines, certificates, and CLI |
| [`research/`](research/) | Mathematical missions, Lean research projects, audits, experiments |
| [`papers/`](papers/) | Manuscripts and mathematical exposition |
| [`benchmarks/`](benchmarks/) | Reproducible results, scripts, and benchmark records |
| [`service/`](service/) | Tested FastAPI job service; **not deployed** |
| [`docs/`](docs/) | Architecture, verification, certificates, deployment, security, release notes |

## Getting started

```bash
# Python library, CLI, and tests
python -m pip install -e ".[test]" && python -m pytest
westfall-opt solve examples/paley11.json --mode sldp --certificate cert.json --out result.json
westfall-opt verify cert.json --instance examples/paley11.json

# Web Studio and test suite
cd website
npm ci
npm run typecheck && npm run lint && npm test && npm run check:links
npm run build
```

A self-hosted job API is implemented but needs deployment/configuration. Accounts, billing, and a persistent hosted jobs platform are **not currently offered**. See [deployment notes](docs/deployment.md) and [release status](docs/RELEASE_STATUS.md).

## Project status, authorship, and limitations

WESTFALL Optimization is developed by **Caleb J. Westfall, Independent Researcher**, with AI assistance in research and software engineering. It has no university affiliation, institutional funding, or claimed peer-reviewed acceptance. Formal proof checking establishes the specific statements and assumptions recorded in the respective Lean files; it does not by itself establish novelty, production readiness, or a general performance advantage.

**Licensing:** The repository's present root [`LICENSE`](LICENSE) contains the **GNU General Public License v3.0 (GPL-3.0)**. This is **not AGPL-3.0**. A separate commercial licensing agreement is not currently published here; commercial use under the applicable GPL terms is permitted. Licensing scope and third-party obligations should be reviewed before any dual-license offering. The older `LICENSE-PENDING.md` file is obsolete and should not be relied upon.

## References and further reading

- [Fomin & Pilipczuk — tournament/digraph k-cuts and layouts](https://arxiv.org/abs/1301.7314)
- [Karpinski & Schudy — subexponential weighted feedback arc set](https://arxiv.org/abs/1006.4396)
- [Feige — faster FAST](https://arxiv.org/abs/0911.5094)
- [Prior-art audit](docs/novelty-audit.md) · [Original discovery report](research/discovery-022/WESTFALL_Discovery_022_Report.md)

---

<div align="center">

**[Website](https://entropysherlock.github.io/westfall-optimization/) · [Optimization Studio](https://entropysherlock.github.io/westfall-optimization/studio/) · [Formal verification](https://entropysherlock.github.io/westfall-optimization/formal-verification/) · [GitHub research](research/)**

</div>
