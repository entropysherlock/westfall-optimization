# WESTFALL Discovery 016 — Report

**An impossibility theorem for κ-output-sensitive search, and symmetry-plus-exclusion search that removes the 2ᵖ table and solves Paley(31)**

Prepared for Caleb Westfall · 12 November 2026. Every number in this report was measured in this session (`westfall016_code.zip`, entry point `run_all.sh`; C code compiled with gcc -O3 on a 2-core, 8 GB VM).

---

## A. Main results

**R1 — Barrier theorem (negative, rigorous).** The central target of the brief, T ≤ poly(n)·κ_t(A₀)^c including certificate cost, is **impossible for integer cores unless NP ⊆ ZPP**. The reason is that weighted instances with a *unique* optimum (κ = n+1) remain NP-hard. So any honest output-sensitive guarantee must be measured against what a specific exclusion bound can certify, not against κ itself. I call that quantity the **bound-relative survivor count** κ_t^U, and every positive result below is stated in it.

**R2 — Symmetric exclusion DP (algorithm with proved soundness and completeness).** For a core with a group G of automorphisms and anti-automorphisms, the exact core values g(S) = OPT(A₀|S) and the competitive family Λ(t) can be computed:
- storing one value per G-orbit of the bottom half (subsets of size ≤ ⌊n/2⌋);
- evaluating top-half orbits only when they are reachable from surviving states;
- excluding top-half states by the exact certificate f(S) + g(V∖S) + r₀(S) < t, where g(V∖S) is an already-computed bottom value.

**Nothing of size 2ⁿ is ever built.**

**R3 — New exact computations (rigorous, locally checkable).**

| p | K₀ | FAS of the core | κ₀ | κ₁ | κ₀ / 2ᵖ | Orbit states touched (t = K₀−2) | Core time | Memory |
|---|---|---|---|---|---|---|---|---|
| 11 | 15 | 20 | 2,004 | 2,048 | 0.98 | 14 + 15 | <0.01 s | 0.2 MB |
| 19 | 43 | 64 | 81,436 | 433,468 | 0.155 | 804 + 805 | <0.01 s | 0.4 MB |
| 23 | 69 | 92 | 5,108 | 14,216 | 0.00061 | 8,384 + 2,772 | 0.04 s | 0.7 MB |
| **31** | **105** | **180** | **2,835,634** | **32,517,204** | **0.00132** | 1,155,734 + 432,334 | 13.6 s | 42 MB |

Here FAS = (C(p,2) − K₀)/2.

