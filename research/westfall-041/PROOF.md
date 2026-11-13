# Mission 041 — Proofs

Notation is as in THEOREM.md. Fix the reference ordering σ = (v_1, …, v_n). For X ⊆ V and a member x ∈ X, z(x)
denotes the number of non-members of X before x. Then μ_s = #{x ∈ X : z(x) ≥ s}.

The sequence (μ_1, μ_2, …) is non-increasing. It is the column sequence of the Ferrers diagram of the binary word
of X, with column s having height μ_s. The row lengths are λ_i = #{s ≥ 1 : μ_s ≥ i}.

Lean names are given in brackets after each result.

## 1. Defect rectangle lemma (Theorem A) [`defect_rectangle`]

Let A = P∖X and B = X∖P, so A ∩ B = ∅. Each pair (y, x) ∈ A × B is of exactly one of three types:

1. **y → x is an arc.** Then y ∉ X and x ∈ X, so the arc is counted by back(X). Distinct pairs give distinct arcs,
   so there are at most back(X) such pairs.
2. **y → x is not an arc but x → y is.** Then x ∉ P and y ∈ P, so the arc is counted by back(P). There are at most
   back(P) such pairs.
3. **Neither arc is present.** Since y ≠ x, the vertices y and x are non-adjacent. For fixed y there are at most h
   such x, and for fixed x at most h such y. So there are at most h·min(|A|, |B|) such pairs.

Summing the three types gives ab ≤ back(P) + back(X) + h·min(a, b). ∎

In Lean, the third type is bounded twice, by h·|A| and by h·|B|. Each bound uses
`card_le_mul_card_image_of_maps_to` with fibres injected into the non-neighbour set of the fixed vertex.

## 2. Shifted hyperbola (Theorem B) [`shifted_hyperbola`]

If μ_s = 0, both inequalities are trivial. Otherwise take the first x₀ (in σ) with z(x₀) ≥ s, and let P be the
prefix strictly before x₀. Then:
- P∖X consists of the z(x₀) ≥ s non-members before x₀, so a ≥ s.
- Every x counted by μ_s lies at or after x₀, so it is in X∖P. Hence b ≥ μ_s.
- back(P) ≤ c, since P is a prefix, and back(X) ≤ k.

By Theorem A, ab ≤ K + h·a and ab ≤ K + h·b, so a(b−h) ≤ K and b(a−h) ≤ K (natural-number subtraction). Both
sides are monotone, which gives:
- s·(μ_s − h) ≤ a·(b − h) ≤ K;
- μ_s·(s − h) ≤ b·(a − h) ≤ K. ∎

**Consequences.**
- If s > K, then μ_s ≤ h. Otherwise s·(μ_s − h) ≥ s > K.
- If s > K + h, then μ_s = 0. Otherwise μ_s·(s − h) ≥ s − h > K.

In picture form, the Ferrers diagram consists of three parts:
- its first h rows, of arbitrary length ≤ min(n, K+h);
- a partition above row h that lies under the hyperbola s·y ≤ K (the residual ν_s = (μ_s − h)_+);
- nothing to the right of column K+h.

## 3. Encoding and injectivity (Theorem C) [`card_kcuts_le_defect`, `card_kcuts_le_defect_poly`]

Map each k-cut X to the triple

  F(X) = ( |X|, (λ_1, …, λ_h), (ν_1, …, ν_K) ), where λ_i = #{1 ≤ s ≤ L : μ_s ≥ i} and ν_s = (μ_s − h)_+.

Here L = K + h for the R_h branch and L = n for the polynomial branch.

**Range.**
- |X| takes at most n+1 values.
- ν is non-increasing and satisfies s·ν_s ≤ K, so it is one of H(K) hyperbola partitions. The Lean set `Hset` is
  reused from Mission 040.
- λ is non-increasing. With L = n each λ_i ≤ n, giving at most (n+1)^h choices. With L = K+h, row i has length
  m = λ_i ≥ 1, and the row criterion below gives μ_m ≥ i. Theorem B then gives i·(m − h) ≤ μ_m·(m − h) ≤ K, so λ
  lies in the R_h(K) set.

