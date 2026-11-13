/// <reference lib="webworker" />
/**
 * Studio solver worker. Runs one job and reports real progress where it is measurable.
 * Cancellation is performed by the page terminating this worker (Worker.terminate()).
 */
import { problemFromWire, solve, toWire, type WireJob } from "./runner";

self.onmessage = (ev: MessageEvent<WireJob>) => {
  const job = ev.data;
  try {
    const p = problemFromWire(job);
    let last = 0;
    const result = solve(p, job.solver, job.config, {
      progress: (fraction, note) => {
        const t = performance.now();
        if (t - last < 100 && fraction < 1) return;
        last = t;
        self.postMessage({ type: "progress", id: job.id, fraction, note });
      },
    });
    self.postMessage({ type: "done", id: job.id, result: toWire(result) });
  } catch (e) {
    self.postMessage({ type: "error", id: job.id, message: (e as Error).message });
  }
};
