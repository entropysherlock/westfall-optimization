# Hyperbola partitions and the number of k-cuts of semicomplete digraphs

**Status (2026-11-13).** Draft manuscript prepared in WESTFALL Mission 040. The counting theorem (Theorem 1) is
proved below, checked exhaustively on all semicomplete digraphs with ≤ 5 vertices and all tournaments with
6 vertices, and formalized in Lean 4 + Mathlib (see `FORMAL_STATUS.md` for exactly what the kernel checked).
**No independent human expert has reviewed this work.** Novelty is provisional: see `NOVELTY.md`.

## Abstract

Fomin and Pilipczuk (ESA 2013) asked whether every n-vertex semicomplete digraph of directed cutwidth at most
k has at most 2^{O(√k)}·n^{O(1)} k-cuts; a positive answer would remove the √(log k) factor from their
2^{O(√(k log k))}·n^{O(1)} algorithms for cutwidth and optimal linear arrangement (OLA). We answer the question
positively: if a semicomplete digraph on n vertices has an ordering of width at most c, it has at most
(n+1)·H(c+k) k-cuts, where H(K) counts integer partitions whose Ferrers diagram lies under the hyperbola
xy ≤ K, and H(K) ≤ (e^{2π√K} − 1)/(2π√K). Consequently cutwidth ≤ k of a semicomplete digraph can be decided,
with an optimal ordering, in time e^{2π√(2k)}·O(k·n^4) = 2^{O(√k)}·n^{O(1)}, and OLA cost ≤ k in time
2^{O(k^{1/3})}·n^{O(1)}. Both match the ETH lower bounds of Barbero, Paul and Pilipczuk up to the constant in
the exponent. The proof is short: it replaces the area bound of a Ferrers diagram (which is genuinely of order
k log k) by a bound on every inscribed rectangle, and counts partitions under a hyperbola.

## 1. Definitions and conventions

A *digraph* D = (V, E) has no loops and no parallel arcs; antiparallel pairs u→v, v→u are allowed. D is
*semicomplete* if for all distinct u, v at least one of u→v, v→u is an arc (a *tournament* if exactly one).

For X ⊆ V write Y = V ∖ X and **back(X) = |{(y, x) ∈ E : y ∈ Y, x ∈ X}|**. An ordered bipartition (X, Y) is a
**k-cut** if back(X) ≤ k. For an ordering σ = (v_1, …, v_n), its width is max_{0≤t≤n} back({v_1, …, v_t})
(arcs from the suffix into the prefix), and the **cutwidth** ctw(D) is the minimum width over orderings.

These are the conventions of Fomin–Pilipczuk ESA 2013 (Definitions 2 and 4). The journal version (JCTB 2019,
Definition 2.7) counts forward arcs instead. The two theories coincide: reversing an ordering maps forward
width to backward width, and (X, Y) ↦ (Y, X) maps forward k-cuts to backward k-cuts, so ctw(D) and the number
N_k(D) of k-cuts do not depend on the convention (also confirmed computationally, `PROOF_AUDIT.md` §3).

**Hyperbola partitions.** For an integer K ≥ 0 let
H(K) = #{ λ_1 ≥ λ_2 ≥ ⋯ ≥ 0 integers : i·λ_i ≤ K for all i ≥ 1 }.
(Only finitely many λ_i are nonzero, since λ_i ≥ 1 forces i ≤ K.) H is invariant under conjugation and counts
the Young diagrams contained in {(x, y) : xy ≤ K}. Values: H(0..5) = 1, 2, 5, 10, 26, 42; H(10) = 1442;
H(100) = 112833264795077406.

## 2. The counting theorem

**Lemma 1 (rectangle lemma).** Let D be semicomplete, let P ⊆ V be any prefix of an ordering σ, and X ⊆ V. Then
  |P ∖ X| · |X ∖ P| ≤ back(P) + back(X).

*Proof.* The pairs (y, x) with y ∈ P ∖ X and x ∈ X ∖ P are distinct and |P∖X|·|X∖P| in number, with y ≠ x.
For each, semicompleteness gives y→x or x→y. An arc y→x goes from Y into X and is counted by back(X); an arc
x→y goes from V ∖ P into P and is counted by back(P). The map pair ↦ chosen arc is injective, so the number of
pairs is at most back(X) + back(P). ∎

