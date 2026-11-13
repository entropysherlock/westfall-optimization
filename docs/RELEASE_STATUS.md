# Release 0.2 — research integrity status

Updated: 2026-11-12

## Actually released

- Original full Discovery 022 written research report and a separately
  identified editorial presentation under the Westfall theorem name.
- Historical Discovery 019 paper and original computational tools.
- Independent **exhaustive small-n** integer-weight reference checker
  with tests, distinct from the unpublished AutoCut code.
- Six foundational Lean lemmas passed the pinned kernel build and automated
  axiom audit in GitHub Actions run 43359133881. This is not the flagship proof.
- Separate benchmark reporting (historical 018/019 dashboard versus reported
  022 comparison).
- Updated citations, grant draft, site link checks and metadata.
- Targeted prior-art analysis under `docs/novelty-audit.md`.

## Still incomplete

- Original Fable AutoCut `exact.py`, `falsify22.py`, `bench22.py`,
  raw `results22.jsonl` and other local `discovery-022` files have not
  been recovered. Do NOT label these public or independently reproducible.
- Discovery 021 full source report/code not yet publicly located.
- Lean formalization of the intrinsic parameter, partition-recovery,
  AutoCut exactness, complexity and ETH transfer.
- Specialist novelty comparison, specialized exact LOP baseline.
- License selection requires the owner's explicit decision.
- Next.js upgraded to 16.4.6: the verified npm audit has **zero high** findings,
  but 8 moderate and 4 low remain; see `docs/security.md`.

A failed CI workflow is a failed check, not proof that a theorem is false.
A passing CI workflow on foundations does not certify the main theorem.
