import Link from "next/link";
import { REPO } from "@/lib/site";

export default function Footer() {
 return <footer className="border-t border-line bg-ink-950">
  <div className="mx-auto grid max-w-page gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
    <div><p className="font-mono text-sm font-bold tracking-[.2em] text-fog-100">WESTFALL <span className="text-cyan-300">/</span> OPTIMIZATION</p>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog-500">Independent AI-assisted mathematics research led by Caleb Westfall. Algorithms, written proofs, experiments, and reproducibility—without claims of institutional affiliation or peer-reviewed endorsement.</p>
      <p className="mt-6 font-mono text-xs text-fog-500">© 2026 · Research in progress</p>
    </div>
    <div><p className="mb-4 font-mono text-xs tracking-widest text-fog-300">EXPLORE</p><div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
      {([["/research/","Research"],["/research/discovery-022/","Discovery 022"],["/lab/","BLX Lab"],["/explainer/","Explainer"],["/benchmarks/","Benchmarks"],["/verify/","Certificates"],["/formal-verification/","Lean status"],["/roadmap/","Roadmap"]] as const).map(([href,label])=><Link key={href} href={href} className="text-fog-400 hover:text-cyan-300">{label}</Link>)}
    </div></div>
    <div><p className="mb-4 font-mono text-xs tracking-widest text-fog-300">TRANSPARENCY</p>
      <p className="text-sm leading-relaxed text-fog-500">Discovery 022 is an unreviewed Level 3 candidate. It is not Lean-verified. The BLX integer certificate checker does not substitute for theorem formalization.</p>
      <a className="mt-5 inline-block text-sm text-cyan-300 hover:underline" href={REPO}>Source and limitations ↗</a>
      <p className="mt-4 text-xs text-fog-500">Repository license selection pending.</p>
    </div>
  </div>
 </footer>;
}
