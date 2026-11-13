# Research mission 026 — partition-free exact optimization: report

**Verdict: no Level 4 result.** The mission produced one conditional impossibility result that explains why the main
limitation of the λ(A) framework cannot be removed outright, one strict but elementary improvement of the parameter,
and one exact recursion for tie-rich instances. All three are corollaries of known results or of our own verified
theorem. Nothing here should be announced as a breakthrough.

Branch `research/partition-free`; not merged; not formalized in Lean; not peer reviewed.

Conventions: `A` is the skew-symmetric margin matrix (`a_uv = w_uv − w_vu`), `F_A(π) = Σ_{r<s} a_{π_r π_s}` is
maximised, and `F_w(π) = (F_A(π) + W)/2`. `D⁺` is the strict majority digraph (`u → v` iff `a_uv > 0`); a pair with
`a_uv = 0` is a *tie* and is not an arc.

## 1. The limitation that was attacked

λ(A) = min over ordered partitions of b² + 3K₀ charges every tied cross pair: a zero margin is counted in Z(τ) for
every threshold. Consequences, all checked by exhaustive computation (`verify.py`):

| Instance | OPT is… | λ(A) |
|---|---|---|
| all-zero matrix on n items | trivial (every ordering optimal) | **n²** (proved below; computed for n ≤ 6) |
| directed n-cycle, all other pairs tied | trivial (cut one arc) | 7, 13, 22, 34 for n = 3..6; ≥ n² − 3n in general |

So the verified bound poly(n)·2^{O(√λ)} degenerates to 2^{O(n)} on trivial inputs, and on every sparse instance. λ is
also not additive under exact decompositions of the problem.

## 2. Results

### T1. Series decomposition (folklore; proved here for completeness)

*If V = X ⊔ Y and a_xy ≥ 0 for all x ∈ X, y ∈ Y, then OPT(A) = OPT(A[X]) + OPT(A[Y]) + a(X, Y), and the concatenation
of optimal orderings of X and of Y is optimal.*

Proof. For any ordering π let π′ list X in π's order, then Y in π's order. Pairs inside X and inside Y contribute the
same. A cross pair (x, y) contributes a_xy in π′ and ±a_xy in π, and a_xy ≥ −a_xy. So F(π′) ≥ F(π), and F(π′) splits as
stated. ∎

Corollary: with C₁, …, C_m the strong components of D⁺ in topological order, OPT(A) = Σ OPT(A[C_i]) + Σ_{i<j} a(C_i, C_j).
(No arc goes from a later to an earlier component, so every such cross margin is ≥ 0.)

### T2. λ is monotone under restriction; the component parameter λ°

*For every nonempty S ⊆ V, λ(A[S]) ≤ λ(A).*

Proof. Restrict a minimising partition 𝓑 to S, dropping empty blocks. The largest block does not grow. The cross pairs
of the restriction are a subset of those of 𝓑, so for every threshold τ ∈ (0, ∞] each of N⁻, Z(τ) and X does not
increase, and ⌊X/τ⌋ is monotone in X. Hence K₀ does not increase. ∎

Define **λ°(A) = max over strong components C of D⁺ of λ(A[C])**. Then λ°(A) ≤ λ(A).

Separation. For the all-zero matrix, λ° = 1 (components are single vertices) while λ = n². Proof of λ = n²: there are
no positive margins, so only τ = ∞ applies and K₀ = number of cross pairs = (n² − Σ b_i²)/2. With largest block b,
b² + (3/2)(n² − Σ b_i²) ≥ n² in both cases: if b ≤ n/2 then Σ b_i² ≤ bn and (b − n)(b − n/2) ≥ 0; if b > n/2 then
Σ b_i² ≤ b² + (n − b)², and with r = n − b the claim reduces to 2r² ≤ nr. Equality holds for one block.

### T3. AutoCut° (corollary of T1, T2 and the Lean-verified `autoCut_correct` / `autoCut_complexity`)

Compute the strong components of D⁺ (O(n²) operations), run AutoCut on each, concatenate in topological order.

