# WESTFALL Discovery 017 — Report

**Exclusion–Localization: why threshold-pruned prefix DP is automatically subexponential, and a hereditary cycle-packing bound that makes it practical**

Prepared for Caleb Westfall · 12 November 2026. Every number below was measured in this session (`westfall017_code.zip`). The hardware is a 2-core, 8 GB VM. My code is Python/NumPy; the MILP baseline is compiled HiGHS called through SciPy.

**Bottom line up front.** I found and proved a clean structural theorem with an exact, certificate-producing algorithm, and it beats a standard MILP on one identifiable hard family. But its core combinatorial idea overlaps with Karpinski–Schudy and Feige, and its bounding idea overlaps with state-space relaxation. **I rate it Level 2+ with originality unverified, not Level 3.** Details are in Sections H–J.

---

## A. Prior-art audit (Stein & Andres, ICML 2024 and related work)

Stein–Andres prove partial-optimality conditions by building maps from the feasible set to itself that improve the objective. Their conditions are transposition, grouping, conditional grouping, shifting and generalized shifting.

Translation to our convention (maximising F = Σ_{i before j} a_ij): their cost is c_ab = −a_ab, so c^Δ_ab = −2a_ab.

| ACC component | Stein–Andres equivalent | Verdict |
|---|---|---|
| Global rule, original variant (a_xy + Σ_t min(a_xt+a_ty, 0) > 0) | **Transposition** (Prop. 4.4): c^Δ_ab + Σ_d (c^Δ_ad + c^Δ_db)⁺ ≤ 0 is literally the same inequality (theirs is weak and gives "some optimum"; ours is strict and gives "every optimum") | **Subsumed.** Not publishable as new. |
| Local surplus rule (2a_xy + Σ_t min(…) > 0, valid for every insertion-local optimum) | Not in their paper; their maps are global improving maps, not local-optimality arguments | **Distinct.** For a_xy > 0, their transposition condition implies ours, so ours certifies more transposition-type pairs (Theorem 1). |
| Anchored front/end moves | Related to grouping/shifting maps (moving sets to the front or end) | **Overlapping** in spirit; not identical. |
| Exact min-cut over three labels (B/T/A) for jointly feasible witnesses | Conditional grouping solves a min a–b cut over two-way splits R | **Different cut**, same family of technique. Novelty is marginal. |
| Iterative closure with certified P | Their Props. 6.3 and 6.5 (iterative, with fixed acyclic set P) | **Analogous.** |

**Empirical comparison** (single pass, empty P; 120 random 7-vertex instances, uniform and near-transitive; every certificate checked by brute force):

| Certified by | Ordered-pair certificates |
|---|---|
| Both | 1,091 |
| Surplus only | 57 |
| Stein–Andres only (mostly grouping) | 480 |

There were **zero soundness violations**. The criteria are **incomparable**, and Stein–Andres is stronger overall.

**Conclusion of the audit.** ACC's main rules are a variant within the Stein–Andres framework. The only clearly distinct piece is the insertion-local surplus with its factor 2 on the direct term. I would not submit ACC as a standalone novelty.

**Other prior art that turned out to matter:**
- **Karpinski–Schudy** (ISAAC 2010): O*(2^{O(√OPT)}) for weighted FAST, built on the key fact that low-cost rankings are close in Kendall-Tau distance, plus an ETH lower bound.
- **Feige** (Faster FAST): n^{O(1)}·2^{O(√k)} by dynamic programming.
- **Morin–Marsten** bounded DP, and Christofides–Mingozzi–Toth state-space relaxation.
- **Newman–Vempala:** LP integrality gap 2 for linear ordering.

---

## B. Main results

**Theorem 1 (two-insertion dominance; strict separation from Stein–Andres).**
- **Statement.** If 2a_xy + Σ_{t≠x,y} min(a_xt + a_ty, 0) > 0, then x precedes y in every insertion-local optimum, and so in every global optimum.
- **Comparison.** If a_xy > 0, the Stein–Andres transposition condition for (x, y) implies this one.
- **Strict separation.** The following 4-vertex instance is certified by Theorem 1 but by **none** of transposition, grouping, conditional grouping (exact over all R) or generalized shifting, applied to any pair, in a single pass. Take vertices x = 0, y = 1, t₁ = 2, t₂ = 3 with:
  - a_xy = 0.5;
  - a_xt₁ = −5, a_t₁y = 4.6;
  - a_xt₂ = 4.6, a_t₂y = −5;
  - a_t₁t₂ = −10.

  Then OPT = 10.5, the optimal orders are (0,1,3,2) and (3,2,0,1), and both insertion-local optima have x before y. The surplus is 0.2 > 0.

