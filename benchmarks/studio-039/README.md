# Studio 039 — performance measurements

Every performance statement made for Mission 039 is reproducible from this directory. Machine for all numbers
below: one Intel Xeon @ 2.30 GHz core (2 vCPU VM), Node 22.23, Linux; browser numbers in Chrome (Playwright).
Nothing here is a comparison with other solvers.

## 1. Cut-bounded DP storage rewrite (`website/src/lib/studio/cutdp.ts`)

The ATLAS-032 code is kept verbatim as `cutdp.reference.ts`. The benchmark times **both** versions in the same
process, interleaved, on the same fixed inputs (deterministic, start-count-bounded incumbent; packing computed
once outside the timed region), median of 5 runs, and **asserts that order, β, states and pruned counts are
identical**. `tests/studio039.test.ts` additionally checks state-for-state equality (order, β, states, pruned,
expanded, layer sizes, incumbentProved) on 80 instance/option combinations, the n > 52 string-key path,
non-integral input and budget exhaustion.

```
cd website
npx vitest run --config bench/vitest.config.ts bench/studio039.bench.test.ts                       # → cutdp.run.json
STUDIO039_TELEMETRY=1 STUDIO039_LABEL=telemetry npx vitest run --config bench/vitest.config.ts bench/studio039.bench.test.ts
```

Median milliseconds (two separate runs; the second has the Mission 039 `onLayer` telemetry hook enabled on the new code):

| Instance (largest component) | size | states | pruned | before | after | speed-up | before | after (telemetry) | speed-up |
|---|---|---|---|---|---|---|---|---|---|
| random-int n=24 s=2 | 24 | 5,816 | 93,403 | 37.6 | 33.1 | ×1.14 | 35.1 | 32.5 | ×1.08 |
| random-int n=30 s=3 | 30 | 3,956 | 85,792 | 8 | 6.8 | ×1.18 | 8.5 | 7 | ×1.21 |
| ties n=30 s=1 | 30 | 623,964 | 11,462,718 | 3309.2 | 1225.8 | ×2.7 | 3228.4 | 1226.2 | ×2.63 |
| ties n=35 s=3 | 35 | 310,164 | 6,931,942 | 1677.1 | 599.7 | ×2.8 | 1648.9 | 555.5 | ×2.97 |
| random-int n=35 s=3 | 35 | 216,203 | 5,045,987 | 1175 | 554.2 | ×2.12 | 1309.5 | 604.4 | ×2.17 |
| multi-comp(b=12) n=120 s=1 (largest component) | 12 | 1 | 12 | 0.1 | 0 | ×1 | 0 | 0.1 | ×0 |

Raw data: `cutdp.paired.json`, `cutdp.telemetry.json`. The speed-up appears where the search creates
10⁵–10⁶ states (2.1–3.0×); small searches are within noise; the last row is a trivial component included
as a sanity check. Telemetry overhead is within run-to-run noise.

**Peak memory** (ties n = 30, seed 1, 623 964 states; VmHWM of the test process, three fresh processes each):

```
for impl in reference current; do STUDIO039_IMPL=$impl npx vitest run --config bench/vitest.config.ts bench/studio039mem.bench.test.ts; done
```

    impl=reference states=623964 beta=152 peakRSS=701368 kB
    impl=current states=623964 beta=152 peakRSS=383748 kB
    impl=reference states=623964 beta=152 peakRSS=701836 kB
    impl=current states=623964 beta=152 peakRSS=409292 kB
    impl=reference states=623964 beta=152 peakRSS=707176 kB
    impl=current states=623964 beta=152 peakRSS=417100 kB

i.e. about 700 MB → about 400 MB peak resident memory for the whole process (including the ~100 MB test runner).

What changed: one Uint32Array plus three Float64Arrays *per state* became per-layer flat typed arrays; the child's
set key is derived from the parent's numeric key (no mask copy for duplicate children); after each layer only the
parent/added links are retained. The search order, pruning test (same floating-point operations) and tie-breaking
are unchanged.

## 2. Initial JavaScript of /studio/ (production build)

Measured from `out/studio/index.html` (all `<script>` chunks it references), gzip -9 via Python:

| Build | scripts | raw | gzip |
|---|---|---|---|
| `main` @ ffe5d22 (before) | 10 | 676 KB | 211 KB |
| Mission 039 without code-splitting | 10 | 778 KB | 243 KB |
| Mission 039 (workspaces code-split; solver catalogue/config split from engines) | 10 | 672 KB | 211 KB |

The engines (ATLAS, cut-bounded DP, packing, AutoCut) are no longer in the page bundle; they load only in the worker.

## 3. Main-thread input pipeline

`npx vitest run --config bench/vitest.config.ts bench/studio039main.bench.test.ts` (median of 5):

| n | parse | build model | recommend | profile | fingerprint |
|---|---|---|---|---|---|
| 60 | 3.4 ms | 1.6 ms | 0.2 ms | 0.5 ms | 1.0 ms |
| 200 | 17.5 ms | 9.4 ms | 0.5 ms | 2.4 ms | 2.3 ms |
| 400 | 65.9 ms | 28.2 ms | 1.3 ms | 5.8 ms | 9.7 ms |

At n = 400 a full rebuild costs ≈ 0.1 s, so the Studio rebuilds the model from a deferred (low-priority) copy of
the text. No speed-up is claimed for this; it changes scheduling, not cost.

## 4. Independent certificate verification

Measured once (Node, same machine): the 60-item example solves in 0.9 s and verifies in 7.9 s (52 177 verifier
states); ties n = 30 solves in 1.6 s and verifies in 49 s (623 964 states). The verifier was **not** optimised:
its value is that it is small, BigInt-only and shares no code with the solver. It runs in its own worker with a
state budget (UNDECIDED, never ACCEPTED, when exceeded) and can be cancelled.
