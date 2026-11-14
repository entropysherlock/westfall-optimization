#!/usr/bin/env python3
"""Independent, exact-integer validation of the Mission 042 R_h(K) bound.

Run: python research/westfall-042/tests/test_bound042.py
This does not import the WESTFALL computation library.
"""
from functools import lru_cache
from math import comb

@lru_cache(None)
def H(K):
    if K == 0: return 1
    @lru_cache(None)
    def count(i, previous):
        if i > K: return 1
        return sum(count(i + 1, v) for v in range(min(previous, K // i) + 1))
    return count(1, K)

@lru_cache(None)
def R(h, K):
    @lru_cache(None)
    def count(i, previous):
        if i > h: return 1
        return sum(count(i + 1, v) for v in range(min(previous, K // i + h) + 1))
    return count(1, K + h)

def test():
    count = 0
    for h in range(9):
        for K in range(20):
            r, hk = R(h, K), H(K)
            assert r <= comb(2 * h, h) * hk, (h, K, r, hk)
            assert comb(2 * h, h) <= 4 ** h
            count += 1
    assert [H(k) for k in range(8)] == [1,2,5,10,26,42,118,171]
    assert (R(0,3),R(1,0),R(1,2),R(2,1)) == (1,2,4,9)
    print(f"PASS: {count} sharpened-bound cases, exact integers")

if __name__ == "__main__":
    test()
