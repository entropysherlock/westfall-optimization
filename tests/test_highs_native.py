"""ATLAS-H experimental backend correctness and integration tests.

The core model and reconstruction tests do not require highspy. Integration
tests require it and run in the dedicated ATLAS-H GitHub Actions job.
"""
import itertools

import numpy as np
import pytest

from westfall_optimization.core import score
from westfall_optimization.solvers.highs_native import (
    _model, _order_from_binary, native_highs_solve,
)


def matrix(seed, n, ties=False):
    rng = np.random.default_rng(seed)
    a = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            a[i, j] = float(rng.integers(-3, 4 if ties else 3))
            a[j, i] = -a[i, j]
    return a


def test_model_objective_equals_negative_order_score_for_every_small_order():
    a = matrix(11, 5)
    pairs, mat, costs, offset = _model(a)
    for order in itertools.permutations(range(5)):
        pos = {v: i for i, v in enumerate(order)}
        z = np.array([int(pos[i] < pos[j]) for i, j in pairs])
        assert np.all(mat @ z >= -1e-9)
        assert np.all(mat @ z <= 1 + 1e-9)
        assert np.isclose(-costs @ z + offset, score(a, order))
        assert _order_from_binary(z, pairs, 5) == list(order)


def test_reconstruction_rejects_cyclic_tournament():
    pairs, _, _, _ = _model(matrix(1, 3))
    # 0 precedes 1, 1 precedes 2, 2 precedes 0
    assert pairs == [(0, 1), (0, 2), (1, 2)]
    assert _order_from_binary([1, 0, 1], pairs, 3) is None
    assert _order_from_binary([0.3, 1, 0], pairs, 3) is None


def test_zero_time_returns_no_false_proof_when_native_available():
    pytest.importorskip("highspy")
    a = matrix(29, 8)
    r = native_highs_solve(a, time_limit=0)
    assert not r["proved"]
    assert r["OPT"] is None
    assert sorted(r["order"]) == list(range(8))


@pytest.mark.parametrize("n", range(2, 8))
@pytest.mark.parametrize("ties", [False, True])
def test_native_highs_matches_independent_bruteforce(n, ties):
    pytest.importorskip("highspy")
    a = matrix(2026 + n, n, ties)
    target = max(score(a, order) for order in itertools.permutations(range(n)))
    r = native_highs_solve(a, time_limit=15)
    assert r["proved"], r
    assert r["independent_optimality_certificate"] is False
    assert sorted(r["order"]) == list(range(n))
    assert score(a, r["order"]) == target
    assert r["OPT"] == target


def test_public_portfolio_mode():
    pytest.importorskip("highspy")
    from westfall_optimization.blx.portfolio import solve
    a = matrix(42, 5, ties=True)
    r = solve(a, mode="native_highs", milp_time_limit=10)
    target = max(score(a, order) for order in itertools.permutations(range(5)))
    assert r["status"] == "PROVED_OPTIMAL"
    assert r["proved_by"] == "native_highs"
    assert r["OPT"] == target
    assert not r["independent_optimality_certificate"]
