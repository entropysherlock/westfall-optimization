# WESTFALL Mission 047 — The Two-Tournament Extremal Conjecture

**Outcome: CONJECTURE STRENGTHENED, NOT PROVED.** The classification is LEMMA ONLY (+ refutations and exact
verification).

- **What was refuted.** Both natural proof mechanisms, each by an explicit construction.
- **What survived.** The conjecture itself, now in an *exact* form. It survived exhaustive verification and every
  adversarial search we ran.
- **What was proved.** The exact case k = 0 (for every α), a reduction to maximal triangle-free patterns, and a
  reduction that turns the forward-model conjecture into a 2^{O(√k)} DFAS algorithm on α ≤ 2.

## 1. Setting

**Forward model.** Vertices 0..n−1 in reference order; U is a graph with α(U) ≤ 2, equivalently G = complement(U)
triangle-free; every U-edge i<j is the arc i→j. Then:
- the width is c = 0;
- b(X) = inv_U(X) = #{i<j : ij ∈ U, i ∉ X, j ∈ X}.

**Two tournaments.** "Two disjoint tournaments" means G is complete bipartite, K_{a, n−a}, with any interleaving.

**Conjecture E (exact extremality).** For all n and k, the maximum of N_k over forward-model digraphs with α ≤ 2 on n
vertices is attained by two disjoint transitive tournaments.

**Conjecture E′ (asymptotic).** N_k ≤ (n+1)²·e^{O(√k)} for every forward-model digraph with α ≤ 2.

E′ follows from E: a two-tournament configuration has N_k ≤ (k+1)·[(n/2+1)·p(≤k)]², where p(≤k) = e^{O(√k)}.

## 2. Proved

**Lemma M (monotonicity).** Deleting an arc never increases b(X), for any X. Hence N_k is monotone under adding
non-adjacencies. In the forward model, the maximum over α ≤ 2 is therefore attained at a *maximal* triangle-free G,
in some vertex order. ∎

**Theorem Z (exact k = 0, every α, every digraph).** For every digraph D with α(D) ≤ α on n vertices,

  N_0(D) ≤ max{ ∏_{i=1}^{α} (a_i + 1) : a_1 + … + a_α = n } ≤ (n/α + 1)^α,

with equality for α disjoint transitive tournaments of sizes a_i.

*Proof.*
1. A set X has b(X) = 0 iff no arc enters X. Equivalently, X is a union of strongly connected components that is
   closed under taking predecessors in the condensation DAG, i.e. a down-set of the condensation poset.
2. Two components that are incomparable in the reachability order have no arc between them. So an antichain of
   components gives an independent set in D (one vertex from each), and the poset has width ≤ α.
3. By Dilworth, the poset is covered by α chains of sizes a_i, with Σ a_i ≤ n.
4. A down-set is determined by how many elements it takes from each chain, giving at most ∏(a_i+1) down-sets.
5. Equality: in α disjoint transitive tournaments, every vector of prefixes is a 0-cut. ∎

This is elementary and probably folklore. It settles Conjecture E at k = 0.

**Proposition D (DFAS reduction).** Let D ∈ D_2 have a feedback arc set of size ≤ k, and let σ be a topological
order of D minus that set. Reorient its ≤ k backward arcs forward.
- The underlying graph, and hence α, is unchanged.
- b(X) rises by at most k, so every k-cut of D is a 2k-cut of the forward-model digraph D′.

Consequently, Conjecture E′ implies N_k(D) ≤ (n+1)²·e^{O(√k)} for DFAS yes-instances. By the Fomin–Pilipczuk
framework, it would give **DFAS on α ≤ 2 in 2^{O(√k)}·n^{O(1)}**, against 2^{O(α²√k log(αk))}·n^{O(α)} known.
This is the same transitive-tournament replacement as Fomin–Pilipczuk Lemma 6. ∎

**Reduction to cores (Mission 046, Theorem 2).** The general model (width c > 0, the cutwidth setting) reduces to
cores of ≤ 2(c+k) vertices. So E′ for cores implies the cutwidth result.

