/// <reference lib="webworker" />
/**
 * Certificate verifier worker. Imports ONLY the independent verifier (certverify.ts), never solver code.
 * Cancellation: the page terminates this worker.
 */
import { verifyCertificate, type CertificateLike } from "./certverify";

self.onmessage = (ev: MessageEvent<{ cert: CertificateLike; maxStates?: number }>) => {
  try {
    self.postMessage({ type: "verdict", verdict: verifyCertificate(ev.data.cert, { maxStates: ev.data.maxStates }) });
  } catch (e) {
    self.postMessage({ type: "error", message: (e as Error).message });
  }
};
