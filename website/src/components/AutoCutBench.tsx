"use client";
import { useMemo, useState } from "react";

export interface BenchRow {
  id: number; suite: string; family: string; n: number; status: string; lam: number | null; k: number | null; rounds: number | null;
  reachable: number | null; nodes: number | null; counted_cost: number | null; ms_costed: number | null; ms_memo: number | null;
  memo_same_output: boolean | null; unmemoX_same_output: boolean | null;
}

const fmtMs = (ms: number | null) => (ms === null || ms === undefined ? "—" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`);

/** Scatter of per-instance runtimes (log scale): memoised generation vs costed (current) generation. */
export function SpeedScatter({ rows }: { rows: BenchRow[] }) {
  const pts = rows.filter((r) => r.ms_costed && r.ms_memo && r.ms_memo >= 50);
  const W = 520, H = 360, pad = 48;
  const lo = 1, hi = 6.2; // log10 ms
  const sx = (ms: number) => pad + ((Math.log10(ms) - lo) / (hi - lo)) * (W - 2 * pad);
  const sy = (ms: number) => H - pad - ((Math.log10(ms) - lo) / (hi - lo)) * (H - 2 * pad);
  const ticks = [1, 2, 3, 4, 5, 6];
  const colors: Record<number, string> = { 3: "#94a3b8", 4: "#2bb3a1", 5: "#0f766e", 6: "#0b1a2e" };
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[560px]" role="img" aria-label="Runtime of the memoised generation versus the current costed generation, log-log scale; points below the diagonal are faster now.">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(10 ** t)} x2={sx(10 ** t)} y1={pad} y2={H - pad} stroke="#eef2f7" />
            <line y1={sy(10 ** t)} y2={sy(10 ** t)} x1={pad} x2={W - pad} stroke="#eef2f7" />
            <text x={sx(10 ** t)} y={H - pad + 16} textAnchor="middle" className="fill-fog-500" style={{ font: "10px Inter Variable" }}>{t >= 3 ? `${10 ** (t - 3)} s` : `${10 ** t} ms`}</text>
            <text x={pad - 8} y={sy(10 ** t) + 3} textAnchor="end" className="fill-fog-500" style={{ font: "10px Inter Variable" }}>{t >= 3 ? `${10 ** (t - 3)} s` : `${10 ** t} ms`}</text>
          </g>
        ))}
        <line x1={sx(10)} y1={sy(10)} x2={sx(10 ** 6.2)} y2={sy(10 ** 6.2)} stroke="#cbd5e1" strokeDasharray="4 4" />
        <text x={sx(10 ** 5.1)} y={sy(10 ** 5.4)} className="fill-fog-500" style={{ font: "10px Inter Variable" }}>equal time</text>
        {pts.map((r) => (
          <circle key={r.id} cx={sx(r.ms_memo!)} cy={sy(r.ms_costed!)} r={4} fill={colors[r.n] ?? "#475569"} fillOpacity={0.85}>
            <title>{`#${r.id} ${r.family}, n=${r.n}: memoised ${fmtMs(r.ms_memo)}, current ${fmtMs(r.ms_costed)}`}</title>
          </circle>
        ))}
        <text x={W / 2} y={H - 8} textAnchor="middle" className="fill-fog-400" style={{ font: "11px Inter Variable" }}>memoised generation (autoCutM)</text>
        <text transform={`translate(12 ${H / 2}) rotate(-90)`} textAnchor="middle" className="fill-fog-400" style={{ font: "11px Inter Variable" }}>current generation (autoCutC)</text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-fog-500">
        {[3, 4, 5, 6].map((n) => <span key={n} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[n] }} /> n = {n}</span>)}
        <span>{pts.length} shared instances where autoCutM took ≥ 50 ms</span>
      </figcaption>
    </figure>
  );
}

export function BenchTable({ rows }: { rows: BenchRow[] }) {
  const [filter, setFilter] = useState<"all" | "completed" | "not">("all");
  const [nf, setNf] = useState<number | "all">("all");
  const shown = useMemo(() => rows.filter((r) => (filter === "all" || (filter === "completed" ? r.status === "PASS" : r.status !== "PASS")) && (nf === "all" || r.n === nf)), [rows, filter, nf]);
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <select className="field w-auto py-1.5" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter by outcome">
          <option value="all">All 119 instances</option><option value="completed">Completed (PASS)</option><option value="not">Not completed</option>
        </select>
        <select className="field w-auto py-1.5" value={nf} onChange={(e) => setNf(e.target.value === "all" ? "all" : Number(e.target.value))} aria-label="Filter by n">
          <option value="all">All sizes</option>{[1, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>n = {n}</option>)}
        </select>
        <span className="self-center text-sm text-fog-500">{shown.length} rows</span>
      </div>
      <div className="mt-3 max-h-[520px] overflow-auto rounded-xl border border-line bg-white">
        <table className="table-clean">
          <thead className="sticky top-0"><tr><th>#</th><th>Family</th><th>n</th><th>Outcome</th><th>λ(A)</th><th>k</th><th>Reachable cuts</th><th>Counted cost</th><th>autoCutC</th><th>autoCutM</th><th>Same output</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="font-mono">{r.id}</td><td>{r.family.replace(/_/g, " ")}</td><td className="font-mono">{r.n}</td>
                <td className={r.status === "PASS" ? "text-signal-green" : "text-fog-500"}>{r.status === "PASS" ? "exact (PASS)" : "not completed"}</td>
                <td className="font-mono">{r.lam ?? "—"}</td><td className="font-mono">{r.k ?? "—"}</td><td className="font-mono">{r.reachable ?? "—"}</td>
                <td className="font-mono">{r.counted_cost?.toLocaleString("en-US") ?? "—"}</td>
                <td className="font-mono">{fmtMs(r.ms_costed)}</td><td className="font-mono">{fmtMs(r.ms_memo)}</td>
                <td>{r.memo_same_output === null || r.memo_same_output === undefined ? "—" : r.memo_same_output ? "yes" : "NO"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
