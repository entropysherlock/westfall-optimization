"use client";
/**
 * ATLAS-032 benchmark presentation. Every number is computed from public/data/atlas-032.json, which
 * scripts/build-atlas032-data.mjs derives from the committed records in benchmarks/atlas-032/.
 */
import { useMemo, useState } from "react";

import { fmtMs, summarize, type A32Data, type A32Row } from "@/lib/atlas032Summary";
export type { A32Data, A32Row };

export default function Atlas032Bench({ data }: { data: A32Data }) {
  const [scope, setScope] = useState<"all" | "synthetic" | "real">("all");
  const rows = useMemo(() => data.rows.filter((r) => scope === "all" || (scope === "real") === r.real), [data.rows, scope]);
  const fams = useMemo(() => summarize(rows), [rows]);
  const count = (s: A32Row["solver"]) => { const x = rows.filter((r) => r.solver === s); return `${x.filter((r) => r.status === "OPTIMAL").length} / ${x.length}`; };
  const unprovedE = rows.filter((r) => r.solver === "E" && r.status !== "OPTIMAL");
  const hByName = new Map(rows.filter((r) => r.solver === "H").map((r) => [r.name, r]));
  const hFaster = fams.filter((f) => f.faster === "HiGHS");
  const nAll = new Set(data.rows.filter((r) => r.solver === "E").map((r) => r.name)).size;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Instance scope">
        {([["all", `All ${nAll} instances`], ["synthetic", "Synthetic (adversarial)"], ["real", "Real data (LOLIB IO)"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={`tab ${scope === k ? "tab-active" : ""}`}>{l}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["E", "H"] as const).map((s) => (
          <div key={s} className="card p-5"><p className="label">{data.solvers[s]}</p><p className="mt-1 font-mono text-2xl" data-testid={`proved-${s}`}>{count(s)}</p><p className="mt-1 text-xs text-fog-500">proved optimal (exactly) within 30 s</p></div>
        ))}
        {(() => { const x = data.rows.filter((r) => r.solver === "E" && r.real); return x.length > 0 && (
          <div className="card p-5"><p className="label">ATLAS-032 on real data (LOLIB IO)</p><p className="mt-1 font-mono text-2xl" data-testid="proved-E-real">{x.filter((r) => r.status === "OPTIMAL").length} / {x.length}</p><p className="mt-1 text-xs text-fog-500">real input–output instances, n = 44–79, proved optimal within 30 s</p></div>
        ); })()}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="table-clean" data-testid="atlas-family-table">
          <thead><tr><th>Family</th><th>Data</th><th>n</th><th>ATLAS-032</th><th>HiGHS (exact gap)</th><th>Faster median*</th></tr></thead>
          <tbody>{fams.map((f) => (
            <tr key={f.family}>
              <td className="font-medium text-fog-100">{f.family.replace(/\s*\[031 regression\]/, "")}</td><td>{f.real ? "real" : "synthetic"}</td><td className="font-mono">{f.n}</td>
              {[f.E, f.H].map((c, i) => <td key={i} className="font-mono text-[12.5px]">{c ? <><span className={c.proved === c.total ? "text-signal-green" : "text-signal-amber"}>{c.proved}/{c.total}</span> · {fmtMs(c.medianMs)}{i === 0 && c.medianStates !== null ? ` · ${Math.round(c.medianStates).toLocaleString("en-US")} states` : ""}</> : "—"}</td>)}
              <td className={f.faster === "HiGHS" ? "text-signal-amber" : f.faster ? "text-signal-green" : "text-fog-500"}>{f.faster ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-xs text-fog-500">Cells: proved / runs · median wall time over all runs (timeouts count as 30 s) · median search states on proved runs. *Only stated when both solvers proved every instance of the family.</p>

      <div>
        <div className="rounded-lg border border-signal-amber/30 bg-signal-amber/5 p-5 text-sm" data-testid="atlas-losses">
          <p className="font-semibold text-fog-100">Where ATLAS-032 loses</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-fog-300">
            {hFaster.length > 0 && <li>HiGHS has the faster median on {hFaster.length} famil{hFaster.length === 1 ? "y" : "ies"} where both proved everything: {hFaster.map((f) => f.family.replace(/\s*\[031 regression\]/, "")).join("; ")}.</li>}
            {unprovedE.map((r) => { const h = hByName.get(r.name); return (
              <li key={r.name}><span className="font-mono">{r.name}</span>: not proved in 30 s (β ≤ {r.beta}, rigorous β* ≥ {r.lowerBoundBeta}); HiGHS: {h ? `${h.status === "OPTIMAL" ? "proved" : "not proved"}, β ≤ ${h.beta}, bound ${h.lowerBoundBeta?.toFixed(1)}` : "—"}.</li>
            ); })}
            {unprovedE.length === 0 && hFaster.length === 0 && <li>No losses in this selection.</li>}
          </ul>
        </div>
      </div>
      {data.toleranceMislabels.length > 0 && (
        <p className="text-sm text-fog-400">Tolerance note: with its default relative MIP gap (10⁻⁴), HiGHS labelled a suboptimal solution “Optimal” on {data.toleranceMislabels.map((m) => `${m.name} (F = ${m.defaultGapF} vs exact optimum ${m.exactF})`).join(", ")}. All comparisons above therefore use an exact gap of zero; both runs are published.</p>
      )}
      <p className="text-xs text-fog-500">{data.conditions} Sources: {data.generatedFrom.join(", ")}.</p>
    </div>
  );
}
