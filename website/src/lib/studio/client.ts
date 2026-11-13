/**
 * Browser-side job control for the Studio (Mission 039). One solver job = one fresh Web Worker, so cancelling
 * is immediate (Worker.terminate) and a crashed or out-of-memory job never affects the page. A watchdog stops
 * a job shortly after its time limit even if a solver cannot check its own deadline.
 */
import type { Problem } from "./model";
import { instanceJson, type SolveResult } from "./report";
import { fromWire, type SolveConfig, type Telemetry, type WireJob, type WireResult } from "./runner";
import type { SolverId } from "./solvers";
import type { CertificateLike, Verdict } from "./certverify";

export interface JobCallbacks {
  onProgress?: (fraction: number, note: string) => void;
  onTelemetry?: (events: Telemetry[]) => void;
  onDone: (r: SolveResult, wallMs: number) => void;
  onError: (message: string, wallMs: number) => void;
}

let seq = 0;

export function startSolve(p: Problem, solver: SolverId, config: SolveConfig, cb: JobCallbacks): { cancel: () => void } {
  const w = new Worker(new URL("./studio.worker.ts", import.meta.url));
  const t0 = performance.now();
  let finished = false;
  const stop = () => { finished = true; w.terminate(); clearTimeout(dog); };
  const id = ++seq;
  w.onmessage = (ev: MessageEvent<{ type: string; fraction?: number; note?: string; events?: Telemetry[]; result?: WireResult; message?: string }>) => {
    if (finished) return;
    const d = ev.data;
    if (d.type === "progress") cb.onProgress?.(d.fraction!, d.note!);
    else if (d.type === "telemetry") cb.onTelemetry?.(d.events!);
    else if (d.type === "done") { stop(); cb.onDone(fromWire(d.result!), performance.now() - t0); }
    else if (d.type === "error") { stop(); cb.onError(d.message ?? "unknown error", performance.now() - t0); }
  };
  w.onerror = (e) => { if (finished) return; stop(); cb.onError(e.message || "the solver worker crashed (possibly out of memory); lower the state budget or use a smaller instance", performance.now() - t0); };
  const dog = setTimeout(() => {
    if (finished) return;
    stop();
    cb.onError(`hard time limit of ${config.timeLimitMs / 1000} s exceeded; the job was terminated`, performance.now() - t0);
  }, config.timeLimitMs + 3000);
  const msg: WireJob = { id, instance: instanceJson(p), interpretation: p.interpretation, solver, config };
  w.postMessage(msg);
  return { cancel: () => { if (!finished) stop(); } };
}

/** Run the independent certificate verifier (certverify.ts only) in its own worker. */
export function startVerify(cert: CertificateLike, maxStates: number, cb: { onDone: (v: Verdict) => void; onError: (m: string) => void }): { cancel: () => void } {
  const w = new Worker(new URL("./verify.worker.ts", import.meta.url));
  let finished = false;
  w.onmessage = (ev: MessageEvent<{ type: string; verdict?: Verdict; message?: string }>) => {
    if (finished) return;
    finished = true; w.terminate();
    if (ev.data.verdict) cb.onDone(ev.data.verdict); else cb.onError(ev.data.message ?? "verifier error");
  };
  w.onerror = (e) => { if (finished) return; finished = true; w.terminate(); cb.onError(e.message || "the verifier worker crashed (possibly out of memory)"); };
  w.postMessage({ cert, maxStates });
  return { cancel: () => { if (!finished) { finished = true; w.terminate(); } } };
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
