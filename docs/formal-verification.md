# Discovery 022 — Formal Verification Protocol

**Status on November 12, 2026: incomplete.**

The public repository does **not** yet contain a completed Lean 4 proof of Discovery 022. The research workflow has proposed a Colab foundation module, but no successful pinned clean-build evidence for that module was supplied for inclusion here.

## Verification layers

1. **Definitions.** Formalize finite weighted ordering, permutations, weak-majority cuts with tied pairs counted, ordered partitions and \`K0\` with the threshold and floor conventions from the report.
2. **Localization.** Kernel-check the weighted exchange argument and the optimal-prefix cut bound.
3. **Counting.** Formalize the finite combinatorial encoding and integer-partition count.
4. **Partition recognition.** Model the candidate cut DAG, shortest paths, admissibility, soundness, completeness, parameter minimization and floor treatment.
5. **Exactness.** Prove the algorithm's output equals the true maximum of the finite ordering objective. Do not substitute unrestricted enumeration for the described algorithm.
6. **Complexity.** Track states and arithmetic operations, then prove the parameterized asymptotic bound in a stated input model.
7. **Lower bound.** Distinguish a standalone ETH formalization from an explicit theorem assumption based on published complexity reductions.

## Acceptance criteria

- Lean source states the **original** theorem (not a weakened reformulation).
- Pinned Lean/Mathlib toolchains and clean reproducible builds.
- No \`sorry\`, \`admit\`, or undocumented theorem-specific axioms.
- Full \`#print axioms\` report and human audit of statement-to-manuscript correspondence.
- Build logs and proof source committed under a dedicated \`lean/\` or \`formal/\` directory.
- An independent kernel check, not just an editor success message.
- An honest scope label for every theorem.

## Not the same thing

The project's existing Python/TypeScript integer-certificate verifier rechecks optimality of supported BLX instances. It **does not** machine-check the general Discovery 022 theorem or the asymptotic complexity proof.

Lean verification cannot establish **novelty**. Literature comparison and scholarly evaluation remain separate tasks.
