"""Mission 028: partitions under a hyperbola. H(K) = #{l_1 >= l_2 >= ... >= 0 : i * l_i <= K for all i}.

Checks (exact big-integer arithmetic for H; floats only for logarithms, with a 1e-9 guard):
  1. Theorem 1:  ln H(K) <= W(K) <= 2*pi*sqrt(K), where W(K) is the weight bound of the proof, for K = 1..3000.
  2. Two independent implementations of H agree for K < 26.
  3. Theorem 2 (lower bound): the explicit rectangle-chain family is contained in the hyperbola class
     (verified by brute-force membership for small K) and its exact size L(K) <= H(K) for all tested K.
  4. The limiting Riemann sums of Theorem 2 approach 2*pi, and ln H(K)/sqrt(K) increases towards 2*pi."""
import json, math, sys
from math import comb
sys.set_int_max_str_digits(0)

def H(K):
    """Exact value by dynamic programming over the index i = K, K-1, ..., 1."""
    g = [1]                                   # g[v] = number of admissible tails (l_i, l_{i+1}, ...) with l_i <= v
    for i in range(K, 0, -1):
        cap = K // i; ng = [0] * (cap + 1); acc = 0; lg = len(g) - 1
        for v in range(cap + 1):
            acc += g[v if v <= lg else lg]; ng[v] = acc
        g = ng
    return g[-1]

def H_enum(K):
    """Independent implementation: explicit recursive enumeration of the partitions."""
    def rec(i, top):
        cap = min(top, K // i)
        if cap == 0: return 1
        return 1 + sum(rec(i + 1, v) for v in range(1, cap + 1))   # 1 = stop here (all remaining parts zero)
    return rec(1, K)

def weight_bound(K):
    """W(K) = sum_i ln(1 + K/i^2) + K * sum_i (w_i - w_{i-1}) / i with w_i = ln(1 + i^2/K)  (proof of Theorem 1)."""
    s = 0.0; wprev = 0.0
    for i in range(1, K + 1):
        w = math.log1p(i * i / K); s += math.log1p(K / (i * i)) + K * (w - wprev) / i; wprev = w
    return s

def chain(K, alpha, beta, N):
    """Anchors of the lower-bound construction: x_j = floor(sqrt(K) * alpha * rho^j), y_j = floor(K / x_{j+1})."""
    rho = (beta / alpha) ** (1.0 / N)
    x = [int(math.sqrt(K) * alpha * rho ** j) for j in range(N + 2)]
    if x[0] < 1 or any(x[j + 1] <= x[j] for j in range(N + 1)): return None
    y = [K // x[j + 1] for j in range(N + 1)]
    return x, y

def chain_count(K, alpha, beta, N):
    """Exact number of partitions built by the construction: prod_j C(dx_j + dy_j, dx_j). Returns 0 if degenerate."""
    c = chain(K, alpha, beta, N)
    if c is None: return 0
    x, y = c; out = 1
    for j in range(N):
        out *= comb((x[j + 1] - x[j]) + (y[j] - y[j + 1]), x[j + 1] - x[j])
    return out

def chain_members(K, alpha, beta, N):
    """All partitions of the construction, explicitly (small K only), to test membership and distinctness."""
    c = chain(K, alpha, beta, N)
    if c is None: return []
    x, y = c
    def seqs(length, lo, hi):                   # non-increasing sequences with values in [lo, hi]
        if length == 0: yield (); return
        for v in range(hi, lo - 1, -1):
            for rest in seqs(length - 1, lo, v): yield (v,) + rest
    parts = [()]
    for j in range(N):
        parts = [p + s for p in parts for s in seqs(x[j + 1] - x[j], y[j + 1], y[j])]
    return [(y[0],) * x[0] + p for p in parts]

def riemann(alpha, beta, N):
    """Limit of ln(chain_count)/sqrt(K) as K -> infinity: sum_j (s_{j+1}-s_j) * phi_rho(s_j)."""
    rho = (beta / alpha) ** (1.0 / N); tot = 0.0
    for j in range(N):
        s = alpha * rho ** j; a = s * (rho - 1); b = (rho - 1) / (s * rho * rho); p = a / (a + b)
        tot += (a + b) * (-p * math.log(p) - (1 - p) * math.log(1 - p))
    return tot

if __name__ == '__main__':
    res = {}
    res['H_0_to_15'] = [H(K) for K in range(16)]; print(res['H_0_to_15'])
    assert all(H(K) == H_enum(K) for K in range(26)); res['two_implementations_agree_below'] = 26
    worst = 0
    for K in range(1, 3001):
        h = math.log(H(K)); wb = weight_bound(K); tp = 2 * math.pi * math.sqrt(K)
        assert h <= wb + 1e-9 and wb <= tp + 1e-9, K
        worst = max(worst, h / tp)
    res['theorem1_checked_K'] = [1, 3000]; res['max_lnH_over_2pi_sqrtK'] = round(worst, 4)
    print('Theorem 1: ln H(K) <= W(K) <= 2 pi sqrt(K) for K = 1..3000; max ln H / (2 pi sqrt K) =', round(worst, 4))
    # Theorem 2, validity of the construction: members are distinct elements of the hyperbola class
    tested = 0
    for K in range(4, 201):
        for (al, be, N) in [(0.5, 2.0, 2), (0.4, 2.5, 3), (0.3, 3.0, 4), (0.6, 1.8, 1)]:
            if not 0 < chain_count(K, al, be, N) <= 20000: continue
            mem = chain_members(K, al, be, N)
            assert len(set(mem)) == len(mem) == chain_count(K, al, be, N)
            for lam in mem:
                assert all(lam[i] >= lam[i + 1] for i in range(len(lam) - 1)) and all((i + 1) * v <= K for i, v in enumerate(lam))
            assert len(mem) <= H(K); tested += 1
    res['construction_membership_cases'] = tested; print('Theorem 2 construction: membership/distinctness verified in', tested, 'cases')
    rows = []
    for K in [10 ** 3, 10 ** 4, 10 ** 5, 10 ** 6]:
        hk = math.log(H(K)); best = 0
        for (al, be, N) in [(0.2, 5, 8), (0.1, 10, 16), (0.05, 20, 30), (0.03, 30, 50), (0.02, 50, 80)]:
            cc = chain_count(K, al, be, N)
            assert cc <= H(K)
            if cc: best = max(best, math.log(cc))
        rows.append(dict(K=K, lnH_over_sqrtK=round(hk / math.sqrt(K), 4), best_construction_over_sqrtK=round(best / math.sqrt(K), 4)))
        print(rows[-1], flush=True)
    res['finite_K'] = rows
    rs = [dict(alpha=al, beta=be, N=N, riemann_sum=round(riemann(al, be, N), 5))
          for (al, be, N) in [(0.1, 10, 20), (0.01, 100, 200), (1e-3, 1e3, 2000), (1e-4, 1e4, 20000), (1e-6, 1e6, 400000)]]
    for r in rs: print(r)
    res['riemann_sums'] = rs; res['two_pi'] = round(2 * math.pi, 5)
    conv = []
    for e in range(0, 14):
        K = 100 * 2 ** e; h = math.log(H(K)); r = math.sqrt(K)
        conv.append(dict(K=K, lnH_over_sqrtK=round(h / r, 4))); print(conv[-1], flush=True)
    res['convergence'] = conv
    json.dump(res, open('hyper_results.json', 'w'), indent=1)
