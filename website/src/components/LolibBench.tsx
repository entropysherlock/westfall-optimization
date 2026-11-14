"use client";
/**
 * Full LOLIB study (232 instances): ATLAS-060 (experimental), ATLAS-032 (published run and same-machine rerun), HiGHS, SCIP.
 * Every number is computed here from public/data/lolib-full.json, which scripts/build-lolib-data.mjs derives from the
 * committed per-instance records. Nothing is typed by hand.
 */
import { useMemo, useState, type ReactNode } from "react";

export interface Run { status: string; solved: boolean; wall: number | null; F: number | null; upper: number | null }
export interface Inst { id: string; family: string; name: string; n: number; bks: number | null; by: Record<string, Run> }
export interface LolibData {
  generatedFrom: string[]; conditions: string; families: string[];
  solvers: { key: string; label: string; note: string }[];
  instances: Inst[];
  verification: { proved: number; objectiveRecomputed: number; equalsBKS: number; certificates: number; certificatesValid: number };
}

// validated categorical order (dataviz palette, slots 1–5; light surface): never cycled, follows the solver
const COLOR: Record<string, string> = { atlas060: "#2a78d6", atlas032: "#eb6834", atlas032r: "#1baf7a", highs: "#eda100", scip: "#e87ba4" };
const SHORT: Record<string, string> = { atlas060: "ATLAS-060", atlas032: "ATLAS-032 (published)", atlas032r: "ATLAS-032 (rerun)", highs: "HiGHS", scip: "SCIP" };
const TL = 30;
const font = { font: "11px Inter Variable" } as const;

