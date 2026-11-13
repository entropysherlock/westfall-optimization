# ATLAS-032 results

30 s limit and 4 M-state budget per run; identical instances for every solver; 2 vCPU Intel Xeon 2.1 GHz, 8 GB RAM, Node 22.23.4, HiGHS 1.16.0.
Variants A, S, B, C and E each ran as a single process with the other core idle; HiGHS ran alone, 1 thread, **mip_rel_gap = 0** (exact).

Cell: proved/instances · median ms (all runs, timeouts count as 30 000) · median states (proved runs). HiGHS: proved/instances · median end-to-end ms (model build + solve) · median root-LP gap to best known β.

Variants: A = ATLAS-031 · S = strict only · B = strict + greedy triangles · C = strict + fractional triangles · E = ATLAS-032 final (C + longer cycles + stronger incumbent).

| family | n | A | S | B | C | E | HiGHS MILP (exact gap) |
|---|---|---|---|---|---|---|---|
| random-int n=24 | 24 | 3/3 · 16641 ms · 1,912,917 | 3/3 · 12824 ms · 1,825,342 | 3/3 · 344 ms · 71,026 | 3/3 · 380 ms · 1,116 | 3/3 · 403 ms · 1,085 | 3/3 · 215 ms · LP gap 1.0% |
| random-int n=30 | 30 | 0/3 · 30008 ms | — | — | 3/3 · 26079 ms · 2,377,471 | 3/3 · 23381 ms · 2,352,313 | 1/3 · 30006 ms · LP gap 4.5% |
| random-int n=35 | 35 | 0/3 · 30219 ms | — | — | 1/3 · 30008 ms · 223,387 | 1/3 · 30008 ms · 216,203 | 1/3 · 30013 ms · LP gap 3.9% |
| weighted-cyclic n=24 | 24 | 3/3 · 3772 ms · 644,897 | — | — | 3/3 · 446 ms · 176 | 3/3 · 434 ms · 1 | 3/3 · 51 ms · LP gap 0.0% |
| near-transitive n=24 | 24 | 3/3 · 460 ms · 85,878 | — | — | 3/3 · 214 ms · 16 | 3/3 · 195 ms · 16 | 3/3 · 41 ms · LP gap 0.0% |
| planted(r=30) n=100 [031 regression] | 100 | 3/3 · 850 ms · 117,864 | — | — | 3/3 · 1111 ms · 1 | 3/3 · 1750 ms · 1 | 3/3 · 3033 ms · LP gap 0.0% |
| cyclic (unweighted) n=21 | 21 | 1/1 · 732 ms · 257,073 | — | — | 1/1 · 269 ms · 85 | 1/1 · 232 ms · 1 | 1/1 · 35 ms · LP gap 0.0% |
| LOLIB IO (real-world) | 44–79 | 27/50 · 11329 ms · 339,293 | — | — | 43/50 · 930 ms · 1,787 | 50/50 · 718 ms · 214 | 50/50 · 314 ms · LP gap 0.0% |
| ties n=24 | 24 | 3/3 · 10818 ms · 1,822,028 | 3/3 · 8547 ms · 1,631,589 | 3/3 · 254 ms · 75,313 | 3/3 · 225 ms · 557 | 3/3 · 181 ms · 549 | 3/3 · 158 ms · LP gap 1.1% |
| ties n=30 | 30 | 0/3 · 30793 ms | — | — | 3/3 · 5387 ms · 625,992 | 3/3 · 3861 ms · 611,742 | 3/3 · 25734 ms · LP gap 3.4% |
| ties n=35 | 35 | 0/3 · 30078 ms | — | — | 2/3 · 7772 ms · 566,033 | 2/3 · 6975 ms · 523,886 | 2/3 · 29408 ms · LP gap 2.2% |
| weighted-cyclic n=30 | 30 | 0/3 · 30768 ms | — | — | 3/3 · 1807 ms · 829 | 3/3 · 1054 ms · 1 | 3/3 · 124 ms · LP gap 0.0% |
| near-transitive n=40 | 40 | 0/3 · 30204 ms | — | — | 3/3 · 1827 ms · 1 | 3/3 · 1287 ms · 1 | 3/3 · 204 ms · LP gap 0.0% |
| multi-comp(b=12) n=120 [031 regression] | 120 | 3/3 · 15 ms · 40,960 | — | — | 3/3 · 11 ms · 40,960 | 3/3 · 14 ms · 40,960 | 3/3 · 6412 ms · LP gap 0.0% |
| cyclic (unweighted) n=25 | 25 | 1/1 · 23204 ms · 3,100,607 | — | — | 1/1 · 697 ms · 339 | 1/1 · 507 ms · 5 | 1/1 · 64 ms · LP gap 0.0% |

**Totals (proved optimal / runs):** A 47/88; S 6/6; B 6/6; C 78/88; E 85/88; HiGHS 83/88
**Disagreements between proved optimal values (ATLAS variants and HiGHS):** 0 

### ATLAS-032 final (E) runs not proved within 30 s (best feasible β, best rigorous lower bound on β, gaps)

| instance | n | β found | lower bound | abs gap | rel gap | HiGHS |
|---|---|---|---|---|---|---|
| random-int n=35 s=1 | 35 | 510 | 484 | 26 | 5.1% | Time limit reached β=509.0 bound=490.0 |
| random-int n=35 s=2 | 35 | 516 | 491 | 25 | 4.8% | Time limit reached β=516.0 bound=500.0 |
| ties n=35 s=2 | 35 | 218 | 207 | 11 | 5.0% | Time limit reached β=218.0 bound=210.0 |

### LOLIB conversion check against optima recorded in benchmarks/data/lolib.jsonl

| instance | recorded OPT | HiGHS | ATLAS-032 |
|---|---|---|---|
| N-t59b11xx | 198305 | 198305 | 198305 |
| N-t65b11xx | 339247 | 339247 | 339247 |
| N-t70b11xx | 505833 | 505833 | 505833 |
| N-t75d11xx | 545285 | 545285 | 545285 |
| N-be75eec | 228678 | 228678 | 228678 |
| N-be75np | 691358 | 691358 | 691358 |

### HiGHS default tolerance (mip_rel_gap = 1e-4): solutions labelled Optimal that are not exactly optimal: 1
- N-stabu70: default-gap 'Optimal' F = 336764, exact optimum F = 336776 (ATLAS-032 certified)
