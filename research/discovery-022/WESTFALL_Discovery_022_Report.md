# WESTFALL Discovery 022: A Partition-Free Exact Algorithm via the Robust Condorcet Number

**Research lead:** Caleb Westfall (Westfall Optimization, an independent research initiative)
**Date:** 12 November 2026
**Status:** internal research report on a local branch. Not peer-reviewed, not machine-checked, not pushed. "Proved" below means a complete written argument that also survived exhaustive small-case checks.

---

## Executive summary

**The grand target has a positive answer, as a theorem.** Weighted linear ordering can be solved exactly, from the matrix alone, in time

  poly(n) · 2^{O(√λ(A))} = poly(n) · 2^{O(κ(A))},

where λ(A) = min over **all** ordered partitions 𝓑 of b(𝓑)² + 3K₀(𝓑), and κ(A) = min_𝓑 (b + √K₀). No partition is supplied. The algorithm finds a minimizing partition itself and returns it as a checkable witness.

| Result | Status |
|---|---|
| **Theorem 1.** Every prefix of every optimum is a λ-cut of the majority digraph | Proved; 650 instances, 0 violations |
| **Lemma 2.** If λ(A) ≤ k, the number of k-cuts is at most (n+1)·P(3k) | Proved; 0 violations |
| **Theorem 3.** λ(A) ≤ k can be decided, with a minimizing partition, in poly(n)·P(3k)² time | Proved; matches brute force over all ordered partitions on 650/650 instances |
| **Theorem 4 (main).** Partition-free exact algorithm in poly(n)·2^{O(√λ)} | Proved; novelty candidate |
| **Proposition 5.** λ ≤ 1 + 6·(min feedback weight) for weights ≥ 1; λ ≤ 1 + 18·OPT in Karpinski–Schudy normal form | Proved. So Theorem 4 recovers the classical 2^{O(√OPT)} bounds up to the constant, and is exponentially better on frustrated-block families |
| **Theorem 6.** No 2^{o(√λ)}·poly(n) algorithm under ETH | Proved (corollary of Karpinski–Schudy) |
| **Theorem 7.** Search/certificate separation: a family with optimal cut-width ≤ 6 but λ = Θ(n^{2/3}) | Proved; formalizes Part V |

**Research assessment.** The cut-state dynamic programming and exchange arguments build on established techniques. The proposed contribution is the structural parameter, its recognition algorithm, and their integration into an exact solver. Novelty has not been independently established.

**Practical verdict: the prototype is not competitive.** It proved 7 of 20 benchmark instances. BLX 2.0 or packing SLDP solved all 20, faster. The contribution is theoretical.

---

## A. Audit of Discoveries 019 and 021

Discovery 021 is not on GitHub; I used the local files in `research/discovery-021/`, including the exact K₀ definition from `ldp.py` and the report.

| Item | Finding |
|---|---|
| 019 Lemma 1, Theorem A | Correct (re-used below). For b = 1 it is Fomin–Pilipczuk's Lemma 5, as 021 already noted. |
| 021 Theorem 1 (R_𝓑(π*) ≤ K₀) | Correct. I re-derived it; it is the basis of everything here. K₀(𝓑) = min_τ [N⁻ + Z(τ) + ⌊X/τ⌋]. |
| 021 Theorem 3 (ball search) | Correct but **superseded**. It needs an incumbent σ and its radius bound contains R_𝓑(σ). Theorem 1 below removes σ entirely by counting cuts in the majority digraph instead of inversions against σ. |
| 021 Observation 6 | Correct, but it covers only singleton partitions. Whether λ is NP-hard to compute is still open (Section K). |
| 021 "certification needs a witness partition" | Correct, and Theorem 3 below shows the witness can be **found** in the same time bound. This was the missing step. |
| 021 conjecture M (ball certificates) | Not resolved. Theorem 7 shows partition certificates cannot close the gap in general. |
| A new observation on 021's experiment G3 | The large "certified radius" there was partly an artifact of using the planted partition. Bound-based exclusion certifies the band family of Theorem 7 with 76–236 states (Section G), although no partition certificate can. |

---

## B. Definitions and statements

