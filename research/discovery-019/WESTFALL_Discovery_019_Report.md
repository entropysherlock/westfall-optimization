# WESTFALL Discovery 019 — Final Report

Prepared for Caleb Westfall · 12 November 2026. Companion files:
- `PAPER_provisional_v2.md` (I)
- `westfall019_code.zip` (code, logs, tables)

**Verdict.** The square-root target is **proved in its stronger form**: poly(n)·2^{O(b+√K)}. It is **tight**: 2^{Θ(b+√K)}. The margin requirement is removed (zero-weight extension), and that extension comes with a matching necessity result. Certificates are now **exact** and tamper-tested. Benchmarks are reported out-of-sample, losses included.

On the evidence available this is the program's **first credible Level 3 candidate**. It is still **provisional**: originality has been checked against the closest literature, but not by a specialist, and the proof technique is elementary.

---

## A. Strongest theorem

**Hypotheses:**
- A is any real skew-symmetric n×n matrix.
- 𝓑 = (B_1, …, B_m) is any ordered partition, with b = max_i |B_i|.
- The quantities:
  - X is the reversed cross weight, Σ_{i<j} Σ_{u∈B_i, v∈B_j} max(−a_uv, 0);
  - μ₊ is the minimum *nonzero* cross |a|;
  - z is the number of zero-weight cross pairs;
  - L is the score of a real incumbent, and δ = (OPT − L)/2.
- K = ⌊(δ + 3X)/μ₊⌋ + z (with K = z if every cross weight is zero).

**Conclusion.** Exclusion DP with the hybrid hereditary bound (exact block tables plus a transversal triangle packing):
- retains only prefix sets with at most K cross-block inversions;
- generates at most n(n+1)·P(2K + b²) states;
- outputs OPT, an optimal permutation, every certified precedence relation, and an exact certificate;
- runs in poly(n)·2^{O(b + √K)} time, including segmentation, block tables, LPs and certificate generation.

**Combinatorial core (Theorem A).** |{S : I_𝓑(S) ≤ K}| ≤ (n+1)·P(2K + b²), which is tight up to poly(n) and constants in the exponent (Theorem B).

**Necessity (Theorem C).** Some instances have z zero-weight pairs, X = 0 and δ = 0, and still force 2^{⌊√(2z)⌋} retained states.

## B. Proof

Full proofs are in the manuscript, Section 5. The key new lemma:

**Lemma 1: Σ_k a_k·x_k ≤ b² + I.** Here a_k and x_k are the absent and present counts of block k.
1. Let t_k = min(a_k, x_k). The cross-inversion count dominates Σ_{k<l} t_k·t_l.
2. So (Σt)² ≤ (b/2)·Σt + 2I, which gives Σt ≤ b/2 + √(2I).
3. Then Σ a_k x_k ≤ b·Σt ≤ b² + I, by AM–GM.

**Consequence.** A set's ordinary inversion number, in any order that lists the blocks consecutively, is at most 2I + b². The bijection between binary words and Young diagrams then bounds the count by (n+1)·P(2K + b²).

**Algorithmic theorem.** It combines this count with Discovery 018's localization argument. Step (d) is re-proved to separate zero-weight, reversed and positive inverted pairs.

## C. Counterexample and falsification log

