"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "./Logo";

export const NAV_LINKS = [
  ["/technology/", "Technology"],
  ["/research/", "Research"],
  ["/formal-verification/", "Verification"],
  ["/benchmarks/", "Benchmarks"],
  ["/applications/", "Applications"],
  ["/docs/", "Documentation"],
  ["/about/", "About"],
] as const;

export default function Nav() {
  const path = usePathname() || "/";
  // the menu is open only for the path it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (f: (v: boolean) => boolean) => setOpenOn(f(open) ? path : null);
  const active = (href: string) => path === href || path.startsWith(href);
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="Westfall Optimization home" className="shrink-0"><Wordmark /></Link>
        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-[13.5px] font-medium transition ${active(href) ? "text-navy-900" : "text-fog-400 hover:text-fog-100"}`}>
              {label}
              {active(href) && <span className="mt-0.5 block h-0.5 rounded bg-accent-500" aria-hidden />}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/contact/" className="btn-ghost whitespace-nowrap px-3 py-2 text-[13.5px]">Contact</Link>
          <Link href="/studio/" className="btn-primary whitespace-nowrap px-4 py-2 text-[13.5px]">Open Studio</Link>
        </div>
        <button type="button" className="btn-secondary px-3 py-2 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="max-h-[80vh] overflow-y-auto border-t border-line bg-white px-5 py-2 lg:hidden">
          {[["/studio/", "Optimization Studio"], ...NAV_LINKS, ["/contact/", "Contact"]].map(([href, label]) => (
            <Link key={href} href={href} className={`block border-b border-line px-1 py-3 text-[15px] ${active(href) ? "font-semibold text-navy-900" : "text-fog-300"}`}>{label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