(The argument never uses that P is a prefix: Lemma 1 holds for every P ⊆ V. Prefixes matter only when the
width bound back(P) ≤ c is invoked.)

**Encoding.** Fix σ and X. Read σ left to right writing 1 for vertices of X and 0 for vertices of Y. For s ≥ 1 let
  μ_s(X) = #{x ∈ X : at least s vertices of Y precede x in σ}.
(μ_1 ≥ μ_2 ≥ ⋯ are the column lengths of the Ferrers diagram whose cells are the pairs (zero, later one); its
row lengths are "the number of zeros preceding the i-th one from the right", the encoding of the draft note.)

**Lemma 2 (hyperbola inequality).** If D is semicomplete, σ has width ≤ c, and X is a k-cut, then
s·μ_s(X) ≤ c + k for every s ≥ 1.

*Proof.* If μ_s = 0 there is nothing to prove. Otherwise let x_0 be the first (in σ) vertex of X preceded by
at least s vertices of Y, and let P be the prefix of σ ending just before x_0. Then |P ∖ X| ≥ s, and every x ∈ X
counted by μ_s is not before x_0, so |X ∖ P| ≥ μ_s. Lemma 1 and the width bound give
s·μ_s ≤ |P∖X|·|X∖P| ≤ back(P) + back(X) ≤ c + k. ∎

**Lemma 3 (injectivity).** Let X, X′ ⊆ V with |X| = |X′|, both satisfying s·μ_s ≤ K for all s, and
μ_s(X) = μ_s(X′) for 1 ≤ s ≤ K. Then X = X′.

*Proof.* Suppose not, and let v be the σ-first vertex in the symmetric difference; by symmetry v ∈ X ∖ X′. The two
sets agree before v, so v is preceded by the same number s_0 of non-members in both. Put s = s_0 + 1.
(a) Every x ∈ X with at least s preceding non-members lies after v (a vertex at or before v has ≤ s_0), so
μ_s(X) ≤ |X ∩ (v, ∞)|. (b) Every x ∈ X′ after v is preceded by the s_0 earlier non-members and by v ∉ X′, so
μ_s(X′) ≥ |X′ ∩ (v, ∞)|. (c) Since |X| = |X′|, the sets agree before v, v ∈ X and v ∉ X′, we get
|X′ ∩ (v, ∞)| = |X ∩ (v, ∞)| + 1. Hence μ_s(X′) ≥ μ_s(X) + 1. If s ≤ K this contradicts μ_s(X) = μ_s(X′). If s > K,
then s·μ_s(X′) ≤ K < s forces μ_s(X′) = 0, contradicting μ_s(X′) ≥ 1. ∎

**Theorem 1 (k-cut counting).** If D is a semicomplete digraph on n vertices with an ordering of width at most c,
then for every k ≥ 0
  N_k(D) := #{X ⊆ V : back(X) ≤ k} ≤ (n + 1) · H(c + k).

*Proof.* Put K = c + k. By Lemma 2, X ↦ (|X|, (μ_1(X), …, μ_K(X))) maps k-cuts into
{0, …, n} × {antitone sequences of length K with s·f_s ≤ K}; the second factor has exactly H(K) elements
(column sequences of hyperbola partitions; columns beyond K are empty). By Lemma 3 the map is injective on
k-cuts. ∎

*Remarks.* (i) The theorem uses only that every pair of vertices carries an arc; it holds verbatim for weighted
digraphs with positive integer weights if back(·) and widths are measured by total weight. (ii) The proof gives
the exact identity behind it: the number of X ⊆ V with |P∖X|·|X∖P| ≤ K for every prefix P equals
Σ_{a=0}^{n} #{hyperbola partitions in an a × (n−a) box}, because the Ferrers diagram's largest inscribed
rectangles are exactly the products |P∖X|·|X∖P| at the corners. (iii) The bound is attained for k = c = 0
(a transitive tournament has exactly n + 1 0-cuts).

## 3. The hyperbola-partition estimate

**Theorem 2.** For every integer K ≥ 1, H(K) ≤ (e^{2π√K} − 1)/(2π√K) < e^{2π√K}; and H(0) = 1.

