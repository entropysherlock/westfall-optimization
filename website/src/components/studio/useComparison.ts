"use client";
/** State and control for the Solver Comparison Lab (kept in the Studio shell so runs survive view switches). */
import { useCallback, useEffect, useRef, useState } from "react";
import { startSolve } from "@/lib/studio/client";
import { failedRow, finalizeRows, rowFromResult, type CompareRow, type ComparisonConditions } from "@/lib/studio/compare";
import type { Problem } from "@/lib/studio/model";
import type { StudioSettings } from "@/lib/studio/session";
import type { SolverId } from "@/lib/studio/catalog";

export interface Comparison {
  problem: Problem | null;
  conditions: ComparisonConditions | null;
  queue: SolverId[];
  current: SolverId | null;
  currentStart: number;
  rows: CompareRow[];
  inconsistencies: string[];
  running: boolean;
}

export function useComparison() {
  const [c, setC] = useState<Comparison>({ problem: null, conditions: null, queue: [], current: null, currentStart: 0, rows: [], inconsistencies: [], running: false });
  const job = useRef<{ cancel: () => void } | null>(null);
  const cancelled = useRef(false);
  useEffect(() => () => job.current?.cancel(), []);

  const start = useCallback((p: Problem, fingerprint: string, solvers: SolverId[], timeLimitS: number, seed: number, atlas: StudioSettings["atlas"]) => {
    job.current?.cancel();
    cancelled.current = false;
    const conditions: ComparisonConditions = {
      fingerprint, n: p.n, timeLimitMs: timeLimitS * 1000, seed,
      atlasSettings: `cycle packing ${atlas.bound}, strict ${atlas.strict ? "on" : "off"}, decomposition ${atlas.decompose ? "on" : "off"}, ${atlas.maxStates.toLocaleString("en-US")} states per component`,
      sequential: true, startedAt: new Date().toISOString(), userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };
    const rows: CompareRow[] = [];
    const finish = () => { const f = finalizeRows(p, rows); setC((s) => ({ ...s, rows: f.rows, inconsistencies: f.inconsistencies, running: false, current: null, queue: [] })); };
    const runNext = (i: number) => {
      if (i >= solvers.length || cancelled.current) {
        for (let k = i; k < solvers.length; k++) rows.push(failedRow(solvers[k], "cancelled", "comparison cancelled before this solver ran"));
        finish();
        return;
      }
      const s = solvers[i];
      setC((x) => ({ ...x, current: s, currentStart: performance.now(), queue: solvers.slice(i + 1) }));
      job.current = startSolve(p, s, { timeLimitMs: timeLimitS * 1000, seed, bruteForceCheck: false, atlas: s === "atlas" ? atlas : undefined }, {
        onDone: (r, wall) => { rows.push(rowFromResult(r, wall)); setC((x) => ({ ...x, rows: [...rows] })); runNext(i + 1); },
        onError: (m, wall) => { rows.push(failedRow(s, "failed", m, wall)); setC((x) => ({ ...x, rows: [...rows] })); runNext(i + 1); },
      });
    };
    setC({ problem: p, conditions, queue: solvers, current: null, currentStart: 0, rows: [], inconsistencies: [], running: true });
    runNext(0);
  }, []);
  const cancel = useCallback(() => {
    cancelled.current = true;
    const cur = job.current;
    job.current = null;
    cur?.cancel();
    setC((s) => {
      if (!s.running || !s.problem) return s;
      const rows = [...s.rows, ...(s.current ? [failedRow(s.current, "cancelled", "cancelled while running; no partial result is reported")] : []), ...s.queue.map((q) => failedRow(q, "cancelled", "comparison cancelled before this solver ran"))];
      const f = finalizeRows(s.problem, rows);
      return { ...s, rows: f.rows, inconsistencies: f.inconsistencies, running: false, current: null, queue: [] };
    });
  }, []);
  return { c, start, cancel };
}

