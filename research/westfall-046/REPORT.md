# WESTFALL Mission 046 — The bounded-independence barrier

**Classification: LEMMA ONLY**, together with a complete reduction theorem.

The target, cutwidth in 2^{O(√k)}·n^{O(1)} for α ≤ 2, is **not** proved. What is proved:
- an independence-drop lemma (the Pivot Lemma);
- a decomposition of every k-cut of an α ≤ 2 digraph into two semicomplete traces plus a core of at most 2(c+k)
  vertices.

The decomposition is exact and its injectivity is proved. Consequently, the target is equivalent to the same counting
statement for instances with at most 2(c+k) vertices. The log factor, if it is real, lives entirely in instances of
size O(k).

## Conventions

- **Cuts.** b(X) = #{(u,v) ∈ E : u ∉ X, v ∈ X}. A **k-cut** is a set X with b(X) ≤ k.
- **Reference ordering.** σ is a reference ordering of width ≤ c; vertices are identified with their positions in σ.
- **Notation.** K = c + k. U is the underlying undirected graph. G is the non-adjacency graph: uv ∈ G iff u ≠ v
  and neither arc is present. N̄(v) is the set of non-neighbours of v.
- **Classes.** α(D) = α(U). D_α is the class of digraphs with α ≤ α. N_k(D) is the number of k-cuts.
- **Zeros and ones.** For a set X, the *zeros* are V∖X and the *ones* are X.
  - For a zero y, R(y) is the number of ones after y.
  - For a one x, L(x) is the number of zeros before x.
  - A zero is **far** if R(y) > K. A one is **far** if L(x) > K.
- **Hyperbola count.** H(K) is the number of partitions with iλ_i ≤ K (Mission 040).
  For semicomplete D, N_k ≤ (n+1)·H(c+k) (Mission 040, Lean-checked).

## A. Literature verdict

- **Misra–Saurabh–Sharma–Zehavi** (FSTTCS 2018; Algorithmica 85(7), 2023) is the state of the art. DFAS and Directed
  Cutwidth on D_α run in 2^{O(α²√k log(αk))}·n^{O(α)}, and OLA in 2^{O(α² k^{1/3} log(αk))}·n^{O(α)}.
  - Their k-cut bound for yes-instances (Lemma 4.3) is n^{α+1} times 2^{O(α²√k log(αk))}. It is obtained by:
    1. chromatic coding;
    2. a Gallai–Milgram partition into Hamiltonian-path parts, each with ≤ n+1 zero-cuts;
    3. an induction on α through k-out-degeneracy.
  - Their general (non-yes-instance) bound is n^{O(α√k)}.
  - The only open problem they state is polynomial kernels. Removing the log factor is not posed there.
