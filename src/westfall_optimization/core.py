"""Core definitions for weighted linear ordering.

Convention (used everywhere in this package):
    A is a real skew-symmetric n x n matrix (a_ij = -a_ji, a_ii = 0).
    For a permutation pi = (pi_1, ..., pi_n):   F_A(pi) = sum_{r < s} a_{pi_r pi_s}.
    W(A) = sum_{i<j} |a_ij|,   backward weight beta_A(pi) = (W(A) - F_A(pi)) / 2.
Maximising F_A is equivalent to minimising the weighted feedback-arc-set cost beta_A.
"""
from __future__ import annotations

import numpy as np


def as_skew(A) -> np.ndarray:
    """Validate and return A as a float skew-symmetric matrix (raises ValueError otherwise)."""
    A = np.asarray(A, dtype=float)
    if A.ndim != 2 or A.shape[0] != A.shape[1]:
        raise ValueError("matrix must be square")
    if not np.all(np.isfinite(A)):
        raise ValueError("matrix entries must be finite")
    if np.any(np.diag(A) != 0):
        raise ValueError("diagonal must be zero")
    if not np.array_equal(A, -A.T):
        raise ValueError("matrix must be skew-symmetric (a_ij = -a_ji)")
    return A


def from_preferences(C) -> np.ndarray:
    """LOLIB-style non-negative matrix C (c_ij = benefit of i before j) -> skew form A = C - C^T.
    F_A(pi) = 2 * LOP_C(pi) - sum_{i != j} c_ij."""
    C = np.asarray(C, dtype=float)
    C = C - np.diag(np.diag(C))
    return C - C.T


def score(A, order) -> float:
    """F_A(order)."""
    idx = np.asarray(order, dtype=int)
    return float(np.triu(np.asarray(A)[np.ix_(idx, idx)], 1).sum())


def total_weight(A) -> float:
    return float(np.abs(np.triu(np.asarray(A), 1)).sum())


def backward_weight(A, order) -> float:
    return (total_weight(A) - score(A, order)) / 2.0


def backward_arcs(A, order):
    """Pairs (u, v) with u placed after v although a_uv > 0 (i.e. arcs that point backward)."""
    pos = {v: i for i, v in enumerate(order)}
    n = len(order)
    return [(u, v) for u in range(n) for v in range(n) if A[u][v] > 0 and pos[u] > pos[v]]


def qr_set(p: int) -> set:
    return {(z * z) % p for z in range(1, p)}


def paley_sign(p: int) -> np.ndarray:
    """Quadratic-residue (Paley) tournament as a +-1 skew matrix, p prime, p = 3 mod 4."""
    Q = qr_set(p)
    S = np.zeros((p, p))
    for i in range(p):
        for j in range(p):
            if i != j:
                S[i, j] = 1.0 if ((j - i) % p) in Q else -1.0
    return S


def perturbed_paley(p: int, eps: float = 0.05, seed: int = 14013) -> np.ndarray:
    """The seeded perturbed Paley family of the WESTFALL program (NumPy default_rng(seed + p),
    one uniform(-eps, eps) draw per upper-triangular entry in row-major order)."""
    rng = np.random.default_rng(seed + p)
    S = paley_sign(p)
    A = np.zeros((p, p))
    for i in range(p):
        for j in range(i + 1, p):
            A[i, j] = S[i, j] + rng.uniform(-eps, eps)
            A[j, i] = -A[i, j]
    return A


def read_lolib(path: str) -> np.ndarray:
    """Read a LOLIB/xLOLIB instance (first token n, then n*n entries) and return the skew form."""
    raw = open(path, "rb").read().decode("latin1").replace("\x00", " ").split()
    n = int(raw[0])
    C = np.array(raw[1 : 1 + n * n], dtype=float).reshape(n, n)
    return from_preferences(C)