*It returns an optimal ordering, and uses at most n · 1 728 000 (n+1)¹⁸ 2^{45(⌊√λ°(A)⌋+1)} + O(n²) arithmetic operations
in the cost model of the Lean development.* (Sum the verified bound over at most n components, each with
λ(A[C]) ≤ λ°.) The structural certificate is the component order (checkable in O(n²): no positive margin from a later
to an earlier component) plus one λ-attaining partition per component.

Status: the composition argument is written here, **not** formalized. Bit complexity and memory remain as open as for
AutoCut itself.

### T4. Charging ties is necessary for a square-root exponent (conditional on ETH)

Let K₀⁻ be K₀ with tied cross pairs not charged (Z counts only 0 < c < τ), and λ⁻ = min_𝓑 (b² + 3K₀⁻).

*Unless the Exponential Time Hypothesis fails, no algorithm solves weighted linear ordering in time
poly(n)·2^{o(λ⁻(A))}. In particular poly(n)·2^{O(√λ⁻)} is impossible.*

Proof. Reduce Vertex Cover. For a graph G = (V, E), build a digraph with arcs v_in → v_out for each vertex and
u_out → v_in, v_out → u_in for each edge. Every directed cycle uses a vertex arc at each vertex it visits, and an edge
arc u_out → v_in can be replaced in any feedback arc set by v_in → v_out (the only arc leaving v_in). So the minimum
feedback arc set equals the minimum vertex cover k. Take margins +1 on arcs and 0 elsewhere (2|V| items, no 2-cycles).
Use single-vertex blocks in an optimal order: the negative cross pairs are exactly the k backward arcs, so N⁻ = X = k,
and with τ = 1 no positive margin is below τ. Hence K₀⁻ ≤ 2k and λ⁻ ≤ 1 + 6k ≤ 1 + 6|V|. A poly·2^{o(λ⁻)} algorithm
would solve Vertex Cover in 2^{o(|V|)} time, which ETH excludes (standard; e.g. Cygan et al., *Parameterized
Algorithms*, ch. 14). ∎

The reduction and the inequality λ⁻ ≤ 1 + 6k were checked on 48 small graphs.

Meaning: the tie limitation of §1 **cannot be removed wholesale**. Any parameter that makes all ties free equals, up to
constants, the solution size of general feedback arc set, where no subexponential dependence exists under ETH. Only
*structured* ties can be free: T2/T3 make free exactly the ties that the component order separates.

### T5. Strong-component recursion (exact algorithm; likely folklore)

OPT(U) = Σ_i OPT*(C_i) + Σ_{i<j} a(C_i, C_j) over the strong components of D⁺[U];
OPT*(C) = max_{v ∈ C} [a(v, C − v) + OPT(C − v)] for strongly connected C with |C| ≥ 2, and 0 for a single vertex.

Correct by T1 and by conditioning on the first vertex. With N the number of distinct strongly connected sets reached:
O(N·n³) arithmetic operations, O(N) stored values of at most L + 2 log n bits (L = bits of the largest margin), O(n²)
preprocessing. N ≤ number of strongly connected induced subgraphs of D⁺. Code: `sccdp.py`.

The memo table is not a better optimality certificate: checking it costs as much as computing it.

## 3. Verification (exact arithmetic, `verify.py`, seed 26026)

- T5/T1: the recursion equals exhaustive enumeration on **1512** instances (n ≤ 7; six families including rational
  weights and heavy ties).
- T2: λ(A[S]) ≤ λ(A) for every subset S of **288** instances (n ≤ 5); λ° < λ strictly on 111 of them.
- Separation table and T4 reduction as stated above.

No counterexample to any statement was found.

## 4. Comparative experiment (`experiments.py`, seed 26027; one core, Xeon 2.1 GHz)

Identical instances, n = 10 and 12, three per family. All methods that finished agreed on the optimum (36/36).

