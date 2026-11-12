# Block-Localized Exclusion: Hybrid Hereditary Bounds and Pairwise Block Certificates for Exact Weighted Linear Ordering

*Provisional manuscript (WESTFALL Discovery 018). Not peer-reviewed. Novelty is unverified; see the attached hostile referee report.*

Caleb Westfall (research lead) · with Claude (Anthropic), AI research collaborator · 12 November 2026

---

## Abstract

We study exact maximisation of F_A(π) = Σ_{r<s} a_{π_r π_s} for skew-symmetric A, the weighted linear ordering / feedback arc set problem. The baseline is a threshold-pruned prefix dynamic program ("exclusion DP"). It keeps a prefix set S only if f(S) + r(S) + U(V∖S) ≥ L, where U is an admissible bound on suffix optima.

We contribute three things.

1. **A hybrid hereditary bound.** It combines exact optima on subsets of the blocks of an ordered partition with a fractional packing of *transversal* directed triangles (triangles meeting three distinct blocks). Each arc is charged at most once, so the bound is valid on every subset simultaneously.

2. **A block-localization theorem.** For any ordered partition with largest block size b, reversed cross-block weight X, minimum cross-block margin μ_c > 0 and incumbent gap δ, every state retained by exclusion DP with this bound has at most K = ⌊(δ + 3X)/μ_c⌋ cross-block inversions. Hence at most n(m+1)·2^b·(2Kb+1)^K states are generated. The exact solver therefore runs in poly(n)·2^{O(b + K log(Kb))}, including partition discovery, bound construction and certificate generation. Frustration *inside* blocks costs only the 2^b factor, whatever its size. Frustration *across* blocks is paid through K.

3. **A pairwise block dual-decomposition (PBD) certificate.** It proves that every optimum is block-sorted even when cross-block edges have mixed signs. It strictly extends Condorcet / tournament-module partitions. We give a brute-force-verified 9-vertex instance in which it certifies all 27 cross-block relations, while our implementations of the Stein–Andres single-pass conditions plus transitive and iterated surplus closure miss 18 of them.

**Experiments.** On tournaments embedding Paley(19)/(11) cyclic cores in an ordered frame with *consistent* cross edges, the method reduces generated states by 28–300× (median) relative to triangle-packing exclusion DP and runs 7–14× faster. A generic HiGHS triangle MILP proves none of these instances within 60 s. With 5% reversed cross edges, or adversarial 25% reversals, the advantage disappears, as the theory predicts. On LOLIB input–output instances the generic MILP is 3× to over 1000× faster than every DP variant. On LOLIB's Paley instances the DP methods prove optimality where the MILP does not within 60 s.

**Limitations.** The K = 0 case is the classical Condorcet decomposition. The exponent K log(Kb) is weak. Certificates are floating-point (numerical). Novelty relative to the Kemeny data-reduction and FAST-FPT literature is unverified.

---

## 1. Introduction