| Attempt | Outcome |
|---|---|
| Brief's target 2^{O(b+√(Kb))} | **Proved directly**, but exact asymptotics showed it **loose**: (log₂|𝒮_K| − b)/√K ≈ 3.0–3.3 at K = 256 for every b from 1 to 32. |
| Hypothesis "one partial block + few misplaced vertices" (Discovery 018 counting) | **Valid but wasteful.** Multiple half-full blocks give 2^{Ω(√K)} configurations, which the (2Kb+1)^K count over-counts. |
| Brief's obstruction "several partially selected consecutive blocks" | **Real.** It is exactly the extremal family of Theorem B, and Lemma 1 handles it. |
| Exhaustive search for violations of Theorem A | **None.** 7,192 checks (232 partitions, n ≤ 16, blocks ≤ 4, K ≤ 30). The exact DP counter matched brute force on all 185 partitions in phase 1. |
| Large-n exact counts (n up to 608) | Bound holds; exponent within 1.4–2.3× of the truth. |
| Solver-level theorem incl. zero weights | 80 runs, 0 violations of I(S) ≤ K (max I − K = −3), 0 violations of the state bound. The first attempt was killed by a slow (O(M³)) partition-sum routine, not a mathematical failure; it was fixed and rerun. |
| Removing μ > 0 with no extra term | **Impossible.** All-zero singleton instances force 2^n states, which is the necessity half of Theorem C. |
| Certificate tampering | All invalid tampers rejected. One genuine gap: a certificate remained valid for a consistently altered matrix. **Fixed** by binding certificates to the input. |
| PBD (Theorem 3) audit | The decomposition is exact (weights sum to 1; pure pairs need no weight). "Every optimum" requires strict margins; margins ≥ 0 give only "at least one optimum". The code's tolerance makes the claim numerical. Its failures on cyclic blocks are correct, because Proposition 3.1 shows the claimed structure is false there. **No strengthening was found**: a stronger certificate must change its conclusion, not its weights. |
| Portfolio | Two engineering defects found and fixed: an n > 62 overflow, and the slow partition sums. |

## D. Novelty comparison

**Karpinski–Schudy (closest).**
- *Their method:* DP over position windows around an approximate ranking. Valid sets are at most n·2^ψ with ψ = O(√OPT). Weights satisfy w_uv + w_vu = 1, and OPT is the total backward weight. They prove O*(2^{O(√OPT)}) and an ETH lower bound.
- *What they do not give:* any bound whose exponent excludes frustration inside blocks.
- *Separation:* on m Paley-like blocks of size b with K inconsistent cross pairs, their guarantee is 2^{O(b√m + √K)}; ours is 2^{O(b + √K)}. This is a separation of guarantees, not a measured comparison: no implementation of their method was run.

**Feige:** unweighted, same OPT parameter.

**Condorcet partitions (Truchon; Phung–Hamel 2025):** exact only when X = z = 0, which is our K = 0 case and not claimed.

**Akbari–Escobedo (ACP):** gives approximation factors only, with no exact result and no state or running-time bound in terms of block size or violating pairs.

**Stein–Andres:** local pair fixing.

**State-space relaxation / Morin–Marsten:** the general paradigm only.

**Counting lemma:** the bijection between binary words and Young diagrams in an s × (n−s) box is classical; the block extension via Lemma 1 was not found in the sources checked.

**What remains as the contribution:**
1. Lemma 1 and the tight block-inversion count.
2. Its combination with the hybrid hereditary bound, giving an *exact, certificate-producing* algorithm with exponent b + √K.
3. The zero-weight extension and its necessity.

**Uncertain:** whether a block- or module-relative parameterization of weighted FAST already exists in the parameterized-complexity literature. About 15 targeted searches did not find one.

## E. Working exact algorithm

`westfall019_code.zip`, run with `python3 runone.py '<json cfg>' blx2`.

| Component | Role |
|---|---|
| `hybrid.py` | Bound; Theorem A–C parameters (`block_params2`) |
| `sldp.py` | Exclusion DP and pair certification |
| `features.py` | Portfolio features |
| `runone.py` | BLX 2.0 routing and baselines |

The baselines SLDP and BLX 1.0 are preserved unchanged.

## F. Exact certificate verifier

**Files:** `make_cert.py` (producer) and `verify_exact.py` (independent integer-arithmetic verifier).

**Tamper results:** 5 instances × 8 tamper types (`test_exact.py`). Every invalid certificate was rejected, plus the instance-binding test.

**Verification time:** 0.0–33 s for up to 2,659 kept states and 35,470 exclusions.

**Limitation:** multi-million-state certificates need a compiled verifier.

