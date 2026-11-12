# Contributing

Thank you for your interest. Westfall Optimization is an independent research initiative led by Caleb Westfall.

**Note:** the license is still pending (see LICENSE-PENDING.md). Please open an issue before sending substantial code so the licensing of contributions can be agreed.

## Most valuable contributions
1. **Mathematical review** of `papers/square-root-block-localization-v2.md` — errors, gaps, and missing prior art. Please open an issue with the section and line.
2. **Counterexamples** to any stated bound, with the instance file.
3. **Benchmarks** on new instance families, with raw logs, environment and time limits.

## Development
```bash
python -m pip install -e ".[test]" && python -m pytest
cd website && npm ci && npm run typecheck && npm run lint && npm test && npm run build
```

## Rules
- Never hand-edit benchmark outcomes; regenerate from logs with `scripts/build_site_data.py`.
- Keep claims labeled: proved in manuscript / tested / observed / provisional / future.
- Do not commit secrets, tokens or credentials.
