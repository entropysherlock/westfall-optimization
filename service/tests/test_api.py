"""Integration tests for the job API (real worker processes, real solvers)."""
from __future__ import annotations

import hashlib
import itertools
import random
import time
from fractions import Fraction

import pytest
from fastapi.testclient import TestClient

from westfall_service.app import create_app
from westfall_service.config import Settings
from westfall_service.jobs import JobManager
from westfall_service.model import InstanceError, build_model

SKEW = {
    "interpretation": "skew",
    "names": ["A", "B", "C", "D", "E"],
    "matrix": [[0, 3, -1, 2, 0], [-3, 0, 4, 1, -2], [1, -4, 0, 5, 2], [-2, -1, -5, 0, 1], [0, 2, -2, -1, 0]],
}


def brute(model):
    best = None
    for p in itertools.permutations(range(model.n)):
        v = model.user_objective(list(p))
        if best is None or (v < best if model.interpretation == "cost" else v > best):
            best = v
    return best


def wait(client, jid, headers=None, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        r = client.get(f"/v1/jobs/{jid}", headers=headers or {})
        assert r.status_code == 200, r.text
        if r.json()["status"] in ("completed", "failed", "cancelled"):
            return r.json()
        time.sleep(0.2)
    raise AssertionError("job did not finish")


@pytest.fixture
def client():
    return TestClient(create_app(Settings(api_key_hashes=frozenset(), allowed_origins=("http://localhost",)), JobManager(2, 5)))


def test_health(client):
    r = client.get("/v1/health")
    assert r.status_code == 200 and r.json()["ok"] and "blx-auto" in r.json()["solvers"]


@pytest.mark.parametrize("solver", ["blx-auto", "subset-dp", "milp"])
def test_exact_solvers_match_exhaustive_enumeration(client, solver):
    r = client.post("/v1/jobs", json={"instance": SKEW, "solver": solver, "time_limit_s": 60})
    assert r.status_code == 202, r.text
    job = wait(client, r.json()["id"])
    assert job["status"] == "completed", job
    res = job["result"]
    assert res["status"] == "OPTIMAL"
    assert Fraction(res["objective"]) == brute(build_model(SKEW))
    assert res["verification"]["identity_holds"]


def test_benefit_edges_with_fractions_and_offset(client):
    inst = {"interpretation": "benefit", "edges": [["x", "y", "2"], ["y", "x", "5"], ["x", "z", "1.5"], ["z", "y", "1/2"], ["y", "z", 3], ["x", "y", 1]]}
    job = wait(client, client.post("/v1/jobs", json={"instance": inst, "solver": "blx-auto"}).json()["id"])
    m = build_model(inst)
    assert m.original[0][1] == 3  # duplicate x->y edges were summed
    assert Fraction(job["result"]["objective"]) == brute(m)


def test_heuristic_never_claims_optimality(client):
    job = wait(client, client.post("/v1/jobs", json={"instance": SKEW, "solver": "local-search", "time_limit_s": 5}).json()["id"])
    assert job["result"]["status"] == "FEASIBLE"
    assert "NOT established" in job["result"]["status_note"]


@pytest.mark.parametrize("inst,msg", [
    ({"interpretation": "skew", "matrix": [[0, 1], [2, 0]]}, "not skew-symmetric"),
    ({"interpretation": "skew", "matrix": [[0, "abc"], [1, 0]]}, "not a number"),
    ({"interpretation": "nope", "matrix": [[0]]}, "interpretation"),
    ({"interpretation": "benefit", "edges": [["a", "a", 1]]}, "self-edges"),
    ({"interpretation": "benefit", "matrix": [[0, 1e13], [0, 0]]}, "exceeds"),
])
def test_validation_errors(client, inst, msg):
    r = client.post("/v1/jobs", json={"instance": inst})
    assert r.status_code == 422 and msg in r.text


def test_limits_and_cancellation():
    mgr = JobManager(1, 2)
    c = TestClient(create_app(Settings(api_key_hashes=frozenset(), allowed_origins=()), mgr))
    rng = random.Random(3)
    n = 60
    M = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = rng.randint(-9, 9)
            M[i][j], M[j][i] = v, -v
    big = {"interpretation": "skew", "matrix": M}
    assert c.post("/v1/jobs", json={"instance": big, "time_limit_s": 10_000}).status_code == 422
    a = c.post("/v1/jobs", json={"instance": big, "solver": "milp", "time_limit_s": 120}).json()["id"]
    b = c.post("/v1/jobs", json={"instance": big, "solver": "milp", "time_limit_s": 120}).json()["id"]
    d = c.post("/v1/jobs", json={"instance": big, "solver": "milp", "time_limit_s": 120}).json()["id"]
    assert c.post("/v1/jobs", json={"instance": big, "solver": "milp"}).status_code == 503  # queue full
    time.sleep(1.5)
    assert c.get(f"/v1/jobs/{a}").json()["status"] == "running"
    assert c.delete(f"/v1/jobs/{b}").json()["status"] == "cancelled"  # queued -> cancelled
    t0 = time.time()
    assert c.delete(f"/v1/jobs/{a}").json()["status"] == "cancelled"  # running -> terminated
    job = wait(c, a)
    assert job["status"] == "cancelled" and job["result"] is None
    assert time.time() - t0 < 10
    c.delete(f"/v1/jobs/{d}")
    wait(c, d)
    assert mgr.stats()["running"] == 0


def test_time_limit_is_enforced():
    c = TestClient(create_app(Settings(api_key_hashes=frozenset(), allowed_origins=()), JobManager(1, 2)))
    rng = random.Random(5)
    n = 62
    M = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            v = rng.randint(-9, 9)
            M[i][j], M[j][i] = v, -v
    t0 = time.time()
    job = wait(c, c.post("/v1/jobs", json={"instance": {"interpretation": "skew", "matrix": M}, "solver": "milp", "time_limit_s": 3}).json()["id"], timeout=30)
    assert time.time() - t0 < 20
    # either HiGHS stopped itself (feasible, not proved) or the job was killed; never a false OPTIMAL
    assert job["status"] in ("completed", "failed")
    if job["status"] == "completed":
        assert job["result"]["status"] in ("FEASIBLE", "OPTIMAL")
        if job["result"]["status"] == "OPTIMAL":
            assert job["result"]["proved_by"] == "milp"


def test_api_keys_rate_limits_and_isolation():
    k1, k2 = "key-one", "key-two"
    hashes = frozenset(hashlib.sha256(k.encode()).hexdigest() for k in (k1, k2))
    c = TestClient(create_app(Settings(api_key_hashes=hashes, allowed_origins=()), JobManager(1, 5), requests_per_minute=8, jobs_per_hour=2))
    assert c.post("/v1/jobs", json={"instance": SKEW}).status_code == 401
    assert c.post("/v1/jobs", json={"instance": SKEW}, headers={"X-API-Key": "wrong"}).status_code == 401
    jid = c.post("/v1/jobs", json={"instance": SKEW}, headers={"X-API-Key": k1}).json()["id"]
    assert c.get(f"/v1/jobs/{jid}", headers={"X-API-Key": k2}).status_code == 404  # other client cannot see it
    assert c.post("/v1/jobs", json={"instance": SKEW}, headers={"X-API-Key": k1}).status_code == 202
    assert c.post("/v1/jobs", json={"instance": SKEW}, headers={"X-API-Key": k1}).status_code == 429  # job quota
    codes = [c.get(f"/v1/jobs/{jid}", headers={"X-API-Key": k1}).status_code for _ in range(10)]
    assert 429 in codes  # request rate limit


def test_body_size_limit(client):
    r = client.post("/v1/jobs", content=b"{" + b" " * 2_100_000 + b"}", headers={"Content-Type": "application/json"})
    assert r.status_code == 413


def test_model_identity_cost():
    m = build_model({"interpretation": "cost", "matrix": [[0, 4, 1], [2, 0, 3], ["1/2", 5, 0]]})
    for p in itertools.permutations(range(3)):
        assert m.user_from_fa(m.fa(list(p))) == m.user_objective(list(p))
    with pytest.raises(InstanceError):
        build_model({"interpretation": "cost", "matrix": [[0, None], [1, 0]]})
