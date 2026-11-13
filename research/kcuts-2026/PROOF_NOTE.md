# A hyperbola-partition bound for cuts in semicomplete digraphs

**Author:** Caleb J. Westfall (AI-assisted draft). **Status:** Independent mathematical proof draft; no specialist review, Lean verification, or novelty clearance. **Date:** 2026-11-13.

## Abstract

We give a direct Ferrers-diagram injection showing that a semicomplete digraph with a reference ordering of directed cutwidth at most (c) has at most ((n+1)H(c+k)) directed (k)-cuts, where (H(K)) counts integer partitions (lambda_1\ge\lambda_2\ge\cdots\ge0) with (i\lambda_i\le K). A finite estimate (H(K)\le (e^{2\pi\sqrt K}-1)/(2\pi\sqrt K)), for positive integer (K), yields the (2^{O(\sqrt k)}n^{O(1)}) cut-counting form when the digraph has cutwidth at most (k). This is the exact type of bound asked for in the conclusions of Fomin and Pilipczuk (ESA 2013, arXiv:1301.7314). **Priority and novelty are unestablished; do not call the 2013 question solved until an independent specialist has checked the proof and subsequent literature.**

## Definitions

Let (D=(V,E)) be a loopless **semicomplete** digraph: for every distinct (u,v), at least one of (u\to v) or (v\to u) is an arc; both are permitted. An ordering (\sigma=(v_1,\dots,v_n)) has directed cutwidth at most (c) when for every (tin\{0,\dots,n\}), at most (c) arcs go from (\{v_{t+1},\dots,v_n\}) to (\{v_1,\dots,v_t\}).

A directed (k)-cut is an **ordered** vertex bipartition ((X,Y)), (X\cup Y=V), such that at most (k) arcs go from (Y) to (X).

For a nonnegative integer (K), let
[
H(K)=\#\{\lambda=(\lambda_1,\lambda_2,\dots):
\lambda_1\ge\lambda_2\ge\cdots\ge0,quad
i\lambda_i\le K\text{ for every }i\}.
]
The all-zero partition is included.

## Theorem 1 (cut injection)

**Statement.** For any digraph (D) (semicompleteness is not needed) with a reference ordering (\sigma) of directed cutwidth at most (c), provided **every unordered pair has at least one directed arc**, the number (N_k(D)) of directed (k)-cuts satisfies
[
\boxed{N_k(D)\le(n+1)H(c+k).}
]

**Proof.** Fix an admissible cut ((X,Y)). Read the reference ordering (\sigma), writing **1** at vertices in (X) and **0** at vertices in (Y). Let (a=|X|). For (1\le i\le a), let (\lambda_i) be the number of zeros preceding the (i)-th **one counted from the right**. Then (\lambda_1\ge\lambda_2\ge\dots\ge\lambda_a\ge0).

Choose the reference cut immediately *before* the (i)-th one counted from the right. There are at least (i) vertices of (X) on the reference suffix and precisely (\lambda_i) vertices of (Y) in the reference prefix, so the rectangle contains (i\lambda_i) distinct pairs ((y,x)), (y\in Y) on the left, (x\in X) on the right.

For each such pair, semicompleteness gives either (or both) (y\to x) or (x\to y). In the first case the arc (y\to x) contributes to the *candidate* directed cut ((X,Y)), and all such arcs number at most (k). Otherwise select arc (x\to y), which contributes to the *reference* backward cut at that position, and all such arcs number at most (c). Thus (i\lambda_i\le k+c). This holds for every (i), so (\lambda\in H(c+k)).

For fixed (a), the vector ((\lambda_1,\dots,\lambda_a)) determines the binary membership word uniquely: its entries specify the number of zeros before each one, and hence the positions of all ones. Thus ((X,Y)\mapsto(a,\lambda)) is injective. There are (n+1) possible values of (a); for each there are at most (H(c+k)) partitions. Summing proves the inequality. (\square)

**Comment on the wording:** The theorem relies on semicompleteness (at least one arc for every unordered pair); the clause 'for any digraph' above should be read with the explicit covering hypothesis. The authors should simplify this wording in the final paper.

