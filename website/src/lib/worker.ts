/// <reference lib="webworker" />
import { exclusionDP, insertionLocalSearch, score, subsetDP, type Matrix } from "./engine";

export type Job = { kind: "subset" | "exclusion"; A: Matrix; blocks?: number[][]; start: number[] };

self.onmessage = (ev: MessageEvent<Job>) => {
  const { kind, A, blocks, start } = ev.data;
  const t0 = performance.now();
  try {
    const incumbent = insertionLocalSearch(A, start);
    if (kind === "subset") {
      const r = subsetDP(A);
      self.postMessage({ ok: true, kind, incumbent, incumbentScore: score(A, incumbent), opt: r.opt, order: r.order,
        generated: r.states, retained: r.states, excluded: 0, certifiedCount: r.certifiedCount, ms: performance.now() - t0 });
    } else {
      const r = exclusionDP(A, incumbent, { blocks, maxStates: 3_000_000 });
      const cert = A.length <= 14 ? subsetDP(A).certifiedCount : null;
      self.postMessage({ ok: true, kind, incumbent, incumbentScore: score(A, incumbent), opt: r.opt, order: r.order,
        generated: r.generated, retained: r.retained, excluded: r.excluded, certifiedCount: cert, bound: r.bound, ms: performance.now() - t0 });
    }
  } catch (e) {
    self.postMessage({ ok: false, error: (e as Error).message, ms: performance.now() - t0 });
  }
};
