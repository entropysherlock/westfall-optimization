"use client";
import { useEffect, useRef, useState } from "react";
import type { CertificateLike, Verdict } from "@/lib/studio/certverify";
import { parseCertificate, Reject, verifyCertificate, type Certificate } from "@/lib/verify";
import { asset } from "@/lib/site";
import { StatusBadge, type Status } from "./ui";

interface Item { id: string; title: string; matrix: number[][]; reference: { OPT: number; certificate: string } }
type Outcome = { status: Status; title: string; detail: string; ms: number };

const TAMPERS: { id: string; label: string; apply: (c: Certificate, m: number[][]) => { cert: Certificate; matrix: number[][] } }[] = [
  { id: "none", label: "Genuine certificate", apply: (c, m) => ({ cert: c, matrix: m }) },
  { id: "drop", label: "Remove one retained state", apply: (c, m) => { const k = c.layers.reduce((b, L, i) => (i > 0 && i < c.layers.length - 1 && L.length > c.layers[b].length ? i : b), 1); c.layers[k] = c.layers[k].slice(1); return { cert: c, matrix: m }; } },
  { id: "order", label: "Claim a different ordering", apply: (c, m) => { c.order = c.order.slice().reverse(); return { cert: c, matrix: m }; } },
  { id: "pack", label: "Inflate a packing value", apply: (c, m) => { if (c.pack.length) c.pack[0][1] = c.pack[0][1] * 3n + c.D; else c.order = c.order.slice().reverse(); return { cert: c, matrix: m }; } },
  { id: "skew", label: "Corrupt one matrix entry", apply: (c, m) => { c.A[0][1] += 1n; return { cert: c, matrix: m }; } },
  { id: "input", label: "Check against an altered input matrix", apply: (c, m) => { const x = m.map((r) => r.slice()); x[0][1] += 1; x[1][0] -= 1; return { cert: c, matrix: x }; } },
];

