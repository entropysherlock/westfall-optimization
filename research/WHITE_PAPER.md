# Exact Weighted Linear Ordering with Verifiable Guarantees

**Structure, algorithms, certificates and machine-checked proofs**

*Caleb Westfall · Westfall Optimization, an independent research initiative*
*White paper, version 1.0 · 14 November 2026*

> **Status of this document.** This paper consolidates the Westfall Optimization research program into one account.
> It has not been peer reviewed. Each result carries one of four labels:
> - **Lean kernel-checked**: proved in Lean 4 with Mathlib, and checked by the proof kernel in continuous
>   integration using only the standard axioms.
> - **Proved (paper)**: a complete written proof, usually also tested exhaustively on small cases, but not
>   machine-checked.
> - **Tested**: supported by exact computation only.
> - **Open**: a stated conjecture or question.
>
> Novelty relative to the literature has been screened but not independently established. The work was carried
> out with AI-assisted research and programming.

---

## Abstract

Many practical decisions come down to putting items in the best order: jobs on a machine, candidates in a ranking,
projects in a portfolio. In the weighted linear ordering problem, every pair of items carries a weight expressing how
strongly one should precede the other, and the task is to find the order that honours the greatest total weight. The
problem is NP-hard. Exact solutions are therefore usually obtained either with general-purpose integer programming
solvers, or not at all.

This paper describes a program that pursues exactness together with *verifiability*: an answer should come with
evidence that a sceptical reader can check. It has three strands.

1. **A structural theory.** It introduces an intrinsic parameter of an instance, the robust Condorcet number $\lambda(A)$.
   On top of it sits an exact algorithm, AutoCut, which runs in time $\mathrm{poly}(n)\cdot 2^{O(\sqrt{\lambda(A)})}$
   and discovers the structure it needs by itself. The central statements are kernel-checked in Lean 4.
2. **A counting theory for cuts in nearly complete directed graphs.** Its sharpest results bound the number of
   $k$-cuts of a semicomplete digraph by $(n+1)\cdot H(c+k)$, where $H$ counts integer partitions lying under a
   hyperbola. The bound extends to digraphs in which each vertex has at most $h$ non-neighbours. Both counting
   inequalities are kernel-checked. Together with a paper-level analytic estimate, they bear on a question posed by
   Fomin and Pilipczuk in 2013.
3. **A practical engine, ATLAS.** It solves instances exactly and emits optimality certificates that an independent
   program verifies. On an 88-instance benchmark it proves 85 instances optimal within 30 seconds, against 83 for the
   open-source MILP solver HiGHS. HiGHS is faster on many individual instances.

We also report a reproducible 40-item case study, state the limits of every claim, and list the open problems.

---

## 1. Introduction

### 1.1 The problem in plain terms

Suppose forty tasks must be performed one after another, and for every pair of tasks we know how much it matters
which comes first. One task may produce an input the other needs; one ordering may avoid a costly changeover; a panel
of judges may prefer one candidate to another by some margin. An ordering *honours* a preference when it puts the
items the preferred way round, and *violates* it otherwise. The goal is the ordering whose violated preferences weigh
the least.

The difficulty is combinatorial. Forty items admit about $8.16\times10^{47}$ orderings. Simple rules such as
"repeatedly take the item most preferred over those that remain" are fast, but they can be far from optimal and give
no indication of how far. Exact methods guarantee the best answer, but in general the problem is NP-hard. It contains
the feedback arc set problem on tournaments and Kemeny rank aggregation.

### 1.2 What this program contributes

The program asks a question that matters both in theory and in practice: **when can an ordering be proved optimal,
and how can that proof be made checkable by someone who does not trust the solver?** Its contributions fall into
three groups. Each is developed below with its exact status.

| Contribution | Section | Status |
|---|---|---|
| Robust Condorcet number $\lambda(A)$; optima are narrow cuts; partition recovery; AutoCut correctness and running time | §3 | **Lean kernel-checked** (eight flagship declarations, unit-cost model) |
| $k$-cuts of semicomplete digraphs: $N_k\le(n+1)\,H(c+k)$ | §4.2 | **Lean kernel-checked**; the analytic bound on $H$ is a paper proof |
| Defect-robust counting: $N_k\le(n+1)\,4^h\,H(c+k)^2$ for $h$-semicomplete digraphs | §4.3 | **Lean kernel-checked** |
| Algorithms derived from the counting results (cutwidth, optimal linear arrangement) | §4.4 | **Proved (paper)**, independently audited |
| Bounded independence number: pivot lemma, core decomposition, extremal conjecture | §5 | **Proved (paper)** for the lemmas; the main question is **open** |
| ATLAS exact engine with independently verifiable certificates | §6–7 | **Tested**: 85/88 proved, 0 disagreements with HiGHS |

