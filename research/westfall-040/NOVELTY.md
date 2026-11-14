# B. Novelty comparison (literature through 2026-11-13)

**Verdict: NEW (provisional).** No published or preprint result found states a 2^{O(√k)}·n^{O(1)} bound on the
number of k-cuts of semicomplete digraphs of cutwidth ≤ k, or a 2^{O(√k)}·n^{O(1)} cutwidth algorithm, or a
2^{O(k^{1/3})}·n^{O(1)} OLA algorithm for semicomplete digraphs. Both ingredients of the proof are, however, already in
Fomin–Pilipczuk: the Ferrers-diagram encoding of k-cuts (their Lemma 5) and the per-cut bound on "bad pairs" (the
hypothesis of their Lemma 8, established in Lemma 9). The new step is to count Ferrers diagrams under the hyperbola
defined by that per-cut bound, instead of bounding their total area (which is genuinely Θ(k log k), their Lemma 8 being
tight) and counting partitions of the area. The search was not exhaustive (no access to every thesis, workshop paper or
non-indexed preprint); an expert should confirm before any priority claim.

## What each source proves (exact statements)

| Source | Cutwidth / k-cut convention | Antiparallel arcs | Strongest relevant bound |
|---|---|---|---|
| Fomin–Pilipczuk, ESA 2013 (arXiv:1301.7314) | width = max # arcs from suffix to prefix (Def. 2); k-cut (X,Y): ≤ k arcs Y→X (Def. 4) | allowed (simple digraphs) | Lemma 5: transitive tournament has ≤ A·e^{C√k}(n+1) k-cuts, C = π√(2/3). Cor. 7: FAS ≤ k ⇒ ≤ A·e^{C√(2k)}(n+1) k-cuts. Lemma 8: per-cut ≤ k bad pairs ⇒ ≤ k(1+ln k) in total. Cor. 10: ctw ≤ k ⇒ ≤ A·e^{2C√(k(1+ln 2k))}(n+1) k-cuts. Thm 14: cutwidth in 2^{O(√(k log k))}·n^{O(1)}. Thm 15: OLA in 2^{O(k^{1/3}√log k)}·n^{O(1)}. §5: **open problem** — is the number of k-cuts 2^{O(√k)}·n^{O(1)}? |
| Fomin–Pilipczuk, JCTB 138 (2019) 78–165 | width counts *forward* arcs (Def. 2.7); k-cut: ≤ k arcs X→Y (Def. 5.5) | allowed | Cor. 5.16: A·exp(C√(2k(1+ln 2k)))·(n+1). Thm 5.20: 2^{O(√(k log k))}·n². §11 (p. 161): the √log k factor is attributed to pipelining Lemma 5.11 with Lemma 5.14; whether the combination is optimal is "not clear". |
| Pilipczuk, STACS 2013 (arXiv:1210.5363) | backward | allowed | Thm 20: cutwidth in 2^{O(k)}·n²; O(n²) approximation (Thm 19). |
| Barbero–Paul–Pilipczuk, ICALP 2017 / TALG 2018 (arXiv:1706.00617) | feedback arcs (tail after head) | allowed | Thm 14 (ETH): cutwidth not in 2^{o(n)} nor 2^{o(√k)}·n^{O(1)}; OLA not in 2^{o(n)} nor 2^{o(k^{1/3})}·n^{O(1)}. Describes the known algorithms as essentially optimal; still cites 2^{O(√(k log k))}·n². Polynomial-time cutwidth for tournaments. |
| Misra–Saurabh–Sharma–Zehavi, FSTTCS 2018 / Algorithmica 2023 | backward (k-cut: arcs from R to L) | n/a (bounded independence number α) | Directed cutwidth on D_α in 2^{O(α²√k log(αk))}·n^{O(α)}; states that Fomin–Pilipczuk are optimal under ETH "up to √log k". |
| Feige 2009; Karpinski–Schudy 2010; Fomin–Pilipczuk 2013 | — | — | FAS in tournaments: 2^{O(√k)}·n^{O(1)} (not cutwidth). |
| This work | backward (ESA 2013) — convention-independent, see MANUSCRIPT §1 | allowed | Thm 1: ctw ≤ c ⇒ N_k ≤ (n+1)H(c+k); Thm 2: H(K) ≤ e^{2π√K}; Thm 3: cutwidth in O(H(2k)·k n⁴) = 2^{O(√k)}·n^{O(1)}; Thm 4: OLA in 2^{O(k^{1/3})}·n^{O(1)}. |

## Comparison by task

| Task (semicomplete digraphs) | Before | This work | ETH lower bound |
|---|---|---|---|
| Count k-cuts, ctw ≤ k | 2^{O(√(k log k))}·n (FP Cor. 10) | (n+1)·e^{2π√(2k)} | 2^{Ω(√k)}·n (transitive tournaments) |
| Enumerate k-cuts | polynomial delay (FP Lemma 3) | same, with the smaller count | — |
| Decide ctw ≤ k, construct ordering | 2^{O(√(k log k))}·n² (FP Thm 14 / JCTB Thm 5.20) | 2^{O(√k)}·n⁴ (Thm 3) | 2^{o(√k)}·n^{O(1)} impossible (BPP Thm 14) |
| Compute ctw | as above, k = ctw | 2^{O(√ctw)}·n^{O(1)} | same |
| OLA ≤ k | 2^{O(k^{1/3}√log k)}·n^{O(1)} (FP Thm 15) | 2^{O(k^{1/3})}·n^{O(1)} (Thm 4) | 2^{o(k^{1/3})}·n^{O(1)} impossible (BPP Thm 14) |
| Tournaments, cutwidth | polynomial (BPP: sort by degree) | no change | — |
| FAS in tournaments (parameter: FAS size) | 2^{O(√k)}·n^{O(1)} | no change (no claim) | — |
| General digraphs | NP-hard even for k = 0 style cut problems; W-hardness results | no claim (theorem false without semicompleteness) | — |

The algorithms are explicit (a stopping threshold and a DAG search), not existential. The n-dependence (n⁴ here
versus n² in FP) was not optimized; a kernel or the FP construction of the DAG should restore n².

## Searches performed

arXiv/Google-indexed searches (2026-11-13) for: the FP open problem; "cutwidth semi-complete 2^{O(√k)}"; "k-cuts
semi-complete √k"; tournament cutwidth 2020–2026; hyperbola/Durfee-rectangle partition counting. Read in full or in
the relevant sections: arXiv:1301.7314, the JCTB 2019 PDF (folk.uib.no), arXiv:1706.00617 (HTML), the FSTTCS 2018
abstract and the Algorithmica 2023 version (via Springer/PubMed text). No later answer to the FP question was found;
the JCTB (2019) and Misra et al. (2018/2023) texts still describe the √log k gap as unresolved.

**Partition-theoretic side.** H(K) (partitions under a hyperbola, equivalently with every inscribed rectangle of area
≤ K) is a natural object; an e^{O(√K)} bound may well be classical. Our proof of Theorem 2 is self-contained, and no
novelty is claimed for Theorem 2 itself. The draft PR #11 programme on the exact asymptotics of log H(K) (Airy
correction) is a separate, unproved conjecture and is not used.
