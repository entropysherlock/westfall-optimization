/**
 * Mission 039 — Solver Comparison Lab.
 *
 * A comparison runs several solvers, one after another in fresh Web Workers, on the SAME problem snapshot
 * (identified by its fingerprint) with the same time limit and seed. This module decides which solvers apply,
 * turns results into comparable rows, and states plainly how comparable the runs are. It never calls a
 * comparison a fair benchmark: single browser runs on one machine are indicative, not a study.
 */
import type { Problem } from "./model";
import { maximises } from "./model";
import { parseQ } from "./rational";
import { STATUS_LABEL, type SolveResult } from "./report";
import { SOLVERS, type SolverId } from "./solvers";

export interface PlanEntry { solver: SolverId; label: string; exact: boolean; applicable: boolean; reason: string }

/** Which solvers can run on this instance, with the reason for every exclusion. */
export function comparisonPlan(p: Problem): PlanEntry[] {
  return SOLVERS.map((s) => {
    if (p.n > s.maxN) return { solver: s.id, label: s.label, exact: s.exact, applicable: false, reason: `supports n ≤ ${s.maxN}; this instance has ${p.n} items` };
    if (s.exact && !p.exact) return { solver: s.id, label: s.label, exact: s.exact, applicable: true, reason: "runs, but cannot certify optimality: the model is not in exact integer arithmetic" };
    if (s.id === "autocut" && p.n > 9) return { solver: s.id, label: s.label, exact: s.exact, applicable: false, reason: "the browser AutoCut port is limited to n ≤ 9" };
    return { solver: s.id, label: s.label, exact: s.exact, applicable: true, reason: s.exact ? "exact within its state/time budget" : "heuristic: never proves optimality" };
  });
}

export interface CompareRow {
  solver: SolverId;
  label: string;
  exact: boolean;
  outcome: "completed" | "failed" | "cancelled" | "skipped";
  status: string | null; // OPTIMAL / FEASIBLE / INTERRUPTED
  statusLabel: string;
  objective: string | null; // exact rational string, user units
  objectiveDecimal: string | null;
  bound: string | null; // rigorous bound in user units (ATLAS only)
  gap: string | null; // |bound − objective|, "0" when proved
  ms: number | null; // solver runtime measured inside the worker
  wallMs: number | null; // job wall-clock time on the page (includes worker start-up)
  states: number | null;
  pruned: number | null;
  certificate: boolean;
  bestKnown: boolean; // attains the best objective among completed rows
  note: string;
}

const num = (x: unknown) => (typeof x === "number" ? x : typeof x === "string" && /^\d+$/.test(x) ? Number(x) : null);

export function rowFromResult(r: SolveResult, wallMs: number): CompareRow {
  const states = num(r.details["exact states (all components)"] ?? r.details["prefix states"] ?? r.details["prefix states generated"] ?? r.details["reachable cuts"]);
  const pruned = num(r.details["states pruned"] ?? r.details["excluded"]);
  const proved = r.status === "OPTIMAL";
  return {
    solver: r.solver, label: r.solverLabel, exact: SOLVERS.find((s) => s.id === r.solver)!.exact, outcome: "completed",
    status: r.status, statusLabel: STATUS_LABEL[r.status] ?? r.status,
    objective: r.objective.toString(), objectiveDecimal: r.objective.toDecimal(4),
    bound: r.atlas?.objectiveBound ?? (proved ? r.objective.toString() : null),
    gap: r.atlas?.gap ?? (proved ? "0" : null),
    ms: r.runtimeMs, wallMs, states, pruned, certificate: !!r.atlas?.certificate, bestKnown: false,
    note: r.statusNote,
  };
}

export function failedRow(solver: SolverId, outcome: "failed" | "cancelled" | "skipped", note: string, wallMs: number | null = null): CompareRow {
  const s = SOLVERS.find((x) => x.id === solver)!;
  return { solver, label: s.label, exact: s.exact, outcome, status: null, statusLabel: outcome === "skipped" ? "Skipped" : outcome === "cancelled" ? "Cancelled" : "Invalid or failed",
    objective: null, objectiveDecimal: null, bound: null, gap: null, ms: null, wallMs, states: null, pruned: null, certificate: false, bestKnown: false, note };
}