| Family | Strong states N (n=10 / n=12) | 2ⁿ | AutoCut reference: cut nodes, threshold k, time (n=10) | AutoCut n=12 (30 s limit) |
|---|---|---|---|---|
| all-zero | 0 / 0 | 1024 / 4096 | 1024, k=128, ~2 s | timeout |
| cycle + chords, rest tied | 4–11 / 3–9 | | 1024, k=128, ~5.5 s | timeout |
| sparse digraph (p = 0.2) | 0 / 0–2 | | 1024, k=128, ~4 s | timeout |
| heavy ties | 3–76 / 61–323 | | 1024, k=128, ~6 s | timeout |
| near-transitive tournament | 14–209 / 93–992 | | 886–1024, k=16–64, 0.06–5.9 s | 0.1 s, 1.75 s, timeout |
| random tournament | 434–675 / 2331–3056 | | 1024, k=64–128, 3.5–6.2 s | timeout |

Subset DP (NumPy) and HiGHS MILP solved **every** instance in ≤ 0.03 s. The recursion took ≤ 0.25 s.

Honest reading:
- The recursion removes the tie blow-up (0–323 states where AutoCut enumerates all 2ⁿ cuts).
- On dense tournaments it visits most of the 2ⁿ sets and is no better than subset DP.
- At these sizes nothing beats the plain subset DP or MILP in time. No practical advantage over established solvers is
  demonstrated, and no specialised linear-ordering solver was tested.

LP probe (`lp_probe.py`): among 6000 random integer instances with n = 6, the 3-dicycle LP bound equalled OPT on 5999.
One instance has LP = 11 > OPT = 10 (λ = 30). So polynomial LP certificates are usually, but not always, available at
this size; no theorem is claimed.

## 5. Routes

| Route | Outcome |
|---|---|
| A (automatic decomposition) | T1–T3: exact, cheap, certified decomposition into strong components; strict improvement λ° ≤ λ. Elementary. |
| B (new parameter with better exponent) | T4 is an obstruction: a tie-blind parameter cannot have a subexponential exponent. No new positive theorem. |
| C (stronger certificates) | Nothing new. DP tables are not short certificates; LP certificates fail on some instances (expected: NP ≠ coNP barrier). |
| D (incumbent-guided exactness) | Not pursued beyond what BLX already does. |
| E (new invariant) | λ° and the strong-state count N are cheap to certify and predictive here, but neither yields a new complexity class of results. |

## 6. Novelty assessment

| Item | Classification |
|---|---|
| T1 | Already known (standard preprocessing for feedback arc set). |
| T2, T3 | Straightforward corollary of our verified theorem. Not found stated elsewhere, because λ is our parameter. |
| T4 | Corollary of known ETH hardness plus a textbook reduction. The observation about tie-charging may be new as a remark; it is not a deep theorem. |
| T5 | Natural recursion; I did not find it written in this form, but did not search exhaustively. Treat as folklore. |

Closest prior art: Karpinski–Schudy (weighted FAST in 2^{O(√OPT)} and a matching ETH lower bound; there a tie costs
½ either way, so ties are charged too), Feige and Alon–Lokshtanov–Saurabh (FAST), Fomin–Pilipczuk (k-cut counting via
partition numbers), Bonamy et al. (directed feedback sets in 2^{O(t log t)} by treewidth of the underlying graph,
tight under ETH).

## 7. Most serious obstruction, and the next question

Two regimes are understood and are incomparable: dense, nearly transitive instances (exponent √λ, ties charged) and
sparse instances (exponent t log t in the treewidth t of the support graph, ties free). T4 shows the first cannot
absorb the second. The directed cycle with ties is trivial for the second regime and worst-case for λ°.

**Open question (speculative, no evidence yet):** is there a single parameter κ(A), certifiable in the same time bound,
with an exact algorithm in poly(n)·2^{O(√κ_dense + t log t)}, where the instance splits into a part charged like λ and
a remainder of support-treewidth t? A first test would be a prefix DP whose states are cut sets *modulo* a tree
decomposition of the tied pairs. I tried the naive hybrid (strong-component recursion with cut pruning) on paper: it
forgets the prefix, so the partition-number counting no longer applies. I have no proof that it fails and no
measurement.

## 8. Artifacts

`sccdp.py` (algorithm), `verify.py` + `verify_results.json`, `experiments.py` + `experiment_results.json` +
`experiments.log`, `lp_probe.py` + `lp_probe_results.json`, `exact_reference.py` (copied unchanged from the Lean
branch's test directory). Reproduce: `pip install -e .` at the repository root, then run the three scripts here.
