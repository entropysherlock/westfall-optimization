import numpy as np
import pytest
import westfall_optimization as w
from conftest import brute_opt, random_instance

@pytest.mark.parametrize("mode", ["auto", "blx", "sldp", "milp", "subset_dp"])
def test_modes_match_brute_force(mode, rng):
    for kind in ["uniform", "ties", "neartrans", "planted"]:
        for _ in range(2):
            A = random_instance(kind, 7, rng)
            r = w.solve(A, mode=mode)
            assert r["status"] == w.PROVED
            assert abs(r["OPT"] - brute_opt(A)) < 1e-9
            assert abs(w.score(A, r["order"]) - r["OPT"]) < 1e-9

def test_known_paley_optima():
    assert abs(w.solve(w.perturbed_paley(11))["OPT"] - 15.52614286834) < 1e-8
    assert abs(w.solve(w.perturbed_paley(19), mode="sldp")["OPT"] - 44.4475053820) < 1e-8

def test_rejects_non_skew():
    with pytest.raises(ValueError):
        w.solve(np.array([[0, 1], [1, 0]]))

def test_trivial_sizes():
    assert w.solve(np.zeros((1, 1)))["status"] == w.PROVED
    r = w.solve(np.array([[0.0, -2.0], [2.0, 0.0]]))
    assert r["order"] == [1, 0] and r["OPT"] == 2.0