**Perturbed Paley(31)** (the brief's construction, seed 14013 + 31): **OPT = 107.4654645825**, and **all 465 precedence relations certified** (minimum margin 0.087322). The total wall time was 2 min 52 s including all preprocessing, with no 2³¹-state table. The previous CFL implementation could not run p = 31 on this machine.

**R4 — Rigidity is not monotone (exposure).** Paley(23) is unusually rigid (κ₀/2ᵖ = 0.06%). Paley(31) is *less* rigid (0.13%), and its κ₁ = 32.5M dominates the per-instance cost. The striking p = 23 number did not predict a trend.

**R5 — Non-Paley behaviour (measured).** The same exclusion DP with a cheap Landau score-sequence bound prunes almost everything on near-transitive and planted-Gaussian cores. It still evaluates about 7% of 2ⁿ on random cores, and **nothing** on Paley cores. Symmetry and bound-pruning succeed in complementary regimes.

---

## B. Proofs

**Notation:**
- g(S) = OPT(A₀|S);
- r₀(S) = Σ_{u∈S, v∉S} (A₀)_uv;
- B₀(S) = g(S) + g(V∖S) + r₀(S);
- Λ(t) = {S : B₀(S) ≥ t};
- κ_t = |Λ(t)|.

**Lemma 0 (Discovery 015).** S ∈ Λ(t) if and only if S is the prefix set of some ordering π with F₀(π) ≥ t. (Concatenate optimal orderings of S and of V∖S.)

### Theorem 1 (κ-output-sensitivity barrier)

*Statement.* Suppose an algorithm, given any integer skew-symmetric A₀ with entries bounded by a polynomial in n, outputs OPT(A₀) (or Λ(OPT(A₀))) in time poly(n)·κ_{OPT}(A₀)^c for a constant c. Then NP ⊆ ZPP. The same holds with κ_{OPT−δ} for any δ < 1.

*Proof.*
1. **Start from a hard problem.** Minimum feedback arc set in tournaments is NP-hard (Alon 2006; Charbit–Thomassé–Yeo 2007). Let T be a ±1 tournament matrix.
2. **Isolating weights.** Take the ground set U of the n(n−1) ordered pairs and draw independent uniform weights w : U → {1, …, N} with N = 2n(n−1).
3. **The new core.** Set a_ij = M·t_ij + w(i,j) − w(j,i), where M = 8n²(n−1)·N + 1. Its entries are integers of size poly(n).
4. **Score formula.** Every ordered pair is either forward (in F_π) or backward, and Σ_{(i,j)∈F_π} w(j,i) = Σ_U w − Σ_{F_π} w. Hence F_A(π) = M·F_T(π) + 2·w(F_π) − w(U).
5. **Optima of A are optima of T.** Since 0 ≤ w(F_π) ≤ w(U) < M/4, the optima of A are exactly the T-optimal orderings with maximal w(F_π). Also OPT(T) = round((OPT(A) + w(U))/M).
6. **Uniqueness.** Distinct orderings have distinct forward sets F_π, so by the isolation lemma (Mulmuley–Vazirani–Vazirani 1987) the maximiser of w(F_π) over T-optimal orderings is unique with probability ≥ 1 − |U|/N = ½. Then κ_{OPT}(A) = n + 1.
7. **Las Vegas solver.** Integrality means no ordering scores in (OPT−1, OPT), so κ_{OPT−δ} = n + 1 as well. Run the algorithm with a clock limit of poly(n)·(n+1)^c and restart on timeout. Any output it gives is exact, so this is a zero-error expected-polynomial-time algorithm for FAS in tournaments. ∎

*Remark.* The theorem allows integer cores with polynomially bounded entries. Whether ±1 cores (Paley-type) admit κ-output-sensitive algorithms is **open**: blow-up reductions destroy uniqueness. So Theorem 1 does not rule out a Paley-specific breakthrough. It rules out the general one.

**Consequence.** For any exclusion bound U, define:
- **survivors:** the states S reachable from ∅ through survivors with f(S) + r₀(S) + U(V∖S) ≥ t;
- **κ_t^U:** the number of children of survivors.

The work of every bound-based method is Θ(n·κ_t^U·cost(U)). The gap κ_t^U / κ_t is exactly the price of the bound's relaxation gap, and Theorem 1 says no polynomial-time U can close it in general.

### Theorem 2 (exclusion DP: soundness and exactness)

*Setup.* Let U(T) ≥ g(T) be any upper bound, possibly exact. Process prefix states by size, keeping f(S) = the best chain value to S through kept states. Keep S iff f(S) + r₀(S) + U(V∖S) ≥ t.

*(a) Soundness and completeness.* Every ordering with F₀(π) ≥ t has all its prefixes kept, and f(S) ≥ F₀(π|S) along it.

*Proof of (a).* By induction on the prefixes S of π: F₀(π|S) ≥ t − r₀(S) − g(V∖S) ≥ t − r₀(S) − U(V∖S). The predecessor prefix was kept, so f(S) ≥ F₀(π|S), and S passes the test. ∎

*(b) Exactness.* With backward values b over the kept DAG, Λ(t) = {S kept : f(S) + b(S) ≥ t}.

*Proof of (b).* "⊆" follows from (a) applied to the concatenated ordering of Lemma 0. "⊇" holds because every kept chain is a real ordering. ∎

*(c) Exact bottom values give exact top values.* If U = g on the bottom half (exact), then for viable top states f(S) = g(S).

*Proof of (c).* Apply (a) to π = (optimal ordering of S) followed by (optimal ordering of V∖S). Then f(S) ≥ g(S), and f(S) ≤ g(S) always. ∎

### Theorem 3 (orbit reduction is exact)

*Setup.* Let G act on V. Each σ ∈ G either preserves A₀ (an automorphism, (A₀)_{σu,σv} = (A₀)_uv) or reverses it (an anti-automorphism, (A₀)_{σu,σv} = −(A₀)_uv).

*Claims.*
- g(σS) = g(S), because OPT of the converse equals OPT (reverse the ordering).
- When r₀ ≡ 0, as for any regular tournament core, B₀, Λ(t), the survivor test and f are all G-invariant.
- Hence the recursion g(S) = max_{u∈S} [g(canon(S−u)) + Σ_{w∈S−u} (A₀)_wu] on canonical representatives is exact. The insertion gain is evaluated on the actual representative set, so no relabelling is needed.
- **Canonical augmentation reaches every orbit.** If S has size k, then σ(S−v) = R for some representative R, so canon(S) = canon(R ∪ {σv}).

*Paley instance.* x ↦ ax + b with a ∈ Q is an automorphism and with a ∉ Q an anti-automorphism (because −1 ∉ Q for p ≡ 3 mod 4). So |G| = p(p−1). Orbit sizes are summed as |G|/|Stab(S)|, and the counts κ_t are exact.

*Not used.* Symmetry is never applied to the perturbed matrix A, which has no symmetry. The lift runs on the explicitly expanded sets of Λ_j. ∎

### Theorem 4 (CFL lift, from Discovery 015)

Let:
- L be the score of a real ordering;
- U_E ≥ max_π E(π), certified by the triangle LP (tolerance 1e-6) or by ‖E‖₁;
- K₀ − 2(j+1) + U_E < L.

Then every ordering with F_A ≥ L lies inside Λ_j, by the parity of ±1-core scores. Pair certification is the exact longest path through Λ_j with y placed before x.

---

## C. Algorithm (implemented)

**`orbitdp.c`** (p ≤ 31, 32-bit masks):

```
canon(S) = min over a in F_p^*, b in Z_p of rotl(mul_a(S), b)
    # mul_a uses 4 byte-lookup tables; rotl is a word rotation; cost p(p-1) word ops

Phase 1 (bottom half, |S| <= (p-1)/2):
    for each representative R of size k-1, each v not in R:
        S = canon(R + v)
        if S is new:
            g[S] = max over u in S of ( g[canon(S-u)] + gain(u, S-u) )

Phase 2 (top half):
    expand only kept representatives
    f[S] = max over kept predecessors
    keep S iff f[S] + g[canon(V\S)] >= t        # exact exclusion certificate
    otherwise record S as REJECTED (evaluated once)

Output: K0 = f[V]; kappa_j = 2 * sum over viable top reps of p(p-1)/|Stab|
        (complementation pairs top with bottom); dump viable reps.
```

**`lift.c`:** expands viable representatives under G, adds complements, deduplicates and hashes them. It then runs forward/backward longest paths on the perturbed matrix and computes W(y,x) for all ordered pairs.

**`pipeline.py`:**
1. orbitdp;
2. certified U_E from the triangle LP;
3. lift at j = 0 to get an incumbent L from a real ordering;
4. choose j;
5. lift at j;
6. certify pairs (x ≺ y certified iff W(y,x) < OPT − 1e-9);
7. rescore the returned ordering directly.

**`generic.py`:** Theorem 2 with U = the Landau bound, for any ±1 core with no symmetry. For a tournament on T, g(T) ≤ 2·Σ_k min(d_(k), |T|−k) − C(|T|,2), where d_(k) are the out-degrees within T sorted in descending order. Sorted pairing maximises the sum of mins, so this is a valid bound.

---

## D. Completeness certificate (why nothing competitive was dropped)

1. **Bottom values are exact.** Every bottom orbit is generated (Theorem 3), and each value is the exact max over all removals.
2. **Top exclusions are exact inequalities.** Each rejected top state carries the explicit inequality f(S) + g(V∖S) < t. Theorem 2(a) shows that no ordering with F₀ ≥ t can pass through it.
3. **Lift exclusion is exact.** Orderings outside Λ_j score ≤ K₀ − 2(j+1) + U_E < L (Theorem 4).
4. **The certificate is locally checkable.** Its size is the number of orbit states touched. Every stored value can be re-verified from its predecessors in O(p·|G|) word operations. I spot-checked 28 viable p = 31 representatives (|S| = 16…22) against an independent vectorised subset DP on the induced sub-tournament and its complement: **0 mismatches**.

**What is *not* independently verified:** p = 31 values involving sets larger than 22 vertices. The whole-table recursion was checked only by the same code path, by consistency (an explicit core ordering scoring 105, matching K₀), and by the exact reproduction of all p ≤ 23 values from the independent full DP.

---

## E. Benchmarks (actual measurements)

**Core phase** (exact K₀, κⱼ):

| p | t | Bottom orbits | Top evaluated | Top kept | Time | Memory |
|---|---|---|---|---|---|---|
| 19 | 43 | 804 | 674 | 132 | <0.01 s | 0.4 MB |
| 23 | 69 | 8,384 | 2,729 | 12 | 0.04 s | 0.7 MB |
| 23 | 67 | 8,384 | 2,772 | 21 | 0.04 s | 0.7 MB |
| 31 | 105 | 1,155,734 | 335,780 | 1,585 | 12.6 s | 40 MB |
| 31 | 103 | 1,155,734 | 432,334 | 17,652 | 13.6 s | 42 MB |
| 31 | 97 | 1,155,734 | 1,154,966 | 847,361 | 22.4 s | 61 MB |

**Full pipeline on the seeded perturbed instances:**

| p | U_E | j | Λ_j | OPT | Certified | Min margin | Core time | Lift time |
|---|---|---|---|---|---|---|---|---|
| 11 | 0.737 | 0 | 2,004 | 15.5261428683 | 55/55 | 0.009042 | ~0 s | ~0 s |
| 19 | 2.418 | 0 | 81,436 | 44.4475053820 | 171/171 | 0.083985 | 0.01 s | 0.06 s |
| 23 | 3.074 | 1 | 14,216 | 69.7590131599 | 253/253 | 0.099818 | 0.05 s | 0.01 s |
| 31 | 5.618 | 1 | 32,517,204 | **107.4654645825** | **465/465** | 0.087322 | 23 s | 142 s (1.3 GB) |

**Experiment E (no symmetry; Landau-bound exclusion; ε = 0.05 residual):**

| Core | n | j | States evaluated | 2ⁿ | Λ_j |
|---|---|---|---|---|---|
| Transitive | 20 | 1 | 382 | 1,048,576 | 40 |
| Transitive, 5% flips | 20 | 1 | 1,302 | 1,048,576 | 50 |
| Transitive, 15% flips | 20 | 0 | 3,249 | 1,048,576 | 37 |
| Random tournament | 20 | 1 | 76,905 | 1,048,576 | 286 |
| Paley(19) | 19 | 0 | **524,288 (all)** | 524,288 | 81,436 |
| Planted Gaussian, θ = 2 (sign core) | 18 | 4 | 1,705 | 262,144 | 228 |
| Planted Gaussian, θ = 4 (sign core) | 18 | 4 | 6,309 | 262,144 | 621 |

**Scaling at t = K₀ − 2:**
- Random cores, n = 16 → 24: states evaluated were 16.7%, 12.9%, 7.4%, 10.2% and 6.8% of 2ⁿ, while κ₁ stayed between 442 and 717. This is exponential work with tiny output, which is Theorem 1 in action.
- 15%-flip cores: the evaluated fraction fell from 3.0% to 0.13% across the same range.

---

## F. Baseline comparison (preprocessing included)

| p | D015 full-core-DP CFL | D016 |
|---|---|---|
| 23 | 8,388,608 states, 5.5 s core (NumPy) | 11,156 orbit states, 0.04 s, 0.7 MB |
| 31 | needs 2³¹ int16 values (4.3 GB) plus gain tables; not runnable here | 1.59M orbit states, 13.6 s, 42 MB core; 142 s lift |

**Honest accounting of what is and isn't faster:**
- **The time savings are not asymptotic.** Canonicalisation costs about |G| = p(p−1) word operations per lookup. The orbit count is about 2^{p−1}/|G| for the bottom half, and each orbit needs about p lookups. The total is Θ(p·2ᵖ) word operations, the same order as the plain DP.
- **The gains are real but polynomial:**
  - memory, by a factor of Θ(p²);
  - about half the exponential in the top half, from the exclusion certificate;
  - constant factors from bit-parallelism.
- **The D015-vs-D016 time comparison mixes NumPy and C.** The state counts are the fair comparison.

---

## G. Independent verification

- **p = 11, 19, 23:** orbit-DP K₀ and κⱼ (j = 0…3) match the D015 full subset DP **exactly**. OPT, all certified pairs and the margins match D015 and the brief (15.52614287, 44.44750538, 69.75901316; runner-up gaps 0.009042 and 0.083985).
- **p = 31:**
  - 28 sampled representative values match direct subset DP (0 mismatches);
  - the returned optimal ordering rescores to 107.4654645825;
  - the best of 300 insertion local searches reached only 106.6699, never above the certified optimum;
  - an explicit core ordering scores 105 = K₀.
- **Gap:** the 465 p = 31 pair margins were **not** checked by brute force; a 2³¹ constrained DP is infeasible here.

---

## H. Failure analysis

1. **Theorem 1 itself.** No algorithm of the requested form exists for general integer cores, unless NP ⊆ ZPP.
2. **Paley cores defeat bound-based exclusion completely.** The cores are regular, so Landau bounds are weak and 100% of states are evaluated. The triangle LP fails too (Discovery 015, Theorem 3). Only symmetry helps, and only polynomially.
3. **Symmetry is fragile.** Any core without automorphisms gets no orbit reduction. The perturbed matrices themselves never have it.
4. **Random cores.** κ₁ ≈ 300–700 but about 7–10% of 2ⁿ is evaluated. The exponential is untouched.
5. **The lift dominates at p = 31.** κ₁ = 32.5M sets, 142 s and 1.3 GB, against 23 s for the core. Rigidity (κ/2ᵖ) went 0.98 → 0.155 → 0.0006 → 0.0013 and is not monotone.
6. **p = 43 is out of reach.** Bottom orbits ≈ 2⁴²/1806 ≈ 2.4×10⁹, and κ₁(43) is likely far beyond memory.
7. **Not tested:** frustration cages; their construction is not specified in the brief.

---

## I. Novelty assessment

**Known:**
- bounded DP / state fathoming (Morin–Marsten 1976);
- symmetry reduction by canonical augmentation (orderly generation; McKay);
- the isolation lemma (Mulmuley–Vazirani–Vazirani 1987);
- NP-hardness of tournament FAS (Alon 2006; Charbit–Thomassé–Yeo 2007);
- Landau-type score bounds;
- FPT algorithms for tournament FAS in the solution size, n^O(1)·2^O(√k), which are useless here since k = Θ(p²).

**Plausibly new, but not verified by an exhaustive literature search:**
1. Theorem 1 as a precise impossibility statement for κ-output-sensitive near-optimal-face enumeration. It is a short application of standard tools.
2. Using *exact bottom-half core values* as a complement certificate inside an orbit-reduced DP for LOP with anti-automorphisms.
3. The computed values FAS(Paley₃₁) = 180, κ₀(31) = 2,835,634 and κ₁(31) = 32,517,204, and the certified optimum of the perturbed Paley(31) instance. Small-Paley FAS values may already be known; I did not find them reported.

---

## J. WESTFALL rating

| Result | Proof status | Originality | Level |
|---|---|---|---|
| Theorem 1 (barrier) | Complete, short | Low–moderate (standard tools, apt target) | **2–3** |
| Theorems 2–3 (exclusion + orbit DP) | Complete | Low | **2** |
| Paley(31) exact core data + certified perturbed optimum | Computational, partially independently checked | New data | **2** |
| Rigidity non-monotonicity | Measurement | — | **1** |

**Overall: Level 2.** The 2ᵖ preprocessing table is gone, but the exponential is not. Theorem 1 shows that for general integer cores no method measured against κ alone can remove it unless NP ⊆ ZPP. The brief's Level 4 target is therefore unreachable in that form, and I am not claiming it.

---

## K. Next consequence

**The ±1-core question.** Is there an algorithm for *Paley* (or, more broadly, vertex-transitive ±1) cores running in poly(p)·κ_t^c? Theorem 1 does not apply to ±1 cores. A positive answer would require a canonical form computable from cheap invariants, which would break the Θ(p·2ᵖ) canonicalisation cost. A negative answer would need a uniqueness-preserving reduction to ±1 tournaments.

**The concrete experiment it unlocks.** Exact K₀ and κ₀ for Paley(43) via a symmetry-reduced *top-down* search seeded by the p = 31 data, together with a proof of whether κ₀(p)/2ᵖ → 0.
