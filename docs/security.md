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
