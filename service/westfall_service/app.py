"""Westfall Optimization job API (FastAPI).

    GET    /v1/health          service status, limits, solvers
    POST   /v1/jobs            submit {instance, solver, time_limit_s} -> 202 {id, status}
    GET    /v1/jobs/{id}       job status and (when completed) the verified result
    DELETE /v1/jobs/{id}       cancel a queued or running job

Security model: optional API keys (SHA-256 hashes in WESTFALL_API_KEY_SHA256), per-client rate
limits, request-size limits, instance-size limits, per-job time and memory limits, a bounded
queue, CORS restricted to configured origins, and no persistence of submitted data.
Only the submitting client (same API key, or same address when keys are disabled) can read or
cancel a job.
"""
from __future__ import annotations

import hashlib
import threading
import time
from collections import defaultdict

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import LIMITS, VERSION, Settings
from .jobs import SOLVERS, JobManager
from .model import InstanceError, build_model


class JobRequest(BaseModel):
    instance: dict
    solver: str = "blx-auto"
    time_limit_s: float = Field(default=LIMITS.default_time_limit_s, gt=0)


class RateLimiter:
    """Sliding-window counters per client (thread-safe, in memory)."""

    def __init__(self):
        self.lock = threading.Lock()
        self.events: dict[tuple[str, str], list[float]] = defaultdict(list)

    def hit(self, client: str, bucket: str, limit: int, window: float) -> bool:
        now = time.time()
        with self.lock:
            ev = [t for t in self.events[(client, bucket)] if t > now - window]
            ok = len(ev) < limit
            if ok:
                ev.append(now)
            self.events[(client, bucket)] = ev
            return ok


def create_app(settings: Settings | None = None, manager: JobManager | None = None,
               requests_per_minute: int | None = None, jobs_per_hour: int | None = None) -> FastAPI:
    settings = settings or Settings()
    rpm = requests_per_minute or LIMITS.requests_per_minute
    jph = jobs_per_hour or LIMITS.jobs_per_hour
    manager = manager or JobManager()
    limiter = RateLimiter()
    app = FastAPI(title="Westfall Optimization Job API", version=VERSION, docs_url="/v1/docs", openapi_url="/v1/openapi.json", redoc_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.allowed_origins), allow_methods=["GET", "POST", "DELETE"],
                       allow_headers=["Content-Type", "X-API-Key"], max_age=600)

    @app.middleware("http")
    async def body_limit(request: Request, call_next):
        size = request.headers.get("content-length")
        if size is not None and (not size.isdigit() or int(size) > LIMITS.max_body_bytes):
            return JSONResponse({"detail": f"request body larger than {LIMITS.max_body_bytes} bytes"}, status_code=413)
        if request.method == "POST" and size is None:
            return JSONResponse({"detail": "Content-Length is required"}, status_code=411)
        return await call_next(request)

    def client_id(request: Request) -> str:
        key = request.headers.get("x-api-key", "")
        if settings.api_key_hashes:
            digest = hashlib.sha256(key.encode()).hexdigest()
            if digest not in settings.api_key_hashes:
                raise HTTPException(401, "a valid X-API-Key header is required")
            client = "key:" + digest[:16]
        else:
            ip = request.client.host if request.client else "unknown"
            if settings.trust_proxy and request.headers.get("x-forwarded-for"):
                ip = request.headers["x-forwarded-for"].split(",")[0].strip()
            client = "ip:" + ip
        if not limiter.hit(client, "req", rpm, 60):
            raise HTTPException(429, "rate limit exceeded; slow down")
        return client

    @app.get("/v1/health")
    def health():
        return {
            "ok": True,
            "version": VERSION,
            "auth_required": bool(settings.api_key_hashes),
            "solvers": SOLVERS,
            "queue": manager.stats(),
            "limits": {
                "max_vertices": LIMITS.max_vertices,
                "max_exact_vertices": LIMITS.max_exact_vertices,
                "max_time_limit_s": LIMITS.max_time_limit_s,
                "max_body_bytes": LIMITS.max_body_bytes,
                "jobs_per_hour": jph,
                "job_retention_s": LIMITS.job_retention_s,
            },
        }

    @app.post("/v1/jobs", status_code=202)
    def submit(req: JobRequest, client: str = Depends(client_id)):
        if req.solver not in SOLVERS:
            raise HTTPException(422, f"unknown solver; choose one of {', '.join(SOLVERS)}")
        if req.time_limit_s > LIMITS.max_time_limit_s:
            raise HTTPException(422, f"time_limit_s must be at most {LIMITS.max_time_limit_s}")
        try:
            model = build_model(req.instance)
        except InstanceError as e:
            raise HTTPException(422, str(e)) from None
        if req.solver in ("blx-auto", "subset-dp") and model.n > (24 if req.solver == "subset-dp" else LIMITS.max_vertices):
            raise HTTPException(422, f"{req.solver} does not support n = {model.n}")
        if not limiter.hit(client, "jobs", jph, 3600):
            raise HTTPException(429, f"job quota exceeded ({jph} jobs per hour)")
        try:
            job = manager.submit(client, model, req.solver, float(req.time_limit_s))
        except OverflowError as e:
            raise HTTPException(503, str(e)) from None
        return {"id": job.id, "status": job.status}

    def owned(job_id: str, client: str):
        job = manager.get(job_id)
        if job is None or job.owner != client:
            raise HTTPException(404, "job not found")
        return job

    @app.get("/v1/jobs/{job_id}")
    def status(job_id: str, client: str = Depends(client_id)):
        return owned(job_id, client).public()

    @app.delete("/v1/jobs/{job_id}")
    def cancel(job_id: str, client: str = Depends(client_id)):
        owned(job_id, client)
        job = manager.cancel(job_id)
        return {"id": job_id, "status": job.status if job else "unknown"}

    return app


app = create_app()
