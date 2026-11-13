# Website dependency security review

This site uses Next.js and React and is deployed as a static GitHub Pages
export. Static hosting reduces server-side execution exposure but does not
remove dependency supply-chain or browser risks.

During the November 2026 release audit, `npm ci` reported **12 dependency
audit findings (4 low, 7 moderate, 1 high)**. An npm install log is not a
vulnerability assessment; the transitive package paths and available
non-breaking fixes must be identified with `npm audit --json`.

Safe remediation process:

1. Run `cd website && npm ci && npm audit --json > audit.json` in a trusted
   environment.
2. Review the exact affected packages/advisories and whether code reaches the
   exported client or development/build processes.
3. Upgrade targeted dependencies in a branch; do not blindly use
   `npm audit fix --force` to introduce unreviewed breaking changes.
4. Re-run `npm ci`, typecheck, lint, unit tests and production export.
5. Document residual findings and their relevance.

The downloaded JSON audit artifact identified the **high-severity** findings in a nested `node_modules/next/node_modules/postcss` dependency (a version at or below 8.5.22) and additional moderate/low issues in transitive `minimatch`, `@typescript-eslint`, and older nested KaTeX versions. The audit reports that a clean automatic repair of the Next.js chain may require a major Next.js version change; that migration has not been performed or tested. See [the GitHub audit workflow](https://github.com/entropysherlock/westfall-optimization/actions/runs/43358932520) and its JSON artifact.

No claim that the 12 findings have been fixed is made here. The independent
site-link checker is a quality gate, not a security scanner.
