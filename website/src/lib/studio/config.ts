/**
 * Run configuration and the postMessage wire format (Mission 039). Dependency-light (no solver code), so the
 * page bundle can import it; runner.ts re-exports everything here.
 */
import type { AtlasEvent } from "./atlas";
import { parseQ, type Q } from "./rational";
import type { Interpretation } from "./parse";
import type { instanceJson, SolveResult } from "./report";
import type { SolverId } from "./catalog";

/**
 * Mission 039 telemetry: measured events streamed from the worker to the UI. ATLAS events carry β in units of
 * the scaled integer matrix M; "incumbent" carries F_M of the heuristic's current best ordering. Nothing here is
 * estimated or extrapolated.
 */
export type Telemetry = AtlasEvent | { kind: "incumbent"; value: number; starts: number; ms: number };

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

