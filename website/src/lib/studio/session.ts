/**
 * Mission 039 — local sessions and reproducibility bundles.
 *
 * Privacy: sessions are stored ONLY in this browser's localStorage (key prefix "westfall.studio.session.").
 * Nothing is sent to any server. The user can list, restore, download and delete every stored session.
 */
import type { Problem } from "./model";
import { instanceJson, resultJson, STUDIO_VERSION, type SolveResult } from "./report";
import type { AtlasSettings } from "./config";
import type { SolverId } from "./catalog";

export type InputFormat = "auto" | "matrix" | "edges" | "json";
export type InterpChoice = "auto" | "skew" | "benefit" | "cost";

export interface StudioInput {
  text: string;
  format: InputFormat;
  interp: InterpChoice;
  nameEdits: Record<number, string>;
  initialOverride: number[] | null;
  title: string;
}

export interface StudioSettings {
  solver: SolverId;
  followRecommendation: boolean;
  timeLimitS: number;
  seed: number;
  bruteForceCheck: boolean;
  atlas: Required<Omit<AtlasSettings, "incumbentMs">> & { incumbentMs: number | null };
  mode: "beginner" | "advanced";
}

export interface StudioSession {
  format: "westfall-studio-session";
  version: 1;
  studioVersion: string;
  name: string;
  savedAt: string;
  input: StudioInput;
  /** the input as first loaded (for "Reset to original input") */
  original: Pick<StudioInput, "text" | "format" | "interp" | "title">;
  settings: StudioSettings;
}

export const SESSION_PREFIX = "westfall.studio.session.";
export const MAX_SESSION_BYTES = 2_500_000;
const SOLVER_IDS: SolverId[] = ["subset-dp", "exclusion", "autocut", "atlas", "heuristic"];

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Validate an untrusted session object (from storage or a file). Returns null and a reason if invalid. */
export function parseSession(raw: unknown): { ok: true; session: StudioSession } | { ok: false; error: string } {
  if (!isObj(raw) || raw.format !== "westfall-studio-session") return { ok: false, error: "not a Westfall Studio session file" };
  if (raw.version !== 1) return { ok: false, error: `unsupported session version ${String(raw.version)}` };
  const i = raw.input, o = raw.original, st = raw.settings;
  if (!isObj(i) || typeof i.text !== "string") return { ok: false, error: "session input is missing" };
  if (i.text.length > MAX_SESSION_BYTES) return { ok: false, error: "session input is too large" };
  const formats: InputFormat[] = ["auto", "matrix", "edges", "json"], interps: InterpChoice[] = ["auto", "skew", "benefit", "cost"];
  if (!formats.includes(i.format as InputFormat) || !interps.includes(i.interp as InterpChoice)) return { ok: false, error: "session input has an invalid format or interpretation" };
  const nameEdits: Record<number, string> = {};
  if (isObj(i.nameEdits)) for (const [k, v] of Object.entries(i.nameEdits)) if (/^\d+$/.test(k) && typeof v === "string") nameEdits[Number(k)] = v.slice(0, 80);
  const init = Array.isArray(i.initialOverride) && i.initialOverride.every((x) => Number.isInteger(x) && x >= 0) ? (i.initialOverride as number[]) : null;
  if (!isObj(st)) return { ok: false, error: "session settings are missing" };
  const num = (x: unknown, lo: number, hi: number, d: number) => (typeof x === "number" && Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d);
  const a = isObj(st.atlas) ? st.atlas : {};
  const bounds = ["none", "greedy", "fractional", "cycles"] as const;
  const session: StudioSession = {
    format: "westfall-studio-session", version: 1, studioVersion: String(raw.studioVersion ?? ""),
    name: typeof raw.name === "string" ? raw.name.slice(0, 120) : "Untitled session",
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date(0).toISOString(),
    input: { text: i.text, format: i.format as InputFormat, interp: i.interp as InterpChoice, nameEdits, initialOverride: init, title: typeof i.title === "string" ? i.title.slice(0, 120) : "" },
    original: isObj(o) && typeof o.text === "string" && formats.includes(o.format as InputFormat) && interps.includes(o.interp as InterpChoice)
      ? { text: o.text, format: o.format as InputFormat, interp: o.interp as InterpChoice, title: typeof o.title === "string" ? o.title : "" }
      : { text: i.text, format: i.format as InputFormat, interp: i.interp as InterpChoice, title: "" },
    settings: {
      solver: SOLVER_IDS.includes(st.solver as SolverId) ? (st.solver as SolverId) : "atlas",
      followRecommendation: st.followRecommendation !== false,
      timeLimitS: num(st.timeLimitS, 0.1, 600, 30), seed: Math.round(num(st.seed, 1, 1_000_000, 1)),
      bruteForceCheck: st.bruteForceCheck !== false,
      mode: st.mode === "advanced" ? "advanced" : "beginner",
      atlas: {
        bound: bounds.includes(a.bound as (typeof bounds)[number]) ? (a.bound as (typeof bounds)[number]) : "cycles",
        strict: a.strict !== false, decompose: a.decompose !== false, certificate: a.certificate !== false,
        maxStates: Math.round(num(a.maxStates, 1000, 4_000_000, 1_500_000)),
        incumbentMs: a.incumbentMs === null || a.incumbentMs === undefined ? null : Math.round(num(a.incumbentMs, 0, 10_000, 0)),
      },
    },
  };
  return { ok: true, session };
}