## Theorem 2 (explicit hyperbola-partition estimate)

For every positive integer (K),
[
\boxed{H(K)\le\frac{e^{2\pi\sqrt K}-1}{2\pi\sqrt K}\le e^{2\pi\sqrt K}.}
]
Also (H(0)=1).

**Proof.** Put (w_0=0), (w_i=\log(1+i^2/K)), and (b_i=\lfloor K/i\rfloor). A partition counted by (H(K)) has (\lambda_i\le b_i) and vanishes after (i=K). Write (d_i=\lambda_i-\lambda_{i+1}\ge0). Then by summation by parts,
[
\sum_{i=1}^K w_i d_i=\sum_{i=1}^K(w_i-w_{i-1})\lambda_i
\le K\sum_{i=1}^K\frac{w_i-w_{i-1}}{i}.
]
Since (w'(x)=2x/(K+x^2)) and (1/i\le1/x) on (x\in(i-1,i]),
[
K\sum_{i=1}^K\frac{w_i-w_{i-1}}{i}
\le K\int_0^\infty\frac{w'(x)}x\,dx
=\pi\sqrt K.
]

Therefore (e^{-\sum_iw_id_i}\ge e^{-\pi\sqrt K}) for each admissible partition. Summing these weights over all admissible partitions and relaxing to all unrestricted nonnegative (d_1,\dots,d_K) gives
[
H(K)e^{-\pi\sqrt K}
\le\prod_{i=1}^K(1-e^{-w_i})^{-1}
=\prod_{i=1}^K(1+K/i^2)
\le\prod_{i=1}^{\infty}(1+K/i^2).
]
Euler's sine product at imaginary argument evaluates the last product as (\sinh(\pi\sqrt K)/(\pi\sqrt K)). Multiplying by (e^{\pi\sqrt K}) completes the proof. (\square)

## Corollary (the form of the 2013 question)

If the directed cutwidth of an (n)-vertex semicomplete digraph is at most (k), choose a reference ordering of width (c\le k). Theorem 1 and Theorem 2 imply
[
N_k(D)\le(n+1)H(2k)\le
(n+1)e^{2\pi\sqrt{2k}}\quad(k\ge1).
]
For (k=0) the bound is (N_0(D)\le n+1). Hence
[
N_k(D)\le n^{O(1)}2^{O(\sqrt k)}.
]
The statement is combinatorial and is separate from any claimed practical weighted-ordering solver speedup.

## Checks and limitations

- **Proof audit needed:** verify the direction of every arc in Theorem 1, the injection when the reference graph has mutual arcs, and the infinite-product argument.
- **Known earlier literature:** Fomin and Pilipczuk, *Subexponential parameterized algorithm for computing the cutwidth of a semi-complete digraph* (ESA 2013), https://arxiv.org/abs/1301.7314 , especially §3 and conclusion. Their paper uses ordinary partition numbers for the transitive case and explicitly asks whether the `sqrt(log k)` loss can be removed in general.
- **Literature status:** targeted 2026-11-13 searches did not surface an identical modern result; this is not a complete priority review. Do not submit a novelty claim without searching later work, checking the 2019 Barbero–Paul–Pilipczuk survey/analysis, and obtaining qualified external review.
- **Formalization:** this exact full theorem is **not** claimed Lean-checked. An older structural-parameter `cut_count_bound` is not interchangeable with this semicomplete-cutwidth theorem.
- **Algorithmic implications:** the finite-(k) cut enumeration and dynamic programming from the 2013 paper suggest improved parameter dependence, but publication must explain the adapted algorithm rigorously rather than asserting consequences by analogy.
- **Numerical asymptotics:** the conjectured Airy correction to (H(K)) is a separate high-risk investigation, not used here.

## Publication pathway

1. Red-team the short injection proof with specialists and independent mechanized checks.
2. Convert the note to LaTeX, add complete precise definitions and literature comparison.
3. Formally verify the combinatorial injection and the finite bound (or clearly state what remains unformalized).
4. Ask the 2013 authors or another parameterized-complexity specialist for a mathematical review before asserting priority.
5. Submit only after novelty and rigor gates pass.
