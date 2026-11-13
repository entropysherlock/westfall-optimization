# Westfall Structural Optimization Theorem — Discovery 022 (provisional)

**Research lead:** Caleb Westfall  
**Date:** November 12, 2026  
**Public theorem name:** Westfall Structural Optimization Theorem  
**Partition recognition result:** Westfall Partition Recovery Theorem  
**Proposed paper title:** Automatic Structural Decomposition for Exact Weighted Linear Ordering  
**Status:** Written-proof research candidate; **not** peer-reviewed, **not** Lean-verified, and **not** independently established as novel.

> This is a public, editorial summary of the original \`WESTFALL_Discovery_022_Report.md\` supplied in the research conversation. The original report's implementation, test suite and detailed benchmark logs were reported on a local, **not pushed** branch named \`discovery-022\`. This summary is not a claim that its numerical results have been independently reproduced from public code.

## The weighted ordering problem

For a real skew-symmetric \(n\times n\) matrix \(A\), maximize

\[
F_A(\pi)=\sum_{r<s}a_{\pi_r\pi_s}
\]

over permutations \(\pi\).

For an ordered partition \(\mathcal B=(B_1,\ldots,B_m)\), set \(b=\max_i|B_i|\). Discovery 021 defines the cross-pair gap-free localization quantity

\[
K_0(\mathcal B)=\min_{\tau>0}\bigl[N^-+Z(\tau)+\lfloor X/\tau\rfloor\bigr]
\]

with the threshold \(\infty\) also considered, where \(N^-\) is the number of negative cross-block margins in the given block order, \(X\) is their total absolute magnitude, and \(Z(\tau)\) counts cross-block margins in \([0,\tau)\). Only finitely many distinct positive margins need be considered as thresholds.

**Robust Condorcet parameter:**

\[
\lambda(A)=\min_{\mathcal B}\{b(\mathcal B)^2+3K_0(\mathcal B)\}.
\]

**Westfall Structural Optimization Theorem (proposed):** An exact algorithm takes **only the matrix \(A\)**, determines its optimum, and recovers a minimizing ordered partition with

\[
T(A)=\operatorname{poly}(n)\,2^{O(\sqrt{\lambda(A)})}.
\]

A computational input model must be stated precisely for arbitrary real coefficients: bit-complexity results require rational/input-encoding assumptions, or a separate unit-cost real-arithmetic model.

## Reported mathematical results

1. **Optimal-prefix localization.** In the weak majority digraph, a cut counts outside-to-inside pairs \((w,u)\) with \(a_{wu}\ge0\), including ties. Every prefix of every optimal permutation is claimed to have cut at most \(\lambda(A)\).
2. **Cut counting.** If \(\lambda(A)\le k\), at most \((n+1)P(3k)\) low-cut subsets occur, where \(P(M)=\sum_{j\le M}p(j)\).
3. **Westfall Partition Recovery Theorem (automatic partition recognition).** A shortest-path search over a DAG of low-cut prefix sets is claimed to decide \(\lambda(A)\le k\) and recover a minimum-\(\lambda\) partition within \(\operatorname{poly}(n)2^{O(\sqrt k)}\) time.
4. **Partition-free exactness.** Repeatedly doubling \(k\), combined with a restricted cut-DP, is claimed to find the globally optimal order with the structural bound above.
5. **Comparison to classical parameters.** The report claims \(\lambda\le1+18\,C^*\) in Karpinski–Schudy's normalized weighted FAST model.
6. **ETH bound.** A claimed \(2^{o(\sqrt\lambda)}\) exclusion under ETH is derived from an existing reduction. The reduction transfer requires independent audit.
7. **Search/certification separation.** A banded family is claimed to admit optimal cut-width at most six but to have \(\lambda=\Theta(n^{2/3})\), explaining why finding an optimum can be easier than certifying it with this particular partition parameter.

The above are **claims in a complete written report**, not theorems currently checked by Lean's kernel.

## How the central recognition argument works

A minimizing partition is said to have block-boundary cuts of size \(\le K_0\), small enough to appear among the enumerated \(k\)-cuts. Candidate boundaries are connected by edges that introduce at most \(b\) vertices. For each threshold \(\tau\), an edge receives the total cross-block threshold cost incurred by the new block. Shortest paths recover the lowest real cost; taking its floor is claimed to give the exact \(K_0\) component. One verifies \(b^2+3K_0\le k\) before accepting a partition. The optimum-order DP can then stop at the first threshold satisfying the recognition condition.

The closest antecedent is the **\(k\)-cut enumeration and dynamic program of Fomin–Pilipczuk**. What is potentially new is the parameter and the second search recovering a minimum structural witness; the core cut-DP is not claimed as original.

## Reported experiments (not independently replicated from public source)

- 650 small instances checked with exhaustive enumeration, no violations reported.
- AutoCut prototype: **7 of 20** instances certified within resource limits.
- Existing BLX 2.0: **20 of 20**.
- Packing SLDP: **20 of 20**.
- AutoCut slower on every instance it solved; the result is theoretical rather than a practical solver speed advance.
- Reported code has floating-point prototype limitations; the integer reference implementation covers only small cases.

## Open verification requirements

- Publish the full source report and prototype/test files from the local branch, rather than asserting public reproducibility now.
- Lean-check the exact mathematical statements and their dependencies, including \(K_0\), the counting bound, soundness/completeness of recognition, exactness, and complexity.
- Review the ETH transfer and the stated computational model.
- Compare the recognition theorem closely with Fomin–Pilipczuk (2013), width-based ordering algorithms, and Condorcet decomposition results.
- Add a specialized LOP branch-and-cut baseline with pinned environments and multiple seeds.

## Key prior art

- Fomin & Pilipczuk, *Subexponential Parameterized Algorithm for Computing the Cutwidth of a Semi-Complete Digraph* — https://arxiv.org/abs/1301.7314
- Karpinski & Schudy, weighted FAST subexponential algorithm — https://arxiv.org/abs/1006.4396
- Kawashima & Sukegawa, Condorcet-type decomposition — https://arxiv.org/abs/2609.19593
- Barbero, Paul & Pilipczuk — https://arxiv.org/abs/1706.00617
- Phung & Hamel — https://arxiv.org/abs/2506.15097

**Research status:** This summary has not undergone peer review or independent novelty certification. Consult the Lean verification record for the precise scope of any machine-checked claims.
