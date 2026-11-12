"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { REPO } from "@/lib/site";

const links = [
  ["/lab/", "BLX Lab"],
  ["/explainer/", "How BLX works"],
  ["/research/", "Research"],
  ["/benchmarks/", "Benchmarks"],
  ["/verify/", "Verification"],
  ["/roadmap/", "Roadmap"],
] as const;

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <path d="M3 18 Q 8 6 13 18 Q 18 6 23 18" fill="none" stroke="#38bdf8" strokeWidth="1.6" />
      <path d="M3 18 Q 13 26 23 18" fill="none" stroke="#f87171" strokeOpacity=".8" strokeWidth="1.2" />
      {[3, 13, 23].map((x) => <circle key={x} cx={x} cy={18} r={2.6} fill="#04060c" stroke="#e8ecf5" strokeWidth="1.3" />)}
    </svg>
  );
}

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-ink-950/85 backdrop-blur" aria-label="Main">
      <div className="mx-auto flex max-w-page items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Logo />
          <span className="font-mono text-[12.5px] font-semibold tracking-[0.22em] text-fog-100">WESTFALL OPTIMIZATION</span>
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={`rounded-lg px-3 py-2 text-sm transition ${path?.startsWith(href.slice(0, -1)) ? "text-cyan-300" : "text-fog-400 hover:text-fog-100"}`}>
              {label}
            </Link>
          ))}
          <a href={REPO} target="_blank" rel="noreferrer" className="ml-2 rounded-lg border border-line px-3 py-2 text-sm text-fog-300 hover:border-cyan-400/50 hover:text-cyan-300">GitHub ↗</a>
        </div>
        <button className="rounded-lg border border-line px-3 py-2 text-sm text-fog-300 lg:hidden" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-line px-5 pb-4 lg:hidden">
          {links.map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block border-b border-line/50 py-3 text-fog-300">{label}</Link>
          ))}
          <a href={REPO} className="block py-3 text-fog-300">GitHub ↗</a>
        </div>
      )}
    </nav>
  );
}
