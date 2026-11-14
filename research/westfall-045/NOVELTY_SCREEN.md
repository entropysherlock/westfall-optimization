# Mission 045 — prior-art and significance screen (2026-11-13)

**Verdict: favorable but incomplete novelty evidence. Do NOT claim a fully cleared historical first.**

Primary-source comparisons consulted:

1. Fomin & Pilipczuk, ESA 2013, arXiv:1301.7314, https://arxiv.org/abs/1301.7314. The abstract states directed cutwidth on semicomplete digraphs in 2^{O(√(k log k))} poly(n), OLA 2^{O(k^{1/3} √log k)} poly(n). Their discussion explicitly asked whether the √log k loss could be removed. Mission 040's hyperbola-profile method targets that question.
2. Fomin & Pilipczuk, JCTB 2019, https://fedorvf.github.io/articles/2019/2019d.pdf , contains the established semicomplete framework. The Mission 040 manuscript contrasts its area-bound partition count with the sharper rectangle-constraint count.
3. Misra, Saurabh, Sharma & Zehavi, Algorithmica 85 (2023), complete open-access paper https://pmc.ncbi.nlm.nih.gov/articles/PMC10287808/ . Their Theorem 1.2 for bounded independence α states directed cutwidth time 2^{O(α²√k log(αk))}n^{O(α)}, and Theorem 1.3 states OLA time 2^{O(α² k^{1/3} log(αk))}n^{O(α)}. They explicitly use polynomial-delay enumeration of k-cuts (Lemma 4.1), but do not state WESTFALL's sharper 2^{O(√k+h)} poly(n) or 2^{O(k^{1/3}+h)} poly(n) bounds. Their α=1 covers tournaments, so compare exact mathematical bounds, not just graph classes.
4. Kitsunai, Kobayashi & Tamaki, ESA 2015, https://arxiv.org/abs/1507.01934 , is primarily directed pathwidth on h-semicomplete digraphs. No full-text cut-count bound matching WESTFALL was identified.
5. Gomes, Lopes & Mnich, arXiv:2610.41840v1 (Oct 30, 2026), https://arxiv.org/abs/2610.41840 , is *directed pathwidth*, k-triples and disjoint paths on h-semicomplete digraphs. It should not be cited as having solved a cutwidth or OLA bound.
6. Barbero, Paul & Pilipczuk, ICALP 2017 / TALG 2018, https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ICALP.2017.70, shows under ETH no 2^{o(√k)} poly(n) semicomplete-cutwidth algorithm and no 2^{o(k^{1/3})} poly(n) semicomplete OLA algorithm. The claimed WESTFALL k exponents attain these lower-bound *orders* for fixed h. This does not give an ETH lower bound in h.

Search this audit included 2024–2026 semicomplete/near-semicomplete cutwidth, OLA, k-cut enumeration, hyperbola partitions and graph layout terms. No competing post-2019 source removing the logarithmic loss was found in the screened search results. An absence of identified sources is NOT a proof of novelty; literature coverage of theses, nonindexed preprints, parallel submissions and recent revisions is incomplete.

## Classification
- Rigorous and kernel-checked: combinatorial sharp cut-counting theorem.
- Paper-level rigorous derivation: algorithmic 2^{O(√k+h)}poly(n) CW and 2^{O(k^{1/3}+h)}poly(n) OLA.
- Unsettled: historical priority, independent referee confirmation, full algorithm formalization, global Level-4 impact.

**Provisional recommendation:** a potentially significant publication-quality new theorem and worst-case algorithmic improvement; request independent review by domain specialists and complete novelty check before public 'first solution' or 'Level 4' claims.
