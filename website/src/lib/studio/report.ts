/**
 * Results, verification and export for Westfall Optimization Studio.
 */
import type { Problem } from "./model";
import { backwardWeight, exactFA, exactUserObjective, isPermutation, maximises, userFromFA } from "./model";
import type { SolverId } from "./solvers";
import { Q } from "./rational";

export const STUDIO_VERSION = "1.0.0";

/** Honest status vocabulary (see the Documentation page). */
export type SolveStatus =
  | "OPTIMAL" // an exact solver completed under its stated assumptions
  | "FEASIBLE" // a heuristic, or an interrupted exact solver, returned an incumbent
  | "FAILED";

export interface Verification {
  /** The returned ordering is a permutation of all items. */
  permutation: boolean;
  /** Objective recomputed exactly (rational arithmetic) from the original data. */
  objectiveRecomputed: boolean;
  /** The affine identity between the user objective and F_A holds exactly for this ordering. */
  identityHolds: boolean;
  /** Exhaustive enumeration (n ≤ 9) confirmed the optimum value, if run. */
  bruteForce: null | { optimum: string; agrees: boolean; orderings: number; optimalOrderings: number };
  /** Cross-check of the exact solvers' optimum against a second exact method, if run. */
  crossCheck: null | { method: string; agrees: boolean };
}

export interface StructuralInfo {
  lambda: number;
  bmax: number;
  K0: number;
  k: number;
  rounds: number;
  reachable: number;
  nodes: number;
  blocks: number[][];
  tau: string | null;
  b: number;
}

export interface SolveResult {
  solver: SolverId;
  solverLabel: string;
  status: SolveStatus;
  statusNote: string;
  order: number[];
  /** Exact objectives in the user's terms. */
  initialObjective: Q;
  objective: Q;
  /** Exact F_A values. */
  initialFA: Q;
  FA: Q;
  backwardInitial: Q;
  backwardFinal: Q;
  runtimeMs: number;
  details: Record<string, string | number | null>;
  verification: Verification;
  structure: StructuralInfo | null;
  config: { timeLimitMs: number; seed: number };
  finishedAt: string;
}

export function verifyOrdering(p: Problem, order: number[]): { ok: boolean; FA: Q; user: Q; identity: boolean } {
  if (!isPermutation(order, p.n)) return { ok: false, FA: Q.ZERO, user: Q.ZERO, identity: false };
  const FA = exactFA(p, order);
  const user = exactUserObjective(p, order);
  return { ok: true, FA, user, identity: userFromFA(p, FA).eq(user) };
}

/**
 * Improvement of the objective, in the user's direction. A relative percentage is only reported
 * when the baseline is strictly positive (maximisation) or the baseline cost is strictly positive
 * (minimisation); otherwise only the absolute gain is meaningful.
 */
export function improvement(p: Problem, initial: Q, final: Q): { absolute: Q; percent: number | null; note: string } {
  const gain = maximises(p) ? final.sub(initial) : initial.sub(final);
  if (gain.isZero()) return { absolute: gain, percent: 0, note: "no change" };
  const base = initial;
  if (base.sign() > 0) return { absolute: gain, percent: (gain.toNumber() / base.toNumber()) * 100, note: maximises(p) ? "relative to the initial objective" : "relative to the initial cost" };
  return { absolute: gain, percent: null, note: "the initial objective is zero or negative, so a percentage would be meaningless; the absolute change is reported" };
}

/** Relative reduction of the backward (disagreement) weight β ≥ 0, which is always well defined when β₀ > 0. */
export function backwardReduction(b0: Q, b1: Q): number | null {
  if (b0.sign() <= 0) return null;
  return (b0.sub(b1).toNumber() / b0.toNumber()) * 100;
}

export function makeResult(
  p: Problem,
  args: Omit<SolveResult, "initialObjective" | "objective" | "initialFA" | "FA" | "backwardInitial" | "backwardFinal" | "verification" | "finishedAt"> & {
    verification?: Partial<Verification>;
  },
): SolveResult {
  const v = verifyOrdering(p, args.order);
  const v0 = verifyOrdering(p, p.initialOrder);
  return {
    ...args,
    initialObjective: v0.user,
    objective: v.user,
    initialFA: v0.FA,
    FA: v.FA,
    backwardInitial: backwardWeight(p, p.initialOrder),
    backwardFinal: v.ok ? backwardWeight(p, args.order) : Q.ZERO,
    verification: {
      permutation: v.ok,
      objectiveRecomputed: v.ok,
      identityHolds: v.identity,
      bruteForce: null,
      crossCheck: null,
      ...args.verification,
    },
    finishedAt: new Date().toISOString(),
  };
}