- **α = 1.**
  - Fomin–Pilipczuk 2013 obtained 2^{O(√(k log k))}·n^{O(1)}.
  - Barbero–Paul–Pilipczuk (ICALP 2017 / TALG 2018) prove ETH-tightness up to the √log k factor and leave the log
    open.
  - WESTFALL Mission 040 (PR #16, under review) claims to remove it with the hyperbola bound (n+1)·H(c+k).
- **Search.** We searched for later work through 2026-11-13, for removing the log or the α² in bounded-α layout
  problems, and found nothing. Coverage was via web search; theses and unindexed preprints cannot be excluded.
- **Verdict.** For α ≥ 2, the target "2^{O(√k)}·n^{O(1)} for α ≤ 2" (or 2^{O(poly(α)√k)}·n^{O(α)}) is **open and
  credibly novel** as far as we can determine. Its α = 1 case is exactly the status of Mission 040.
- **A discrepancy in the brief.** The brief quotes a machine-verified bound (n+1)·4^h·H(c+k)². The bound kernel-checked
  in Mission 041 is (n+1)·R_h(c+k)·H(c+k), together with (n+1)^{h+1}·H(c+k). Nothing below relies on either.

## B. Discoveries (precise statements)

**Theorem 1 (Pivot Lemma; any α, any vertex sets).** Let P, X ⊆ V, A = P∖X and B = X∖P.

- If |B| > b(P) + b(X), then some x′ ∈ B has no neighbour in A. Hence A ⊆ N̄(x′), and α(D[N̄(x′)]) ≤ α(D) − 1.
- Symmetrically, if |A| > b(P) + b(X), then some y′ ∈ A has B ⊆ N̄(y′).

**Theorem 2 (Core Decomposition; α ≤ 2).** Let D ∈ D_2 have a reference ordering of width ≤ c. Every k-cut X is
determined by the code

  ( y_f, x′, X ∩ N̄(x′) ; x_f, y′, X ∩ N̄(y′) ; q, r, X ∩ C ),

where:
- y_f is the last far zero; x′ is a pivot for (P = [1, y_f], X);
- x_f is the first far one; y′ is a pivot for (P = [1, x_f), X);
- q is the first non-far zero; r is the last non-far one;
- C = (non-far vertices) ∩ [q, r] is the **core**, with |C| ≤ 2K.

Each piece of the code is controlled as follows:
- N̄(x′) and N̄(y′) are cliques of U, so D[N̄(x′)] and D[N̄(y′)] are semicomplete.
- Every trace is a k-cut of the induced subdigraph, which has a reference ordering of width ≤ c.

Consequently,

  N_k(D) ≤ (n+1)^8 · H(c+k)² · f_2(c, k),   where f_2(c,k) := max{ N_k(D′) : D′ ∈ D_2, |V(D′)| ≤ 2(c+k), D′ has an ordering of width ≤ c }.

**Corollary 3 (Self-reduction).** The following are equivalent:

- (i) There is a constant C such that N_k(D) ≤ n^{C}·e^{C√(c+k)} for every D ∈ D_2 with an ordering of width ≤ c.
- (ii) There is a constant C′ such that f_2(c,k) ≤ e^{C′√(c+k)}.

Under (ii), Directed Cutwidth on D_2 is solvable in 2^{O(√k)}·n^{O(1)}. The proof enumerates k-cuts with polynomial
delay and stops at the threshold (n+1)^8·H(2k)²·e^{C′√(2k)} (Fomin–Pilipczuk framework, c = k). OLA on D_2 likewise
runs in 2^{O(k^{1/3})}·n^{O(1)}.

**Theorem 4 (Recursive form; any α).** Replacing "semicomplete" by "D_{α−1}" in Theorem 2 gives

  N^{(α)}_k(n) ≤ (n+1)^6 · [N^{(α−1)}_k(n)]² · f_α(c,k),

so that

  N^{(α)}_k ≤ (n+1)^{7·2^{α−1}−6} · H(c+k)^{2^{α−1}} · ∏_{j=2}^{α} f_j(c,k)^{2^{α−j}}.

The n-exponent grows like 2^α, which is worse than Misra et al.'s α+1. Theorem 4 is therefore recorded as a structural
statement, not as an improvement.

## C. Proofs

### Theorem 1

Every adjacent pair (a, b) ∈ A × B carries at least one arc, and each arc is charged once:
- an arc a → b has a ∉ X and b ∈ X, so it is counted by b(X);
- an arc b → a has b ∉ P and a ∈ P, so it is counted by b(P).

So the number of adjacent pairs is at most b(P) + b(X) < |B|. By pigeonhole, some x′ ∈ B lies in no adjacent pair,
which gives A ⊆ N̄(x′).

For the independence drop: if I ⊆ N̄(x′) is independent, then I ∪ {x′} is independent, so α(D[N̄(x′)]) ≤ α − 1.
The symmetric statement is identical. ∎

Only the charging uses the direction convention. It was checked against b(X) = arcs *into* X, which is the brief's
convention.

### Theorem 2

**Far zeros are an initial segment of the zeros, and they lie in one clique.** R(y) is non-increasing along the zeros
in σ-order, so the far zeros are exactly the zeros in [1, y_f]. Apply Theorem 1 with P = [1, y_f]:
- A = P∖X is the set of far zeros;
- B = X∖P is the set of ones after y_f, so |B| = R(y_f) > K ≥ b(P) + b(X).

So some x′ ∈ B has A ⊆ N̄(x′). With α = 2, N̄(x′) is a clique of U.

**Decoding the far zeros.** Given y_f, x′ and the trace X ∩ N̄(x′), the far zeros are recovered as
(N̄(x′) ∩ [1, y_f]) ∖ X. This is correct because every zero in [1, y_f] is far and lies in N̄(x′).

**Far ones.** Symmetrically, the far ones are exactly the ones in [x_f, n]. With P = [1, x_f), A = P∖X is the set
of zeros before x_f, of size L(x_f) > K. Theorem 1 gives y′ ∈ A with all far ones in N̄(y′), and the far ones are
(N̄(y′) ∩ [x_f, n]) ∩ X.

**Middle vertices.** Let M be the set of vertices that are neither far zeros nor far ones. M is known once the far
sets are decoded, and it remains to label it.
- Every non-far zero y has R(y) ≤ K, and every non-far one x has L(x) ≤ K.
- No non-far zero lies before q, so M ∩ [1, q) consists of ones.
- No non-far one lies after r, so M ∩ (r, n] consists of zeros.
- If q > r, M is labelled 1…1 0…0 with the break at q, and the core is empty.
- Otherwise, C = M ∩ [q, r] contains at most R(q) ≤ K ones (all after q, together with r) and at most L(r) ≤ K
  zeros (all before r, together with q). So |C| ≤ 2K.

The decoder sets:
- far zeros to 0 and far ones to 1;
- M ∩ [1, q) to 1 and M ∩ (r, n] to 0;
- C according to X ∩ C.

So the code determines X, and the encoding is injective.

**Counting.**
- **Positions and pivots.** y_f, x_f, q and r each have at most n+1 values (including "none"), and x′ and y′ at most
  n each. That is at most (n+1)^6 choices.
- **The two clique traces.** Take X ∩ N̄(x′). Arcs inside N̄(x′) from N̄(x′)∖X into X are among the arcs counted by
  b(X), so the trace is a k-cut of the semicomplete digraph D[N̄(x′)]. The restriction of σ has width ≤ c, because
  restricting an ordering cannot increase a prefix cut. Mission 040 then gives at most (n+1)·H(K) traces. The same
  holds for X ∩ N̄(y′).
- **The core trace.** X ∩ C is a k-cut of D[C] ∈ D_2. D[C] has |C| ≤ 2K vertices and an ordering of width ≤ c, so
  there are at most f_2(c,k) core traces.

Multiplying gives the bound. ∎

### Corollary 3

(ii) ⇒ (i) is Theorem 2. (i) ⇒ (ii) holds because n ≤ 2(c+k) turns n^{C} into a polynomial in c+k, which is
absorbed into e^{C′√(c+k)}.

**Algorithm.** Polynomial-delay enumeration of k-cuts and reachability over the k-cut lattice are those of Mission 040
§6; they hold for every digraph. If ctw(D) ≤ k, an optimal ordering has c = k. Exceeding the threshold therefore
certifies ctw > k.

**OLA.** An OLA ordering of cost ≤ k has width O(k^{2/3}), by Mission 040 Lemma 4, which holds for every digraph. ∎

### Theorem 4

The proof is the same as Theorem 2. The pivot cliques become sets N̄(x′) with α ≤ α−1, and their traces are counted
recursively. Unrolling the recursion e_α = 6 + 2·e_{α−1}, with e_1 = 1, gives the exponent. ∎

## The remaining gap, stated exactly

**Conjecture W.** f_2(c,k) ≤ e^{O(√(c+k))}. Equivalently, every D ∈ D_2 on at most 2K vertices with an ordering of
width ≤ c has e^{O(√K)} k-cuts.

Here is what is known about f_2:
- **Trivially,** f_2 ≤ 2^{2K}.
- **From Misra et al.** (for c ≤ k): f_2 ≤ (2K)^3·2^{O(√k log k)}. This only re-derives the known bound.
- **Lower bound.** Two disjoint transitive tournaments of size K show f_2 ≥ e^{Ω(√K)}.

The proof of the semicomplete hyperbola fails inside the core because a K×K block of free inversions (G complete
bipartite between zeros and ones) is allowed.

Theorem 1 also has a version with exceptions: some vertex of B has at most (b(P)+b(X))/|B| neighbours in A. It handles
such blocks only up to exceptional sets of size K/|B|. Encoding those exceptions at every scale costs
K^{O(√K)} = e^{O(√K log K)}, which is the log factor again. So the log factor reappears in exactly the core, and
nowhere else.

## D. Counterexample report

| Attempt | Result |
|---|---|
| Universal bound f(k,α)·n^C with C independent of α | **False** (the brief's obstruction). α disjoint transitive tournaments: ctw 0, N_0 = (n/α+1)^α. Confirmed exactly by `exp1_growth.py` (k = 0 rows). |
| Additive rectangle lemma for α = 2 | **False** (Mission 041, Theorem F). Two tournaments with no arcs between give a = b = m at cost 0. |
| Pivot Lemma, and the Core Decomposition round trip | **Survived.** 139,464 k-cuts on 370 digraphs: 0 decode failures, 0 missing pivots, 0 non-clique pivot sets, core ≤ 2K always (max 2K attained). Families: two tournaments (interleaved/blocked, with backward arcs), cyclic tournaments, complement of matchings with bidirected pairs, C5 blow-ups (complete-multipartite missing patterns), random triangle-free defects with up to 30% backward arcs; k = 0 … ctw+2, c = ctw. Pivot branches exercised ≈ 20,000 times each. |
| Is there an α = 2 graph with more k-cuts than two disjoint tournaments? (would push toward n^{f(k)} growth) | **Not found.** Simulated annealing over K_3-free non-adjacency graphs: n = 12–18, k ∈ {1, 2, 4, 6}; and for α = 3, n = 12–18. Every optimum found equals the disjoint-tournament baseline. At fixed k, max N_k / n² increases slowly and is flattening, consistent with Θ(n²) plus lower-order terms. |
| Core function f_2(K), K = 1–8 (n = 2K) | Max found always equals two disjoint tournaments; f_2(K)/((K+1)² H(K)²) ≤ 0.25 and decreasing. **Cannot** separate √K from √K·log K at this size. |
| Hostile boundary cases (k = 0, c = 0, α = 1, 2; cyclic tournaments; bidirected; multipartite) | Included in the round-trip test; no failure. |

**Not tested:**
- n > 18 in the forward model, or n > 11 with backward arcs and exact cutwidth;
- α ≥ 3 for the decomposition;
- any search that could detect K^{Ω(√K)} behaviour, which needs K ≳ 50.

## E. Algorithmic consequence

- **Unconditional.** Nothing beyond the literature. Theorem 2 with the trivial or Misra bound on f_2 reproduces
  2^{O(√k log k)}·n^{O(1)} for α = 2, with a worse polynomial (n^8 against n^3).
- **Conditional on Conjecture W.**
  - Directed Cutwidth on D_2 in 2^{O(√k)}·n^{O(1)}, which would be ETH-tight because it includes tournaments.
  - OLA on D_2 in 2^{O(k^{1/3})}·n^{O(1)}.

  The reduction and the stopping rule are complete (Corollary 3). Only Conjecture W is missing.

## F. Reproducibility

Everything is in `tests/`, with outputs in `data/`. All code is pure Python 3 + numpy; counts are exact, and the
annealing is seeded.

| Script | Proposition | Output |
|---|---|---|
| `lib046.py` | exact b-tables, subset-DP cutwidth, α, inv_U, H | — |
| `exp1_growth.py` | growth of max N_k for α = 2, 3 against the disjoint-tournament baseline | `data/exp1_growth.json`, `data/exp1.log` |
| `exp2_decoder.py` | Pivot Lemma + Core Decomposition round trip, general model | `data/exp2_decoder.json` |
| `exp2b_forward.py` | same at n = 12–16 (forward model) with branch counters | `data/exp2b_forward.json` |
| `exp3_core.py` | the core function f_2(K), K ≤ 8 | `data/exp3_core.json` |

## G. Final classification

**LEMMA ONLY.** Theorems 1–2 and Corollary 3 are proved, and the decomposition is exactly verified on 139,464 k-cuts.
They reduce the α = 2 log-removal problem to instances with O(c+k) vertices, but they do not solve it. The word
"proved" is not used for Conjecture W or for any algorithm that depends on it.
