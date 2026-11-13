"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Problem } from "@/lib/studio/model";
import { instanceJson } from "@/lib/studio/report";
import { STUDIO_API_URL } from "@/lib/site";

interface RemoteJob {
  id: string;
  status: string;
  error: string | null;
  result: null | { status: string; status_note: string; order: string[]; objective: string; initial_objective: string; route: string | null; solver_time_s: number };
}

const SOLVERS: [string, string][] = [
  ["blx-auto", "BLX 2.0 portfolio (exact)"],
  ["subset-dp", "Exact subset DP (n ≤ 24)"],
  ["milp", "HiGHS MILP (exact if proved)"],
  ["local-search", "Local search (heuristic)"],
];

/**
 * Remote solver service. Enabled only when this deployment was built with NEXT_PUBLIC_STUDIO_API_URL.
 * Without it, the panel says so plainly instead of pretending a backend exists.
 */
export default function RemotePanel({ problem }: { problem: Problem | null }) {
  const [apiKey, setApiKey] = useState("");
  const [solver, setSolver] = useState("blx-auto");
  const [limit, setLimit] = useState(60);
  const [job, setJob] = useState<RemoteJob | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  if (!STUDIO_API_URL)
    return (
      <section className="ws-panel p-5 text-sm" data-testid="remote-unconfigured">
        <p className="font-semibold ws-text">Remote solver service: not configured on this deployment</p>
        <p className="mt-1.5 leading-relaxed ws-muted">
          Larger exact runs use the BLX 2.0 solver in a separately hosted job service (queue, time limits, cancellation, API keys). This public site is static and has no such
          service connected, so all solving above happens in your browser. See <Link href="/docs/api/" className="ws-accent underline">the job API documentation</Link> for deployment.
        </p>
      </section>
    );

  const headers = (): Record<string, string> => ({ "Content-Type": "application/json", ...(apiKey ? { "X-API-Key": apiKey } : {}) });
  const poll = (id: string) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const r = await fetch(`${STUDIO_API_URL}/v1/jobs/${id}`, { headers: headers() });
        if (!r.ok) throw new Error(`status request failed (${r.status})`);
        const j = (await r.json()) as RemoteJob;
        setJob(j);
        if (["completed", "failed", "cancelled"].includes(j.status) && timer.current) clearInterval(timer.current);
      } catch (e) {
        setErr(`${(e as Error).message}. Polling stopped; press “Refresh” to retry.`);
        if (timer.current) clearInterval(timer.current);
      }
    }, 1000);
  };
  const submit = async () => {
    if (!problem) return;
    setErr(null);
    setJob(null);
    try {
      const r = await fetch(`${STUDIO_API_URL}/v1/jobs`, { method: "POST", headers: headers(),
        body: JSON.stringify({ instance: instanceJson(problem), solver, time_limit_s: limit }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof body.detail === "string" ? body.detail : `request failed (${r.status})`);
      setJob({ id: body.id, status: body.status, error: null, result: null });
      poll(body.id);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const cancel = async () => {
    if (!job) return;
    await fetch(`${STUDIO_API_URL}/v1/jobs/${job.id}`, { method: "DELETE", headers: headers() }).catch(() => undefined);
  };
  const active = job && (job.status === "queued" || job.status === "running");
  return (
    <section className="ws-panel p-5 text-sm">
      <p className="font-semibold ws-text">Remote solver service</p>
      <p className="mt-1 text-xs ws-faint">Endpoint: <span className="font-mono">{STUDIO_API_URL}</span>. Your instance is sent to this service.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select className="ws-field" value={solver} onChange={(e) => setSolver(e.target.value)} aria-label="Remote solver">
          {SOLVERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <input className="ws-field" type="number" min={1} max={300} value={limit} aria-label="Remote time limit in seconds" onChange={(e) => setLimit(Math.max(1, Math.min(300, Number(e.target.value) || 1)))} />
        <input className="ws-field sm:col-span-2" type="password" autoComplete="off" placeholder="API key (if the service requires one)" value={apiKey} onChange={(e) => setApiKey(e.target.value)} aria-label="API key" />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="ws-btn ws-btn-primary" disabled={!problem || !!active} onClick={submit}>Submit job</button>
        {active && <button type="button" className="ws-btn" onClick={cancel}>Cancel job</button>}
        {job && !active && <button type="button" className="ws-btn ws-btn-ghost" onClick={() => poll(job.id)}>Refresh</button>}
      </div>
      {err && <p className="mt-2 text-xs ws-back" role="alert">{err}</p>}
      {job && (
        <div className="mt-3 ws-sunken p-3" role="status" aria-live="polite">
          <p className="font-mono text-xs ws-faint">job {job.id}</p>
          <p className="mt-1 font-semibold ws-text">{job.status.toUpperCase()}</p>
          {active && <p className="text-xs ws-faint">The service does not report measurable progress for this solver.</p>}
          {job.error && <p className="mt-1 text-xs ws-back">{job.error}</p>}
          {job.result && (
            <div className="mt-2 space-y-1 text-[13px] ws-muted">
              <p><span className="font-semibold">{job.result.status === "OPTIMAL" ? "Optimality established" : "Feasible solution only"}</span>: {job.result.status_note}</p>
              <p>Objective {job.result.objective} (initial {job.result.initial_objective}); route {job.result.route ?? "—"}; {job.result.solver_time_s} s</p>
              <p className="break-words">Order: {job.result.order.join(" → ")}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
