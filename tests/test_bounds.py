"""Hybrid hereditary bound (Discovery 018 Thm 1): U_hyb(T) >= OPT(A|T) for every subset T and any partition."""
import numpy as np
from westfall_optimization.blx.hybrid import HybridBound, segment
from westfall_optimization.solvers.subset_dp import subset_dp
from westfall_optimization.solvers.local_search import insertion_ls
from conftest import random_instance

def test_hybrid_admissible_all_subsets(rng):
    n = 9
    for kind in ["uniform", "ties", "neartrans", "planted"]:
        for _ in range(2):
            A = random_instance(kind, n, rng)
            dp, _, _ = subset_dp(A)
            order = insertion_ls(A, rng.permutation(n), rng)
            for blocks in [segment(A, order, 3)[0], [list(c) for c in np.array_split(rng.permutation(n), 3)]]:
                H = HybridBound(A, blocks)
                T = np.arange(1 << n, dtype=np.int64)
                Bm = ((T[:, None] >> np.arange(n)) & 1).astype(float)
                W = 0.5 * ((Bm @ np.abs(A)) * Bm).sum(1)
                assert np.all(W - 2 * H.lower_beta(T) >= dp - 1e-9)
