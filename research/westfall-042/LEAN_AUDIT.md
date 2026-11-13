# Mission 042: formal status audit

Inspected Mission 041 FORMAL_STATUS.md and Lean-related file layout. The source's reported build and axiom audits list rectangle lemma, shifted hyperbola inequalities, two counting branches, Conjecture 041-A, and h=0 specialization. Mission 040's core semicomplete counting theorem is reported Lean checked.

Not independently reproduced in this audit: a clean lake build on a pinned Mathlib environment, proof object inspection, the analytic H(K) upper bound, R_h bound, algorithm semantics and complexity, Theorem D/F, or the new deletion-distance theorem in GENERALIZATION.md.

The omission is material. A theorem's verified *Lean statement* is not an independent proof of an unstated algorithmic or asymptotic consequence.

Lean follow-up: formalize the subset restriction of back(X), the inherited reference-width lemma, the 2^b fiber counting argument, and the relationship to nonadjacency vertex cover. Run `lake build`, `lake env lean Audit041.lean`, and report actual kernel-checked declarations. Do not replace verified with 'source audited' based solely on repository logs.
