# Grant-readiness assessment (Mission 040)

Two separate assessments, as requested. Scores are calibrated judgements on a 0–100 scale. They are not funding
predictions, and they are deliberately not inflated.

## 1. Scientific achievement — what has actually been proved

| Criterion | Score | Basis |
|---|---|---|
| Mathematical originality | 60 | Answers an explicitly posed open problem (FP 2013 §5). The argument is short and reuses FP's ingredients. The new step is counting under the hyperbola instead of by area. Provisionally new; not a new method of broad reach. |
| Proof rigor | 85 | Complete proofs. The core theorem is kernel-checked. The analytic estimate and the algorithms are human-proved only. |
| Formal verification | 70 | Theorem 1 is kernel-checked with standard axioms only. Theorem 2 and the algorithms are not formalized. |
| Reproducibility | 85 | Seeded tests, exhaustive small cases, pinned toolchain, hashes. |
| Independent validation | 25 | Only machine validation. No human expert has reviewed it. |
| Publication readiness | 55 | The manuscript is complete in substance. It needs specialist novelty confirmation, LaTeX, and a tightened n-dependence. |
| Algorithmic generality | 45 | Two tight algorithms (cutwidth, OLA) on semicomplete digraphs, plus weighted variants. Nothing yet beyond semicomplete digraphs. |

**Summary: a correct, apparently new, modest theorem with tight algorithmic consequences. It is not a Level-4 breakthrough.**

## 2. Grant credibility — what would make a skeptical committee take WESTFALL seriously

Current strengths a committee would credit:
* A verification-first pipeline. The draft in PR #10 was attacked rather than trusted: independent brute force,
  convention checks, and a separate formal proof in a different encoding.
* Honest negative results recorded. The analysis found no FAST improvement, no practical speed-up, a necessary
  hypothesis, and an Airy conjecture still unproved.
* Machine-checked core statement with an axiom audit.

What is missing, in order of value:
1. **An external expert's written confirmation** of novelty and correctness. This is the single biggest credibility gap.
2. **Peer-reviewed publication** of the note.
3. **Formalization of Theorem 2** (H(K) ≤ e^{2π√K}), so the full 2^{O(√k)} statement is machine-checked.
4. **A track record beyond one result.** For example, the sharp constant for k-cut counting, or an extension to digraphs of
   bounded independence number (Misra et al.'s setting, where Lemma 1 fails and a new idea is needed).
5. Clear separation of AI contribution, human contribution and verification, in the proposal and in the paper.

| Criterion | Score | Basis |
|---|---|---|
| Feasibility of future discoveries | 55 | The method is narrow. The open follow-ups are concrete and tractable (constants, bounded α, weighted OLA). |
| Research methodology | 75 | Strong: adversarial audit, exhaustive testing, formalization, honest scoping. |
| Credible milestones | 65 | Next 3–6 months: expert review, submission, Lean formalization of Theorem 2, bounded-α attempt. |
| **Overall grant credibility today** | **55** | Credible methodology with one modest verified result. It would rise substantially with an external review and a publication. |

**Use in a proposal:** present the result as a case study of a verification pipeline. Show a claim from an AI-assisted
draft being attacked, then confirmed exhaustively on small cases, then machine-checked. Do not present it as a
breakthrough.