**Setting.** A is a real skew-symmetric n×n matrix; F_A(π) = Σ_{r<s} a_{π_r π_s}; OPT = max F_A. Zero entries are allowed everywhere.

- **cut_A(S)** := #{(w, u) : w ∉ S, u ∈ S, a_wu ≥ 0}. These are the pairs across the cut that do not strictly agree with putting S first. It is the size of the cut (S, V∖S) in the weak majority digraph D_A (arc w→u iff a_wu ≥ 0; ties give both arcs, so D_A is semi-complete).
- **k-cut:** a set S with cut_A(S) ≤ k. **𝒞_k** := the k-cuts reachable from ∅ by adding one vertex at a time through k-cuts.
- **Width** of an ordering π: max over prefixes S of cut_A(S). **Optimal width** ω(A) := the largest width of an optimal ordering.
- For an ordered partition 𝓑 = (B₁,…,B_m): b, N⁻, z, X, Z(τ) and K₀(𝓑) are as in Discovery 021.
- **Robust Condorcet number:** λ(𝓑) := b² + 3K₀(𝓑), and **λ(A) := min_𝓑 λ(𝓑)** over all ordered partitions. Always 1 ≤ λ(A) ≤ n² (one block). In particular λ(A) ≤ (largest block of the finest Condorcet partition)², the K₀ = 0 case.
- P(M) = Σ_{j≤M} p(j), with p the partition function.

### Theorem 1 (optima are narrow in the majority digraph)
For every ordered partition 𝓑:
1. every prefix S of every optimal ordering has cut_A(S) ≤ b² + 2K₀ + N⁻ + z ≤ λ(𝓑). Hence **ω(A) ≤ λ(A)**;
2. every prefix union C_i = B₁∪…∪B_i has cut_A(C_i) ≤ N⁻ + z ≤ K₀(𝓑);
3. C_i is reachable from C_{i−1} by single-vertex steps through sets of cut ≤ ⌊b²/4⌋ + K₀(𝓑).

### Lemma 2 (counting, no logarithm)
If λ(A) ≤ k, then every k-cut S satisfies I_{𝓑*}(S) ≤ k + K₀(𝓑*) for a minimizing 𝓑*, and the number of k-cuts is at most (n+1)·P(3k).

### Theorem 3 (recognition and discovery)
Given A and k, one can decide whether λ(A) ≤ k in O(n⁶·√k·N²) time and O(n·N) memory, N = (n+1)·P(3k). If yes, the procedure returns a partition 𝓑 with λ(𝓑) = λ(A).

### Theorem 4 (partition-free exact algorithm)
There is an algorithm that takes only A and returns OPT(A), an optimal ordering, the value λ(A) and a partition attaining it, in time

  poly(n) · P(6λ(A))² ≤ poly(n) · e^{4π√λ(A)} = poly(n) · 2^{O(√λ(A))}.

Since min_𝓑(b + √K₀) and √λ(A) are within a factor √3·√2 of each other, this is poly(n)·2^{O(κ(A))}.

### Proposition 5 (relation to the classical parameter)
- (a) If every off-diagonal |a_uv| ≥ 1, then λ(A) ≤ 1 + 6β*, where β* is the minimum backward weight.
- (b) In Karpinski–Schudy normal form (w_uv + w_vu = 1, a_uv = w_uv − w_vu, cost C*): λ(A) ≤ 1 + 18C*. For Kemeny with m voters, λ ≤ 1 + 18·(Kemeny score)/m.
- (c) **Separation of guarantees.** For m blocks that are each a Paley tournament of size b, with consistent cross pairs except few violations, C* = Θ(m·b²) while λ ≤ b² + 3K₀. The exponents are Θ(b√m + …) versus O(b + √K₀).

### Theorem 6 (ETH tightness)
Unless ETH fails, no algorithm solves weighted linear ordering in 2^{o(√λ(A))}·poly(n) time.