const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** The instance in the Studio JSON format (exact values as strings). */
export function instanceJson(p: Problem) {
  return {
    title: p.title ?? null,
    interpretation: p.interpretation,
    names: p.names,
    matrix: p.original.map((r, i) => r.map((x, j) => (i === j ? "0" : x.toString()))),
    initialOrder: p.initialOrder.map((v) => p.names[v]),
  };
}

export function resultJson(p: Problem, r: SolveResult) {
  return {
    format: "westfall-studio-result",
    version: 1,
    studioVersion: STUDIO_VERSION,
    input: instanceJson(p),
    model: {
      n: p.n,
      objective: p.interpretation === "cost" ? "minimise Σ_{i before j} d_ij" : p.interpretation === "benefit" ? "maximise Σ_{i before j} c_ij" : "maximise F_A(π) = Σ_{r<s} a_{π_r π_s}",
      transformedObjective: "F_A(π) = Σ_{r<s} a_{π_r π_s} with A skew-symmetric",
      identity: p.interpretation === "skew" ? "objective = F_A" : p.interpretation === "benefit" ? "objective = (F_A + S) / 2" : "objective = (S − F_A) / 2",
      S: p.offset.toString(),
      exactIntegerArithmetic: p.exact,
    },
    solver: { id: r.solver, label: r.solverLabel, config: r.config },
    result: {
      status: r.status,
      statusNote: r.statusNote,
      order: r.order.map((v) => p.names[v]),
      objective: r.objective.toString(),
      initialObjective: r.initialObjective.toString(),
      F_A: r.FA.toString(),
      backwardWeight: r.backwardFinal.toString(),
      runtimeMs: Math.round(r.runtimeMs * 1000) / 1000,
      details: r.details,
      structure: r.structure,
    },
    verification: r.verification,
    finishedAt: r.finishedAt,
    reproduce:
      "Load this file in Westfall Optimization Studio (it re-imports the instance and uses the returned order as the initial order), " +
      "select the same solver, and run. Exact solvers return the same optimum value; ties may yield a different optimal order.",
  };
}

export function resultCsv(p: Problem, r: SolveResult): string {
  const lines = ["position,item,index"];
  r.order.forEach((v, i) => lines.push(`${i + 1},${csvCell(p.names[v])},${v}`));
  return lines.join("\n") + "\n";
}

export function resultMarkdown(p: Problem, r: SolveResult): string {
  const dir = maximises(p) ? "maximise" : "minimise";
  const ver = r.verification;
  return [
    `# Westfall Optimization Studio — optimization summary`,
    ``,
    `- Instance: ${p.title ?? "untitled"} (${p.n} items, ${p.source === "edges" ? "edge list" : "matrix"} input, interpretation **${p.interpretation}**, ${dir})`,
    `- Solver: ${r.solverLabel} (Studio ${STUDIO_VERSION}); time limit ${r.config.timeLimitMs} ms; seed ${r.config.seed}`,
    `- Status: **${r.status}** — ${r.statusNote}`,
    `- Objective: ${r.objective.toString()} (initial order: ${r.initialObjective.toString()})`,
    `- Transformed objective F_A: ${r.FA.toString()}; backward weight ${r.backwardFinal.toString()}`,
    `- Runtime: ${r.runtimeMs.toFixed(1)} ms in the browser`,
    ``,
    `## Ordering`,
    ``,
    r.order.map((v, i) => `${i + 1}. ${p.names[v]}`).join("\n"),
    ``,
    `## Verification`,
    ``,
    `- Valid permutation: ${ver.permutation ? "yes" : "no"}`,
    `- Objective recomputed exactly from the input data: ${ver.objectiveRecomputed ? "yes" : "no"}`,
    `- Affine identity between the objective and F_A holds exactly: ${ver.identityHolds ? "yes" : "no"}`,
    ver.bruteForce ? `- Exhaustive enumeration of ${ver.bruteForce.orderings} orderings: optimum ${ver.bruteForce.optimum}; ${ver.bruteForce.agrees ? "agrees" : "DISAGREES"}` : `- Exhaustive enumeration: not run`,
    ver.crossCheck ? `- Cross-check with ${ver.crossCheck.method}: ${ver.crossCheck.agrees ? "agrees" : "DISAGREES"}` : `- Independent cross-check: not run`,
    ``,
    r.structure
      ? `## Structural decomposition (AutoCut)\n\nλ(A) = ${r.structure.lambda} (b = ${r.structure.bmax}, K₀ = ${r.structure.K0}); accepted at k = ${r.structure.k} after ${r.structure.rounds} rounds.\n\n${r.structure.blocks.map((B, i) => `- Block ${i + 1}: ${B.map((v) => p.names[v]).join(", ")}`).join("\n")}\n`
      : "",
    `_Generated ${r.finishedAt}. Browser solvers are not the formally verified Lean executable; see the Documentation page for what each status means._`,
    ``,
  ].join("\n");
}
