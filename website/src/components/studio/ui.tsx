"use client";
/** Small presentational primitives shared by the Studio workspaces (Mission 039). */
import type { ReactNode } from "react";
import type { Q } from "@/lib/studio/rational";

export function Panel({ title, sub, actions, children, className = "", id, testId }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string; testId?: string }) {
  return (
    <section className={`ws-panel p-4 sm:p-5 ${className}`} aria-labelledby={title && id ? `${id}-h` : undefined} data-testid={testId}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            {title && <h2 id={id ? `${id}-h` : undefined} className="ws-h">{title}</h2>}
            {sub && <p className="ws-sub mt-0.5">{sub}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Metric({ label, value, hint, testId, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; testId?: string; tone?: "accent" | "back" | "amber" | "green" | "violet" }) {
  return (
    <div className="ws-sunken min-w-0 px-3.5 py-3">
      <p className="ws-lbl">{label}</p>
      <p className={`num mt-1 break-words text-[17px] leading-snug ${tone ? `ws-${tone}` : "ws-text"}`} data-testid={testId}>{value}</p>
      {hint && <p className="ws-sub mt-1 text-[11.5px]">{hint}</p>}
    </div>
  );
}

/** A term with a concise definition available on hover and to screen readers. */
export function Term({ children, def }: { children: ReactNode; def: string }) {
  return <span className="ws-term" title={def}>{children}<span className="sr-only"> ({def})</span></span>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ws-panel flex min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="ws-h">{title}</p>
      {children && <div className="ws-sub max-w-md">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export type StatusKind = "OPTIMAL" | "FEASIBLE" | "INTERRUPTED" | "FAILED";
export const STATUS_UI: Record<StatusKind, { label: string; tone: string; explain: string }> = {
  OPTIMAL: { label: "Proven optimal", tone: "green", explain: "An exact solver completed under its exactness assumptions." },
  FEASIBLE: { label: "Feasible — not proven optimal", tone: "amber", explain: "A valid ordering is available without a complete optimality proof." },
  INTERRUPTED: { label: "Interrupted — not proven optimal", tone: "amber", explain: "The exact search ended (time or state budget) without establishing optimality." },
  FAILED: { label: "Invalid or failed", tone: "back", explain: "The run could not produce a valid result." },
};

export function StatusPill({ status, testId, size = "md" }: { status: StatusKind; testId?: string; size?: "sm" | "md" }) {
  const s = STATUS_UI[status];
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-2 rounded-md border font-semibold ws-${s.tone} ${size === "sm" ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[13px]"}`}
      style={{ borderColor: `color-mix(in srgb, var(--ws-${s.tone}) 45%, transparent)`, background: `color-mix(in srgb, var(--ws-${s.tone}) 10%, transparent)` }}>
      <StatusGlyph status={status} />
      {s.label}
    </span>
  );
}

/** Shape as well as colour distinguishes the statuses (colour-blind safe). */
export function StatusGlyph({ status }: { status: StatusKind }) {
  const common = { width: 10, height: 10, viewBox: "0 0 10 10", "aria-hidden": true } as const;
  if (status === "OPTIMAL") return <svg {...common}><path d="M1.5 5.2 4 7.6 8.6 2.4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>;
  if (status === "FEASIBLE") return <svg {...common}><circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
  if (status === "INTERRUPTED") return <svg {...common}><path d="M3 2v6M7 2v6" stroke="currentColor" strokeWidth="1.8" /></svg>;
  return <svg {...common}><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.8" /></svg>;
}

export const fmtQ = (q: Q, digits = 4) => {
  const s = q.toString();
  return s.includes("/") ? `${q.toDecimal(digits)} (= ${s})` : s;
};
export const fmtMs = (ms: number) => (ms < 1000 ? `${ms.toFixed(ms < 10 ? 1 : 0)} ms` : `${(ms / 1000).toFixed(2)} s`);
export const fmtInt = (x: number) => x.toLocaleString("en-US");

export function Toggle({ checked, onChange, children, id, disabled, hint }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; id: string; disabled?: boolean; hint?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <input id={id} type="checkbox" className="ws-check mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id} className="text-[13px] leading-snug ws-text">
        {children}
        {hint && <span className="ws-sub block">{hint}</span>}
      </label>
    </div>
  );
}
