# ATLAS-032 — novelty audit
Caleb J. Westfall (with AI assistance) · 2026-11-13

**Verdict: ATLAS-032 contains no new mathematical theorem.** Every bound and rule it uses is standard, or a direct consequence of standard results. The contribution is engineering:

- a native, exact-integer, browser-side implementation;
- a strict incumbent-proving mode;
- an independent certificate verifier;
- measured performance on adversarial and real benchmarks.

## Claim-by-claim

| ATLAS-032 component | Closest existing work | Status |
|---|---|---|
| Lemma 1: a directed-cycle packing (triangles and longer cycles) lower-bounds the feedback-arc weight | Weak LP duality for the 3-dicycle relaxation of the linear ordering polytope (Grötschel–Jünger–Reinelt, 1984). Textbook treatment in Martí & Reinelt, *The Linear Ordering Problem* (Springer), ch. 5 "Branch-and-Cut with 3-Dicycle Cuts". | **Standard** |
| Lemma 2: restricting one global packing gives bounds for every residual set | Already in this repository: the Python SLDP `ub_kind='packing'` (`src/westfall_optimization/solvers/exclusion_dp.py`, Discovery 018). It solves the same packing LP with scipy/HiGHS and restricts it to the complement of each prefix. | **Known (in-house)** |
| Lemma 0/3: prefix bound β_S + cut(S) + L(R) | Branch-and-bound over "beginning sections" with lower bounds for weighted tournaments: Charon, Guénoche, Hudry & Woirgard (*Discrete Math.* 1997); Charon & Hudry (*Discrete Appl. Math.* 154, 2006, Lagrangean bound). | **Standard idea** |
| Fractional packing by multiplicative weights | Garg & Könemann (FOCS 1998; *SIAM J. Comput.* 2007). Standard approximation scheme for packing LPs. | **Standard method**; the application here is engineering |
| Strict B − 1 pruning (prove the incumbent instead of re-finding it) | Standard branch-and-bound practice: prune nodes whose bound is ≥ the incumbent value, using integrality. | **Standard** |
| Strong-component decomposition (ATLAS-031) | Classical preprocessing for FAS/LOP. | **Standard** |

## What was investigated but not established
- **Row-dominance precedence (Direction C).** If A_uv ≥ 0 and A_uw ≥ A_vw for every other w, then swapping u and v never lowers F; the swap argument is in the report. *Applying many such pairs at once* requires an optimal ordering that respects all of them simultaneously. I did not complete a rigorous proof that survives ties and differing excluded columns. It is **not implemented**, so it carries no risk of false optimality claims. Dominance rules of this kind are in any case classical: compare the "covering relation" generalised to weighted tournaments by Charon, Guénoche, Hudry & Woirgard (1997).
- **Longer cycles.** On *complete* tournaments without ties, the 3-dicycle LP already captures most of the relaxation. On the n = 30 random instances the native packing reaches 344.6, against HiGHS's full 3-dicycle LP value of 346.7. The remaining gap to the optimum (366) needs non-cycle facets or branching, not more cycles.
  On **tie-heavy / sparse** inputs (e.g. LOLIB `tiw56*`), however, the 3-dicycle LP implicitly enforces longer cycles through zero-margin pairs, and triangle packings fall to about 83% of the optimum. A greedy longer-cycle top-up restores 96–98% and was decisive: it took the real-instance score from 43/50 to 50/50. This is the known behaviour of the cycle relaxation, not a new result.

## Adversarial checks of the claims
- **Admissibility:** L(R) ≤ OPT_β(R) on 250 random instances × 4 random residual sets × 2 packing methods, checked against exhaustive enumeration (ties, negatives, weights up to 10⁵).
- **Exactness:** the DP with every bound/strictness combination equals brute force on 400 instances (n ≤ 8) and the subset DP on 70 instances (n = 9–16).
- **Certificates:** three tampered certificates are rejected by the independent verifier.

## Publication assessment
- **Not suitable as a mathematics paper:** there is no new theorem.
- **Possible venues:** a short *software/experimental* note (e.g. on exact, certified, client-side LOP solving with independent verification) could fit an experimental-algorithms or open-source software venue, if the real-instance results hold up and are compared with published exact LOP codes. That last comparison has **not** been done; SCIP and specialised branch-and-cut codes were not run.
