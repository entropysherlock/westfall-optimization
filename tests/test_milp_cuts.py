"""Mission 029: exact independent checks of incremental triangle MILP."""
import itertools

import numpy as np

from westfall_optimization.core import score
from westfall_optimization.solvers.milp_cuts import (
    adaptive_milp_solve, milp_cuts_solve, preference_cycle_fraction,
)
from westfall_optimization.blx.portfolio import solve


def make(n, family, seed):
    rng = np.random.default_rng(seed)
    A = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            if family == "random":
                v = float(rng.integers(-6, 7))
            elif family == "near":
                v = float((1 if rng.random() > .04 else -1) * rng.integers(1, 7))
            elif family == "block":
                v = float(rng.integers(1, 6) if i // 4 != j // 4
                          else rng.integers(-6, 7))
            else:
                v = 0.0
            A[i, j], A[j, i] = v, -v
    return A


def test_small_instances_against_independent_exhaustive_oracle():
    for n in range(1, 8):
        for family in ("random", "near", "block", "zero"):
            A = make(n, family, 1292 + n)
            optimum = max(score(A, p) for p in itertools.permutations(range(n)))
            for method in (milp_cuts_solve, adaptive_milp_solve):
                result = method(A, time_limit=5)
                assert result["proved"], (n, family, method.__name__)
                assert sorted(result["order"]) == list(range(n))
                assert abs(result["OPT"] - optimum) < 1e-8


def test_adaptive_routes():
    near = make(24, "near", 29029 + 24)
    random = make(24, "random", 29029 + 24)
    assert preference_cycle_fraction(near) < .08
    assert preference_cycle_fraction(random) > .08
    assert adaptive_milp_solve(near)["strategy"] == "incremental_triangle"
    assert adaptive_milp_solve(random)["strategy"] == "full_triangle"


def test_proof_status_safe_with_zero_time():
    A = make(7, "random", 29)
    result = milp_cuts_solve(A, time_limit=0)
    assert not result["proved"]
    assert result["OPT"] is None
    assert result["upper_bound"] >= result["best_found"]
    assert sorted(result["order"]) == list(range(7))


def test_portfolio_integration():
    A = make(7, "near", 8)
    result = solve(A, mode="adaptive_milp", milp_time_limit=10)
    assert result["status"] == "PROVED_OPTIMAL"
    assert result["proved_by"] == "adaptive_milp"
    assert abs(score(A, result["order"]) - result["OPT"]) < 1e-8
