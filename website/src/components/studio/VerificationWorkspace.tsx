"use client";
/**
 * Certificate & Verification Lab. The verifier (certverify.ts, run in verify.worker.ts) imports no solver code;
 * it re-derives optimality from the certificate in BigInt arithmetic. This workspace separates six levels of
 * evidence and states what was and was not established.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CertificateLike, Verdict } from "@/lib/studio/certverify";
import { startVerify, download } from "@/lib/studio/client";
import { evidenceLadder, evidenceSummary, type EvidenceState } from "@/lib/studio/evidence";
import type { Problem } from "@/lib/studio/model";
import type { SolveResult } from "@/lib/studio/report";
import { LEVEL_LABEL, RESEARCH } from "@/lib/researchStatus";
import { Empty, Panel, fmtInt } from "./ui";

export interface VerifyState { running: boolean; verdict: Verdict | null; error: string | null }

const STATE_UI: Record<EvidenceState, { label: string; tone: string; glyph: string }> = {
  established: { label: "established", tone: "green", glyph: "✓" },
  failed: { label: "failed", tone: "back", glyph: "✗" },
  pending: { label: "not run yet", tone: "amber", glyph: "…" },
  "not-available": { label: "not available", tone: "faint", glyph: "–" },
};

export default function VerificationWorkspace({ p, r, stale, vs, verify, cancelVerify, base, exportBundle, verifyBudget }: {
  p: Problem | null; r: SolveResult | null; stale: boolean; vs: VerifyState; verify: () => void; cancelVerify: () => void; base: string; exportBundle: () => void; verifyBudget: number;
}) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <div className="space-y-4 min-w-0">
        {!r || !p ? <Empty title="No result to verify yet">Run a solver. ATLAS-032 produces a certificate for every proved result on an exact integer model; you can also check a certificate file below.</Empty>
          : <RunEvidence p={p} r={r} stale={stale} vs={vs} verify={verify} cancelVerify={cancelVerify} base={base} exportBundle={exportBundle} />}
        <FileCheck verifyBudget={verifyBudget} />
      </div>
      <div className="space-y-4 min-w-0">
        <Transparency />
      </div>
    </div>
  );
}

function RunEvidence({ p, r, stale, vs, verify, cancelVerify, base, exportBundle }: { p: Problem; r: SolveResult; stale: boolean; vs: VerifyState; verify: () => void; cancelVerify: () => void; base: string; exportBundle: () => void }) {
  const steps = evidenceLadder(r, vs.verdict);
  const sum = evidenceSummary(r, vs.verdict);
  const a = r.atlas;
  const cert = a?.certificate;
  const v = vs.verdict;
  return (
    <>
      {stale && <div className="ws-panel px-4 py-2.5 text-[13px] ws-amber" role="status">The problem changed after this run; the evidence below is about the earlier instance.</div>}
      <Panel id="ladder" title="Evidence for this result" sub={`${r.solverLabel} · ${p.n} items. Each level is a different kind of guarantee; a stronger level is never implied by a weaker one.`}>
        <ol className="relative space-y-0" data-testid="evidence-ladder">
          {steps.map((s, i) => {
            const ui = STATE_UI[s.state];
            return (
              <li key={s.id} className="grid grid-cols-[28px_1fr] gap-3 pb-3" data-state={s.state} data-testid={`evidence-${s.id}`}>
                <div className="flex flex-col items-center">
                  <span className={`num flex h-6 w-6 items-center justify-center rounded-full border text-[12px] ws-${ui.tone}`} style={{ borderColor: "currentColor" }} aria-hidden>{ui.glyph}</span>
                  {i < steps.length - 1 && <span className="mt-1 w-px flex-1" style={{ background: "var(--ws-line-strong)" }} />}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="text-[13.5px] font-semibold ws-text">{s.title} <span className={`ml-1 text-[12px] font-medium ws-${ui.tone}`}>{ui.label}</span></p>
                  <p className="ws-sub">{s.meaning}</p>
                  <p className="mt-0.5 text-[12px] ws-muted"><span className="ws-faint">Basis: </span>{s.basis}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <div className="ws-sunken p-3"><p className="ws-lbl">Established</p><p className="mt-1 text-[13px] ws-text">{sum.established}</p></div>
          <div className="ws-sunken p-3"><p className="ws-lbl">Still uncertain</p><p className="mt-1 text-[13px] ws-text">{sum.uncertain}</p></div>
        </div>
      </Panel>

      <Panel id="certificate" title="Optimality certificate" testId="certificate-view"
        sub={cert ? `Claims that the ordering is optimal for the integer matrix M = ${cert.scale} · A, with backward weight β = ${cert.claimedBeta} and F_M = ${cert.claimedFA}.` : undefined}>
        {!cert ? <p className="ws-sub" data-testid="no-certificate">No certificate for this run: {a ? a.certificateNote : "only ATLAS-032 produces exportable certificates in the browser"}.</p> : (
          <>
            <dl className="grid gap-x-6 gap-y-1 text-[12.5px] sm:grid-cols-2">
              {[["Strong components", fmtInt(cert.components.length)], ["Components with a cycle packing", fmtInt(cert.components.filter((c) => c.packing).length)],
                ["Largest component", fmtInt(Math.max(...cert.components.map((c) => c.vertices.length)))], ["Size of the file", `${(JSON.stringify(cert).length / 1024).toFixed(1)} KB`]].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4 py-1" style={{ borderBottom: "1px solid var(--ws-line)" }}><dt className="ws-muted">{k}</dt><dd className="num">{val}</dd></div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="ws-btn ws-btn-primary" onClick={verify} disabled={vs.running} data-testid="verify-certificate">{vs.running ? "Verifying…" : v ? "Verify again" : "Verify independently"}</button>
              {vs.running && <button type="button" className="ws-btn" onClick={cancelVerify}>Cancel</button>}
              <button type="button" className="ws-btn" data-testid="export-certificate" onClick={() => download(`${base}-certificate.json`, JSON.stringify({ [p.title ?? base]: cert }, null, 1), "application/json")}>Export certificate</button>
              <button type="button" className="ws-btn" onClick={exportBundle}>Export reproducibility bundle</button>
            </div>
            {v && (
              <div className={`mt-3 rounded-md border px-3 py-2 ws-${v.verdict === "ACCEPTED" ? "green" : v.verdict === "REJECTED" ? "back" : "amber"}`} role="status" data-testid="verdict"
                style={{ borderColor: "color-mix(in srgb, currentColor 40%, transparent)", background: "color-mix(in srgb, currentColor 7%, transparent)" }}>
                <p className="font-semibold">{v.verdict} · {v.ms.toFixed(0)} ms</p>
                <p className="mt-0.5 text-[12.5px]">{v.reason}</p>
                {v.components.filter((c) => c.size > 1).length > 0 && <ul className="mt-1 list-disc pl-5 text-[12px]">{v.components.filter((c) => c.size > 1).slice(0, 30).map((c, i) => <li key={i}>component of {c.size}: {c.how}{c.states ? ` (${fmtInt(c.states)} states)` : ""}</li>)}</ul>}
              </div>
            )}
            {vs.error && <p className="mt-2 text-[12.5px] ws-back" role="alert">{vs.error}</p>}
            <TamperDemo cert={cert as unknown as CertificateLike} />
            <p className="ws-sub mt-3">The browser verifier (<span className="num">certverify.ts</span>) imports no solver code and works in exact BigInt arithmetic. Outside this website, run the separate Python verifier on the exported file: <span className="num">python3 benchmarks/atlas-032/verify_certificate.py certificate.json</span>. Both are computational checks, not Lean proofs. The browser verifier deliberately trades speed for simplicity (BigInt throughout), so it can take far longer than the solve: measured 0.9 s to solve and 7.9 s to verify the 60-item example, 1.6 s and 49 s for a tie-heavy 30-item instance (Node 22, 2.3 GHz Xeon).</p>
          </>
        )}
      </Panel>
    </>
  );
}

/** Demonstrates that the verifier is not a rubber stamp: it checks a deliberately altered copy. */
function TamperDemo({ cert }: { cert: CertificateLike }) {
  const [out, setOut] = useState<{ what: string; v: Verdict } | null>(null);
  const [busy, setBusy] = useState(false);
  const job = useRef<{ cancel: () => void } | null>(null);
  useEffect(() => () => job.current?.cancel(), []);
  const run = (what: string, f: (c: CertificateLike) => boolean) => {
    const c = JSON.parse(JSON.stringify(cert)) as CertificateLike;
    if (!f(c)) { setOut({ what: `${what}: not applicable to this certificate`, v: { verdict: "UNDECIDED", reason: "no suitable component", components: [], F: null, beta: null, ms: 0 } }); return; }
    setBusy(true);
    job.current = startVerify(c, 200_000, { onDone: (v) => { setBusy(false); setOut({ what, v }); }, onError: (m) => { setBusy(false); setOut({ what, v: { verdict: "UNDECIDED", reason: m, components: [], F: null, beta: null, ms: 0 } }); } });
  };
  return (
    <details className="mt-3 text-[12.5px]">
      <summary className="ws-muted">Tamper test: check that a falsified copy is rejected</summary>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className="ws-btn px-2 py-1 text-[12px]" disabled={busy} data-testid="tamper-beta" onClick={() => run("Claimed β lowered by one", (c) => { const k = c.components.findIndex((x) => x.beta > 0); if (k < 0) return false; c.components[k].beta -= 1; if (c.claimedBeta !== undefined) c.claimedBeta -= 1; return true; })}>Lower the claimed β</button>
        <button type="button" className="ws-btn px-2 py-1 text-[12px]" disabled={busy} onClick={() => run("Two items swapped", (c) => { const k = c.components.findIndex((x) => x.order.length >= 2); if (k < 0) return false; const o = c.components[k].order; [o[0], o[1]] = [o[1], o[0]]; c.order = c.components.flatMap((x) => x.order); return true; })}>Swap two items</button>
        <button type="button" className="ws-btn px-2 py-1 text-[12px]" disabled={busy} onClick={() => run("Packing weight inflated", (c) => { const k = c.components.findIndex((x) => x.packing && x.packing.w.length > 0); if (k < 0) return false; c.components[k].packing!.w[0] += 1_000_000; return true; })}>Inflate a packing weight</button>
      </div>
      {out && <p className={`mt-2 ws-${out.v.verdict === "ACCEPTED" ? "back" : "green"}`} data-testid="tamper-verdict">{out.what}: <strong>{out.v.verdict}</strong> — {out.v.reason}{out.v.verdict === "ACCEPTED" ? " (a falsified certificate was accepted: please report this)" : ""}</p>}
    </details>
  );
}