**Theorem 2 (Exclusion–Localization).** Let U be any admissible suffix bound, U(T) ≥ OPT(A|T), and run the prefix DP that keeps S iff f(S) + r(S) + U(V∖S) ≥ t, with t the score of a real ordering. Then:
- **(a) Completeness.** Every ordering with F ≥ t survives (Discovery 016, Theorem 2).
- **(b) Localization.** Every survivor S satisfies def(S) ≤ δ + ½·[U(V∖S) − OPT(A|V∖S)], where:
  - δ = (OPT − t)/2;
  - def(S) = β_S − β*;
  - β_S is the least backward weight of an ordering with prefix S, and β* = β_V.

**Corollary 3 (self-localization with the trivial bound).** Let U(T) = W(T) = Σ_{pairs in T} |a|, and let μ = min_{i≠j} |a_ij| > 0. Then every survivor satisfies:
- β*(S) + d⁻(S) ≤ β* + δ, where d⁻(S) = Σ_{w∉S, u∈S} max(a_wu, 0);
- hence, for every optimal π*, inv_{π*}(S) ≤ m := ⌊(2β* + δ)/μ⌋.

The algorithm therefore generates at most n(n+1)·Σ_{j≤m} p(j) states, which is O*(2^{O(√(β*/μ))}). Here p(j) is the partition function. It needs **no approximation algorithm, no knowledge of k, and no parameter**, and it returns OPT, a proof of optimality, and exact certificates for all pairs.

**Theorem 4 (hereditary cycle-packing bound).**
- **The bound.** Let y be any fractional packing of directed 3-cycles: Σ_{Δ∋e} y_Δ ≤ a_e for every arc e with a_e > 0. Then U_y(T) = W(T) − 2·Σ_{Δ⊆T} y_Δ is admissible for **every** subset T simultaneously. It is computed with one LP on V.
- **What survives.** Plugging it into Theorem 2, the survivors are exactly contained in the near-optimal family {S : def(S) ≤ δ + γ_y(V∖S)}, where γ_y(T) = β*(T) − Σ_{Δ⊆T} y_Δ is the suffix packing gap.
- **Connection to CFL.** This is the CFL competitive family of Discovery 015, found **without** exponential core preprocessing, at an additive slack equal to the packing gap.

---

## C. Proofs

**Notation:**
- W(T) = Σ_{pairs in T} |a|;
- β(π) is the backward weight, so F(π) = W − 2β(π);
- g(T) = OPT(A|T) = W(T) − 2β*(T);
- r(S) = Σ_{u∈S, w∉S} a_uw;
- d⁻(S) = Σ_{w∉S, u∈S} a_wu⁺.

### Proof of Theorem 1

Suppose y precedes x in an insertion-local optimum, with T the set of vertices between them.

1. Moving x to just before y changes the score by 2a_xy + 2Σ_T a_xt, so this is ≤ 0.
2. Moving y to just after x changes it by 2a_xy + 2Σ_T a_ty, so this is ≤ 0 too.
3. Adding the two: 2a_xy + Σ_T (a_xt + a_ty) ≤ 0.
4. Since Σ_T (a_xt + a_ty) ≥ Σ_{t≠x,y} min(a_xt + a_ty, 0), the hypothesis is contradicted.

*Comparison.* With c^Δ = −2a, their condition reads a_xy + Σ min(a_xt + a_ty, 0) ≥ 0. When a_xy > 0, this gives 2a_xy + Σ min(…) ≥ a_xy > 0.

*Separation instance.* Checked exhaustively (`sep.py`). ∎

### Proof of Theorem 2(b)

1. Survival and f(S) ≤ g(S) give g(S) + r(S) + U(S̄) ≥ t.
2. By Lemma 0 of Discovery 016, g(S) + r(S) + g(S̄) = W − 2β_S = OPT − 2def(S).
3. So OPT − 2def(S) + (U − g)(S̄) ≥ OPT − 2δ. ∎