### 1.3 How to read the claims

Machine-checked results are labelled as such and nothing else is. Two further points matter for interpretation.

- **A kernel check establishes correctness, not novelty or practical value.** Literature screens have been carried
  out for each strand (§10), but no expert referee has yet confirmed that the results are new.
- **Benchmarks are honest comparisons on stated hardware, not claims of superiority.** Where a general-purpose solver
  is faster, we say so.

---

## 2. Problem and notation

Let $A$ be a real skew-symmetric $n\times n$ matrix, so $a_{ji}=-a_{ij}$; $a_{ij}$ is the margin by which item $i$
should precede item $j$. Any pairwise benefit or cost matrix can be brought to this form exactly, up to an additive
constant. For an ordering $\pi$ of the items, the objective is

$$F_A(\pi)=\sum_{r<s} a_{\pi_r\pi_s},\qquad \mathrm{OPT}(A)=\max_\pi F_A(\pi).$$

Let $W=\sum_{i<j}|a_{ij}|$ be the total pair weight. The **penalty** (backward weight) of $\pi$ is
$\beta(\pi)=(W-F_A(\pi))/2$, the total weight of violated preferences. Maximising $F_A$ and minimising $\beta$ are
equivalent.

Two graph-theoretic objects recur throughout.

**The weak-majority digraph $D_A$.** It has an arc $w\to u$ whenever $a_{wu}\ge 0$. Ties give both arcs, so $D_A$ is
*semicomplete*: every pair of vertices is joined in at least one direction.

**Cuts.** For a vertex set $S$,
$\mathrm{cut}_A(S)=\#\{(w,u): w\notin S,\ u\in S,\ a_{wu}\ge 0\}$ counts the pairs that cross into $S$ against a
weak preference. More generally, for a digraph $D$ and $X\subseteq V$, $\mathrm{back}(X)$ is the number of arcs from
$V\setminus X$ into $X$. A **$k$-cut** is a set with $\mathrm{back}(X)\le k$. The **width** of an ordering is the
largest back-value over its prefixes, and the **cutwidth** is the minimum width over all orderings.

Exact dynamic programming over orderings works prefix by prefix. Its cost is therefore governed by how many prefixes
it must consider. Much of what follows is about bounding that number.

---

## 3. The structural theory: the robust Condorcet number

### 3.1 An intrinsic parameter

Many real instances are "almost transitive": the items fall into blocks, and preferences between blocks are mostly
consistent. Classical parameterised algorithms exploit this through the weight of the optimal solution's violated preferences, which a
single frustrated block can make large even when the overall structure is simple. The program instead measures structure
directly.

For an ordered partition $\mathcal B=(B_1,\dots,B_m)$ of the items, let $b(\mathcal B)$ be the largest block size,
and let $K_0(\mathcal B)$ measure the disagreement between the partition's order and the matrix across blocks.
$K_0$ counts negative cross pairs, near-ties and scaled negative weight, minimised over a threshold. The
**robust Condorcet number** is

$$\lambda(A)=\min_{\mathcal B}\ \bigl(b(\mathcal B)^2+3K_0(\mathcal B)\bigr),$$

where the minimum ranges over **all** ordered partitions. It is small exactly when the instance decomposes into small
blocks that are ordered almost consistently. It always satisfies $1\le\lambda(A)\le n^2$.

### 3.2 Main results

**Theorem 1 (optima are narrow).** Every prefix $S$ of every optimal ordering satisfies
$\mathrm{cut}_A(S)\le\lambda(A)$.

**Lemma 2 (few relevant states).** If $\lambda(A)\le k$, the number of $k$-cuts of $D_A$ is at most
$(n+1)\cdot P(3k)$, where $P(M)=\sum_{j\le M}p(j)$ and $p$ is the partition function.

**Theorem 3 (partition recovery).** Given $A$ and $k$, one can decide whether $\lambda(A)\le k$ and, if so, return a
partition attaining $\lambda(A)$. The procedure is a shortest-path search over chains of small cuts, so the
algorithm *finds* the structure; it is not supplied.

