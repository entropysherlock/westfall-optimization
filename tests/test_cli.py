import json, subprocess, sys
import westfall_optimization as w

def test_cli_solve_and_verify(tmp_path):
    A = w.perturbed_paley(11)
    inst = tmp_path / "inst.json"; inst.write_text(json.dumps({"matrix": A.tolist()}))
    cert = tmp_path / "cert.json"
    out = subprocess.run([sys.executable, "-m", "westfall_optimization.cli", "solve", str(inst), "--mode", "blx",
                          "--certificate", str(cert)], capture_output=True, text=True, check=True).stdout
    sol = json.loads(out)
    assert sol["status"] == "PROVED_OPTIMAL" and sol["certificate_verified"] is True
    v = subprocess.run([sys.executable, "-m", "westfall_optimization.cli", "verify", str(cert), "--instance", str(inst)],
                       capture_output=True, text=True)
    assert v.returncode == 0 and json.loads(v.stdout)["result"] == "ACCEPTED"
