# C. Proof audit — objections, attempted counterexamples, resolutions

The draft in PR #10 (`research/kcuts-2026/PROOF_NOTE.md`) was re-derived from first principles, without relying on
its stated status, and then re-proved in a different encoding (column lengths μ_s instead of row lengths λ_i) for
the Lean formalization. Every item below was checked by hand **and** where possible by machine.

## 1. The twelve audit questions of the mission brief

| # | Question | Resolution |
|---|---|---|
| 1 | Is the word → partition map injective? | Yes. With rows: the i-th one from the right sits at position λ_i + (a − i), so (a, λ) determines the word. With columns (Lean): Lemma 3, proved via the least element of the symmetric difference. Kernel-checked (`eq_of_mu_eq`). Also checked by `decode(encode(X)) == X` on 12.8 M (digraph, ordering, X) triples. |
| 2 | Is the number of X-vertices needed? | Yes, |X| = a must be recorded: λ = 0 is shared by X = ∅ and by X = a final segment of any size. The factor n + 1 pays for it. |
| 3 | Is λ monotone? | Yes: the i-th one from the right has at least as many zeros before it as the (i+1)-th. Columns: μ_s is antitone in s (`mu_antitone`). |
| 4 | Does i·λ_i ≤ c + k always hold? | Yes (Lemma 1 + Lemma 2). Kernel-checked (`rectangle`, `hyperbola`); 12.8 M machine checks with optimal *and random* reference orderings. |
| 5 | Are all arcs charged correctly? | Each rectangle pair (y, x) is charged to one arc between y and x; distinct pairs give distinct arcs; arcs y→x lie in back(X), arcs x→y in back(prefix). No arc is charged twice and no pair is left uncharged (semicompleteness). |
| 6 | Do antiparallel arcs complicate it? | No: a pair carrying both arcs is charged once, to either arc; the inequality only needs ≥ 1 arc per pair. Exhaustive tests include all 3^{C(n,2)} semicomplete digraphs for n ≤ 5 (antiparallel pairs included) and complete bidirected digraphs. |
| 7 | Is the direction convention the literature's? | ESA 2013 counts arcs from suffix to prefix and k-cuts by arcs Y → X — exactly ours. JCTB 2019 counts forward arcs; reversing the ordering and swapping (X, Y) shows ctw and N_k are convention-independent. Machine check C2 (mixed conventions) found 0 discrepancies, as predicted. |
| 8 | k = 0, c = 0? | H(0) = 1, so N_0 ≤ n + 1 when c = 0: attained by every transitive tournament (its 0-cuts are exactly the n + 1 prefixes). Holds in all tests; it is the equality case reported by the hunt (`max_ratio = 1.0`). |
| 9 | Arbitrary reference orderings? | The proof uses only that σ has width ≤ c. The Lean statement quantifies over every finite linear order (`WidthLe` over all lower sets), so every ordering is covered. Tests used optimal and random orderings with their own widths. |
| 10 | Degenerate cases | Empty X, X = V, n ≤ 1, μ_s = 0, s > K: all handled explicitly in Lemmas 2–3 (and in Lean). For n = 0 the only cut is X = ∅ and the bound is (0+1)·H(c+k) ≥ 1. |
| 11 | Is H(K) ≤ e^{2π√K} rigorous? | Yes (Theorem 2): summation by parts, an integral comparison (w′(x)/x = 2/(K+x²) is positive and 1/i ≤ 1/x on (i−1, i]), and Euler's product for sinh. Each step re-derived. Checked numerically in log-space for K ≤ 2000 and K ∈ {5000, 10000, 20000}: max log H / (2π√K) = 0.9166. **Not** formalized in Lean. |
| 12 | Does a state bound give an algorithm? | Only with enumeration whose cost is proportional to the number of states, and a stopping rule. Both are supplied (polynomial-delay enumeration by min-cut pruning; stop at (n+1)H(2k)) — Theorem 3, with correctness for NO instances from Corollary 1. Counting ≠ finding: the bound is used only to *stop*. |

## 2. Objections a referee could raise, and answers

* **"This is just Fomin–Pilipczuk's Lemma 8/9."** Their Lemma 9 proves the same per-cut bound on bad pairs, then Lemma 8
  converts it to a total of ≤ 2k(1 + ln 2k) and counts *partitions of that area* (p(k log k) = 2^{Θ(√(k log k))}).
  Lemma 8 is tight, so the area really can be Θ(k log k). The new point: one must not pass to the area at all — the
  per-cut condition says every inscribed rectangle of the Ferrers diagram has area ≤ 2k, and diagrams under the
  hyperbola number only e^{O(√k)} although their areas reach k log k. This is the step FP describe (§5) as unclear.