export function makeSession(name: string, input: StudioInput, original: StudioSession["original"], settings: StudioSettings): StudioSession {
  return { format: "westfall-studio-session", version: 1, studioVersion: STUDIO_VERSION, name: name.slice(0, 120) || "Untitled session", savedAt: new Date().toISOString(), input, original, settings };
}

/** Minimal Storage interface (window.localStorage, or a stub in tests). */
export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; readonly length: number; key(i: number): string | null }

export interface SessionEntry { id: string; name: string; savedAt: string; bytes: number }

export function listSessions(kv: KV): SessionEntry[] {
  const out: SessionEntry[] = [];
  for (let i = 0; i < kv.length; i++) {
    const k = kv.key(i);
    if (!k || !k.startsWith(SESSION_PREFIX)) continue;
    const v = kv.getItem(k);
    if (!v) continue;
    try {
      const r = parseSession(JSON.parse(v));
      if (r.ok) out.push({ id: k.slice(SESSION_PREFIX.length), name: r.session.name, savedAt: r.session.savedAt, bytes: v.length });
    } catch { /* ignore corrupt entries */ }
  }
  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveSession(kv: KV, s: StudioSession, id?: string): { ok: true; id: string } | { ok: false; error: string } {
  const text = JSON.stringify(s);
  if (text.length > MAX_SESSION_BYTES) return { ok: false, error: `the session is ${(text.length / 1e6).toFixed(1)} MB; the local limit is ${MAX_SESSION_BYTES / 1e6} MB` };
  const key = id ?? `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  try {
    kv.setItem(SESSION_PREFIX + key, text);
    return { ok: true, id: key };
  } catch (e) {
    return { ok: false, error: `the browser refused to store the session (${(e as Error).name || "storage error"}; storage may be full or disabled)` };
  }
}

export function loadSession(kv: KV, id: string): { ok: true; session: StudioSession } | { ok: false; error: string } {
  const v = kv.getItem(SESSION_PREFIX + id);
  if (!v) return { ok: false, error: "session not found" };
  try { return parseSession(JSON.parse(v)); } catch { return { ok: false, error: "the stored session is corrupt" }; }
}

export function deleteSession(kv: KV, id: string) { kv.removeItem(SESSION_PREFIX + id); }

/**
 * Full reproducibility bundle: the instance, every setting that affects the run, the result with its
 * verification, the certificate if any, and how to reproduce it. Plain JSON, exact values as strings.
 */
export function reproBundle(p: Problem, r: SolveResult, settings: StudioSettings, instanceFingerprint: string) {
  return {
    format: "westfall-studio-reproducibility",
    version: 1,
    studioVersion: STUDIO_VERSION,
    createdAt: new Date().toISOString(),
    instanceFingerprint,
    instance: instanceJson(p),
    settings: {
      solver: r.solver, timeLimitMs: r.config.timeLimitMs, seed: r.config.seed, bruteForceCheck: settings.bruteForceCheck,
      atlas: r.solver === "atlas" ? settings.atlas : undefined,
    },
    result: resultJson(p, r),
    certificate: r.atlas?.certificate ?? null,
    reproduce: [
      "1. Open the Westfall Optimization Studio and import this file's \"instance\" (or the whole result via result.input).",
      "2. Select the same solver and settings (above). Exact solvers return the same optimum VALUE; with ties the optimal ORDER may differ.",
      "3. Heuristic and interrupted runs depend on wall-clock time: the same seed does not guarantee the same ordering on another machine.",
      "4. Certificates (if present) can be checked without the solver: python3 benchmarks/atlas-032/verify_certificate.py certificate.json, or the Verification workspace.",
    ],
  };
}
