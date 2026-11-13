# ATLAS-031 benchmark (time limit 20 s per run, node v22.23.4, 2-vCPU Xeon 2.1 GHz, 1 run per solver)

Cell = optimal-proved/instances · median ms · median states (exact solvers). `—` = solver not applicable (item limit).

| family | n | subset-dp (prod) | exclusion (prod) | local-search (prod heuristic) | ATLAS | ATLAS (no decomposition) |
|---|---|---|---|---|---|---|
| near-transitive | 12 | 3/3 · 1 ms · 4,096 | 3/3 · 117 ms · 414 | heur · 113 ms | 3/3 · 1 ms · 2,049 | 3/3 · 1 ms · 4,096 |
| near-transitive | 18 | 3/3 · 105 ms · 262,144 | 3/3 · 250 ms · 14,301 | heur · 221 ms | 3/3 · 23 ms · 3,290 | 3/3 · 25 ms · 3,290 |
| near-transitive | 24 | — | 3/3 · 1036 ms · 402,564 | heur · 379 ms | 3/3 · 234 ms · 85,878 | 3/3 · 370 ms · 85,878 |
| random-int | 12 | 3/3 · 1 ms · 4,096 | 3/3 · 116 ms · 820 | heur · 126 ms | 3/3 · 1 ms · 4,096 | 3/3 · 1 ms · 4,096 |
| random-int | 18 | 3/3 · 106 ms · 262,144 | 3/3 · 378 ms · 69,153 | heur · 273 ms | 3/3 · 83 ms · 28,602 | 3/3 · 101 ms · 28,602 |
| random-int | 24 | — | 1/3 · 7846 ms · 1,884,030 | heur · 544 ms | 1/3 · 11079 ms · 600,580 | 1/3 · 10061 ms · 600,580 |
| ties | 12 | 3/3 · 2 ms · 4,096 | 3/3 · 159 ms · 910 | heur · 163 ms | 3/3 · 1 ms · 4,096 | 3/3 · 1 ms · 4,096 |
| ties | 18 | 3/3 · 111 ms · 262,144 | 3/3 · 353 ms · 43,673 | heur · 376 ms | 3/3 · 62 ms · 18,359 | 3/3 · 61 ms · 18,359 |
| ties | 24 | — | 1/3 · 7860 ms · 1,499,719 | heur · 491 ms | 1/3 · 9991 ms · 375,442 | 1/3 · 9537 ms · 375,442 |
| blocks | 12 | 3/3 · 1 ms · 4,096 | 3/3 · 105 ms · 129 | heur · 99 ms | 3/3 · 1 ms · 4,096 | 3/3 · 1 ms · 4,096 |
| blocks | 18 | 3/3 · 102 ms · 262,144 | 3/3 · 234 ms · 636 | heur · 207 ms | 3/3 · 4 ms · 131 | 3/3 · 5 ms · 131 |
| blocks | 24 | — | 3/3 · 336 ms · 22,588 | heur · 337 ms | 3/3 · 11 ms · 2,923 | 3/3 · 13 ms · 2,923 |
| cyclic | 13 | 1/1 · 11 ms · 8,192 | 1/1 · 154 ms · 4,578 | heur · 116 ms | 1/1 · 10 ms · 8,192 | 1/1 · 3 ms · 8,192 |
| cyclic | 17 | 1/1 · 49 ms · 131,072 | 1/1 · 324 ms · 51,954 | heur · 171 ms | 1/1 · 64 ms · 23,241 | 1/1 · 53 ms · 23,241 |
| cyclic | 21 | — | 1/1 · 1527 ms · 626,274 | heur · 280 ms | 1/1 · 913 ms · 257,073 | 1/1 · 928 ms · 257,073 |
| planted(r=10) | 30 | — | — | heur · 444 ms | 3/3 · 9 ms · 369 | 3/3 · 10 ms · 369 |
| planted(r=20) | 60 | — | — | heur · 1500 ms | 3/3 · 46 ms · 4,760 | 3/3 · 47 ms · 4,760 |
| planted(r=30) | 100 | — | — | heur · 1500 ms | 3/3 · 791 ms · 117,864 | 3/3 · 670 ms · 117,864 |
| planted(r=40) | 200 | — | — | heur · 1500 ms | 2/3 · 16882 ms · 1,074,770 | 2/3 · 18180 ms · 1,074,770 |
| multi-comp(b=10) | 60 | — | — | heur · 1500 ms | 3/3 · 4 ms · 6,144 | 0/3 · 17572 ms |
| multi-comp(b=12) | 120 | — | — | heur · 1501 ms | 3/3 · 17 ms · 40,960 | 0/3 · 20353 ms |
| multi-comp(b=14) | 240 | — | — | heur · 1505 ms | 3/3 · 128 ms · 24,703 | 0/3 · 23963 ms |
| multi-comp(b=16) | 400 | — | — | heur · 1524 ms | 3/3 · 486 ms · 135,279 | 0/3 · 21111 ms |
| example paley11 | 11 | 1/1 · 1 ms · 2,048 | 1/1 · 304 ms · 2,032 | heur · 141 ms | 1/1 · 1 ms · 2,048 | 1/1 · 1 ms · 2,048 |

**Instances:** 64. **Proved optimal — production exact solvers (subset DP or exclusion):** 36. **ATLAS:** 59.
**Disagreements between OPTIMAL values of different exact solvers:** 0 (integer instances compared exactly; the floating-point `paley11` example agrees to 2e-15 — such inputs are never labelled OPTIMAL by the Studio).
**ATLAS optimum strictly better than the production heuristic's ordering:** 6 instances:
- multi-comp(b=14) n=240 seed=1: optimum 34686 vs heuristic 34682
- multi-comp(b=14) n=240 seed=2: optimum 34922 vs heuristic 34914
- multi-comp(b=14) n=240 seed=3: optimum 35402 vs heuristic 35398
- multi-comp(b=16) n=400 seed=1: optimum 97170 vs heuristic 97124
- multi-comp(b=16) n=400 seed=2: optimum 96753 vs heuristic 96679
- multi-comp(b=16) n=400 seed=3: optimum 97597 vs heuristic 97551
