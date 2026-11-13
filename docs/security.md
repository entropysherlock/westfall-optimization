# Website dependency security review

The website is a **static GitHub Pages export**. This reduces server-side
runtime exposure but does not remove supply-chain/build-time vulnerabilities.

## November 2026 audit and remediation

| Verified npm audit | Low | Moderate | High | Critical | Total |
|---|---:|---:|---:|---:|---:|
| Initial Next.js 15.5.29, [audit run](https://github.com/entropysherlock/westfall-optimization/actions/runs/43358932520) | 4 | 7 | 1 | 0 | 12 |
| Upgraded Next.js 16.4.6 on `main`, [audit run](https://github.com/entropysherlock/westfall-optimization/actions/runs/43360820484) | 4 | 8 | **0** | 0 | 12 |

The initial high-severity finding was in a nested, old
`node_modules/next/node_modules/postcss` copy. The first isolated
`security/postcss-override` experiment passed tests but did **not** change
the dependency graph or audit count, so it was **not merged**.

A second isolated `security/next16-upgrade` experiment upgraded Next.js
and its ESLint configuration and passed dependency installation, typecheck,
lint, tests, internal link checking and the production build. Only its four
validated application files were applied to `main`, in
[commit 5471cb4](https://github.com/entropysherlock/westfall-optimization/commit/5471cb4096494b7b9a75778613e8bbad79cd1e88).

The public branch's own audit confirms **zero high-severity findings**.
This does not mean all vulnerabilities are fixed: **eight moderate and four
low** remain in the current audited graph, including portions of the math
rendering and linting dependency chain.

## Remaining controls

1. Inspect the current JSON audit artifact for exact affected package paths,
   distinguish build-time from shipped-browser exposure.
2. Resolve moderate and low findings with separately tested dependency upgrades
   rather than using `npm audit fix --force` blindly.
3. Keep `npm ci`, TypeScript, ESLint, unit tests, site link checks and
   static export green after every update.
4. Track work in [security issue #3](https://github.com/entropysherlock/westfall-optimization/issues/3).

The link checker is a quality gate, not a security scanner.

## Mission 026: Studio and job service (November 13, 2026)

**Dependency audits.**
- npm audit on the product branch, after adding `@playwright/test`: 0 critical, 0 high, 8 moderate, 4 low. This is
  unchanged from `main`.
  - The moderate findings are all in the ESLint / typescript-eslint / minimatch chain, which runs at development and
    build time only.
  - The low findings are in KaTeX and its remark/rehype wrappers. KaTeX renders only trusted mathematics written in the
    site's own source code and manuscripts. The Studio never passes user input to KaTeX.
- `pip-audit` on the service dependencies (FastAPI 0.162.5, Uvicorn 0.54.0, NumPy 2.5.3, SciPy 1.18.1, Pydantic,
  Starlette) reported no known vulnerabilities.

**Studio (browser) controls.**
- Input is parsed as data, never evaluated.
- Size limits: 2 MB, 400 items, 80 000 edges, 30 significant digits per value, |value| ≤ 10¹².
- Each solver has an explicit size limit, and the exclusion DP has a state budget.
- Solving runs in a Web Worker with a user time limit and a watchdog that terminates the worker. Cancellation
  terminates the worker.
- Downloads are generated locally as Blobs. There are no cookies, no analytics and no third-party scripts.

**Job service controls.**
- Request bodies are capped at 2 MB, with `Content-Length` required, and instances are validated before queueing.
- Each job runs in a separate process with a hard time limit (≤ 300 s) and `RLIMIT_AS`. Concurrency and queue length
  are bounded (`503` when full).
- Per-client sliding-window rate limits apply to requests and to job submissions.
- API keys are stored only as SHA-256 digests, and jobs are visible only to the client that submitted them.
- CORS is restricted to configured origins.
- Job data is held in memory only and purged after the retention period. The container runs as a non-root user.

**Remaining risks before production.**
- The service has not been penetration tested.
- Rate limits are per process and in memory.
- There is no TLS termination in the container; it requires a reverse proxy.
- API keys are shared secrets, with no rotation tooling.
- Denial of service is mitigated, not prevented, at the application level, and needs platform quotas.
