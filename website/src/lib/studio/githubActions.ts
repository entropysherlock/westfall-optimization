/** Owner-only bridge: actual Python ATLAS-060 runs on GitHub Actions in the PRIVATE repo. */
import type { Problem } from "./model";
import { instanceJson, makeResult, type SolveResult } from "./report";
import type { SolveConfig } from "./config";
import type { SolverId } from "./catalog";
import { parseQ } from "./rational";

const API = "https://api.github.com/repos/entropysherlock/westfall-atlas-commercial";
let sessionToken = "";
export function setAtlas060Token(value: string) { sessionToken = value.trim(); }
export function hasAtlas060Token() { return Boolean(sessionToken); }
export function clearAtlas060Token() { sessionToken = ""; }

type BackendReport = {
  id: string;
  status: "completed" | "failed";
  error?: string;
  result?: {
    status: "OPTIMAL" | "FEASIBLE"; proof: string | null; status_note: string;
    order_index: number[]; objective: string; bound: string | null; gap: string | null;
    certificate: { present: boolean; verdict: string | null; note: string | null };
    solver_version: string | null; method: string | null; details: Record<string, unknown>;
    solver_time_s: number;
  };
};
function resultFromActions(p: Problem, solver: SolverId, config: SolveConfig, job: BackendReport, wallMs: number): SolveResult {
  const report = job.result;
  if (!report) throw Error("Private solver returned no result");
  const order = report.order_index;
  if (!Array.isArray(order) || order.length !== p.n ||
      [...order].sort((a, b) => a - b).some((v, i) => v !== i))
    throw Error("Private solver returned an invalid permutation");
  const proofChecked = report.certificate.present && report.certificate.verdict === "VALID";
  if (report.status === "OPTIMAL" && !proofChecked) throw Error("Unverified optimality claim rejected");
  const details: Record<string, string | number | null> = {
    "execution": "private GitHub Actions, original Python ATLAS-060",
    "certificate": proofChecked ? "VALID (independent integer checker)" : "not available",
    "solver method": report.method, "solver version": report.solver_version,
    "solver time (seconds)": report.solver_time_s, "private job": job.id,
    "reported bound": report.bound, "reported gap": report.gap,
  };
  for (const [k, v] of Object.entries(report.details || {})) {
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      details[k] = typeof v === "boolean" ? String(v) : v;
  }
  const r = makeResult(p, {
    solver, solverLabel: "ATLAS-060 (private GitHub Actions)", status: proofChecked && p.exact ? "OPTIMAL" : "FEASIBLE",
    statusNote: report.status_note, order, runtimeMs: wallMs, details, structure: null,
    config: { timeLimitMs: config.timeLimitMs, seed: config.seed },
    verification: proofChecked ? { crossCheck: { method: "private independent integer certificate checker", agrees: true } } : {},
  });
  const claimedObjective = parseQ(report.objective);
  if (!claimedObjective || !r.objective.eq(claimedObjective)) throw Error("Result failed exact objective recomputation; discarded");
  return r;
}
function headers(token: string): Record<string, string> {
  return { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28" };
}
export function startGitHubActionsSolve(p: Problem, solver: SolverId, config: SolveConfig,
  cb: { onProgress?: (fraction: number, note: string) => void; onDone: (r: SolveResult, wallMs: number) => void; onError: (message: string, wallMs: number) => void }) {
  const t0 = performance.now(), token = sessionToken;
  let stopped = false, timer: ReturnType<typeof setTimeout> | null = null, ctl: AbortController | null = null, id = "";
  const fail = (msg: string) => { if (!stopped) { stopped = true; if (timer) clearTimeout(timer); cb.onError(msg, performance.now()-t0); } };
  const limit = [10000,30000,60000,120000].find(t => t >= config.timeLimitMs) || 120000;
  const poll = async () => {
    if (stopped) return;
    if (performance.now()-t0 > limit + 240000) return fail("Job timed out; inspect private GitHub Actions for details.");
    try {
      ctl = new AbortController();
      const res = await fetch(API + "/contents/runs/" + id + ".json?ref=studio-results", { headers: headers(token), signal: ctl.signal, cache: "no-store" });
      if (stopped) return;
      if (res.status === 404) {
        cb.onProgress?.(0.05,"Private GitHub Actions job queued/running; waiting for result...");
        timer = setTimeout(poll,3500); return;
      }
      if (!res.ok) return fail("Cannot read private result (GitHub HTTP " + res.status + "). Check token Contents: Read permission.");
      const file = await res.json() as { content?: string; encoding?: string };
      if (file.encoding !== "base64" || !file.content) return fail("Malformed GitHub result response");
      const raw = atob(file.content.replace(/\s/g,""));
      const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
      const job = JSON.parse(new TextDecoder().decode(bytes)) as BackendReport;
      if (job.id !== id) return fail("Private job identifier mismatch");
      if (job.status === "failed") return fail(job.error || "Private solver failed");
      if (job.status !== "completed" || !job.result) return fail("Private workflow had no result");
      const wall = performance.now()-t0;
      const result = resultFromActions(p,solver,config,job,wall);
      stopped = true; cb.onDone(result,wall);
    } catch(e) { if (!stopped) fail("Could not access private GitHub result: " + (e as Error).message); }
  };
  (async () => {
    if (!token) return fail("Enter a fine-grained GitHub token in Solver settings first.");
    if (!p.exact || p.n < 3 || p.n > 60) return fail("ATLAS-060 private Actions supports 3-60 items with exact integer entries.");
    const input = JSON.stringify(instanceJson(p));
    if (input.length > 60000) return fail("Instance exceeds the GitHub Actions 60 KB input limit.");
    id = crypto.randomUUID();
    try {
      ctl = new AbortController();
      const res = await fetch(API+"/actions/workflows/atlas060-studio.yml/dispatches",{
        method:"POST",headers:{...headers(token),"Content-Type":"application/json"},signal:ctl.signal,
        body:JSON.stringify({ref:"main",inputs:{instance_json:input,job_id:id,time_ms:String(limit)}}),
      });
      if(stopped)return;
      if(!res.ok)return fail("GitHub rejected ATLAS-060 job (HTTP "+res.status+"): "+(await res.text()).slice(0,220));
      cb.onProgress?.(0,"Submitted to the private GitHub Actions engine");
      timer=setTimeout(poll,3000);
    } catch(e){fail("Could not submit private GitHub Action: "+(e as Error).message);}
  })();
  return { cancel:()=>{stopped=true;if(timer)clearTimeout(timer);ctl?.abort();} };
}