## 3. Refuted proof mechanisms

**TPC (two non-neighbourhoods cover all free inversions) — false.**
- *Counterexample:* G a perfect matching (each vertex has one non-neighbour), with X taking every matched pair as
  (zero, one). Each free inversion needs its own pivot, so the number of pivots needed is unbounded.
- *Found by search:* the minimum number of pivots reached 5 on 99,617 k-cuts.
- *But the bound is not threatened:* this class is 1-semicomplete, which Mission 041 already handles.

**TPD(d) (after two pivots, leftover free degree ≤ d) — false for every constant d.**
- *Counterexample:* G = three disjoint stars K_{1,d}, each laid out as centre then leaves. X makes the centres
  zeros and the leaves ones. Then b(X) = 3d, and the leftover degree after the best two pivots is d = b(X)/3.
- *Verified for d = 3:* b(X) = 9, leftover degree 3.
- *Lesson:* this instance's complement is covered by **two global cliques** (all leaves; all centres). So it is
  harmless, but no encoding that uses one-vertex non-neighbourhoods as its cliques can see that.
- *Consequence:* any proof of E′ must find cliques that are *global* (not of the form N̄(v)) yet cheap to encode.
  Equivalently, it must control the free-inversion graph Γ(X) at the level of its components. Mission 046's pivot
  method reaches its limit exactly here.

## 4. Verification of Conjecture E (forward model)

| Test | Scope | Result |
|---|---|---|
| Exhaustive, all labelled triangle-free G | n = 4, 5, 6, 7 (41; 388; 5,789; 133,501 patterns), all k | **0 counterexamples**; the max equals two tournaments for every k |
| All orders × all maximal triangle-free classes (enough, by Lemma M) | n = 8 (10 classes, 6 non-bipartite), n = 9 (16 classes, 12 non-bipartite) | **0 counterexamples** |
| Same, n = 10 | 29 classes (24 non-bipartite), 3,628,800 orders each | **0 counterexamples** |
| High-chromatic triangle-free G, order hill-climbing at equal budget | Petersen (χ=3), Grötzsch (χ=4), Chvátal (χ=4), Clebsch (χ=4) | best found / two tournaments = 0.38 – 0.71; **never competitive** |
| Annealing over G (Mission 046 exp1/exp3) | n ≤ 18, k ≤ 8 | never beat two tournaments |

The class counts (10, 16, 29) stabilised after at most 2,374 of 6,000–12,000 randomized greedy rounds. We did not
prove the enumeration complete, so the n = 8–10 rows are exhaustive over orders but only near-exhaustive over graph
classes.

## 5. What a proof needs (the precise target for the next attempt)

Γ(X) is the free-inversion graph: zero y before one x, non-adjacent. Two facts are proved (by triangle-freeness and
the pivot lemma):
1. Zeros sharing a Γ-neighbour are adjacent; ones sharing a Γ-neighbour are adjacent.
2. Across distinct Γ-components, every zero-before-one pair is a *paid* inversion. So Γ-components interact like the
   vertices of a semicomplete digraph, which is exactly the hyperbola regime.

**Lemma needed:**
- (a) Each Γ-component's zeros and ones are each covered by O(1) cliques that are encodable with O(log n) bits.
- (b) At most O(√k) components contain both a zero and a one.

The three-star example satisfies (a) and (b) with global cliques. The matching example satisfies them with
components of size 2. If (a)+(b) hold, the encoding is: component skeleton + one hyperbola partition at component
level + two clique traces. That gives E′ with no log factor.

## Files

| Script | Description |
|---|---|
| `tests/c/extremal.c` | exhaustive labelled test |
| `tests/c/perm_extremal.c` | all orders of one G |
| `tests/c/order_climb.c` | order hill-climbing |
| `tests/exp4_cover.py`, `tests/exp4b_degree.py` | TPC and TPD |
| `tests/exp5_maximal.py` | maximal classes × all orders |
| `tests/exp6_highchi.py` | high-χ graphs |

Outputs are in `data/`.
