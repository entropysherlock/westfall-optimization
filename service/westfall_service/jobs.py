"""Background job execution.

Each job runs in its own operating-system process so that it can be cancelled and so that a hard
time limit and a memory limit can be enforced regardless of what the solver is doing. A bounded
FIFO queue and a fixed number of concurrent workers prevent a burst of requests from exhausting
the host. Job data is held in memory only and is discarded after `job_retention_s`.
"""
from __future__ import annotations

import multiprocessing as mp
import secrets
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from fractions import Fraction

from .config import LIMITS, VERSION
from .model import Model

SOLVERS = {
    "blx-auto": "BLX 2.0 portfolio (exact routes: exclusion DP with hybrid/packing bounds, HiGHS MILP)",
    "subset-dp": "Exact subset dynamic program (n <= 24)",
    "milp": "HiGHS MILP (exact when the solver proves optimality within the time limit)",
    "local-search": "Multi-start insertion local search (heuristic; never claims optimality)",
}


def _run_solver(model_state: dict, solver: str, time_limit: float, conn) -> None:  # pragma: no cover - child process
    try:
        try:
            import resource

            mb = LIMITS.memory_limit_mb
            resource.setrlimit(resource.RLIMIT_AS, (mb * 2**20, mb * 2**20))
        except Exception:
            pass
        import numpy as np

        from westfall_optimization.blx.portfolio import solve
        from westfall_optimization.solvers.local_search import best_of_restarts

        M = np.array(model_state["M"], dtype=float)
        n = M.shape[0]
        t0 = time.time()
        if solver == "local-search":
            order = best_of_restarts(M, restarts=max(5, min(200, int(time_limit * 4))), seed=1) if n > 1 else list(range(n))
            conn.send({"ok": True, "order": [int(v) for v in order], "proved": False, "route": "local-search", "time": time.time() - t0})
            return
        mode = {"blx-auto": "auto", "subset-dp": "subset_dp", "milp": "milp"}[solver]
        r = solve(M, mode=mode, milp_time_limit=max(1.0, time_limit - 1.0))
        order = r.get("order") or r.get("incumbent_order")
        conn.send({
            "ok": True,
            "order": [int(v) for v in order],
            "proved": r.get("status") == "PROVED_OPTIMAL",
            "route": r.get("route"),
            "proved_by": r.get("proved_by"),
            "generated_states": r.get("generated_states"),
            "time": time.time() - t0,
        })
    except MemoryError:
        conn.send({"ok": False, "error": f"memory limit of {LIMITS.memory_limit_mb} MB exceeded"})
    except Exception as e:  # report solver errors to the user without a traceback
        conn.send({"ok": False, "error": f"{type(e).__name__}: {e}"[:500]})


@dataclass
class Job:
    id: str
    owner: str
    model: Model
    solver: str
    time_limit: float
    status: str = "queued"  # queued | running | completed | failed | cancelled
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    finished_at: float | None = None
    result: dict | None = None
    error: str | None = None
    process: object = None

    def public(self) -> dict:
        return {
            "id": self.id,
            "status": self.status,
            "solver": self.solver,
            "n": self.model.n,
            "time_limit_s": self.time_limit,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            # BLX does not expose measurable progress; we never invent percentages
            "progress": None,
            "result": self.result,
            "error": self.error,
            "service_version": VERSION,
        }


