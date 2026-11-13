# Mission 041 — Statements

Conventions are those of Mission 040 (Fomin–Pilipczuk, ESA 2013). D = (V, A) is a digraph on n vertices, and
antiparallel arcs are allowed. For X ⊆ V, back(X) is the number of arcs from V∖X into X. A **k-cut** is a set X
with back(X) ≤ k, and N_k(D) is the number of k-cuts. A **reference ordering** σ has width ≤ c if every prefix P
of σ has back(P) ≤ c. We write K = c + k throughout. Vertices u ≠ v are **non-adjacent** if neither u→v nor v→u
is an arc.

D is **h-semicomplete** if every vertex has at most h non-neighbours (Kitsunai–Kobayashi–Tamaki, ESA 2015). The
case h = 0 is exactly the semicomplete case.

H(K) is the number of integer partitions whose Ferrers diagram lies under the hyperbola xy ≤ K, as in Mission 040.
Its first values are H(0..7) = 1, 2, 5, 10, 26, 42, 118, 171, and H(K) ≤ e^{2π√K}/(2π√K).

R_h(K) is the number of sequences λ_1 ≥ … ≥ λ_h ≥ 0 with i·(λ_i − h) ≤ K for every i. Equivalently,
λ_i ≤ ⌊K/i⌋ + h. Note that R_0 = 1 and R_h(K) ≤ C(K+2h, h).

Every statement below is labeled with its status: **[Lean]** means kernel-checked in
`lean/Westfall041/DefectCount.lean`; **[paper]** means proved in PROOF.md only.

## Theorem A — defect rectangle lemma [Lean: `defect_rectangle`]

Let D be h-semicomplete and P, X ⊆ V, and set a = |P∖X| and b = |X∖P|. Then

  ab ≤ back(P) + back(X) + h·min(a, b).

## Theorem B — shifted hyperbola [Lean: `shifted_hyperbola`]

Let D be h-semicomplete, σ a reference ordering of width ≤ c, and X a k-cut. Let μ_s be the number of members of X
preceded in σ by at least s non-members. Then for every s ≥ 0:

  s·(μ_s − h)_+ ≤ K and μ_s·(s − h)_+ ≤ K.

Consequences:
- μ_s ≤ h for every s > K.
- μ_s = 0 for every s > K + h.

## Theorem C — defect-robust k-cut counting

Let D be h-semicomplete with a reference ordering of width ≤ c. Then

  N_k ≤ (n+1) · min{ R_h(K), (n+1)^h } · H(K).

The two branches are proved separately:
- **[Lean: `card_kcuts_le_defect`]** gives the R_h(K) branch.
- **[Lean: `card_kcuts_le_defect_poly`]** gives the (n+1)^h branch.
- **[Lean: `card_kcuts_le_defect_pow`]** gives the explicit form (n+1)(K+h+1)^h H(K).

Corollaries:
- **Conjecture 041-A holds** [Lean: `conjecture_041A`]: N_k ≤ (n+1)^{2h+1}·H(K). Theorem C improves the exponent
  from 2h+1 to h+1, and replaces it by an n-independent factor through the R_h branch.
- **FPT form** [paper, from R_h(K) ≤ C(K+2h, h)]: N_k ≤ (n+1) · 2^{O(√K + h·log(K+h))}.
- **h = 0** [Lean: `card_kcuts_le_semicomplete_recovered`]: this is exactly Mission 040's (n+1)·H(c+k).
- **Width ≤ k** [Lean: `card_kcuts_le_defect_of_width_le_k`]: N_k ≤ (n+1)·R_h(2k)·H(2k).

## Theorem L — exponential dependence on h is necessary [paper + exhaustive check]

Take m blocks of h+1 pairwise non-adjacent vertices, with every arc going from an earlier block to a later block.
This digraph is h-semicomplete, has ctw = 0, and has

  N_0 = 1 + m(2^{h+1} − 1).

So any bound f(h)·g(n)·H(K) needs f(h)g(n) ≥ 1 + (n/(h+1))(2^{h+1} − 1). Theorem C at K = 0 gives
(n+1)·C(2h, h) ≤ (n+1)·4^h. The h-dependence is therefore 2^{Θ(h)} up to poly(h) factors at K = 0, and the
dependence on n is linear. Whether h·log K is needed for K > 0 is open.

## Theorem D — degenerate defect [paper; numerically tested, not formalized]

Suppose the non-adjacency graph of D is d-degenerate. This is weaker than max-degree d: hubs non-adjacent to
everything are allowed. Then:
- ab ≤ back(P) + back(X) + d(a+b), hence (a−d)_+(b−d)_+ ≤ K + d².
- For every k-cut, (s−d)_+(μ_s−d)_+ ≤ K + d².
- N_k ≤ (n+1)^{2d+1}·H(K + d²).

This is the exact shape of Conjecture 041-A, now holding for a strictly larger class. It is XP in d, not FPT.

## Theorem E — algorithms [paper; prototype tested]

Let D be h-semicomplete on n vertices.
- **Cutwidth.** Deciding ctw(D) ≤ k, and outputting an optimal ordering, takes time
  O(R_h(2k)·H(2k)·k·n⁴) = 2^{O(√k + h·log(k+h))}·n⁴. The exponent of n does not depend on h, so this is
  **FPT in k + h**. For fixed h it is 2^{O(√k)}·n^{O(1)}, which is ETH-tight already at h = 0 (BPP, Theorem 14).
- **OLA.** Deciding OLA ≤ k takes 2^{O(k^{1/3} + h·log(k+h))}·n^{O(1)}, which is also FPT in k + h.

## Theorem F — bounded independence number: obstruction [paper + exhaustive check]

For digraphs of independence number α:
- The rectangle lemma fails in every form ab ≤ K + f(α)·(a+b), already at α = 2. Two transitive tournaments with no
  arcs between them give a = b = n/2 with K = 0.
- Any k-cut bound must be n^{Ω(α)}. α disjoint transitive tournaments of size m have ctw = 0 and
  N_0 = (m+1)^α ≥ (n/α)^α.

So no bound of the form f(α)·poly(n)·H(K) with the exponent of n independent of α exists. The h-semicomplete proof
**does not** transfer. Misra–Saurabh–Sharma–Zehavi's n^{O(α)} exponent is unavoidable for k-cut counting. Since
h-semicomplete implies α ≤ h+1, Theorem C sits strictly inside their class and beats their running time
(n⁴ against n^{O(h)}).
