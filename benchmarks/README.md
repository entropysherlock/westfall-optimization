# Benchmarks

Raw logs from Discoveries 018–019. These files are the source of truth; the website dashboard (`website/public/data/benchmarks.json`) is generated from them by `python scripts/build_site_data.py`.

| File | Contents |
|---|---|
| `data/grid.jsonl` | Discovery 018 synthetic grid (used to fit BLX 2.0 routing thresholds — in-sample) |
| `data/lolib.jsonl` | Discovery 018 LOLIB runs (in-sample) |
| `data/insample19.jsonl` | BLX 2.0 re-run on the Discovery 018 instances (in-sample) |
| `data/test19.jsonl` | Discovery 019 out-of-sample test set |
| `data/test19_table.md` | the out-of-sample table as printed in the Discovery 019 report |

## Environment
2-core cloud VM, 8 GB RAM; Python 3.13, NumPy 2.5.3, SciPy 1.18.1 (HiGHS via `scipy.optimize.milp`, full triangle formulation).

## Limits and fairness
- MILP: 60 s limit (BLX 2.0's internal MILP attempt: 30 s; 60 s when n > 62).
- DP runs: 300–900 s process timeouts.
- DP solvers are pure Python/NumPy; HiGHS is compiled C++. Budgets differ between solvers, so a timeout is not a like-for-like loss.
- Seeds are recorded per record. Wall-clock times on a shared VM vary by run.
- No specialised LOP branch-and-cut solver was benchmarked.

## Reading the results
Favorable: structured block families, where BLX proves optimality while a 60 s generic MILP does not. Unfavorable: many LOLIB input–output instances, where HiGHS is faster. Unresolved: instances that no solver proved within its limits are listed explicitly on the dashboard.
