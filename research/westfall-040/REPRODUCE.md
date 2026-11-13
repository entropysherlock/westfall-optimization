# D. Reproducibility package

Everything is in `research/westfall-040/`. No network access is needed after checkout except to fetch Mathlib.

| Artifact | How to reproduce | Recorded result |
|---|---|---|
| Counterexample hunt (quick, ~4 s) | `cd tests && python3 -I hunt.py --quick` | 937 digraphs, 0 violations |
| Counterexample hunt (full, ~80 s) | `cd tests && python3 -I hunt.py` | 94,666 digraphs; 689,191 theorem checks; 12,778,946 lemma checks; 0 violations → `data/hunt_full.json` |
| Algorithm prototype (~2 min) | `cd tests && python3 -I algo.py` | 300/300 correct; benchmark rows → `data/algo_results.json` |
| Lean proof | `cd lean && lake update && lake build Westfall040 && lake env lean Audit.lean` | builds; axioms = propext, Classical.choice, Quot.sound |
| ATLAS state-count connection | `website/src/lib/studio/cutdp.ts` header comment | (context only; not part of the claim) |

Every random choice is seeded (`random.Random(40)` in the hunt, `random.Random(4040)` in the prototype), so
reruns produce identical instance sets and identical counts. Output JSON files also record wall-clock seconds and
timings, so their bytes (and hashes) differ between machines; compare the count fields.

## Environment of the recorded run (2026-11-13)

Linux 6.18 x86_64, Intel Xeon @ 2.30 GHz (2 vCPU), Python 3.13.18 (standard library only), Lean 4.32.0,
Mathlib v4.32.0 (compiled from source, see `FORMAL_STATUS.md`).

## SHA-256 of the archived artifacts

```
f1596689e7199f781a8c6deef0782423b231a122e8c4f5e45544c9f3703cedbe  data/hunt_full.json
833fca566ad590e9e6c6078bb5e56c5bb1bd696d22ad31f9506444cd87178b5f  data/hunt_quick.json
07bb3eba6cea5ae56f30ad3f1886709c908b75bc26393adb35fdd008e2a0f101  data/algo_results.json
b08304dde02bd15de653390b1bc6a675be0d91954b75cdd3318188dfaba1d212  lean/Westfall040/CutCount.lean
1ac1f66ddc3e313a5cb459574acc34cdc240faba7e944f0090a64d3f8149e305  lean/AXIOM_AUDIT.txt
```
(`tests/kcut_lib.py` gained the `H_formal` cross-check after the recorded hunt; the functions the hunt uses are unchanged.)

## Independence of the checks

* Cutwidth: exact subset DP f(S) = max(back(S), min_v f(S∖v)), unrelated to the encoding.
* k-cut counts: enumeration of all 2^n subsets with an O(2^n·n) incremental back() table, cross-checked by a naive
  arc-by-arc count.
* H(K): dynamic program, verified against recursive enumeration for K ≤ 24 and against the Lean-style definition for K ≤ 15.
* The candidate encoding is implemented separately (`encode`/`decode`) and is only *tested*, never used to compute counts.
