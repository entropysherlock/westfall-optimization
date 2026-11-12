# WESTFALL Discovery 018 — Final Report

Prepared for Caleb Westfall · 12 November 2026. Companion files:
- `PAPER_provisional.md` — the full manuscript (K);
- `westfall018_code.zip` — code, raw logs (`grid.jsonl`, `lolib.jsonl`) and the paper.

**Verdict up front.**
- **Proved, implemented and benchmarked:** a sound new bound, a block-localization theorem with computable parameters, and a mixed-sign block-order certificate with a brute-force-verified strict separation.
- **Measured advantage:** 7–14× speed-ups on embedded-cyclic-core instances.
- **Measured losses:** on LOLIB input–output instances, a generic MILP wins by orders of magnitude.
- **Level 3 is not established.** The K = 0 case is classical, the exponent is weak, and novelty is unverified. **Overall: Level 2+, with one result (Theorem 2) that could reach Level 3 if a specialist review clears it.**

---

## A. Main theorem and significance

**Theorem 2 (block localization).**
- **Setup.** An ordered partition of V into m blocks, with:
  - largest block size b;
  - reversed cross weight X (the weight of cross-block edges that disagree with the block order);
  - minimum cross margin μ_c > 0;
  - incumbent gap δ.
- **Statement.** Exclusion DP with the hybrid hereditary bound (Theorem 1) keeps only prefix states with at most K = ⌊(δ + 3X)/μ_c⌋ cross-block inversions. It therefore generates at most n(m+1)·2^b·(2Kb+1)^K states.
- **Running time.** poly(n)·2^{O(b + K log(Kb))}, *including* partition discovery (exact DP on the incumbent), bound construction and certificate output.

**Significance.** Frustration *inside* blocks, however severe (Paley cores), costs only 2^b. Only cross-block inconsistency enters the exponent's second term. This is the brief's target poly(n)·2^{O(b+η)} with η = K, up to a log factor, and with η computable.

**Supporting results:**
- **Theorem 1 (hybrid hereditary bound):** exact block-subset optima plus a packing of *transversal* triangles (triangles meeting three distinct blocks). It is valid for every subset at once, with no double counting.
- **Theorem 3 (PBD certificate):** a pairwise block dual decomposition proving that every optimum is block-sorted despite mixed-sign cross edges.
- **Proposition 3.1:** PBD cannot succeed when blocks have rotationally symmetric optima, such as cyclic triangles.

## B. Complete proofs

These are in the manuscript, Section 4. The key steps:

**Theorem 1.** Internal and cross arcs are disjoint. Block tables lower-bound internal backward weight. Transversal triangles consist only of cross arcs, each needs at least one backward arc, and capacity constraints prevent overcharging.

**Theorem 2.**
1. β\* ≤ Σβ\*(B_i) + X (block-sorted ordering).
2. The suffix gap of U_hyb is at most X (same construction applied to the suffix).
3. β_S ≥ Σβ\*(B_i) + d⁻_cross(S): each block's split "X_i then Y_i" is a valid ordering of B_i.
4. d⁻_cross(S) ≥ μ_c·inv − X.
5. Together with the Discovery 017 localization lemma: μ_c·inv ≤ δ + 3X.
6. Counting: the first incomplete block contributes at most 2^b choices; at most K late vertices remain, lying within 2K blocks.

**Theorem 3.** F_A splits exactly into pairwise block subproblems. The upper bound Σ OPT(A^{(ij)}) is attained by the block-sorted ordering, which forces every optimum to be block-sorted.

## C. Algorithm and implementation

**BLX (Block-Localized Exclusion)**, in `runone.py`, `hybrid.py`, `sldp.py` and `cfd.py`:
1. incumbent by local search;
2. exact segmentation DP minimising X;
3. block-size choice by the Theorem 2 bound;
4. optional PBD certificate;
5. exclusion DP with min(packing bound, hybrid bound);
6. backward pass and exact pair certification.

Soundness never depends on the partition chosen.

## D. Certificate format and independent verifier

**Certificate:**
- incumbent order;
- kept states per layer with their f-values;
- packings y and y' (triangle masks and weights);
- block partition and block tables.

**Verifier (`verify_cert.py`, pure Python, no shared search code)** checks:
- packing feasibility and directed-cycle orientation;
- block tables, recomputed by brute force (blocks ≤ 8; larger blocks are flagged as trusted);
- every DP value;
- every excluded child's inequality;
- attainment of the optimum by the order.

**Status:**
- It accepted 3 certificates (n = 24, 14, 30).
- It is too slow for multi-million-state certificates.
- Certificates are **numerical**: floating-point with a 1e-7 tolerance, and packings shrunk by a factor (1 − 1e-9). No rational or interval version has been produced.

## E. Strict separation example

**Instance:** 9 vertices, three rigid weighted 3-cycle blocks (weights 3, 3, 1), and five negative cross edges: (0,7) −0.49, (0,8) −0.24, (1,5) −0.56, (2,7) −0.92, (3,7) −0.43. The matrix is saved as `sep18_A.npy`.

| Method | Cross-block relations certified (of 27) |
|---|---|
| **PBD** | **27** (minimum margin 0.123) |
| Stein–Andres single pass (transposition, grouping, conditional grouping, generalized shifting) + transitive closure + iterated surplus closure | 9 (misses 18) |
| Condorcet / module partition | not applicable (mixed signs) |

**Brute force over all 9! orderings:** unique optimum, 34.320902, block-sorted.

In 3,000 random rigid-block instances, PBD succeeded 521 times, and in 466 of those it strictly separated from the combination above.

