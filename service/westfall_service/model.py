"""Instance validation and the exact model transformation (mirrors website/src/lib/studio/model.ts).

objective identities (S = sum of all off-diagonal original entries):
    skew:    objective = F_A                    (maximise)
    benefit: objective = (F_A + S) / 2, A = C - C^T   (maximise)
    cost:    objective = (S - F_A) / 2, A = D^T - D   (minimise)
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from fractions import Fraction

from .config import LIMITS

INTERPRETATIONS = ("skew", "benefit", "cost")


class InstanceError(ValueError):
    """Raised with a user-facing message when an instance is invalid."""


def _q(x, where: str) -> Fraction:
    if isinstance(x, bool) or x is None:
        raise InstanceError(f"{where}: expected a number")
    if isinstance(x, int):
        q = Fraction(x)
    elif isinstance(x, float):
        if not math.isfinite(x):
            raise InstanceError(f"{where}: not a finite number")
        q = Fraction(repr(x))
    elif isinstance(x, str):
        s = x.strip()
        if not s or len(s) > 64:
            raise InstanceError(f"{where}: not a number")
        try:
            q = Fraction(s)
        except (ValueError, ZeroDivisionError):
            raise InstanceError(f"{where}: {s[:20]!r} is not a number") from None
    else:
        raise InstanceError(f"{where}: expected a number")
    if abs(q) > LIMITS.max_abs_value:
        raise InstanceError(f"{where}: |value| exceeds 10^12")
    return q


@dataclass
class Model:
    names: list[str]
    interpretation: str
    original: list[list[Fraction]]
    A: list[list[Fraction]]
    offset: Fraction
    scale: int
    M: list[list[int]]
    initial_order: list[int]

    @property
    def n(self) -> int:
        return len(self.names)

    def fa(self, order: list[int]) -> Fraction:
        return sum((self.A[order[r]][order[t]] for r in range(len(order)) for t in range(r + 1, len(order))), Fraction(0))

    def user_objective(self, order: list[int]) -> Fraction:
        return sum((self.original[order[r]][order[t]] for r in range(len(order)) for t in range(r + 1, len(order))), Fraction(0))

    def user_from_fa(self, fa: Fraction) -> Fraction:
        if self.interpretation == "skew":
            return fa
        return (fa + self.offset) / 2 if self.interpretation == "benefit" else (self.offset - fa) / 2


def build_model(instance: dict) -> Model:
    """Validate a Studio instance object: {names?, matrix | edges, interpretation, initialOrder?}."""
    if not isinstance(instance, dict):
        raise InstanceError("instance must be an object")
    interp = instance.get("interpretation")
    if interp not in INTERPRETATIONS:
        raise InstanceError(f'"interpretation" must be one of {", ".join(INTERPRETATIONS)}')
    names = instance.get("names")
    if "matrix" in instance:
        M = instance["matrix"]
        if not isinstance(M, list) or not M:
            raise InstanceError('"matrix" must be a non-empty array of rows')
        n = len(M)
        if n > LIMITS.max_vertices:
            raise InstanceError(f"at most {LIMITS.max_vertices} items are supported (found {n})")
        orig = [[Fraction(0)] * n for _ in range(n)]
        for i, row in enumerate(M):
            if not isinstance(row, list) or len(row) != n:
                raise InstanceError(f"matrix row {i + 1} must be an array of length {n}")
            for j, x in enumerate(row):
                if i != j:
                    if x is None:
                        raise InstanceError(f"missing entry at row {i + 1}, column {j + 1}")
                    orig[i][j] = _q(x, f"entry ({i + 1}, {j + 1})")
        names = [str(s)[:80] for s in names] if isinstance(names, list) else [f"v{i + 1}" for i in range(n)]
        if len(names) != n:
            raise InstanceError(f"{len(names)} names given for a {n}x{n} matrix")
    elif "edges" in instance:
        E = instance["edges"]
        if not isinstance(E, list) or not E:
            raise InstanceError('"edges" must be a non-empty array')
        if len(E) > LIMITS.max_edges:
            raise InstanceError(f"at most {LIMITS.max_edges} edges are supported")
        names = [str(s)[:80] for s in names] if isinstance(names, list) else []
        index = {s: i for i, s in enumerate(names)}
        trip = []
        for k, e in enumerate(E):
            if isinstance(e, list) and len(e) == 3:
                a, b, w = e
            elif isinstance(e, dict):
                a, b, w = e.get("from"), e.get("to"), e.get("weight")
            else:
                raise InstanceError(f"edge {k + 1} must be [from, to, weight] or {{from, to, weight}}")
            a, b = str(a)[:80], str(b)[:80]
            if a == b:
                raise InstanceError(f"edge {k + 1}: self-edges are not allowed")
            for s in (a, b):
                if s not in index:
                    index[s] = len(names)
                    names.append(s)
            trip.append((index[a], index[b], _q(w, f"edge {k + 1}")))
        n = len(names)
        if n > LIMITS.max_vertices:
            raise InstanceError(f"at most {LIMITS.max_vertices} items are supported (found {n})")
        orig = [[Fraction(0)] * n for _ in range(n)]
        seen = {}
        for a, b, w in trip:
            if interp == "skew":
                if (a, b) in seen:
                    raise InstanceError("duplicate edge (not allowed for skew input)")
                if (b, a) in seen and seen[(b, a)] != -w:
                    raise InstanceError("an edge and its reverse are inconsistent (need w_vu = -w_uv)")
                seen[(a, b)] = w
                orig[a][b], orig[b][a] = w, -w
            else:
                orig[a][b] += w  # duplicates are summed
    else:
        raise InstanceError('instance must contain "matrix" or "edges"')
    if len(set(names)) != len(names) or any(not s for s in names):
        raise InstanceError("item names must be unique and non-empty")
    n = len(names)
    if interp == "skew":
        for i in range(n):
            for j in range(i + 1, n):
                if orig[i][j] != -orig[j][i]:
                    raise InstanceError(f"not skew-symmetric at ({i + 1}, {j + 1}); use the benefit or cost interpretation")
    A = [[Fraction(0)] * n for _ in range(n)]
    S = Fraction(0)
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            if interp == "skew":
                A[i][j] = orig[i][j]
            else:
                S += orig[i][j]
                d = orig[i][j] - orig[j][i]
                A[i][j] = d if interp == "benefit" else -d
    scale = 1
    for row in A:
        for x in row:
            scale = scale * x.denominator // math.gcd(scale, x.denominator)
    Mi = [[int(x * scale) for x in row] for row in A]
    if any(abs(x) * max(1, n * n) >= 2**53 for row in Mi for x in row):
        raise InstanceError("values are too large for exact double-precision arithmetic in the backend solvers")
    init = instance.get("initialOrder")
    order = list(range(n))
    if isinstance(init, list):
        idx = {s: i for i, s in enumerate(names)}
        cand = [idx.get(s) if isinstance(s, str) else s for s in init]
        if sorted(c for c in cand if isinstance(c, int)) != list(range(n)) or len(cand) != n:
            raise InstanceError('"initialOrder" must list every item exactly once')
        order = cand
    return Model(names, interp, orig, A, S, scale, Mi, order)
