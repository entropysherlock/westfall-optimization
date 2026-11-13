import Link from "next/link";
import type { ReactNode } from "react";

export type Status = "PROVED_OPTIMAL" | "BEST_FOUND" | "UNRESOLVED" | "CERTIFICATE_REJECTED";
const statusStyle: Record<Status, string> = {
  PROVED_OPTIMAL: "border-signal-green/30 bg-signal-green/5 text-signal-green",
  BEST_FOUND: "border-signal-amber/30 bg-signal-amber/5 text-signal-amber",
  UNRESOLVED: "border-fog-500/30 bg-ink-850 text-fog-400",
  CERTIFICATE_REJECTED: "border-signal-red/30 bg-signal-red/5 text-signal-red",
};
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-medium ${statusStyle[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? status.replace("_", " ")}
    </span>
  );
}

export type Evidence = "proved" | "lean" | "tested" | "observed" | "provisional" | "future" | "open";
const evStyle: Record<Evidence, [string, string]> = {
  lean: ["Lean kernel-checked", "border-accent-600/40 bg-accent-50 text-accent-700"],
  proved: ["Proved in manuscript", "border-navy-700/30 bg-ink-900 text-navy-800"],
  tested: ["Independently tested", "border-signal-green/30 bg-signal-green/5 text-signal-green"],
  observed: ["Measured", "border-signal-violet/30 bg-signal-violet/5 text-signal-violet"],
  provisional: ["Not peer reviewed", "border-signal-amber/30 bg-signal-amber/5 text-signal-amber"],
  future: ["Planned", "border-fog-500/30 bg-ink-900 text-fog-400"],
  open: ["Open question", "border-signal-red/25 bg-signal-red/5 text-signal-red"],
};
export function EvidenceTag({ kind, children }: { kind: Evidence; children?: ReactNode }) {
  const [label, cls] = evStyle[kind];
  return <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider ${cls}`}>{children ?? label}</span>;
}

export function Section({ id, kicker, title, intro, children, muted = false }: { id?: string; kicker?: string; title?: ReactNode; intro?: ReactNode; children?: ReactNode; muted?: boolean }) {
  return (
    <section id={id} className={muted ? "border-y border-line bg-ink-900" : undefined}>
      <div className="mx-auto max-w-page px-5 py-16 sm:px-8 lg:py-20">
        {kicker && <p className="kicker mb-3">{kicker}</p>}
        {title && <h2 className="h-display max-w-3xl text-[28px] leading-tight sm:text-[34px]">{title}</h2>}
        {intro && <div className="lede mt-4 max-w-3xl">{intro}</div>}
        <div className={title || intro ? "mt-10" : undefined}>{children}</div>
      </div>
    </section>
  );
}

export function ButtonLink({ href, children, primary = false, external = false, accent = false }: { href: string; children: ReactNode; primary?: boolean; external?: boolean; accent?: boolean }) {
  const c = accent ? "btn-accent" : primary ? "btn-primary" : "btn-secondary";
  return external ? (
    <a href={href} className={c} target="_blank" rel="noreferrer">{children}</a>
  ) : (
    <Link href={href} className={c}>{children}</Link>
  );
}

export function PageHeader({ kicker, title, children, aside }: { kicker: string; title: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="grid-bg border-b border-line">
      <div className={`mx-auto max-w-page px-5 pb-14 pt-14 sm:px-8 lg:pt-20 ${aside ? "grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end" : ""}`}>
        <div>
          <p className="kicker mb-4">{kicker}</p>
          <h1 className="h-display max-w-4xl text-[36px] leading-[1.08] sm:text-[48px]">{title}</h1>
          {children && <div className="lede mt-5 max-w-3xl">{children}</div>}
        </div>
        {aside}
      </div>
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="label">{label}</div>
      <div className="mt-1 font-mono text-lg text-fog-100">{value}</div>
      {hint && <div className="mt-1 text-xs leading-relaxed text-fog-500">{hint}</div>}
    </div>
  );
}

export function Callout({ tone = "note", title, children }: { tone?: "note" | "warn" | "ok"; title?: ReactNode; children: ReactNode }) {
  const cls = tone === "warn" ? "border-signal-amber/30 bg-signal-amber/5" : tone === "ok" ? "border-signal-green/30 bg-signal-green/5" : "border-navy-700/15 bg-ink-900";
  return (
    <div className={`rounded-lg border p-4 text-sm leading-relaxed text-fog-300 ${cls}`}>
      {title && <p className="mb-1 font-semibold text-fog-100">{title}</p>}
      {children}
    </div>
  );
}

export function FeatureCard({ title, children, href, cta, kicker }: { title: ReactNode; children: ReactNode; href?: string; cta?: string; kicker?: string }) {
  const body = (
    <>
      {kicker && <p className="kicker">{kicker}</p>}
      <h3 className={`${kicker ? "mt-3" : ""} text-lg font-semibold text-fog-100`}>{title}</h3>
      <div className="mt-2 flex-1 text-sm leading-relaxed text-fog-400">{children}</div>
      {href && <span className="mt-5 text-sm font-semibold text-accent-600">{cta ?? "Learn more"} →</span>}
    </>
  );
  if (!href) return <div className="card flex flex-col p-6">{body}</div>;
  const external = href.startsWith("http");
  const cls = "card flex flex-col p-6 transition hover:border-fog-500/40 hover:shadow-lift";
  return external ? <a href={href} className={cls} target="_blank" rel="noreferrer">{body}</a> : <Link href={href} className={cls}>{body}</Link>;
}
