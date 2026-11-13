# Mission 042: independent algorithm derivation audit

Assumptions: finite loopless simple digraph, antiparallel pairs permitted, unit arcs; back(X) counts arcs entering X. Mission 040/041 counting theorems are taken as conditional inputs; this file does not rebuild Lean.

## Exact k-cut enumeration
For a partial binary assignment (A fixed inside X, B fixed outside X), finding min back(X) over A subset X subset V\B is a directed minimum cut with sources B and sinks A. Enumerate feasible partial assignments depth-first; a feasible parent has at least one feasible child, so each branch has an output. Between leaves, depth-first search traverses O(n) steps and each child feasibility test uses one cut calculation. Truncating flow at k+1 yields an O((k+1)n^2)-type oracle with elementary unit-capacity augmenting paths on dense graphs. Thus a polynomial-delay enumeration can halt after threshold T+1 cuts.

## Correct stopping threshold
If there is an ordering with width <= k, take it as reference with c<=k. Mission 041 Theorem C then says N_k <= (n+1) min{R_h(2k),(n+1)^h} H(2k). Consequently outputting >T cuts certifies NO. Otherwise list all cuts and construct edges X->X union {v}. A path from empty to V is equivalent to a width <=k ordering. No false NO is introduced by the counting threshold *if* the counting theorem is correct.

## OLA
Let total backward-arc length <= k. For a width-w cut, at most d crossing ordered pairs have length exactly d. The minimum total length of w distinct crossing arcs is Omega(w^(3/2)), hence every prefix width is O(k^(2/3)). Enumerate W-cuts at W=O(k^(2/3)); a minimum-sum path in the inclusion DAG minimizes sum of back(prefix). Hence conditional runtime 2^{O(k^(1/3)+h log(k+h))} n^{O(1)}.

## Complexity qualification
The written O(R_h(2k) H(2k) k n^4) is appropriate under the claimed oracle model and counting theorem, up to polynomial factors for bit-set hashing and big-integer threshold computation. The factor k requires careful interpretation at k=0 (write k+1). The algorithm is FPT in k+h, and for fixed h its k-exponent is O(sqrt(k)). Claims are conditional on the unformalized analytic bound H(K) <= exp(2pi sqrt(K)), R_h(K) inequality, and a full executable algorithm audit. The 400 small prototype checks do NOT formally certify time complexity.

## New conditional consequence
If S is a size-b vertex cover of the non-adjacency graph, the new counting theorem in GENERALIZATION.md yields k-cut enumeration algorithms for directed cutwidth in 2^{O(b+sqrt(k))} poly(n), and OLA in 2^{O(b+k^(1/3))} poly(n). Vertex cover S can be found in O(2^b poly(n)) by branching on uncovered nonadjacency edges. These consequences are mathematically derived, not Lean checked or independently benchmarked.

## To verify before publication
Audit actual min-cut implementation, bit-set storage, integer-overflow boundaries and all NO cases; produce machine-checked algorithm semantics or independently implemented executable audit. No claim of complete formal algorithm verification.
