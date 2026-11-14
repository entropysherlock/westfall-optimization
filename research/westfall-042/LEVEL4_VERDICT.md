# Mission 042: evidence-based provisional verdict (updated)

**B — SIGNIFICANT CANDIDATE RESULT, NOT YET LEVEL 4.**

## Established within this audit
1. Located and examined Nagamochi 2012 full author-hosted paper. Its relevant complexity is XP-style n^{O(k)} for generic directed linear layouts, not WESTFALL's proposed subexponential FPT bound.
2. Independently reviewed Fomin–Pilipczuk published 2019 bound as 2^{O(sqrt(k log k))} n^2 cutwidth and 2^{O(k^(1/3) sqrt(log k))} n^2 OLA.
3. **NEW:** A short complete paper proof shows R_h(K) <= binomial(2h,h) H(K) <= 4^h H(K). Combined with Mission 041's reported Lean-checked counting theorem and Mission 040's paper analytic H bound, the h-semicomplete algorithms improve to CW 2^{O(sqrt(k)+h)} poly(n) and OLA 2^{O(k^(1/3)+h)} poly(n). This resolves the specific h log k upper-bound gap. Independently tested all 180 parameter pairs h<=8,K<=19 with zero violations; finite tests are not the proof.
4. Another short complete paper proof gives N_k <= 2^b(n-b+1)H(c+k) for distance-b deletion to semicomplete (nonadjacency vertex cover b), plus corresponding FPT algorithms; exhaustive 4096 digraphs n=4, five k values each, no violations.

## Not established
The new theorems are NOT Lean checked; the full algorithms and asymptotic H estimate are NOT Lean formalized. No full independent pinned Lean rebuild performed. No exhaustive post-2019 novelty determination or human refereeing. The improved h bound is a simple combinatorial decomposition and may be previously known in another language; avoid claiming a fully original research breakthrough without checking.

## Next decision
Formalize R_h <= binomial(2h,h)*H in Lean, independently validate the H estimate and the executable polynomial-delay enumeration, check published literature deeply, and get an expert review. Keep PRs draft and the production Studio unchanged.
