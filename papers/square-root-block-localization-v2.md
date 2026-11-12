# Square-Root Block Localization for Exact Weighted Linear Ordering

*Provisional manuscript (WESTFALL Discovery 019; revises Discovery 018). Not peer-reviewed. Novelty has been checked against the closest literature but not by a specialist referee.*

Caleb Westfall (research lead) · with Claude (Anthropic), AI research collaborator · 12 November 2026

---

## Abstract

We study exact maximisation of F_A(π) = Σ_{r<s} a_{π_r π_s} over permutations, for a skew-symmetric real matrix A: the weighted linear-ordering / feedback-arc-set-in-tournaments problem. Our algorithm is a threshold-pruned prefix dynamic program ("exclusion DP"). It uses a *hybrid hereditary bound* assembled from:
- exact optima on subsets of the blocks of an ordered partition;
- a fractional packing of directed triangles that meet three distinct blocks.

**Main theorem.** Fix an ordered partition into blocks of size at most b. Let K = ⌊(δ + 3X)/μ₊⌋ + z, where:
- X is the weight of cross-block edges that disagree with the block order;
- μ₊ is the smallest nonzero cross-block margin;
- z is the number of zero-weight cross pairs;
- δ is the incumbent gap.

Then the algorithm generates at most n(n+1)·P(2K + b²) prefix states, where P(M) = Σ_{j≤M} p(j) counts integer partitions. It therefore solves the instance exactly, with an exact-arithmetic optimality certificate, in time

  poly(n) · 2^{O(b + √K)},

preprocessing included.

**The counting is tight.** The family of prefix sets with at most K cross-block inversions has size 2^{Θ(b+√K)} up to poly(n) factors. Exhaustive enumeration and exact generating-function computations confirm that log₂ count − b grows like c·√K with c essentially independent of b.

**The zero-weight term is necessary.** A family with z zero-weight pairs forces 2^{Ω(√z)} retained states.

**Relation to prior work.** Karpinski–Schudy's 2^{O(√OPT)} algorithm for weighted FAST charges the *total* optimal cost, including frustration inside blocks. Our bound charges internal frustration only through 2^b. On m internally frustrated blocks of size b with sparse inconsistent cross edges, the guarantees are 2^{O(b√m + √K)} versus 2^{O(b + √K)}.

**Software and experiments.** We give an exact (integer-arithmetic) certificate verifier that rejected every invalid tampered certificate we tried. Our algorithm-selection portfolio (BLX 2.0) was evaluated out of sample. The method wins clearly on instances with embedded cyclic cores and loses to a generic MILP on LOLIB input–output instances; we report both.

## 1. Introduction

Exact linear ordering is NP-hard even on unweighted tournaments (Alon; Charbit–Thomassé–Yeo). Practical exact methods rely on LP relaxations and cutting planes, Lagrangian branch-and-bound (Charon–Hudry), partial-optimality preprocessing (Stein–Andres), and Condorcet-type decomposition rules from Kemeny aggregation. These leave a gap in one regime: **instances whose frustration is concentrated in hard cyclic regions that are coupled by mostly, but not perfectly, consistent preferences.**

- Condorcet decompositions require *every* cross edge to agree with the block order.
- LP relaxations inherit the integrality gap of the cyclic regions (Newman–Vempala show gap 2 for standard relaxations).
- Parameterized algorithms charge the total optimal cost, including internal frustration.

Our earlier work (Discoveries 017–018) introduced exclusion DP and a hybrid hereditary bound, and proved a state bound of n(m+1)·2^b·(2Kb+1)^K. This paper replaces that bound with a tight square-root theorem, removes the requirement of a positive minimum margin, adds exact certification, and evaluates an honest solver portfolio.

## 2. Prior art and the exact separation

| Work | What it proves | What it does not imply |
|---|---|---|
| Karpinski–Schudy (ISAAC 2010): DP over position windows around an approximate ranking; valid sets ≤ n·2^ψ, ψ = O(√OPT); weights with w_uv + w_vu = 1; OPT = total backward weight | O*(2^{O(√OPT)}) for weighted FAST; ETH lower bound 2^{o(√OPT)} | Any bound in which internal block frustration is excluded from the exponent |
| Feige, *Faster FAST* | n^{O(1)}·2^{O(√k)} for unweighted FAST | Same |
| Truchon's extended Condorcet criterion; finest Condorcet partitions (Phung–Hamel 2025; Akbari–Escobedo 2023) | Exact decomposition when all cross pairs agree (our X = z = 0); ACP adds **approximation** guarantees only, with no running-time or state-count bound | Exact solution when some cross pairs disagree |
| Stein–Andres (ICML 2024) | Polynomial-time pair-fixing via improving maps | Global exactness |
| Morin–Marsten; state-space relaxation | Bounded DP as a technique | Any parameterized state count |

