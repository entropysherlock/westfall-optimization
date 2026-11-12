import itertools
import numpy as np
import pytest
from westfall_optimization.core import score

def brute_opt(A):
    n = A.shape[0]
    return max(score(A, p) for p in itertools.permutations(range(n)))

def random_instance(kind, n, rng):
    A = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            if kind == "uniform": v = rng.uniform(-1, 1)
            elif kind == "ties": v = float(rng.integers(-2, 3))
            elif kind == "neartrans": v = (1 if rng.random() > 0.15 else -1) + rng.uniform(-.05, .05)
            elif kind == "planted": v = (j - i) + 2 * rng.standard_normal()
            else: raise ValueError(kind)
            A[i, j] = v; A[j, i] = -v
    return A

@pytest.fixture
def rng():
    return np.random.default_rng(2026)
