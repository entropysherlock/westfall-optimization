# Mission 042: a deletion-distance extension of the semicomplete counting theorem

## New theorem (paper proof; NOT Lean verified; novelty unconfirmed)
Let D=(V,A) be a loopless directed graph on n vertices, antiparallel pairs allowed. Let S subset V, |S|=b, such that the induced subdigraph D[V\S] is semicomplete. Equivalently, S is a vertex cover in the undirected graph whose edges are the nonadjacent unordered pairs of D.

Suppose D has a reference ordering of directed cutwidth at most c, counting back(X) as arcs from V\X into X. Then for all k>=0,

    N_k(D) <= 2^b (n-b+1) H(c+k).

Here H is Mission 040's hyperbola partition counting function.

## Complete proof
Write U=V\S. For every k-cut X in D, record Y=X∩S and Z=X∩U. There are at most 2^b possibilities for Y. Every arc of D[U] from U\Z into Z is also an arc of D from V\X into X, so back_{D[U]}(Z) <= back_D(X) <= k. Restrict the reference order of D to U; for every prefix P_U of the restricted order, there is an original prefix P of D such that P∩U=P_U. Every entering arc of D[U] across P_U is an entering arc across P in D. Thus restricted order has width <= c. D[U] is semicomplete, so Mission 040 gives at most (|U|+1)H(c+k) choices for Z. Each X uniquely equals Y union Z. Multiplying yields the claim. QED.

There is no need to bound arcs incident with S; deleting arcs can only decrease the entering-cut quantity relevant to restriction.

## Corollaries (conditional on Mission 040 analytic bound)
If ctw(D)<=k, then N_k(D) <= 2^b (n-b+1)H(2k). Thresholded enumeration of k-cuts with min-cut pruning and reachability over the k-cut inclusion DAG gives cutwidth decision and an ordering in 2^{O(b+sqrt(k))} poly(n). An OLA solution of cost<=k has width O(k^(2/3)), giving OLA decision in 2^{O(b+k^(1/3))} poly(n). The parameter b can be found with standard FPT vertex-cover branching in the nonadjacency graph: choose an uncovered missing pair (u,v), branch on deleting u or v. This uses 2^{O(b)} poly(n) time.

If the non-adjacency graph has maximum matching size m, endpoints of a maximal matching form a vertex cover of size <=2m. Thus a computable bound N_k <= 4^m (n+1)H(c+k) follows. This is an additional tractable class, not a statement about general bounded-independence graphs.

## Independent finite check
An independent Python exhaustive verification enumerated all 4^6=4,096 arc patterns on four labeled vertices (each pair: none, forward, backward, both) and all k in {0,1,2,3,4}, computing exact directed cutwidth, minimum vertex-cover size b of the nonadjacency graph, and exact N_k. All 20,480 comparisons satisfied the theorem. This is a sanity check, not proof.

## Cautions
This theorem is a straightforward reduction from Mission 040; do not label it Level 4 or independently novel without a literature screen. It does NOT prove the general h-semicomplete bound can be improved to 2^{O(h+sqrt(k))}, because bounded missing-pair vertex cover is a stronger and incomparable hypothesis to bounded maximum non-neighbor degree. Definitions, encoding, and the algorithmic corollaries remain to be formalized.