### Theorem 7 (search is not certification, for partition certificates)
- (a) **Band family.** Let a_{i,i+1} = 1, a_{i,i+2} = −1, and a_{i,j} = 2n+1 for j − i ≥ 3. Then ω(A) ≤ 6 for every n, but λ(A) ≥ 3(0.75n)^{2/3} − 3, and λ(A) = Θ(n^{2/3}).
- (b) **Heavy-arc family H_p.** The majority digraph has cutwidth 1 but ω(A) = p. So ω is a genuinely weighted parameter: it is not bounded by any function of the cutwidth of D_A.

### Known result used as a promise version (not new)
The DP over 𝒞_k returns OPT whenever k ≥ ω(A). Because the cutwidth of D_A is at most ω(A), Fomin–Pilipczuk's Corollary 10 bounds the number of k-cuts by A·exp(2C√(k(1+ln 2k)))·(n+1). This gives 2^{O(√(ω log ω))}·poly(n) **search** time. It is not an exact algorithm, because nothing certifies that k ≥ ω.

---

## C. Proofs

**Proof of Theorem 1.**
1. Let S be a prefix of an optimal π*. Split the pairs (w ∉ S, u ∈ S) with a_wu ≥ 0:
   - same block: at most Σ_k a_k x_k ≤ b² + I_𝓑(S) (019 Lemma 1);
   - blk(w) < blk(u): at most I_𝓑(S);
   - blk(w) > blk(u): then (u, w) is an oriented cross pair with c_uw = −a_wu ≤ 0, so there are at most N⁻ + z.

   By 021 Theorem 1, I_𝓑(S) ≤ K₀. For any τ > 0, N⁻ + Z(τ) ≥ N⁻ + z, and at τ = ∞ the value counts all cross pairs, so N⁻ + z ≤ K₀. Total ≤ b² + 3K₀.
2. For S = C_i only the third case occurs.
3. For S = C_{i−1} ∪ Y with Y ⊆ B_i: same-block pairs number |Y|·|B_i∖Y| ≤ b²/4; all other counted pairs fall in the third case. ∎

**Proof of Lemma 2.** Let 𝓑* attain λ(A) ≤ k and let S be a k-cut. A pair counted by I_{𝓑*}(S) has w ∉ S, u ∈ S, blk(w) < blk(u). If a_wu ≥ 0 it is counted by cut_A(S) ≤ k. Otherwise c_wu < 0, and there are at most N⁻ ≤ K₀ such pairs. So S ∈ 𝒮_{k+K₀}(𝓑*). By 019 Theorem A this family has at most (n+1)·P(2(k+K₀) + b²) members, and 2K₀ + b² ≤ λ ≤ k. ∎

**Proof of Theorem 3.**
- *Stage 1.* Generate 𝒞_k layer by layer. If more than (n+1)·P(3k) sets appear, answer "λ > k" (Lemma 2).
- *Stage 2.* Let 𝒩 ⊆ 𝒞_k be the sets with cut ≤ ⌊k/3⌋. For each τ (each distinct positive entry of A, or ∞) and each b ≤ ⌊√k⌋, define the pair cost φ_τ(c) = 1 + |c|/τ if c < 0; 1 if 0 ≤ c < τ; 0 otherwise. Compute the shortest path from ∅ to V in the graph on 𝒩 with an edge C → C′ whenever C ⊂ C′ and |C′∖C| ≤ b, of length Σ_{u∈C, v∈C′∖C} φ_τ(a_uv).
- *A path is a partition.* A path with blocks B_i = C_i∖C_{i−1} has length N⁻ + Z(τ) + X/τ for that partition.
- *Soundness.* Every path yields a real partition 𝓑 with max block ≤ b and K₀(𝓑) ≤ ⌊length⌋. So any reported value is ≥ λ(A).
- *Completeness.* Suppose λ(A) ≤ k with minimizer 𝓑*. By Theorem 1(2), its prefix unions have cut ≤ K₀ ≤ ⌊k/3⌋. By Theorem 1(3) they are reachable through cuts ≤ b²/4 + K₀ ≤ k. So the chain of 𝓑* is a path in the graph.
- *The floor.* For fixed (τ, b), let 𝓑̂ minimize the real length ℓ. Then ⌊ℓ(𝓑̂)⌋ ≤ ℓ(𝓑̂) ≤ ℓ(𝓑*) < ⌊ℓ(𝓑*)⌋ + 1, so ⌊ℓ(𝓑̂)⌋ ≤ ⌊ℓ(𝓑*)⌋. Minimizing over (τ, b) therefore returns exactly λ(A).
- *Cost.* O(n²) values of τ, √k values of b, |𝒩|² pairs, O(n²) per pair. ∎

