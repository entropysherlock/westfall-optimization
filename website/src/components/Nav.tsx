"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { REPO } from "@/lib/site";

const links = [
  ["/research/", "Research"],
  ["/research/discovery-022/", "Structural Theorem"],
  ["/lab/", "Lab"],
  ["/benchmarks/", "Benchmarks"],
  ["/verify/", "Certificates"],
  ["/formal-verification/", "Lean status"],
  ["/roadmap/", "Roadmap"],
] as const;

function Logo() {
 return <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
   <rect x="1" y="1" width="28" height="28" rx="8" fill="#0a1020" stroke="#1b4560"/>
   <path d="M5 21 11 10 16 20 23 7 26 12" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
   <circle cx="11" cy="10" r="2" fill="#7dd3fc"/><circle cx="23" cy="7" r="2" fill="#a78bfa"/>
 </svg>;
}

export default function Nav() {
 const path=usePathname();
 const [open,setOpen]=useState(false);
 const active=(href:string)=>path===href || (href==="/research/" ? path==="/research/" || path==="/research/paper/" : path?.startsWith(href));
 return <nav className="sticky top-0 z-50 border-b border-line bg-ink-950/90 backdrop-blur-xl" aria-label="Main navigation">
   <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
     <Link href="/" className="flex shrink-0 items-center gap-3" onClick={()=>setOpen(false)}>
       <Logo/><span className="font-mono text-[11px] font-bold tracking-[.19em] text-fog-100 sm:text-[12px]">WESTFALL <span className="text-cyan-300">/</span> OPTIMIZATION</span>
     </Link>
     <div className="hidden items-center gap-1 xl:flex">
       {links.map(([href,label])=><Link key={href} href={href} className={`rounded-lg px-2.5 py-2 text-[13px] transition ${active(href)?"bg-cyan-400/10 text-cyan-300":"text-fog-400 hover:bg-ink-800 hover:text-fog-100"}`}>{label}</Link>)}
       <a href={REPO} target="_blank" rel="noreferrer" className="ml-2 rounded-lg border border-cyan-400/30 px-3 py-2 text-[13px] text-cyan-300 hover:border-cyan-400">GitHub ↗</a>
     </div>
     <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm text-fog-100 xl:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={()=>setOpen(v=>!v)}>{open?"Close":"Menu"}</button>
   </div>
   {open&&<div id="mobile-nav" className="max-h-[75vh] overflow-y-auto border-t border-line bg-ink-950 px-5 py-3 xl:hidden">{links.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="block border-b border-line/60 px-2 py-3 text-sm text-fog-300 hover:text-cyan-300">{label}</Link>)}<a href={REPO} target="_blank" rel="noreferrer" className="block px-2 py-3 text-sm text-cyan-300">GitHub ↗</a></div>}
 </nav>;
}