/** Mark the rows that attain the best objective, and check that no proved optimum is beaten (a consistency check). */
export function finalizeRows(p: Problem, rows: CompareRow[]): { rows: CompareRow[]; inconsistencies: string[] } {
  const maxi = maximises(p);
  const vals = rows.filter((r) => r.objective !== null).map((r) => parseQ(r.objective!)!);
  if (!vals.length) return { rows, inconsistencies: [] };
  const best = vals.reduce((a, b) => (maxi ? (b.cmp(a) > 0 ? b : a) : (b.cmp(a) < 0 ? b : a)));
  const out = rows.map((r) => ({ ...r, bestKnown: r.objective !== null && parseQ(r.objective)!.eq(best) }));
  const inconsistencies: string[] = [];
  for (const r of out) {
    if (r.status === "OPTIMAL" && r.objective !== null && !parseQ(r.objective)!.eq(best))
      inconsistencies.push(`${r.label} reported a proven optimum ${r.objectiveDecimal}, but another solver found a better objective. This indicates a bug; please report the instance.`);
    if (r.bound !== null && r.objective !== null) {
      const b = parseQ(r.bound)!;
      if (maxi ? best.cmp(b) > 0 : best.cmp(b) < 0) inconsistencies.push(`${r.label}'s rigorous bound ${b.toDecimal(4)} is violated by another solver's ordering. This indicates a bug; please report the instance.`);
    }
  }
  return { rows: out, inconsistencies };
}

export interface ComparisonConditions {
  fingerprint: string;
  n: number;
  timeLimitMs: number;
  seed: number;
  atlasSettings: string;
  sequential: true;
  startedAt: string;
  userAgent: string;
}

/** What can and cannot be concluded from this comparison. */
export function comparabilityStatement(c: ComparisonConditions, rows: CompareRow[]): { level: "same-conditions" | "limited"; points: string[] } {
  const done = rows.filter((r) => r.outcome === "completed");
  const points = [
    `Every run used the same instance (fingerprint ${c.fingerprint}), the same time limit (${c.timeLimitMs / 1000} s) and seed (${c.seed}), one after another in a fresh worker on this device.`,
    "Exact and heuristic solvers answer different questions: a heuristic objective is not comparable to a proved optimum, only to other feasible objectives.",
    "Each solver ran once. Browser timings vary with device load, power state and JIT warm-up; they are indicative, not a benchmark study.",
  ];
  if (done.some((r) => r.solver === "exclusion")) points.push("The exclusion DP starts from its own short local search, so its runtime includes incumbent search.");
  if (done.some((r) => r.solver === "atlas")) points.push(`ATLAS used: ${c.atlasSettings}.`);
  const level = done.length >= 2 ? "same-conditions" : "limited";
  return { level, points };
}

export function comparisonMarkdown(p: Problem, c: ComparisonConditions, rows: CompareRow[], inconsistencies: string[]): string {
  const st = comparabilityStatement(c, rows);
  const dir = maximises(p) ? "maximise" : "minimise";
  const fmt = (ms: number | null) => (ms === null ? "—" : ms < 1000 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`);
  return [
    "# Westfall Optimization Studio — solver comparison",
    "",
    `- Instance: ${p.title ?? "untitled"} · ${p.n} items · ${p.interpretation} (${dir}) · fingerprint \`${c.fingerprint}\``,
    `- Conditions: time limit ${c.timeLimitMs / 1000} s · seed ${c.seed} · sequential runs in fresh Web Workers · started ${c.startedAt}`,
    `- Browser: ${c.userAgent}`,
    "",
    "| Solver | Kind | Outcome | Objective | Rigorous bound | Gap | Solver time | States | Pruned | Certificate |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map((r) => `| ${r.label}${r.bestKnown ? " ★" : ""} | ${r.exact ? "exact" : "heuristic"} | ${r.statusLabel} | ${r.objective ?? "—"} | ${r.bound ?? "—"} | ${r.gap ?? "—"} | ${fmt(r.ms)} | ${r.states ?? "—"} | ${r.pruned ?? "—"} | ${r.certificate ? "yes" : "—"} |`),
    "",
    "★ attains the best objective among these runs.",
    "",
    "## What this comparison shows",
    "",
    ...st.points.map((x) => `- ${x}`),
    ...(inconsistencies.length ? ["", "## Inconsistencies", "", ...inconsistencies.map((x) => `- ${x}`)] : []),
    "",
    "## Notes per run",
    "",
    ...rows.map((r) => `- **${r.label}**: ${r.note}`),
    "",
  ].join("\n");
}

export function comparisonCsv(rows: CompareRow[]): string {
  const head = ["solver", "kind", "outcome", "status", "objective", "bound", "gap", "solver_ms", "wall_ms", "states", "pruned", "certificate", "best_known"];
  const cell = (x: unknown) => { const s = x === null || x === undefined ? "" : String(x); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [head.join(","), ...rows.map((r) => [r.solver, r.exact ? "exact" : "heuristic", r.outcome, r.status, r.objective, r.bound, r.gap, r.ms?.toFixed(3), r.wallMs?.toFixed(1), r.states, r.pruned, r.certificate, r.bestKnown].map(cell).join(","))].join("\n") + "\n";
}