**Separation of guarantees.** Consider m blocks, each internally a Paley-like tournament of size b (internal optimal cost Θ(b²)), with consistent cross edges except K inconsistent pairs.
- OPT ≥ Σ_i β*(B_i) = Θ(m·b²), so the Karpinski–Schudy guarantee is 2^{O(b√m + √K)}.
- Ours is 2^{O(b + √K)}.
- Condorcet partitioning merges any two blocks joined by an inconsistent pair. Its guarantee is therefore 2^{O(size of the merged component)}, which can be the whole instance.

This is a separation of *guarantees*, not a proven lower bound on the other algorithms' actual running time.

## 3. Definitions

- An **ordered partition** 𝓑 = (B_1, …, B_m) has b = max_i |B_i|, and blk(v) is the index of v's block.
- For S ⊆ V: I_𝓑(S) = |{(w, u) : w ∉ S, u ∈ S, blk(w) < blk(u)}| counts cross-block inversions.
- 𝒮_K = {S : I_𝓑(S) ≤ K}.
- β*(T) is the minimum backward weight of an ordering of T. W(T) = Σ_{pairs in T} |a|, and g(T) = OPT(A|T) = W(T) − 2β*(T).
- Exclusion DP keeps prefix S iff f(S) + r(S) + U(V∖S) ≥ L, where U is admissible, L is an incumbent's score, and δ = (OPT − L)/2.
- p(j) is the partition function and P(M) = Σ_{j≤M} p(j).

## 4. Main results

**Theorem A (square-root counting).** For every ordered partition with maximum block size b, every n and every K ≥ 0:

  |𝒮_K| ≤ (n+1)·P(2K + b²) ≤ (n+1)(2K + b² + 1)·exp(π·√(2(2K + b²)/3)) = poly(n)·2^{O(b + √K)}.

**Theorem B (tightness).** For every b ≥ 2 and K ≥ 0 there are partitions with:
- |𝒮_0| ≥ 2^b;
- |𝒮_K| ≥ C(b, ⌊b/2⌋)^r, where r = max{r : C(r, 2)·⌊b/2⌋·⌈b/2⌉ ≤ K}, so log₂|𝒮_K| ≥ (√(8K)/b − 1)·(b − log₂(b+1)) = Ω(√K) for b ≥ 3.
- For singleton blocks (b = 1), |𝒮_K| ≥ p(K).

Hence the true order is 2^{Θ(b + √K)} up to poly(n) factors.

**Theorem C (zero-weight extension, and its necessity).**
- With K = ⌊(δ + 3X)/μ₊⌋ + z, every state retained by exclusion DP using any admissible U ≤ U_hyb satisfies I_𝓑(S) ≤ K.
- Conversely, for every z there are instances with z zero-weight cross pairs, X = 0 and δ = 0, in which every exact exclusion DP retains at least 2^{⌊√(2z)⌋} states.

**Corollary D (exact algorithm).** Given any ordered partition, the hybrid-bound exclusion DP generates at most n·|𝒮_K| ≤ n(n+1)·P(2K + b²) states. It solves the instance exactly in

  O(n²·n(n+1)·P(2K + b²)) + O(m·b·2^b) + LP(n³)

time, i.e. poly(n)·2^{O(b+√K)}. The output includes OPT, an optimal permutation, all certified precedence relations, and an exact certificate.

## 5. Proofs

### Lemma 1 (within-block mass)

**Statement.** For S ⊆ V, let a_k = |B_k ∖ S| and x_k = |B_k ∩ S|. Then Σ_k a_k·x_k ≤ b² + I_𝓑(S).

**Proof.**
1. Only partial blocks (a_k, x_k ≥ 1) contribute. Index them k = 1, …, P in block order and set t_k = min(a_k, x_k) ≤ b/2.
2. For k < l, the pairs (absent vertex of B_k, present vertex of B_l) are cross-block inversions, so I_𝓑(S) ≥ Σ_{k<l} a_k·x_l ≥ Σ_{k<l} t_k·t_l.
3. Let s = Σ_k t_k. Then s² = Σ_k t_k² + 2·Σ_{k<l} t_k t_l ≤ (b/2)·s + 2·I_𝓑(S).
4. So s ≤ b/4 + √(b²/16 + 2I) ≤ b/2 + √(2I).
5. Finally Σ_k a_k x_k ≤ Σ_k max(a_k, x_k)·t_k ≤ b·s ≤ b²/2 + b·√(2I) ≤ b² + I, using b·√(2I) ≤ (b² + 2I)/2. ∎

