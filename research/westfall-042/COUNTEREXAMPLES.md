# Mission 042: boundaries and counterexamples

1. Bounded independence alone is insufficient for an n-exponent independent of alpha in *number of k-cuts*: alpha disjoint transitive tournaments, no arcs between components, have width 0 and (m+1)^alpha zero-cuts. This is a concrete obstruction to f(alpha)n^C bound with constant C for arbitrarily large alpha. It does NOT preclude a different nonenumerative algorithm.

2. Arcless graph on n vertices: n=27, width=0, 2^27 zero-cuts. The Mission 041 report shows that the proposed absorption N_k <= (n+1)H(k+Ch) fails as a uniform statement in C via growing n; use an appropriate n-dependent family for 'every fixed C', not merely one example at h=26.

3. A missing-pair vertex cover bound must never be reinterpreted as a bound from h-semicompleteness alone. A matching of arbitrary size in the nonadjacency graph has h=1 but vertex cover b grows with n.

No new counterexample to the machine-checked Mission 040/041 counting statements was found in this audit.
