# Lean 4 formalization — Westfall Optimization

Kernel-checked formalization of Discoveries 021–022. **Seven of the eight
flagship declarations are proved** (exchange lemma, optimal-prefix width,
cut counting, partition-recovery soundness/completeness/minimality, AutoCut
correctness). The running-time theorem `autoCut_complexity` is **not**
formalized. See [FORMALIZATION_STATUS.md](FORMALIZATION_STATUS.md) for the
statement-by-statement correspondence table, the blockers and the errata.

- Toolchain: Lean 4.32.0 with matching pinned Mathlib release.
- Sources: `Westfall022/*.lean`; entry point `Westfall022/Main.lean`
  (`import Westfall022.Main`). `Foundations.lean` keeps the original six lemmas.
- The GitHub workflow `Lean Foundations` is the reproducibility gate.
  Check its actual latest conclusion before claiming a machine-verified lemma.

Run locally:

```bash
cd lean
lake update
lake exe cache get
lake build
lake build Westfall022.Main   # prints the axiom audit
```

Audit the exact theorem statement and `#print axioms` output. A successful
build establishes the formal statements in `FORMALIZATION_STATUS.md`, not
the running-time claim or novelty.
See [verification protocol](../docs/formal-verification.md).
