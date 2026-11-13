# F. External referee briefing (one page)

**Question (Fomin–Pilipczuk, ESA 2013, §5).** Is the number of k-cuts of an n-vertex semicomplete digraph of cutwidth
≤ k bounded by 2^{O(√k)}·n^{O(1)}? A yes removes the √(log k) factor from their cutwidth and OLA algorithms.

**Claimed answer: yes.** If a semicomplete digraph has an ordering of width ≤ c, it has at most (n+1)·H(c+k) k-cuts,
where H(K) counts partitions whose Ferrers diagram fits under xy ≤ K; and H(K) ≤ e^{2π√K}. So cutwidth ≤ k implies
≤ (n+1)e^{2π√(2k)} k-cuts.

**Proof idea (half a page).** Along the reference ordering, a cut X is a binary word. For every prefix P, the pairs
(non-member in P, member outside P) each carry an arc in some direction, charged either to the k-cut or to the
reference ordering's width at P. So every inscribed rectangle of the word's Ferrers diagram has area ≤ c + k. FP
bounded the *area* instead (≤ k log k by their tight Lemma 8) and counted partitions of that area; counting diagrams
under the hyperbola gives e^{O(√k)} directly. The estimate for H uses a weighted generating-function bound and Euler's
product for sinh.

**Consequences.** Cutwidth ≤ k of semicomplete digraphs in 2^{O(√k)}·n^{O(1)} time (explicitly O(H(2k)·k·n⁴));
OLA cost ≤ k in 2^{O(k^{1/3})}·n^{O(1)}. Both match the ETH lower bounds of Barbero–Paul–Pilipczuk (Thm 14) up to the
constant in the exponent.

**Evidence.**
* Complete human-readable proofs (MANUSCRIPT.md).
* Theorem 1 is formalized in Lean 4/Mathlib, using only the standard axioms.
* Exhaustive checks on all semicomplete digraphs with ≤ 5 vertices and all 6-vertex tournaments; 94,666 digraphs and
  12.8 M lemma instances, with 0 violations.
* A prototype algorithm agrees with an exact solver on 300 instances.

**What we ask the referee to check.**
1. Whether this answer is already known (thesis, survey, folklore).
2. Lemma 2 and the use of a prefix just before the first qualifying vertex.
3. Theorem 2's analytic estimate.
4. That FP's enumeration plus the stopping rule gives Theorem 3 (and Lemma 4 gives Theorem 4).

**Honest assessment of significance.** The result is a short, clean answer to a precise, explicitly posed 13-year-old
question. It makes two subexponential layout algorithms tight under ETH. The method is elementary. It is a solid
note-length result (e.g. for an algorithms conference short track or a journal note), **not a broad new theory**. The
partition-counting estimate itself is likely classical in some form.

**Not claimed.**
* Any improvement for FAST.
* Practical speed-ups.
* Results for digraphs of bounded independence number.
* Independent human review — none has taken place yet.