**Theorem 4 (AutoCut).** There is an algorithm that takes only $A$ and returns $\mathrm{OPT}(A)$, an optimal ordering,
the value $\lambda(A)$ and a partition attaining it, in time

$$\mathrm{poly}(n)\cdot 2^{O(\sqrt{\lambda(A)})}.$$

AutoCut doubles $k=1,2,4,\dots$. In each round it runs a cut-state dynamic program and the recognition procedure of
Theorem 3, and it stops once a witness partition certifies that $k\ge\lambda(A)$.

**Further results (paper).**
- $\lambda$ never does much worse than the classical parameter. For unit-separated weights,
  $\lambda(A)\le 1+6\beta^*$, so AutoCut recovers the known $2^{O(\sqrt{\mathrm{OPT}})}$ bounds up to constants.
  On frustrated-block families it is exponentially better.
- Under the Exponential Time Hypothesis, no $2^{o(\sqrt{\lambda})}\,\mathrm{poly}(n)$ algorithm exists (a corollary
  of Karpinski and Schudy).
- An explicit family shows that partition certificates cannot always match the search radius. Its optimal width is
  at most 6, while $\lambda=\Theta(n^{2/3})$.

### 3.3 Machine verification

Eight flagship declarations formalise Theorems 1–4 in Lean 4 with Mathlib and are kernel-checked in continuous
integration. They are `k0_exchange_localization`, `optimal_prefix_width_bound`, `cut_count_bound`, the three
`partition_recovery` statements (sound, complete, minimal), `autoCut_correct` and `autoCut_complexity`.

The axiom audit covered 963 declarations and found only the standard axioms (`propext`, `Classical.choice`,
`Quot.sound`). There is no `sorry`, `admit`, `native_decide` or user axiom.

The complexity theorem counts operations with a cost semantics. The executable is the value projection of the same
program, and its counted cost is at most $1\,728\,000\,(n+1)^{18}\,2^{45(\lfloor\sqrt\lambda\rfloor+1)}$. The
following are **not** established formally:
- the sharper $\mathrm{poly}(n)\,P(6\lambda)^2$ form;
- bit complexity;
- a full memory bound;
- agreement between the declared per-operation charges and compiled execution.

The full development lives on the research branch `formal/westfall-theorem`.

### 3.4 Practical standing

AutoCut is a *theoretical* algorithm. Its constants are large, and the original prototype proved only 7 of 20
benchmark instances that the practical solvers handled easily. Its value is the guarantee and the structural
insight; speed comes from the engine described in §6. A browser port of AutoCut reproduces the Lean executable's
outputs exactly on all 103 archived instances. That agreement is tested, not proved.

---

## 4. Counting cuts in nearly complete digraphs

### 4.1 Why counting matters

The cut-state method for layout problems explores only those prefixes whose cut is at most $k$. Its running time is
essentially the number of such $k$-cuts. For **semicomplete** digraphs, Fomin and Pilipczuk (ESA 2013; JCTB 2019)
proved a bound of $2^{O(\sqrt{k\log k})}\cdot n^{O(1)}$ on this number. That gives subexponential algorithms for
directed cutwidth and optimal linear arrangement. They asked whether the logarithmic factor can be removed. Barbero,
Paul and Pilipczuk showed that their algorithms are optimal under ETH up to exactly that factor.

### 4.2 Hyperbola partitions and the semicomplete case

Let $H(K)$ be the number of integer partitions $\lambda_1\ge\lambda_2\ge\cdots$ whose Ferrers diagram lies under the
hyperbola $xy\le K$, that is, with $i\,\lambda_i\le K$ for every $i$. Its first values are
$H(0),\dots,H(5)=1,2,5,10,26,42$.

The key observation is geometric. A Ferrers diagram under the hyperbola can have total area of order $K\log K$, which
is the source of the logarithm in earlier bounds. Yet the number of such diagrams is only $e^{O(\sqrt K)}$, because
every *inscribed rectangle* has area at most $K$.

**Theorem 5 (semicomplete $k$-cut counting).** If a semicomplete digraph on $n$ vertices has an ordering of width at
most $c$, then it has at most

$$(n+1)\cdot H(c+k)$$