class JobManager:
    def __init__(self, max_concurrent: int | None = None, max_queued: int | None = None):
        self.max_concurrent = max_concurrent or LIMITS.max_concurrent_jobs
        self.max_queued = max_queued or LIMITS.max_queued_jobs
        self.jobs: dict[str, Job] = {}
        self.queue: deque[str] = deque()
        self.lock = threading.Lock()
        self.running = 0
        self.ctx = mp.get_context("spawn")

    # ------------------------------------------------------------------ public API
    def submit(self, owner: str, model: Model, solver: str, time_limit: float) -> Job:
        with self.lock:
            self._purge()
            if len(self.queue) >= self.max_queued:
                raise OverflowError("the job queue is full; try again later")
            job = Job(secrets.token_urlsafe(12), owner, model, solver, time_limit)
            self.jobs[job.id] = job
            self.queue.append(job.id)
        self._dispatch()
        return job

    def get(self, job_id: str) -> Job | None:
        with self.lock:
            return self.jobs.get(job_id)

    def cancel(self, job_id: str) -> Job | None:
        with self.lock:
            job = self.jobs.get(job_id)
            if job is None:
                return None
            if job.status == "queued":
                self.queue.remove(job.id)
                job.status, job.finished_at = "cancelled", time.time()
            elif job.status == "running" and job.process is not None:
                job.status = "cancelled"  # the monitor thread sees this and terminates the process
                job.process.terminate()
        return job

    def stats(self) -> dict:
        with self.lock:
            return {"running": self.running, "queued": len(self.queue), "max_concurrent": self.max_concurrent, "max_queued": self.max_queued}

    # ------------------------------------------------------------------ internals
    def _purge(self) -> None:
        cutoff = time.time() - LIMITS.job_retention_s
        for jid in [j.id for j in self.jobs.values() if j.finished_at and j.finished_at < cutoff]:
            del self.jobs[jid]

    def _dispatch(self) -> None:
        with self.lock:
            while self.running < self.max_concurrent and self.queue:
                job = self.jobs[self.queue.popleft()]
                self.running += 1
                job.status, job.started_at = "running", time.time()
                threading.Thread(target=self._run, args=(job,), daemon=True).start()

    def _run(self, job: Job) -> None:
        parent, child = self.ctx.Pipe(duplex=False)
        state = {"M": job.model.M}
        proc = self.ctx.Process(target=_run_solver, args=(state, job.solver, job.time_limit, child), daemon=True)
        job.process = proc
        try:
            proc.start()
            child.close()
            got = parent.poll(job.time_limit + 2.0)
            if job.status == "cancelled":
                pass
            elif not got:
                job.status, job.error = "failed", f"time limit of {job.time_limit:g} s exceeded; the job was terminated"
            else:
                try:
                    msg = parent.recv()
                except EOFError:
                    msg = {"ok": False, "error": "the solver process exited unexpectedly (possibly out of memory)"}
                if msg.get("ok"):
                    try:
                        job.result = self._finish(job, msg)
                        job.status = "completed"
                    except Exception as e:
                        job.status, job.error = "failed", f"result verification failed: {e}"
                else:
                    job.status, job.error = "failed", msg.get("error", "solver failed")
        finally:
            if proc.is_alive():
                proc.terminate()
                proc.join(2)
                if proc.is_alive():
                    proc.kill()
            job.process = None
            job.finished_at = time.time()
            with self.lock:
                self.running -= 1
            self._dispatch()

    @staticmethod
    def _finish(job: Job, msg: dict) -> dict:
        m = job.model
        order = msg["order"]
        if sorted(order) != list(range(m.n)):
            raise RuntimeError("solver returned an invalid permutation")
        fa = m.fa(order)
        user = m.user_objective(order)
        init = m.user_objective(m.initial_order)
        proved = bool(msg.get("proved"))
        return {
            "status": "OPTIMAL" if proved else "FEASIBLE",
            "status_note": (
                "exact route completed; optimality is established (BLX/HiGHS, double precision on integer-scaled data)"
                if proved else "optimality is NOT established; the best ordering found is returned"
            ),
            "order": [m.names[v] for v in order],
            "objective": str(user),
            "initial_objective": str(init),
            "F_A": str(fa),
            "verification": {
                "permutation": True,
                "objective_recomputed_exactly": True,
                "identity_holds": m.user_from_fa(fa) == user,
            },
            "route": msg.get("route"),
            "proved_by": msg.get("proved_by"),
            "generated_states": msg.get("generated_states"),
            "solver_time_s": round(float(msg.get("time", 0.0)), 4),
            "objective_decimal": float(Fraction(user)),
        }
