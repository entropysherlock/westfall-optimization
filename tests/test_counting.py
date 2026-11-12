"""Theorem A (Discovery 019): |S_K| <= (n+1) P(2K + b^2), checked exhaustively on small partitions."""
import random
from westfall_optimization.blx.counting import brute_counts, dp_counts, thmS_bound

def test_square_root_bound_exhaustive():
    random.seed(7)
    parts = [[4] * 3, [1] * 12, [2] * 6, [4, 1, 4, 1, 1], [3, 3, 3, 3]]
    for n in range(2, 13):
        for _ in range(4):
            sizes, rem = [], n
            while rem:
                s = random.randint(1, min(4, rem)); sizes.append(s); rem -= s
            parts.append(sizes)
    for sizes in parts:
        bc = brute_counts(sizes, 20)
        assert bc == dp_counts(sizes, 20)
        for K in range(21):
            assert bc[K] <= thmS_bound(sizes, K)

def test_lower_bound_free_block():
    # one free block of size b gives 2^b sets with zero cross inversions
    assert dp_counts([5, 5], 0)[0] >= 2 ** 5
