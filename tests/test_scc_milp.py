"""Independent exhaustive checks of SCC decomposition, including ties and zeros."""
import itertools

import numpy as np

from westfall_optimization.core import score
from westfall_optimization.solvers.scc_milp import scc_milp_solve, _scc_partition
from westfall_optimization.blx.portfolio import solve


def _brute(A):
    return max(score(A, p) for p in itertools.permutations(range(len(A))))


def test_exhaustive_seeded_small_instances():
    rng = np.random.default_rng(28028)
    for n in range(1, 8):
        for family in ("random", "blocks", "zeros"):
            A = np.zeros((n, n))
            for i in range(n):
                for j in range(i + 1, n):
                    if family == "zeros":
                        v = 0.0
                    elif family == "blocks" and i // 3 != j // 3:
                        v = float(rng.integers(1, 10))
                    else:
                        v = float(rng.integers(-7, 8))
                    A[i, j], A[j, i] = v, -v
            result = scc_milp_solve(A)
            assert result["proved"]
            assert sorted(result["order"]) == list(range(n))
            assert abs(score(A, result["order"]) - _brute(A)) < 1e-8
            assert abs(result["OPT"] - _brute(A)) < 1e-8


def test_structural_decomposition_and_portfolio_route():
    A = np.zeros((9, 9))
    # Three directed cyclic triples, all cross edges point forward.
    for j in (0, 3, 6):
        for u, v in ((j, j + 1), (j + 1, j + 2), (j + 2, j)):
            A[u, v] = 1
            A[v, u] = -1
    for i in range(9):
        for j in range(i + 1, 9):
            if i // 3 != j // 3:
                A[i, j] = 5
                A[j, i] = -5
    assert [len(c) for c in _scc_partition(A)] == [3, 3, 3]
    r = solve(A, mode="scc_milp", milp_time_limit=30)
    assert r["status"] == "PROVED_OPTIMAL"
    assert r["scc"]["component_sizes"] == [3, 3, 3]
    assert abs(score(A, r["order"]) - r["OPT"]) < 1e-8


def test_dense_single_component_and_all_zero():
    A = np.zeros((5, 5))
    for u, v in ((0, 1), (1, 2), (2, 3), (3, 4), (4, 0)):
        A[u, v] = 2
        A[v, u] = -2
    assert len(_scc_partition(A)) == 1
    r = scc_milp_solve(A)
    assert r["proved"] and abs(r["OPT"] - _brute(A)) < 1e-8
    zeros = scc_milp_solve(np.zeros((25, 25)))
    assert zeros["proved"] and zeros["subsolver_calls"] == 0
    assert zeros["OPT"] == 0


def test_zero_budget_is_not_misrepresented_as_proof():
    A = np.zeros((3, 3))
    A[0, 1], A[1, 0] = 1, -1
    A[1, 2], A[2, 1] = 1, -1
    A[2, 0], A[0, 2] = 1, -1
    r = scc_milp_solve(A, time_limit=0)
    assert not r["proved"]
    assert r["OPT"] is None
    assert r["upper_bound"] >= r["best_found"]
