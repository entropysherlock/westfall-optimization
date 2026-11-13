import Link from "next/link";
import { ButtonLink, Callout, EvidenceTag, FeatureCard, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import HeroDemo from "@/components/HeroDemo";
import { REPO, RESEARCH_CI } from "@/lib/site";

const capabilities = [
  ["Exact optimization", "Dynamic programming and exclusion search that establish optimality when they complete, never just “good enough” without saying so."],
  ["Structural decomposition", "AutoCut recovers an ordered partition attaining the structural parameter λ(A) directly from the data, with no partition supplied."],
  ["Verifiable results", "Every objective is recomputed exactly from your input. Small instances are checked by exhaustive enumeration, and the core algorithm's correctness is kernel-checked in Lean."],
];

export default function Home() {
  return (
    <>
      <section className="grid-navy relative border-b border-navy-800 text-white">
        <div className="mx-auto grid max-w-page items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-24">
          <div>
            <p className="kicker-light">Structural algorithms · Exact optimization · Verifiable results</p>
            <h1 className="mt-6 text-[42px] font-semibold leading-[1.04] tracking-[-.035em] sm:text-[56px]">The mathematics of better decisions.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Westfall Optimization builds software for ordering problems: sequencing, ranking and prioritization driven by pairwise costs or preferences. We combine structural mathematics, exact algorithms and machine-checked proofs to produce results you can examine independently.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/studio/" className="btn bg-white text-navy-900 hover:bg-slate-100">Open the Optimization Studio</Link>
              <Link href="/technology/" className="btn border border-white/25 text-white hover:border-white/60">How it works</Link>
            </div>
            <dl className="mt-12 grid max-w-xl grid-cols-1 gap-5 border-t border-white/10 pt-6 text-sm sm:grid-cols-3 sm:gap-6">
              <div><dt className="text-slate-400">Lean kernel-checked</dt><dd className="mt-1 font-mono text-xl text-white">8 / 8</dd><dd className="text-xs text-slate-500">flagship declarations</dd></div>
              <div><dt className="text-slate-400">Correspondence tests</dt><dd className="mt-1 font-mono text-xl text-white">103 / 103</dd><dd className="text-xs text-slate-500">browser AutoCut vs Lean</dd></div>
              <div><dt className="text-slate-400">Runs in</dt><dd className="mt-1 font-mono text-xl text-white">browser</dd><dd className="text-xs text-slate-500">your data stays local</dd></div>
            </dl>
          </div>
          <HeroDemo />
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto grid max-w-page gap-px bg-line sm:grid-cols-3">
          {capabilities.map(([t, d]) => (
            <div key={t} className="bg-white px-6 py-8 sm:px-8">
              <h2 className="text-base font-semibold text-fog-100">{t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fog-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <Section kicker="The problem" title="Weighted linear ordering"
        intro="Many decisions reduce to putting items in a sequence when each pair of items has a preferred order, and violating it has a cost. Choose the ordering that honours the most total weight.">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="card p-7">
            <p className="text-sm text-fog-400">Given a skew-symmetric matrix <Tex>{"A"}</Tex> with <Tex>{"a_{ij}=-a_{ji}"}</Tex> (the margin by which <Tex>{"i"}</Tex> should precede <Tex>{"j"}</Tex>), find a permutation <Tex>{"\\pi"}</Tex> maximising</p>
            <Tex block>{"F_A(\\pi)=\\sum_{r<s} a_{\\pi_r\\,\\pi_s}."}</Tex>
            <p className="text-sm leading-relaxed text-fog-400">Any pairwise benefit or cost matrix can be written this way exactly, up to a constant. The problem is NP-hard in general (it contains minimum feedback arc set), so practical exact methods rely on structure in the data.</p>
          </div>
          <div className="grid gap-4">
            <FeatureCard title="Pairwise costs and preferences" href="/docs/#model">Benefit matrices, cost matrices, skew-symmetric margins and weighted edge lists are converted exactly. The constant offset is preserved.</FeatureCard>
            <FeatureCard title="When the model applies" href="/applications/">Precedence-dependent costs between all pairs, consensus ranking and tournaments. Adjacency-only changeover costs are a different problem, and we say so.</FeatureCard>
          </div>
        </div>
      </Section>

      <Section muted kicker="Formal verification" title="A verified algorithm, with its limits stated"
        intro="The core structural results, the partition-recovery procedure and the AutoCut algorithm's correctness and running-time bound are proved in Lean 4 with Mathlib. The kernel checks them on every build.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-7">
            <div className="flex flex-wrap gap-2"><EvidenceTag kind="lean" /><EvidenceTag kind="provisional" /></div>
            <p className="mt-5 text-sm text-fog-400">Intrinsic structural parameter:</p>
            <Tex block>{"\\lambda(A)=\\min_{\\mathcal B}\\bigl(b(\\mathcal B)^2+3K_0(\\mathcal B)\\bigr)"}</Tex>
            <p className="text-sm text-fog-400">Proved operation bound for the executable algorithm, in a unit-cost arithmetic model:</p>
            <Tex block>{"T(A)\\le 1{,}728{,}000\\,(n+1)^{18}\\,2^{45(\\lfloor\\sqrt{\\lambda(A)}\\rfloor+1)}"}</Tex>
            <p className="text-sm text-fog-400">so <Tex>{"T(A)=\\operatorname{poly}(n)\\,2^{O(\\sqrt{\\lambda(A)})}"}</Tex>.</p>
          </div>
          <div className="space-y-4">
            <Callout title="What is not established">
              The sharper <Tex>{"P(6\\lambda)^2"}</Tex> runtime expression, bit complexity and a complete memory bound are not formally proved. The cost model&apos;s per-operation charges are declared, not machine-checked against compiled code. Kernel verification does not establish novelty or commercial superiority.
            </Callout>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/formal-verification/" primary>Verification details</ButtonLink>
              <ButtonLink href={RESEARCH_CI} external>Kernel build and axiom audit ↗</ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <Section kicker="Product" title="Westfall Optimization Studio"
        intro="Upload a CSV or JSON file, an edge list or a pasted matrix. Inspect the model, choose a solver and get an ordering with an honest status: optimality established, or feasible solution only.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard kicker="Input" title="Your data, validated">CSV, TSV, JSON and edge lists, with line-level error messages, item naming and an explicit choice of how the numbers are read.</FeatureCard>
          <FeatureCard kicker="Solve" title="Exact or heuristic, clearly labelled">Subset DP (n ≤ 20), exclusion DP (n ≤ 26), the AutoCut structural solver (n ≤ 9) and local search up to 400 items, with cancellation and time limits.</FeatureCard>
          <FeatureCard kicker="Verify & export" title="Results you can check">Exact objective recomputation and exhaustive cross-checks on small instances, plus CSV, JSON and report exports that re-import.</FeatureCard>
        </div>
        <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/studio/" primary>Open the Studio</ButtonLink><ButtonLink href="/docs/">Read the documentation</ButtonLink></div>
      </Section>

      <Section muted kicker="Applications" title="Where weighted ordering appears">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard title="Production sequencing" href="/applications/#manufacturing">Single-machine sequencing objectives with pairwise precedence costs, such as weighted completion time and persistent contamination penalties.</FeatureCard>
          <FeatureCard title="Rank aggregation" href="/applications/#rank-aggregation">Kemeny consensus rankings from judges, voters or models.</FeatureCard>
          <FeatureCard title="Tournaments" href="/applications/#tournaments">Rankings that minimise the total margin of upsets.</FeatureCard>
          <FeatureCard title="Preference ordering" href="/applications/#preferences">Prioritisation from pairwise comparison surveys.</FeatureCard>
        </div>
      </Section>

      <Section kicker="Open research" title="Inspect the mathematics and the code"
        intro="Manuscripts, proofs, solvers, benchmark logs and tests are public. Westfall Optimization is an independent initiative: the work has not been peer reviewed, and no institutional affiliation is claimed.">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard title="Research program" href="/research/">The structural theorem, supporting lemmas, manuscripts and open questions.</FeatureCard>
          <FeatureCard title="Benchmarks" href="/benchmarks/">Measured results with time limits, unsolved cases and their provenance.</FeatureCard>
          <FeatureCard title="Source code" href={REPO} cta="View on GitHub">Python solvers, the browser engine, the job service and the Lean development.</FeatureCard>
        </div>
      </Section>

      <section className="grid-navy text-white">
        <div className="mx-auto flex max-w-page flex-col items-start justify-between gap-6 px-5 py-14 sm:px-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Working on an ordering problem?</h2>
            <p className="mt-2 max-w-xl text-slate-300">Try the Studio on your data, or get in touch about research collaboration, licensing and custom formulations.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/studio/" className="btn bg-white text-navy-900 hover:bg-slate-100">Open the Studio</Link>
            <Link href="/contact/" className="btn border border-white/25 text-white hover:border-white/60">Contact</Link>
          </div>
        </div>
      </section>
    </>
  );
}
