/**
 * Solve orchestration shared by the Web Worker and the tests.
 */
import { autoCut, AUTOCUT_MAX_N } from "./autocut";
import type { Problem } from "./model";
import { buildProblem } from "./model";
import { parseJsonText, type Interpretation } from "./parse";
import { parseQ, Q } from "./rational";
import { instanceJson, makeResult, type SolveResult } from "./report";
import { bruteForce, exclusionExact, Interrupted, localSearch, SOLVERS, subsetDPExact, type Hooks, type SolverId } from "./solvers";

export interface SolveConfig {
  timeLimitMs: number;
  seed: number;
  /** Run exhaustive enumeration as an independent check when n ≤ 9 (default true). */
  bruteForceCheck?: boolean;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function solve(p: Problem, solver: SolverId, config: SolveConfig, hooks: Hooks = {}): SolveResult {
  const info = SOLVERS.find((s) => s.id === solver)!;
  if (p.n > info.maxN) throw new Error(`${info.label} supports at most ${info.maxN} items; this instance has ${p.n}. Use the local search heuristic.`);
  const t0 = now();
  const deadline = t0 + config.timeLimitMs;
  const base = { solver, solverLabel: info.label, config: { timeLimitMs: config.timeLimitMs, seed: config.seed }, structure: null };
  let res: SolveResult;
  const exactNote = p.exact
    ? "exact solver completed; optimality is established (exact integer arithmetic)"
    : "exact solver completed in floating-point arithmetic; optimality is not certified because of possible rounding";
  try {
    if (solver === "subset-dp") {
      const r = subsetDPExact(p.M, { ...hooks, deadline });
      res = makeResult(p, { ...base, status: p.exact ? "OPTIMAL" : "FEASIBLE", statusNote: exactNote, order: r.order, runtimeMs: now() - t0,
        details: { "prefix states": r.states } });
    } else if (solver === "exclusion") {
      const inc = localSearch(p.M, p.initialOrder, { timeMs: Math.min(300, config.timeLimitMs / 4), seed: config.seed });
      try {
        const r = exclusionExact(p.M, inc.order);
        res = makeResult(p, { ...base, status: p.exact ? "OPTIMAL" : "FEASIBLE", statusNote: exactNote, order: r.order, runtimeMs: now() - t0,
          details: { "prefix states generated": r.generated, "retained": r.retained, "excluded": r.excluded, "incumbent restarts": inc.starts } });
      } catch (e) {
        if (!(e instanceof Interrupted)) throw e;
        res = makeResult(p, { ...base, status: "FEASIBLE", statusNote: `exact search interrupted (${e.message}); the local-search incumbent is returned and optimality is NOT established`,
          order: inc.order, runtimeMs: now() - t0, details: { "incumbent restarts": inc.starts } });
      }
    } else if (solver === "autocut") {
      if (p.n > AUTOCUT_MAX_N) throw new Error(`AutoCut supports at most ${AUTOCUT_MAX_N} items`);
      const r = autoCut(p.A, { progress: hooks.progress, deadline });
      if (!r) throw new Error("AutoCut did not accept any round (impossible for a skew-symmetric matrix; please report this input)");
      res = makeResult(p, { ...base, status: "OPTIMAL",
        statusNote: "AutoCut completed in exact rational arithmetic; optimality is established by the algorithm (this browser port is tested against, but is not, the Lean-verified executable)",
        order: r.order, runtimeMs: now() - t0, details: { "accepted threshold k": r.k, "rounds": r.rounds, "reachable cuts": r.reachable, "DAG nodes": r.nodes },
        structure: { lambda: r.lambda, bmax: r.bmax, K0: r.K0, k: r.k, rounds: r.rounds, reachable: r.reachable, nodes: r.nodes, blocks: r.blocks,
          tau: r.candidate.tau === null ? null : r.candidate.tau.toString(), b: r.candidate.b } });
      // internal consistency: the DP value must equal the exact F_A of the returned order
      if (!res.FA.eq(r.value)) throw new Error("internal check failed: AutoCut value differs from the recomputed objective");
    } else {
      const r = localSearch(p.M, p.initialOrder, { timeMs: Math.min(config.timeLimitMs, 60_000), seed: config.seed, progress: hooks.progress });
      res = makeResult(p, { ...base, status: "FEASIBLE", statusNote: "heuristic result: a locally optimal ordering; global optimality is NOT established",
        order: r.order, runtimeMs: now() - t0, details: { "restarts": r.starts } });
    }
  } catch (e) {
    if (e instanceof Interrupted) throw new Error(`Stopped: ${e.message}. No result was produced; increase the time limit or use the heuristic.`);
    throw e;
  }
  // independent checks (exact arithmetic only)
  if (p.exact && config.bruteForceCheck !== false && p.n <= 9) {
    const bf = bruteForce(p.M);
    const val = Q.of(BigInt(bf.value), p.scale);
    res.verification.bruteForce = { optimum: val.toString(), agrees: val.eq(res.FA), orderings: bf.count, optimalOrderings: bf.optimaCount };
  }
  if (p.exact && res.status === "OPTIMAL" && p.n <= 16 && solver !== "subset-dp") {
    const r2 = subsetDPExact(p.M);
    res.verification.crossCheck = { method: "exact subset dynamic program", agrees: Q.of(BigInt(r2.value), p.scale).eq(res.FA) };
  } else if (p.exact && res.status === "OPTIMAL" && solver === "subset-dp" && p.n <= 18) {
    const inc = localSearch(p.M, p.initialOrder, { timeMs: 50, seed: config.seed, maxStarts: 4 });
    try {
      const r2 = exclusionExact(p.M, inc.order, 2_000_000);
      res.verification.crossCheck = { method: "exact exclusion DP", agrees: Q.of(BigInt(r2.value), p.scale).eq(res.FA) };
    } catch {
      /* cross-check skipped when its budget is exceeded */
    }
  }
  return res;
}

/* ---------- wire format (postMessage-safe: no class instances) ---------- */

export interface WireJob {
  id: number;
  instance: ReturnType<typeof instanceJson>;
  interpretation: Interpretation;
  solver: SolverId;
  config: SolveConfig;
}

type Wire<T> = { [K in keyof T]: T[K] extends Q ? string : T[K] };
export type WireResult = Wire<SolveResult>;

const Q_FIELDS = ["initialObjective", "objective", "initialFA", "FA", "backwardInitial", "backwardFinal"] as const;

export function toWire(r: SolveResult): WireResult {
  const w = { ...r } as unknown as Record<string, unknown>;
  for (const k of Q_FIELDS) w[k] = r[k].toString();
  return w as unknown as WireResult;
}

export function fromWire(w: WireResult): SolveResult {
  const r = { ...w } as unknown as Record<string, unknown>;
  for (const k of Q_FIELDS) r[k] = parseQ(w[k]);
  return r as unknown as SolveResult;
}

export function problemFromWire(job: Pick<WireJob, "instance" | "interpretation">): Problem {
  const parsed = parseJsonText(JSON.stringify(job.instance));
  if (!parsed.ok) throw new Error(parsed.errors.map((e) => e.message).join("; "));
  const b = buildProblem(parsed.value, job.interpretation);
  if (!b.ok) throw new Error(b.errors.map((e) => e.message).join("; "));
  return b.problem;
}
