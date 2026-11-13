/**
 * Solver catalogue (metadata only, no solver code). Kept separate from solvers.ts so the Studio page can show
 * solver choices and limits without bundling the engines into the main thread (Mission 039); the engines run
 * in the worker. solvers.ts re-exports these names.
 */
export type SolverId = "subset-dp" | "exclusion" | "autocut" | "atlas" | "heuristic";

export interface SolverInfo {
  id: SolverId;
  label: string;
  exact: boolean;
  maxN: number;
  summary: string;
}

export const SOLVERS: SolverInfo[] = [
  { id: "subset-dp", label: "Exact subset dynamic program", exact: true, maxN: 20,
    summary: "Exhaustive dynamic program over all 2ⁿ prefix sets. Optimality is established when it completes." },
  { id: "exclusion", label: "Exact exclusion DP (block bound)", exact: true, maxN: 26,
    summary: "Prefix-state DP that discards states provably unable to beat a local-search incumbent. Exact when it completes within its state budget." },
  { id: "autocut", label: "AutoCut structural solver", exact: true, maxN: 9,
    summary: "Browser port of the Lean-verified AutoCut algorithm: recovers a partition attaining λ(A) and an optimal ordering. The port is tested against the Lean executable, not itself formally verified." },
  { id: "atlas", label: "ATLAS adaptive exact (components + cut-bounded DP)", exact: true, maxN: 400,
    summary: "Splits the instance into strongly connected components (exact), solves each with the subset DP or a cut-bounded prefix DP, and concatenates. Optimal when every component completes; otherwise the result is reported as interrupted with the best ordering found." },
  { id: "heuristic", label: "Local search (heuristic)", exact: false, maxN: 400,
    summary: "Multi-start insertion local search. Returns a good feasible ordering; it does not establish optimality." },
];