## G. Benchmarks

The full tables are in the manuscript, Section 8, and in `test19_table.md`.

**Out-of-sample:**
- BLX 2.0's time is within 2× of the best single solver on every instance (median 1.23×).
- It is the fastest or near-fastest on Family C with small K: 3.6–8× faster than packing SLDP.
- It routes LOLIB IO to MILP, turning BLX 1.0's 22 s (and timeouts) into 0.3–1.8 s.
- It reports UNRESOLVED on n = 150 xLOLIB instances. The MILP also failed there within 60 s.

**Losses:**
- Family C with q = 0.05 and the adversarial q = 0.25 instance: no gain.
- In-sample, tiny instances pay a fixed 1.2–2.5 s feature cost (worst ratio 23.9×).

**Not done:** no specialized LOP branch-and-cut code was found that could be run; this remains the main missing baseline.

## H. Complexity

| Component | Cost |
|---|---|
| Search | ≤ n(n+1)·P(2K+b²) states × O(n² + m·b + \|supp y'\|) each |
| Preprocessing | segmentation O(n² + n·b_max); block tables O(m·b·2^b); two LPs (O(n³) columns) |
| Pair certification | ×n |
| Memory | O(n·states) |
| Exact verification | O(states·n³) big-integer operations |

**Worst-case constants are large.** At K = 0 the bound allows 2^92 states for n = 29, while 731 were generated.

## I. Paper

`PAPER_provisional_v2.md`, *Square-Root Block Localization for Exact Weighted Linear Ordering*. All required sections are included.

## J. Hostile referee report

1. *"The guarantee needs a partition, and you compute it heuristically from an incumbent."*
   **True.** The theorem is FPT relative to a supplied partition; we do not show how to find a good one.
2. *"The counting lemma is elementary."*
   **True.** Its value is that it is tight and that it makes internal frustration disappear from the exponent.
3. *"Separation from Karpinski–Schudy is in guarantees, not measured."*
   **True.** No KS implementation was run.
4. *"The ETH tightness transfer is unverified."*
   **True.**
5. *"No specialized LOP solver; Python implementation; synthetic Family C."*
   **True.** LOLIB results are negative for DP.
6. *"Many-zero instances make K vacuous."*
   **True, and proved unavoidable** (Theorem C).
7. *"Big worst-case constants."*
   **True.**

**Likely verdict:** accept at a workshop or experimental venue; major revision for a top algorithms venue (partition-finding, KS comparison, compiled code).

## K. WESTFALL rating

| Axis | Grade |
|---|---|
| Correctness | **High.** Short proofs; 7,192 exhaustive counting checks; exact large-n counts; 80 solver-level runs; exact certificates with tamper tests; zero disagreements across all solvers. |
| Originality | **Plausible, unverified by specialists.** |
| Theoretical significance | **Moderate.** A tight, new parameterization with a necessity result. |
| Practical impact | **Narrow but real.** |

**Rating: Level 3 (provisional).** It meets the brief's definition on correctness, a new guarantee, and comparison to the closest prior art. It drops to Level 2+ if a specialist identifies prior block-relative parameterizations.

## L. ProofScope case-study summary

**Demonstrated:**
- AI-assisted exploration proposed a target; an exact computation falsified its tightness; this redirected the proof to a tight theorem.
- Exhaustive and asymptotic numerical verification of a combinatorial theorem.
- An exact certificate pipeline with adversarial tampering, which exposed a real binding gap that was then fixed.
- Honest out-of-sample evaluation, including losses.

**Not demonstrated:**
- Formal proof-assistant verification.
- Specialist novelty review.
- State-of-the-art performance.

## M. Next frontier

**Partition-free version.** Can a near-optimal ordered partition (minimising b + √K) be found or approximated within the same 2^{O(b+√K)} budget, e.g. by interleaving partition refinement with exclusion search?

That would make the result a genuine structural FPT theorem for weighted FAST in a decomposition parameter, and it is not settled by any work we found.
