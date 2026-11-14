# WESTFALL Mission 046: the bounded-independence barrier

**Status: LEMMA ONLY.** These results are under review. Nothing here is published on the website.

**What is proved:**
- **Pivot Lemma.** Across a disagreement rectangle with more than b(P)+b(X) vertices on one side, the other side
  lies in the non-neighbourhood of a single vertex, so its independence number drops by one.
- **Core Decomposition (α ≤ 2).** Every k-cut of a digraph with α ≤ 2 is exactly encoded by:
  - 6 positions or vertices;
  - its traces on two semicomplete sets;
  - its trace on a core of at most 2(c+k) vertices.

  This gives N_k ≤ (n+1)^8·H(c+k)²·f_2(c,k).
- **Self-reduction.** "2^{O(√k)}·n^{O(1)} k-cuts / cutwidth on α ≤ 2" is equivalent to the same statement on
  instances with O(c+k) vertices.

**What is open:** Conjecture W, that f_2(c,k) ≤ e^{O(√(c+k))}.

See REPORT.md for parts A–G: literature verdict, statements, proofs, counterexample report, algorithmic consequence,
reproducibility and classification.

**Reproduce:** run `python3 tests/exp2_decoder.py`, `tests/exp2b_forward.py`, `tests/exp3_core.py` and
`tests/exp1_growth.py`. The last one takes about 15 minutes.