### Proof of Corollary 3

1. **Exact decomposition.** β_S = β*(S) + d⁻(S) + β*(S̄): every arc from S̄ into S points backward when S comes first, and the two sides are optimized independently.
2. **Apply Theorem 2.** With U = W we have (U − g)(T) = 2β*(T), so def(S) ≤ δ + β*(S̄), which becomes β*(S) + d⁻(S) ≤ β* + δ.
3. **In-cut vs inversions.** For an optimal π*, each pair (w ∉ S before u ∈ S in π*) either has a_wu > 0, contributing at least μ to d⁻(S), or is a backward arc of π*. The backward arcs of π* weigh β* in total, so there are at most β*/μ of them. Hence μ·inv(S) ≤ d⁻(S) + β* ≤ 2β* + δ.
4. **Counting.** A set S of size s is a 0/1 word in π*-order. Its inversion count is the size of a partition fitting in an s × (n−s) box, and distinct sets give distinct partitions. So #{S : inv(S) ≤ m} ≤ (n+1)·Σ_{j≤m} p(j) ≤ (n+1)(m+1)·e^{π√(2m/3)}.
5. **Children.** Each survivor has at most n children, which gives the stated count.
6. **Computable bound.** δ = β(π₀) − β*, so 2β* + δ ≤ β* + β(π₀) ≤ 2β(π₀). The bound m ≤ 2β(π₀)/μ is therefore computable **before** solving, from the incumbent π₀.
7. **Work per state.** O(n²): insertion gains, r(S), and W(S̄). ∎

### Proof of Theorem 4

1. Every directed 3-cycle inside T has at least one backward arc in any ordering of T.
2. So β_T(π) = Σ_e a_e·[e backward] ≥ Σ_e [e backward]·Σ_{Δ∋e} y_Δ ≥ Σ_{Δ⊆T} y_Δ.
3. Then g(T) ≤ W(T) − 2·Σ_{Δ⊆T} y_Δ. Substituting into Theorem 2 gives the result. ∎

**Implementation and admissibility checks:**
- **Tolerance.** y is multiplied by (1 − 10⁻⁹) to absorb LP rounding.
- **Admissibility.** Checked exhaustively: 0 violations over 12 instances × 512 subsets.
- **Bug found and fixed.** An early version double-counted vertices in triangle masks and produced inadmissible bounds. The brute-force check caught it.

---

## D. Algorithm (`sldp.py`, Self-Localizing Exclusion DP)

```
input A, incumbent ordering pi0 (t = F(pi0)), bound type (trivial | packing)
if packing: y <- max fractional directed-triangle packing (one LP)
layer_0 = {∅}, f(∅) = 0
for k = 1..n:
    children = { S + v : S in layer_{k-1}, v ∉ S }
    f(C)     = max over v in C with C - v in layer_{k-1} of  f(C - v) + Σ_{u ∈ C-v} a_uv
    keep C iff  f(C) + r(C) + U(V \ C) >= t        # failing states are excluded by an explicit inequality
backward longest paths b over the kept DAG
OPT = f(V)
W(y,x) = max over kept edges S -> S+x with y ∈ S of  f(S) + gain + b(S+x)
x ≺ y certified iff W(y,x) < OPT
```

**Certificate.** The kept DAG, the f and b tables, the packing y, and for every rejected child its exclusion inequality. Each item checks locally in O(n²).

---

## E. Strict separation examples

1. **Local certificates.** The Theorem 1 instance (Section B): our surplus certifies it, while every Stein–Andres condition fails in a single pass.
2. **Exact solver against MILP.** Embedded cyclic block: a 29-vertex transitive order with a perturbed Paley(19) block in the middle, noise 0.05.
   - HiGHS MILP (full triangle formulation, 300 s): incumbent 279.300825, upper bound 285.375221, **gap 1.14%, not proved**.
   - SLDP-packing: **proves OPT = 279.3008248657 and certifies all 406 relations in 7.9 s.**
   - The trivial-bound SLDP agrees exactly (24.1M states generated), and the best of 200 local searches equals OPT.
3. **Bound ablation:**

