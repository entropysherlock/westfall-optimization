import itertools, random
from counting import brute_counts, dp_counts, thmA_bound
random.seed(0); viol=0; checked=0; mism=0
parts=[]
for n in range(2,17):
    for _ in range(12):
        sizes=[]; rem=n
        while rem: s=random.randint(1,min(4,rem)); sizes.append(s); rem-=s
        parts.append(sizes)
parts+= [[4]*4,[1]*16,[2]*8,[4,1,4,1,4,1,1],[3,3,3,3,3,1]]
for sizes in parts:
    Kmax=20; bc=brute_counts(sizes,Kmax); dc=dp_counts(sizes,Kmax); mism+= bc!=dc
    for K in range(Kmax+1):
        checked+=1
        if bc[K]>thmA_bound(sizes,K): viol+=1; print("VIOLATION",sizes,K,bc[K],thmA_bound(sizes,K))
print(f"{len(parts)} partitions (n<=16, blocks<=4), K=0..20: brute-vs-DP count mismatches={mism}, Theorem-A bound violations={viol} / {checked}")