*Proof.* Let w_0 = 0, w_i = log(1 + i²/K) (increasing). An admissible λ has λ_i ≤ K/i and λ_{K+1} = 0; put
d_i = λ_i − λ_{i+1} ≥ 0 for i ≤ K. Summation by parts gives
Σ_{i=1}^{K} w_i d_i = Σ_{i=1}^{K} (w_i − w_{i−1}) λ_i ≤ K Σ_{i=1}^{K} (w_i − w_{i−1})/i.
Since w_i − w_{i−1} = ∫_{i−1}^{i} w′(x) dx and 1/i ≤ 1/x on (i−1, i],
K Σ (w_i − w_{i−1})/i ≤ K ∫_0^∞ w′(x)/x dx = K ∫_0^∞ 2/(K + x²) dx = π√K.
So every admissible λ has weight e^{−Σ w_i d_i} ≥ e^{−π√K}. λ ↦ (d_1, …, d_K) is injective, hence
H(K)·e^{−π√K} ≤ Σ_{d ∈ ℕ^K} Π_i e^{−w_i d_i} = Π_{i=1}^{K} (1 − e^{−w_i})^{−1} = Π_{i=1}^{K} (1 + K/i²)
≤ Π_{i≥1} (1 + K/i²) = sinh(π√K)/(π√K)
(Euler's product for sin at imaginary argument). Multiply by e^{π√K}. ∎

**Corollary 1.** A semicomplete digraph on n vertices with cutwidth at most k has at most
(n+1)·H(2k) ≤ (n+1)·e^{2π√(2k)} k-cuts. This answers the open problem of Fomin–Pilipczuk (ESA 2013, §5).

*Order of magnitude.* For a transitive tournament with n ≥ 2k, the k-cuts of each size a near n/2 correspond to
partitions of area ≤ k in an a × (n−a) box, so max N_k over cutwidth-≤k semicomplete digraphs is
2^{Θ(√k)}·n for n ≥ 2k. The constant in the exponent is between π√(2/3) ≈ 2.565 (transitive tournaments) and
2π√2 ≈ 8.886 (Theorem 2); numerically log H(K)/(2π√K) ≈ 0.917 at K = 20000. Determining it is open.

## 4. Algorithmic consequences

**Enumeration with polynomial delay** (as in Fomin–Pilipczuk, Lemma 3, re-derived here). Branch over the vertices
in a fixed order, assigning each to X or Y. A partial assignment (A ⊆ X, B ⊆ Y) extends to a k-cut iff
min{back(X) : A ⊆ X ⊆ V ∖ B} ≤ k, which is a minimum s–t cut (sources B, sinks A, unit capacities on arcs), computable
with at most k+1 augmenting paths in O((k+1)·n²) time. Keeping only extendable nodes, every leaf is a k-cut and
consecutive outputs are separated by at most 2n flow computations.

**Theorem 3 (cutwidth).** Given a semicomplete digraph D on n vertices and k, one can decide whether ctw(D) ≤ k,
and if so output an ordering of width ≤ k, in time O(H(2k)·k·n⁴) ≤ e^{2π√(2k)}·O(k n⁴) = 2^{O(√k)}·n^{O(1)}.

*Proof.* Enumerate k-cuts, stopping as soon as more than (n+1)H(2k) have been produced; then, by Corollary 1,
ctw(D) > k (correct NO answer). Otherwise all k-cuts are listed. Build the digraph on them with an arc
X → X ∪ {v} whenever both are k-cuts; an ordering has width ≤ k iff all its prefixes are k-cuts, i.e. iff it is a
path ∅ → V in this DAG. BFS (O(n) hash lookups per cut, n-bit keys) decides this and returns the path, i.e. the
ordering. Enumeration costs O((n+1)H(2k)·n·(k+1)n²) and the search O((n+1)H(2k)·n²). Space: O((n+1)H(2k)·n) bits. ∎

Minimum cutwidth is obtained by trying k = 0, 1, 2, … in total time 2^{O(√ctw)}·n^{O(1)}. By Barbero–Paul–Pilipczuk
(TALG 2018, Theorem 14), no 2^{o(√k)}·n^{O(1)} algorithm exists unless ETH fails; Theorem 3 is therefore optimal up
to the constant in the exponent.

**Lemma 4 (OLA cost bounds width).** The OLA cost of an ordering is Σ_t back(prefix_t) = Σ over backward arcs of their
length. If it is at most k, every prefix cut has size at most W(k) := ⌊((3k)^{1/3} + 2)²/2⌋ = O(k^{2/3}).

*Proof.* Let w arcs cross a cut backward. Distinct crossing arcs are distinct pairs (earlier head, later tail), and at
most d pairs crossing a fixed cut have length exactly d. Let L be maximal with L(L+1)/2 ≤ w; the total length is at
least Σ_{d=1}^{L} d² ≥ L³/3, while w < (L+2)²/2. So k ≥ L³/3 > (√(2w) − 2)³/3, i.e. w < ((3k)^{1/3}+2)²/2. ∎
(Fomin–Pilipczuk's Lemma 11 gives the bound (4k)^{2/3}; any O(k^{2/3}) bound suffices.)

**Theorem 4 (OLA).** OLA cost ≤ k of a semicomplete digraph can be decided, with an optimal ordering, in time
2^{O(k^{1/3})}·n^{O(1)}.

*Proof.* Let W = W(k). If OLA(D) ≤ k, an optimal ordering has width ≤ W (Lemma 4), so ctw(D) ≤ W and all its
prefixes are W-cuts. Enumerate W-cuts, answering NO once more than (n+1)H(2W) appear (Corollary 1). Otherwise find a
minimum-weight path ∅ → V in the DAG of W-cuts, the weight of a path being Σ back(X) over its nodes; this minimum
equals OLA(D) whenever OLA(D) ≤ k. Time (n+1)H(2W)·n^{O(1)} = e^{2π√(2W)}·n^{O(1)} = 2^{O(k^{1/3})}·n^{O(1)}. ∎

This improves Fomin–Pilipczuk's 2^{O(k^{1/3}√log k)}·n^{O(1)} (ESA 2013, Theorem 15) and matches the ETH lower bound
2^{o(k^{1/3})}·n^{O(1)} (Barbero–Paul–Pilipczuk, Theorem 14) up to the constant in the exponent.

## 5. Limitations and what is not claimed

* No claim about general digraphs: without semicompleteness the bound fails (the arcless digraph on n vertices has
  2^n 0-cuts and cutwidth 0).
* No improvement is claimed for Feedback Arc Set in tournaments: Fomin–Pilipczuk's Corollary 7 already gives
  2^{O(√k)} k-cuts there, with a better constant than Theorem 1 provides.
* The exponent constants are not optimized; the true constant for k-cut counting is open (§3).
* The digraphs-of-bounded-independence-number setting (Misra et al.) is not addressed; there the missing pairs break
  Lemma 1 and a different argument is needed.
* Practical impact is not claimed: on our test instances the true number of k-cuts is far below both stopping
  thresholds, so the improvement concerns worst-case guarantees (`PROOF_AUDIT.md` §5).

## References

1. F. V. Fomin, M. Pilipczuk. Subexponential parameterized algorithm for computing the cutwidth of a semi-complete
   digraph. ESA 2013, LNCS 8125, 505–516. arXiv:1301.7314. (Definitions 2, 4; Lemmas 3, 5, 8, 9, 11; Corollaries 7, 10;
   Theorems 14, 15; §5 open problem.)
2. F. V. Fomin, M. Pilipczuk. On width measures and topological problems on semi-complete digraphs. J. Combin.
   Theory Ser. B 138 (2019) 78–165. (Definition 2.7, Definition 5.5, Corollary 5.16, Theorem 5.20, §11 p. 161.)
3. M. Pilipczuk. Computing cutwidth and pathwidth of semi-complete digraphs via degree orderings. STACS 2013.
   arXiv:1210.5363. (Theorem 20: 2^{O(k)}·n² exact algorithm.)
4. F. Barbero, C. Paul, M. Pilipczuk. Exploring the complexity of layout parameters in tournaments and semi-complete
   digraphs. ICALP 2017; ACM TALG 14(3) 2018. arXiv:1706.00617. (Theorem 14: ETH lower bounds.)
5. P. Misra, S. Saurabh, R. Sharma, M. Zehavi. Sub-exponential time parameterized algorithms for graph layout problems
   on digraphs with bounded independence number. FSTTCS 2018; Algorithmica 85 (2023).
6. U. Feige. Faster FAST (Feedback Arc Set in Tournaments). arXiv:0911.5094, 2009.
   M. Karpinski, W. Schudy. Faster algorithms for feedback arc set tournament, Kemeny rank aggregation and betweenness
   tournament. ISAAC 2010.