| Instance | Trivial U | Packing U |
|---|---|---|
| Near-transitive, n = 40 | 134.7M states, 243 s | 2,963 states, 0.0 s |
| Uniform, n = 20 | 291k states | 2.4k states |
| Embedded n = 29 | 21.8M states | 3.36M states |
| Paley(19) | no change | no change |

---

## F. Reproducible experiments

**Controlled comparison** (`bench2.py`): SLDP-packing (Python) against HiGHS MILP (compiled) with a 120 s limit, same machine. All optima agree wherever the MILP finished.

| Family | n | SLDP total | States generated | Pairs certified | MILP |
|---|---|---|---|---|---|
| Near-transitive (10% flips) | 40 | 0.1 s | 881–1,037 | 780/780 | 0.1 s |
| Near-transitive | 60 | 0.1–0.2 s | 2.9k–4.0k | 1770/1770 | 0.5 s |
| Planted α = 0.5, θ = 2 | 60 | 0.1 s | 1.9k–3.3k | 1770/1770 | 0.5–0.6 s |
| Planted α = 1 | 60 | 0.1 s | 2,262 | 1770/1770 | 0.6 s |
| Uniform weighted | 22 | 0.0–0.1 s | 12k–15k | 231/231 | 0.7–2.0 s |
| Uniform weighted | 24 | 0.1 s | 31,589 | 276/276 | 3.0 s |
| Random integer weights | 22 | 0.0–0.1 s | 6.7k–60k | 231/231 | 0.0–3.9 s |
| Paley (perturbed) | 11 | 0.0 s | 2,035 | 55/55 | 0.4 s |
| Paley | 19 | 2.2 s | 524,175 | 171/171 | **timeout** |
| Paley | 23 | 55 s | 8,388,608 (all) | 253/253 | **timeout** |
| Embedded Paley(19) block | 29 (×3) | 7.9–8.5 s | 3.3M–3.7M | 406/406 | **timeout** |
| Embedded Paley(19) block | 35 (×2) | 12.9–13.8 s | 5.3M–5.4M | 595/595 | **timeout** |

**Verification:**
- 72 small instances (n = 6–8) against brute force over all permutations: 0 mismatches, and **0 violations of the ball bound** for any survivor.
- n = 14–22 against exact subset DP: all match.
- Paley(23) reproduces 69.7590131599.

**Earlier runs (`bench.py`, trivial bound only):**
- the surplus closure certifies 0/171 on Paley(19) and 235/406 on embed-29;
- the trivial-bound SLDP lost badly to the MILP on near-transitive n = 40.

**Failures and adversarial family:**
- **Pure Paley cores.** The packing gap is Θ(p²), so the packing bound excludes almost nothing: at p = 23 every state is generated. SLDP is then no better than subset DP. The plain NumPy subset DP is faster on Paley(19), 0.1 s against 2.2 s.
- **Ties.** Random integer instances with ties have non-unique optima, so some pairs are uncertifiable. One instance in the trivial-bound run certified 146/190 pairs.
- **Word size.** n ≤ 62 because states are 64-bit masks.

---

## G. Complexity

| Algorithm | Worst-case time | Notes |
|---|---|---|
| SLDP, trivial bound | O(n³ · (n+1)(m+1)·e^{π√(2m/3)}) | m = ⌊(2β* + δ)/μ⌋ ≤ 2β(π₀)/μ, computable from the incumbent; includes certificate generation and all pair values (pair values add a factor n) |
| SLDP, packing bound | One LP (O(n³) columns, ≤ n² rows) + O(n²·supp(y)) per state | State count ≤ the near-optimal family of Theorem 4; never worse than the trivial-bound count; worst case 2ⁿ |
| Memory | O(n · survivors) | — |

The worst case remains exponential, which is unavoidable: Discovery 016's barrier theorem, and Karpinski–Schudy's ETH lower bound for weighted FAST in terms of OPT. Whether their lower bound transfers to the parameter β*/μ is **unchecked**.

---

## H. Novelty: what is new, what is known, what is uncertain

**Known:**
- the fact that low-cost orderings are close in Kendall-Tau distance, and DP over states near them, giving 2^{O(√OPT)} (Karpinski–Schudy; Feige);
- bounded DP (Morin–Marsten);
- state-space relaxation and LP-based state fathoming (Christofides–Mingozzi–Toth);
- triangle and cycle-packing lower bounds (classical).

