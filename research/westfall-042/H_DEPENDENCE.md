# Mission 042: h dependence — a stronger counting theorem

## NEW PAPER THEOREM: R_h(K) <= binomial(2h,h) H(K) <= 4^h H(K)

Recall R_h(K) is the number of weakly decreasing h-tuples lambda_1 >= ... >= lambda_h >= 0 satisfying i*(lambda_i - h)_+ <= K for every i=1,...,h.

**Proof.** For such a lambda set nu_i = (lambda_i-h)_+ and tau_i = min(lambda_i,h). Both nu and tau are weakly decreasing, and lambda_i = nu_i+tau_i. The nu tuple has i*nu_i<=K, so its positive entries form a Ferrers partition under the hyperbola, with at most H(K) possibilities (padding zeros beyond h). The tau tuple is a partition lying in an h by h box, with exactly binomial(2h,h) possibilities, by the standard lattice-boundary-path bijection. The map lambda -> (nu,tau) is injective. Thus R_h(K) <= binomial(2h,h) H(K) <= 4^h H(K). QED.

At h=0 the statement reads R_0(K)=1<=H(K), valid.

## Corollary: improved defect-sensitive count

Mission 041's kernel-checked counting theorem is N_k(D) <= (n+1) R_h(c+k) H(c+k). Combine with the inequality above to obtain, for every h-semicomplete digraph with a reference ordering of width at most c,

    N_k(D) <= (n+1) binomial(2h,h) [H(c+k)]^2
           <= (n+1) 4^h exp(4*pi*sqrt(c+k)).

For yes-instances of cutwidth <=k, c<=k, so N_k <= (n+1) 4^h exp(4*pi*sqrt(2k)). Therefore the thresholded cut enumeration algorithm from Mission 041 runs in

    2^{O(sqrt(k)+h)} n^{O(1)}.

For directed optimal linear arrangement cost <=k, every prefix width is O(k^(2/3)), and the same procedure runs in

    2^{O(k^(1/3)+h)} n^{O(1)}.

These improve the formerly claimed h log(k+h) dependence to additive h IN THE EXPONENT. Fixed-h dependence in k remains ETH-tight (subject to the published lower bound as cited). The independent-block lower bound shows 2^{Omega(h)} cuts are sometimes unavoidable for any all-k-cuts enumerator at K=0. Thus the exponential dependence on h is now optimal in form for that enumeration paradigm, though not necessarily for deciding the problem.

## Sanity checks

Independent Python count computed exact R_h(K) by dynamic programming and H(K) by partition recursion. Tested every 0<=h<=8 and 0<=K<=19 (180 pairs): zero violations of R_h(K) <= 4^h H(K). The proof, not the experiment, establishes the theorem for all parameters.

## Status and limits

PAPER PROOF ONLY in Mission 042. NOT Lean kernel checked. Depends on the stated definition of R_h and the Mission 041 counting theorem. The exponential bound on H comes from Mission 040's paper analytic argument (not Lean formalized). This is a *simple but material* improvement; no claim of external novelty or Level 4. It should be formalized before use as a headline theorem.

The earlier uncertainty 'is h log k necessary?' is answered negatively for this upper bound, but this does not establish an independent ETH lower bound involving h.
