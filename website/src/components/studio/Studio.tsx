"use client";
/**
 * Westfall Optimization Studio — workstation shell (Mission 039).
 *
 * Six workspaces share one state held here, so switching views never loses data:
 *   Problem · Solver · Results · Analysis · Verification · Compare
 * The run bar (top) is always available; the inspector (right) shows the problem profile and live, measured
 * run telemetry. All computation happens in Web Workers; the page stays responsive and Cancel is immediate.
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseInput, LIMITS } from "@/lib/studio/parse";
import { buildProblem, type Problem } from "@/lib/studio/model";
import { instanceJson, type SolveResult } from "@/lib/studio/report";
import { ATLAS_DEFAULTS } from "@/lib/studio/config";
import { recommendSolver } from "@/lib/studio/select";
import { EXAMPLES, type Example } from "@/lib/studio/examples";
import { fingerprint, profileProblem } from "@/lib/studio/analysis";
import { startSolve, startVerify, download } from "@/lib/studio/client";
import type { CertificateLike } from "@/lib/studio/certverify";
import { deleteSession, listSessions, loadSession, makeSession, parseSession, reproBundle, saveSession, type InputFormat, type InterpChoice, type SessionEntry, type StudioSession, type StudioSettings } from "@/lib/studio/session";
import { SOLVERS, type SolverId } from "@/lib/studio/catalog";
import ProblemWorkspace, { type Built } from "./ProblemWorkspace";
import dynamic from "next/dynamic";
import type { AtlasCfg } from "./SolverWorkspace";
import { runRecord, type RunRecord } from "./runRecord";
import type { VerifyState } from "./VerificationWorkspace";
import { useComparison } from "./useComparison";
import RunMonitor, { emptyLive, reduceLive, type LiveState } from "./RunMonitor";
import { StatusGlyph, StatusPill, STATUS_UI, fmtInt, type StatusKind } from "./ui";

type View = "problem" | "solver" | "results" | "analysis" | "verification" | "compare";
type JobState = "idle" | "running" | "completed" | "failed" | "cancelled";
interface Job { state: JobState; solver: SolverId; startedAt: number; finishedAt?: number; progress: { fraction: number; note: string } | null; error?: string; problem: Problem; maxStates: number }

const VIEWS: { id: View; label: string; key: string; hint: string }[] = [
  { id: "problem", label: "Problem", key: "1", hint: "Upload or edit your problem" },
  { id: "solver", label: "Solver", key: "2", hint: "Optional solver settings" },
  { id: "results", label: "Results", key: "3", hint: "Your optimized ordering and proof status" },
  { id: "analysis", label: "Analysis", key: "4", hint: "Matrix explorer and ordering diagnostics" },
  { id: "verification", label: "Verification", key: "5", hint: "Evidence, certificates, independent checks" },
  { id: "compare", label: "Compare", key: "6", hint: "Run several solvers on the same instance" },
];
const THEME_KEY = "westfall.studio.theme";

// Workspaces other than Problem are code-split and loaded on first use (smaller initial bundle).
const loading = () => <div className="ws-panel min-h-[240px] p-5"><p className="ws-sub">Loading workspace…</p></div>;
const SolverWorkspace = dynamic(() => import("./SolverWorkspace"), { loading });
const ResultsWorkspace = dynamic(() => import("./ResultsWorkspace"), { loading });
const AnalysisWorkspace = dynamic(() => import("./AnalysisWorkspace"), { loading });
const VerificationWorkspace = dynamic(() => import("./VerificationWorkspace"), { loading });
const CompareWorkspace = dynamic(() => import("./CompareWorkspace"), { loading });
const kv = () => (typeof window !== "undefined" ? window.localStorage : null);

export default function Studio() {
  // ------------------------------------------------------------------ input
  const [text, setTextRaw] = useState(EXAMPLES[0].text);
  const [format, setFormat] = useState<InputFormat>(EXAMPLES[0].format);
  const [interp, setInterp] = useState<InterpChoice>(EXAMPLES[0].interpretation);
  const [exampleId, setExampleId] = useState<string>(EXAMPLES[0].id);
  const [original, setOriginal] = useState<StudioSession["original"]>({ text: EXAMPLES[0].text, format: EXAMPLES[0].format, interp: EXAMPLES[0].interpretation, title: EXAMPLES[0].title });
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [nameEdits, setNameEdits] = useState<Record<number, string>>({});
  const [initialOverride, setInitialOverride] = useState<number[] | null>(null);
  // ------------------------------------------------------------------ settings
  const [mode, setMode] = useState<"beginner" | "advanced">("beginner");
  const [manualSolver, setManualSolver] = useState<SolverId>("atlas");
  const [followRec, setFollowRec] = useState(true);
  const [atlasCfg, setAtlasCfg] = useState<AtlasCfg>({ ...ATLAS_DEFAULTS });
  const [timeLimit, setTimeLimit] = useState(30);
  const [seed, setSeed] = useState(1);
  const [bfCheck, setBfCheck] = useState(true);
  const [autoVerify, setAutoVerify] = useState(true);
  const [verifyBudget, setVerifyBudget] = useState(2_000_000);
  const [memoryNote, setMemoryNote] = useState<string | null>(null);
  // ------------------------------------------------------------------ runs
  const [job, setJob] = useState<Job | null>(null);
  const [live, setLive] = useState<LiveState>(emptyLive());
  const [result, setResult] = useState<{ problem: Problem; r: SolveResult; fp: string; settings: StudioSettings } | null>(null);
  const [history, setHistory] = useState<{ fp: string; runs: RunRecord[] }>({ fp: "", runs: [] });
  const [vs, setVs] = useState<VerifyState>({ running: false, verdict: null, error: null });
  const [now, setNow] = useState(0);
  const jobRef = useRef<{ cancel: () => void } | null>(null);
  const verifyRef = useRef<{ cancel: () => void } | null>(null);
  const cmp = useComparison();
  // ------------------------------------------------------------------ shell
  const [view, setView] = useState<View>("problem");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [inspector, setInspector] = useState(false);
  const [inspectorW, setInspectorW] = useState(340);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [sessionNote, setSessionNote] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const setText = (t: string) => { setTextRaw(t); setExampleId(""); setInitialOverride(null); };

  // ------------------------------------------------------------------ parse + build (pure, bounded by LIMITS)
  // Re-parsing a 400-item matrix costs ~0.1 s (bench/studio039main.bench.test.ts), so the model is rebuilt in a
  // deferred, low-priority render: the text area updates first while typing.
  const deferredText = useDeferredValue(text);
  const built = useMemo((): Built => {
    const parsed = parseInput(deferredText, format);
    if (!parsed.ok) return { problem: null, errors: parsed.errors, stage: "parse" };
    const raw = parsed.value;
    const names = raw.names.map((s, i) => (nameEdits[i] !== undefined ? nameEdits[i].trim() : s));
    if (names.some((s) => !s)) return { problem: null, errors: [{ message: "item names must be non-empty" }], stage: "model" };
    if (new Set(names).size !== names.length) return { problem: null, errors: [{ message: "item names must be unique" }], stage: "model" };
    const b = buildProblem({ ...raw, names, title: raw.title ?? (original.title || undefined) }, interp === "auto" ? undefined : interp);
    if (!b.ok) return { problem: null, errors: b.errors, stage: "model" };
    if (initialOverride && initialOverride.length === b.problem.n) b.problem.initialOrder = initialOverride.slice();
    return { problem: b.problem, errors: [], stage: null };
  }, [deferredText, format, interp, nameEdits, initialOverride, original.title]);
  const p = built.problem;
  const fp = useMemo(() => (p ? fingerprint(JSON.stringify(instanceJson(p))) : ""), [p]);
  const rec = useMemo(() => (p ? recommendSolver(p) : null), [p]);
  const profile = useMemo(() => (p ? profileProblem(p) : null), [p]);
  const solver: SolverId = followRec && rec ? rec.solver : manualSolver;
  const solverInfo = SOLVERS.find((s) => s.id === solver)!;
  const solverOk = p ? p.n <= solverInfo.maxN : false;
  const running = job?.state === "running";
  const stale = !!result && result.fp !== fp;

  // ------------------------------------------------------------------ persistence of preferences (local only)
  useEffect(() => {
    // read local preferences after mount (static export: storage does not exist during prerendering)
    const id = setTimeout(() => {
    const t = kv()?.getItem(THEME_KEY);
    if (t === "light" || t === "dark") setTheme(t);
    const s = kv(); if (s) setSessions(listSessions(s));
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (dm && dm <= 2) { setAtlasCfg((c) => ({ ...c, maxStates: Math.min(c.maxStates, 600_000) })); setMemoryNote(`This device reports ${dm} GB of memory, so the default budget was lowered to 600,000 states.`); }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // ------------------------------------------------------------------ loading
  const loadText = (t: string, f: InputFormat, i: InterpChoice, note: string, title = "") => {
    setTextRaw(t); setFormat(f); setInterp(i); setExampleId(""); setNameEdits({}); setInitialOverride(null); setFollowRec(true);
    if (note) { setFileNote(note); setOriginal({ text: t, format: f, interp: i, title }); }
  };
  const loadExample = (ex: Example) => {
    loadText(ex.text, ex.format, ex.interpretation, "", ex.title);
    setExampleId(ex.id); setFileNote(null); setOriginal({ text: ex.text, format: ex.format, interp: ex.interpretation, title: ex.title });
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > LIMITS.maxBytes) { setFileNote(`“${f.name}” is ${(f.size / 1e6).toFixed(1)} MB; the limit is ${LIMITS.maxBytes / 1e6} MB.`); return; }
    const t = await f.text();
    loadText(t, /\.json$/i.test(f.name) ? "json" : "auto", "auto", `Loaded “${f.name}” (${f.size.toLocaleString("en-US")} bytes).`, f.name.replace(/\.[a-z]+$/i, ""));
  };
  const resetOriginal = () => { setTextRaw(original.text); setFormat(original.format); setInterp(original.interp); setNameEdits({}); setInitialOverride(null); setFileNote("Restored the original input."); };
  const dirty = text !== original.text || format !== original.format || interp !== original.interp || Object.keys(nameEdits).length > 0;

  // ------------------------------------------------------------------ sessions (localStorage only)
  const currentSettings = (): StudioSettings => ({ solver, followRecommendation: followRec, timeLimitS: timeLimit, seed, bruteForceCheck: bfCheck, atlas: atlasCfg, mode });
  const currentSession = (name: string) => makeSession(name, { text, format, interp, nameEdits, initialOverride, title: original.title }, original, currentSettings());
  const refreshSessions = () => { const s = kv(); if (s) setSessions(listSessions(s)); };
  const saveCurrent = (name: string) => {
    const s = kv(); if (!s) return;
    const r = saveSession(s, currentSession(name || p?.title || original.title || `Session ${new Date().toLocaleString()}`));
    setSessionNote(r.ok ? "Saved in this browser." : r.error); refreshSessions();
  };
  const duplicate = () => {
    const s = kv(); if (!s) return;
    const r = saveSession(s, currentSession(`${p?.title || original.title || "Problem"} (copy)`));
    setSessionNote(r.ok ? "A copy of the current problem and settings was saved as a new session." : r.error); refreshSessions();
  };
  const applySession = (ss: StudioSession) => {
    setTextRaw(ss.input.text); setFormat(ss.input.format); setInterp(ss.input.interp); setNameEdits(ss.input.nameEdits); setInitialOverride(ss.input.initialOverride);
    setOriginal(ss.original); setExampleId("");
    setManualSolver(ss.settings.solver); setFollowRec(ss.settings.followRecommendation); setTimeLimit(ss.settings.timeLimitS); setSeed(ss.settings.seed);
    setBfCheck(ss.settings.bruteForceCheck); setAtlasCfg(ss.settings.atlas); setMode(ss.settings.mode);
    setSessionNote(`Restored “${ss.name}” (saved ${new Date(ss.savedAt).toLocaleString()}).`);
  };
  const restore = (id: string) => { const s = kv(); if (!s) return; const r = loadSession(s, id); if (r.ok) applySession(r.session); else setSessionNote(r.error); };
  const remove = (id: string) => { const s = kv(); if (!s) return; deleteSession(s, id); refreshSessions(); setSessionNote("Session deleted from this browser."); };
  const exportSession = () => download(`${(p?.title || "westfall-session").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.session.json`, JSON.stringify(currentSession(p?.title || original.title || "Session"), null, 1), "application/json");
  const importSession = async (f: File | undefined) => {
    if (!f) return;
    try { const r = parseSession(JSON.parse(await f.text())); if (r.ok) applySession(r.session); else setSessionNote(r.error); }
    catch (e) { setSessionNote(`Could not read the session file: ${(e as Error).message}`); }
  };

  // ------------------------------------------------------------------ verification
  const verifyCert = useCallback((r: SolveResult | null) => {
    const cert = r?.atlas?.certificate;
    if (!cert) return;
    verifyRef.current?.cancel();
    setVs({ running: true, verdict: null, error: null });
    verifyRef.current = startVerify(cert as unknown as CertificateLike, verifyBudget, {
      onDone: (v) => { setVs({ running: false, verdict: v, error: null }); setAnnounce(`Independent verifier: ${v.verdict}`); },
      onError: (m) => setVs({ running: false, verdict: null, error: m }),
    });
  }, [verifyBudget]);
  const cancelVerify = () => { verifyRef.current?.cancel(); setVs({ running: false, verdict: null, error: "verification cancelled; no verdict" }); };

  // ------------------------------------------------------------------ run
  useEffect(() => () => { jobRef.current?.cancel(); verifyRef.current?.cancel(); }, []);
  useEffect(() => { if (!running) return; const id = setInterval(() => setNow(performance.now()), 200); return () => clearInterval(id); }, [running]);
  const run = () => {
    if (!p || !solverOk || running) return;
    jobRef.current?.cancel();
    const snapshot = p, snapFp = fp, settingsSnap = currentSettings();
    const startedAt = performance.now();
    setNow(startedAt);
    setLive(emptyLive());
    setJob({ state: "running", solver, startedAt, progress: null, problem: snapshot, maxStates: atlasCfg.maxStates });
    setAnnounce(`Running ${solverInfo.label}`);
    const finish = (r: SolveResult) => {
      jobRef.current = null;
      setResult({ problem: snapshot, r, fp: snapFp, settings: settingsSnap });
      setHistory((h) => ({ fp: snapFp, runs: [...(h.fp === snapFp ? h.runs : []), runRecord(r)].slice(-12) }));
      setJob((j) => (j ? { ...j, state: "completed", finishedAt: performance.now() } : j));
      setVs({ running: false, verdict: null, error: null });
      setView("results");
      setAnnounce(`Finished: ${STATUS_UI[r.status as StatusKind]?.label ?? r.status}`);
      if (autoVerify && r.atlas?.certificate) verifyCert(r);
    };
    const fail = (message: string) => {
      jobRef.current = null;
      setJob((j) => (j ? { ...j, state: "failed", error: message, finishedAt: performance.now() } : j));
      setAnnounce(`Run failed: ${message}`);
    };
    jobRef.current = startSolve(snapshot, solver, { timeLimitMs: timeLimit * 1000, seed, bruteForceCheck: bfCheck, atlas: solver === "atlas" ? atlasCfg : undefined }, {
      onProgress: (fraction, note) => setJob((j) => (j && j.state === "running" ? { ...j, progress: { fraction, note } } : j)),
      onTelemetry: (events) => setLive((s) => reduceLive(s, events, performance.now() - startedAt)),
      onDone: finish,
      onError: (message) => {
        // A watchdog can terminate ATLAS before its interrupted result is posted.
        // Recover a fresh feasible solution instead of leaving the user with nothing.
        if (solver === "atlas" && /time limit|deadline exceeded/i.test(message)) {
          setJob((j) => j ? { ...j, solver: "heuristic", startedAt: performance.now(), progress: null, error: undefined } : j);
          setLive(emptyLive());
          setAnnounce("Exact search timed out. Finding a feasible ordering with local search.");
          jobRef.current = startSolve(snapshot, "heuristic", { timeLimitMs: 8000, seed, bruteForceCheck: false }, {
            onProgress: (fraction, note) => setJob((j) => (j && j.state === "running" ? { ...j, progress: { fraction, note } } : j)),
            onTelemetry: (events) => setLive((s) => reduceLive(s, events, performance.now())),
            onDone: finish,
            onError: (fallbackMessage) => fail(`Exact search timed out; fallback also failed: ${fallbackMessage}`),
          });
          return;
        }
        fail(message);
      },
    });
  };
  const cancel = () => {
    jobRef.current?.cancel(); jobRef.current = null;
    setJob((j) => (j && j.state === "running" ? { ...j, state: "cancelled", finishedAt: performance.now() } : j));
    setAnnounce("Run cancelled");
  };
  const elapsed = job ? ((job.finishedAt ?? now) - job.startedAt) / 1000 : 0;

  // ------------------------------------------------------------------ reset
  // "Clear results" keeps the problem and settings; "Start over" also restores the first example and default settings.
  // Saved local sessions are never touched.
  const [resetOpen, setResetOpen] = useState(false);
  const clearResults = () => {
    jobRef.current?.cancel(); jobRef.current = null;
    verifyRef.current?.cancel(); verifyRef.current = null;
    cmp.clear();
    setJob(null); setLive(emptyLive()); setResult(null); setHistory({ fp: "", runs: [] });
    setVs({ running: false, verdict: null, error: null });
    setResetOpen(false);
  };
  const startOver = () => {
    clearResults();
    loadExample(EXAMPLES[0]);
    setMode("beginner"); setManualSolver("atlas"); setFollowRec(true); setAtlasCfg({ ...ATLAS_DEFAULTS }); setTimeLimit(30); setSeed(1);
    setBfCheck(true); setAutoVerify(true); setVerifyBudget(2_000_000);
    setFileNote(null); setSessionNote(null);
    setView("problem");
    setAnnounce("Studio reset: results cleared and the first example loaded");
  };
  const canReset = !!(job || result || cmp.c.rows.length || cmp.c.running);

  // ------------------------------------------------------------------ keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.matches("input, textarea, select") || e.target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (running) return; document.querySelector<HTMLButtonElement>("[data-testid=run]")?.click(); }
      else if (e.altKey && /^[1-6]$/.test(e.key) && !typing) { e.preventDefault(); setView(VIEWS[Number(e.key) - 1].id); }
      else if (e.key === "Escape" && running && !typing) cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const base = (result?.problem.title ?? "westfall-result").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "westfall-result";
  const exportBundle = () => { if (result) download(`${base}-reproducibility.json`, JSON.stringify(reproBundle(result.problem, result.r, result.settings, result.fp), null, 1), "application/json"); };

  // rail state dots
  const dot = (v: View): string | null => {
    if (v === "problem") return p ? "var(--ws-green)" : "var(--ws-back)";
    if (v === "results" && result) return `var(--ws-${STATUS_UI[result.r.status as StatusKind]?.tone ?? "faint"})`;
    if (v === "verification" && result?.r.atlas?.certificate) return vs.verdict?.verdict === "ACCEPTED" ? "var(--ws-green)" : vs.verdict ? "var(--ws-back)" : "var(--ws-amber)";
    if (v === "compare" && cmp.c.rows.length) return "var(--ws-violet)";
    return null;
  };
  const disabledReason = !p ? "Fix the input in the Problem workspace first." : !solverOk ? `This solver supports n ≤ ${solverInfo.maxN} (instance has ${p.n}).` : null;
  const title = p?.title || original.title || (exampleId ? EXAMPLES.find((e) => e.id === exampleId)?.title : "") || "Untitled problem";

  const startResize = (e: React.PointerEvent) => {
    const x0 = e.clientX, w0 = inspectorW;
    const move = (ev: PointerEvent) => setInspectorW(Math.max(280, Math.min(560, w0 - (ev.clientX - x0))));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  return (
    <div className="ws min-h-[calc(100vh-64px)]" data-theme={theme} data-testid="studio">
      <p className="sr-only" aria-live="polite" role="status">{announce}</p>
      {/* ------------------------------------------------------------ run bar */}
      <header className="sticky top-0 z-30 border-b px-3 py-2.5 sm:px-5" style={{ borderColor: "var(--ws-line)", background: "color-mix(in srgb, var(--ws-bg) 92%, transparent)", backdropFilter: "blur(8px)" }}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-semibold tracking-[-.01em] ws-text">WESTFALL Studio</h1>
            <p className="truncate text-[12px] ws-muted">
              <span className="ws-text">{title}</span>
              {p && <> · <span className="num">{p.n}</span> items · {p.interpretation} · <span className="num" title="Instance fingerprint (FNV-1a of the exact instance)">{fp.slice(0, 8)}</span></>}
              {!p && <span className="ws-back"> · input invalid</span>}
            </p>
          </div>
          {result && !running && (
            <button type="button" className="hidden md:block" onClick={() => setView("results")} title="Open the last result">
              <StatusPill status={(result.r.status as StatusKind) in STATUS_UI ? (result.r.status as StatusKind) : "FAILED"} size="sm" />
            </button>
          )}
          <div className="relative flex items-center gap-2">
            {canReset && (
              <button type="button" className="ws-btn ws-btn-ghost" onClick={() => setResetOpen((v) => !v)} aria-expanded={resetOpen} aria-controls="reset-panel" data-testid="reset">
                Reset
              </button>
            )}
            {resetOpen && (
              <div id="reset-panel" role="dialog" aria-label="Reset the Studio" className="ws-panel absolute right-0 top-full z-40 mt-2 w-[min(320px,calc(100vw-24px))] p-3" data-testid="reset-panel"
                onKeyDown={(e) => { if (e.key === "Escape") setResetOpen(false); }}>
                <p className="text-[13px] font-semibold ws-text">Reset the Studio</p>
                <p className="ws-sub mt-1">Saved sessions are kept either way.</p>
                <div className="mt-3 grid gap-2">
                  <button type="button" className="ws-btn flex-col items-start gap-0.5 text-left" onClick={clearResults} data-testid="clear-results" autoFocus>
                    <span>Clear results</span><span className="ws-faint text-[12px] font-normal">Keep this problem and its settings</span>
                  </button>
                  <button type="button" className="ws-btn ws-btn-danger flex-col items-start gap-0.5 text-left" onClick={startOver} data-testid="start-over">
                    <span>Start over</span><span className="ws-faint text-[12px] font-normal">Load the first example with default settings</span>
                  </button>
                  <button type="button" className="ws-btn ws-btn-ghost" onClick={() => setResetOpen(false)}>Cancel</button>
                </div>
              </div>
            )}
            <span className="hidden max-w-[220px] truncate text-[12px] ws-muted lg:inline" title={solverInfo.label}>{solverInfo.label}</span>
            {running
              ? <button type="button" className="ws-btn" onClick={cancel} data-testid="cancel">Cancel</button>
              : null}
            <button type="button" className="ws-btn ws-btn-primary" onClick={run} disabled={!p || !solverOk || running} data-testid="run" title="Run (Ctrl/⌘ + Enter)">
              {running ? "Optimizing…" : "Optimize"}
            </button>
            <button type="button" className="ws-btn ws-btn-ghost px-2" onClick={() => { const t = theme === "dark" ? "light" : "dark"; setTheme(t); try { kv()?.setItem(THEME_KEY, t); } catch { /* storage disabled */ } }} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title="Theme">
              {theme === "dark" ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" strokeWidth="1.5" /></svg>
                : <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>}
            </button>
            <button type="button" className="ws-btn ws-btn-ghost px-2" onClick={() => setInspector((v) => !v)} aria-pressed={inspector} aria-label={inspector ? "Hide inspector" : "Show inspector"} title="Inspector">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M10 2.5v11" stroke="currentColor" strokeWidth="1.4" /></svg>
            </button>
          </div>
        </div>
        {disabledReason && p && <p className="mt-1 text-[12px] ws-back">{disabledReason}</p>}
        {job && <JobLine job={job} elapsed={elapsed} />}
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* ------------------------------------------------------------ rail */}
        <nav aria-label="Studio workspaces" className="ws-noprint shrink-0 border-b px-2 py-2 lg:sticky lg:top-[64px] lg:h-[calc(100vh-128px)] lg:w-[188px] lg:border-b-0 lg:border-r lg:px-2.5 lg:py-4" style={{ borderColor: "var(--ws-line)" }}>
          <ul className="ws-scroll flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {VIEWS.map((v) => {
              const d = dot(v.id);
              return (
                <li key={v.id} className="shrink-0">
                  <button type="button" className="ws-rail-item" aria-current={view === v.id ? "page" : undefined} onClick={() => setView(v.id)} title={`${v.hint} (Alt+${v.key})`} data-testid={`nav-${v.id}`}>
                    <span className="ws-dot" style={d ? { background: d } : undefined} aria-hidden />
                    <span>{v.label}</span>
                    {v.id === "results" && result && <span className="ml-auto hidden lg:inline" aria-hidden><StatusGlyph status={(result.r.status as StatusKind) in STATUS_UI ? (result.r.status as StatusKind) : "FAILED"} /></span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 hidden text-[12px] ws-faint lg:block"><Link className="hover:underline" href="/docs/">Help &amp; documentation</Link></div>
        </nav>

        {/* ------------------------------------------------------------ workspace */}
        <main className="min-w-0 flex-1 p-3 sm:p-5" id="workspace">
          <h2 className="sr-only">{VIEWS.find((v) => v.id === view)!.label} workspace</h2>
          {view === "problem" && (
            <ProblemWorkspace text={text} setText={setText} format={format} setFormat={setFormat} interp={interp} setInterp={setInterp} exampleId={exampleId}
              loadExample={loadExample} loadText={(t, f, i, note) => loadText(t, f, i, note, note ? note.replace(/^Generated /, "Synthetic ").replace(/\.$/, "") : original.title)} onFile={onFile} fileNote={fileNote} built={built}
              nameEdits={nameEdits} setNameEdits={setNameEdits} dirty={dirty} resetOriginal={resetOriginal}
              sessions={sessions} saveCurrent={saveCurrent} duplicate={duplicate} restore={restore} remove={remove} exportSession={exportSession} importSession={importSession} sessionNote={sessionNote}
              initialOverride={initialOverride} clearInitial={() => setInitialOverride(null)} />
          )}
          {view === "solver" && (
            <SolverWorkspace p={p} profile={profile} rec={rec} solver={solver} chooseSolver={(s) => { setManualSolver(s); setFollowRec(false); }} useRecommended={() => setFollowRec(true)}
              mode={mode} setMode={setMode} timeLimit={timeLimit} setTimeLimit={setTimeLimit} seed={seed} setSeed={setSeed} bfCheck={bfCheck} setBfCheck={setBfCheck}
              atlasCfg={atlasCfg} setAtlasCfg={setAtlasCfg} autoVerify={autoVerify} setAutoVerify={setAutoVerify} verifyBudget={verifyBudget} setVerifyBudget={setVerifyBudget}
              running={running} memoryNote={memoryNote} />
          )}
          {view === "results" && (result
            ? <ResultsWorkspace p={result.problem} r={result.r} stale={stale} base={base} runs={history.fp === result.fp ? history.runs : []}
                useAsInitial={() => { if (!stale) { setInitialOverride(result.r.order.slice()); setAnnounce("The result is now the starting order"); } }}
                exportBundle={exportBundle} openVerification={() => setView("verification")}
                verdictLabel={vs.verdict?.verdict === "ACCEPTED" ? "Certificate independently accepted" : null} />
            : <NoResult running={running} onSolver={() => setView("solver")} />)}
          {view === "analysis" && <AnalysisWorkspace p={result && !stale ? result.problem : p} r={result?.r ?? null} stale={stale} />}
          {view === "verification" && <VerificationWorkspace p={result?.problem ?? null} r={result?.r ?? null} stale={stale} vs={vs} verify={() => verifyCert(result?.r ?? null)} cancelVerify={cancelVerify} base={base} exportBundle={exportBundle} verifyBudget={verifyBudget} />}
          {view === "compare" && <CompareWorkspace p={p} fingerprint={fp} cmp={cmp} settings={{ timeLimit, seed, atlas: atlasCfg }} stale={!!cmp.c.conditions && cmp.c.conditions.fingerprint !== fp} />}
        </main>

        {/* ------------------------------------------------------------ inspector (right column on large screens, below on small) */}
        <aside aria-label="Inspector" className={`ws-noprint relative shrink-0 border-t lg:w-[280px] lg:border-l lg:border-t-0 xl:w-[var(--insp)] ${inspector ? "" : "hidden"}`}
          style={{ borderColor: "var(--ws-line)", ["--insp" as string]: `${inspectorW}px` } as React.CSSProperties}>
          <div role="separator" aria-orientation="vertical" aria-label="Resize inspector (arrow keys)" aria-valuenow={inspectorW} aria-valuemin={280} aria-valuemax={560} tabIndex={0}
            className="absolute left-0 top-0 z-10 hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-[var(--ws-line-strong)] focus:bg-[var(--ws-line-strong)] xl:block"
            onPointerDown={startResize}
            onKeyDown={(e) => { if (e.key === "ArrowLeft") setInspectorW((w) => Math.min(560, w + 20)); if (e.key === "ArrowRight") setInspectorW((w) => Math.max(280, w - 20)); }} />
          <div className="ws-scroll p-4 lg:sticky lg:top-[64px] lg:max-h-[calc(100vh-128px)] lg:overflow-y-auto">
            <InspectorBody p={p} profile={profile} job={job} live={live} elapsed={elapsed} result={result} stale={stale} setView={setView} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function InspectorBody({ p, profile, job, live, elapsed, result, stale, setView }: {
  p: Problem | null; profile: ReturnType<typeof profileProblem> | null; job: Job | null; live: LiveState; elapsed: number;
  result: { r: SolveResult } | null; stale: boolean; setView: (v: View) => void;
}) {
  return (
    <div className="space-y-5">
      <section aria-labelledby="insp-run">
        <h3 id="insp-run" className="text-[13px] font-semibold ws-text">Run</h3>
        {!job && <p className="ws-sub mt-1">Ready to optimize.</p>}
        {job && (
          <div className="mt-2 space-y-2" role="status" aria-live="polite" data-testid="job-status">
            <div className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className={`font-semibold ${job.state === "completed" ? "ws-green" : job.state === "failed" ? "ws-back" : job.state === "running" ? "ws-accent" : "ws-muted"}`} data-testid="job-state">{job.state.toUpperCase()}</span>
              <span className="num ws-faint">{SOLVERS.find((s) => s.id === job.solver)?.id} · {elapsed.toFixed(1)} s</span>
            </div>
            {job.state === "running" && <RunMonitor p={job.problem} live={live} solver={job.solver} maxStates={job.maxStates} elapsed={elapsed} progress={job.progress} />}
            {job.error && <p className="text-[12.5px] ws-back" data-testid="job-error">{job.error}</p>}
            {job.state === "failed" && <p className="ws-sub">Try a longer time limit or a different solver.</p>}
            {job.state === "cancelled" && <p className="ws-sub">Run cancelled. No partial result saved.</p>}
            {job.state === "completed" && result && !stale && <button type="button" className="ws-btn w-full" onClick={() => setView("results")}>Open results</button>}
          </div>
        )}
      </section>
      {profile && p && (
        <section aria-labelledby="insp-prof">
          <h3 id="insp-prof" className="text-[13px] font-semibold ws-text">Problem</h3>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12.5px]">
            <dt className="ws-muted">Items</dt><dd className="num">{fmtInt(profile.n)}</dd>
            <dt className="ws-muted">Density</dt><dd className="num">{(profile.density * 100).toFixed(0)}%</dd>
            <dt className="ws-muted">Strong components</dt><dd className="num">{fmtInt(profile.components)}</dd>
            <dt className="ws-muted">Largest component</dt><dd className="num">{fmtInt(profile.largest)}</dd>
            <dt className="ws-muted">Ties</dt><dd className="num">{fmtInt(profile.zeroPairs)}</dd>
            <dt className="ws-muted">Arithmetic</dt><dd className={profile.integral ? "" : "ws-amber"}>{profile.integral ? "exact" : "floating"}</dd>
            <dt className="ws-muted">Difficulty class</dt><dd>{profile.difficulty}</dd>
          </dl>
          <button type="button" className="mt-2 text-[12px] ws-accent hover:underline" onClick={() => setView("solver")}>Open profile and recommendation</button>
        </section>
      )}
    </div>
  );
}

function JobLine({ job, elapsed }: { job: Job; elapsed: number }) {
  if (job.state !== "running") return null;
  return (
    <div className="mt-2 h-0.5 overflow-hidden rounded-full" style={{ background: "var(--ws-line)" }} aria-hidden>
      {job.progress
        ? <div className="h-full" style={{ width: `${Math.round(job.progress.fraction * 100)}%`, background: "var(--ws-accent)" }} />
        : <div className="h-full w-1/4" style={{ background: "var(--ws-accent)", opacity: 0.6, transform: `translateX(${((elapsed * 60) % 400) - 100}%)` }} />}
    </div>
  );
}

function NoResult({ running, onSolver }: { running: boolean; onSolver: () => void }) {
  return (
    <div className="ws-panel flex min-h-[360px] flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="ws-h">{running ? "Solving…" : "No result yet"}</p>
      <p className="ws-sub max-w-md">{running ? "Optimization in progress. Open the inspector for details." : "Click Optimize to see your result."}</p>
      {!running && <button type="button" className="ws-btn mt-2" onClick={onSolver}>Solver settings</button>}
    </div>
  );
}
