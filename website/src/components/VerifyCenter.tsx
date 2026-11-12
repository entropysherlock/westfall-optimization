"use client";
import { useState } from "react";
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
          <button onClick={runPreset} disabled={busy} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Verifying…" : "Verify in browser"}</button>
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