**Row criterion** [`row_iff`]. For 1 ≤ s ≤ L, μ_s ≥ i+1 if and only if s ≤ λ_{i+1}. This holds because the set
{s ≤ L : μ_s ≥ i+1} is an initial segment, since μ is non-increasing. Its size is λ_{i+1}.

**Injectivity.** Suppose F(X) = F(Y) for k-cuts X and Y. We show that μ^X_s = μ^Y_s for every 1 ≤ s ≤ L.

*Case 1: μ^X_s ≤ h and μ^Y_s ≤ h.* Suppose μ^X_s < μ^Y_s ≤ h, and put i = μ^X_s < h. The row criterion for Y gives
s ≤ λ^Y_{i+1}. Since λ^Y = λ^X, also s ≤ λ^X_{i+1}. The row criterion for X then gives μ^X_s ≥ i+1, a
contradiction. The other strict inequality fails symmetrically.

*Case 2: otherwise.* By the consequences of Theorem B, s ≤ K. The residuals ν^X_s and ν^Y_s are recorded in F and
are equal. One of them is positive, so both are positive, and μ^X_s = ν_s + h = μ^Y_s.

Beyond L every column is empty: for L = K+h this is Theorem B, and for L = n it is
[`mu_eq_zero_of_card_lt`]. With |X| = |Y|, the column sequence plus the size determine the set
[`eq_of_mu_eq'`]. The argument is Mission 040's least-differing-vertex argument, now with an explicit support
bound L in place of the hyperbola.

So F is injective on k-cuts. This gives N_k ≤ (n+1)·R_h(K)·H(K) and N_k ≤ (n+1)^{h+1}·H(K). ∎

**R_h(K) ≤ C(K+2h, h).** Admissible λ are non-increasing h-tuples with entries in [0, K+h]. There are C(K+2h, h)
such tuples. Hence log R_h(K) ≤ h·log(e(K+2h)/h) = O(h·log(K+h)).

**Conjecture 041-A** [`conjecture_041A`]. Since (n+1)^{h+1} ≤ (n+1)^{2h+1}, the conjecture follows.

**h = 0** [`card_kcuts_le_semicomplete_recovered`]. With h = 0 there are no rows, R_0 = 1, and the bound is
Mission 040's theorem.

## 4. Lower bound in h (Theorem L)

Let B_1, …, B_m be independent sets of size h+1 (the last may be smaller), with an arc u → v whenever u ∈ B_i,
v ∈ B_j and i < j. Each vertex is non-adjacent to exactly the other members of its block, at most h vertices.
Ordering the blocks consecutively makes every prefix have back = 0, so ctw = 0.

A set X has back(X) = 0 if and only if X contains every in-neighbour of its members. This means X is
B_1 ∪ … ∪ B_{j−1} ∪ S for some j and some non-empty S ⊆ B_j, or X = ∅. Hence N_0 = 1 + m(2^{h+1} − 1).

This value is confirmed by exhaustive enumeration in `hunt041.py`, in the family "independent blocks". ∎

## 5. Degenerate defect (Theorem D)

**Rectangle.** If the non-adjacency graph G is d-degenerate, so is its subgraph induced on A ∪ B. That subgraph has
at most d(a+b) edges, so type-3 pairs number at most d(a+b). Hence

  ab ≤ K + d(a+b), which rearranges to (a−d)(b−d) ≤ K + d².

**Shifted hyperbola.** As in §2, (s−d)_+(μ_s−d)_+ ≤ (a−d)_+(b−d)_+ ≤ K + d², where the truncated case is trivial.

**Counting.** Encode X by:
- |X|;
- the first d columns μ_1, …, μ_d, each ≤ n;
- the first d rows λ_1, …, λ_d, each ≤ n;
- the residual ν_t = (μ_{t+d} − d)_+.

The residual satisfies t·ν_t ≤ K + d², so it is a hyperbola partition counted by H(K + d²). To decode, read
μ_1, …, μ_d directly. For s > d: if ν_{s−d} > 0, then μ_s = ν_{s−d} + d; otherwise μ_s ≤ d, and μ_s is read from
the rows exactly as in Case 1 of §3. The size together with μ determines X as in §3.

