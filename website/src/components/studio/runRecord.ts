import { parseQ } from "@/lib/studio/rational";
import type { SolveResult } from "@/lib/studio/report";

/** One row of the "Runs on this instance" table. */
export interface RunRecord { solver: string; status: string; objective: string; bound: string | null; gap: string | null; ms: number; states: string; certificate: boolean; settings: string }

export function runRecord(r: SolveResult): RunRecord {
  const states = r.details["exact states (all components)"] ?? r.details["prefix states"] ?? r.details["prefix states generated"] ?? r.details["reachable cuts"] ?? "—";
  return {
    solver: r.solverLabel, status: r.status, objective: r.objective.toDecimal(4),
    bound: r.atlas?.objectiveBound ? parseQ(r.atlas.objectiveBound)!.toDecimal(4) : null,
    gap: r.atlas?.gap ? parseQ(r.atlas.gap)!.toDecimal(4) : r.status === "OPTIMAL" ? "0" : null,
    ms: r.runtimeMs, states: String(states), certificate: !!r.atlas?.certificate,
    settings: `${r.config.timeLimitMs / 1000} s, seed ${r.config.seed}${r.atlas ? `, ${r.atlas.settings.bound}${r.atlas.settings.strict ? ", strict" : ""}${r.atlas.settings.decompose ? "" : ", no decomposition"}` : ""}`,
  };
}

