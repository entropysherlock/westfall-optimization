# Mission 042: independent algorithm derivation audit

This is a conditional mathematical audit of the counting-to-algorithm transformation, not a verified implementation.

## Counting / enumeration

For a partial assignment (A inside X, B outside X), deciding whether there is a k-cut X extending it is an s-t minimum cut with source B, sink A, unit arc capacities. Feasible-prefix branching has polynomial delay (depth n, two feasibility checks per node); k+1 augmenting paths suffice to decide whether the minimum is <=k.

If ctw(D)<=k, take a width<=k reference ordering. By Mission 041 Theorem C and the improved Mission 042 inequality:

    N_k(D) <= (n+1) R_h(2k) H(2k)
           <= (n+1) binomial(2h,h) H(2k)^2
           <= (n+1) 4^h exp(4*pi*sqrt(2k)).

Stop enumerating after more than this threshold: then D cannot have cutwidth<=k. Otherwise enumerate all k-cuts, form the inclusion DAG X -> X union {v}, and search empty -> V. A path gives exactly an ordering with all prefix back-values <=k. The flow-pruned enumeration and DAG traversal have time polynomial in n and k per enumerated cut. A safe target complexity is 2^{O(sqrt(k)+h)} n^{O(1)}; the originally reported O((k+1) n^4 times the counting factor) requires implementation-level accounting.

## OLA

Every backward arc crossing a fixed cut has a distinct (length, position) pair; at most d crossing arcs have length d. Thus total backward-arc length >= Omega(w^(3/2)) where w is any prefix width. Therefore any OLA solution of cost<=k has cutwidth <= W=O(k^(2/3)). Enumerate W-cuts with threshold derived from the same 041+042 counting bound at 2W, and find a minimum-weight path in the W-cut DAG with vertex weight back(X). Conditional runtime:

    2^{O(k^(1/3)+h)} n^{O(1)}.

## Independent alternative parameter

GENERALIZATION.md proves if deleting b vertices leaves a semicomplete digraph, N_k <= 2^b(n-b+1)H(c+k), giving CW 2^{O(b+sqrt(k))} poly(n) and OLA 2^{O(b+k^(1/3))} poly(n). These are separate structural parameterizations.

## Verification qualification

The h improvement is a self-contained PAPER proof recorded in H_DEPENDENCE.md, not machine-verified. The k-cut counting theorem is reported Lean checked in Mission 041. The analytic estimate H(K)<=exp(2*pi*sqrt(K)) and algorithms are not machine-checked. No independent clean Lean rebuild, full algorithm verification, or expert novelty signoff was completed in this audit.
