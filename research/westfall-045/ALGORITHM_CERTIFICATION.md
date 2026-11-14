# Mission 045 — Independent algorithmic correctness audit
Date: 2026-11-13/14 (Arizona time). Status: **paper proof completed; algorithms are NOT Lean formalized**.

## Formal input to this audit
Mission 044's kernel-checked theorem `Westfall044.card_kcuts_le_defect_sharp` says: for a loopless h-semicomplete digraph D with n vertices and a reference ordering of width ≤c,

    N_t(D) ≤ (n+1) 4^h H(c+t)^2.

The theorem counts ordered cuts X with back_D(X) ≤t, where back_D(X) is the number of arcs from outside X into X. Both antiparallel arcs and missing unordered pairs are permitted, subject to ≤h missing pairs per vertex.

## Lemma A — polynomial-delay enumeration by directed min cut
Fix any order of the vertices. A partial membership assignment consists of A ⊆ X and B ∩ X=∅, A∩B=∅. The minimum of back_D(X) over these extensions is precisely the minimum directed s–t cut in the graph with super-source s connected to all vertices in B and super-sink t reached from all vertices of A, with capacities M=m+1 on forced edges, and unit capacities on original arcs. Source side is outside X; sink side is X. If A or B is empty, minimum is zero. For nonempty A,B, any feasible X has finite capacity ≤m<M, so a minimum cut never cuts a forced edge. This proves equivalence.

An augmenting-path implementation can halt after k+1 augmentations (all unit original arcs, integer flow), returning infeasible if value>k; it need not compute a larger min cut. A conservative adjacency-matrix implementation costs O((k+1)n²) per oracle call (or a polynomial bound when k is large). In the depth-n binary assignment tree, retain a node only if it has a feasible k-cut extension. Every retained internal node has a retained child; all leaves represent actual k-cuts. Thus at most O(n(N_k+1)) visited nodes and O(n) oracle calls per output even if truncated after T+1 outputs.

## Theorem B — directed cutwidth decision and reconstruction
For a YES-instance of cutwidth ≤k, the reference ordering can be chosen with c≤k. Thus

    N_k ≤ T = (n+1) 4^h H(2k)^2.

Enumerate k-cuts using Lemma A. If more than T cuts appear, return NO: this is sound by contrapositive of the kernel-checked counting theorem, and the algorithm does not need to know a reference ordering. Otherwise enumerate the entire family ᶜ of k-cuts. Construct DAG vertices X∈ᶜ and arcs X→X∪{v}, when both endpoints belong to ᶜ. A path ∅→V corresponds exactly to an ordering of all vertices with every prefix width≤k. Breadth-first search therefore decides the problem and reconstructs the ordering. For k=0 and h=0, H(0)=1; no exceptional case is needed.

With at most T+1 outputs, O(n(T+1)) oracle calls and O((k+1)n²) per oracle, time is

    O((k+1) n³ (T+1) + n²(T+1))
    ⊆ O((k+1)n⁴ 4^h H(2k)^2)
    = 2^{O(√k+h)} n^{O(1)},

using the paper-verified analytic H bound. Cut states stored as n-bit vectors use O(n(T+1)) bits plus indexing overhead. k can be capped at m≤n(n−1) for cutwidth to maintain polynomial bit complexity.

## Lemma C — OLA cost controls maximum cutwidth
For an ordering π, define cost OLA(π)=Σ_{backward arcs (v_j→v_i), j>i}(j−i) = Σ_{prefixes X_i}back_D(X_i). At any fixed cut, at most d backward arcs of length exactly d can cross (in fact ≤d−1). If w backward arcs cross, and L is the largest integer satisfying L(L+1)/2≤w, then every such set of w arcs has total length at least Σ_{d=1}^L d²≥ L³/3. Also w < (L+2)²/2, whence w < (((3k)^{1/3}+2)²)/2 in an ordering of OLA cost≤k. Consequently its width is O(k^{2/3}). The bound requires no semicompleteness.

For purely integer implementation, let q=ceil_cuberoot(3k), W=ceil((q+2)²/2). This is a safe conservative integer upper bound on width.

## Theorem D — OLA decision and reconstruction
If optimum OLA≤k, then cutwidth≤W. Therefore all W-cuts are at most

    T_W=(n+1)4^hH(2W)^2.

Enumerate W-cuts, stopping at T_W+1 and rejecting if the threshold is exceeded. Otherwise compute a *minimum-weight* path ∅→V in the inclusion DAG, assigning transition into X cost back_D(X) (empty and full have zero cost). Such paths correspond to vertex orderings, and their path weights equal OLA costs. Return YES iff the minimum weight≤k, with the reconstructed order. If no path exists or minimum>k, return NO. Runtime

    O((W+1) n⁴ 4^h H(2W)^2)
       = 2^{O(k^{1/3}+h)} n^{O(1)}.

For k=0 the integer W bound is conservative and remains finite. No rounding convention can be left implicit in actual code.

## Independent verification
See tests/independent_audit.py. The standalone test checks every 4^6 = 4096 loopless 4-vertex digraph (each unordered pair: absent, either direction, both). It compares the thresholded inclusion-DAG decision against exact permutation optima: 28,672 CW decisions and 17,556 OLA decisions, 0 mismatches. An independently coded Edmonds–Karp min-cut oracle agrees with exhaustive constrained-extension minimization for all 331,776 (graph,A,B) cases. These tests substantiate logic, not universal complexity nor a Lean-certified executable.

## What remains
No formal Lean semantics for the algorithms, no independently audited big-instance implementation or overflow/memory profile, no machine-check of the analytic H estimate. Theoretical proofs above are independent paper derivations from the formal counting result.
