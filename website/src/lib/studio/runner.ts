/**
 * Solve orchestration shared by the Web Worker and the tests.
 */
import { solveAtlas } from "./atlas";
import { autoCut, AUTOCUT_MAX_N } from "./autocut";
import type { Problem } from "./model";
import { buildProblem } from "./model";
import { parseJsonText, type Interpretation } from "./parse";
import { parseQ, Q } from "./rational";
import { totalWeight, userFromFA, maximises } from "./model";
import type { AtlasCertificate, AtlasInfo } from "./report";
import { instanceJson, makeResult, type SolveResult } from "./report";
import { bruteForce, exclusionExact, Interrupted, localSearch, SOLVERS, subsetDPExact, type Hooks, type SolverId } from "./solvers";

export interface SolveConfig {
  timeLimitMs: number;
  seed: number;
  /** Run exhaustive enumeration as an independent check when n ≤ 9 (default true). */
  bruteForceCheck?: boolean;
  /** ATLAS-032 settings (only used by the "atlas" solver). Every option is honoured by solveAtlas. */
  atlas?: AtlasSettings;
}

export interface AtlasSettings {
  bound?: "none" | "greedy" | "fractional" | "cycles";
  strict?: boolean;
  maxStates?: number;
  /** Local-search time per component in ms (null/undefined = size-dependent default). */
  incumbentMs?: number | null;
  decompose?: boolean;
  certificate?: boolean;
}

export const ATLAS_DEFAULTS: Required<Omit<AtlasSettings, "incumbentMs">> & { incumbentMs: number | null } = {
  bound: "cycles", strict: true, maxStates: 1_500_000, incumbentMs: null, decompose: true, certificate: true,
};

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
        res = makeResult(p, { ...base, status: "INTERRUPTED", statusNote: `exact search interrupted (${e.message}); the local-search incumbent is returned and optimality is NOT established`,
          order: inc.order, runtimeMs: now() - t0, details: { "incumbent restarts": inc.starts } });
      }
    } else if (solver === "atlas") {
      const st = { ...ATLAS_DEFAULTS, ...(config.atlas ?? {}) };
      const r = solveAtlas(p.M, {
        deadline, seed: config.seed, bound: st.bound, strict: st.strict, maxStates: st.maxStates,
        incumbentMs: st.incumbentMs ?? undefined, noDecompose: !st.decompose,
      });
      const sizes = r.components.map((c) => c.size);
      const details: Record<string, string | number> = {
        "strong components": r.components.length,
        "largest component": Math.max(...sizes, 0),
        "exact states (all components)": r.totalStates,
        "states pruned": r.components.reduce((a, c) => a + (c.pruned ?? 0), 0),
        "methods": [...new Set(r.components.map((c) => c.method))].join(", "),
        "residual bound": st.bound + (st.strict ? ", strict" : ""),
      };
      if (r.optimal) {
        res = makeResult(p, { ...base, status: p.exact ? "OPTIMAL" : "FEASIBLE", statusNote: p.exact
          ? "every strongly connected component was solved by a completed exact method and the decomposition is exact; optimality is established (exact integer arithmetic)"
          : exactNote, order: r.order, runtimeMs: now() - t0, details });
      } else {
        res = makeResult(p, { ...base, status: "INTERRUPTED", statusNote: `exact search stopped without proof (${r.interruptedReason}); the best ordering found is returned and global optimality is NOT established`,
          order: r.order, runtimeMs: now() - t0, details });
      }
      res.atlas = atlasInfo(p, r, st, res.objective, res.status === "OPTIMAL");
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

/** Exact bound, gap and certificate for an ATLAS run. Bounds are reported only for exact integral models. */
function atlasInfo(p: Problem, r: ReturnType<typeof solveAtlas>, st: typeof ATLAS_DEFAULTS, objective: Q, proved: boolean): AtlasInfo {
  let lowerBoundBeta: string | null = null, objectiveBound: string | null = null, gap: string | null = null, gapPercent: number | null = null;
  if (p.exact && r.lowerBoundBeta !== null) {
    const lbA = Q.of(BigInt(r.lowerBoundBeta), p.scale);
    const faBound = totalWeight(p).sub(lbA.mul(Q.of(2n))); // F_A ≤ W − 2β*
    const ob = userFromFA(p, faBound);
    const g = maximises(p) ? ob.sub(objective) : objective.sub(ob);
    if (g.sign() < 0) throw new Error("internal check failed: the rigorous bound is violated by a feasible ordering");
    if (proved && !g.isZero()) throw new Error("internal check failed: proved optimum differs from the rigorous bound");
    lowerBoundBeta = lbA.toString(); objectiveBound = ob.toString(); gap = g.toString();
    gapPercent = objective.isZero() ? null : Number(g.toDecimal(12)) / Math.abs(Number(objective.toDecimal(12))) * 100;
  }
  let certificate: AtlasCertificate | null = null;
  let certificateNote: string;
  if (!st.certificate) certificateNote = "certificate generation was switched off for this run";
  else if (!p.exact) certificateNote = "no certificate: the model is not in exact integer arithmetic";
  else if (!proved) certificateNote = "no certificate: optimality was not proved (an interrupted search has nothing to certify)";
  else {
    certificate = { format: "westfall-atlas-032-certificate/1", A: p.M, scale: p.scale.toString(), order: r.order, components: r.certificates,
      claimedBeta: r.beta, claimedFA: r.value };
    certificateNote = "optimality certificate for the integer matrix M = scale · A; check it with the independent verifier (browser or Python)";
  }
  return {
    settings: { bound: st.bound, strict: st.strict, maxStates: st.maxStates, incumbentMs: st.incumbentMs, decompose: st.decompose },
    components: r.components.map((c) => ({ size: c.size, method: c.method, optimal: c.optimal, states: c.states, pruned: c.pruned ?? null, rootLB: c.rootLB ?? null, ms: Math.round(c.ms), note: c.note ?? null })),
    lowerBoundBeta, objectiveBound, gap, gapPercent, certificate, certificateNote,
  };
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
