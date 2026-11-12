import copy
import numpy as np
import pytest
import westfall_optimization as w
from westfall_optimization.certificates.make_cert import make_certificate
from westfall_optimization.certificates.verify_exact import verify, Reject
from westfall_optimization.blx.hybrid import HybridBound, segment
from westfall_optimization.solvers.subset_dp import subset_dp
from conftest import random_instance

def _cert(A, rng, bmax=4):
    n = A.shape[0]
    r = w.solve(A, mode="sldp")
    blocks, _ = segment(A, r["incumbent_order"], bmax)
    cert, _, _ = make_certificate(A, r["incumbent_order"], HybridBound(A, blocks))
    return cert

def test_genuine_certificates_accepted(rng):
    for kind in ["uniform", "ties", "neartrans", "planted"]:
        A = random_instance(kind, 10, rng)
        res = verify(_cert(A, rng), A_input=A)
        assert abs(res["OPT"] - subset_dp(A)[0][-1]) < 1e-9

def test_tampering_rejected(rng):
    A = random_instance("neartrans", 10, rng)
    cert = _cert(A, rng)
    bad = []
    c = copy.deepcopy(cert); k = max(range(1, 10), key=lambda i: len(c["layers"][i])); c["layers"][k] = c["layers"][k][1:]; bad.append(c)
    c = copy.deepcopy(cert); c["order"] = c["order"][::-1]; bad.append(c)
    c = copy.deepcopy(cert); c["A"][0][1] += 1; bad.append(c)
    c = copy.deepcopy(cert); c["layers"][9] = []; bad.append(c)
    if cert["pack"]:
        c = copy.deepcopy(cert); m, y = c["pack"][0]; c["pack"][0] = (m, 3 * y + c["D"]); bad.append(c)
    for c in bad:
        with pytest.raises(Reject):
            verify(c)

def test_binding_to_input(rng):
    A = random_instance("ties", 9, rng)
    cert = _cert(A, rng)
    verify(cert, A_input=A)
    A2 = A.copy(); A2[0, 1] += 1; A2[1, 0] -= 1
    with pytest.raises(Reject):
        verify(cert, A_input=A2)