const sgm = (runs: Run[]) => runs.length ? Math.exp(runs.reduce((a, r) => a + Math.log((r.solved ? Math.min(r.wall ?? TL, TL) : TL) + 10), 0) / runs.length) - 10 : 0;
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const incGap = (i: Inst, r: Run) => (r.F === null || !i.bks ? null : (100 * (i.bks - r.F)) / Math.abs(i.bks));
const bndGap = (i: Inst, r: Run) => (r.solved ? 0 : r.upper === null || !i.bks ? null : (100 * (r.upper - i.bks)) / Math.abs(i.bks));
const fmtS = (s: number | null) => (s === null ? "—" : s < 1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(s < 10 ? 2 : 1)} s`);
const fmtPct = (p: number | null) => (p === null ? "—" : p === 0 ? "0" : p < 0.01 ? "<0.01 %" : `${p.toFixed(2)} %`);
const STATUS: Record<string, string> = { SOLVED: "proved", LIMIT: "time/state limit", KILLED_AT_LIMIT: "killed at 33 s, no result", OUT_OF_MEMORY: "out of memory", NOT_ATTEMPTED: "not attempted", OPTIMAL_OVER_LIMIT: "proved after 30 s", ERROR: "error" };

/** Tooltip shared by every chart: values lead, labels follow; a short line keys each series. */
function Tip({ tip }: { tip: { x: number | string; y: number; title: string; rows: { key?: string; label: string; value: string }[] } | null }) {
  if (!tip) return null;
  return (
    <div role="status" className="pointer-events-none absolute z-10 min-w-[11rem] rounded-md border border-line bg-white px-3 py-2 text-xs shadow-lift"
      style={{ left: tip.x, top: tip.y, transform: "translate(-50%, calc(-100% - 10px))" }}>
      <p className="mb-1 font-semibold text-fog-100">{tip.title}</p>
      {tip.rows.map((r, k) => (
        <p key={k} className="flex items-center gap-2 whitespace-nowrap leading-5">
          {r.key && <span className="inline-block h-0.5 w-3 rounded" style={{ background: COLOR[r.key] }} aria-hidden />}
          <span className="font-mono font-semibold text-fog-100">{r.value}</span><span className="text-fog-500">{r.label}</span>
        </p>
      ))}
    </div>
  );
}
type TipState = Parameters<typeof Tip>[0]["tip"];

function Legend({ keys, shape }: { keys: string[]; shape: "rect" | "line" }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fog-400">
      {keys.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          {shape === "rect" ? <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[k] }} /> : <span className="h-0.5 w-4 rounded" style={{ background: COLOR[k] }} />}
          {SHORT[k]}
        </span>
      ))}
    </div>
  );
}

function ChartCard({ title, sub, children, wide = false }: { title: string; sub: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <figure className="card p-5">
      <figcaption><p className="font-semibold text-fog-100">{title}</p><p className="mt-0.5 text-xs text-fog-500">{sub}</p></figcaption>
      <div className="mt-4 overflow-x-auto"><div className={wide ? "min-w-[760px]" : "min-w-[540px]"}>{children}</div></div>
    </figure>
  );
}

/** Grouped bars: proved instances per family, one bar per solver. 4px rounded data end, square baseline, 2px gaps. */
function ProvedBars({ insts, fams, keys }: { insts: Inst[]; fams: string[]; keys: string[] }) {
  const [tip, setTip] = useState<TipState>(null);
  const W = 640, H = 280, L = 40, R = 8, T = 12, B = 34;
  const data = fams.map((f) => { const x = insts.filter((i) => i.family === f); return { f, total: x.length, v: Object.fromEntries(keys.map((k) => [k, x.filter((i) => i.by[k].solved).length])) }; });
  const ymax = Math.max(1, ...data.map((d) => d.total));
  const step = ymax > 60 ? 20 : ymax > 20 ? 10 : ymax > 8 ? 2 : 1;
  const top = Math.ceil(ymax / step) * step;
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const gw = (W - L - R) / data.length, bw = Math.min(22, (gw - 16) / keys.length - 2);
  const bar = (x: number, v: number) => {
    const y0 = y(0), y1 = y(v), h = y0 - y1, r = Math.min(4, h, bw / 2);
    return h <= 0 ? "" : `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z`;
  };
  return (
    <div className="relative" onPointerLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Instances proved optimal within 30 s per family and solver. Exact values are in the table below.">
        {Array.from({ length: top / step + 1 }, (_, k) => k * step).map((t) => (
          <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef2f7"} /><text x={L - 6} y={y(t) + 4} textAnchor="end" className="fill-fog-500" style={font}>{t}</text></g>
        ))}
        {data.map((d, gi) => {
          const gx = L + gi * gw + (gw - keys.length * (bw + 2) + 2) / 2;
          return (
            <g key={d.f}>
              <line x1={gx - 3} x2={gx + keys.length * (bw + 2) + 1} y1={y(d.total)} y2={y(d.total)} stroke="#94a3b8" strokeDasharray="3 3" />
              {keys.map((k, si) => {
                const x = gx + si * (bw + 2);
                const show = (e: { clientX: number; clientY: number; currentTarget: Element }) => {
                  const box = (e.currentTarget.closest("div") as HTMLElement).getBoundingClientRect();
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title: `${d.f} · ${d.total} instances`, rows: [{ key: k, label: SHORT[k], value: `${d.v[k]} proved` }] });
                };
                return (
                  <g key={k}>
                    <path d={bar(x, d.v[k])} fill={COLOR[k]} />
                    <rect x={x - 1} y={T} width={bw + 2} height={H - T - B} fill="transparent" tabIndex={0} aria-label={`${d.f}, ${SHORT[k]}: ${d.v[k]} of ${d.total} proved`}
                      onPointerMove={show} onFocus={(e) => { const b = e.currentTarget.getBoundingClientRect(); show({ clientX: b.left + b.width / 2, clientY: b.top + 40, currentTarget: e.currentTarget }); }} onBlur={() => setTip(null)} />
                  </g>
                );
              })}
              <text x={L + gi * gw + gw / 2} y={H - 12} textAnchor="middle" className="fill-fog-400" style={font}>{d.f} ({d.total})</text>
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/** Performance profile: instances proved within t seconds (log axis), one 2px step line per solver, crosshair snaps to t. */
function Profile({ insts, keys }: { insts: Inst[]; keys: string[] }) {
  const [hx, setHx] = useState<number | null>(null);
  const W = 640, H = 280, L = 40, R = 14, T = 12, B = 34, lo = Math.log10(0.1), hi = Math.log10(TL);
  const x = (t: number) => L + ((Math.log10(Math.max(t, 0.1)) - lo) / (hi - lo)) * (W - L - R);
  const tOf = (px: number) => 10 ** (lo + ((px - L) / (W - L - R)) * (hi - lo));
  const times = Object.fromEntries(keys.map((k) => [k, insts.filter((i) => i.by[k].solved && i.by[k].wall !== null).map((i) => i.by[k].wall!).sort((a, b) => a - b)]));
  const total = insts.length;
  const step = total > 100 ? 50 : total > 40 ? 10 : 5;
  const ytop = Math.max(step, Math.ceil(Math.max(...keys.map((k) => times[k].length)) / step) * step);
  const y = (v: number) => T + (H - T - B) * (1 - v / ytop);
  const path = (ts: number[]) => { let d = `M${x(0.1)},${y(0)}`; ts.forEach((t, k) => { d += `H${x(t)}V${y(k + 1)}`; }); return d + `H${x(TL)}`; };
  const at = (k: string, t: number) => times[k].filter((w) => w <= t).length;
  const tHover = hx === null ? null : Math.min(TL, Math.max(0.1, tOf(hx)));
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label="Number of instances proved optimal within a given time, log time axis from 0.1 s to 30 s."
        onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - b.left) / b.width) * W; setHx(px < L || px > W - R ? null : px); }}
        onPointerLeave={() => setHx(null)}>
        {Array.from({ length: ytop / step + 1 }, (_, k) => k * step).map((t) => (
          <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef2f7"} /><text x={L - 6} y={y(t) + 4} textAnchor="end" className="fill-fog-500" style={font}>{t}</text></g>
        ))}
        {[0.1, 0.3, 1, 3, 10, 30].map((t) => (
          <g key={t}><line x1={x(t)} x2={x(t)} y1={T} y2={H - B} stroke="#eef2f7" /><text x={x(t)} y={H - 16} textAnchor="middle" className="fill-fog-500" style={font}>{t < 1 ? `${t * 1000} ms` : `${t} s`}</text></g>
        ))}
        {keys.map((k) => <path key={k} d={path(times[k])} fill="none" stroke={COLOR[k]} strokeWidth={2} strokeLinejoin="round" />)}
        {tHover !== null && <line x1={x(tHover)} x2={x(tHover)} y1={T} y2={H - B} stroke="#64748b" strokeWidth={1} />}
        <text x={(L + W - R) / 2} y={H - 2} textAnchor="middle" className="fill-fog-400" style={font}>time limit t (log scale)</text>
      </svg>
      {tHover !== null && hx !== null && (
        <Tip tip={{ x: `${(hx / W) * 100}%`, y: 150, title: `proved within ${fmtS(tHover)}`, rows: [...keys].sort((a, b) => at(b, tHover) - at(a, tHover)).map((k) => ({ key: k, label: SHORT[k], value: `${at(k, tHover)} / ${total}` })) }} />
      )}
    </div>
  );
}

/** Outcome quality: share of instances in each outcome bucket, one 100 % bar per solver (sequential teal, darkest = best). */
const BUCKETS = [
  { key: "proved", label: "proved optimal", fill: "#115e59" },
  { key: "bks", label: "matches best known, not proved", fill: "#0d9488" },
  { key: "1", label: "within 1 % of best known", fill: "#5ccdbd" },
  { key: "far", label: "more than 1 % below best known", fill: "#b9e8e0" },
  { key: "none", label: "no ordering returned", fill: "#cbd5e1" },
] as const;
const bucketOf = (i: Inst, r: Run) => { if (r.solved) return "proved"; const g = incGap(i, r); return g === null ? "none" : g <= 0 ? "bks" : g <= 1 ? "1" : "far"; };

function Outcomes({ insts, keys }: { insts: Inst[]; keys: string[] }) {
  const [tip, setTip] = useState<TipState>(null);
  const W = 1100, rowH = 30, L = 190, R = 8, T = 6, H = T + keys.length * rowH + 6;
  const counts = keys.map((k) => ({ k, c: Object.fromEntries(BUCKETS.map((b) => [b.key, insts.filter((i) => bucketOf(i, i.by[k]) === b.key).length])) }));
  const tot = insts.length || 1, sx = (v: number) => (v / tot) * (W - L - R);
  return (
    <div className="relative" onPointerLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Outcome of each solver's run: proved optimal, matches best known, within 1 %, more than 1 % below, or no ordering returned.">
        {counts.map(({ k, c }, ri) => {
          let acc = 0; const yy = T + ri * rowH;
          return (
            <g key={k}>
              <rect x={6} y={yy + 9} width={10} height={10} rx={2} fill={COLOR[k]} />
              <text x={22} y={yy + 18} className="fill-fog-300" style={font}>{SHORT[k]}</text>
              {BUCKETS.map((b) => {
                const v = c[b.key]; if (!v) return null;
                const x0 = L + sx(acc); acc += v; const w = Math.max(0, sx(v) - 2);
                return (
                  <rect key={b.key} x={x0} y={yy + 4} width={w} height={rowH - 12} rx={3} fill={b.fill} tabIndex={0} aria-label={`${SHORT[k]}: ${v} ${b.label}`}
                    onPointerMove={(e) => { const box = (e.currentTarget.closest("div") as HTMLElement).getBoundingClientRect(); setTip({ x: e.clientX - box.left, y: e.clientY - box.top, title: SHORT[k], rows: [{ label: b.label, value: `${v} / ${insts.length}` }] }); }}
                    onBlur={() => setTip(null)} />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fog-400">
        {BUCKETS.map((b) => <span key={b.key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.fill }} />{b.label}</span>)}
      </div>
      <Tip tip={tip} />
    </div>
  );
}

export default function LolibBench({ data }: { data: LolibData }) {
  const [fam, setFam] = useState("all");
  const [onlyDiff, setOnlyDiff] = useState(false);
  const keys = data.solvers.map((s) => s.key);
  const insts = useMemo(() => data.instances.filter((i) => fam === "all" || i.family === fam), [data.instances, fam]);
  const fams = fam === "all" ? data.families : [fam];
  const metrics = useMemo(() => keys.map((k) => {
    const runs = insts.map((i) => i.by[k]);
    const provedT = insts.filter((i) => i.by[k].solved).map((i) => i.by[k].wall!).filter((w) => w !== null);
    const ig = insts.map((i) => incGap(i, i.by[k])).filter((g): g is number => g !== null);
    const bg = insts.filter((i) => !i.by[k].solved).map((i) => bndGap(i, i.by[k])).filter((g): g is number => g !== null);
    const failed = runs.filter((r) => ["KILLED_AT_LIMIT", "OUT_OF_MEMORY", "ERROR", "NOT_ATTEMPTED"].includes(r.status)).length;
    return { k, proved: provedT.length, sgm: sgm(runs), medProved: median(provedT), returned: ig.length, atBks: ig.filter((g) => g <= 0).length,
      meanInc: ig.length ? ig.reduce((a, b) => a + b, 0) / ig.length : null, medBound: median(bg), boundN: bg.length, failed };
  }), [insts, keys]);
  const rows = useMemo(() => insts.filter((i) => !onlyDiff || new Set(keys.map((k) => i.by[k].solved)).size > 1), [insts, onlyDiff, keys]);
  const v = data.verification;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Instance family">
        {[["all", `All ${data.instances.length}`], ...data.families.map((f) => [f, `${f} (${data.instances.filter((i) => i.family === f).length})`])].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={fam === k} onClick={() => setFam(k)} className={`tab ${fam === k ? "tab-active" : ""}`}>{l}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.k} className="card p-4">
            <p className="label flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[m.k] }} />{SHORT[m.k]}</p>
            <p className="mt-1 font-mono text-2xl text-fog-100" data-testid={`lolib-proved-${m.k}`}>{m.proved} / {insts.length}</p>
            <p className="mt-1 text-xs text-fog-500">proved optimal within 30 s · SGM {m.sgm.toFixed(2)} s</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Proved optimal, by family" sub="Bars: instances proved within 30 s. Dashed line: instances in the family.">
          <Legend keys={keys} shape="rect" /><div className="mt-3"><ProvedBars insts={insts} fams={fams} keys={keys} /></div>
        </ChartCard>
        <ChartCard title="Proved within a given time" sub="Performance profile: how many instances each solver proves within t seconds. Higher and further left is better.">
          <Legend keys={keys} shape="line" /><div className="mt-3"><Profile insts={insts} keys={keys} /></div>
        </ChartCard>
      </div>

      <ChartCard wide title="What each run returned" sub="Every run, including unsolved ones, against the best-known value (BKS) published for the instance.">
        <Outcomes insts={insts} keys={keys} />
      </ChartCard>

      <div>
        <p className="font-semibold text-fog-100">All metrics</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="table-clean" data-testid="lolib-metrics">
            <thead><tr><th>Solver</th><th>Proved</th><th>SGM time*</th><th>Median time (proved)</th><th>Ordering returned</th><th>Equal to BKS</th><th>Mean gap to BKS</th><th>Median bound gap (unproved)</th><th>Killed / out of memory</th></tr></thead>
            <tbody>{metrics.map((m) => (
              <tr key={m.k}>
                <td className="whitespace-nowrap font-medium text-fog-100"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: COLOR[m.k] }} />{SHORT[m.k]}</td>
                <td className="whitespace-nowrap font-mono">{m.proved} / {insts.length}</td><td className="whitespace-nowrap font-mono">{m.sgm.toFixed(2)} s</td><td className="whitespace-nowrap font-mono">{fmtS(m.medProved)}</td>
                <td className="whitespace-nowrap font-mono">{m.returned} / {insts.length}</td><td className="font-mono">{m.atBks}</td><td className="font-mono">{fmtPct(m.meanInc)}</td>
                <td className="whitespace-nowrap font-mono">{m.boundN ? `${fmtPct(m.medBound)} (${m.boundN})` : "—"}</td><td className="font-mono">{m.failed}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-fog-500">*Shifted geometric mean with a 10 s shift; unsolved runs count as 30 s. Gap to BKS: how far the returned ordering is below the best-known value, over runs that returned one. Bound gap: how far the solver&apos;s proven upper bound is above the best-known value, over unproved runs that reported one (SCIP and HiGHS bounds are floating point; ATLAS bounds are exact integers).</p>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-4">
          <p className="font-semibold text-fog-100">Every instance ({rows.length})</p>
          <label className="inline-flex items-center gap-2 text-sm text-fog-400"><input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> only instances where the solvers disagree on proved / not proved</label>
        </div>
        <div className="mt-3 max-h-[560px] overflow-auto rounded-xl border border-line bg-white" tabIndex={0} role="region" aria-label="Per-instance LOLIB results">
          <table className="table-clean" data-testid="lolib-instances">
            <thead className="sticky top-0"><tr><th>Instance</th><th>n</th><th>BKS</th>{keys.map((k) => <th key={k} className="whitespace-nowrap">{SHORT[k]}</th>)}</tr></thead>
            <tbody>{rows.map((i) => (
              <tr key={i.id}>
                <td className="whitespace-nowrap font-mono text-[12.5px]">{i.id}</td><td className="font-mono">{i.n}</td><td className="font-mono">{i.bks?.toLocaleString("en-US") ?? "—"}</td>
                {keys.map((k) => { const r = i.by[k]; const g = incGap(i, r); return (
                  <td key={k} className="whitespace-nowrap font-mono text-[12px]" title={STATUS[r.status] ?? r.status}>
                    {r.solved ? <span className="text-signal-green">✓ {fmtS(r.wall)}</span>
                      : <span className="text-fog-500">{r.F === null ? (STATUS[r.status] ?? r.status) : `✗ gap ${fmtPct(g)}`}</span>}
                  </td>); })}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-fog-500">✓ proved optimal (wall time). ✗ not proved within 30 s; the gap is the returned ordering&apos;s distance below the best-known value. Hover a cell for the run status.</p>
      </div>

      <p className="text-sm text-fog-400">Independent checks on ATLAS-060&apos;s {v.proved} proved results: {v.objectiveRecomputed} / {v.proved} orderings re-scored from the raw matrix, {v.equalsBKS} / {v.proved} equal to the published best-known value, {v.certificatesValid} / {v.certificates} optimality certificates accepted by a separate exact-integer checker (the remaining {v.proved - v.certificates} proofs come from the unchanged ATLAS-032 fallback).</p>
      <p className="text-xs text-fog-500">{data.conditions} {data.solvers.map((s) => `${s.label}: ${s.note}`).join(" ")} Sources: {data.generatedFrom.join(", ")}.</p>
    </div>
  );
}