**Plausibly new (not found in my searches, but only a few searches were done):**
1. **The localization theorem itself.** A threshold-pruned prefix DP with *any* admissible bound provably confines its own state space to the in-cut / Kendall-Tau ball, with exact slack ½·gap_U(V∖S). No approximate ranking is computed, no parameter is needed, and certificates are produced.
2. **The real-weighted, margin-μ version** with the parameter β*/μ, computable from the incumbent.
3. **Hereditary use of a single global triangle packing** as a suffix bound for every subset, with the exact containment in the near-optimal family. This links CFL to "no preprocessing".
4. **The empirical separation** on embedded cyclic blocks against a triangle-formulation MILP.

**Uncertain:**
- Whether items 1–3 appear in the Kemeny/FAST or DP-bounding literature in some form. A specialist novelty review is needed.
- Whether a real LOP branch-and-cut solver (with cut separation tuned on LOLIB) also closes the embedded-block gap quickly. I compared only against a generic HiGHS MILP, and I did not test LOLIB because the benchmark files were not reachable from this environment.
- The Python-vs-compiled asymmetry here **favours the MILP**, so the embedded-block result is not an implementation artifact. But a broader comparison is needed.

**Part V hypothesis (cycle-interaction width), settled negatively.**
- **Exactness rules out dropping constraints.** Exactness over pair variables requires all transitivity constraints. Their interaction graph is the line graph of K_n, whose treewidth is Θ(n²).
- **Restricting to violated or interacting cycles only gives a relaxation**, which is an upper bound, not an exact method.
- **Conclusion.** A 2^{O(k)} theorem in the interaction width of selected cycles cannot be exact without re-adding the full structure. I stopped this line.

---

## I. Publication assessment

**What is publishable in principle:** Theorem 2 / Corollary 3 / Theorem 4, the algorithm and the embedded-block separation. That would make a short paper at a combinatorial-optimization or experimental-algorithms venue (e.g. SEA, ALENEX, or an INFORMS/OR journal note), framed as "bounded DP for LOP is provably parameterized-subexponential and practically strong with hereditary packing bounds".

**Before submitting:**
1. A careful novelty check against Karpinski–Schudy, Feige, Betzler et al. and the state-space-relaxation literature.
2. Benchmarks on LOLIB/xLOLIB against a real LOP branch-and-cut code, plus Stein–Andres preprocessing in front of the MILP.
3. A C implementation.
4. Independent proof review.

As it stands, it is a solid workshop or short-paper candidate, not a major algorithms result.

---

## J. WESTFALL rating

| Axis | Grade |
|---|---|
| Correctness | High: short proofs, exhaustive small checks, independent cross-checks, one bug caught by them |
| Originality | Unverified, low to moderate: closest prior work is Karpinski–Schudy / Feige for the localization idea and state-space relaxation for the bound |
| Theoretical significance | Moderate: explains *why* bounded DP works and unifies CFL with FAST-style FPT |
| Practical impact | Moderate: wins only on instances with an embedded cyclic block; competitive elsewhere; loses to subset DP on pure Paley |

**Overall: Level 2+ (a candidate for Level 3 only if the novelty review clears Theorem 2/4 and LOLIB benchmarks hold up).** I am not awarding Level 3.

---

## K. Next mathematical consequence

**The sharpest open problem.** Replace γ_y, the triangle-packing gap, with the gap of a *stronger hereditary dual*. Candidates are a packing of k-fences or Möbius ladders, or a Lasserre/SA-level dual, restricted to subsets, with a theorem of the form:

> If every suffix's dual gap is ≤ Γ, then survivors are at most n·κ_{OPT−2(δ+Γ)}.

Newman–Vempala show fences do not reduce the worst-case gap, so the question becomes **which instance classes have small hereditary gaps**. Embedded cyclic blocks of bounded size are one such class: the gap is confined to the block. A theorem of the form:

> If the frustration is confined to blocks of size ≤ b in a decomposition whose inter-block arcs are consistent with margin μ, then SLDP-packing runs in poly(n)·2^{O(b)}.

would be the natural Level 3 target. It is now testable with the code here.
