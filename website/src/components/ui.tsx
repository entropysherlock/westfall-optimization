import Link from "next/link";
import type { ReactNode } from "react";

export type Status = "PROVED_OPTIMAL" | "BEST_FOUND" | "UNRESOLVED" | "CERTIFICATE_REJECTED";
const statusStyle: Record<Status, string> = {
  PROVED_OPTIMAL: "border-signal-green/40 bg-signal-green/10 text-signal-green",
  BEST_FOUND: "border-signal-amber/40 bg-signal-amber/10 text-signal-amber",
  UNRESOLVED: "border-fog-500/40 bg-fog-500/10 text-fog-300",
  CERTIFICATE_REJECTED: "border-signal-red/50 bg-signal-red/10 text-signal-red",
};
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-medium ${statusStyle[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status.replace("_", " ")}
    </span>
  );
}

export type Evidence = "proved" | "tested" | "observed" | "provisional" | "future";
const evStyle: Record<Evidence, [string, string]> = {
  proved: ["Proved in manuscript", "border-cyan-400/40 text-cyan-300"],
  tested: ["Independently tested", "border-signal-green/40 text-signal-green"],
  observed: ["Experimentally observed", "border-signal-violet/40 text-signal-violet"],
  provisional: ["Provisional · not peer-reviewed", "border-signal-amber/40 text-signal-amber"],
  future: ["Future research goal", "border-fog-500/50 text-fog-400"],
};
export function EvidenceTag({ kind }: { kind: Evidence }) {
  const [label, cls] = evStyle[kind];
  return <span className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider ${cls}`}>{label}</span>;
}

export function Section({ id, kicker, title, intro, children }: { id?: string; kicker?: string; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-page px-5 py-20 sm:px-8">
      {kicker && <p className="kicker mb-3">{kicker}</p>}
      <h2 className="h-display text-3xl sm:text-4xl">{title}</h2>
      {intro && <div className="mt-4 max-w-3xl text-lg leading-relaxed text-fog-400">{intro}</div>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function ButtonLink({ href, children, primary = false, external = false }: { href: string; children: ReactNode; primary?: boolean; external?: boolean }) {
  const cls = primary
    ? "bg-cyan-400 text-ink-950 hover:bg-cyan-300"
    : "border border-line bg-ink-900/60 text-fog-100 hover:border-cyan-400/50 hover:text-cyan-300";
  const c = `inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${cls}`;
  return external ? (
    <a href={href} className={c} target="_blank" rel="noreferrer">{children}</a>
  ) : (
    <Link href={href} className={c}>{children}</Link>
  );
}

export function PageHeader({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="grid-bg border-b border-line">
      <div className="mx-auto max-w-page px-5 pb-14 pt-16 sm:px-8">
        <p className="kicker mb-3">{kicker}</p>
        <h1 className="h-display max-w-4xl text-4xl sm:text-5xl">{title}</h1>
        {children && <div className="mt-5 max-w-3xl text-lg leading-relaxed text-fog-400">{children}</div>}
      </div>
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-ink-900/60 p-4">
      <div className="font-mono text-[11px] uppercase tracking-wider text-fog-500">{label}</div>
      <div className="mt-1 font-mono text-lg text-fog-100">{value}</div>
      {hint && <div className="mt-1 text-xs text-fog-500">{hint}</div>}
    </div>
  );
}
