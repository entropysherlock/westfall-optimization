# WESTFALL 042: sharpened profile counting and new algorithmic consequences
**Research manuscript addendum — 2026-11-13. Status: paper proof; not machine checked, not peer reviewed.**

## Theorem (sharper profile count)
Let K,h be nonnegative integers. Define H(K) to be the number of weakly decreasing finite sequences `nu_i` of nonnegative integers satisfying `i*nu_i <= K`, and define R_h(K) as in Mission 041: weakly decreasing h-tuples `lambda_1 >= ... >= lambda_h >= 0` satisfying `i*(lambda_i-h)_+ <= K`. Then

```
R_h(K) <= binomial(2h,h) H(K) <= 4^h H(K).
```

**Proof.** For an admissible lambda define `nu_i = max(lambda_i-h,0)` and `tau_i = min(lambda_i,h)`. Both sequences are nonincreasing, and `lambda_i = nu_i + tau_i`. By the defining inequalities, nu, extended by zeros after index h, is an H(K)-admissible partition. Tau is a partition contained in an h by h box. By the standard north-east lattice-path bijection, there are exactly binomial(2h,h) such box partitions. Since lambda is recovered by coordinatewise addition, the map lambda -> (nu,tau) is injective. The binomial coefficient is <= 4^h because it is one summand in the binomial expansion of (1+1)^(2h). QED.

## Consequence for cut counts
Mission 041's counting theorem (reported Lean-kernel checked) asserts

```
N_k(D) <= (n+1) R_h(c+k) H(c+k)
```

for an h-semicomplete digraph D of n vertices with reference width <=c. Substituting gives

```
N_k(D) <= (n+1) binomial(2h,h) H(c+k)^2
       <= (n+1) 4^h exp(4*pi*sqrt(c+k)).
```

The exponential inequality uses Mission 040's paper analytic bound for H and remains **not formally proved in Lean**.

## Algorithmic consequence (conditional on the enumeration analysis)
For cutwidth decision at parameter k, a yes-instance has c<=k, hence a k-cut bound `(n+1)*4^h*exp(4*pi*sqrt(2k))`. Thresholded min-cut-pruned enumeration plus reachability in the DAG of k-cuts leads to

```
Cutwidth: 2^{O(sqrt(k)+h)} n^{O(1)}.
```

For directed OLA cost <=k, the width of any optimal candidate is O(k^(2/3)), giving

```
OLA: 2^{O(k^(1/3)+h)} n^{O(1)}.
```

These improve the h log(k+h) factor in the original Mission 041 complexity claim. The reduction from counting to algorithms is paper-level, not a Lean-certified executable proof.

## Open limits
The dependence 2^{Omega(h)} is necessary for **enumerating all k-cuts** at K=0 by the independent-block construction in Mission 041. This does not imply a matching ETH lower bound for the *decision* algorithms.

The novelty of this simple splitting argument has not been cleared against the full literature; Level 4 is NOT claimed.
