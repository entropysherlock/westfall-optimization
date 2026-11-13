# Mission 042: h dependence

The Mission 041 bound R_h(K) <= binomial(K+2h,h) directly implies h log(K+h), which may be loose. Its necessity for h-semicomplete digraphs is not established. The independent-block family forces 2^{Omega(h)} cuts at K=0, but does not establish Omega(h log k) for positive k or a decision-algorithm ETH lower bound.

One should NOT claim a general 2^{O(sqrt(k)+h)} bound from available evidence. The stronger bound is open in this audit.

A different structural parameter b—the vertex cover number of the non-adjacency graph—admits the proved counting bound 2^b (n-b+1) H(c+k). Its runtime 2^{O(b+sqrt(k))} poly(n) removes the h log k term on this narrower, orthogonal class; this is not an improvement of R_h for all h-semicomplete graphs.

Proposed next attack: maximize R_h(K) or its realizable k-cut analogue with exact Ferrers-profile enumeration and derive a matching lower bound rather than conflating formal profile counts with realizable graph cuts.
