import Link from "next/link";
import { REPO, RESEARCH_CI } from "@/lib/site";
import { Wordmark } from "./Logo";

const cols: [string, [string, string][]][] = [
  ["Product", [["/studio/", "Optimization Studio"], ["/case-studies/forty-items/", "Case study: 40 items"], ["/docs/", "Documentation"], ["/docs/api/", "Job API"], ["/verify/", "Certificate verifier"], ["/benchmarks/", "Benchmarks"]]],
  ["Research", [["/research/", "Research program"], ["/research/theorem/", "Structural theorem"], ["/research/manuscript/", "White paper"], ["/formal-verification/", "Formal verification"], ["/roadmap/", "Open questions"]]],
  ["Company", [["/technology/", "Technology"], ["/applications/", "Applications"], ["/about/", "About"], ["/contact/", "Contact & licensing"]]],
];

export default function Footer() {
  return (
    <footer className="grid-navy border-t border-navy-800 text-slate-300">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div>
          <Wordmark light />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
            An independent research and software initiative in exact weighted linear ordering, structural decomposition and verifiable optimization.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href={REPO} className="text-slate-300 hover:text-white">Source on GitHub ↗</a>
            <a href={RESEARCH_CI} className="text-slate-300 hover:text-white">Lean kernel build ↗</a>
          </div>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <p className="kicker-light">{title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([href, label]) => <li key={href}><Link href={href} className="text-slate-300 hover:text-white">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-navy-800">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 Westfall Optimization · Caleb Westfall. Not peer reviewed; no institutional affiliation. Code licensed under <a href={`${REPO}/blob/main/LICENSE`} className="underline hover:text-white">GPL-3.0</a>.</p>
          <p>Formal results refer to the Lean development on the research branch; see Verification for exact scope.</p>
        </div>
      </div>
    </footer>
  );
}