/** Check certificate files: this Studio's export ({name: cert}), the Python verifier's format, or a bare certificate. */
function FileCheck({ verifyBudget }: { verifyBudget: number }) {
  const [items, setItems] = useState<{ name: string; state: "running" | "done" | "error"; v?: Verdict; error?: string }[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const jobs = useRef<{ cancel: () => void }[]>([]);
  useEffect(() => () => jobs.current.forEach((j) => j.cancel()), []);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    jobs.current.forEach((j) => j.cancel()); jobs.current = [];
    if (f.size > 20_000_000) { setNote(`“${f.name}” is larger than 20 MB.`); return; }
    let data: unknown;
    try { data = JSON.parse(await f.text()); } catch (e) { setNote(`“${f.name}” is not valid JSON: ${(e as Error).message}`); setItems([]); return; }
    const isCert = (x: unknown): x is CertificateLike => !!x && typeof x === "object" && Array.isArray((x as CertificateLike).A) && Array.isArray((x as CertificateLike).components);
    const list: [string, CertificateLike][] = isCert(data) ? [[f.name, data]] : data && typeof data === "object" ? Object.entries(data as Record<string, unknown>).filter(([, v]) => isCert(v)) as [string, CertificateLike][] : [];
    if (!list.length) { setNote(`No certificate found in “${f.name}”. Expected an object with A, order and components, or a map of name → certificate.`); setItems([]); return; }
    setNote(`${list.length} certificate${list.length === 1 ? "" : "s"} in “${f.name}”, verified one after another (budget ${fmtInt(verifyBudget)} states each).`);
    setItems(list.map(([name]) => ({ name, state: "running" })));
    let i = 0;
    const next = () => {
      if (i >= list.length) return;
      const k = i++;
      jobs.current.push(startVerify(list[k][1], verifyBudget, {
        onDone: (v) => { setItems((xs) => xs.map((x, j) => (j === k ? { ...x, state: "done", v } : x))); next(); },
        onError: (m) => { setItems((xs) => xs.map((x, j) => (j === k ? { ...x, state: "error", error: m } : x))); next(); },
      }));
    };
    next();
  };
  return (
    <Panel id="filecheck" title="Check a certificate file" sub="Verify certificates without running any solver: from this Studio, from the benchmark suite (certificates.json), or from a colleague.">
      <label className="ws-btn cursor-pointer">Choose certificate file
        <input type="file" accept=".json,application/json" className="sr-only" data-testid="cert-file-input" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {note && <p className="ws-sub mt-2" role="status">{note}</p>}
      {items.length > 0 && (
        <div className="ws-scroll mt-2 max-h-72 overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
          <table className="ws-table" data-testid="cert-file-results">
            <thead><tr><th>Certificate</th><th>Verdict</th><th>Reason</th></tr></thead>
            <tbody>{items.map((x, i) => (
              <tr key={i}><td>{x.name}</td>
                <td className={x.v ? `ws-${x.v.verdict === "ACCEPTED" ? "green" : x.v.verdict === "REJECTED" ? "back" : "amber"} font-semibold` : x.state === "error" ? "ws-back" : "ws-faint"}>{x.v?.verdict ?? (x.state === "error" ? "ERROR" : "checking…")}</td>
                <td className="ws-muted">{x.v ? `${x.v.reason} (${x.v.ms.toFixed(0)} ms)` : x.error ?? ""}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function Transparency() {
  const ids = ["atlas-032", "structural-theorem", "exclusion-dp", "kcut-counting", "airy-conjecture"];
  const items = ids.map((id) => RESEARCH.find((x) => x.id === id)).filter(Boolean) as typeof RESEARCH;
  return (
    <Panel id="transparency" title="What WESTFALL has established" sub="Status of the methods behind this Studio, from the site's single research-status source.">
      <ul className="space-y-3" data-testid="transparency">
        {items.map((x) => (
          <li key={x.id}>
            <p className="text-[13px] font-semibold ws-text">{x.title}</p>
            <p className="mt-0.5"><span className={`ws-chip ${x.level === "lean" ? "ws-green" : x.level === "conjecture" || x.level === "draft" ? "ws-amber" : "ws-text"}`}>{LEVEL_LABEL[x.level]}</span></p>
            <p className="ws-sub mt-1">{x.status}</p>
          </li>
        ))}
      </ul>
      <p className="ws-sub mt-3">The semicomplete-digraph cut-counting inequality is Lean kernel-checked but not peer reviewed, and only the optional cutwidth state cap relies on it. The Airy K^1/6 correction (draft PR #11) is an unproved conjecture that the Studio does not use. No comparison here supports a claim of general superiority over Gurobi, SCIP, HiGHS or specialised linear-ordering solvers.</p>
      <p className="ws-sub mt-2"><Link className="ws-accent underline" href="/formal-verification/">Lean formalization status</Link> · <Link className="ws-accent underline" href="/benchmarks/">Benchmark conditions</Link> · <Link className="ws-accent underline" href="/research/">Research</Link> · <Link className="ws-accent underline" href="/verify/">Certificate verification center</Link></p>
    </Panel>
  );
}
