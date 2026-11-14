# Mission 041 — Experiments

All code is in `tests/`; outputs are in `data/`. These experiments are refutation attempts and sanity checks. They are
**not** part of any proof: the proofs are in PROOF.md and in Lean.

## 1. Adversarial / exhaustive search: `hunt041.py`

**Output.** `data/hunt041_full.json` (sha256 d8e5c982…6721), with log `data/hunt041_full.log`. Wall time was 55 min.

### Checks per digraph

For each digraph, with reference orderings that are optimal plus random, and for every k from 0 to ctw+2:

| Check | What is verified |
|---|---|
| L1 | defect rectangle ab ≤ back P + back X + h·min(a,b), and the exact form with the actual non-adjacent count, for (P, X) pairs. All 4ⁿ pairs for n ≤ 4, all pairs for 1 in 50 of the n = 5 digraphs, sampled otherwise. |
| L2 | both shifted inequalities for every k-cut and every s |
| L3 | the encoding (\|X\|, λ_1..λ_h, ν) decodes back to μ, and is injective on the k-cuts |
| T1 | N_k ≤ (n+1)·R_h(K)·H(K) |
| T2 | N_k ≤ (n+1)^{2h+1}·H(K), Conjecture 041-A |
| T0 | the h = 0 bound (n+1)·H(K); failures are expected for h ≥ 1 |

### Families

| Family | Digraphs | max n | max h | max ctw |
|---|---|---|---|---|
| all digraphs, n = 1..4 (every arc pattern, 4 states per pair) | 4,165 | 4 | 3 | 4 |
| all digraphs n = 5, h ≤ 2 exhaustive, plus a 2% sample of h ≥ 3 | 838,972 | 5 | 4 | 6 |
| random bounded-defect | 238 | 11 | 3 | 16 |
| transitive minus matching | 238 | 11 | 1 | 3 |
| transitive minus star | 238 | 11 | 3 | 0 |
| independent blocks (Theorem L) | 24 | 12 | 4 | 0 |
| cyclic minus matching | 6 | 11 | 2 | 10 |
| bidirected minus pairs | 6 | 11 | 2 | 20 |

### Totals

- **Digraphs:** 843,887. By h: h=0: 59,820; h=1: 297,403; h=2: 482,010; h=3: 4,240; h=4: 414.
- **Checks:** 3,389,005,892 rectangle checks; 1,011,837,854 shift checks; 190,504,438 injectivity checks;
  10,096,162 bound checks.
- **Violations of L1, L2, L3, T1 or T2: 0.**
- **h=0 bound failures: 21,206.** These are expected, and the smallest is the arcless digraph on 2 vertices.
- **Tightness:** max N_k / bound is 1.0 for both T1 and T2, with equality on trivial cases.

### Lower-bound family (ctw = 0, K = 0)

| h | n | N_0 | new bound (n+1)R_h(0) | conjecture (n+1)^{2h+1} |
|---|---|---|---|---|
| 1 | 12 | 19 | 26 | 2,197 |
| 2 | 12 | 29 | 78 | 371,293 |
| 3 | 12 | 46 | 260 | 62,748,517 |
| 4 | 12 | 66 | 910 | 10,604,499,373 |

Every value matches N_0 = 1 + Σ_blocks (2^{|B|} − 1) exactly. The new bound is within a factor 2^h·poly(h) of these
counts. The conjecture's bound overshoots by orders of magnitude.

## 2. Algorithm: `algo041.py`

**Output.** `data/algo041_results.json` (sha256 ca5565ed…).

- **Correctness.** 400 random h-semicomplete digraphs with n ≤ 11 and h ≤ 3. There were 0 mismatches against the
  exact subset DP: in ctw, in the returned ordering's width, and in enumerated against brute-force counts for
  k ∈ {ctw−1, ctw, ctw+1}. The stopping threshold fired 0 times on an instance with ctw ≤ k.
- **Benchmark.** 16 instances with n ∈ {16, 24, 32, 48} and h ∈ {0..3}, all solved. Each returned ordering's width
  was re-verified independently. For n = 16, the result was cross-checked with the subset DP.

## 3. Degenerate defect: `degenerate041.py` (Theorem D)

**Output.** `data/degenerate041.json` (sha256 6e60c1e4…).

- **Instances.** 1,500 digraphs with n ≤ 10 and a d-degenerate non-adjacency graph, d ≤ 3. One in five are "hub"
  instances, whose non-adjacency max degree is n−d, outside every h-semicomplete class with h < n−d.
- **Checks.** 3,257,448 rectangle checks (R), 1,652,298 shifted checks (S) and 6,119 bound checks (N), with 0
  violations.

## 4. Absorbing the defect into H's argument (COUNTEREXAMPLES.md §2)

The arcless digraph on 27 vertices refutes N_k ≤ (n+1)·H(K+h). Exact values:
- H(26) = 4,167,602;
- 28·H(26) = 116,692,856 < 2²⁷ = 134,217,728.

## Hashes

| File | sha256 |
|---|---|
| tests/hunt041.py | b64da3e6…bfe |
| tests/defect_lib.py | 3524fc02…0e3 |
| tests/algo041.py | d0379114…a43 |
| tests/degenerate041.py | 91af5872…75c |
| data/hunt041_full.json | d8e5c982…721 |
| data/hunt041_quick.json | 43c9283f…ba |
| data/algo041_results.json | ca5565ed…18f |
| data/degenerate041.json | 6e60c1e4…886 |
| lean/Westfall041/DefectCount.lean | see lean/BUILD_LOG.txt |
