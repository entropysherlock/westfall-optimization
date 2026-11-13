# ATLAS-032 — mathematical statements and proofs
Caleb J. Westfall (with AI assistance) · 2026-11-13

**Notation.** A is a skew-symmetric matrix and P_uv = max(A_uv, 0). An ordering π has backward weight β(π) = Σ_{r<s} P_{π_s π_r}, and F_A(π) = W − 2β(π) with W = Σ_{i<j} |A_ij|. For S ⊆ V:

- cut(S) = Σ_{u∉S, v∈S} P_uv.
- OPT_β(X) = min β over orderings of the instance induced on X.

The strict preference digraph has the arcs u→v with P_uv > 0, and arc u→v has capacity P_uv.

**Status of these results.** Every statement here is a standard fact or a direct consequence of one; see NOVELTY.md. **None is machine-verified in Lean.** The Lean toolchain could not be installed in the build environment. Independent evidence comes from:

- the exhaustive tests in `website/tests/atlas032.test.ts`;
- the separate certificate verifier `verify_certificate.py`.

## Lemma 0 (prefix decomposition — exact identity)
If π lists S first and then R = V∖S, then

  β(π) = β(π|S) + cut(S) + β(π|R).

*Proof.* Every unordered pair lies inside S, inside R, or across the two sets.

- A pair inside S contributes its backward weight under π|S; a pair inside R, its weight under π|R.
- A crossing pair {u∈R, v∈S} always has v before u. Its backward contribution is therefore P_uv, which is 0 if A_uv ≤ 0.
- Summing the crossing contributions gives cut(S). ∎

## Lemma 1 (triangle-packing bound)
Let y ≥ 0 be a packing of the directed 3-cycles 𝒯 of the strict preference digraph, meaning Σ_{T∋e} y_T ≤ P_e for every arc e. Then Σ_T y_T ≤ β(π) for every ordering π.

*Proof.*

1. A directed cycle cannot have all of its arcs pointing forward in a linear order. Following its arcs would then strictly increase the position all the way around and return to the start. So each T contains at least one backward arc e(T).
2. Group the triangles by their chosen backward arc: Σ_T y_T = Σ_{e backward} Σ_{T: e(T)=e} y_T.
3. Each inner sum is at most Σ_{T∋e} y_T ≤ P_e.
4. Hence Σ_T y_T ≤ Σ_{e backward} P_e = β(π). ∎

## Lemma 2 (restriction)
For any R ⊆ V, define L(R) = Σ_{T⊆R} y_T. Then L(R) ≤ OPT_β(R).

*Proof.* The arcs inside R keep their capacities in the instance induced on R. Dropping every triangle not contained in R can only reduce each arc's load. So (y_T)_{T⊆R} is a feasible packing for that instance, and Lemma 1 applies. ∎

**Incremental form.** L(R∖{v}) = L(R) − Σ_{T∋v, T⊆R} y_T. This costs O(#triangles through v) per transition.

## Lemma 3 (strengthened prefix bound)
For every ordering π that begins with S:

  β(π) ≥ β*_S + cut(S) + ⌈L(V∖S)⌉,

where β*_S is any value ≤ β(π|S). The ceiling is valid when A is integral, because OPT_β is then an integer.

*Proof.* Apply Lemma 0, bound β(π|R) ≥ OPT_β(R) ≥ L(R) by Lemma 2, and round up using integrality. ∎

## Theorem 4 (correctness of the strict cut-bounded DP)
**Setting.** A is integral; π₀ is any ordering (the incumbent) with B = β(π₀). The DP builds prefix sets layer by layer (layer t holds sets of size t). For each set it stores the least β found over the chains that reached it. It keeps a child S∪{v} only if

  β + cut(S∪{v}) + ⌈L(V∖(S∪{v}))/D⌉ ≤ B − 1.

**Claims.**

- (a) If no set survives at some layer, then π₀ is optimal.
- (b) Otherwise, the final layer contains V with stored value OPT_β(V), and the reconstructed ordering attains it.

*Proof.* Suppose some ordering has β ≤ B − 1, and let π* be an optimal one, so β(π*) ≤ B − 1. Write S_t for its prefixes.

1. **Induction claim.** Layer t contains S_t with stored value b_t ≤ β(π*|S_t).
2. **Base case.** t = 0: the empty set with b_0 = 0.
3. **Step.** S_t = S_{t−1} ∪ {v}. The parent's stored value b_{t−1} ≤ β(π*|S_{t−1}). Appending v adds exactly Σ_{x∈S_{t−1}} P_vx, which depends only on the set S_{t−1} and on v. So the child's candidate value is at most β(π*|S_t).
4. **The child passes the test.** By Lemma 3 applied to π*, the test quantity is ≤ β(π*|S_t) + cut(S_t) + ⌈L(R_t)⌉ ≤ β(π*) ≤ B − 1. The stored value is a minimum over candidates, so it is ≤ β(π*|S_t).
5. **Conclusion for (b).** At t = n the stored value is ≤ β(π*). Every stored value is realised by a concrete chain, that is an ordering, so it equals β(π*).
6. **Conclusion for (a).** Contrapositively, if some layer is empty then no ordering has β ≤ B − 1, so π₀ is optimal. ∎

**Non-strict mode.** With limit B instead of B − 1, the same argument shows the DP returns an optimum whenever β(π*) ≤ B, which always holds. That is the ATLAS-031 behaviour, with the bound added.

## Lemma 5 (compatibility with strong-component decomposition)
Every directed cycle lies inside one strongly connected component. So a packing computed per component is a packing of the whole instance, and the bounds add up over components. Combined with the ATLAS-031 decomposition theorem (`website/src/lib/studio/decompose.ts`), solving and certifying each component separately certifies the whole instance:

  β_total = Σ_i OPT_β(C_i), since no cross-component pair can be backward in the concatenated ordering.

## Exactness and overflow (checked in code)
- **Packing weights.** Stored as non-negative integers in units of 1/D. Every arc load is verified exactly (`finalize` in `bounds/packing.ts`) before a packing is used.
- **The 2^52 limit.** D is halved until D·Σ_e P_e < 2^52, so all loads and totals are safe integers.
- **Scope of the bound.** It is only used when A is integral (`Problem.exact` in the Studio guarantees 53-bit-exact scaled integers). Otherwise the solver falls back to the ATLAS-031 rule and makes no strict claim.
- **Rounding.** ⌈L/D⌉ is computed with integer division of safe integers.

## Independent certificates
`verify_certificate.py` re-checks, in pure-Python big integers:

1. the decomposition;
2. each component's β;
3. packing feasibility, including that each triple really is a directed 3-cycle;
4. the absence of any ordering with smaller β. If ⌈L(V)⌉ already equals β, the packing alone is the certificate. Otherwise it reruns its own pruned prefix search using only Lemmas 0–3.

The verifier shares no code with the TypeScript solver. Three tampered certificates (an inflated packing, a wrong β, a suboptimal order) are all rejected.

**What is still missing.** A certificate whose size does not grow with the search: a pure LP-dual certificate exists only when the root bound is tight.
