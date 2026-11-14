"use client";
/**
 * WESTFALL vs GPT-6 challenge, re-checked on 14 Nov 2026. Values come from public/data/lolib-full.json (challenge
 * block), built from benchmarks/gpt6-challenge/results.jsonl. GPT-6's score is self-reported and drawn hatched.
 */
import { useState } from "react";

export interface ChallengeData {
  rounds: { key: string; label: string; n: number; optimum: number | null; optimumProof: string | null; gpt6: { F: number; verified: boolean; note: string } | null }[];
  runs: { round: string; tl: number; solver: string; wall: number; proved: boolean; F: number | null; upper: number | null }[];
  ils: { round: string; F: number; seconds: number; note: string };
}

const short = (s: string) => s.replace(" (LOLIB settings, 4M states)", " · 4 M states").replace(" (Studio settings, 1.5M states)", " · Studio").replace(" 1.16", "").replace(" 10", "");

export default function ChallengeBench({ data }: { data: ChallengeData }) {
  const [tl, setTl] = useState(120);
  const [hover, setHover] = useState<number | null>(null);
  const r2 = data.runs.filter((r) => r.round === "round2_50items" && r.tl === tl);
  const bars = [
    ...r2.map((r) => ({ label: short(r.solver), F: r.F ?? 0, note: `${r.proved ? "proved" : "not proved"} · ${r.wall.toFixed(1)} s · upper bound ${r.upper?.toLocaleString("en-US") ?? "—"}`, kind: r.solver.startsWith("ATLAS") ? "atlas" : "other" })),
    { label: "Local search · 60 s", F: data.ils.F, note: data.ils.note, kind: "other" },
    ...(data.rounds[1].gpt6 ? [{ label: "GPT-6 (self-reported)", F: data.rounds[1].gpt6.F, note: data.rounds[1].gpt6.note, kind: "claim" }] : []),
  ].sort((a, b) => b.F - a.F);
  const exactUB = Math.min(...r2.filter((r) => r.solver === "ATLAS-060" && r.upper !== null).map((r) => r.upper!));
  const W = 640, rowH = 30, L = 170, R = 70, T = 22, H = T + bars.length * rowH + 26;
  const lo = 15000, hi = 40000, x = (v: number) => L + ((Math.max(v, lo) - lo) / (hi - lo)) * (W - L - R);
  const r1 = data.runs.filter((r) => r.round === "round1_20items" && r.tl === 30);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
      <div className="card p-5">
        <p className="font-semibold text-fog-100">{data.rounds[0].label}: optimum {data.rounds[0].optimum?.toLocaleString("en-US")}, proved</p>
        <p className="mt-1 text-xs text-fog-500">Independent proof: {data.rounds[0].optimumProof}. Every solver proves it in under 1 s, so this round does not separate them.</p>
        <table className="table-clean mt-4" data-testid="challenge-round1">
          <thead><tr><th>Solver</th><th>F</th><th>Proved</th><th>Time</th></tr></thead>
          <tbody>{r1.map((r) => <tr key={r.solver}><td>{short(r.solver)}</td><td className="font-mono">{r.F?.toLocaleString("en-US")}</td><td className={r.proved ? "text-signal-green" : "text-fog-500"}>{r.proved ? "yes" : "no"}</td><td className="whitespace-nowrap font-mono">{r.wall.toFixed(2)} s</td></tr>)}</tbody>
        </table>
      </div>
      <figure className="card p-5">
        <figcaption className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-semibold text-fog-100">{data.rounds[1].label}: best ordering found (not proved optimal)</p>
            <p className="mt-0.5 text-xs text-fog-500">Higher is better. Dashed line: ATLAS-060&apos;s exact upper bound on the true optimum ({exactUB.toLocaleString("en-US")}). Axis starts at {lo.toLocaleString("en-US")}.</p></div>
          <div className="flex gap-2" role="group" aria-label="Time limit">
            {[30, 120].map((t) => <button key={t} type="button" aria-pressed={tl === t} onClick={() => setTl(t)} className={`tab ${tl === t ? "tab-active" : ""}`}>{t} s limit</button>)}
          </div>
        </figcaption>
        <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full min-w-[540px]" role="img" aria-label="Best objective value found per method on the 50-item instance; values are also in the labels.">
          <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f1f5f9" /><line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="2" /></pattern></defs>
          {[15000, 20000, 25000, 30000, 35000, 40000].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={T - 6} y2={H - 22} stroke="#eef2f7" /><text x={x(t)} y={H - 8} textAnchor="middle" className="fill-fog-500" style={{ font: "10.5px Inter Variable" }}>{t / 1000}k</text></g>)}
          {bars.map((b, k) => {
            const y = T + k * rowH;
            return (
              <g key={b.label} onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(k)} onBlur={() => setHover(null)} aria-label={`${b.label}: ${b.F.toLocaleString("en-US")}. ${b.note}`}>
                <rect x={0} y={y} width={W} height={rowH} fill={hover === k ? "#f8fafc" : "transparent"} />
                <text x={L - 8} y={y + 19} textAnchor="end" className="fill-fog-300" style={{ font: "11px Inter Variable" }}>{b.label}</text>
                <path d={`M${L},${y + 6}H${x(b.F) - 4}Q${x(b.F)},${y + 6} ${x(b.F)},${y + 10}V${y + rowH - 10}Q${x(b.F)},${y + rowH - 6} ${x(b.F) - 4},${y + rowH - 6}H${L}Z`}
                  fill={b.kind === "claim" ? "url(#hatch)" : b.kind === "atlas" ? "#2a78d6" : "#94a3b8"} stroke={b.kind === "claim" ? "#94a3b8" : "none"} />
                <text x={x(b.F) + 6} y={y + 19} className="fill-fog-100" style={{ font: "600 11px JetBrains Mono" }}>{b.F.toLocaleString("en-US")}</text>
              </g>
            );
          })}
          <line x1={x(exactUB)} x2={x(exactUB)} y1={T - 8} y2={H - 22} stroke="#0b1526" strokeDasharray="4 3" />
          <text x={x(exactUB) - 4} y={T - 10} textAnchor="end" className="fill-fog-400" style={{ font: "10.5px Inter Variable" }}>upper bound</text>
        </svg></div>
        <p className="mt-2 min-h-[2.5rem] text-xs text-fog-500">{hover !== null ? `${bars[hover].label}: ${bars[hover].note}` : "Hover or focus a bar for its time, proof status and bound. Blue: ATLAS. Grey: other methods. Hatched: GPT-6's self-reported score, which could not be verified because its ordering was not supplied."}</p>
      </figure>
    </div>
  );
}