**Proof of Theorem 4.** For k = 1, 2, 4, …: run Theorem 3. If it returns a witness 𝓑 with λ(𝓑) ≤ k, output the value f_k(V) of the ordering DP over 𝒞_k (computed in Stage 1).
- *Correctness.* By Theorem 1(1), every prefix of every optimum is a λ(𝓑)-cut, hence a k-cut, and it is reachable along the optimum itself. The layer induction of 021 Corollary 1 gives f_k(V) = OPT.
- *Termination.* The loop stops at some k < 2λ(A); it always stops by k ≥ n² (one block).
- *Time.* The last round dominates: poly(n)·P(6λ)², and P(M) ≤ (M+1)·e^{π√(2M/3)}.
- *κ versus √λ.* √(b² + 3K₀) ≤ b + √(3K₀) ≤ √3·(b + √K₀), and b + √K₀ ≤ √2·√(b² + K₀). ∎

**Proof of Proposition 5.** Take the singleton partition in an optimal order.
- (a) Every negative cross pair has |c| ≥ 1, so N⁻ ≤ X = β*. With τ = 1, Z(1) = 0. So K₀ ≤ 2β*.
- (b) A pair with oriented value c costs (1 − c)/2. With τ = ½: every pair with c < ½ costs more than ¼, so N⁻ + Z(½) ≤ 4C*. Each negative pair costs (1 + |c|)/2 ≥ |c|, so X ≤ C* and ⌊X/τ⌋ ≤ 2C*. So K₀ ≤ 6C*.
- (c) A Paley tournament on b vertices has minimum feedback arc set Θ(b²). ∎

**Proof of Theorem 6.** λ(A) ≤ n² always. Karpinski–Schudy's reduction gives n-vertex instances with no 2^{o(n)} algorithm under ETH. ∎

**Proof of Theorem 7(a).**
- *ω ≤ 6.* Reversing one far pair (j − i ≥ 3) loses 2(2n+1) > the total weight of all near pairs, so no optimum reverses a far pair. Let S be a prefix of an optimum with largest element m. Every w ≤ m − 3 is in S. Count pairs (w ∉ S, u ∈ S) with an arc w→u:
  - w < u: only u = w + 1 with w ∈ {m−2, m−1}: at most 2;
  - w > u: only w = u + 2 ∉ S, so u ∈ {m−4, m−3, m−1, m}: at most 4.
- *λ lower bound.* The n − 2 consecutive triples are cyclic triangles. A triangle not inside one block contains a cross pair with c < 0. Each pair lies in at most 2 of these triangles. A block of size s contains at most max(s−2, 0) ≤ s − 1 of them. With m ≥ n/b blocks, at least m − 2 triangles are not internal, so K₀ ≥ N⁻ ≥ (n/b − 2)/2 and λ ≥ b² + 3(n/b − 2)/2 ≥ 3(0.75n)^{2/3} − 3.
- *Upper bound.* Interval blocks of length b give N⁻ ≤ 2n/b and K₀ ≤ 4n/b, so λ = O(n^{2/3}). ∎

**Theorem 7(b)** is verified exhaustively for p = 2,…,6 (`discarded.py`). The general argument: with H = p + 1, placing v before u costs p unit arcs either way, and these optima reverse p arcs across one cut.

---

## D. Algorithm and complexity

```
AutoCut(A):
  for k = 1, 2, 4, ...:
      generate C_k with DP values f_k        # abort the round if > (n+1) P(3k) sets
      B = Discover(A, C_k, k)                # shortest path over chains of (k/3)-cuts
      if B exists with b(B)^2 + 3 K0(B) <= k:
          return f_k(V), ordering, B
```

