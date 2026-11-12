# Exact certificates

A certificate records: the instance scaled to integers (A·D with D a power of two, exact for IEEE doubles), the claimed optimal order and its integer value L, the block structure and bound tables, and every excluded DP state S together with the integers f(S), r(S), U(V∖S).

The verifier (`certificates/verify_exact.py`, and the browser port `website/src/lib/verify.ts`) checks with exact integers:
1. the scaled matrix is skew-symmetric; when an input instance is supplied, it scales exactly to the certificate's matrix (**binding**);
2. the order is a permutation and its value equals L;
3. every triangle-packing entry is a genuine directed 3-cycle, respects arc capacities, and (in hybrid mode) is transversal to the blocks; block β-tables are recomputed from the instance;
4. the layered DP is replayed: each layer's candidates are generated from the previous layer's kept states, every kept state has a kept parent, and every excluded candidate is justified by f(S)+r(S)+U(V∖S) < L;
5. the kept DAG reaches V, its best value equals the claimed optimum, and the claimed optimum is not below the incumbent threshold — so no ordering better than the claim was discarded.

Any mismatch raises `Reject` → `CERTIFICATE_REJECTED`.

**Scope.** This re-checks one computation with trusted, small code. It relies on the correctness of the admissibility argument in the manuscript and of the verifier code itself. It is **not** a machine-checked proof in Lean, Coq or Isabelle.