### Proof of Theorem A

1. **Encoding.** Fix any linear order π of V that lists the blocks in order, with an arbitrary fixed order inside each block. Encode S as the binary word ω(S) = (1[π_1 ∈ S], …, 1[π_n ∈ S]). The map S ↦ ω(S) is a bijection onto {0,1}^n.
2. **Inversions.** The inversion number inv(ω) = |{i < j : ω_i = 0, ω_j = 1}| splits as I_𝓑(S) plus the within-block inversions. In block k there are at most a_k·x_k of these.
3. **Apply Lemma 1.** inv(ω(S)) ≤ 2·I_𝓑(S) + b² ≤ 2K + b².
4. **Count the words.** Binary words of length n with exactly s ones and exactly j inversions correspond bijectively to partitions of j with at most s parts, each at most n − s (Young diagrams in an s × (n−s) box). So for each s there are at most p(j) such words.
5. **Sum.** Summing over s ∈ {0, …, n} and j ≤ 2K + b² gives |𝒮_K| ≤ (n+1)·P(2K + b²).
6. **Analytic estimate.** The bound p(j) < exp(π√(2j/3)), valid for all j ≥ 1, finishes the proof. ∎

### Proof of Theorem B

- **First bound.** Any S of the form B_1 ∪ … ∪ B_{k−1} ∪ Y with Y ⊆ B_k has I = 0. Choosing Y freely in a block of size b gives |𝒮_0| ≥ 2^b.
- **Second bound.** Take r consecutive blocks of size b, preceded by full blocks and followed by empty blocks, each containing exactly ⌊b/2⌋ present vertices (chosen arbitrarily).
  - Then I = C(r, 2)·⌊b/2⌋·⌈b/2⌉.
  - The number of such sets is C(b, ⌊b/2⌋)^r ≥ (2^b/(b+1))^r.
  - With r ≈ √(8K)/b this gives exponent ≥ √(8K)·(1 − log₂(b+1)/b).
- **Third bound.** For b = 1, 𝒮_K contains every set whose word has at most K inversions, and there are at least p(K) of them. ∎

### Proof of Theorem C

This modifies step (d) of Discovery 018's Theorem 2. The steps there are:
- (a) β* ≤ Σ_i β*(B_i) + X;
- (b) the suffix gap of U_hyb is at most X;
- (c) β_S ≥ Σ_i β*(B_i) + d⁻_cross(S).

None of these uses margins.

**Step (d), revised.** Each inverted cross pair (w, u) falls into one of three cases:
- a_wu ≥ μ₊, contributing at least μ₊ to d⁻_cross(S);
- a_wu < 0 (reversed): such pairs have total weight at most X, hence number at most X/μ₊;
- a_wu = 0: there are at most z of these.

So d⁻_cross(S) ≥ μ₊·(I − X/μ₊ − z) = μ₊·I − X − μ₊·z. Combining:
- def(S) ≥ μ₊·I − 2X − μ₊·z;
- def(S) ≤ δ + X (Lemma 0 of Discovery 017 together with (b)).

Therefore I ≤ (δ + 3X)/μ₊ + z.

**Necessity.** Take n = ⌊√(2z)⌋ singleton blocks with all weights zero, so z ≥ C(n, 2), X = 0 and δ = 0. Every ordering is optimal, so every subset is the prefix set of an optimal ordering. Any exact exclusion DP (threshold ≤ OPT) must therefore retain all 2^n subsets. ∎

### Proof of Corollary D

