"use client";
import { useEffect, useMemo, useState } from "react";
import { asset } from "@/lib/site";

interface Rec { source: string; family: string; instance: string; seed: number | null; n: number | null; q: number | null; solver: string;
  status: string; time_s: number | null; OPT: number | null; generated: number | null; route: string | null; milp_limit_s: number | null }
interface Data { environment: Record<string, string>; records: Rec[] }

const SOLVERS = ["Packing SLDP", "BLX 1.0", "BLX 2.0", "HiGHS MILP"] as const;
const COLORS: Record<string, string> = { "Packing SLDP": "#5b3fb8", "BLX 1.0": "#b7791f", "BLX 2.0": "#0f766e", "HiGHS MILP": "#15803d" };
const DATASETS = {
  test: { label: "Out-of-sample evaluation", sources: ["Original out-of-sample test"] },
  insample: { label: "In-sample BLX 2.0 evaluation", sources: ["Grid instances (portfolio training set)", "LOLIB instances (training set)", "BLX 2.0 on historical in-sample instances"] },
} as const;

type Row = { key: string; family: string; instance: string; seed: number | null; q: number | null; by: Record<string, Rec> };

const ok = (r?: Rec) => !!r && r.status === "PROVED_OPTIMAL" && r.time_s !== null;
const cellText = (r?: Rec) => {
  if (!r) return "—";
  if (r.status === "PROVED_OPTIMAL") return `${r.time_s!.toFixed(2)} s`;
  if (r.status === "NOT_PROVED_WITHIN_LIMIT") return `not proved (${r.milp_limit_s ?? 60} s)`;
  if (r.status === "TIMEOUT") return "timeout";
  if (r.status === "UNRESOLVED") return "UNRESOLVED";
  return r.status.toLowerCase();
};

