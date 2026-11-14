# Referee briefing — Mission 041

**Claim.** Let D be a digraph where each vertex has at most h non-neighbours, with a vertex ordering of width ≤ c.
Then D has at most

  (n+1) · min{R_h(c+k), (n+1)^h} · H(c+k)

k-cuts. Here H is the number of partitions under the hyperbola xy ≤ K, and R_h(K) ≤ C(K+2h, h). Consequence:
directed cutwidth on such digraphs runs in 2^{O(√k + h log(k+h))}·n⁴.

**Five-minute check.**

1. **Defect rectangle lemma** (PROOF.md §1). Pairs across the rectangle (P∖X) × (X∖P) are of three kinds:
   - forward arcs, counted by back(X);
   - backward arcs, counted by back(P);
   - non-adjacent pairs, at most h per row and per column.
2. **Shifting** (§2). Use the first member with s zeros before it to get a(b−h) ≤ K and b(a−h) ≤ K. These give two
   facts about the Ferrers diagram:
   - above row h, it lies under a hyperbola;
   - beyond column K+h, it is empty.
3. **Encoding** (§3). Record three things:
   - the size |X|;
   - the first h row lengths;
   - the residual partition above row h.

   Injectivity reduces to two cases: columns of height ≤ h are read from the rows, and taller columns from the
   residual.

**Where to look for errors.**
- **The shift step uses natural-number subtraction.** The Lean statement is exactly s·(μ_s − h) ≤ K with truncated
  subtraction.
- **The R_h constraint i·(λ_i − h) ≤ K.** It uses the second inequality μ_s·(s − h) ≤ K at s = λ_i, where
  μ_{λ_i} ≥ i by the row criterion.
- **The algorithm's stopping rule.** It needs a reference ordering of width ≤ k, which an optimal ordering provides
  when ctw ≤ k.

**Machine check.** Run `lake build Westfall041` and then `lake env lean Audit041.lean`. The only axioms reported
should be `propext`, `Classical.choice` and `Quot.sound`.

**Novelty questions for the referee.**
1. Does Nagamochi (ISAAC 2012), applied as Kitsunai–Kobayashi–Tamaki (ESA 2015) suggest, already give cutwidth on
   h-semicomplete digraphs in subexponential-in-k time?
2. Is the defect rectangle lemma folklore?
3. Is the h·log(k+h) term in the exponent necessary?

**What is not claimed.**
- Nothing about bounded independence number beyond the obstruction in Theorem F.
- No formal proofs of the asymptotic bounds or of the algorithms.
- No claim that 2^{Ω(h)} is necessary for *deciding* cutwidth. It is shown necessary only for k-cut *enumeration*.
