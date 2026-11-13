# Mission 042: next highest-value theorem

The previously identified h log(k+h) barrier is now resolved at the level of a paper proof: R_h(K) <= binomial(2h,h) H(K). This yields the target 2^{O(sqrt(k)+h)} poly(n) CW algorithm and 2^{O(k^(1/3)+h)} poly(n) OLA algorithm, conditional on Mission 041 and Mission 040's analytic bound.

**Immediate target for formal verification:** In Lean 4.32.0 and pinned Mathlib, define nu_i=(lambda_i-h)_+ and tau_i=min(lambda_i,h), prove both are antitone, prove i nu_i <=K, prove lambda_i=nu_i+tau_i, inject into Hset(K) × {partitions in h×h box}, and establish cardinal bound R_h(K)<=choose(2h,h)*H(K). Formalize binomial(2h,h)<=4^h and plug into card_kcuts_le_defect. This is a self-contained mathematical task with a very high chance of success and no large experiment needed.

Next: verify the exponential H(K) estimate rigorously (preferably formal), audit the algorithm and its actual time bound, and get independent expert review. A larger Level-4 outcome depends on confirmed novelty, broad applicability, and acceptance of the algorithmic interpretation—not merely this short inequality.
