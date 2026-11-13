# Mission 027 — open-frontier discovery: report

**Main finding.** A short counting argument appears to settle an open problem posed by Fomin and Pilipczuk (ESA 2013):

> *Is the number of k-cuts of a semi-complete digraph on n vertices and of cutwidth at most k bounded by
> 2^{O(√k)}·n^{O(1)}?*

**Answer: yes**, with the bound (n+1)·H(2k), where H(K) counts integer partitions lying under the hyperbola
i·λ_i ≤ K, and H(K) ≤ exp(13.71·√K + 37). This removes the √(log k) factor from the exponent of the known algorithms
for cutwidth and for Optimal Linear Arrangement on semi-complete digraphs, which makes both match the known ETH lower
bounds.

**Status.** The proof is complete and elementary (two pages). It is checked by exhaustive computation on small
instances. It is **not** formalized in Lean, not peer reviewed, and my literature search cannot rule out that the
observation has been made since 2018. Treat it as a candidate result that needs an expert's confirmation before any
announcement. It is a real but modest result (it closes a √log gap), not a broad new principle.

Branch `research/open-frontier`; nothing merged; website untouched.

---

## 1. Five opportunities considered

| # | Question | Why it matters | Prior art / barrier | Chance of a substantial result | Decisive experiment |
|---|---|---|---|---|---|
| 1 | Is the number of k-cuts in semi-complete digraphs of cutwidth ≤ k at most 2^{O(√k)}·poly(n)? | Would make the cutwidth and OLA algorithms on tournaments ETH-tight | Posed open by Fomin–Pilipczuk 2013; gap restated by Barbero–Paul–Pilipczuk 2017 | Medium: our partition-counting technique applies directly | Count partitions under a hyperbola exactly and watch ln H / √K |
| 2 | One parameter covering both the dense regime (√λ) and the sparse regime (treewidth) for linear ordering | Would unify the two known tractable regimes | Mission 026 obstruction: tie-blind parameters cannot have a √ exponent under ETH | Low | A prefix DP whose states are cuts modulo a tree decomposition of the tied pairs |
| 3 | Do all prefixes of *local* optima (segment-swap neighbourhood) have cut ≤ C·λ(A)? | Would tie large-scale heuristics to the exact cut lattice | The exchange proof uses a global stable sort, not a local move; a counterexample is plausible | Low–medium | Enumerate local optima for n ≤ 8 and compare prefix cuts with λ |
| 4 | When is the 3-dicycle LP tight (short optimality certificates)? | Polynomial certificates for a structured class | Tight on 5999/6000 random n = 6 instances (Mission 026), but not always; general tightness would contradict NP ≠ coNP | Low for a clean theorem | Search for the smallest non-tight instance within a structured family |
| 5 | Feedback arc set / linear ordering faster than 2ⁿ in general | A long-standing exact-algorithms question | Open for decades; no visible handle | Very low | none cheap |

Ranking by importance × credible path to proof: 1, 3, 2, 4, 5. I chose **1**: it is a precisely stated published open
problem, outside our own framework, and the first experiment was decisive.

## 2. Definitions

A digraph D is *semi-complete* if every pair of vertices is joined by at least one arc. For S ⊆ V, cut(S) is the number
of arcs from V∖S into S; S is a *k-cut* if cut(S) ≤ k. The *width* of an ordering is the largest cut of its prefixes,
and the *cutwidth* ctw(D) is the smallest width of an ordering.

𝓗(K) is the set of integer partitions λ₁ ≥ λ₂ ≥ … > 0 (the empty partition included) with **i·λ_i ≤ K for every i**,
and H(K) = |𝓗(K)|.

## 3. Results and proofs

### Theorem A (counting k-cuts)

*Let D be a semi-complete digraph on n vertices with an ordering σ of width at most c, and let k ≥ 0. Then D has at
most (n+1)·H(c+k) k-cuts.*

**Proof.** Let S be a k-cut. List the vertices outside S in σ-order as u₁, u₂, …, and let s_i be the number of vertices
of S that come after u_i. The s_i are non-increasing.

Fix i with s_i > 0 and consider the pairs (u_j, v) with j ≤ i and v ∈ S after u_i. There are i·s_i of them. Each pair
carries at least one arc. If u_j → v is an arc, it goes from V∖S into S, and there are at most k such arcs. Otherwise
v → u_j is an arc from a vertex after u_i to a vertex at or before u_i, so it enters the prefix of σ ending at u_i, and
there are at most c such arcs. Distinct pairs give distinct arcs, so **i·s_i ≤ c + k**. Hence the positive s_i form a
partition in 𝓗(c+k).

