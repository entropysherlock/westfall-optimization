import Link from "next/link";
import { Callout, PageHeader } from "@/components/ui";
import { blob, STUDIO_API_URL, tree } from "@/lib/site";

export const metadata = { title: "Job API", description: "HTTP API of the Westfall Optimization job service: endpoints, limits, authentication and deployment." };

function Code({ children }: { children: string }) {
  return <pre tabIndex={0} className="my-4 overflow-x-auto rounded-lg border border-line bg-ink-900 p-4 font-mono text-[12.5px] leading-relaxed text-fog-300">{children}</pre>;
}

export default function ApiDocs() {
  return (
    <>
      <PageHeader kicker="Documentation · Job API" title="Westfall Optimization job service">
        A small HTTP service that runs the Python BLX 2.0 solver portfolio, the exact subset DP, HiGHS MILP and local search as background jobs, with time limits, cancellation and resource limits. It is open source in <a className="text-accent-600 underline" href={tree("service")}>service/</a>.
      </PageHeader>
      <article className="mx-auto max-w-3xl space-y-5 px-5 py-14 text-[15px] leading-relaxed text-fog-300 sm:px-8">
        <Callout tone={STUDIO_API_URL ? "ok" : "warn"} title="Deployment status">
          {STUDIO_API_URL
            ? <>This site is configured to use the service at <span className="font-mono">{STUDIO_API_URL}</span>.</>
            : <>No public instance of this service is operated at present. The website is hosted on GitHub Pages, which serves static files only. The service is complete and tested, and it must be deployed separately (see below). Until it is, the Studio solves everything in the browser and says so.</>}
        </Callout>

        <h2 className="pt-4 text-2xl font-semibold text-fog-100">Endpoints</h2>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="table-clean">
            <thead><tr><th>Method</th><th>Path</th><th>Purpose</th></tr></thead>
            <tbody>
              <tr><td className="font-mono">GET</td><td className="font-mono">/v1/health</td><td>status, version, limits, solvers, queue size</td></tr>
              <tr><td className="font-mono">POST</td><td className="font-mono">/v1/jobs</td><td>submit a job; returns <span className="font-mono">202</span> with a job id</td></tr>
              <tr><td className="font-mono">GET</td><td className="font-mono">/v1/jobs/&#123;id&#125;</td><td>state (queued, running, completed, failed, cancelled) and the verified result</td></tr>
              <tr><td className="font-mono">DELETE</td><td className="font-mono">/v1/jobs/&#123;id&#125;</td><td>cancel: a queued job is dropped, a running one is terminated</td></tr>
            </tbody>
          </table>
        </div>
        <p>An OpenAPI description is served at <span className="font-mono">/v1/openapi.json</span>, with interactive docs at <span className="font-mono">/v1/docs</span>.</p>

        <h2 className="pt-4 text-2xl font-semibold text-fog-100">Submitting a job</h2>
        <Code>{`curl -X POST "$API/v1/jobs" -H "Content-Type: application/json" -H "X-API-Key: $KEY" -d '{
  "instance": {
    "interpretation": "skew",
    "names": ["A", "B", "C"],
    "matrix": [[0, 2, "-1/2"], [-2, 0, 1], ["1/2", -1, 0]]
  },
  "solver": "blx-auto",
  "time_limit_s": 60
}'
# -> {"id": "Qe3...", "status": "queued"}`}</Code>
        <p>The <span className="font-mono">instance</span> object uses the same JSON format as the Studio (<Link className="text-accent-600 underline" href="/docs/#input-formats">input formats</Link>), but <span className="font-mono">interpretation</span> is required. Solvers: <span className="font-mono">blx-auto</span>, <span className="font-mono">subset-dp</span> (n ≤ 24), <span className="font-mono">milp</span> and <span className="font-mono">local-search</span>.</p>
        <Code>{`curl "$API/v1/jobs/Qe3..." -H "X-API-Key: $KEY"
{
  "id": "Qe3...", "status": "completed", "solver": "blx-auto", "n": 3,
  "progress": null,
  "result": {
    "status": "OPTIMAL",
    "status_note": "exact route completed; optimality is established ...",
    "order": ["A", "B", "C"], "objective": "5/2", "initial_objective": "5/2", "F_A": "5/2",
    "verification": {"permutation": true, "objective_recomputed_exactly": true, "identity_holds": true},
    "route": "sldp", "solver_time_s": 0.004
  },
  "error": null
}`}</Code>
        <p><span className="font-mono">progress</span> is always <span className="font-mono">null</span>: these solvers do not expose measurable progress, and the service does not invent percentages. Statuses mean the same as in the Studio. <span className="font-mono">OPTIMAL</span> is reported only when the exact route completed or the MILP was proved optimal. Every objective is recomputed exactly from the submitted data.</p>

        <h2 className="pt-4 text-2xl font-semibold text-fog-100">Limits and security</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Request body ≤ 2 MB; ≤ 400 items; ≤ 80 000 edges; |value| ≤ 10¹²; values must be exactly representable after integer scaling (below 2⁵³).</li>
          <li>Each job runs in its own process with a hard time limit (≤ 300 s, default 60 s) and an address-space limit (2 GB by default). At most 2 jobs run concurrently and 20 can wait; when the queue is full the service returns <span className="font-mono">503</span>.</li>
          <li>Rate limits per client: 120 requests per minute and 30 jobs per hour (<span className="font-mono">429</span> when exceeded).</li>
          <li>Optional API keys, configured as SHA-256 hashes, so the plaintext keys are never stored. A client can only see and cancel its own jobs.</li>
          <li>CORS is restricted to configured origins. Job data is held in memory only and deleted one hour after completion. Nothing is written to disk.</li>
        </ul>

        <h2 className="pt-4 text-2xl font-semibold text-fog-100">Deployment</h2>
        <p>The service is a Python 3.11+ application (FastAPI and Uvicorn). It must run as a <em>single</em> server process, because the job queue lives in memory. Scale it by running several independent instances behind a load balancer with sticky sessions, or by replacing the queue with Redis or a database (not implemented).</p>
        <Code>{`docker build -f service/Dockerfile -t westfall-service .
docker run -p 8000:8000 \\
  -e WESTFALL_ALLOWED_ORIGINS=https://entropysherlock.github.io \\
  -e WESTFALL_API_KEY_SHA256=$(printf '%s' "$KEY" | sha256sum | cut -d' ' -f1) \\
  westfall-service`}</Code>
        <p>To connect the website, rebuild it with <span className="font-mono">NEXT_PUBLIC_STUDIO_API_URL=https://your-service.example</span>. Only the public URL is embedded, never a key. All configuration variables are listed in <a className="text-accent-600 underline" href={blob("service/README.md")}>service/README.md</a>.</p>
      </article>
    </>
  );
}
