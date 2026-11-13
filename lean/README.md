# Lean 4 formalization — Westfall Optimization

This is the beginning of a **separate, mathematical proof project**, not
a Lean verification of the flagship theorem.

- Toolchain: Lean 4.32.0 with matching pinned Mathlib release.
- Source: `Westfall022/Foundations.lean`.
- Initial scope: elementary finite weak-majority cut facts, **not** the
  partition-recovery algorithm or its complexity.
- The GitHub workflow `Lean Foundations` is the reproducibility gate.
  Check its actual latest conclusion before claiming a machine-verified lemma.

Run locally:

```bash
cd lean
lake update
lake exe cache get
lake build
lake env lean Westfall022/Foundations.lean
```

Audit the exact theorem statement and `#print axioms` output. A successful
foundations build does not establish correctness of Discovery 022.
See [verification protocol](../docs/formal-verification.md).