export default function VerifyCenter({ items }: { items: Item[] }) {
  const [sel, setSel] = useState(items[0].id);
  const [tamper, setTamper] = useState("none");
  const [out, setOut] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [upCert, setUpCert] = useState<string | null>(null);
  const [upInst, setUpInst] = useState<number[][] | null>(null);
  const [upName, setUpName] = useState("");

  const check = (text: string, matrix: number[][] | undefined, expected?: number, tamperId = "none") => {
    const t0 = performance.now();
    try {
      let cert = parseCertificate(text);
      let m = matrix;
      if (tamperId !== "none" && matrix) ({ cert, matrix: m } = TAMPERS.find((x) => x.id === tamperId)!.apply(cert, matrix));
      const r = verifyCertificate(cert, m);
      const ms = performance.now() - t0;
      setOut({ status: "PROVED_OPTIMAL", ms, title: "ACCEPTED — optimality independently verified",
        detail: `Verified optimum ${r.OPT.toPrecision(12)}${expected !== undefined ? ` (solver claimed ${expected.toPrecision(12)})` : ""}. ` +
          `${r.kept} retained states replayed, ${r.excludedChecked} exclusion inequalities re-checked exactly. Scale D has ${r.D.toString().length} digits. ` +
          (r.bound ? "Certificate is bound to the supplied input matrix." : "No input matrix supplied: this proves optimality for the matrix inside the certificate only.") });
    } catch (e) {
      setOut({ status: "CERTIFICATE_REJECTED", ms: performance.now() - t0, title: "REJECTED", detail: e instanceof Reject ? e.message : `Malformed input: ${(e as Error).message}` });
    }
  };

  const runPreset = async () => {
    setBusy(true); setOut(null);
    const it = items.find((x) => x.id === sel)!;
    const text = await (await fetch(asset(it.reference.certificate))).text();
    setTimeout(() => { check(text, it.matrix, it.reference.OPT, tamper); setBusy(false); }, 10);
  };

  const onFile = async (f: File | undefined, kind: "cert" | "inst") => {
    if (!f) return;
    const text = await f.text();
    if (kind === "cert") { setUpCert(text); setUpName(f.name); }
    else {
      try { const d = JSON.parse(text); setUpInst(Array.isArray(d) ? d : d.matrix); } catch { setUpInst(null); }
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <p className="kicker mb-3">Check a published certificate</p>
        <label className="text-xs text-fog-500" htmlFor="vc-preset">Certificate produced by the Python BLX 2.0 solver</label>
        <select id="vc-preset" value={sel} onChange={(e) => setSel(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-ink-850 px-3 py-2 text-sm">
          {items.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <fieldset className="mt-4 space-y-1.5">
          <legend className="text-xs text-fog-500">Tampering experiment</legend>
          {TAMPERS.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm text-fog-300">
              <input type="radio" name="tamper" className="accent-cyan-400" checked={tamper === t.id} onChange={() => setTamper(t.id)} /> {t.label}
            </label>
          ))}
        </fieldset>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={runPreset} disabled={busy} className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">{busy ? "Verifying…" : "Verify in browser"}</button>
          <a href={asset(items.find((x) => x.id === sel)!.reference.certificate)} download className="text-sm text-cyan-300 underline">download certificate</a>
        </div>
      </div>

      <div className="card p-6">
        <p className="kicker mb-3">Upload your own</p>
        <p className="text-sm text-fog-400">Certificates from <code className="text-cyan-300">westfall-opt solve … --certificate cert.json</code> (n ≤ 30). Files never leave your browser.</p>
        <label className="mt-4 block text-xs text-fog-500">Certificate JSON
          <input type="file" accept=".json,application/json" onChange={(e) => onFile(e.target.files?.[0], "cert")} className="mt-1 block w-full text-sm text-fog-300 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-fog-100" />
        </label>
        <label className="mt-3 block text-xs text-fog-500">Instance JSON (optional, enables input binding)
          <input type="file" accept=".json,application/json" onChange={(e) => onFile(e.target.files?.[0], "inst")} className="mt-1 block w-full text-sm text-fog-300 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-fog-100" />
        </label>
        <button disabled={!upCert} onClick={() => upCert && check(upCert, upInst ?? undefined)} className="mt-4 rounded-lg bg-ink-700 px-4 py-2 text-sm text-fog-100 hover:bg-ink-600 disabled:opacity-40">
          Verify {upName || "upload"}
        </button>
      </div>

      <AtlasUpload />

      <div className="lg:col-span-2" aria-live="polite">
        {out && (
          <div className={`card p-6 ${out.status === "CERTIFICATE_REJECTED" ? "border-signal-red/50" : "border-signal-green/40"}`}>
            <div className="flex flex-wrap items-center gap-3"><StatusBadge status={out.status} /><span className="font-semibold text-fog-100">{out.title}</span><span className="font-mono text-xs text-fog-500">{out.ms.toFixed(1)} ms</span></div>
            <p className="mt-3 text-sm text-fog-300">{out.detail}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** ATLAS-032 certificates (Studio export or verify_certificate.py format), checked by the independent
 *  in-browser verifier in its own worker. Several certificates in one file are checked in turn. */
function AtlasUpload() {
  const [items, setItems] = useState<[string, CertificateLike][] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [res, setRes] = useState<{ name: string; v: Verdict }[]>([]);
  const [busy, setBusy] = useState(false);
  const wref = useRef<Worker | null>(null);
  useEffect(() => () => wref.current?.terminate(), []);
  const onFile = async (f: File | undefined) => {
    setRes([]); setItems(null); setNote(null);
    if (!f) return;
    if (f.size > 20e6) { setNote("file larger than 20 MB"); return; }
    try {
      const d = JSON.parse(await f.text());
      const list: [string, CertificateLike][] = d && Array.isArray(d.A) ? [[f.name, d]] : Object.entries(d ?? {}).filter(([, v]) => v && Array.isArray((v as CertificateLike).A)) as [string, CertificateLike][];
      if (!list.length) { setNote("no ATLAS-032 certificate found in this file"); return; }
      setItems(list); setNote(`${list.length} certificate${list.length > 1 ? "s" : ""} loaded from ${f.name}`);
    } catch { setNote("the file is not valid JSON"); }
  };
  const run = () => {
    if (!items) return;
    setBusy(true); setRes([]);
    const queue = items.slice();
    const next = () => {
      const it = queue.shift();
      if (!it) { setBusy(false); wref.current?.terminate(); wref.current = null; return; }
      const w = new Worker(new URL("../lib/studio/verify.worker.ts", import.meta.url));
      wref.current = w;
      w.onmessage = (ev: MessageEvent<{ type: string; verdict?: Verdict; message?: string }>) => {
        w.terminate();
        const v: Verdict = ev.data.verdict ?? { verdict: "REJECTED", reason: ev.data.message ?? "verifier error", components: [], F: null, beta: null, ms: 0 };
        setRes((r) => [...r, { name: it[0], v }]);
        next();
      };
      w.onerror = (e) => { w.terminate(); setRes((r) => [...r, { name: it[0], v: { verdict: "UNDECIDED", reason: e.message || "verifier crashed (possibly out of memory)", components: [], F: null, beta: null, ms: 0 } }]); next(); };
      w.postMessage({ cert: it[1], maxStates: 2_000_000 });
    };
    next();
  };
  const cancel = () => { wref.current?.terminate(); wref.current = null; setBusy(false); };
  const st = (v: Verdict["verdict"]): Status => (v === "ACCEPTED" ? "PROVED_OPTIMAL" : v === "REJECTED" ? "CERTIFICATE_REJECTED" : "UNRESOLVED");
  return (
    <div className="card p-6 lg:col-span-2" data-testid="atlas-upload">
      <p className="kicker mb-3">ATLAS-032 optimality certificate</p>
      <p className="text-sm text-fog-400">Certificates exported from the Studio&apos;s Certificate tab, or files in the format of <code className="text-cyan-300">benchmarks/atlas-032/verify_certificate.py</code>. They are checked by a separate verifier that imports no solver code and uses exact integer arithmetic; it is a computational check, not a formal proof. Files never leave your browser.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block text-xs text-fog-500">Certificate JSON
          <input type="file" accept=".json,application/json" onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block w-full text-sm text-fog-300 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-700 file:px-3 file:py-1.5 file:text-fog-100" />
        </label>
        <button disabled={!items || busy} onClick={run} className="rounded-lg bg-ink-700 px-4 py-2 text-sm text-fog-100 hover:bg-ink-600 disabled:opacity-40">{busy ? "Verifying…" : "Verify"}</button>
        {busy && <button onClick={cancel} className="text-sm text-cyan-300 underline">Cancel</button>}
      </div>
      {note && <p className="mt-2 text-xs text-fog-500" role="status">{note}</p>}
      {res.length > 0 && (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {res.map(({ name, v }) => (
            <li key={name} className="flex flex-wrap items-center gap-3 text-sm"><StatusBadge status={st(v.verdict)} label={v.verdict} /><span className="font-medium text-fog-100">{name}</span>
              <span className="text-fog-400">{v.reason}{v.F ? ` · F = ${v.F}, β = ${v.beta}` : ""}</span><span className="font-mono text-xs text-fog-500">{v.ms.toFixed(0)} ms</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
