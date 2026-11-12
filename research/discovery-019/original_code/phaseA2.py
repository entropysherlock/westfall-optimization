import random, math
from counting import brute_counts, dp_counts, thmS_bound, P
from asym import counts
random.seed(1); viol=0; checked=0; tight=[]
parts=[]
for n in range(2,17):
    for _ in range(15):
        sizes=[]; rem=n
        while rem: s=random.randint(1,min(4,rem)); sizes.append(s); rem-=s
        parts.append(sizes)
parts+=[[4]*4,[1]*16,[2]*8,[4,1,4,1,4,1,1],[3,3,3,3,3,1],[4,4,4,4],[1,4,1,4,1,4,1]]
for sizes in parts:
    bc=brute_counts(sizes,30)
    for K in range(31):
        checked+=1; B=thmS_bound(sizes,K)
        if bc[K]>B: viol+=1; print("VIOLATION",sizes,K)
        tight.append(math.log2(B)/math.log2(max(bc[K],2)))
print(f"exhaustive: {len(parts)} partitions, {checked} (partition,K) checks, square-root-bound violations = {viol}; log-ratio bound/true: median {sorted(tight)[len(tight)//2]:.2f}")
# large-n exact counts (DP) vs bound, equal blocks
for b in [2,4,8,16]:
    for K in [16,64,256]:
        m=max(4,(2*K+2*b)//b+4); n=m*b; C=counts(b,m,K)
        B=(n+1)*P(2*K+b*b)
        print(f"b={b:>2} K={K:>3} n={n:>4}: log2|S_K| = {math.log2(C):7.2f}   log2 bound = {math.log2(B):7.2f}   ok={C<=B}")
