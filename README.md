# Westfall Optimization

**Exact weighted linear ordering with block-localized exclusion dynamic programming and independently checkable optimality certificates.**

Westfall Optimization is an independent research initiative led by Caleb Westfall. It is not a company, institute or university group, and it has no external funding, publications or endorsements at this time.

- **Website (static, GitHub Pages):** https://entropysherlock.github.io/westfall-optimization/ — live only once Pages is enabled; see [docs/deployment.md](docs/deployment.md)
- **Manuscript (not peer-reviewed):** [papers/square-root-block-localization-v2.md](papers/square-root-block-localization-v2.md)
- **Research records:** [research/discovery-019/](research/discovery-019/) (Discovery 015–019 reports and original code)

> **Status.** The main theorem is proved in an internal manuscript and rated *Level 3 (provisional)*. Level 3 is this initiative's own internal classification, **not** an external academic endorsement. Nothing here has been peer-reviewed.

## What is in this repository

| Component | Path | Evidence |
|---|---|---|
| Python package `westfall_optimization`: BLX 2.0 portfolio, exclusion DP (SLDP), subset DP, local search, HiGHS MILP wrapper | `src/westfall_optimization/` | unit-tested against brute force |
| Exact certificate generator and **integer** verifier (input binding, tamper rejection) | `src/westfall_optimization/certificates/` | unit-tested |
| Square-root block-localization theorem: \|S_K\| ≤ (n+1)·P(2K+b²) ⇒ poly(n)·2^O(b+√K) | `papers/` | proved in manuscript, provisional |
| Benchmark logs (Discoveries 018–019) | `benchmarks/data/` | raw experimental logs |
| Static research website (Next.js) | `website/` | built and tested in CI |

### What the website does — and does not — run
GitHub Pages serves static files only; it **cannot run Python**. The website therefore contains:
- a **browser engine** (TypeScript subset DP and exclusion DP with a trivial or block-table bound, n ≤ 26). It is labeled as such and is *not* the BLX implementation;
- **preset instances** whose results and certificates were produced by the real Python BLX 2.0 solver (`scripts/build_site_data.py`);
- a **BigInt TypeScript port of the exact verifier**, which re-checks those certificates in the browser.

To run BLX itself, use the Python package below.

## Install

```bash
git clone https://github.com/entropysherlock/westfall-optimization
cd westfall-optimization
python -m pip install -e ".[test]"      # Python ≥ 3.10, numpy, scipy (HiGHS)
python -m pytest                        # 15 tests
```

## Quickstart

```bash
# Solve with the automatic BLX 2.0 portfolio
westfall-opt solve examples/paley11.json

# Force the exclusion-DP route and write an exact certificate
westfall-opt solve examples/paley11.json --mode sldp --certificate cert.json --out result.json

# Independently verify the certificate against the instance (exit code 1 if rejected)
westfall-opt verify cert.json --instance examples/paley11.json
```

Input formats: JSON `{"matrix": [[...]]}` (skew-symmetric A, a_ij = −a_ji) or a raw `.npy`; `westfall-opt lolib PATH` reads LOLIB files.

```python
import numpy as np
from westfall_optimization import solve, perturbed_paley
A = perturbed_paley(11)
res = solve(A, mode="auto")
print(res["status"], res["route"], res["OPT"], res["order"])
```

Statuses: `PROVED_OPTIMAL`, `BEST_FOUND`, `UNRESOLVED`, `CERTIFICATE_REJECTED`.

## Verification walkthrough
1. A certificate lists the instance (scaled to integers by a power-of-two D), the claimed order and value, the block bound data, and every excluded DP state with the integers that justify its exclusion.
2. `verify` recomputes everything with exact Python integers: the objective of the order, each suffix bound, and each exclusion inequality f(S)+r(S)+U(V∖S) < L.
3. With `--instance`, it also checks that the certificate is about *that* instance (binding); an edited matrix is rejected.
4. Any single tampered field is rejected (see `tests/test_certificates.py` and the website's Verification Center).

Exact certificate checking is integer arithmetic re-verification of one run. It is **not** equivalent to formal verification in a proof assistant such as Lean. See [docs/certificates.md](docs/certificates.md).

## Benchmarks
Raw logs live in `benchmarks/data/`; the website dashboard is generated from them by `python scripts/build_site_data.py`. Results are mixed and are reported as such:
- favorable: structured block families where BLX proves optimality and a 60 s generic MILP did not;
- unfavorable: many LOLIB instances, where generic MILP (HiGHS) is faster;
- unresolved instances are listed explicitly.

BLX is **not** claimed to be universally faster than MILP. No specialised LOP branch-and-cut solver has been benchmarked yet. See [benchmarks/README.md](benchmarks/README.md).

## Website development

```bash
cd website
npm ci
npm run dev                 # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build   # static export in website/out
```

## Prior art (selection)
- Karpinski & Schudy (ISAAC 2010): weighted FAST in O*(2^O(√OPT)); the closest technique.
- Feige (2009): n^O(1)·2^O(√k) for unweighted FAST.
- Stein & Andres (ICML 2024): polynomial-time partial optimality via improving maps.
- Akbari & Escobedo (2023): approximate Condorcet partitioning for large Kemeny instances.
- LOP branch-and-cut (Grötschel–Jünger–Reinelt; Charon–Hudry) — not yet benchmarked here; the most important missing comparison.

The website's research page discusses the relationships. Novelty has not been independently assessed.

## Documents
- [docs/architecture.md](docs/architecture.md) · [docs/certificates.md](docs/certificates.md) · [docs/deployment.md](docs/deployment.md)
- [docs/grant-application-draft.md](docs/grant-application-draft.md) (draft; nothing submitted)
- [CONTRIBUTING.md](CONTRIBUTING.md) · [CITATION.cff](CITATION.cff)

## License
**Pending.** No license has been chosen yet; see [LICENSE-PENDING.md](LICENSE-PENDING.md). Until one is added, all rights are reserved by the author.