| Quantity | Bound |
|---|---|
| Time | poly(n)·P(6λ)² ≤ poly(n)·2^{18.2·√λ(A)} |
| Memory | O(n·(n+1)·P(6λ)) |
| Preprocessing | none beyond reading A |
| Parameter | λ(A): exists mathematically; **computed and certified by the algorithm**; does not require OPT |
| Certificate | the partition 𝓑 (O(n) integers). Checking it means recomputing K₀(𝓑) in O(n² log n) and re-running the cut DP at k = λ(𝓑), which still costs 2^{O(√λ)}. It is a compact *search* certificate, not a polynomial-time optimality proof. |

The constant 18.2 is large. Nothing here is a practical speed claim.

---

## E. Counterexamples and discarded conjectures

| ID | Conjecture | Outcome |
|---|---|---|
| D1 | ω(A) is bounded by a function of the cutwidth of the majority digraph | **False.** H_p: cutwidth 1, ω = p (p = 2…6 verified). |
| D2 | "If the cut-DP value is the same at k and 2k, it is optimal" | **False.** A = [[0,−1,−1,−2,3],[1,0,−3,−2,−2],[1,3,0,1,0],[2,2,−1,0,−1],[−3,2,0,1,0]]: f₁ = f₂ = 10 but OPT = 12. Found after 89 random instances. |
| D3 | Sorting by sign-score gives an ordering with O(K₀ + b²) cross reversals for every 𝓑 (my first route to a partition-free bound) | **Abandoned, not refuted.** The best bound I could derive was O(√b·K₀), giving exponent b + b^{1/4}√K₀. Theorem 1 made it unnecessary. |
| D4 | Partition certificates can always match the search radius (λ = O(ω)) | **False.** Band family: ω ≤ 6, λ = Θ(n^{2/3}). |
| D5 | The planted partition is the best witness | **False in practice.** On chain 7×3×1 (seed 1) the algorithm certified with λ = 48 by splitting the 7-core, although the planted partition has b² = 49 alone. |
| Routes C and D of the brief (compact dual certificates; stronger relaxations) | **Not attempted in depth.** No result. |

---

## F. Comparison with the strongest relevant literature

| Work | What it proves | Relation |
|---|---|---|
| Fomin–Pilipczuk (arXiv 1301.7314) | k-cut counting: Lemma 5 (transitive tournaments), Corollary 7 (feedback arc set ≤ k), Corollary 10 (cutwidth ≤ k, with a √log factor); Theorem 13: FAS by Dijkstra over k-cuts; a remark extends it to arc weights ≥ 1 parameterized by total weight | **The engine of Theorem 4 is their k-cut DP.** New here: (i) the cut bound comes from a hidden block partition, not from the solution cost; (ii) Lemma 2 has no log factor; (iii) the second shortest-path computation over chains of cuts that recovers the partition. Their open question (is the count 2^{O(√k)} for cutwidth ≤ k?) is not answered; Lemma 2 covers only the subclass λ ≤ k. |
| Karpinski–Schudy; Feige; Alon–Lokshtanov–Saurabh | 2^{O(√OPT)} for (weighted) FAST; ETH lower bound | Proposition 5 shows Theorem 4 implies their bound up to the constant in the exponent, and can be exponentially better. Theorem 6 uses their lower bound. |
| Barbero–Paul–Pilipczuk (ICALP 2017) | Cutwidth and OLA of semi-complete digraphs: NP-hardness, ETH-optimality, kernels | Unweighted layout parameters. ω(A) differs from cutwidth (D1). |
| Algorithmica 85 (2023), digraphs of bounded independence number | Sub-exponential k-cut bounds for bounded independence number | Different generalization. |
| Truchon; Akbari–Escobedo; Phung–Hamel; Kawashima–Sukegawa (arXiv 2609.19593) | Exact Condorcet-type decompositions; approximate partitions with approximation guarantees | λ is a violation-tolerant version with an exact algorithm. Kawashima–Sukegawa prove all-or-nothing component orderings, with no bounded-violation result or algorithm. |
| Betzler et al. | FPT for Kemeny in average KT distance, dirty pairs | Proposition 5(b) bounds λ by 18× the average distance to the consensus. |