S is recovered from the pair (a, s), where a ∈ {0, …, n} is the number of vertices of S before u₁: after the first a
positions, the pattern of members and non-members is read off the differences s_i − s_{i+1}. So S ↦ (a, s) is
injective into a set of size (n+1)·H(c+k). ∎

The inequality i·s_i ≤ 2k is exactly what Fomin and Pilipczuk derive in their Lemma 8. They then *sum* it to bound the
number of inversions by 2k(1 + ln 2k) and apply the partition-number estimate to that total, which is where the
logarithm enters. The only new step here is to count the sequences under the hyperbola directly.

### Theorem B (partitions under a hyperbola)

*H(K) ≤ exp(13.71·√K + 37) for all K ≥ 0. In particular H(K) = 2^{O(√K)}.*

**Proof.** Let r = ⌊√K⌋ (K ≥ 1). A cell (i, j) of the diagram of λ ∈ 𝓗(K) satisfies i·j ≤ i·λ_i ≤ K < (r+1)², so no cell
has both i > r and j > r. The diagram is therefore determined by three pieces:

1. *The corner* (cells with i, j ≤ r): a Young diagram inside an r × r box; at most C(2r, r) ≤ 4^r choices.
2. *The rows below* (λ_i for i > r): split the indices into bands i ∈ (r·2^t, r·2^{t+1}], t ≥ 0. Band t has L_t = r·2^t
   indices and values at most K/(r·2^t) ≤ (r+3)/2^t =: M_t (because K/r < r + 3). The number of non-increasing
   sequences of length L with values in {0, …, M} is C(L+M, M) ≤ (e(L+M)/M)^M, which increases with M. So band t
   contributes at most exp(M_t·(1 + ln(1 + L_t/M_t))) ≤ exp((r+3)·2^{−t}·(1 + ln 2 + t·ln 4)). Summing over t ≥ 0 with
   Σ2^{−t} = 2 and Σt·2^{−t} = 2 gives at most exp((r+3)(2 + 6 ln 2)) ≤ exp(6.16(r+3)) choices.
3. *The columns to the right* (cells with j > r): 𝓗(K) is closed under conjugation (if i = λ′_j then λ_i ≥ j, so
   i·j ≤ K), so the same bound applies.

Multiplying: ln H(K) ≤ r·ln 4 + 2·6.16·(r+3) ≤ 13.71√K + 37. ∎

The constant is crude. Exact values (computed by dynamic programming, `hyperbola.py`) give ln H(K)/√K = 3.93, 4.93,
5.68, 5.97, 6.03 at K = 100, 800, 12 800, 102 400, 204 800; the increments shrink geometrically, which suggests a limit
near 6.3. That limit is a numerical observation, not a theorem.

### Corollary C (answer to the Fomin–Pilipczuk question)

*A semi-complete digraph of cutwidth at most k has at most (n+1)·H(2k) ≤ (n+1)·exp(13.71√(2k) + 37) = 2^{O(√k)}·n
k-cuts.* (Theorem A with c = k.) The bound is tight up to the constant in the exponent: a transitive tournament
already has 2^{Ω(√k)} k-cuts.

### Corollary D (cutwidth in 2^{O(√k)}·n^{O(1)})

Algorithm: generate, layer by layer, the k-cuts reachable from ∅ by adding one vertex at a time; stop and answer
"ctw > k" if more than (n+1)·H(2k) sets have been generated; otherwise answer "ctw ≤ k" iff V is reached.

Correct: if ctw ≤ k the cap is never exceeded (Corollary C) and the prefixes of an optimal ordering form a chain to V;
if the cap is exceeded then ctw > k; if it is not exceeded the search is exhaustive. Cost: at most n·(n+1)·H(2k)
extension steps, each an O(n)-bit set operation and an O(n) cut update, so O(n⁴·H(2k)) bit operations and
O(n²·H(2k)) bits of memory; H(2k) itself is computed in O(k log k) big-integer additions. Total 2^{O(√k)}·n^{O(1)}.

Barbero, Paul and Pilipczuk proved that cutwidth of semi-complete digraphs cannot be computed in 2^{o(√k)}·n^{O(1)}
under ETH, so this running time is optimal up to the constant in the exponent.

### Corollary E (Optimal Linear Arrangement in 2^{O(k^{1/3})}·n^{O(1)})

OLA cost of an ordering = Σ over backward arcs of their length = Σ over prefixes of cut(prefix).

*Width lemma.* An ordering of cost ≤ k has width ≤ w(k) := (d+1)(d+2)/2 − 1, where d is the largest integer with
1² + 2² + … + d² ≤ k; so w(k) = O(k^{2/3}). Proof: at most ℓ pairs at distance ℓ straddle a given position. If
m ≥ (d+1)(d+2)/2 backward arcs crossed one position, their total length would be at least 1² + … + (d+1)² > k. ∎

