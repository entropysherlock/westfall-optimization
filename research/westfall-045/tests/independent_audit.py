#!/usr/bin/env python3
"""WESTFALL 045 independent finite algorithm audit; no imports from research code.

Enumerate all 4^6 loopless digraphs on four vertices (none, either arc, both).
For each, compare a constrained-cut-pruned cut-DAG solver against brute-force
permutations; independently verify the s-t min-cut reduction with Edmonds-Karp.
All arithmetic is exact integer arithmetic.
"""
from itertools import permutations, product
from functools import lru_cache

@lru_cache(None)
def H(K):
    if K == 0:
        return 1
    @lru_cache(None)
    def go(i, prev):
        if i > K:
            return 1
        return sum(go(i + 1, x) for x in range(min(prev, K // i) + 1))
    return go(1, K)

def ceil_cuberoot(n):
    r = 0
    while r**3 < n:
        r += 1
    return r

def back(weights, mask, n):
    return sum(weights[u][v] for u in range(n) for v in range(n)
               if not(mask >> u & 1) and (mask >> v & 1))

def profile(D, n):
    missing = [sum(1 for j in range(n) if j != i and
                   D[i][j] == 0 and D[j][i] == 0) for i in range(n)]
    return max(missing, default=0)

def cut_dag_solver(weights, n, k, ola=False, h=None):
    h = profile(weights, n) if h is None else h
    W = ((ceil_cuberoot(3*k) + 2)**2 + 1)//2 if ola else k
    T = (n + 1) * 4**h * H(2*W)**2
    allmask = (1 << n) - 1
    cuts = []
    # Independent exact extension oracle replaces max-flow for tiny test graphs.
    # This checks tree/DAG/threshold logic, NOT the production flow implementation.
    @lru_cache(None)
    def extendable(A, B):
        return any((X & A) == A and not (X & B) and back(weights, X, n) <= W
                   for X in range(1 << n))
    def traverse(A, B, idx):
        if not extendable(A, B):
            return False
        if idx == n:
            cuts.append(A)
            return len(cuts) > T
        if traverse(A | (1 << idx), B, idx + 1):
            return True
        return traverse(A, B | (1 << idx), idx + 1)
    if traverse(0, 0, 0):
        return False, 'threshold'
    S = set(cuts)
    if 0 not in S or allmask not in S:
        return False, 'no-path'
    reachable = {0: 0}
    for size in range(n + 1):
        for X in tuple(reachable):
            if X.bit_count() != size:
                continue
            for v in range(n):
                Y = X | 1 << v
                if Y != X and Y in S:
                    val = reachable[X] + (back(weights, Y, n) if ola else 0)
                    if Y not in reachable or val < reachable[Y]:
                        reachable[Y] = val
    if allmask not in reachable:
        return False, 'no-path'
    return (reachable[allmask] <= k if ola else True), 'path'

def exact_opt(weights, n):
    cw = 10**9
    ola = 10**9
    for perm in permutations(range(n)):
        mask = 0
        costs = []
        for v in perm:
            mask |= 1 << v
            costs.append(back(weights, mask, n))
        cw = min(cw, max(costs, default=0))
        ola = min(ola, sum(costs))
    return cw, ola

def graph_iter(n):
    pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
    for typ in product(range(4), repeat=len(pairs)):
        W = [[0]*n for _ in range(n)]
        for (u,v), t in zip(pairs, typ):
            if t in (1,3):
                W[u][v] = 1
            if t in (2,3):
                W[v][u] = 1
        yield typ,W

def audit_cw_ola():
    n = 4
    graphs = cwtests = olatests = 0
    for typ, W in graph_iter(n):
        h = profile(W,n)
        m = sum(map(sum,W))
        optcw,optola = exact_opt(W,n)
        for k in range(m+1):
            yes,why = cut_dag_solver(W,n,k,h=h)
            cwtests += 1
            if yes != (optcw <= k):
                raise AssertionError(('CW',typ,k,yes,optcw,why))
        for k in range(optola+2):
            yes,why = cut_dag_solver(W,n,k,ola=True,h=h)
            olatests += 1
            if yes != (optola <= k):
                raise AssertionError(('OLA',typ,k,yes,optola,why))
        graphs += 1
    print({'graphs':graphs,'cutwidth_decisions':cwtests,
           'ola_decisions':olatests,'mismatches':0})

def flow_oracle(weights,n,A,B):
    if not A or not B:
        return 0
    source=n
    sink=n+1
    N=n+2
    caps=[[0]*N for _ in range(N)]
    for u in range(n):
        for v in range(n):
            caps[u][v]=weights[u][v]
    M=sum(map(sum,weights))+1
    for v in range(n):
        if B>>v&1:
            caps[source][v]=M
        if A>>v&1:
            caps[v][sink]=M
    flow=0
    while True:
        parent=[-1]*N
        parent[source]=source
        queue=[source]
        for u in queue:
            for v in range(N):
                if caps[u][v]>0 and parent[v]<0:
                    parent[v]=u
                    queue.append(v)
        if parent[sink]<0:
            return flow
        bottleneck=10**10
        v=sink
        while v!=source:
            u=parent[v]
            bottleneck=min(bottleneck,caps[u][v])
            v=u
        v=sink
        while v!=source:
            u=parent[v]
            caps[u][v]-=bottleneck
            caps[v][u]+=bottleneck
            v=u
        flow+=bottleneck

def flow_audit():
    n=4
    count=0
    for typ,W in graph_iter(n):
        backtable=[back(W,X,n) for X in range(1<<n)]
        for assign in product((0,1,2),repeat=n):
            A=sum(1<<i for i,x in enumerate(assign) if x==1)
            B=sum(1<<i for i,x in enumerate(assign) if x==2)
            brute=min(backtable[X] for X in range(1<<n)
                      if (X&A)==A and (X&B)==0)
            flow=flow_oracle(W,n,A,B)
            count+=1
            if brute!=flow:
                raise AssertionError((typ,assign,brute,flow))
    print({'flow_oracle_cases':count,'mismatches':0})

if __name__=='__main__':
    audit_cw_ola()
    flow_audit()
