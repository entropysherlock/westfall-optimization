import Link from "next/link";
import { LEVEL_LABEL, RESEARCH, type Level, type ResearchItem } from "@/lib/researchStatus";

// colours reuse the existing EvidenceTag tokens (ui.tsx); no new palette
const LEVEL_CLASS: Record<Level, string> = {
  lean: "border-accent-600/40 bg-accent-50 text-accent-700",
  partial: "border-accent-600/25 bg-white text-accent-700",
  proved: "border-navy-700/30 bg-ink-900 text-navy-800",
  computational: "border-signal-green/30 bg-signal-green/5 text-signal-green",
  draft: "border-signal-amber/30 bg-signal-amber/5 text-signal-amber",
  conjecture: "border-signal-red/25 bg-signal-red/5 text-signal-red",
  experimental: "border-signal-violet/30 bg-signal-violet/5 text-signal-violet",
};

export function LevelTag({ level }: { level: Level }) {
  return <span data-level={level} className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider ${LEVEL_CLASS[level]}`}>{LEVEL_LABEL[level]}</span>;
}

const ext = (href: string) => href.startsWith("http");

export function ResearchStatusTable({ items = RESEARCH }: { items?: ResearchItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line" data-testid="research-status">
      <table className="table-clean">
        <thead><tr><th>Result</th><th>Verification status</th><th>What this means</th><th>Source</th></tr></thead>
        <tbody>{items.map((r) => (
          <tr key={r.id} id={`status-${r.id}`}>
            <td className="min-w-[220px]"><p className="font-semibold text-fog-100">{r.title}</p><p className="mt-1 text-xs leading-relaxed text-fog-400">{r.statement}</p></td>
            <td className="min-w-[170px]"><div className="flex flex-col items-start gap-1"><LevelTag level={r.level} />{r.also?.map((l) => <LevelTag key={l} level={l} />)}</div></td>
            <td className="min-w-[220px] text-xs leading-relaxed text-fog-300">{r.status}</td>
            <td className="whitespace-nowrap text-xs">{ext(r.source) ? <a className="text-accent-600 underline" href={r.source}>{r.sourceLabel} ↗</a> : <Link className="text-accent-600 underline" href={r.source}>{r.sourceLabel}</Link>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function InProgressCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {RESEARCH.filter((r) => r.inProgress).map((r) => (
        <div key={r.id} className="card p-6" data-testid="in-progress-card">
          <div className="flex flex-wrap gap-2"><LevelTag level={r.level} />{r.also?.map((l) => <LevelTag key={l} level={l} />)}</div>
          <h3 className="mt-3 font-semibold text-fog-100">{r.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-fog-400">{r.statement}</p>
          <p className="mt-2 text-xs leading-relaxed text-fog-500">{r.status}</p>
          <a className="mt-3 inline-block text-sm font-semibold text-accent-600 hover:underline" href={r.source}>{r.sourceLabel} →</a>
        </div>
      ))}
    </div>
  );
}