So every prefix of a cost-≤k ordering is a w(k)-cut and the digraph has cutwidth ≤ w(k). Run the layered dynamic
program g(S) = min_v g(S − v) + cut(S) over w(k)-cuts with cap (n+1)·H(2w(k)) = 2^{O(k^{1/3})}·n. This matches the
2^{o(k^{1/3})} ETH lower bound of Barbero–Paul–Pilipczuk.

### Corollary F (for our own linear-ordering work)

The weak-majority digraph of a margin matrix is semi-complete. If some optimal ordering has all prefixes of weak cut
≤ k (in particular if λ(A) ≤ k), the number of k-cuts is at most (n+1)·H(2k). This needs a weaker hypothesis than our
Lean-verified `cut_count_bound`, but its constant is worse (H(2k) versus P(3k)), so it does not speed up AutoCut.

## 4. Verification (exact, `verify.py`, seed 27027)

- **1554** random semi-complete digraphs, n ≤ 9, seven density families including digraphs with many double arcs.
  For an optimal ordering and **every** k: the hyperbola inequality holds for every k-cut (**434 856** sets checked,
  0 violations), the map S ↦ (a, s) is injective (0 collisions), and the count never exceeds (n+1)·H(c+k).
- Cutwidth algorithm: **7766** decisions (all k from 0 to ctw + 2) agree with the 2ⁿ reference DP.
- OLA algorithm: **5488** decisions agree with the 2ⁿ reference DP. Width lemma checked on 21 800 orderings.
- The abort branch never fired on these small instances (the cap exceeds 2ⁿ there); its correctness rests on the proof.
- H(K) cross-checked between two independent implementations for K < 60.

Published versus new exponent (natural log of the per-size cut bound):

| k | Fomin–Pilipczuk: 2C√(k(1 + ln 2k)) | new: ln H(2k) |
|---|---|---|
| 10 | 32.4 | 12.6 |
| 100 | 128.7 | 61.0 |
| 1000 | 475.8 | 234.4 |

`demo.py`: on shuffled near-transitive tournaments with n = 30–80 and cutwidth 2, the algorithm generates 79–245 cuts
against a cap of 806–2106 (the published cap is about 2²¹–2²²).

No counterexample to any statement was found. Counterexample searches were limited to n ≤ 9.

## 5. Novelty audit

- Fomin & Pilipczuk (ESA 2013, arXiv 1301.7314) prove 2^{O(√(k log k))}·n and pose the question above as an open
  problem, noting that the log factor comes from combining their Lemmas 5 and 8.
- Barbero, Paul & Pilipczuk (ICALP 2017 / TALG 2018) prove the ETH lower bounds and state that the known algorithms
  are optimal "up to √log k factor in the exponent".
- Misra, Raman, Ramanujan, Saurabh & Zehavi (FSTTCS 2018) extend k-cut counting to bounded independence number; they
  do not address the log factor.
- I ran four targeted searches for a later resolution and found none. **This is not proof of novelty.** The argument is
  simple enough that it may be known to specialists or appear in work I did not find. The right next step is to send
  the two-page proof to the authors of the open problem.

Classification: answer to a published open question, by a small refinement of the original authors' own argument.

## 6. Significance (honest)

- It closes a stated gap and makes two parameterized algorithms ETH-tight. That is a genuine, checkable contribution
  if it is new.
- It is narrow: one counting lemma, in the neighbouring field of tournament layout problems. It is not a new general
  principle, and it does not improve AutoCut or the practical solvers.
- By the mission's own standard it passes Gate 2 (proof), Gate 3 (reproducible checks) and a modest version of Gate 4;
  Gate 1 (novelty) is unconfirmed.

## 7. Hardest remaining step

Independent confirmation: novelty (an expert's word, or a careful citation search of the 2013 paper), and a formal
check of Theorems A and B. Both are small enough to formalize in Lean (finite combinatorics plus one binomial
estimate). Beyond that, the natural extensions are:

1. the exact growth constant of H(K) (numerically near 6.3);
2. whether the hyperbola count also removes logarithmic factors from the bounded-independence-number bounds;
3. opportunity 3 above (prefix structure of local optima), which remains untouched.

## 8. Artifacts

`hyperbola.py` (H(K), reference DPs, the two algorithms), `verify.py` + `verify_results.json`, `demo.py` +
`demo_results.json`. Reproduce with `python3 verify.py && python3 demo.py` (pure Python, no dependencies).
