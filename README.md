# Westfall Optimization

**Structural algorithms. Exact optimization. Verifiable results.**

Research-driven optimization software for weighted ordering problems (sequencing, ranking and prioritization driven by
pairwise costs or preferences), built on exact algorithms, structural decomposition and machine-checked proofs.

- **Website:** https://entropysherlock.github.io/westfall-optimization/
- **Optimization Studio (runs in the browser):** https://entropysherlock.github.io/westfall-optimization/studio/
- **Formal verification status:** https://entropysherlock.github.io/westfall-optimization/formal-verification/
- **Documentation:** https://entropysherlock.github.io/westfall-optimization/docs/

Westfall Optimization is an independent research and software initiative founded by **Caleb Westfall**. It has no
university or institute affiliation and no research funding, and it claims no peer-reviewed publication. Research and
software are developed with AI-assisted research and programming tools.

## Status — November 2026

| Component | Status |
|---|---|
| Westfall Structural Optimization Theorem: λ(A), partition recovery, AutoCut correctness | **Lean kernel-checked** (branch `formal/westfall-theorem`, commit `5de1b5b`, [CI run](https://github.com/entropysherlock/westfall-optimization/actions/runs/43419080867)) |
| AutoCut running time `poly(n)·2^{O(√λ)}` (≤ 1 728 000 (n+1)¹⁸ 2^{45(⌊√λ⌋+1)} operations) | **Lean kernel-checked**, in a declared unit-cost arithmetic model |
| Sharper `poly(n)·P(6λ)²`, bit complexity, memory bound | **Not established** |
| Novelty relative to prior cut-DP methods | **Not independently assessed** |
| Optimization Studio (browser solvers, exports, verification) | Released on the website. Unit, correspondence and end-to-end tests run in CI |
| Job service (`service/`) for the Python BLX solver | Implemented and tested; **not deployed** (needs a container host) |
| Commercial licensing, accounts, payments | **Not available**; the repository license is pending |

The eight flagship Lean declarations are listed with their source locations on the
[verification page](https://entropysherlock.github.io/westfall-optimization/formal-verification/). The browser solvers
are TypeScript programs, not the Lean executable. The browser AutoCut is tested for exact output equality with the Lean
executable on 103 archived instances (`website/tests/autocut.test.ts`).

### Negative results

- In the original report, the AutoCut prototype proved 7 of 20 benchmark cases, while BLX 2.0 and packing SLDP each
  proved 20 of 20.
- The verified AutoCut completed 103 of 119 adversarial instances within 3600 s; the other 16 hit the time limit.
- HiGHS MILP beats BLX on some published benchmarks.
- No comparison with a specialized linear-ordering solver has been made, so no claim of superiority is made.

## Repository layout

| Path | Content |
|---|---|
| `website/` | Next.js 16 static site and the Optimization Studio (`src/lib/studio`: parsing, model, solvers, AutoCut port) |
| `service/` | FastAPI job service: queue, time and memory limits, cancellation, API keys, rate limits |
| `src/westfall_optimization/` | Python package: BLX 2.0 portfolio, exclusion DP, subset DP, MILP, local search, exact certificates, CLI |
| `lean/` | Lean foundations on `main`. The full development is on branch `formal/westfall-theorem` |
| `papers/`, `research/` | Manuscripts and the original research records (historical file names kept for reproducibility) |
| `benchmarks/` | Raw benchmark logs for the historical BLX series |
| `docs/` | Architecture, deployment, security, certificates, verification protocol, release status |

## Running things

```bash
# Python solvers and certificates
python -m pip install -e ".[test]" && python -m pytest
westfall-opt solve examples/paley11.json --mode sldp --certificate cert.json --out result.json
westfall-opt verify cert.json --instance examples/paley11.json

# Job service
python -m pip install -e . -e "./service[test]" && python -m pytest service/tests
uvicorn westfall_service.app:app --port 8000 --workers 1

# Website and Studio
cd website && npm ci
npm run typecheck && npm run lint && npm test && npm run check:links
npm run build && npx playwright install chromium && npm run test:e2e
```

## Documentation

- [Architecture](docs/architecture.md) · [Deployment](docs/deployment.md) · [Security](docs/security.md) · [Release status](docs/RELEASE_STATUS.md)
- [Formal verification protocol](docs/formal-verification.md) · [Certificates](docs/certificates.md) · [Prior-art audit](docs/novelty-audit.md)
- [Original theorem report](research/discovery-022/WESTFALL_Discovery_022_Report.md) · [Square-root block localization](papers/square-root-block-localization-v2.md)
- [Grant application draft](docs/grant-application-draft.md) (**not submitted**) · [Contributing](CONTRIBUTING.md)

## Key prior art

- [Fomin & Pilipczuk: cut enumeration / FAST](https://arxiv.org/abs/1301.7314)
- [Karpinski & Schudy: subexponential weighted FAST](https://arxiv.org/abs/1006.4396)
- [Feige: Faster FAST](https://arxiv.org/abs/0911.5094)
- [Kawashima & Sukegawa: Condorcet structure](https://arxiv.org/abs/2609.19593)

## License

**Pending the project owner's decision.** Until a license is selected, all rights are reserved; public source visibility
is not a redistribution license. See [LICENSE-PENDING.md](LICENSE-PENDING.md).