**Novelty statement.** I found no prior statement of λ(A), Theorem 3 or Theorem 4. I did not find them in the papers above, and two extended searches for weighted ordering parameterized by cutwidth-type or decomposition parameters returned nothing closer. This is a **novelty candidate**, not established novelty. A specialist may well regard Theorem 4 as a natural corollary of the k-cut framework once λ is defined.

---

## G. Independent computational checks

Environment: 2-core VM, 7 GB RAM, Python 3.13, NumPy 2.5.3, SciPy 1.18.1. One process per run, 180 s limit, AutoCut state cap 1.5 million.

### G1. Exhaustive verification (`falsify22.py`, exact integers)
650 random instances (n ≤ 7; six families including ties, zero-heavy and wide magnitudes). λ(A) was computed by brute force over **all** ordered partitions and ω(A) over all n! orderings.

| Check | Result |
|---|---|
| ω(A) ≤ λ(A) | 650/650 |
| cut DP at k = ω returns OPT | 650/650 |
| Lemma 2 count bound at k = λ and λ + 3 | 0 violations |
| Discovery returns exactly λ at k = λ, and nothing at k = λ − 1 | 650/650 |
| AutoCut returns OPT with final k < 2λ | 650/650 |
| Proposition 5(a) | 383/383 applicable |
| Proposition 5(b), 200 Kemeny profiles | 0 violations; largest observed (λ−1)/(score/m) = 6.0 |

ω < λ strictly in all 650; the largest gap was 38.

NumPy prototype versus exact subset DP: 120/120 (n ≤ 10); same terminating k as the integer reference on 78/78 (n ≤ 8).

### G2. Benchmark (`results22.jsonl`, `table22.md`)
Cells: wall time / retained states. "chain" instances are Paley blocks of the listed sizes with a fraction q of reversed cross pairs.

| instance | AutoCut (no partition) | LDP-021 (planted partition given) | BLX 2.0 | packing SLDP | HiGHS MILP | λ found (b, K₀) | k first optimal / k certified |
|---|---|---|---|---|---|---|---|
| chain 3, n=24, q=.01, s1 | 0.24 s / 33,147 | 0.01 s / 288 | 0.09 s / 25 | 0.03 s / 25 | 0.06 s | 18 (3, 3) | 4 / 21 |
| chain 3, n=36, q=.005, s1 | 0.26 s / 11,256 | 0.01 s / 184 | 0.08 s / 37 | 0.05 s / 37 | 0.14 s | 12 (3, 1) | 4 / 14 |
| chain 3, n=48, q=0, s1 | 0.25 s / 3,299 | 0.02 s / 113 | 0.07 s / 49 | 0.08 s / 49 | 0.38 s | 9 (3, 0) | 4 / 9 |
| chain 7×3×1, n=22, q=.02, s1 | 7.08 s / 1,143,531 | 0.01 s / 182 | 0.03 s / 23 | 0.02 s / 23 | 0.04 s | 48 (3, 13) | 9 / 48 |
| chain 1, n=30, q=.02, s1 | **unresolved** | 0.05 s / 6,010 | 0.03 s | 0.03 s | 0.07 s | — | gave up at k=48 |
| chain 7, n=21, q=0, s1 | **unresolved** | 0.01 s / 382 | 0.03 s | 0.02 s | 0.04 s | — | gave up at k=72 |
| chain 3, n=24, q=.01, s2 | 0.18 s / 6,437 | 0.01 s / 120 | 0.04 s | 0.02 s | 0.05 s | 12 (3, 1) | 4 / 14 |
| chain 3, n=36, q=.005, s2 | **unresolved** | 0.04 s / 5,119 | 0.05 s | 0.04 s | 0.14 s | — | gave up at k=48 |
| chain 3, n=48, q=0, s2 | 0.31 s / 3,299 | 0.03 s / 113 | 0.08 s | 0.08 s | 0.32 s | 9 (3, 0) | 4 / 9 |
| chain 7×3×1, n=22, q=.02, s2 | **unresolved** | 0.01 s / 1,527 | 0.03 s | 0.02 s | 0.04 s | — | gave up at k=72 |
| chain 1, n=30, q=.02, s2 | 2.90 s / 388,521 | 0.04 s / 3,235 | 0.03 s | 0.03 s | 0.07 s | 31 (1, 10) | 4 / 32 |
| chain 7, n=21, q=0, s2 | **unresolved** | 0.01 s / 382 | 0.03 s | 0.02 s | 0.03 s | — | gave up at k=72 |
| band n=20 / 30 / 45 / 60 | **unresolved** (all four) | 0.34 s / 58 s / timeout / crashed | 1.20 / 0.04 / 0.65 / 3.51 s | 0.02–0.12 s (76–236 states) | 0.03–0.71 s | — | gave up |
| blocks n=29, core 19 | **unresolved** | 2.21 s / 524,298 | 2.02 s / 22,573 | 10.76 s | unresolved (60 s) | — | gave up at k=72 |
| uniform n=22; ties n=22 | **unresolved** | 9.3 s; 9.0 s (all 2²² sets) | 0.04 s; 0.08 s | 0.03 s; 0.13 s | 0.10 s; 0.08 s | — | gave up at k=72 |
| near-transitive n=40 | **unresolved** | crashed | 0.12 s | 0.07 s | 0.22 s | — | gave up at k=72 |

