# NT-037: An exact tilted-walk representation for hyperbola-constrained partitions

**Caleb J. Westfall, with AI assistance. 2026-11-13.**

**Status:** Exact identities and elementary normalization bounds below are proved; the nonstationary Airy spectral limit is a **conjecture**, not a theorem. No Lean verification or external specialist audit.

## 1. Counting problem

For integer (K\ge1), let
[
H(K)=\#\{\lambda_1\ge\lambda_2\ge\cdots\ge0:
i\lambda_i\le K\}.
]
Write (b_i=\lfloor K/i\rfloor) for (1\le i\le K), (b_{K+1}=0). Define (w_0=0), (w_i=\log(1+i^2/K)), (Δ w_i=w_i-w_{i-1}), (q_i=e^{-w_i}=K/(K+i^2)). Take independent geometric random variables
[
\Pr(d_i=r)=(1-q_i)q_i^r,\qquad r\in\mathbb Z_{\ge0}.
]
Let (Λ_i=\sum_{j=i}^K d_j), event (ᵍ_K=\{\Lambda_i\le b_i\ \forall i\}), and (z_i=b_i-\Lambda_i).

## 2. Exact expectation identity (proved)

Set (Z_K=\prod_{i=1}^K(1+K/i^2)) and (A_K=\log Z_K+\sum_{i=1}^K\Delta w_i b_i). Then
[
\boxed{H(K)=e^{A_K}Q_K,\qquad
Q_K=\mathbb E\left[\mathbf1_{\mathcal A_K}
\exp\left(-\sum_{i=1}^K\Delta w_i z_i\right)\right].}
]
Indeed, the joint geometric probability of (d) is
(Z_K^{-1}\exp(-\sum_iw_id_i)). Summation by parts gives
(\sum_i w_i d_i=\sum_i\Delta w_i\Lambda_i), so multiplying by the gap penalty cancels every (Λ_i) term, leaving (Z_K^{-1}\exp(-\sum_i\Delta w_i b_i)) for every admissible partition. Sum over the (H(K)) admissible configurations.

## 3. Exact finite-state transfer kernels (proved)

For (z_{K+1}=0), (m_i=b_i-b_{i+1}\ge0), one has
(z_i=z_{i+1}+m_i-d_i).
The nonnegative operator acting from previous gap (z) to next gap (y) is
[
T_i(z,y)=(1-q_i)q_i^{z+m_i-y}
e^{-\Delta w_i y}\mathbf1_{\{0\le y\le z+m_i\}}.
]
The product of these kernels, started at (z_{K+1}=0) and summed over final (z_1), equals (Q_K) **exactly**. In the bulk the operators have a tilted geometric random-walk structure, but the hard-wall boundary and floor increments must be handled together.

## 4. Deterministic leading normalization (proved)

The exact Euler product identity gives
[
\prod_{j\ge1}(1+K/j^2)=\frac{\sinh(\pi\sqrt K)}{\pi\sqrt K}.
]
For the omitted tail (j>K), (\log(1+x)=x+O(x^2)) and integral comparison imply
[
\sum_{j>K}\log(1+K/j^2)=1+O(K^{-1}).
]
Therefore
[
\boxed{\log Z_K=\pi\sqrt K-\log(2\pi\sqrt K)-1+O(K^{-1})}.
]
(The exponentially tiny contribution from (\sinh) is absorbed.)

