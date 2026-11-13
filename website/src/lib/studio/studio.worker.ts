/// <reference lib="webworker" />
/**
 * Studio solver worker. Runs one job and streams measured progress to the page.
 * Cancellation is performed by the page terminating this worker (Worker.terminate()), which stops the
 * computation immediately regardless of what the solver is doing.
 *
 * Messages to the page (all postMessage-safe plain data):
 *   { type: "progress", fraction, note }        measurable fraction (subset DP / heuristic budget only)
 *   { type: "telemetry", events: Telemetry[] }  measured solver events, batched (≤ ~8 batches per second)
 *   { type: "done", result } | { type: "error", message }
 */
import { problemFromWire, solve, toWire, type Telemetry, type WireJob } from "./runner";

self.onmessage = (ev: MessageEvent<WireJob>) => {
  const job = ev.data;
  // batch telemetry: structural events (plan, component phases, incumbent improvements) are always kept;
  // high-rate events (DP layers, ticks) keep only the latest per component between flushes.
  let queue: Telemetry[] = [];
  let latestRate = new Map<string, Telemetry>();
  let lastFlush = 0;
  const flush = (force = false) => {
    const t = performance.now();
    if (!force && t - lastFlush < 120) return;
    lastFlush = t;
    const events = [...queue, ...latestRate.values()];
    queue = [];
    latestRate = new Map();
    if (events.length) self.postMessage({ type: "telemetry", id: job.id, events });
  };
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
      telemetry: (e) => {
        if (e.kind === "layer" || e.kind === "tick") latestRate.set(`${e.kind}:${e.index}`, e);
        else queue.push(e);
        flush(e.kind === "plan");
      },
    });
    flush(true);
    self.postMessage({ type: "done", id: job.id, result: toWire(result) });
  } catch (e) {
    flush(true);
    self.postMessage({ type: "error", id: job.id, message: (e as Error).message });
  }
};