- Every solver that finished agreed on the optimum, on all 20 instances.
- **AutoCut proved 7 of 20.** In 6 of those 7 it recovered the planted partition exactly. Its certificates were ≤ 214 bytes and re-verified in 0.03–1.7 s. Peak memory 454 MB.
- **It lost everywhere on speed.** With the partition supplied, 021's LDP was 10–700× faster on the instances both solved. BLX 2.0 and SLDP were faster still, and solved all 20.
- **Search versus proof.** In all 7 proved cases the optimum was already found at k = 4–9, while certification needed k = 9–48. On the band family the optimum appears at k = 4 with 92–252 states, growing linearly in n, and partition certification never succeeds — exactly as Theorem 7 predicts.
- Prototype limits: the τ list is subsampled for real-valued weights (sound, possibly non-minimal witness), and discovery is skipped when the boundary set is too large. The exact reference `exact.py` has neither limit.

---

## H. Significance and generality

- **What is established.** A partition-free, always-correct exact algorithm whose exponent is the best block-localization exponent over all partitions, with the parameter itself computed and witnessed. It contains the classical 2^{O(√OPT)} algorithms as a special case (up to constants) and is ETH-tight in form.
- **Generality.** Every proof uses only that the objective is a sum of position-independent pairwise terms. So Theorems 1–7 hold verbatim for linear ordering with arbitrary matrices, Kemeny aggregation, weighted FAST and one-sided crossing minimization. They do **not** extend to betweenness, position-dependent scheduling costs or quadratic assignment.
- **What limits it.** The b² term makes λ ≥ 361 for one 19-vertex frustrated block, so the worst-case bound is useless there, while BLX's bound tables handle it. The theorem explains tractability; it does not deliver it.

---

## I. Implications for Westfall Optimization

1. The public flagship statement can eventually change from "given a good partition" to "without a partition", **after** independent review. I have not touched the website or the public theorem.
2. BLX's heuristic segmentation could be replaced by Theorem 3's discovery when λ is small. On these benchmarks it would not help speed.
3. The practical frontier is unchanged: bounds (triangle packing, block tables) do the real work. The band family shows bound-based certificates succeed where every partition certificate fails.

---

## J. Research assessment

**Theoretical contribution (provisional; independent review outstanding).**

- *Strengths:* a precisely stated algorithm and structural parameter with FPT recognition, a claimed comparison with a classical parameter and a separation example, an ETH-based lower-bound argument, and a search/certificate separation.
- *Limitations:* the cut-state mechanism builds on Fomin–Pilipczuk; the structural bound uses an exchange lemma from Discovery 021; the parameter is tailored to this approach; no practical speed advantage has been demonstrated; novelty remains unreviewed.
- *Prior-art risk:* a specialist may find Theorem 4 to follow directly from known k-cut techniques or identify the same parameter under another name.

---

## K. What remains uncertain