$k$-cuts. Moreover $H(K)\le e^{2\pi\sqrt K}/(2\pi\sqrt K)$.

The proof encodes each $k$-cut by its size and the column profile of its Ferrers diagram relative to the reference
ordering. A *rectangle lemma*, $|P\setminus X|\cdot|X\setminus P|\le\mathrm{back}(P)+\mathrm{back}(X)$, places every
profile under the hyperbola. Injectivity follows from a least-differing-element argument.

**Status.**
- The counting inequality, including the injection, is **Lean kernel-checked** (Mission 040).
- The analytic estimate on $H$ is a **paper proof**. It was independently re-derived by an elementary
  integral-comparison argument (Mission 045).
- The inequality is exhaustively tested on every semicomplete digraph with at most five vertices and every tournament
  with six.

If correct and new, the combination gives cutwidth in $2^{O(\sqrt k)}\cdot n^{O(1)}$ and optimal linear arrangement
in $2^{O(k^{1/3})}\cdot n^{O(1)}$ on semicomplete digraphs, matching the ETH lower bounds. **We do not claim the 2013
question as settled.** That requires independent expert review of the full chain and of its novelty.

### 4.3 Robustness to missing arcs

Real instances are rarely semicomplete: some pairs carry no preference at all. Call a digraph **$h$-semicomplete** if
every vertex has at most $h$ non-neighbours. The rectangle lemma tolerates such defects with a shift,
$ab\le K+h\min(a,b)$. A refined encoding then gives the following result.

**Theorem 6 (defect-robust counting).** If an $h$-semicomplete digraph has an ordering of width at most $c$, then

$$N_k\ \le\ (n+1)\cdot R_h(c+k)\cdot H(c+k)\ \le\ (n+1)\binom{2h}{h}H(c+k)^2\ \le\ (n+1)\,4^h\,H(c+k)^2,$$

where $R_h$ counts the admissible profiles of the first $h$ rows. The case $h=0$ is Theorem 5.

**Status.** Both inequalities are **Lean kernel-checked**: Mission 041, and Mission 044 in CI run 43533991215, with
standard axioms only. An adversarial search over 843,887 digraphs found no violation.

The exponential dependence on $h$ is necessary. Blocks of $h+1$ mutually non-adjacent vertices give $2^{\Omega(h)}$
zero-cuts, so a factor of order between $2^h$ and $4^h$ cannot be avoided.

### 4.4 Algorithmic consequences

The counting bounds yield exact algorithms through a standard scheme:
1. enumerate $k$-cuts with polynomial delay, using a minimum-cut feasibility oracle;
2. stop as soon as the count exceeds the proven bound, which certifies that the width exceeds $k$;
3. otherwise, search the cut lattice for an ordering.

Mission 045 audited every step independently. On 4,096 four-vertex digraphs it ran 28,672 cutwidth decisions,
17,556 linear-arrangement decisions and 331,776 minimum-cut comparisons, with zero mismatches. The resulting running
times are

$$\text{cutwidth: } 2^{O(\sqrt k+h)}\cdot\mathrm{poly}(n),\qquad \text{optimal linear arrangement: } 2^{O(k^{1/3}+h)}\cdot\mathrm{poly}(n),$$

on $h$-semicomplete digraphs. The exponent of $n$ does not depend on $h$, so both are fixed-parameter tractable in
$k+h$.

**Status.** Proved on paper. The algorithms themselves are not formalised.

---

## 5. Beyond near-completeness: bounded independence number

The natural next class consists of digraphs whose underlying graph has independence number at most $\alpha$: every
$\alpha+1$ vertices contain at least one arc. Missing arcs are then no longer limited per vertex. The best known
algorithms, by Misra, Saurabh, Sharma and Zehavi (FSTTCS 2018; Algorithmica 2023), run in
$2^{O(\alpha^2\sqrt k\log(\alpha k))}\cdot n^{O(\alpha)}$. Removing the logarithm is open.

Three findings frame the problem.