* **"H(K) might be large."** Theorem 2 bounds it; exact values (H(100) ≈ 1.1·10¹⁷ = e^{39.3}, 2π√100 = 62.8) are
  far below the bound.
* **"The FP algorithm needs bounds for subdigraphs / prefixes."** It does not: FP's enumeration has polynomial delay
  and stops on the total count of k-cuts of the input digraph; our Theorem 3 re-derives the enumeration.
* **"Does semicompleteness of D suffice when k-cuts are taken in a subdigraph?"** Not needed: all cuts are of D itself.
* **"Is the ordering produced really of width ≤ k?"** Every node on the BFS path is a k-cut and consecutive nodes
  differ by one vertex, so every prefix of the produced ordering has back ≤ k. The prototype re-checks each returned
  ordering independently.

## 3. Counterexample hunt (`tests/hunt.py`, full mode; `data/hunt_full.json`)

| Family | Digraphs | Notes |
|---|---|---|
| All labelled semicomplete digraphs, n ≤ 5 (3^{C(n,2)}, antiparallel pairs included) | 59,049 for n = 5; 760 for n ≤ 4 | exhaustive |
| All labelled tournaments, n = 6 | 32,768 | exhaustive |
| Random semicomplete, n = 6–12, bidirected-pair rate 0–0.6 | 1,036 | ctw up to 25 |
| Near-transitive with reversed and bidirected pairs, n = 6–12 | 1,036 | tight-cutwidth regime |
| Cyclic (regular) tournaments, n = 6–12 | 7 | highly symmetric |
| Complete bidirected digraphs, n = 6–12 | 7 | every pair antiparallel; ctw up to 36 |
| Paley tournaments, p = 3, 7, 11 | 3 | highly symmetric |
| **Total** | **94,666** | **689,191 theorem checks, 12,778,946 lemma checks, 0 violations** |

For each digraph: exact ctw by subset DP (independent of the encoding), N_k by enumerating all 2^n bipartitions for
every k ≤ max back, H by DP (verified against brute force for K ≤ 24), the sharper per-size bound
Σ_a #(hyperbola partitions in an a × (n−a) box), the rectangle lemma and injectivity for the optimal ordering and for
1–3 random orderings. Additional checks: forward (JCTB) convention — 0 violations; mixed conventions — 0 discrepancies
(as proved in MANUSCRIPT §1); **non-semicomplete digraphs violate the bound** (the arcless digraph on 2 vertices has
4 0-cuts > 3), confirming that semicompleteness is necessary.

Tightness: the ratio N_k / ((n+1)H(c+k)) reaches 1 (k = c = 0, transitive tournaments), and the per-size box bound is
attained by the transitive tournament on 4 vertices at k = 0.

## 4. Dependencies

Theorem 1: elementary counting only (Lean: Mathlib `Finset.card_le_card_of_injOn`, `card_product`, `min'`).
Theorem 2: summation by parts, a Riemann-sum comparison, ∫₀^∞ dx/(K+x²) = π/(2√K), Euler's product
sinh(πz)/(πz) = Π(1 + z²/i²). Theorems 3–4: max-flow/min-cut duality (unit capacities), BFS, FP's framework, and
(Theorem 4) the elementary Lemma 4. Lower-bound comparisons: Barbero–Paul–Pilipczuk Theorem 14 (ETH).

## 5. Algorithm prototype (`tests/algo.py`; `data/algo_results.json`)

* Correctness: 300 random instances (n ≤ 11, random semicomplete and near-transitive with bidirected pairs): computed
  minimum cutwidth = subset-DP cutwidth, returned ordering width = cutwidth, and the enumerated k-cut count = brute-force
  count for k ∈ {ctw − 1, ctw}: **0 mismatches**.
* Beyond the subset DP (n = 30–60, near-transitive, ctw 2–8): orderings found and their widths re-verified independently.
  Python prototype: 0.4 s – 50 s.
* Stopping thresholds (natural log, per (n+1)): new log H(2k) vs FP 2C√(k(1+ln 2k)) (without FP's constant A):
  k = 1: 1.6 vs 6.7; k = 10: 12.6 vs 32.4; k = 100: 61.0 vs 128.8; k = 500: 158.5 vs 322.6.
* **No practical speed-up is claimed.** On every instance tested the true number of k-cuts (37 – 2,001) was far below both
  thresholds, so the stopping rule never fired; on these inputs the new theorem changes the worst-case guarantee only.
  The subset DP is faster for n ≤ 16 here; the k-cut method wins once 2^n is out of reach.
