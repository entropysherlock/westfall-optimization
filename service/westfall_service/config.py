"""Service configuration. Every value can be overridden by an environment variable; no secret is
ever stored in the repository (API keys are configured as SHA-256 hashes)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Limits:
    max_body_bytes: int = _int("WESTFALL_MAX_BODY_BYTES", 2_000_000)
    max_vertices: int = _int("WESTFALL_MAX_VERTICES", 400)
    max_edges: int = _int("WESTFALL_MAX_EDGES", 80_000)
    max_abs_value: int = 10**12
    max_exact_vertices: int = _int("WESTFALL_MAX_EXACT_VERTICES", 62)
    max_time_limit_s: int = _int("WESTFALL_MAX_TIME_LIMIT_S", 300)
    default_time_limit_s: int = _int("WESTFALL_DEFAULT_TIME_LIMIT_S", 60)
    max_concurrent_jobs: int = _int("WESTFALL_MAX_CONCURRENT_JOBS", 2)
    max_queued_jobs: int = _int("WESTFALL_MAX_QUEUED_JOBS", 20)
    job_retention_s: int = _int("WESTFALL_JOB_RETENTION_S", 3600)
    memory_limit_mb: int = _int("WESTFALL_JOB_MEMORY_MB", 2048)
    requests_per_minute: int = _int("WESTFALL_REQUESTS_PER_MINUTE", 120)
    jobs_per_hour: int = _int("WESTFALL_JOBS_PER_HOUR", 30)


LIMITS = Limits()


@dataclass(frozen=True)
class Settings:
    # comma-separated SHA-256 hex digests of accepted API keys; empty = open access (development only)
    api_key_hashes: frozenset = field(default_factory=lambda: frozenset(
        h.strip().lower() for h in os.environ.get("WESTFALL_API_KEY_SHA256", "").split(",") if h.strip()))
    # comma-separated allowed browser origins for CORS
    allowed_origins: tuple = field(default_factory=lambda: tuple(
        o.strip() for o in os.environ.get("WESTFALL_ALLOWED_ORIGINS", "https://entropysherlock.github.io,http://localhost:3000").split(",") if o.strip()))
    # trust X-Forwarded-For from a reverse proxy (only when deployed behind one)
    trust_proxy: bool = os.environ.get("WESTFALL_TRUST_PROXY", "0") == "1"


VERSION = "1.0.0"