- **An unavoidable obstruction.** $\alpha$ disjoint transitive tournaments have cutwidth 0 and about $(n/\alpha)^\alpha$
  zero-cuts. A polynomial factor $n^{\Omega(\alpha)}$ is therefore unavoidable for counting. For $k=0$ this is exact:
  for every digraph with independence number $\alpha$, $N_0\le\max\prod_i(a_i+1)$ over $a_1+\dots+a_\alpha=n$, with
  equality for disjoint tournaments (paper proof via Dilworth's theorem).
- **Pivot lemma and core decomposition (paper).** Across any disagreement rectangle with more than
  $\mathrm{back}(P)+\mathrm{back}(X)$ vertices on one side, the other side lies in the non-neighbourhood of a single
  vertex, where the independence number drops by one. For $\alpha\le2$ this yields an exact encoding of every $k$-cut
  by two semicomplete traces and a *core* of at most $2(c+k)$ vertices. Consequently, the log-free target for
  $\alpha=2$ holds in general if and only if it holds on instances with $O(c+k)$ vertices.
- **The two-tournament conjecture (open).** Exhaustive enumeration supports the conjecture that, for $\alpha\le2$, two
  disjoint transitive tournaments maximise the number of $k$-cuts. This was tested for acyclic orientations, the
  setting relevant to feedback arc set. The enumeration covers every triangle-free
  non-adjacency pattern on at most 7 vertices, and every vertex order of every maximal pattern found on 8–10
  vertices. Two natural proof mechanisms were refuted by explicit constructions, which shows what a proof must
  handle.

If the conjecture is proved, directed feedback arc set on $\alpha\le2$ digraphs follows in
$2^{O(\sqrt k)}\cdot n^{O(1)}$, via a reduction that is already proved. This is the program's principal open problem.

---

## 6. The ATLAS engine

### 6.1 Design

The structural theory explains *why* instances are tractable. The ATLAS engine is built to solve them. It combines
standard, well-understood components and implements them natively, with exact integer arithmetic.

1. **Decomposition.** The strong components of the strict-preference digraph are solved independently and
   concatenated in topological order. This is exact, because every cross-component pair is then honoured in its
   preferred direction.
2. **Cut-state dynamic programming** over prefixes, layer by layer, with numeric state keys and flat typed-array
   storage.
3. **Lower bounds from directed-cycle packings.** Every directed cycle in the preference digraph must lose at least
   its lightest arc in any ordering, so a packing of cycles bounds the penalty from below. ATLAS computes a fractional
   packing of directed triangles, by the Garg–Könemann method, and extends it greedily with longer cycles on residual
   capacity.
4. **Strict pruning.** A prefix state is discarded when its exact penalty, the cut it creates and the residual packing
   bound on the remaining items together reach the incumbent. Each test takes constant time per state.

None of these components is new mathematics: the bounds are classical results in the theory of the linear ordering
problem. The contribution is a correct, certified, native implementation, and a diagnosis of exactly which bound was
missing.

### 6.2 Results

On 88 identical instances, with a 30-second limit, one thread each, and exact optimality only (zero gap):

| Solver | Proved optimal |
|---|---|
| ATLAS-031 (previous engine) | 47 / 88 |
| **ATLAS-032** | **85 / 88** |
| HiGHS 1.16 MILP, exact gap | 83 / 88 |

- **Agreement.** There are no disagreements between any proved values. Six recorded optima from the LOLIB library are
  reproduced exactly.
- **Real data.** All 50 real-world LOLIB input–output tables (44–79 items) are proved, by both ATLAS-032 and HiGHS.
- **Where ATLAS proves more.** On dense $n=30$ instances, ATLAS proves every case while HiGHS proves 4 of 6.
- **Where HiGHS is faster.** On many families HiGHS proves the optimum in less time. Examples: 204 ms against
  1,287 ms on near-transitive $n=40$, and 314 ms against 718 ms median on LOLIB.
- **A note on solver tolerances.** At its *default* tolerance, HiGHS labelled one LOLIB solution (`N-stabu70`)
  "Optimal" although it was 12 units short. ATLAS certified the true optimum. Exact comparisons must therefore use
  zero gap.
- **Unproved cases.** The three instances ATLAS did not prove ($n=35$) end with rigorous gaps of about 5%.

All timings were taken on a 2-vCPU Intel Xeon at 2.1 GHz with 8 GB RAM, using Node 22.23.4 and HiGHS 1.16.0.

---

## 7. Certificates and layers of evidence

A proof of optimality is only as trustworthy as the code that produced it. The program therefore separates
*producing* an answer from *checking* it, and reports which level of evidence each answer reaches:

1. **Feasible.** The ordering is a valid permutation.
2. **Recomputed.** Its objective is recomputed exactly from the input.
3. **Bounded.** A rigorous lower bound on the penalty is reported, together with the gap.
4. **Certificate.** The solver exports a certificate: the ordering, the decomposition, and per-component cycle
   packings with the residual search.
5. **Independently accepted.** A separate verifier accepts the certificate. It is written in pure Python with exact
   integers and shares no code with the solver. It checks that every packed cycle is a genuine directed cycle within
   its arc capacities, that the decomposition is valid, and, by its own exhaustive search, that no ordering beats the
   claim. All ten exported benchmark certificates were accepted, and tampered certificates are rejected.
6. **Lean.** The statement is proved in the Lean kernel. This level applies to the theorems of §3–4, never to
   individual browser runs.

The fifth level is the engine's distinctive offering. A general-purpose MILP solver can report "Optimal", but the
reader must trust the solver and its tolerances. An ATLAS certificate can be checked in milliseconds by anyone,
without trusting ATLAS.

---

## 8. Case study: forty items, one proven best sequence

**Instance.** `near-transitive n=40 s=1`, produced by the deterministic benchmark generator: 40 items and 780
weighted pairs. It is a synthetic benchmark, not customer data.

| Method | Penalty | Objective | Proof |
|---|---:|---:|---|
| Greedy baseline (repeatedly take the remaining item with the highest net preference) | 475 | 1,335 | none |
| Greedy followed by insertion local search | 321 | 1,643 | none |
| **ATLAS-032** | **319** | **1,647** | **certificate, independently verified** |
| HiGHS 1.16, exact MILP | 319 | 1,647 | solver status only |

ATLAS reduces the penalty by 156 points, or **32.8% relative to the greedy baseline**. It proves the result optimal
in 1.287 s; an independent re-run on the same hardware specification took 1.207 s. The certificate is accepted in
0.002 s, because the cycle-packing bound alone equals 319.

Three qualifications are essential:
- HiGHS proves the same optimum about five to six times faster (0.204 s);
- a cheap local search comes within two points of the optimum;
- the percentage compares against a greedy heuristic, not against any exact solver.

What the case study demonstrates is the certificate. Neither the heuristic nor the MILP status can show that nothing
better than 319 exists.

Every number in this section was reproduced independently. The matrix was regenerated in Python, and both the
greedy and optimal penalties were recomputed. The evidence is in `benchmarks/case-study-40/`.

---

## 9. Software

- **Optimization Studio.** A browser workstation that runs entirely on the visitor's machine. It covers problem
  import and validation, exact solvers (subset dynamic programming, exclusion dynamic programming, AutoCut and ATLAS),
  heuristics, analysis, comparison, and certificate verification in a separate worker. Nothing is uploaded.
- **Python package.** The BLX solver portfolio comprises exclusion dynamic programming with block and packing bounds,
  routing, a HiGHS interface, and exact certificates with an independent checker.
- **Job service.** A FastAPI service for longer runs. It is implemented and tested but **not deployed**.

All components are open source under the GNU General Public License v3.0. Unit, correspondence and end-to-end tests
run in continuous integration, together with the Lean builds.

---

## 10. Relation to prior work

- **Cut-state dynamic programming and counting.** Fomin and Pilipczuk introduced the $k$-cut framework for
  semicomplete digraphs. Barbero, Paul and Pilipczuk gave the matching ETH lower bounds. Kitsunai, Kobayashi and Tamaki
  studied $h$-semicomplete digraphs for pathwidth. Misra, Saurabh, Sharma and Zehavi extended the framework to bounded
  independence number. Gomes, Lopes and Mnich (2026) study pathwidth on $h$-semicomplete digraphs; their work does not
  address cutwidth or cut counting. Our screens found no prior statement of the hyperbola counting bound or of the
  defect-robust bounds. Expert confirmation is pending.
- **Weighted linear ordering.** Grötschel, Jünger and Reinelt established the cutting-plane and cycle-inequality
  approach. Charon and Hudry, and Martí and Reinelt, survey exact and heuristic methods, and LOLIB is the standard
  benchmark library. Karpinski and Schudy gave subexponential algorithms parameterised by the optimal cost. The
  proposed novelty of §3 is the parameter $\lambda(A)$ together with partition *recovery*; the cut-state technique is
  not claimed as new.
- **ATLAS.** The bounds and the pruning are standard (§6.1). Only the integrated, certified implementation is
  presented as a contribution.

---

## 11. Limitations

- **No peer review.** No result has been refereed, and novelty has been screened rather than established.
- **Scope of the formal guarantees.** Formal guarantees cover the stated theorems in a declared unit-cost model. They
  do not cover bit complexity, memory, or the browser and Python implementations, which are tested, not proved.
- **Analytic estimates and algorithms are paper proofs.** This includes the $e^{2\pi\sqrt K}$ bound on $H$ and the
  algorithms of §4.4.
- **Benchmarks.** The suite is limited to 88 instances, one hardware configuration and one comparison solver.
  Commercial and specialised linear-ordering solvers have not been tested.
- **No real-world deployment.** The case study is synthetic. No real-world deployment or measured business saving is
  reported.

---

## 12. Open problems and next steps

1. **Independent review** of the semicomplete counting theorem and its consequences, followed by submission as a
   preprint.
2. **The two-tournament conjecture** for $\alpha\le2$ (§5), and its consequence for directed feedback arc set.
3. **The exact dependence on $h$.** Is the $4^h$ factor necessary for deciding cutwidth, rather than for enumeration
   only?
4. **Certified optimisation as a service.** This means producing ATLAS-style certificates for orderings found by any
   solver, so that fast solving and independent checking can be combined.
5. **A real-data case study** on LOLIB input–output tables, and pilots on real sequencing problems.

---

## 13. Reproducibility

Every result in this paper is backed by public artifacts in the repository
`github.com/entropysherlock/westfall-optimization`:

| Result | Location |
|---|---|
| Structural theorem (paper and Lean) | `research/discovery-022/`, `docs/formal-verification.md` (Lean on branch `formal/westfall-theorem`) |
| Semicomplete counting | `research/westfall-040/` (manuscript, Lean, exhaustive checks) |
| Defect-robust counting | `research/westfall-041/`, `westfall-042/`, `westfall-044/` (Lean, CI run 43533991215) |
| Algorithm audit | `research/westfall-045/` |
| Bounded independence | `research/westfall-046/` |
| ATLAS-032 benchmark | `benchmarks/atlas-032/` (results, certificates, verifier, HiGHS scripts) |
| Case study | `benchmarks/case-study-40/` |

---

## References

- Barbero, F., Paul, C., Pilipczuk, M. Exploring the complexity of layout parameters in tournaments and semi-complete
  digraphs. *ICALP 2017*; *ACM Transactions on Algorithms* 2018.
- Charon, I., Hudry, O. A survey on the linear ordering problem for weighted or unweighted tournaments. *4OR* 5 (2007).
- de Moura, L., Ullrich, S. The Lean 4 theorem prover and programming language. *CADE 2021*.
- Fomin, F. V., Pilipczuk, M. Subexponential parameterized algorithm for computing the cutwidth of a semi-complete
  digraph. *ESA 2013*. Journal version: On width measures and topological problems on semi-complete digraphs.
  *Journal of Combinatorial Theory, Series B* (2019).
- Garg, N., Könemann, J. Faster and simpler algorithms for multicommodity flow and other fractional packing problems.
  *SIAM Journal on Computing* 37 (2007).
- Gomes, G., Lopes, R., Mnich, M. arXiv:2610.41840 (2026).
- Grötschel, M., Jünger, M., Reinelt, G. A cutting plane algorithm for the linear ordering problem.
  *Operations Research* 32 (1984).
- Huangfu, Q., Hall, J. A. J. Parallelizing the dual revised simplex method. *Mathematical Programming Computation*
  10 (2018). (HiGHS.)
- Karpinski, M., Schudy, W. Faster algorithms for feedback arc set tournament, Kemeny rank aggregation and betweenness
  tournament. *ISAAC 2010*.
- Kitsunai, K., Kobayashi, Y., Tamaki, H. On the pathwidth of almost semicomplete digraphs. *ESA 2015*.
- Martí, R., Reinelt, G. *The Linear Ordering Problem: Exact and Heuristic Methods in Combinatorial Optimization.*
  Springer, 2011.
- The mathlib Community. The Lean mathematical library. *CPP 2020*.
- Misra, P., Saurabh, S., Sharma, R., Zehavi, M. Sub-exponential time parameterized algorithms for graph layout
  problems on digraphs with bounded independence number. *FSTTCS 2018*; *Algorithmica* 85 (2023).