**Not compared:** Stein–Andres Prop. 6.5 (iterative conditional grouping) and full ACC min-cut were not implemented.

## F. Controlled benchmark results

The full tables are in manuscript Section 6. Same VM throughout, separate processes, all optima cross-checked.

**Family C (frame + Paley cores):**

| Cross edges | BLX vs packing SLDP | Notes |
|---|---|---|
| q = 0 | **7–14× faster**; median states 28–300× fewer (up to ~6,000× on single runs) | Generic MILP proved 0/26 Family C instances in 60 s |
| q = 0.02 | 2–7× faster | |
| q = 0.05 | 1–1.3× faster | |
| Adversarial q = 0.25 | about 10% slower | K ≈ 420 |
| 3×Paley(11), q > 0 | 3× slower | SLDP is already sub-second |

**Families A, B, D (near-transitive, planted, random):** BLX is 1–3 s slower than SLDP (block-table and LP overhead). MILP is fastest or close.

**LOLIB (11 real instances):**
- **IO:** the generic MILP wins by 3× to over 1000×; be75eec is unsolved by the DPs within 900 s.
- **Paley instances pal19 and pal23:** DPs prove optimality where the MILP does not within 60 s.
- **Independent confirmation:** LOLIB's Paley optima 15, 43 and 69 match our Discovery 016 core values.

## G. Runtime and memory

**Worst case:** n(m+1)·2^b·(2Kb+1)^K states × O(n²) per state.

**Preprocessing:**

| Step | Cost |
|---|---|
| Segmentation | O(n² + n·b_max) |
| Block tables | O(m·b·2^b) |
| Two LPs | O(n³) columns |
| Pair certification | an extra n factor over the search |

**Measured peak memory:**
- Family C: 279 MB (BLX) vs 619–952 MB (SLDP).
- Easy families: 280–455 MB (BLX) vs 77–96 MB (SLDP), because of the 2^20 block tables.

## H. Comparison with prior art

| Prior work | Relationship |
|---|---|
| Condorcet partitions / modules (Truchon XCC; finest Condorcet partitions) | = our K = 0 case. Not claimed. |
| Stein–Andres 2024 | Pairwise and global improving maps. Cannot certify relations against a direct edge in a single pass. PBD strictly separates on the example above. |
| Karpinski–Schudy / Feige | 2^{O(√OPT)}. Related inversion counting. Different parameter (internal frustration excluded); incomparable bound; their √ is better than our K log K. |
| State-space relaxation / Morin–Marsten | The general bounding paradigm. The transversal hybrid bound and its localization theorem are the claimed additions. |
| Dual decomposition | PBD is an instance, with block-pair subproblems as an exact certificate. |
| Specialized LOP branch-and-cut | Not benchmarked; no implementation was available. |

## I. Hostile referee assessment

1. *"K = 0 is Condorcet decomposition; for K > 0 your exponent K log(Kb) makes Theorem 2 vacuous on most of your own benchmarks (K = 40–450)."*
   **Valid.** The gains occur at K ≤ ~20. A 2^{O(√K)} version is needed.
2. *"The 2^b factor is just subset DP inside blocks."*
   **Partly valid.** The content is the interaction bound. Pure-Paley "wins" are subset DP in disguise; the report says so.
3. *"Family C is designed for your method."*
   **Valid.** LOLIB shows no advantage on real IO data.
4. *"The baseline is a generic MILP, not a real LOP branch-and-cut."*
   **Valid.** This is the most important missing experiment.
5. *"Python DP vs compiled MILP."*
   **True.** But it disadvantages *our* method; the Family C gaps are algorithmic, not implementation effects.
6. *"Numerical certificates."*
   **Valid** for any publication claim; rational re-verification is needed.
7. *"PBD only works for rigid blocks."*
   **Proved** (Proposition 3.1) and stated.
8. *"Novelty search was shallow."*
   **Valid.** About 10 targeted searches.

**Referee recommendation:** major revision. With a 2^{O(√K)} bound, a specialized-solver comparison and exact certificates, it would be a reasonable SEA/ALENEX or INFORMS submission.

## J. WESTFALL rating

| Axis | Grade |
|---|---|
| Correctness | **High.** 81,920 admissibility checks, 60 brute-force runs, Theorem 2 bound attained exactly, cross-solver agreement everywhere, independent checker on small certificates. |
| Originality | **Unverified; plausibly modest.** Transversal hybrid bound, block-localization parameterization, PBD as a mixed-sign block certificate. |
| Theoretical significance | **Moderate.** It decouples internal from cross frustration, with a computable parameter. |
| Practical impact | **Narrow.** A real win on frame + cyclic core instances; a loss on LOLIB IO. |

**Overall: Level 2+. Level 3 is not demonstrated.**

## K. Provisional research paper

`PAPER_provisional.md` contains: Abstract, Introduction, Related work, Preliminaries, Main theorems with proofs, Algorithm, Experiments, Limitations, Discussion, Conclusion, plus appendices on AI-assisted provenance and reproduction.

## L. The most important next theorem

**Sharpen Theorem 2 to n^{O(1)}·2^{O(b + √(K b))}.** The route: replace the "≤ K late vertices among 2Kb" count with a partition-function count of block-level inversion profiles, in the style of Karpinski–Schudy. Pair it with an adaptive choice of b.

That would turn Theorem 2 into a clean FPT result that strictly improves on 2^{O(√OPT)} whenever internal frustration dominates. Together with a specialized branch-and-cut comparison and exact (rational) certificates, it is the realistic path to a defensible Level 3.
