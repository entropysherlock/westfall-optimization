# Mission 041 — Algorithms for h-semicomplete digraphs

> **Mission 042 sharper complexity (research branch only; conditional paper derivation):** R_h(K) ≤ binomial(2h,h)H(K) ≤ 4^hH(K), improving the proposed h-semicomplete cutwidth runtime to 2^{O(√k+h)} n^{O(1)} and OLA to 2^{O(k^{1/3}+h)} n^{O(1)}. The argument is not yet Lean-checked and does not replace the original Mission 041 implementation. See ../westfall-042/MANUSCRIPT_ADDENDUM.md.


**Input:** a digraph D on n vertices with at most h non-neighbours per vertex (h can be computed in O(n²)), and an
integer k.

## CW_h(D, k): is ctw(D) ≤ k?

1. **Enumerate.** List the k-cuts with polynomial delay. Branch on the vertices in a fixed order, keeping a partial
   assignment (A ⊆ X, B ∩ X = ∅) only if min{back(X) : A ⊆ X ⊆ V∖B} ≤ k. That quantity is an s–t minimum cut:
   sources B, sinks A, unit arc capacities. It is decided with at most k+1 augmenting paths in O((k+1)n²) time.
   Every surviving leaf is a k-cut, and consecutive outputs are at most 2n flow calls apart.
2. **Stop.** If more than T_h(k) = (n+1)·min{R_h(2k), (n+1)^h}·H(2k) k-cuts appear, answer **NO**.
3. **Search.** Otherwise BFS from ∅ in the DAG of k-cuts, with arcs X → X ∪ {v}. Answer **YES**, with the ordering
   read off a path ∅ → V, if V is reached; otherwise answer **NO**.

**Correctness of the stopping rule.** If ctw(D) ≤ k, take an optimal ordering as the reference ordering; it has
c = k. Then N_k ≤ (n+1)·R_h(2k)·H(2k) and N_k ≤ (n+1)^{h+1}·H(2k). This is Theorem C: Lean
`card_kcuts_le_defect_of_width_le_k` and `card_kcuts_le_defect_poly`. So exceeding T_h(k) certifies ctw > k.

**Correctness of the search.** An ordering has width ≤ k exactly when all its prefixes are k-cuts. These prefixes form
a chain ∅ ⊂ … ⊂ V that adds one vertex at a time.

**Reconstruction.** BFS parent pointers give the path, and each step adds one vertex, which gives the ordering. The
ordering's width is re-verified independently in the prototype.

**Time.** O(T_h(k)·n·(k+1)n²) + O(T_h(k)·n²) = O(R_h(2k)·H(2k)·k·n⁴). Using R_h(2k) ≤ C(2k+2h, h) and
H(2k) ≤ e^{2π√(2k)}, this is 2^{O(√k + h·log(k+h))}·n⁴.

**Space.** O(T_h(k)·n) bits, for the hash set of k-cuts.

**Minimum cutwidth.** Run k = 0, 1, 2, …. The total time is dominated by the last round:
2^{O(√ctw + h log(ctw+h))}·n⁴.

## How the bound depends on h

The exponent of n is 4 for every h. The h-dependence is entirely in the factor R_h(2k) ≤ C(2k+2h, h), so the
algorithm is **fixed-parameter tractable in k + h**.

For fixed h, the running time is 2^{O(√k)}·n⁴. That is optimal under ETH already for tournaments (h = 0), by
Barbero–Paul–Pilipczuk Theorem 14.

A dependence 2^{Ω(h)} is unavoidable for any algorithm that **enumerates all k-cuts**, by Theorem L. Whether it is
necessary for deciding cutwidth is open.

The branch (n+1)^h is never better asymptotically. It is included because for small n and large k it can be the
smaller threshold.

## OLA_h(D, k)

1. Let W = ⌊((3k)^{1/3} + 2)²/2⌋ = O(k^{2/3}). By Mission 040 Lemma 4, which holds for every digraph, an ordering of
   OLA cost ≤ k has width ≤ W.
2. Enumerate W-cuts with the threshold T_h(W). If the threshold is exceeded, then OLA > k.
3. Otherwise find a minimum-weight path ∅ → V in the W-cut DAG, where the weight of a path is Σ back(X) over its
   nodes. If that weight is ≤ k, answer YES with the ordering; otherwise answer NO.

**Time.** 2^{O(√W + h log(W+h))}·n^{O(1)} = 2^{O(k^{1/3} + h log(k+h))}·n^{O(1)}.

## Prototype

The prototype is `tests/algo041.py`, reusing Mission 040's `algo.py`. Results are in `data/algo041_results.json`:
- **Correctness.** 400 random h-semicomplete instances with n ≤ 11 and h ≤ 3 were checked against the exact
  subset DP. There were 0 mismatches in ctw, in ordering width, and in enumerated against brute-force k-cut counts
  (for k ∈ {ctw−1, ctw, ctw+1}). The threshold misfired 0 times. The largest observed ratio N_k / T_h was 1.0, meaning
  the threshold is attained with equality on some small instance and is never exceeded.
- **Benchmarks.** Instances with n = 16 to 48 and h = 0 to 3 were solved in 0.05 to 14 s of pure Python. At the
  final k, the k-cut counts were 42 to 334, against thresholds of 650 to 2.6·10⁷. The counts stay far below the
  threshold on these near-transitive instances.
