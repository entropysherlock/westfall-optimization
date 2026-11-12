# WESTFALL Discovery 015 — Report

**Core-Face Lifting: why local certificates fail on Paley tournaments, and an exact certificate that does not**

Prepared for Caleb Westfall · 12 November 2026 · All numbers below were measured in this session (code: `westfall015_code.zip`, entry point `run_all.py`).

---

## A. Main discovery

There are three results, ranked by how much I trust them.

1. **Degeneracy Obstruction (theorem, short proof).** In the unperturbed Paley tournament no precedence relation is mandatory. Any certificate whose test is a bound that is 1-Lipschitz in the entries therefore needs an integrality gap on the unperturbed core smaller than twice the perturbation size, or it cannot certify anything. This explains exactly why ACC and every LP/decomposition relaxation I tried certify zero relations. The resistance is a *perturbation-scale* phenomenon: the uniqueness of the optimum comes entirely from the ±0.05 noise.

2. **Core-Face Lifting, CFL (theorem plus algorithm).** Split A = A₀ + E into an integer *core* and a small *residual*. A one-time computation on the core produces a state lattice Λ: the subsets that can be prefixes of near-optimal core orderings. Every ordering that could beat the incumbent must stay inside Λ. A longest-path DP over Λ then gives OPT and the exact constrained optimum for *every* reversed pair, which certifies all mandatory relations.

   | p | Pairs certified by CFL | Pairs certified by ACC | Λ size | 2ᵖ (ACC's ideal count) |
   |---|---|---|---|---|
   | 11 | 55/55 | 0 | 2,004 | 2,048 |
   | 19 | 171/171 | 0 | 81,436 | 524,288 |
   | 23 | 253/253 | 0 | 14,216 | 8,388,608 |

3. **Rigidity observation (measured, not proved).** The Paley(23) core is very rigid: only 5,108 of its 8.4M subsets can be prefixes of an optimal core ordering. That is a 1,600× reduction, and it is what makes CFL cheap at p = 23. Paley(11) has almost no rigidity (2,004 of 2,048 subsets).

**What this is not.** CFL is not a polynomial-time method, and its "proof of completeness" for Λ is an exponential, one-time computation on the core. Its components are known techniques: bounded DP in the sense of Morin–Marsten, proximity arguments, and the parity of tournament scores. I rate it Level 2 for originality (Section J).

---

## B. Mathematical derivation

Notation:
- F(π) = Σ_{p<q} a_{π_p π_q}.
- OPT_{y≺x}(A) is the best score among orderings with y before x.
- ‖E‖₁ = Σ_{i<j} |e_ij|.
- For S ⊆ V, OPT(A|S) is the optimum of the instance restricted to S, and r(S) = Σ_{u∈S, w∉S} a_uw.

**Lemma 0 (decomposition, known).** For any ordering π and any prefix set S of π:
F(π) = F(π|S) + F(π|V∖S) + r(S) ≤ OPT(A|S) + OPT(A|V∖S) + r(S).
By skew-symmetry, r(S) = Σ_{u∈S} (row sum of u).

**Lemma 1 (Paley core has no mandatory relation, new in this program, elementary).** Let A₀ be the Paley sign matrix for p ≡ 3 (mod 4). For every ordered pair (x, y), some optimal ordering of A₀ puts y before x.

*Proof.* The maps t ↦ at + b with a ∈ Q are automorphisms, and they act transitively on arcs, since a·(v−u) ranges over all of Q. Every ordering of a tournament containing a directed cycle has a backward arc, and Paley tournaments contain directed cycles, so some arc is reversed in some optimum. By arc-transitivity, *every* arc is reversed in some optimum. Every optimum also has forward arcs, and by transitivity again every arc is forward in some optimum. ∎

Measured: OPT(A₀) = 15 at p = 11, attained by 2,420 orderings.

**Theorem 2 (Degeneracy Obstruction).** Let U be any upper-bound functional with U_{y≺x}(A) ≥ OPT_{y≺x}(A) and |U_{y≺x}(A) − U_{y≺x}(A′)| ≤ ‖A − A′‖₁. Every LP or SDP relaxation over ordering variables in [0,1] with objective Σ a_ij(2z_ij − 1) satisfies this, and so do ACC's test quantities. Suppose OPT_{y≺x}(A₀) = OPT(A₀). If the test "U_{y≺x}(A₀+E) < L" ever succeeds with L ≤ OPT(A₀+E), then

  U_{y≺x}(A₀) − OPT(A₀) < 2‖E‖₁.

*Proof.* U(A₀) − ‖E‖₁ ≤ U(A₀+E) < L ≤ OPT(A₀+E) ≤ OPT(A₀) + ‖E‖₁. ∎

So on Paley cores a relaxation can only certify if it is essentially exact on the *symmetric* problem with one orientation fixed. On the seeded p = 11 instance, 2‖E‖₁ = 2.50, while the triangle LP's core gap is ≥ 3.24.

**Theorem 3 (triangle LP certifies nothing on large Paley instances).** Fix ε < 1/6. Take p ≡ 3 (mod 4) large enough that

  C(p,2)·(1/3 − 2ε) − (4/3)(2p−3) > ½·p^{3/2}·⌈log₂ p⌉.

Then for every perturbation with |e_ij| ≤ ε (any perturbation, not just random ones) and every ordered pair, the triangle-LP bound with y≺x fixed exceeds OPT(A).

*Proof.*
- **Lower bound on the LP.** Take the point z = 2/3 on arcs and 1/3 on anti-arcs. It satisfies every 3-cycle inequality and has core value C(p,2)/3. Overwrite z_{y,t} = 1 and z_{t,x} = 1 for all t, which keeps every triangle inequality. Only 2p − 3 pairs change, each by at most 4/3 in value. Add the Lipschitz loss εC(p,2).
- **Upper bound on OPT.** The Paley matrix is circulant with eigenvalues 0 and ±i√p, so it is normal and ‖A₀‖_op = √p. Hence |1_Xᵀ A₀ 1_Y| ≤ √p·√(|X||Y|) ≤ √p(|X|+|Y|)/2. Split any ordering recursively into halves: each of the ⌈log₂ p⌉ levels contributes at most p^{3/2}/2. Add εC(p,2). ∎

The analytic threshold is large (around p ≈ 3,000 for ε = 0.05), but the measured failure already holds at small p. With the reversed pair fixed, the minimum triangle-LP bound is:

| p | Pairs checked | Min LP bound | OPT | Certified |
|---|---|---|---|---|
| 11 | all 55 | 18.24 | 15.53 | 0 |
| 19 | 60 sampled | 57.1 | 44.45 | 0 |
| 23 | 60 sampled | 83.9 | 69.76 | 0 |

This matches the known integrality-gap-2 picture for LOP relaxations, including fences and small Möbius ladders (Newman–Vempala, IPCO 2001). Theorem 3 is its precedence-fixing corollary for Paley cores.

**Theorem 4 (Core-Face Lifting; the soundness proof is here and in Section C).**

---

## C. The new certificate (precise definition and soundness)

**Input:**
- the instance A;
- a split A = A₀ + E;
- an incumbent ordering π₀ with L = F(π₀);
- a certified bound U_E ≥ max_π E(π).

**Face lattice.** For a threshold t:

  Λ(t) = { S ⊆ V : OPT(A₀|S) + OPT(A₀|V∖S) + r₀(S) ≥ t }.

**Theorem 4.** Let t = L − U_E. Every ordering π with F(π) ≥ L has all of its prefix sets in Λ(t).

When all core scores share a parity, as for any ±1 tournament where F₀ ≡ C(n,2) mod 2, t can be rounded up to the next admissible value K₀ − 2j. Then Λ(t) = Λ_j, with j the least integer such that K₀ − 2(j+1) + U_E < L.

*Proof.* F(π) ≥ L implies F₀(π) = F(π) − E(π) ≥ L − U_E = t. Lemma 0 applied to A₀ then gives the bound for every prefix set S. ∎

**Corollary (exact certification).** Let DAG(Λ) have edges S → S ∪ {v} weighted by g_v(S) = Σ_{u∈S} a_uv. Define:
- f(S): the longest path from ∅ to S;
- b(S): the longest path from S to V;
- W(y,x) = max { f(S) + g_x(S) + b(S∪{x}) : y ∈ S, x ∉ S, S, S∪{x} ∈ Λ }.

Then:
- f(V) = OPT(A), because the incumbent's chain lies in Λ.
- **x ≺ y is mandatory iff W(y,x) < OPT(A).** Every path is a real ordering, so W(y,x) ≤ OPT_{y≺x}(A). Conversely, every ordering with y≺x scoring ≥ L is a path through exactly one x-insertion edge with y already placed.

**What the certificate contains, and how it is checked:**
1. **Incumbent order:** recompute L in O(n²).
2. **Residual bound U_E:** either ‖E‖₁ (trivial) or a triangle-LP dual for E (checkable by verifying dual feasibility). In all three seeded instances the triangle LP was *exact* on E: 0.7369, 2.4182 and 3.0740 equal the true max E(π). The residual is LP-easy; the core is LP-hard.
3. **Λ with the DP tables f, b:** each table entry is checkable locally in O(n) per state.
4. **Completeness of Λ (Λ ⊇ Λ(t)):** this is the expensive part. It needs exact optima of core sub-instances, which I computed with one integer subset DP over the core, O(2ⁿ n). That cost does not depend on E, so it is paid once per core and reused for every perturbation. I could **not** find a polynomial-size proof of completeness (see Section F).

---

## D. Algorithm (implemented: `gacc.py`)

```
CFL(A, A0):
  E  <- A - A0
  UE <- min(||E||_1, TriangleLP(E))                  # sound bound on max E
  (dp0, K0) <- IntegerSubsetDP(A0)                    # one-time per core; cache it
  Lam0 <- { S : dp0[S] + dp0[V\S] + r0(S) >= K0 }
  L <- longest path value in DAG(Lam0)                # a real ordering -> incumbent
  j <- least j with K0 - 2(j+1) + UE < L
  Lam <- { S : dp0[S] + dp0[V\S] + r0(S) >= K0 - 2j }
  f, b <- forward/backward longest paths on DAG(Lam)
  OPT <- f[V];  W(y,x) as in Section C
  return OPT, { (x,y) : W(y,x) < OPT - tol }, certificate (pi*, UE, j, Lam, f, b)
```

If Λ_j would be all of 2ⁿ (residual too large relative to the core's level spacing), the procedure returns UNRESOLVED-COMPRESSION rather than claiming any advantage. It is still exact; it simply degenerates to the full subset DP.

---

## E. Separation (ACC certifies nothing; CFL certifies everything)

The seeded instance from the brief: p = 11, ε = 0.05, NumPy `default_rng(14013 + 11)`, one uniform draw per upper pair in row-major order. The brief's numbers reproduce exactly:
- OPT = 15.52614287, optimal order 0,3,8,1,4,2,5,6,9,7,10;
- runner-up gap 0.009042 (pairs 0≺3 and 0≺8).

| Method | Mandatory relations certified (of 55) |
|---|---|
| Original surplus closure | 0 |
| ACC local / global, all four anchored variants (separable) | 0 |
| Triangle LP with orientation fixed | 0 (all bounds ≥ 18.24) |
| Fractional k-subset cover bounds, k = 3…10 | 0 (core bound never below 18.33; deleting one vertex leaves OPT = 15) |
| **CFL** | **55** |

The CFL certificate for this instance has these parameters:
- K₀ = 15, U_E = 0.7369, j = 0;
- outside-face bound 13.737 < 15.526, so every competitive ordering is a core-optimal ordering;
- |Λ₀| = 2,004.

Every W(y,x) matches an independent constrained subset DP to 4×10⁻¹⁵.

---

## F. Global optimality evidence

The checkable inequality chain for, say, the pair 0 ≺ 3 at p = 11:
- every ordering outside the core face scores ≤ 13 + 0.7369 = 13.737;
- every ordering inside Λ₀ with 3 before 0 scores ≤ W(3,0) = 15.5171;
- both are < L = 15.5261.

At p = 19 the smallest margin is 0.083985, matching the brief's runner-up gap 0.08398499. At p = 23 the smallest margin among the pairs I sampled is 0.0998.

**The one honest gap in checkability.** Steps 1–3 of the certificate check in poly(n)·|Λ| time. The claim "Λ contains all states with core value ≥ t" (step 4) is checked by recomputing the core DP in 2ⁿ time. It is a perturbation-independent fact about the Paley core, but it is still exponential.

---

## G. Complexity (proved bounds for the implementation)

- **Core phase (once per core):** O(2ⁿ n) time and O(2ⁿ) memory, at 2 bytes per state for integer cores.
- **Lift phase (per instance):**
  - O(|Λ| n) to build f and b, with hash-indexed states;
  - O(|Λ| n²) for all W(y,x);
  - plus one triangle LP on E (polynomial: C(n,2) variables, 2·C(n,3) rows), or O(n²) if ‖E‖₁ suffices.
- **New parameter:** κ_t(A₀) = |Λ(t)|. Given the core lattice, exact solution *and* full precedence certification cost O(κ n²) + LP. This is an FPT-style statement in κ, but κ is computed by an exponential core phase. **No runtime theorem here includes certificate production at polynomial cost.**

---

## H. Benchmarks (measured on a 2-core cloud VM, Python/NumPy)

**Seeded instances from the brief:**

| p | K₀ | U_E | j | κ (Λ size) | 2ᵖ | Certified | Core time | Lift time |
|---|---|---|---|---|---|---|---|---|
| 11 | 15 | 0.737 | 0 | 2,004 | 2,048 | 55/55 | 0.03 s | 0.03 s |
| 19 | 43 | 2.418 | 0 | 81,436 | 524,288 | 171/171 | 0.8 s | 1.3 s |
| 23 | 69 | 3.074 | 1 | 14,216 | 8,388,608 | 253/253 | 5.5 s | 0.23 s |

**Core rigidity profile** (size of Λ_j for j = 0, 1, 2, 3):

| p | j = 0 | j = 1 | j = 2 | j = 3 |
|---|---|---|---|---|
| 19 | 81,436 | 433,468 | 523,186 | 524,288 |
| 23 | 5,108 | 14,216 | 34,962 | 140,210 |

**Perturbation sweep at p = 23** (5 fresh seeds per ε; the core is computed once in about 10 s):

| ε | j per seed | Median Λ | Certified | Lift + LP | Exact subset DP, OPT only |
|---|---|---|---|---|---|
| 0.02 | 0,0,0,0,0 | 5,108 | 253/253 ×5 | 0.11 s | 2.85 s |
| 0.05 | 0,1,1,1,1 | 14,216 | 253/253 ×5 | 0.22 s | 2.56 s |
| 0.10 | 1,2,2,2,2 | 34,962 | 253/253 ×5 | 0.53 s | 2.52 s |
| 0.15 | 2,3,3,3,3 | 140,210 | 253/253 ×5 | 2.58 s | 2.83 s |

For pair certification by brute force, a constrained exact DP cost about 1.9 s per pair at p = 23 (11.3 s for 6 pairs). Extrapolated, that is about 8 minutes for all 253 pairs, versus 0.2–2.6 s for CFL lift. The extrapolation is from the measured per-pair rate; I did not run all 253.

**Where CFL does not help:**
- At p = 19 the core is flexible: Λ is 15–80% of 2¹⁹. My Python lift loop (1–10 s) is *slower* than vectorized plain DP (0.11 s for OPT alone). Implementation differences account for part of this, but the state reduction is genuinely small there.
- At p = 11 there is no state reduction.

**Not tested in this session:**
- Families B–E. The exact constructions for the embedded core and the cages are not given in the brief, so I did not reproduce them.
- p = 31 and 43. The core DP needs 2³¹ states, which is beyond this machine's memory.

---

## I. Novelty

- **Known:**
  - subset DP for LOP;
  - bounding states out of a DP (Morin & Marsten, *Operations Research* 1976);
  - LP/variable fixing by objective bounds;
  - triangle and fence relaxations and their integrality gap of 2 (Newman–Vempala 2001);
  - proximity/perturbation arguments in integer programming;
  - eigenvalue bounds for Paley tournaments (standard character-sum argument).
- **Plausibly new, but unverified by a full literature search:**
  - the explicit statement that Paley cores have no mandatory relation, and the resulting Lipschitz obstruction for precedence-fixing certificates (Lemma 1 + Theorem 2) as a diagnostic for certificate families;
  - using a *coarse integer core* to compute the DP-pruning bound once and reusing it across many perturbations, with parity giving the level structure Λ_j;
  - the measured rigidity of Paley(23) (κ₀ = 5,108).

  None of these is deep. Theorem 2 is a three-line argument.

---

## J. WESTFALL level (assessed separately)

| Item | Mathematical significance | Proof status | Originality | Level |
|---|---|---|---|---|
| Lemma 1 + Theorem 2 (obstruction) | Explains ACC/LP failure precisely | Complete, short; self-checked | Low–moderate | **2** |
| Theorem 3 (triangle LP, asymptotic) | Corollary of known gap phenomena | Complete; constants crude | Low | **2** |
| Theorem 4 / CFL algorithm | Exact, sound, certifies 100% where ACC certifies 0 | Complete; numerically verified to 1e-14 | Low (known ingredients) | **2** |
| Paley(23) rigidity | Interesting if it persists in p | Measurement only | Unknown | **1** |

**Overall: Level 2.** This is not Level 4. The method does not extract information below exponential cost. It relocates the exponential work to a perturbation-independent core, where it can sometimes be amortized.

---

## K. Next consequence (the most substantial accessible question)

**Rigidity Conjecture (open).** For Paley tournaments, is κ₀(p)/2ᵖ → 0? That is, do the prefix sets of optimal orderings form a vanishing fraction of all subsets? The data so far is mixed:

| p | κ₀/2ᵖ |
|---|---|
| 11 | 0.98 |
| 19 | 0.155 |
| 23 | 0.0006 |

If the answer is yes, and if Λ can be generated *without* the full core DP, CFL becomes a real exact method for perturbed Paley families. One route is forward search pruned by core bounds plus translation/multiplier symmetry, which reduces the state count by up to p(p−1)/2. The decisive next experiment is computing κ₀ for p = 31 with a symmetry-reduced core search. That needs a compiled implementation, not Python.

**General transferable lesson:** for perturbed degenerate instances, certification difficulty is governed by the near-optimal face of the core, not by local witness structure. Measuring κ_t(A₀), and not ACC's ideal count, is the right diagnostic.