Moreover, with (w'(x)=2x/(K+x^2)), the sum (S_K=\sum_i \Delta w_i b_i) satisfies
[
S_K=\pi\sqrt K+O(\log K).
]
An elementary argument bounds the floor-error by (∑_i\Delta w_i=O(\log K)), and the Riemann-sum error in (K\sum_i\Delta w_i/i) by (O(\log K)). Hence
[
\boxed{A_K=2\pi\sqrt K+O(\log K).}
]
Thus determining the (K^{1/6}) term of (\log H(K)) reduces to the exact survival/tilt factor (Q_K).

## 5. Candidate Airy spectral limit (NOT proved)

Take (N=\sqrt K) and (i\approx Ns), (s\in[a,b]\subset(0,\infty)). Locally the geometric increment has mean (s^{-2}), variance
[
\sigma^2(s)=\frac{1+s^2}{s^4},
]
and (Δ w_i\sim q(s)/N) with (q(s)=2s/(1+s^2)). The heuristic limiting hard-wall Schrödinger operator is
[
\mathcal L_s=-\frac{\sigma^2(s)}2\frac{d^2}{dz^2}+q(s)z
\quad(z\ge0,\ \psi(0)=0).
]
Its lowest eigenvalue is
[
E_0(s)=|a_1|\Bigl(\frac{2}{s^2(1+s^2)}\Bigr)^{1/3},
]
where (a_1\approx-2.338107410) is the first Airy zero. The candidate integrated energy is
[
\boxed{c_{\rm Airy}=\int_0^\infty E_0(s)ds
=\frac{|a_1|}{2^{2/3}}\frac{\Gamma(1/6)^2}{\Gamma(1/3)}
\approx17.0353382317316.}
]
The beta-integral evaluation is correct **for this continuum operator**, but the entire spectral limit requires proof.

The conjecture is
[
\log H(K)=2\pi\sqrt K-c_{\rm Airy}K^{1/6}+o(K^{1/6}).
]
The further (+(1/3)\log K+O(1)) numerical conjecture is more speculative and should not be claimed without separate boundary/prefactor theory.

## 6. Exact remaining proof obligations

**A. Bulk local-limit lemma.** For (0<a<b<\infty), prove a spectral asymptotic for the PRODUCT of non-identical exact transfer operators (not simply a constant-coefficient walk). Need uniform control of gap states and a rigorous choice of block size between (N^{2/3}) and (N).

**B. Floor-increment homogenization.** The deterministic (m_i=\lfloor K/i\rfloor-\lfloor K/(i+1)\rfloor) can oscillate. Prove it has no contribution of order (N^{1/3}=K^{1/6}) that changes the putative Airy operator or its boundary condition.

**C. Endpoints.** Bound the intervals (i<aN) and (i>bN) and show their contributions vanish on the (N^{1/3}) scale after (a\downarrow0,b\uparrow\infty). The local diffusivity diverges as (s\downarrow0); one cannot simply extend bulk estimates to the singular endpoints.

**D. Normalization and moving boundaries.** Extract the transfer-operator normalization exactly; show no extra (K^{1/6}) term is hidden in boundary-state preparation or terminal summation.

**E. Novelty.** Compare with existing Airy-limit area-tilted walk methods: Ioffe, Shlosman and Velenik, *An invariance principle to Ferrari–Spohn diffusions*, Commun. Math. Phys. 336 (2015) 905–932, https://arxiv.org/abs/1403.5073 ; Ioffe, Velenik and Wachtel, *Dyson Ferrari–Spohn diffusions and ordered walks under area tilts*, https://arxiv.org/abs/1601.04444 . Neither reference has been shown to imply the nonstationary hyperbola-partition theorem verbatim.

## 7. Audit findings

- **Proved:** The exact expectation/transfer identities; the deterministic (Z_K) expansion; (A_K=2\pi\sqrt K+O(\log K)).
- **Unproved:** Any uniform spectral approximation for the nonstationary kernels; the (K^{1/6}) limit; the logarithmic prefactor; originality.
- **Numerics:** The 2026-11-13 NT-035 experiment reports exact integer checks to (K=10^6), float64 double-normalization agreement to (K=350\cdot10^6), and a fitted sixth-power coefficient near 17.0384. These values are evidence, not a substitute for the spectral theorem.

**Conclusion:** This note establishes a reproducible mathematically exact reduction and isolates the hard proof lemma. No claim that the Airy conjecture is solved.
