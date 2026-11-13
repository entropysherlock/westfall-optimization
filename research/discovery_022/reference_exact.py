"""Independent, exact-arithmetic small-n reference for Discovery 022.

IMPORTANT: This is NOT Fable's original AutoCut implementation, a subexponential
algorithm, or a Lean proof. It exhaustively enumerates all ordered partitions
and permutations, so use it only on tiny instances (n <= 7).
"""
from __future__ import annotations

import argparse
import json
from itertools import combinations, permutations
from typing import Iterator, Sequence

Matrix = Sequence[Sequence[int]]
Partition = tuple[tuple[int, ...], ...]


def validate_matrix(a: Matrix) -> int:
    n = len(a)
    if n > 7:
        raise ValueError("Exact reference restricted to n <= 7")
    if any(len(row) != n for row in a):
        raise ValueError("Matrix must be square")
    for i in range(n):
        for j in range(n):
            if type(a[i][j]) is not int or a[i][j] != -a[j][i]:
                raise ValueError("Requires skew-symmetric Python integer weights")
    return n


def all_ordered_partitions(vertices: tuple[int, ...]) -> Iterator[Partition]:
    """Enumerate nonempty ordered blocks with each vertex occurring once."""
    if not vertices:
        yield ()
        return
    for size in range(1, len(vertices) + 1):
        for block in combinations(vertices, size):
            in_block = set(block)
            rest = tuple(v for v in vertices if v not in in_block)
            for suffix in all_ordered_partitions(rest):
                yield (block,) + suffix


def k0(a: Matrix, partition: Partition) -> int:
    """Discovery 021 gap-free K0, using exact integer margins and thresholds.

    The infinite-threshold case is explicitly included.
    """
    cross = [
        a[u][v]
        for i, block in enumerate(partition)
        for later in partition[i + 1:]
        for u in block
        for v in later
    ]
    negative = sum(c < 0 for c in cross)
    x = sum(-c for c in cross if c < 0)
    # tau = infinity: every nonnegative cross margin enters Z(tau).
    choices = [len(cross)]
    for tau in {c for c in cross if c > 0}:
        z = sum(0 <= c < tau for c in cross)
        choices.append(negative + z + x // tau)
    return min(choices)


def robust_condorcet_lambda(a: Matrix) -> tuple[int, Partition]:
    n = validate_matrix(a)
    if not n:
        return 0, ()
    best_value = None
    best_partition: Partition = ()
    for partition in all_ordered_partitions(tuple(range(n))):
        b = max(map(len, partition))
        value = b * b + 3 * k0(a, partition)
        if best_value is None or value < best_value:
            best_value = value
            best_partition = partition
    assert best_value is not None
    return best_value, best_partition


def score(a: Matrix, order: tuple[int, ...]) -> int:
    return sum(a[order[i]][order[j]]
               for i in range(len(order)) for j in range(i + 1, len(order)))


def optimum_and_width(a: Matrix) -> tuple[int, int, tuple[int, ...]]:
    """Brute-force OPT and maximum weak-cut among ALL optimal prefixes."""
    n = validate_matrix(a)
    optimum = None
    width = 0
    witness: tuple[int, ...] = ()
    for order in permutations(range(n)):
        value = score(a, order)
        if optimum is None or value > optimum:
            optimum = value
            witness = order
            width = 0
        if value == optimum:
            width = max(width, *(
                weak_cut(a, set(order[:i])) for i in range(n + 1)
            ))
    return optimum if optimum is not None else 0, width, witness


def weak_cut(a: Matrix, prefix: set[int]) -> int:
    """Crossing arcs w->u with w outside, u inside and a[w][u] >= 0."""
    n = len(a)
    return sum(a[w][u] >= 0
               for w in range(n) if w not in prefix
               for u in prefix)


def analyze(a: Matrix) -> dict:
    value, partition = robust_condorcet_lambda(a)
    opt, width, order = optimum_and_width(a)
    if width > value:
        raise AssertionError(f"COUNTEREXAMPLE: width {width} > lambda {value}")
    return {
        "n": len(a),
        "lambda": value,
        "minimizing_partition": [list(b) for b in partition],
        "k0": k0(a, partition),
        "optimal_score": opt,
        "optimal_order": list(order),
        "max_optimal_prefix_weak_cut": width,
        "localization_bound_holds": True,
        "engine": "exhaustive small-n reference, not AutoCut",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("instance", help="JSON file with integer 'matrix' field")
    args = parser.parse_args()
    with open(args.instance, encoding="utf-8") as inp:
        data = json.load(inp)
    print(json.dumps(analyze(data["matrix"]), indent=2))


if __name__ == "__main__":
    main()
