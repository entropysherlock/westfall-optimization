# Mission 028 — Frontier Breakthrough Hunt: report

Branch `research/discovery-028`. Nothing merged into `main`. Public website untouched. Mission 027 commit `52e74fb`
(`research/open-frontier`) preserved and **not** treated as established.

## Outcome in one paragraph

1. **Theorem 1 (proved, short):** the number H(K) of integer partitions with i·λ_i ≤ K for all i satisfies
   **H(K) ≤ e^{2π√K}** for every K ≥ 1. The proof is a weighted (geometric-measure) counting argument of ten lines.
2. **Theorem 2 (proved):** the constant is sharp: **ln H(K) / √K → 2π.** The lower bound is an explicit construction
   whose exponent is a Riemann sum of ∫₀^∞ [ln(1+1/s²) + ln(1+s²)/s²] ds = 2π.
3. **Theorem 3 (Lean-verified, kernel-checked):** in a semi-complete digraph, |P∖S|·|S∖P| ≤ cut(P) + cut(S) for all
   vertex sets P, S. This is the digraph half of Mission 027's Theorem A, now machine-checked.
4. **Consequence (conditional on the still-unformalized injection step of 027's Theorem A):** a semi-complete digraph
   with an ordering of width ≤ c has at most (n+1)·e^{2π√(c+k)} k-cuts, which gives explicit constants
   2^{O(√k)} → exp(2π√(2k))·n^{O(1)} for cutwidth and the analogous bound for OLA.
5. **Refuted conjecture:** "every prefix of a segment-swap local optimum has weak cut ≤ λ(A)" is **false**. Random
   search (983 local optima, n ≤ 7) found nothing; an explicit family found by reasoning about the exchange proof breaks
   it at n = 15, and the gap grows quadratically (width p² vs λ ≤ 6p + 1).

**Classification (deliberately not inflated):**
- Theorems 1–2: **Complete candidate proof awaiting independent review.** They are a modest combinatorial result. The
  method (entropy/geometric-measure counting of lattice paths under a curve) is classical, so the asymptotic constant
  2π may already follow from known general results; novelty is **not** confirmed.
- Theorem 3: **Established theorem with machine-checked proof** (Lean 4 kernel), but it is an elementary lemma, not a
  discovery, and novelty is not claimed.
- Corollaries for cutwidth/OLA: inherit the status of 027's Theorem A — **complete candidate proof awaiting
  independent review**; they are not independently verified.
- Local-optima statement: **Refuted conjecture.**

There is no "breakthrough" here. The honest summary: one published-problem-adjacent constant made sharp, one lemma
formalized, one plausible conjecture killed.

---

## 1. Seven ranked opportunities

Score = significance × tractability (each 1–5). "Ours" means a WESTFALL technique (cut counting, exchange arguments,
partition DP, exact certificates, Lean pipeline) plausibly applies.

| Rank | Opportunity | Strongest published result | Exact gap | Conditional lower bound | Theorem worth attempting | Why our techniques help | Most likely obstruction | Decisive experiment / lemma | Resolved already? | Score |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Sharp count of k-cuts in semi-complete digraphs** (layout; follows the Fomin–Pilipczuk question) | 2^{O(√(k log k))} cut bound (Fomin–Pilipczuk 2013); candidate 2^{O(√k)} in our 027 | Explicit, sharp exponent constant; machine-checked proof | 2^{o(√k)} impossible for cutwidth under ETH (Barbero–Paul–Pilipczuk) | ln H(K) ~ 2π√K; formal proof of the hyperbola lemma | Partition-counting is our core tool | Constant could be hard; may be classical | Exact H(K) to K ≈ 10⁶; Lean lemma | Constant: not found in the literature I searched | 3×5 = **15** |
| 2 | Linear (Turing) kernel for cutwidth of semi-complete digraphs | Quadratic kernel (Barbero–Paul–Pilipczuk 2017) | Linear vs quadratic | none known | O(k) kernel | Cut-lattice structure | Kernel lower bounds are subtle | Find instances where every reduction rule stalls | Open as of their paper | 3×2 = 6 |
| 3 | DFVS in 2^{O(k)}·poly(n) | 2^{O(k log k)} (Chen et al. 2008); 2^{O(k)} only for restricted classes | log factor in exponent | none matching | single-exponential DFVS | Ordering view of DFVS = linear-ordering prefixes | Iterative compression inherently k! | none cheap | Long-standing open | 5×1 = 5 |
| 4 | Remove log factors in k-cut bounds for digraphs of bounded independence number | 2^{O(√(k log k))}-type bounds via Fomin–Pilipczuk style (Misra et al. 2018) | log factor | ETH √k | hyperbola argument for α-bounded digraphs | Same partition method | Non-arc graph can be complete bipartite → the pair-covering step fails | find α = 2 digraph whose cuts violate the hyperbola | Checked: direct transfer fails | 3×2 = 6 |
| 5 | Cutwidth of general graphs in 2^{O(k²)}·n | 2^{O(k² log k)}·n (Giannopoulou et al. 2016) | log k in exponent | none tight | remove the log | Counting of "typical sequences" | Different structure (no semi-completeness) | none cheap | Open | 4×1 = 4 |
| 6 | Feedback arc set / linear ordering in O*(c^n), c < 2 | O*(2ⁿ) DP (classical) | any c < 2 | none | sub-2ⁿ exact FAS | Exact cut DP | decades-old; no handle | none cheap | Open | 5×1 = 5 |
| 7 | Do prefixes of **local** optima obey the global width bound ω ≤ λ(A)? (our engine) | proved for global optima (Lean, Mission 022/025) | local vs global | — | width(local opt) ≤ C·λ(A) | Exchange proof | exchange uses global stable sort | enumerate local optima; reason about the proof | — | 3×3 = 9 |

Also screened and set aside: integer programming / proof-complexity questions (e.g. size of cutting-plane proofs for
the linear-ordering polytope) — significant, but I saw no handle in our toolset; rank aggregation (Kemeny) is the same
problem as #6/#7 for our purposes.

**Selection.** #1 and #7 were pursued. #1 was chosen for tractability *and* because the 027 result left an explicit
gap (an unproved "limit near 6.3"). #7 was chosen because it is the one item that would change the practical engine.
I did not pick #1 merely for proximity: #2–#6 were each probed for a concrete first lemma, and none produced one.

**Selected problem and source.** Fomin & Pilipczuk (ESA 2013, arXiv 1301.7314) ask whether the number of k-cuts of a
semi-complete digraph of cutwidth ≤ k is 2^{O(√k)}·n^{O(1)}; Barbero, Paul & Pilipczuk (arXiv 1706.00617) note that the
known algorithms are ETH-optimal only up to a √(log k) factor. Mission 027 proposed a 2^{O(√k)} answer reducing it to
the counting function H(K). This mission determines H(K) up to 1 + o(1) in the exponent.

## 2. Definitions

𝓗(K) = partitions λ₁ ≥ λ₂ ≥ … ≥ 0 with i·λ_i ≤ K for every i ≥ 1 (empty partition included); H(K) = |𝓗(K)|.
Exact values (two independent implementations agree for K < 26):
H(0..15) = 1, 2, 5, 10, 26, 42, 118, 171, 389, 692, 1442, 1854, 5534, 6895, 11910, 21116.

## 3. Theorem 1 (upper bound)

**Theorem 1.** For all K ≥ 1, **H(K) ≤ exp(2π√K).**

*Proof.* For λ ∈ 𝓗(K) put d_i = λ_i − λ_{i+1} ≥ 0 (i = 1, …, K); note λ_{K+1} = 0 since (K+1)λ_{K+1} ≤ K, and λ is
determined by d. Fix δ_i ∈ (0, 1) and let P be the product of geometric laws on ℕ^K: P(d) = Π_i (1−δ_i) δ_i^{d_i}.
P is a probability measure, so for any finite set 𝓓 ⊆ ℕ^K, |𝓓| ≤ max_{d∈𝓓} 1/P(d). With w_i = −ln δ_i,

  ln(1/P(d)) = Σ_i −ln(1−δ_i) + Σ_i w_i d_i.

Take δ_i = K/(K+i²), i.e. w_i = ln(1 + i²/K) (increasing, w₀ := 0) and −ln(1−δ_i) = ln(1 + K/i²).
Abel summation: Σ_i w_i d_i = Σ_i w_i(λ_i − λ_{i+1}) = Σ_i (w_i − w_{i−1}) λ_i ≤ K Σ_i (w_i − w_{i−1})/i, because
w_i − w_{i−1} ≥ 0 and λ_i ≤ K/i. Now

- Σ_{i≥1} ln(1 + K/i²) ≤ ∫₀^∞ ln(1 + K/x²) dx = π√K (the integrand decreases);
- (w_i − w_{i−1})/i = (1/i)∫_{i−1}^{i} 2x/(K+x²) dx ≤ ∫_{i−1}^{i} 2/(K+x²) dx (since x ≤ i), so
  K Σ_i (w_i − w_{i−1})/i ≤ K ∫₀^∞ 2/(K+x²) dx = π√K.

Hence ln H(K) ≤ 2π√K. ∎

This replaces 027's Theorem B (H(K) ≤ exp(13.71√K + 37)): the constant drops from 13.71 to 6.283 and the additive 37
disappears.

## 4. Theorem 2 (the constant 2π is sharp)

**Theorem 2.** ln H(K)/√K → 2π as K → ∞.

*Proof of the lower bound.* Fix 0 < α < β and N ≥ 1, ρ = (β/α)^{1/N}, s_j = αρ^j. For large K put
x_j = ⌊s_j√K⌋ (j = 0, …, N+1; strictly increasing for large K) and y_j = ⌊K/x_{j+1}⌋. Build λ by: λ_i = y₀ for
i ≤ x₀; for i ∈ (x_j, x_{j+1}] (j = 0, …, N−1), choose λ_i non-increasing with values in [y_{j+1}, y_j]; λ_i = 0
afterwards.

- *Membership:* for i ∈ (x_j, x_{j+1}], i·λ_i ≤ x_{j+1}·y_j ≤ K; also for i ≤ x₀. Monotone across blocks since block
  j's values are ≥ y_{j+1} ≥ block (j+1)'s values. Distinct choices give distinct partitions.
- *Count:* block j contributes C(Δx_j + Δy_j, Δx_j) with Δx_j = x_{j+1} − x_j, Δy_j = y_j − y_{j+1}.
- *Asymptotics:* Δx_j/√K → a_j = s_j(ρ−1), Δy_j/√K → b_j = (ρ−1)/(s_jρ²), and ln C(a+b, a) = (a+b)·h(a/(a+b)) −
  O(log(a+b)) with h the binary entropy (nats). So liminf ln H(K)/√K ≥ R(α, β, N) := Σ_j (a_j+b_j) h(a_j/(a_j+b_j)).
- As ρ → 1, (a_j + b_j) h(·) = Δs_j (1 + 1/s_j²) h(s_j²/(1+s_j²)) + o(Δs_j), and
  (1 + 1/s²) h(s²/(1+s²)) = ln(1 + 1/s²) + ln(1 + s²)/s². So R → ∫_α^β [ln(1+1/s²) + ln(1+s²)/s²] ds, and letting
  α → 0, β → ∞ gives ∫₀^∞ ln(1+1/s²) ds + ∫₀^∞ ln(1+s²)/s² ds = π + π = 2π.

With Theorem 1, lim ln H(K)/√K = 2π. ∎

Numerics (`hyper.py`, exact big integers): the construction is verified to produce distinct members of 𝓗(K) in 315
small cases; R(α, β, N) = 4.2505, 5.9020, 6.2280, 6.2760, 6.2829 for increasingly fine parameters (2π = 6.28319);
ln H(K)/√K = 3.93, 5.01, 5.64, 5.96, 6.13 at K = 10², 10³, 10⁴, 10⁵, 10⁶ — increasing towards 2π, with the deficit
2π√K − ln H(K) growing like K^{≈0.2} (o(√K), as Theorem 2 requires). Theorem 1 was checked exactly-numerically for
K = 1..3000 (max ln H / (2π√K) = 0.853).

**Remarks.** (i) The heuristic picture: the extremal "shape" of a random element of 𝓗(K) is the hyperbola itself;
each axis contributes π√K. (ii) Floating-point is used only for logarithms in the checks, never in the proofs.
(iii) Prior art: this is a standard entropy/large-deviation computation for monotone lattice paths under a curve. I
found no source stating the constant for this particular region, but I would not be surprised if it is known or an
easy exercise in that literature; treat novelty as unconfirmed.

## 5. Theorem 3 (Lean-verified hyperbola inequality for digraphs)

File `lean/Westfall022/HyperbolaCut.lean` (namespace `Westfall028`), imported by `lean/Westfall022.lean`:

```lean
theorem card_sdiff_mul_card_sdiff_le (adj : V → V → Prop) [DecidableRel adj]
    (hsc : SemiComplete adj) (P S : Finset V) :
    (P \ S).card * (S \ P).card ≤ cut adj P + cut adj S

theorem kcut_hyperbola (adj : Fin n → Fin n → Prop) [DecidableRel adj] (hsc : SemiComplete adj)
    (c k : ℕ) (hwidth : ∀ t, cut adj (pre t) ≤ c) (S : Finset (Fin n)) (hS : cut adj S ≤ k) (t : ℕ) :
    (univ.filter (fun v : Fin n => v.val < t ∧ v ∉ S)).card *
      (univ.filter (fun v : Fin n => t ≤ v.val ∧ v ∈ S)).card ≤ c + k
```

Axioms: `propext, Classical.choice, Quot.sound` only; no `sorry`, `admit`, `native_decide`, or new axioms. Checked
locally with Lean 4.32.0 / Mathlib v4.32.0, and in CI: GitHub Actions run 43447279818 (Lean Foundations, success; built
`Westfall022.HyperbolaCut` with the axiom audit). Existing formal proofs on other branches were not
touched.

Taking t = (position of the i-th non-member u_i) + 1 in `kcut_hyperbola`, the first factor is i and the second is
s_i, so it yields exactly 027's inequality i·s_i ≤ c + k.

**Not formalized (exact statements that would need it):**
(F1) *Injection:* S ↦ (a, (s_i)_i) is injective from k-cuts into {0..n} × 𝓗(c+k), where a = #members of S before the
first non-member and s_i = #members of S after the i-th non-member.
(F2) *Theorem 1:* H(K) ≤ exp(2π√K) (needs real analysis: ∫ ln(1+K/x²) and arctan integrals; feasible in Mathlib but
lengthy). A cheaper formal target: H(K) ≤ e^{c√K} with a crude c via a purely discrete argument.
(F3) *Algorithmic corollaries* (cutwidth/OLA DPs with caps), as in Mission 025's cost-model style.

## 6. Consequences (conditional on F1, i.e. on 027's Theorem A, which is a candidate proof)

- #k-cuts of a semi-complete digraph with an ordering of width ≤ c: ≤ (n+1)·e^{2π√(c+k)}.
- Cutwidth ≤ k decided in O(n⁴ · e^{2π√(2k)}) bit operations, i.e. 2^{12.82√k}·n⁴ (027 had e^{13.71√(2k)+37}).
- OLA ≤ k: same with 2k replaced by 2w(k), w(k) = O(k^{2/3}).
- **Limit of the method:** Theorem 2 shows that the hyperbola-counting route cannot give a better constant than
  2π√(c+k). For a transitive tournament the true count is about exp(π√(2k/3)) (ordinary partitions), so the exact
  extremal constant for k-cut counts is somewhere in [π√(2/3), 2π] per √(k) at c = 0 — an open, well-posed question.

## 7. Refuted conjecture: local optima are not narrow

**Conjecture (from Mission 027's opportunity list).** Every prefix of every segment-swap local optimum π (no
exchange of two adjacent contiguous segments improves F) has weak cut ≤ λ(A).

**Random search** (`local_optima.py`, seed 28001; `local_optima2.py`, seed 28002, planted near-transitive n = 7):
265 instances, 983 local optima (167 non-global), **0 violations**, minimum slack 1. A reader who stopped here would
have called it a "computational conjecture".

**Counterexample family** (`local_optima_counterexample.py`). Vertices a₁..a_p, b, c, d₁..d_q; with H = p+q+1,
G = max(p,q)·H: a_i→a_j and d_i→d_j (i < j) and b→c of weight H; a_i→b and c→d_j of weight 1; a_i→c and b→d_j of weight
G; d_j→a_i of weight H. The ordering a, b, c, d is a segment-swap local optimum (checked over all O(n³) adjacent segment
pairs, exactly) whose prefix {a, b} has weak cut ≥ p·q, while the singleton-block ordering b, d, a, c has K₀ = p+q,
so λ(A) ≤ 1 + 3(p+q). Exact results: violation from (p, q) = (6, 7), n = 15 (width 42 > 40); (40, 40): width 1600 vs
λ ≤ 241. The fast local-optimality test was cross-checked against the definitional one on 300 random instances. Why the
small search missed it: the effect needs p·q > 3(p+q)+1, i.e. n ≥ 15.

**Implication for the engine:** local search (segment swaps) cannot be certified by the cut-lattice width bound; any
"warm start → bounded-width DP" pipeline must use a *global* argument (as the Lean proof does), or check widths
explicitly.

## 8. Independent counterexample searches and audits performed

- Theorem 1: exact H(K) vs bound for K ≤ 3000 (0 violations); second implementation of H for K < 26.
- Theorem 2: construction membership/distinctness verified exhaustively in 315 small cases; count ≤ H(K) for
  K = 10³…10⁶; Riemann sums computed independently of H.
- Theorem 3: kernel-checked.
- Asymptotics audited: the o(√K) term in Theorem 2 is not quantified (stated as a limit only). Theorem 1 is
  non-asymptotic. Arithmetic vs bit complexity: the algorithmic corollaries count bit operations on O(n)-bit sets.
- Edge cases: K = 0 (H = 1), λ_{K+1} = 0, empty partition, floors in the construction (x_j strictly increasing only for
  large K; the code returns 0 when degenerate).
- Second proof attempt for Theorem 1: the band argument of 027 gives an independent (weaker) proof of H = 2^{O(√K)}; the
  variational heuristic gives the same constant 2π as Theorem 2 by a different route.

## 9. Reproduction

```
cd research/discovery-028
python3 hyper.py                       # Theorems 1–2 checks -> hyper_results.json   (~5 min)
python3 local_optima.py                # random search, seed 28001 -> local_optima_results.json
python3 local_optima2.py               # n = 7 search, seed 28002 -> local_optima2_results.json
python3 local_optima_counterexample.py # refutation -> local_optima_counterexample.json
cd ../../lean && lake build            # Theorem 3 (Westfall022.HyperbolaCut)
```

## 10. Most important next step toward independent acceptance

Send a two-page note — 027's Theorem A (with the Lean-checked inequality) plus Theorems 1–2 — to a researcher in
parameterized algorithms on tournaments (the authors of the cited papers are the natural readers), asking (a) whether
the 2^{O(√k)} k-cut bound is already known, and (b) whether the 2π constant is known. In parallel, formalize F1 (the
injection), which is the only remaining informal step of the cutwidth corollary.

## Sources

- F. V. Fomin, M. Pilipczuk, "Subexponential parameterized algorithm for computing the cutwidth of a semi-complete
  digraph", ESA 2013 — arXiv:1301.7314.
- F. Barbero, C. Paul, M. Pilipczuk, "Exploring the complexity of layout parameters in tournaments and semi-complete
  digraphs", arXiv:1706.00617.
- P. Misra et al., FSTTCS 2018 (digraphs of bounded independence number).
- M. Bonamy et al., arXiv:1707.01470 (DFVS context).
- A. Giannopoulou et al., arXiv:1606.05975 (cutwidth of general graphs).
- S. Melczer, G. Panova, R. Pemantle, "Counting partitions inside a rectangle", arXiv:1805.08375 (related asymptotic
  partition counting; does not treat the hyperbola).