export default function BenchmarkDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [ds, setDs] = useState<keyof typeof DATASETS>("test");
  const [fam, setFam] = useState("all");
  const [show, setShow] = useState<Record<string, boolean>>(Object.fromEntries(SOLVERS.map((s) => [s, true])));
  useEffect(() => {
    fetch(asset("data/benchmarks.json")).then((r) => r.json()).then(setData).catch((e) => setErr(String(e)));
  }, []);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const m = new Map<string, Row>();
    for (const r of data.records) {
      if (!(DATASETS[ds].sources as readonly string[]).includes(r.source)) continue;
      const key = `${r.instance}|${r.seed}`;
      if (!m.has(key)) m.set(key, { key, family: r.family, instance: r.instance, seed: r.seed, q: r.q, by: {} });
      m.get(key)!.by[r.solver] = r;
    }
    return [...m.values()].sort((a, b) => a.family.localeCompare(b.family) || a.instance.localeCompare(b.instance));
  }, [data, ds]);
  const families = useMemo(() => ["all", ...new Set(rows.map((r) => r.family))], [rows]);
  const shown = rows.filter((r) => fam === "all" || r.family === fam);

  const summary = useMemo(() => {
    const fastest: Record<string, number> = {};
    const proved: Record<string, [number, number]> = {};
    const favorable: Row[] = [], unfavorable: Row[] = [], unresolved: Row[] = [];
    let disagreements = 0;
    for (const r of shown) {
      const okS = SOLVERS.filter((s) => ok(r.by[s]));
      for (const s of SOLVERS) if (r.by[s]) { proved[s] ??= [0, 0]; proved[s][1]++; if (ok(r.by[s])) proved[s][0]++; }
      if (!okS.length) { unresolved.push(r); continue; }
      const best = okS.reduce((a, b) => (r.by[a].time_s! <= r.by[b].time_s! ? a : b));
      fastest[best] = (fastest[best] ?? 0) + 1;
      const opts = okS.map((s) => r.by[s].OPT!).filter((x) => x !== null);
      if (opts.some((o) => Math.abs(o - opts[0]) > 1e-6 * Math.max(1, Math.abs(opts[0])))) disagreements++;
      const blx = ["BLX 1.0", "BLX 2.0"].filter((s) => ok(r.by[s])).map((s) => r.by[s].time_s!);
      const sl = ok(r.by["Packing SLDP"]) ? r.by["Packing SLDP"].time_s! : Infinity;
      const milpOk = ok(r.by["HiGHS MILP"]);
      if (blx.length && Math.min(...blx) < 0.5 * sl && !milpOk) favorable.push(r);
      if (milpOk && best === "HiGHS MILP" && r.family.includes("LOLIB")) unfavorable.push(r);
    }
    return { fastest, proved, favorable, unfavorable, unresolved, disagreements };
  }, [shown]);

  if (err) return <p className="text-signal-red">Could not load benchmark data: {err}</p>;
  if (!data) return <p className="font-mono text-sm text-fog-500">loading benchmark data…</p>;

  // log-scale dot chart
  const tmin = 0.01, tmax = 1000;
  const W = 900, rowH = 22, left = 290, right = 20, top = 30;
  const H = top + shown.length * rowH + 20;
  const xs = (t: number) => left + ((Math.log10(Math.max(tmin, t)) - Math.log10(tmin)) / (Math.log10(tmax) - Math.log10(tmin))) * (W - left - right);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-end gap-4 p-5">
        <label className="min-w-0 max-w-full text-xs text-fog-500">Dataset
          <select value={ds} onChange={(e) => { setDs(e.target.value as keyof typeof DATASETS); setFam("all"); }} className="mt-1 block rounded-lg border border-line bg-ink-850 px-3 py-2 text-sm">
            {Object.entries(DATASETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-fog-500">Family
          <select value={fam} onChange={(e) => setFam(e.target.value)} className="mt-1 block rounded-lg border border-line bg-ink-850 px-3 py-2 text-sm">
            {families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          {SOLVERS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-fog-300">
              <input type="checkbox" checked={show[s]} onChange={() => setShow({ ...show, [s]: !show[s] })} style={{ accentColor: COLORS[s] }} />
              <span style={{ color: COLORS[s] }}>●</span> {s}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-signal-green">Favorable ({summary.favorable.length})</p>
          <p className="mt-2 text-sm text-fog-400">A BLX variant proved optimality in under half the packing-SLDP time while the 60 s MILP did not prove it.</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-fog-300">{summary.favorable.slice(0, 8).map((r) => <li key={r.key}>{r.instance}</li>)}</ul>
        </div>
        <div className="card p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-signal-red">Unfavorable ({summary.unfavorable.length})</p>
          <p className="mt-2 text-sm text-fog-400">LOLIB instances where the generic MILP was the fastest exact solver.</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-fog-300">{summary.unfavorable.slice(0, 8).map((r) => <li key={r.key}>{r.instance}</li>)}</ul>
        </div>
        <div className="card p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-fog-300">Unresolved ({summary.unresolved.length})</p>
          <p className="mt-2 text-sm text-fog-400">No solver established an optimum within its limits.</p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-fog-300">{summary.unresolved.map((r) => <li key={r.key}>{r.instance}</li>)}</ul>
        </div>
      </div>

      <div className="card overflow-x-auto p-5">
        <p className="mb-2 text-sm text-fog-400">Wall-clock time to a proof of optimality (log scale). Hollow markers at the right edge: not proved / timeout / unresolved. Exact objective values agree across solvers on every
          instance where more than one proved optimality ({summary.disagreements} disagreements).</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[760px]" role="img" aria-label="Runtime comparison chart">
          {[0.01, 0.1, 1, 10, 100, 1000].map((t) => (
            <g key={t}>
              <line x1={xs(t)} x2={xs(t)} y1={top - 10} y2={H - 15} stroke="#e2e8f0" />
              <text x={xs(t)} y={top - 14} textAnchor="middle" fontSize={10} className="fill-fog-500 font-mono">{t >= 1 ? `${t}s` : `${t * 1000}ms`}</text>
            </g>
          ))}
          {shown.map((r, i) => (
            <g key={r.key} transform={`translate(0, ${top + i * rowH})`}>
              <text x={left - 8} y={14} textAnchor="end" fontSize={10.5} className="fill-fog-300 font-mono">{r.instance.length > 44 ? r.instance.slice(0, 43) + "…" : r.instance}</text>
              {SOLVERS.filter((s) => show[s] && r.by[s]).map((s, k) => {
                const rec = r.by[s];
                const proved = ok(rec);
                const x = proved ? xs(rec.time_s!) : W - right - 6 - k * 3;
                return proved ? (
                  <circle key={s} cx={x} cy={10} r={4.5} fill={COLORS[s]}><title>{`${s}: ${cellText(rec)}`}</title></circle>
                ) : (
                  <circle key={s} cx={x} cy={10} r={4.5} fill="none" stroke={COLORS[s]} strokeWidth={1.5}><title>{`${s}: ${cellText(rec)}`}</title></circle>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className="card overflow-x-auto p-5">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-fog-100">
              <th className="py-2 pr-3">Family</th><th className="py-2 pr-3">Instance</th>
              {SOLVERS.map((s) => <th key={s} className="py-2 pr-3" style={{ color: COLORS[s] }}>{s}</th>)}
              <th className="py-2 pr-3">BLX 2.0 route</th><th className="py-2">Optimum (F<sub>A</sub>)</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs text-fog-300">
            {shown.map((r) => {
              const opt = SOLVERS.map((s) => r.by[s]).find((x) => ok(x) && x!.OPT !== null)?.OPT;
              return (
                <tr key={r.key} className="border-b border-line/50">
                  <td className="py-1.5 pr-3 text-fog-500">{r.family}</td>
                  <td className="py-1.5 pr-3">{r.instance}{r.seed !== null && r.seed !== 0 ? ` · seed ${r.seed}` : ""}</td>
                  {SOLVERS.map((s) => <td key={s} className={`py-1.5 pr-3 ${ok(r.by[s]) ? "" : "text-fog-500"}`}>{cellText(r.by[s])}</td>)}
                  <td className="py-1.5 pr-3 text-fog-500">{r.by["BLX 2.0"]?.route ?? "—"}</td>
                  <td className="py-1.5">{opt === undefined || opt === null ? "—" : Number.isInteger(opt) ? opt : opt.toFixed(6)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5 text-sm text-fog-400">
          <p className="font-semibold text-fog-100">Summary for this view</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {SOLVERS.map((s) => summary.proved[s] && <li key={s}><span style={{ color: COLORS[s] }}>{s}</span>: proved {summary.proved[s][0]} / {summary.proved[s][1]} · fastest on {summary.fastest[s] ?? 0}</li>)}
          </ul>
        </div>
        <div className="card p-5 text-xs leading-relaxed text-fog-500">
          <p className="font-semibold text-fog-100">Environment and fairness notes</p>
          {Object.entries(data.environment).map(([k, v]) => <p key={k} className="mt-1"><span className="text-fog-300">{k}:</span> {v}</p>)}
          <p className="mt-2">DP solvers are Python/NumPy; HiGHS is compiled C++. Time limits differ between solvers (see notes), so a timeout is not a like-for-like loss. No specialised LOP branch-and-cut solver was benchmarked.</p>
        </div>
      </div>
    </div>
  );
}
