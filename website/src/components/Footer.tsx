import Link from "next/link";
import { REPO } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink-950">
      <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:px-8 md:grid-cols-3">
        <div>
          <p className="font-mono text-xs font-semibold tracking-[0.22em] text-fog-100">WESTFALL OPTIMIZATION</p>
          <p className="mt-3 text-sm leading-relaxed text-fog-500">
            An independent research initiative led by Caleb Westfall. Not an incorporated company, funded institute, or university affiliate.
            Research results on this site are provisional and have not been peer-reviewed.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Link className="text-fog-400 hover:text-cyan-300" href="/lab/">BLX Laboratory</Link>
          <Link className="text-fog-400 hover:text-cyan-300" href="/research/">Research</Link>
          <Link className="text-fog-400 hover:text-cyan-300" href="/explainer/">How BLX works</Link>
          <Link className="text-fog-400 hover:text-cyan-300" href="/research/paper/">Manuscript</Link>
          <Link className="text-fog-400 hover:text-cyan-300" href="/benchmarks/">Benchmarks</Link>
          <Link className="text-fog-400 hover:text-cyan-300" href="/verify/">Verification</Link>
          <Link className="text-fog-400 hover:text-cyan-300" href="/roadmap/">Roadmap</Link>
          <a className="text-fog-400 hover:text-cyan-300" href={REPO}>Source code</a>
        </div>
        <div className="text-sm text-fog-500">
          <p>Exact certificates on this site are checked with exact integer arithmetic. That is not the same as a formal proof in a proof assistant.</p>
          <p className="mt-3">License: pending the project owner&apos;s decision (see repository).</p>
        </div>
      </div>
    </footer>
  );
}
