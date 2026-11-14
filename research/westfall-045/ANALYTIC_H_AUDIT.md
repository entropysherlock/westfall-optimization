# Mission 045 — An elementary proof of the hyperbola-partition exponential estimate

**Paper proof independently rederived; not Lean formalized.**

Let H(K) count integer partitions λ₁≥λ₂≥…≥0 with i λ_i≤K for all i≥1. H(0)=1. For K≥1, λ_i=0 for i>K.

Define w(0)=0 and w(x)=log(1+x²/K) for x>0, and let d_i=λ_i−λ_{i+1}≥0. Summation by parts gives

    S=Σ_{i=1}^K w(i)d_i
     =Σ_{i=1}^K (w(i)−w(i−1))λ_i
     ≤ K Σ_{i=1}^K (w(i)−w(i−1))/i
     ≤ K ∫₀^∞ w'(x)/x dx
     = K ∫₀^∞ 2/(K+x²) dx
     = π√K.

The second inequality follows from w increasing, and for x∈(i−1,i] the inequality 1/i≤1/x; the integral at zero is finite because w'(x)/x=2/(K+x²).

Thus each admissible λ contributes exp(−S)≥exp(−π√K) to the unrestricted sum over all nonnegative difference vectors (d₁,…,d_K). The unrestricted sum factorizes:

    H(K) exp(−π√K)
      ≤ ∏_{i=1}^K (1−exp(−w(i)))^{−1}
      = ∏_{i=1}^K (1+K/i²).

Instead of invoking Euler's infinite product for sinh, use the elementary decreasing-function comparison f(x)=log(1+K/x²):

    Σ_{i=1}^K f(i) ≤ ∫₀^∞ f(x) dx = π√K.

The identity follows by substituting x=√K t and integrating by parts:

    ∫₀^∞ log(1+1/t²) dt
       = 2 ∫₀^∞ 1/(1+t²) dt = π.

The boundary term t log(1+1/t²)→0 at t→0 and ∞. Consequently

    log H(K) ≤ π√K + π√K = 2π√K,

giving **H(K)≤exp(2π√K)** for every K≥0.

This proof avoids the special-function infinite product used in the Mission 040 manuscript, using only elementary calculus and product factorization. It does NOT yield the manuscript's slightly sharper factor (exp(2π√K)−1)/(2π√K); the weaker bound is entirely sufficient for the claimed FPT exponents.

Independent exact-integer computations of H for K = 0,1,2,3,5,10,20,50,100 agree with the Mission 040 values and all satisfy the inequality. Numerical checks are secondary to the universal argument.

**Formalization gap:** Lean verifies H as a finite partition-count function and the sharp cut-count inequality, but neither this analytic exponential bound nor its real analysis ingredients have been kernel-checked. Record that distinction in all paper claims.