1. **Novelty.** Not independently confirmed.
2. **Complexity of computing λ(A).** NP-hardness is open. Only FPT membership (Theorem 3) is proved.
3. **Is the exponent constant improvable?** 18.2·√λ is crude; the squared node count in discovery is the main loss.
4. **Fomin–Pilipczuk's general bound.** I rely on their Corollary 10 only for the promise version, and read it through a summary of the paper rather than line by line.
5. **Theorem 7(b)** has a sketched general argument and exhaustive verification for p ≤ 6 only.
6. **Floating point.** The NumPy prototype is not exact; the integer reference is, but only for small n.
7. Only one or two seeds per benchmark configuration; no specialised LOP solver was run.

---

## L. Next research milestone

**Certify ω, not λ.** Theorem 7 shows the true search parameter is the optimal width ω(A), and that partitions cannot certify it. The target:

> Find a checkable certificate, of size polynomial in the number of k-cuts, proving that no ordering leaving 𝒞_k beats the best ordering inside it. Natural candidates are overlapping-window (path-like) decompositions that generalize ordered partitions, or frontier exclusion with dual bounds.

A success would give an exact algorithm in 2^{O(√(ω log ω))}·poly(n), which on the band family is polynomial. Secondary: settle NP-hardness of λ.

---

## M. Grant relevance

**Yes, it strengthens an application substantially more than Discovery 021 did**, with conditions. There is now one clean headline theorem that a parameterized-algorithms reviewer can check in an afternoon, a matching lower bound, a proved limitation, and a full falsification record. It must be presented as an unreviewed candidate, with Fomin–Pilipczuk credited for the engine and the negative benchmark shown. Obtaining one expert reading of Sections B–C should come before any submission.

---

## N. Files and reproduction

All on local branch `discovery-022`, directory `research/discovery-022/`. Nothing was pushed and the website was not changed.

| File | Purpose |
|---|---|
| `exact.py` | Exact integer reference: cuts, K₀, brute-force λ and ω, `gen_cuts`, `discover`, `auto_solve` |
| `falsify22.py` | Exhaustive checks of Theorems 1, 3, 4, Lemma 2, Proposition 5(a) |
| `kemeny_check.py` | Proposition 5(b) |
| `band.py`, `discarded.py` | Theorem 7 and discarded conjectures |
| `cutdp.py`, `test_cutdp.py` | NumPy prototype `autocut` and its exactness test |
| `run22.py`, `bench22.py`, `summarize22.py` | Benchmark |

```bash
cd research/discovery-022
pip install -e ../..                          # the westfall_optimization package
python falsify22.py 150 6 1                   # ~2 s
python falsify22.py 500 7 2                   # several minutes
python kemeny_check.py
python band.py 7 8 9 10 12
python discarded.py
python test_cutdp.py
python bench22.py results22.jsonl && python summarize22.py
```

---

## Sources

- Fomin & Pilipczuk, arXiv:1301.7314 — https://arxiv.org/abs/1301.7314
- Karpinski & Schudy, arXiv:1006.4396 — https://arxiv.org/abs/1006.4396
- Feige, *Faster FAST*, arXiv:0911.5094 — https://arxiv.org/abs/0911.5094
- Alon, Lokshtanov & Saurabh, *Fast FAST*, ICALP 2009 — https://link.springer.com/doi/10.1007/978-3-642-02927-1_6
- Barbero, Paul & Pilipczuk, arXiv:1706.00617 — https://arxiv.org/abs/1706.00617
- *Sub-exponential k-cut bounds for digraphs of bounded independence number*, Algorithmica 85 (2023) — https://link.springer.com/content/pdf/10.1007/s00453-022-01093-w.pdf
- Phung & Hamel, arXiv:2506.15097 — https://arxiv.org/pdf/2506.15097v2
- Kawashima & Sukegawa, arXiv:2609.19593 — https://arxiv.org/pdf/2609.19593
- Akbari & Escobedo (2023) — https://par.nsf.gov/servlets/purl/10413767
- Betzler, Bredereck & Niedermeier — https://ccc.cs.uni-duesseldorf.de/COMSOC-2010/papers/46-betzler.pdf
- Stein & Andres, ICML 2024 — https://proceedings.mlr.press/v235/stein24a.html (not re-read in this session)
- Discoveries 019 and 021: `papers/square-root-block-localization-v2.md`, `research/discovery-021/`