# Westfall Optimization job service

A small HTTP job API that runs the `westfall_optimization` solvers in the background. It provides the BLX 2.0
portfolio, the exact subset DP, HiGHS MILP and local search, each with time limits, cancellation and resource limits.
The Optimization Studio on the website uses it when the site is built with `NEXT_PUBLIC_STUDIO_API_URL`.

**Status:** the service is implemented and tested (`service/tests`, run in CI). No public instance is operated at
present: GitHub Pages hosts static files only, and the service must be deployed to a container host.

## API

| Method | Path | |
|---|---|---|
| GET | `/v1/health` | status, limits, solvers, queue |
| POST | `/v1/jobs` | `{instance, solver, time_limit_s}` → `202 {id, status}` |
| GET | `/v1/jobs/{id}` | status (`queued`, `running`, `completed`, `failed`, `cancelled`) and result |
| DELETE | `/v1/jobs/{id}` | cancel (queued: dropped; running: process terminated) |

OpenAPI is served at `/v1/openapi.json` and interactive docs at `/v1/docs`. Full documentation is on the website at
`/docs/api/`.

**Guarantees.**
- `OPTIMAL` is reported only when an exact route completed or the MILP proved optimality.
- Heuristic results are `FEASIBLE`.
- Every objective is recomputed exactly (`fractions.Fraction`) from the submitted data.
- `progress` is always `null`: the solvers do not expose measurable progress, and none is invented.

## Running

```bash
pip install -e . -e ./service[test]      # from the repository root
python -m pytest service/tests -q          # integration tests (real worker processes)
uvicorn westfall_service.app:app --port 8000 --workers 1
```

Docker:

```bash
docker build -f service/Dockerfile -t westfall-service .
docker run -p 8000:8000 -e WESTFALL_ALLOWED_ORIGINS=https://entropysherlock.github.io westfall-service
```

Run exactly **one** server process per instance, because the queue is in memory. Put the service behind an HTTPS
reverse proxy and set `WESTFALL_TRUST_PROXY=1` there so that rate limits see client addresses.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `WESTFALL_API_KEY_SHA256` | *(empty: open access)* | comma-separated SHA-256 hex digests of accepted API keys; plaintext keys are never stored |
| `WESTFALL_ALLOWED_ORIGINS` | Pages origin, `http://localhost:3000` | CORS origins |
| `WESTFALL_TRUST_PROXY` | `0` | trust `X-Forwarded-For` (only behind your own proxy) |
| `WESTFALL_MAX_CONCURRENT_JOBS` | `2` | worker processes running at once |
| `WESTFALL_MAX_QUEUED_JOBS` | `20` | queue length before `503` |
| `WESTFALL_MAX_TIME_LIMIT_S` / `WESTFALL_DEFAULT_TIME_LIMIT_S` | `300` / `60` | per-job hard time limit |
| `WESTFALL_JOB_MEMORY_MB` | `2048` | address-space limit per job process (Linux) |
| `WESTFALL_MAX_VERTICES` / `WESTFALL_MAX_EDGES` / `WESTFALL_MAX_BODY_BYTES` | `400` / `80000` / `2000000` | input limits |
| `WESTFALL_REQUESTS_PER_MINUTE` / `WESTFALL_JOBS_PER_HOUR` | `120` / `30` | per-client rate limits |
| `WESTFALL_JOB_RETENTION_S` | `3600` | in-memory job retention after completion |

Generate a key hash with `printf '%s' "$KEY" | sha256sum`.

## Not implemented (prerequisites for paid service)

The following do not exist yet:
- persistent job storage;
- user accounts and organizations;
- usage metering and billing;
- payment processing;
- an admin console.

The architecture leaves room for them: authentication is a single dependency (`client_id`), and job storage is a single
class (`JobManager`).
