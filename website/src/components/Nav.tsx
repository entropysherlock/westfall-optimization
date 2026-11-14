"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./Logo";

/**
 * Top navigation is deliberately short: three sections plus Contact and the Studio button. Every other page is
 * linked from its section and from the footer. `match` lists the routes that belong to a section, so its tab stays
 * highlighted there (e.g. Research on the verification pages).
 */
export const NAV_LINKS: { href: string; label: string; match: string[] }[] = [
  { href: "/technology/", label: "Technology", match: ["/technology/", "/benchmarks/", "/applications/", "/explainer/"] },
  { href: "/research/", label: "Research", match: ["/research/", "/formal-verification/", "/verify/", "/roadmap/"] },
  { href: "/docs/", label: "Docs", match: ["/docs/"] },
];

export default function Nav() {
  const path = usePathname() || "/";
  // the menu is open only for the path it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (f: (v: boolean) => boolean) => setOpenOn(f(open) ? path : null);
  const active = (href: string) => path === href || path.startsWith(href);
  const sectionActive = (match: string[]) => match.some((m) => path.startsWith(m));
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="Westfall Optimization home" className="shrink-0"><Wordmark /></Link>
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label, match }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`rounded-md px-3.5 py-2 text-[14px] font-medium transition ${sectionActive(match) ? "text-navy-900" : "text-fog-400 hover:text-fog-100"}`}>
              {label}
              {sectionActive(match) && <span className="mt-0.5 block h-0.5 rounded bg-accent-500" aria-hidden />}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/contact/" className="btn-ghost whitespace-nowrap px-3 py-2 text-[13.5px]">Contact</Link>
          <Link href="/studio/" className="btn-primary whitespace-nowrap px-4 py-2 text-[13.5px]">Open Studio</Link>
        </div>
        <button type="button" className="btn-secondary px-3 py-2 md:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="max-h-[80vh] overflow-y-auto border-t border-line bg-white px-5 py-2 md:hidden">
          {[["/studio/", "Optimization Studio"], ...NAV_LINKS.map((l) => [l.href, l.label]), ["/about/", "About"], ["/contact/", "Contact"]].map(([href, label]) => (
            <Link key={href} href={href} className={`block border-b border-line px-1 py-3 text-[15px] ${active(href) ? "font-semibold text-navy-900" : "text-fog-300"}`}>{label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
