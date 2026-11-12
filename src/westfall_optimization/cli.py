"""Command-line interface.

    westfall-opt solve  INSTANCE.json [--mode auto|blx|sldp|milp|subset_dp] [--certificate CERT.json] [--out SOL.json]
    westfall-opt verify CERT.json [--instance INSTANCE.json]
    westfall-opt lolib  PATH  [same options as solve]

INSTANCE.json: {"matrix": [[...], ...]} with a skew-symmetric matrix (integers or decimals).
"""
from __future__ import annotations

import argparse
import json
import sys

import numpy as np

from .blx.portfolio import solve
from .certificates.make_cert import make_certificate
from .certificates.verify_exact import Reject, verify
from .core import read_lolib


def _load_instance(path):
    with open(path) as fh:
        d = json.load(fh)
    return np.array(d["matrix"], dtype=float)


def _cmd_solve(A, args):
    res = solve(A, mode=args.mode, milp_time_limit=args.milp_time_limit)
    H = res.pop("_H", None)
    sol = {k: v for k, v in res.items() if k not in ("features",) or True}
    if args.certificate:
        if res["status"] != "PROVED_OPTIMAL" or res.get("proved_by") == "milp":
            print("certificate: only produced for exclusion-DP routes (sldp/blx); MILP proofs are not certificates",
                  file=sys.stderr)
        else:
            cert, _, _ = make_certificate(A, res["incumbent_order"], H)
            with open(args.certificate, "w") as fh:
                json.dump(cert, fh)
            try:
                v = verify(cert, A_input=A)
                sol["certificate_verified"] = True
                sol["verified_OPT"] = v["OPT"]
            except Reject as e:
                sol["certificate_verified"] = False
                sol["status"] = "CERTIFICATE_REJECTED"
                sol["verifier_message"] = str(e)
    text = json.dumps(sol, indent=2, default=lambda o: o.tolist() if hasattr(o, "tolist") else str(o))
    if args.out:
        open(args.out, "w").write(text)
    print(text)


def main(argv=None):
    p = argparse.ArgumentParser(prog="westfall-opt")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("solve", "lolib"):
        s = sub.add_parser(name)
        s.add_argument("path")
        s.add_argument("--mode", default="auto", choices=["auto", "blx", "sldp", "milp", "subset_dp"])
        s.add_argument("--milp-time-limit", type=float, default=30.0)
        s.add_argument("--certificate")
        s.add_argument("--out")
    v = sub.add_parser("verify")
    v.add_argument("certificate")
    v.add_argument("--instance")
    args = p.parse_args(argv)
    if args.cmd == "solve":
        _cmd_solve(_load_instance(args.path), args)
    elif args.cmd == "lolib":
        _cmd_solve(read_lolib(args.path), args)
    else:
        cert = json.load(open(args.certificate))
        A = _load_instance(args.instance) if args.instance else None
        try:
            r = verify(cert, A_input=A)
            print(json.dumps(dict(result="ACCEPTED", **r)))
        except Reject as e:
            print(json.dumps(dict(result="REJECTED", reason=str(e))))
            sys.exit(1)


if __name__ == "__main__":
    main()
