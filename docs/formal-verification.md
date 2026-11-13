# Structural decomposition theorem: formal verification protocol and status

**Status (November 13, 2026): eight flagship declarations kernel-checked** on branch `formal/westfall-theorem`,
commit `5de1b5b60d770a6d3bf447665576e5f92ff2e334`. The GitHub Actions *Lean Foundations* workflow
[run 43419080867](https://github.com/entropysherlock/westfall-optimization/actions/runs/43419080867) succeeded, and its
axiom audit covered 963 declarations, all within `propext`, `Classical.choice` and `Quot.sound`. There is no `sorry`,
`admit`, `native_decide` or user axiom.

The full development lives on the research branch. `main` still contains only the six foundational lemmas in
`lean/Westfall022/Foundations.lean`, to keep the website branch light. The research branch is not merged into `main`.

## Verified flagship declarations

| # | Declaration | Content |
|---|---|---|
| 1 | `k0_exchange_localization` | I_𝓑(S) ≤ R_𝓑(π*) ≤ K₀(𝓑) for every partition, optimal ordering and prefix |
| 2 | `optimal_prefix_width_bound` | every optimal prefix has weak-majority cut ≤ λ(A) |
| 3 | `cut_count_bound` | λ(A) ≤ k ⇒ #k-cuts ≤ (n+1)·P(3k) |
| 4–6 | `partition_recovery_sound/complete/minimal` | the recognizer is sound and complete, and returns a partition attaining λ(A) |
| 7 | `autoCut_correct` | AutoCut returns OPT(A), an optimal ordering, a minimizing partition, and λ ≤ k with (k = 1 or k < 2λ) |
| 8 | `autoCut_complexity` | the executable `autoCutC` equals `autoCutX`, and its counted cost is ≤ 1 728 000 (n+1)¹⁸ 2^{45(⌊√λ⌋+1)} |

## Scope of the eighth theorem

- The cost is counted by a cost semantics (a step-counting monad). The executable is the value projection of the same
  program, so the counted program and the program that runs are one term.
- Every collection operation charges one step per element visited, deduplication is charged quadratically, and table
  lookups are linear scans.
- Rational arithmetic is unit cost. Every doubling round is charged: aborted, rejected and accepted.

**Not established:**
- the manuscript's sharper `poly(n)·P(6λ)²` form;
- bit complexity;
- a complete memory bound;
- machine verification of the declared per-operation charges against compiled execution semantics.

Kernel verification does not establish novelty or practical superiority. Details are in `lean/MISSION_025_REPORT.md`
and `lean/FORMALIZATION_STATUS.md` on the research branch.

## Relationship to the website and the Python package

- The **browser solvers** in the Optimization Studio are TypeScript programs, not the Lean executable. The browser
  AutoCut port reproduces the Lean executable's outputs exactly on all 103 completed archived instances. This is tested
  in `website/tests/autocut.test.ts`, not proved.
- The **Python BLX solver** and its exact certificates are independent of the Lean development.

## Acceptance criteria applied

- The Lean source states the theorem without weakening it. Modelling choices are documented in the semantic audit.
- Pinned Lean and Mathlib toolchains, and clean reproducible builds in GitHub Actions.
- No `sorry`, `admit` or theorem-specific axioms, with a full `#print axioms` report.
- An honest scope label for every statement.
