# Full-LOLIB benchmark — tier `large`

Solvers: atlas, highs, scip. Instances: 39 (all present in every solver's results).

| Family | n | Instances | atlas solved | highs solved | scip solved | atlas SGM (s) | highs SGM (s) | scip SGM (s) |
|---|---|---|---|---|---|---|---|---|
| RandA2 | 100–200 | 9 | 3 | 0 | 0 | 19.96 | 30.00 | 30.00 |
| RandA1 | 100–500 | 12 | 0 | 0 | 0 | 30.00 | 30.00 | 30.00 |
| xLOLIB | 150–250 | 6 | 0 | 0 | 0 | 30.00 | 30.00 | 30.00 |
| xLOLIB2 | 300–1000 | 12 | 0 | 0 | 0 | 30.00 | 30.00 | 30.00 |
| **All** | 100–1000 | 39 | 3 | 0 | 0 | 27.42 | 30.00 | 30.00 |

## Outcome breakdown

| Solver | SOLVED | LIMIT | KILLED_AT_LIMIT | OUT_OF_MEMORY | OPTIMAL_OVER_LIMIT | NOT_ATTEMPTED | ERROR |
|---|---|---|---|---|---|---|---|
| atlas | 3 | 6 | 30 | 0 | 0 | 0 | 0 |
| highs | 0 | 14 | 10 | 0 | 0 | 15 | 0 |
| scip | 0 | 15 | 9 | 0 | 0 | 15 | 0 |

## Solved by exactly one solver

- **atlas** (3): RandA2/N-t2d100.01, RandA2/N-t2d100.02, RandA2/N-t2d100.03
- **highs** (0): none
- **scip** (0): none
- **no solver** (36): RandA2/N-t2d150.01, RandA2/N-t2d150.02, RandA2/N-t2d150.03, RandA2/N-t2d200.01, RandA2/N-t2d200.02, RandA2/N-t2d200.03, RandA1/N-t1d100.01, RandA1/N-t1d100.02, RandA1/N-t1d100.03, RandA1/N-t1d150.01, RandA1/N-t1d150.02, RandA1/N-t1d150.03, RandA1/N-t1d200.01, RandA1/N-t1d200.02, RandA1/N-t1d200.03, RandA1/N-t1d500.01, RandA1/N-t1d500.02, RandA1/N-t1d500.10, xLOLIB/N-be75eec_150, xLOLIB/N-be75eec_250, xLOLIB/N-be75np_150, xLOLIB/N-be75np_250, xLOLIB/N-be75oi_150, xLOLIB/N-be75oi_250, xLOLIB2/N-be75eec_1000, xLOLIB2/N-be75eec_300, xLOLIB2/N-be75eec_500, xLOLIB2/N-be75eec_750, xLOLIB2/N-be75np_1000, xLOLIB2/N-be75np_300, xLOLIB2/N-be75np_500, xLOLIB2/N-be75np_750, xLOLIB2/N-be75oi_1000, xLOLIB2/N-be75oi_300, xLOLIB2/N-be75oi_500, xLOLIB2/N-be75oi_750

## Certified gaps where a solver did not prove optimality

Gap = (solver's proven upper bound − best known value) / best known value. Blank = solver returned no bound.

| Instance | n | BKS | atlas best found | atlas gap | highs best found | highs gap | scip best found | scip gap |
|---|---|---|---|---|---|---|---|---|
| RandA2/N-t2d100.01 | 100 | 25362 | ✓ 25362 | 0 (proved) | 25362 | 6.175% | 20306 | 6.175% |
| RandA2/N-t2d100.02 | 100 | 28326 | ✓ 28326 | 0 (proved) | 28326 | 5.091% | 22628 | 5.091% |
| RandA2/N-t2d100.03 | 100 | 25886 | ✓ 25886 | 0 (proved) | 25886 | 6.397% | 20388 | 6.397% |
| RandA2/N-t2d150.01 | 150 | 76041 | 76041 | 0.784% | 76030 | 7.004% | 58490 | 7.004% |
| RandA2/N-t2d150.02 | 150 | 73624 | 73621 | 0.759% | 73614 | 7.263% | 61812 | 7.263% |
| RandA2/N-t2d150.03 | 150 | 69705 | 69705 | 0.908% | 69702 | 8.186% | 55590 | 8.186% |
| RandA2/N-t2d200.01 | 200 | 147742 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| RandA2/N-t2d200.02 | 200 | 144218 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| RandA2/N-t2d200.03 | 200 | 141378 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| RandA1/N-t1d100.01 | 100 | 106852 | — | killed_at_limit | 106285 | 52.689% | 86386 | 52.689% |
| RandA1/N-t1d100.02 | 100 | 105947 | — | killed_at_limit | 105187 | 54.421% | 85612 | 54.421% |
| RandA1/N-t1d100.03 | 100 | 109819 | — | killed_at_limit | 109530 | 53.399% | 91655 | 53.399% |
| RandA1/N-t1d150.01 | 150 | 235056 | — | killed_at_limit | 233077 | 60.690% | 199044 | 60.690% |
| RandA1/N-t1d150.02 | 150 | 234421 | — | killed_at_limit | 232554 | 59.632% | 195411 | 59.632% |
| RandA1/N-t1d150.03 | 150 | 236319 | — | killed_at_limit | 234246 | 60.118% | 198805 | 60.118% |
| RandA1/N-t1d200.01 | 200 | 410992 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| RandA1/N-t1d200.02 | 200 | 407735 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| RandA1/N-t1d200.03 | 200 | 407420 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| RandA1/N-t1d500.01 | 500 | None | — | killed_at_limit | — | not_attempted | — | not_attempted |
| RandA1/N-t1d500.02 | 500 | None | — | killed_at_limit | — | not_attempted | — | not_attempted |
| RandA1/N-t1d500.10 | 500 | 2407443 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB/N-be75eec_150 | 150 | 3482828 | 3479657 | 3.488% | — | killed_at_limit | 2214911 | 19.035% |
| xLOLIB/N-be75eec_250 | 250 | 8903348 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| xLOLIB/N-be75np_150 | 150 | 7182660 | — | killed_at_limit | 5046929 | 24.797% | 4674428 | 24.797% |
| xLOLIB/N-be75np_250 | 250 | 17833911 | 17631878 | 6.993% | — | killed_at_limit | — | killed_at_limit |
| xLOLIB/N-be75oi_150 | 150 | 2246853 | 2242541 | 1.711% | 2241231 | 9.831% | 1561097 | 9.831% |
| xLOLIB/N-be75oi_250 | 250 | 5912761 | — | killed_at_limit | — | killed_at_limit | — | killed_at_limit |
| xLOLIB2/N-be75eec_1000 | 1000 | 122927794 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75eec_300 | 300 | 12437701 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75eec_500 | 500 | 33464804 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75eec_750 | 750 | 71724346 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75np_1000 | 1000 | 247827883 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75np_300 | 300 | 26127625 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75np_500 | 500 | 66991918 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75np_750 | 750 | 143015205 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75oi_1000 | 1000 | 95603686 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75oi_300 | 300 | 9407042 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75oi_500 | 500 | 25423876 | — | killed_at_limit | — | not_attempted | — | not_attempted |
| xLOLIB2/N-be75oi_750 | 750 | 57667942 | — | killed_at_limit | — | not_attempted | — | not_attempted |

## Consistency checks

- Orderings recomputed from the raw matrices: every reported objective matches.
- Proved optima: 3; disagreements between solvers: 0; below BKS: 0.
- Proved optima above the published best-known value: 0.
