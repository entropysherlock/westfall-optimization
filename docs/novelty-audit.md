# Structural decomposition theorem — targeted prior-art audit

**Status:** preliminary novelty analysis, November 12, 2026.  
**Scope:** published statements and their reported techniques. **No originality certification.**

## Exact novelty claim under examination

For skew-symmetric weighted linear ordering, define the reported intrinsic
parameter

\[
\lambda(A)=\min_{\mathcal B}(b(\mathcal B)^2+3K_0(\mathcal B)).
\]

The report proposes:

- Every prefix of an optimal ordering has weak-majority cut at most λ.
- Given (k), a small-cut-state search recognizes (lambda(A)le k)
  **without a supplied partition** and recovers a minimizing partition.
- Combining recognition with an exact cut-DP yields time
  (operatorname{poly}(n)2^{O(sqrt{lambda(A)})}).

The specific potential new statement is the **Westfall Partition Recovery
Theorem** (Discovery 022, Theorem 3). The k-cut DP framework is not claimed
as original.

## Sources checked

| Existing publication | Established framework | Unsettled difference |
|---|---|---|
| [Fomin–Pilipczuk (ESA 2013)](https://arxiv.org/abs/1301.7314) | Subexponential k-cut enumeration and cut-based DP in semicomplete digraphs; FAST consequence | Does the proposed second shortest-path search compute a new intrinsic witness, or follow from an implicit width-recognition reduction? |
| [Karpinski–Schudy (2010)](https://arxiv.org/abs/1006.4396) | Classical square-root-OPT exact algorithms for tournament ranking | λ may be structurally smaller on some families, but the claimed improvement is a parameter-bound separation, not a faster benchmark result |
| [Arrighi–Fernau–de Oliveira Oliveira–Wolf (JCSS, August 2026)](https://doi.org/10.1016/j.jcss.2026.103777) | Completion of an Ordering in (O^*(2^w)) for interval width (w) of a supplied partial order; related ordering reductions and ETH results | Is a low-λ partition expressible as a small-interval-width partial order that can be found as efficiently? No reduction or separation has been proved |
| [Graph layouts on digraphs of bounded independence number (2023)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10287808/) | Structural generalization of k-cut counting/DP beyond tournaments | Distinct digraph class; verify whether recognition lemma is a known corollary of that framework |
| [Kawashima–Sukegawa (2026)](https://arxiv.org/abs/2609.19593) | Related Condorcet decomposition concepts | Exact (lambda) witness recovery remains to be compared theorem-by-theorem |

## What the literature search can establish

No direct statement defining precisely this (lambda) and recovering its
minimizing partition was identified in the searched sources. That is **not**
proof of novelty. Different parameter names or a reduction through partial
orders might subsume the claim.

### Mandatory comparison tasks

1. Write a formal mapping (or counterexample) between the 022 partition
   witness and interval-width partial orders in Arrighi et al.
2. Identify the minimum additional lemma beyond Fomin–Pilipczuk's k-cut
   state enumeration; isolate whether it is already an implicit shortest
   path construction.
3. Validate the stated bit complexity for rational weights and whether
   the (	au) threshold enumeration has polynomial arithmetic overhead.
4. Audit the exact ETH reduction under the report's (lambda) definition.
5. Produce a mathematical counterexample or proof if any claimed separation
   from the classical cost parameter fails.

**Verdict: promising originality candidate, not confirmed.** Formal Lean
verification can address correctness, not literature originality.