Exact weighted linear ordering is NP-hard, even on tournaments. Practical exact methods combine:
- strong LP relaxations with cutting planes (Grötschel–Jünger–Reinelt);
- Lagrangian branch-and-bound (Charon–Hudry);
- partial-optimality preprocessing (Stein–Andres 2024);
- data-reduction rules from Kemeny aggregation (Condorcet partitions, Truchon's extended Condorcet criterion, Betzler–Bredereck–Niedermeier's 3/4-majority rule, Phung–Hamel's majority-ordering refinements).

There are also parameterized algorithms, e.g. Karpinski–Schudy and Feige, O*(2^{O(√OPT)}).

Two regimes are poorly served:
- **Pseudorandom cyclic cores.** On Paley tournaments, LP relaxations have large integrality gaps (Newman–Vempala), and local or pairwise certificates certify nothing (our Discovery 014).
- **Large structured instances containing such cores.** Global relaxations inherit the gap, while decomposition rules require *every* cross edge between blocks to agree with the block order.

This paper asks: **if the frustration of an instance is concentrated in bounded-size blocks, while cross-block edges are mostly (not entirely) consistent, can an exact method pay exponentially only in the block size?** We prove a bounded form of "yes" (Theorem 2). We give an exact certificate for the fully decomposable mixed-sign case (Theorem 3), and measure where each helps and where it does not.

## 2. Related work and what is (and is not) new

- **Stein & Andres (2024), partial optimality.** They give improving maps: transposition, grouping, conditional grouping, shifting, generalized shifting.
  - Their *grouping* proves that a set R precedes its complement only when **every** cross entry favours R.
  - *Conditional grouping* certifies a single pair via an aggregate cut inequality.
  - Neither certifies a pair (u, v) whose own edge favours v-before-u, except through iteration or transitivity.
  - Our earlier ACC "global original" rule is literally their transposition condition (Discovery 017 audit).
- **Condorcet partitions / tournament modules.** Truchon's extended Condorcet criterion, and its modern refinements (finest Condorcet partitions under majority-derived constraints), split the instance at a partition whose cross pairs all agree. This is exactly our K = 0, X = 0 case. **We do not claim it.**
- **Parameterized FAST.** Karpinski–Schudy and Feige rely on the fact that low-cost orderings lie in a small Kendall-Tau ball. They solve weighted FAST in 2^{O(√OPT)}·poly. Our Theorem 2 uses a related inversion-counting argument. Its parameter is different: frustration *inside* blocks is excluded, and only reversed *cross* weight counts. The two bounds are incomparable:
  - ours is better when many blocks are internally very frustrated (Paley-like, β*(B_i) = Θ(b²));
  - theirs is better when frustration is spread thinly (√ versus K log K).
- **State-space relaxation / bounded DP.** Christofides–Mingozzi–Toth and Morin–Marsten prune DP states with relaxation bounds. Our hybrid bound is such a relaxation; the new element claimed is its *transversal* packing construction and the resulting localization theorem.
- **Lagrangian / dual decomposition.** These are standard. PBD (Theorem 3) is a dual decomposition whose subproblems are *pairs of blocks*, used as an exact block-order certificate. We did not find this specific use, but we have not done an exhaustive search.

## 3. Preliminaries

- For T ⊆ V: W(T) = Σ_{pairs ⊆ T} |a|, g(T) = OPT(A|T) and β*(T) = (W(T) − g(T))/2, the minimum backward weight.
- r(S) = Σ_{u∈S, w∉S} a_uw.
- d⁻(S) = Σ_{w∉S, u∈S} max(a_wu, 0).
- β_S = β*(S) + d⁻(S) + β*(V∖S) is the least backward weight of an ordering with prefix set S.
- def(S) = β_S − β*(V).
- An incumbent ordering scores L, and δ = (OPT − L)/2.

**Exclusion DP.** Keep S iff f(S) + r(S) + U(V∖S) ≥ L, where f(S) is the best chain value to S through kept states. Only children of kept states are generated.

**Lemma 0 (completeness and localization; Discovery 017).**
- Every ordering scoring ≥ L keeps all its prefixes.
- Every kept S satisfies def(S) ≤ δ + ½[U(V∖S) − g(V∖S)].

## 4. Main results

**Theorem 1 (hybrid hereditary bound).** Let 𝓑 = (B_1, …, B_m) partition V. Let y' ≥ 0 be a fractional packing of directed triangles with vertices in three distinct blocks, satisfying Σ_{Δ∋e} y'_Δ ≤ a_e for every arc e (a_e > 0). Then for every T ⊆ V:

  g(T) ≤ U_hyb(T) := W(T) − 2·[ Σ_i β*(T∩B_i) + Σ_{Δ⊆T} y'_Δ ].

*Proof.*
1. Take any ordering of T. Its backward weight splits into internal arcs (both ends in one block) and cross arcs.
2. The internal backward weight restricted to block i is at least β*(T∩B_i).
3. Every transversal triangle Δ ⊆ T has a backward arc, and all three of its arcs are cross arcs.
4. So the cross backward weight is ≥ Σ_e [e backward]·Σ_{Δ∋e} y'_Δ ≥ Σ_{Δ⊆T} y'_Δ.
5. Internal and cross arcs are disjoint, so nothing is charged twice. ∎

*Remark.* Allowing triangles with two vertices in one block would break validity: their backward arc may be internal and already charged.

**Theorem 2 (block localization).**
- *Setup.* Let 𝓑 be ordered, and define:
  - X = Σ_{i<j} Σ_{u∈B_i, v∈B_j} max(−a_uv, 0), the reversed cross weight;
  - μ_c = min over cross pairs of |a_uv|, assumed > 0;
  - inv_𝓑(S) = |{(w, u) : w ∉ S, u ∈ S, blk(w) < blk(u)}|.
- *Statement.* Run exclusion DP with any admissible U ≤ U_hyb. Then every kept S satisfies

  inv_𝓑(S) ≤ K := ⌊(δ + 3X)/μ_c⌋,

  and at most n·(m+1)·2^b·(2Kb+1)^K states are generated.

*Proof.*

(a) **Upper bound on β\*.** Order the blocks by index with internally optimal orders. This gives β* ≤ Σ_i β*(B_i) + X.

(b) **Suffix gap.** For any T, the same construction gives β*(T) ≤ Σ_i β*(T∩B_i) + X_T ≤ LB_hyb(T) + X. Hence ½[U(T) − g(T)] ≤ ½[U_hyb(T) − g(T)] = β*(T) − LB_hyb(T) ≤ X.

(c) **Lower bound on β_S.** Write X_i = S∩B_i and Y_i = B_i∖S. Then

  β_S ≥ Σ_i [β*(X_i) + w⁺(Y_i → X_i) + β*(Y_i)] + d⁻_cross(S) ≥ Σ_i β*(B_i) + d⁻_cross(S),

  because each bracket is the backward weight of the ordering "X_i then Y_i" of B_i.

(d) **Cross in-cut vs inversions.** Each inverted cross pair (w, u) has either a_wu ≥ μ_c, contributing to d⁻_cross(S), or a_wu < 0, in which case it is reversed. Reversed pairs total at most X in weight, hence at most X/μ_c in number. So d⁻_cross(S) ≥ μ_c·inv_𝓑(S) − X.

(e) **Combining.**
- From (a), (c) and (d): def(S) ≥ μ_c·inv_𝓑(S) − 2X.
- From Lemma 0 and (b): def(S) ≤ δ + X.
- Therefore inv_𝓑(S) ≤ (δ + 3X)/μ_c.

(f) **Counting.** Let i₀ be the first block not contained in S; it has a ≥ 1 absent vertex. Let L = S ∩ (blocks after i₀).
- Every u ∈ L is inverted with the absent vertices of B_{i₀}, so |L| ≤ inv ≤ K.
- If u ∈ L lies in block j, every block strictly between i₀ and j contributes at least |B_k| − |L∩B_k| absent vertices. So inv ≥ (j − i₀) − K, giving j − i₀ ≤ 2K.
- So S is determined by: i₀ (at most m+1 choices), S∩B_{i₀} (at most 2^b), and a set of at most K vertices among at most 2Kb (at most (2Kb+1)^K).
- Each kept state has at most n children. ∎

**Corollary 2.1 (running time, preprocessing included).**

| Step | Cost |
|---|---|
| Segmentation of an incumbent into blocks of size ≤ b_max, minimising X exactly | O(n² + n·b_max) DP |
| Block tables | O(m·b·2^b) |
| Transversal packing | one LP, O(n³) columns |
| Per state | O(n² + m·b + \|supp y'\|) |

Total: poly(n)·2^{O(b + K log(Kb))}. Here K is computable from the partition and any upper bound on OPT (δ ≤ (U(V) − L)/2).

**Corollary 2.2 (K = 0).** If X = 0 and the incumbent is optimal, then at most n(m+1)·2^b states are generated. This recovers the (known) Condorcet-partition decomposition, with the difference that it is *discovered automatically* by the bound, without a partition oracle.

**Theorem 3 (pairwise block dual-decomposition certificate, PBD).**
- *Setup.* Let 𝓑 be ordered.
  - A pair i < j is **pure** if every cross entry is positive, and **mixed** otherwise.
  - Let d_i be the number of mixed pairs containing i.
  - Define A^{(ij)} on B_i ∪ B_j: it carries all cross entries of (B_i, B_j), plus a fraction w_i^{(j)} of B_i's internal entries. Use w = 1/d_i on mixed pairs; if d_i = 0, put block i's weight on any pure pair.
- *Statement.* Suppose every optimal ordering of every mixed A^{(ij)} places B_i entirely before B_j. Then:
  - OPT(A) = Σ_i g(B_i) + Σ_{i<j} Σ_{u∈B_i, v∈B_j} a_uv;
  - every optimum of A is B_1 < … < B_m with internally optimal blocks.

*Proof.*
1. F_A(ρ) = Σ_{i<j} F_{A^{(ij)}}(ρ|_{B_i∪B_j}) for every ordering ρ. Hence OPT(A) ≤ Σ OPT(A^{(ij)}).
2. Pure pairs: concatenation is the strictly best merge for any internal orders, so their optimum is block-sorted.
3. By hypothesis, mixed pairs are block-sorted too. So each OPT(A^{(ij)}) is attained by B_i-first orders with optimal internal orders.
4. The block-sorted global ordering with optimal internals attains every term simultaneously, so the bound is tight.
5. Any global optimum must therefore attain every term, which forces it to be block-sorted with optimal internals. ∎

*Cost.* One exact solve per mixed pair, on at most 2b vertices: O(m²·2^{2b}·b).

*Proposition 3.1 (limitation).* Suppose blocks i < j are adjacent in a block-sorted optimum, and there exist optimal internal orders that put a ∈ B_i last and b ∈ B_j first with a_ab < 0. Then swapping a and b strictly improves the ordering, so no optimum is block-sorted with those internals. For example, cyclic triangles have all 3 rotations optimal. So **PBD can succeed with negative cross edges only when blocks have rigid optimal internal orders.** We observed this empirically: in 436 random instances with cyclic 3-blocks and mixed edges, PBD certified none.

## 5. Algorithm: BLX (Block-Localized Exclusion)

1. Incumbent π₀: best of 5 random-restart insertion local searches; L = F(π₀).
2. For b_max ∈ {8, 12, 16, 20}: segment π₀ (exact DP minimising X), compute K, and keep the partition minimising log[(m+1)·2^b·(2Kb+1)^K].
3. If m ≥ 3 and b ≤ 11, try the PBD certificate (Theorem 3). If it succeeds, return immediately.
4. Build U = min(U_packing, U_hyb): one global triangle-packing LP, one transversal-packing LP, and block tables.
5. Run exclusion DP with U; do the backward pass; compute W(y, x) for all ordered pairs.
6. Output OPT, the optimal ordering, the certified pairs (W(y, x) < OPT), and the certificate.

**Soundness never depends on the partition.** The partition only shapes the bound (Theorem 1) and the analysis (Theorem 2).

**Certificate format.**
- the incumbent order;
- kept states per layer with f-values;
- the packings y and y' (masks and weights);
- the block partition and block tables.

**Independent checker (`verify_cert.py`).** Pure Python, no shared search code. It re-verifies:
- packing feasibility and directed-cycle orientation;
- block tables by brute force (blocks ≤ 8);
- every f-value;
- every excluded child's inequality;
- that the order attains f(V).

## 6. Experiments

**Setup.** One 2-core / 8 GB VM; Python 3 + NumPy for all DP variants. HiGHS (compiled, via SciPy) runs the full triangle MILP with a 60 s limit. Each solver run is a separate process, and peak RSS is recorded. Instances are seeded (`runone.py`).

**Verification:**
- **Bound admissibility.** Theorem 1 was checked on 81,920 (instance, subset) pairs, including random *conflicting* partitions, ties and zero weights: 0 violations.
- **Exactness and Theorem 2.** 60 runs (n = 8–9) against brute force: 0 objective mismatches, and max(inv_𝓑 − K) = 0. The bound is attained, so it is not vacuous.
- **Cross-solver agreement.** All grid instances: packing SLDP, BLX and (when proved) MILP agree to 1e-6.
- **Independent checker.** It accepted certificates for 3 instances (n = 14–30). Larger certificates exceed the pure-Python checker.

**Controlled grid.** Medians, with ranges in brackets. "States" counts generated DP states.

| Family | Configuration | Runs | Packing SLDP (s) | BLX (s) | Median states, SLDP → BLX | MILP proved ≤ 60 s |
|---|---|---|---|---|---|---|
| C | n=29, Paley(19) core, q=0 | 2 | 9.64 [9.2–10.0] | **1.34** [1.25–1.44] | 4.36M → 26.7k | 0/2 |
| C | n=29, q=0.02 | 2 | 10.54 | 4.90 [2.9–6.9] | 4.62M → 1.60M | 0/2 |
| C | n=29, q=0.05 | 2 | 11.21 | 9.41 [6.7–12.2] | 4.97M → 3.23M | 0/2 |
| C | n=35, q=0 | 2 | 16.33 | **1.55** | 7.65M → 158k | 0/2 |
| C | n=35, q=0.02 | 2 | 17.24 | 7.05 [1.5–12.6] | 7.60M → 2.27M | 0/2 |
| C | n=35, q=0.05 | 2 | 18.80 | 18.66 [14.9–22.4] | 8.05M → 6.59M | 0/2 |
| C | n=45, Paley(19)+Paley(11), q=0 | 2 | 41.63 | **2.96** | 15.2M → 279k | 0/2 |
| C | n=45, q=0.02 | 2 | 44.35 | 6.19 [2.5–9.9] | 15.7M → 1.26M | 0/2 |
| C | n=45, q=0.05 | 2 | 56.03 | 43.11 | 18.4M → 11.4M | 0/2 |
| C | n=50, 3×Paley(11), q=0 | 2 | 0.34 | 0.24 | 178k → 45k | 0/2 |
| C | n=50, q=0.03 | 2 | **0.46** | 1.52 | 192k → 184k | 0/2 |
| C | n=50, q=0.08 | 2 | **0.59** | 1.66 | 256k → 249k | 0/2 |
| C-adv | n=29, q=0.25 (interleaving pays) | 2 | **30.3** | 33.5 | 9.92M → 9.87M | 0/2 |
| A | near-transitive, n=40 | 2 | **0.07** | 1.86 | 1.3k → 1.3k | 2/2 (0.2 s) |
| A | near-transitive, n=60 | 2 | **0.17** | 2.77 | 2.6k → 2.6k | 2/2 (0.5–0.7 s) |
| B | planted, α ∈ {0.5, 1}, θ ∈ {1, 2, 4}, n=50 | 6 | **0.07–0.19** | 0.08–2.64 | ≈ equal | 6/6 (0.2–0.3 s) |
| D | uniform, n=22 | 2 | **0.06** | 1.23 | 21.6k → 19.2k | 2/2 |
| D | integer weights with ties, n=22 | 2 | **0.07** | 0.11 | ≈ equal | 2/2 |
| F | Paley 11 / 19 / 23 | 1 each | 0.01 / 2.21 / 56.7 | 0.01 / 0.59 / 51.8 | 2.0k→67 / 524k→255 / 8.39M→8.35M | 1/1, 0/1, — |

**Reading the grid:**
- **Where BLX wins (7–14×).** Exactly where Theorem 2 predicts: K = 0 to about 20, with consistent frames around large cyclic cores.
- **Where the advantage fades.** It disappears as reversed cross weight grows (q = 0.05; K ≈ 40–150) and in the adversarial family (K ≈ 420).
- **Where BLX's overhead loses.** On easy families it is slower by 1–3 s, which is the cost of the 2^20 block tables and the transversal LP. An adaptive policy would avoid this; we did not implement one.
- **Pure Paley(19).** The "win" is a full subset DP hidden inside one 19-vertex block. It is not a new effect.
- **Generic MILP.** It proved none of the 26 Family C instances within 60 s, but it dominates Families A, B and D.

**Pair certification.** Every C/A/B/F instance had all ordered relations certified. Tie instances (D) certified 204–231 of 231, because their optima are not unique.

**LOLIB** (real instances, IGARDS mirror of LOLIB). The objective is in skew form F_A; the LOLIB value is (F_A + Σ_{i≠j} c_ij)/2, e.g. t59b11xx gives 209,320. Official optimal values were not retrievable from this environment, so optimality is cross-checked between independent exact methods (all agreements are exact).

| Instance | n | Packing SLDP | BLX | HiGHS MILP | F_A optimum | Pairs certified |
|---|---|---|---|---|---|---|
| IO t59b11xx | 44 | 33.4 s | 42.2 s | **0.29 s** | 198,305 | 610/946 (ties) |
| IO t65b11xx | 44 | 2.1 s | 2.7 s | **0.21 s** | 339,247 | 843/946 |
| IO t70b11xx | 44 | 1.9 s | 2.4 s | **0.17 s** | 505,833 | 724/946 |
| IO t75d11xx | 44 | 0.7 s | 0.9 s | **0.19 s** | 545,285 | 903/946 |
| IO be75eec | 50 | >900 s | >300 s | **0.27 s** | 228,678 (MILP only) | — |
| IO be75np | 50 | 24.3 s | 35.3 s | **1.05 s** | 691,358 | 1205/1225 |
| Spec atp24 | 24 | 0.06 s | 0.14 s | **0.03 s** | 147 | 238/276 |
| Spec econ36 | 36 | 0.65 s | 1.03 s | **0.26 s** | 535,574 | 620/630 |
| Spec pal11 | 11 | **0.01 s** | 0.02 s | 0.11 s | 15 | 0/55 |
| Spec pal19 | 19 | **2.2 s** | 2.5 s | not proved (60 s) | 43 | 0/171 |
| Spec pal23 | 23 | 57 s | **55 s** | not proved (60 s) | 69 | 0/253 |

**DP-based methods are the wrong tool for IO-type instances**, where the LP relaxation is nearly tight: the generic MILP is 3–100× faster or more. On LOLIB's Paley instances (unweighted, so optima are not unique and no pair is mandatory) the DP methods prove optimality where the 60 s MILP does not. The optima 15, 43 and 69 match our Discovery 016 symmetry-reduced computation of the Paley core values. BLX gives no advantage on any LOLIB instance (μ_c = 0 makes K = ∞; pal23 exceeds the block cap).

## 7. Limitations

1. **Hardness.** Exponential worst case is unavoidable: NP-hardness, the Karpinski–Schudy ETH lower bound for weighted FAST, and our earlier κ-barrier (Discovery 016).
2. **Theorem 2 is weak when X/μ_c is large.** In most benchmark configurations K is in the hundreds and the bound is vacuous. The empirical gains occur at small K.
3. **K = 0 is known** (Condorcet/module decomposition).
4. **PBD needs rigid blocks** (Proposition 3.1).
5. **Certificates are floating-point.** LP packings are shrunk by a factor (1 − 1e-9), and margins are checked with tolerance 1e-7. No rational or interval certification has been done.
6. **Implementation.** Python DP vs compiled HiGHS. Masks are 64-bit, so n ≤ 62. No specialized LOP branch-and-cut code was available for comparison.
7. **Synthetic bias.** Family C was designed to have the structure the method exploits.

## 8. Discussion

The mechanism is a **separation of frustration scales**. Exact small-block tables absorb internal frustration at cost 2^b, a transversal packing captures what it can of the cross structure, and the exclusion DP pays only for the residual cross inconsistency. That residual is X/μ_c, through K.

This explains:
- why exclusion DP struggles on embedded cyclic cores (the packing gap is internal);
- why it collapses once those cores are tabulated;
- why the MILP struggles there (the LP gap is internal).

The obvious next step is a sharper counting argument in Theorem 2, ideally 2^{O(√K)} in the style of Karpinski–Schudy, combined with adaptive block-size selection.

## 9. Conclusion

We proved:
- a valid hybrid hereditary bound;
- a block-localization theorem with computable parameters (b, X/μ_c, δ);
- a pairwise block dual-decomposition certificate that strictly extends Condorcet partitions to mixed-sign cross edges for rigid blocks.

We implemented them with an independent checker, and measured a 7–14× speed-up (up to ~6,000× fewer states) on frame-plus-cyclic-core instances where a generic MILP fails. We also measured clear losses elsewhere. Whether this constitutes a publishable novelty depends on a specialist literature review (Section 2).

## Appendix A. AI-assisted research provenance

- **How the ideas arose.**
  - *Theorem 1* came from the brief's "hybrid bound" prompt. The first draft charged *all* triangles alongside the block tables; checking for double counting showed this is invalid, which led to the transversal restriction.
  - *Theorem 2* came from combining the Discovery 017 localization lemma with a block-level version of its inversion-counting step.
  - *PBD* came from asking when cross-block dominance can outweigh interleaving.
- **Approaches rejected.**
  - The "stable block-sort" improving map. It is improving for all orderings only when every cross edge agrees, so it is a module condition.
  - A pairwise-merge staircase test over arbitrary internal orders. It reduces to the same module condition, and the general version is a bipartite LOP.
  - Uniform PBD weights 1/(m−1). These degrade with m; we replaced them with mixed-degree weights.
- **Counterexamples and failures that changed direction.**
  - PBD certified 0 of 436 instances with cyclic 3-blocks. This produced Proposition 3.1 and the rigid-block separation instance.
  - A bitmask bug in Discovery 017's triangle masks was caught by exhaustive admissibility checks.
  - A self-matching process-wait bug delayed the LOLIB runs; it was found and fixed.
- **What was independently reproduced.**
  - All bounds against exhaustive subset optima.
  - All optima across 2–3 independent exact methods.
  - Selected certificates by a separate checker.
- **What is genuinely new versus known.** See Section 2. Nothing here should be considered new until reviewed.

## Appendix B. Reproduction

Code: `westfall018_code.zip` (Python 3, NumPy, SciPy/HiGHS).

| Script | Reproduces |
|---|---|
| `verify_h.py` | Theorem 1 admissibility, exactness, Theorem 2 |
| `sep18b.py` | PBD separation instance |
| `tverify.py` | independent certificate checks |
| `grid.py` → `summarize.py` | controlled grid |
| `lolibrun.py` / `lolibrun2.py` | LOLIB (requires a clone of github.com/IGARDS/lolib_study) |