- Every retained state lies in 𝒮_K (Theorem C), and each has at most n children. So at most n·|𝒮_K| states are generated, and Theorem A bounds this.
- Each state costs O(n²) for its gain, r(S) and W(V∖S), plus O(m·b + |supp y'|) for the bound.
- Block tables cost O(m·b·2^b). The two packing LPs have O(n³) columns. Segmenting the incumbent into blocks costs O(n² + n·b_max).
- Pair certification over the retained DAG adds one factor of n. ∎

**Remark (ETH).** Karpinski–Schudy show that weighted FAST admits no 2^{o(√OPT)} algorithm unless ETH fails. With singleton blocks, X equals the incumbent's backward weight. So under ETH no algorithm achieves 2^{o(√K)} *uniformly*, at least on instances where their reduction keeps μ₊ bounded below. We have not verified this transfer in detail.

## 6. The algorithm (BLX 2.0)

1. **Incumbent:** best of 5 insertion local searches.
2. **Features:**
   - the triangle-packing LP lower bound and the relative root gap g;
   - the zero-entry fraction ζ;
   - the hybrid root lower bound after exact segmentation, and the fraction ρ of the root gap it closes.
3. **Route:**
   - n > 62 → MILP (DP masks are 64-bit);
   - ζ ≥ 0.05 and g ≥ 0.03 → MILP for 30 s, then exclusion DP;
   - g < 0.03 → packing SLDP;
   - ρ ≥ 0.3 → hybrid exclusion DP (BLX);
   - otherwise → packing SLDP.

   The thresholds were set on the Discovery 018 instances (training) and evaluated on fresh seeds and held-out LOLIB instances (test). This is an engineering portfolio, not a theorem.
4. **Search:** exclusion DP, backward pass, all-pairs certification.
5. **Certificate:** generated in exact integer arithmetic (Section 7).

## 7. Exact certification

All inputs (IEEE doubles, or LOLIB integers) and LP packing values are dyadic rationals. The producer:
1. converts them exactly;
2. rescales the packings, if needed, to exact feasibility (not needed in any of our runs);
3. multiplies by a common denominator D.

The verifier is written independently of the search code, in pure integer arithmetic. It checks:
1. skew-symmetry, and that the certificate is bound to the user's input matrix;
2. that the threshold is the recomputed score of the stated incumbent;
3. every packing triangle is a directed 3-cycle; every arc load is within capacity; hybrid triangles are transversal for the stated partition;
4. block tables, recomputed by its own exact subset DP;
5. every DP value and every kept state's parent;
6. every excluded child's inequality, exactly;
7. that the claimed permutation's exact score equals the DP value at V.

The partition is untrusted: any partition yields a valid bound.

**Tampering tests** (5 instances, 8 tampers each; Appendix C):

| Tamper | Outcome |
|---|---|
| Dropped kept state, deleted layer, inflated packing value, wrong order, non-skew matrix | Rejected, every time |
| Consistently altered matrix | Accepted as a valid certificate *for the altered instance*. We verified this by exact subset DP: the altered OPT is 86 vs the original 85. Rejected once the certificate is bound to the original input. |
| Moving a vertex between blocks | Rejected when it makes a packing triangle non-transversal; otherwise accepted, which is correct because any partition yields a valid bound |

**Cost.** Exact verification took 0.0–33 s on certificates with up to 2,659 kept states and 35,470 exclusions. Multi-million-state certificates need a compiled verifier (future work).

## 8. Experiments

*(Section E of the report contains the full tables; summary here.)*

**Combinatorics.**
- Theorem A: 0 violations in 7,192 exhaustive checks (232 partitions, n ≤ 16, blocks ≤ 4, K ≤ 30). The exact DP counter matches brute force everywhere.
- At scale (n up to 608) the bound is within a factor of 1.4–2.3 in the exponent of the true count.
- (log₂|𝒮_K| − b)/√K ≈ 3.0–3.3 at K = 256, for every b from 1 to 32.

**Solver correctness.**
- Hybrid bound: 0 admissibility violations over 81,920 subset checks.
- All exact solvers agree on every instance where they finish.
- Exact verification: every certificate tried was accepted, and every invalid tamper was rejected.

**Solver-level theorem check.** 80 runs (n = 8 and 11; ties, zero-weight mixes, uniform and near-transitive weights; segmentation-derived and random partitions):
- 0 survivors violate I(S) ≤ K with the zero-aware K, and the largest observed I − K was −3;
- 0 runs exceed the generated-state bound.

**Out-of-sample benchmark.** Fresh seeds (101), 8 held-out LOLIB IO instances and 2 xLOLIB instances (n = 150); same VM; every solver in its own process. Times are in seconds; "n.p." means not proved within 60 s.

| Family / instance | Packing SLDP | BLX 1.0 | BLX 2.0 (route) | HiGHS MILP |
|---|---|---|---|---|
| C, n=29, Paley(19), q = 0 / 0.02 / 0.05 | 10.7 / 10.3 / 10.7 | 1.7 / 1.8 / 8.8 | 2.2 / 1.7 / 12.1 (blx, blx, sldp) | n.p. ×3 |
| C, n=35, q = 0 / 0.02 / 0.05 | 18.9 / 19.1 / 21.7 | 4.5 / 17.5 / 23.3 | 4.5 / 17.5 / 22.4 | n.p. ×3 |
| C, n=45, Paley(19)+Paley(11), q = 0 / 0.02 / 0.05 | 42.5 / 41.3 / 46.8 | 5.5 / 5.5 / 20.8 | 5.3 / 5.6 / 20.3 | n.p. ×3 |
| C, n=50, 3×Paley(11), q = 0 / 0.03 / 0.08 | 0.30 / 0.41 / 0.85 | 0.14 / 0.58 / 1.49 | 0.22 / 0.55 / 1.18 | n.p. ×3 |
| C-adv, n=29, q = 0.25 | 35.8 | 38.1 | 37.3 (sldp) | n.p. |
| A: near-transitive, n = 40 / 60 | 0.07 / 0.20 | 2.5 / 2.9 | 0.07 / 0.16 | 0.2 / 0.6 |
| B: planted (3 configurations) | 0.07–0.16 | 0.7–2.6 | 0.08–0.17 | 0.3–0.5 |
| D: uniform / ties | 0.04 / 0.12 | 1.2 / 0.18 | 0.04 / 0.06 | 0.1 / 0.0 |
| LOLIB IO t59d, t65d, t70d, t74d, t75e | 0.16–14.8 | 0.34–22.1 | 0.32–0.39 (milp) | 0.2–0.3 |
| LOLIB IO tiw56n54, stabu70, be75oi | timeout (300) | timeout | 0.55–1.81 (milp) | 0.4–1.6 |
| xLOLIB be75np_150, be75eec_150 | n/a (n > 62) | n/a | UNRESOLVED (reported) | n.p. |

- All finished solvers agree on every optimum.
- BLX 2.0's time relative to the best single solver: median 1.23×, maximum 2.0× (28 instances).
- **In-sample** (54 Discovery 018 instances): median 1.11×, 90th percentile 2.4×, maximum 23.9×. The worst cases are instances solved by SLDP in under 0.5 s, where BLX 2.0's fixed 1.2–2.5 s feature cost dominates.
- **Generic MILP:** proved none of the 13 Family C test instances in 60 s, and was the right tool for LOLIB IO.

## 9. Limitations

1. **A partition is required.** The guarantee is relative to the ordered partition supplied (found by exact segmentation of a heuristic incumbent). We do not compute an optimal partition, and doing so may be hard.
2. **Many zero ties.** When zero-weight cross pairs are numerous (LOLIB IO), Theorem C is vacuous. The necessity half shows this is inherent to exclusion DP, not an artifact of the proof.
3. **Constants are large.** The worst-case bound (≈ 2^92 at K = 0, b = 20, n = 29) is far above the measured counts (hundreds to thousands of states). The theorem explains *scaling*, not observed counts.
4. **Baselines.** No specialized LOP branch-and-cut code was available for comparison; the generic HiGHS triangle MILP is a weaker baseline.
5. **Implementation.** Python search; n ≤ 62; exact verification is practical only up to roughly 10⁴–10⁵ states.
6. **Novelty.** Specialist review has not been obtained.

## 10. AI-assisted discovery methodology (ProofScope case study)

The full log is in Appendix D. In brief:
- The brief proposed a 2^{O(b+√(Kb))} target. A direct proof gave that bound.
- Exact asymptotic computation then showed it was loose: the √K coefficient is independent of b. That redirected the proof to Lemma 1 (Σ a_k x_k ≤ b² + I) and the tight 2^{Θ(b+√K)} theorem.
- Discovery 018's double-counting check (non-transversal triangles) and its triangle-mask bug were caught by exhaustive admissibility tests.
- Tampering exposed the need to bind certificates to the input.
- The MILP superiority on LOLIB IO was reproduced rather than hidden, and led to the portfolio.

## 11. Conclusion

The block-localization barrier in Discovery 018 was an artifact of the counting proof, not of the mathematics. The tight bound is poly(n)·2^{Θ(b + √K)}, and the zero-weight term is necessary.

This gives an exact algorithm whose exponent excludes internal block frustration, a guarantee not implied by the Karpinski–Schudy or Condorcet-partition results we examined. It comes with exact certificates. Its practical value is real but narrow; we hope a specialist review will settle its novelty.

## Appendices

- **A.** Full proofs (Section 5) and the Discovery 018 Theorem 2 steps (a)–(c).
- **B.** Code: `westfall019_code.zip`.

  | Script | Role |
  |---|---|
  | `counting.py`, `phaseA1.py`, `phaseA2.py`, `asym.py` | Combinatorics |
  | `verify_thm19.py` | Solver-level theorem |
  | `make_cert.py`, `verify_exact.py`, `test_exact.py` | Exact certificates |
  | `features.py`, `runone.py` (solver `blx2`), `bench19.py`, `sum19.py` | Portfolio and benchmarks |
- **C.** Tampering log.
- **D.** Counterexample and attempt log (see report Section C).