Non-increasing d-tuples with entries ≤ n number at most (n+1)^d. Hence N_k ≤ (n+1)^{2d+1}·H(K + d²). ∎

This is not formalized. The Lean proof of §3 is the template; the changes are the edge bound d(a+b) and the
two-sided shift. Numerically, `degenerate041.py` found 0 violations of (R), (S) and (N) on 1,500 digraphs, including
hub configurations of unbounded non-adjacency degree.

## 6. Algorithms (Theorem E)

The algorithm and its proofs are Mission 040's (MANUSCRIPT.md, §4), with the threshold changed. None of the
following steps uses semicompleteness:
- **Polynomial-delay enumeration of k-cuts.** This is min-cut pruned branching. Extendability of (A ⊆ X, B ∩ X = ∅)
  is a max-flow from B to A of value ≤ k, with at most k+1 augmenting paths.
- **Reachability over the k-cut lattice.**
- **The OLA cost-to-width lemma** (Lemma 4). It uses only that distinct crossing arcs are distinct ordered pairs.

Only the stopping rule uses the structure of D: answer NO as soon as more than T = (n+1)·min{R_h(2k), (n+1)^h}·H(2k)
k-cuts are listed. The rule is correct by Theorem C with c = k: if ctw ≤ k, an optimal ordering is a reference
ordering of width ≤ k.

**Costs.**
- Time: O(T·n·(k+1)n²) for enumeration, plus O(T·n²) for the search. That is
  O(R_h(2k)·H(2k)·k·n⁴) = 2^{O(√k + h log(k+h))}·n⁴.
- Space: O(T·n) bits.

For OLA, use width W = O(k^{2/3}) in the same scheme. A minimum-weight path in the W-cut DAG then costs
2^{O(√W + h log(W+h))}·n^{O(1)} = 2^{O(k^{1/3} + h log(k+h))}·n^{O(1)}.

**h-dependence.** The exponent of n is 4, independent of h. Hence these algorithms are FPT in k + h, not merely XP
in h.

## 7. Bounded independence number (Theorem F)

Let T_1, …, T_α be disjoint transitive tournaments of size m with no arcs between them. The independence number is
α: one vertex per tournament is independent, and any α+1 vertices contain two from the same tournament.

- **ctw = 0.** List T_1 in its transitive order, then T_2, and so on.
- **N_0 = (m+1)^α.** A set X has back(X) = 0 if and only if X ∩ T_j is a prefix of T_j for every j.
- **The rectangle lemma fails.** Take α = 2, P = T_1 and X = T_2. Then a = b = m and back(P) = back(X) = 0, while
  ab = m² exceeds K + f(2)(a+b) = 2f(2)m for m > 2f(2).

So for this class, every k-cut bound must grow like n^{Ω(α)} even at K = 0. Any argument giving f(α)·poly(n) with
the n-exponent independent of α is impossible. This is a statement about counting k-cuts only. It does not rule
out other, non-enumerative algorithms that are FPT in α.

## 8. Abstract principle (Phase 7)

The Lean injectivity proof uses only three facts about the family 𝓕 of sets being counted:
1. Sets in 𝓕 are subsets of a linearly ordered n-set.
2. Every X ∈ 𝓕 satisfies s·(μ_s − h)_+ ≤ K for all s.
3. Every X ∈ 𝓕 satisfies μ_s·(s − h)_+ ≤ K for all s.

**Defect-sensitive counting principle.** Any family satisfying 1–3 has size at most
(n+1)·min{R_h(K), (n+1)^h}·H(K).

Condition 3 and condition 2 follow from a rectangle inequality ab ≤ K + h·min(a,b) for every (prefix, member) pair.
More generally, a linear defect ab ≤ K + αa + βb gives (a−β)(b−α) ≤ K + αβ. Then the doubly shifted encoding of §5
yields |𝓕| ≤ (n+1)^{α+β+1}·H(K + αβ).

So the defect-sensitive principle has two forms:
- **Min-defect h·min(a,b)** costs an FPT factor R_h(K).
- **Additive defect αa + βb** costs n^{α+β}.

This dichotomy matches the lower bounds of §4 and §7.
