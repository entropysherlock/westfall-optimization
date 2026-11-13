# Mission 042: independent literature audit (2026-11-13)

## Nagamochi 2012: primary full text obtained and checked
Primary author-hosted technical report: https://www.amp.i.kyoto-u.ac.jp/tecrep/ps_file/2012/2012-004.pdf

Theorem 1 gives a generic submodular-layout search tree with n^(2 Delta(k)+2) oracle calls; its section 4.1 derives O(k m n^(2(k-lambda+1))) for directed edge-cut layouts (lambda is the minimum nontrivial directed cut). This is an XP-type upper bound, NOT the claimed 2^{O(sqrt(k)+h log(k+h))} n^4. The label of its Theorem 4 says 'pathwidth' but the preceding subsection explicitly defines f=d_G^+ and costCW, and the following sentence applies to costMLA; use the actual mathematical definitions, not the inconsistent label. Nagamochi therefore does not independently supersede the WESTFALL parameterized bound. This is a *specific* novelty risk resolved, not a universal search for all competing algorithms.

## Strongest directly checked published comparison
Fomin–Pilipczuk, JCTB 138 (2019), full text https://fedorvf.github.io/articles/2019/2019d.pdf, Theorem 5.20 and discussion: directed cutwidth on semicomplete digraphs in 2^{O(sqrt(k log k))} n^2; OLA in 2^{O(k^(1/3) sqrt(log k))} n^2. Their 2013 ESA paper is at https://arxiv.org/abs/1301.7314 . Check the actual formulation of open question in that version before claiming to have 'resolved' it.

Kitsunai–Kobayashi–Tamaki (2015) gives h-semicomplete pathwidth algorithm of (h+2k+1)^{2k} n^{O(1)}; its reference to Nagamochi does not exhibit the WESTFALL runtime. https://arxiv.org/abs/1507.01934

Misra–Saurabh–Sharma–Zehavi (Algorithmica 2023): bounded independence number algorithms with n^{O(alpha)}; see https://pmc.ncbi.nlm.nih.gov/articles/PMC10287808/ . Independence-number results cover h-semicomplete instances but with different parameter dependence.

Barbero–Paul–Pilipczuk (ICALP 2017), https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ICALP.2017.70 , supplies ETH lower-bound background.

## Outstanding
Literature coverage is NOT exhaustive, particularly later research, theses, independent refinements, and the new deletion-distance theorem proposed here. An undirected Cutwidth parameterized by vertex cover result (Cygan et al., Algorithmica, https://link.springer.com/article/10.1007/s00453-012-9707-6) is not the same parameter as vertex cover of the NON-ADJACENCY graph of a directed input. Do not conflate them. Novelty is provisional; no expert review.
