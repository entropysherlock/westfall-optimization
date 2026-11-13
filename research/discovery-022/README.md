# Discovery 022 — Westfall Structural Optimization Theorem

The original authored report is
[WESTFALL_Discovery_022_Report.md](WESTFALL_Discovery_022_Report.md).

**Public-facing research name:** Westfall Structural Optimization Theorem.  
**Key specific result (Theorem 3):** Westfall Partition Recovery Theorem.  
**Paper title:** Automatic Structural Decomposition for Exact Weighted Linear Ordering.

This folder also contains an **independently authored exact small-instance
reference**, under `research/discovery_022/reference_exact.py` (underscore
path to preserve valid Python imports). That checker enumerates all ordered
partitions and all permutations. It is NOT the original AutoCut algorithm,
does NOT satisfy the claimed subexponential running time, and has not
machine-verified the theorem.

The original report's referenced `exact.py`, `falsify22.py`,
`bench22.py`, and other experimental files were reported on an **unpublished
local branch** and have not been recovered here.

All mathematical claims are provisional pending verification.
