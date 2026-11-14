# G. Outstanding risks

| Risk | Kind | Severity | Status / mitigation |
|---|---|---|---|
| The answer exists in prior work we did not find (a thesis, a survey, folklore remark, non-indexed preprint), especially given how short the proof is | Novelty | **High** | Searched FP 2013/2019, BPP 2017/2018, Misra et al. 2018/2023 (all still describe the gap as open), and general web/arXiv searches. Must ask a specialist (ideally Pilipczuk or Fomin) before any priority claim. |
| The partition estimate H(K) ≤ e^{O(√K)} is classical | Novelty (minor) | Low | No novelty claimed for Theorem 2; it is proved self-contained. Cite properly once located. |
| An error in Theorem 2 (analytic; not formalized) | Rigor | Low–medium | Each step re-derived; numerically consistent up to K = 20000. Formalizing it in Lean (Euler product is available in Mathlib) would close this. |
| An error in the algorithmic theorems (enumeration delay, stopping rule, OLA reduction) | Rigor | Low–medium | Short proofs; prototype validates the cutwidth algorithm on 300 instances. Lemma 4 (OLA width bound) is our own short proof; FP's Lemma 11 gives a similar bound. Not formalized. |
| Mismatch between the Lean statement and the paper statement | Formal | Low | Discussed in FORMAL_STATUS.md (orderings as linear orders; lower sets = prefixes; H via columns, cross-checked for K ≤ 15). A referee should read the 10-line formal statement. |
| Toolchain provenance | Formal | Low | Lean installed from the official release tarball; Mathlib v4.32.0 compiled from source; reproducible with standard `lake`. |
| Significance judged too small for a major venue | Publication | Medium | Position as a short note answering an explicit open problem with tight ETH consequences; do not oversell. |
| Exponent constants not optimized (n⁴ vs FP's n²; e^{2π√2·√k}) | Quality | Low | Stated as such; improvements are routine (kernelization / FP's DAG construction). |
| No independent human review | Process | **High** | Required before submission. Nothing in this package substitutes for it. |
| Confusion with PR #11 (Airy conjecture) | Communication | Medium | The conjecture is not used anywhere; keep the two strictly separate in any publication. |
