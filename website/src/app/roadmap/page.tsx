import { ButtonLink, PageHeader, Section } from "@/components/ui";
import { blob, REPO } from "@/lib/site";

export const metadata = { title: "Roadmap & grant readiness" };
const phases = [
  ["01", "Make the Westfall Structural Optimization Theorem reproducible", "NOW", "The full original 022 report is now public and an independently written exhaustive reference has been added. Recover the original 021 report and AutoCut source/logs, pin versions and regenerate all reported results."],
  ["02", "Machine-check the mathematical dependency chain", "NEXT", "Formalize the actual exchange lemma, prefix localization, cut counting, partition recognition and exactness. Audit all axioms and prove complexity separately."],
  ["03", "Settle the potential originality", "RESEARCH", "Compare the exact minimization and partition-recognition statement against Fomin–Pilipczuk, Karpinski–Schudy, and structural-width methods, including recent 2026 work."],
  ["04", "Challenge the performance claim", "EVALUATION", "Benchmark BLX, AutoCut, packing SLDP, generic MILP, and a specialized LOP branch-and-cut implementation using matched resources and multiple seeds."],
  ["05", "Publication-quality package", "RELEASE", "Keep the full original manuscript public; prepare a corrected journal-style revision after the Lean and novelty audit. Publish precise theorem-to-code correspondence and reproducible benchmark tables."],
  ["06", "Grant submission strategy", "WHEN APPROPRIATE", "Keep this initiative distinct from the submitted ProofScope proposal. Decide on a separate funding application after the first response and an updated evidence review."],
];
export default function Roadmap() {
 return <>
  <PageHeader kicker="Research agenda · 2026 onward" title="From promising results to defensible mathematics">
    The next release is about scientific credibility, not cosmetic features. Westfall Optimization remains an unfunded independent research initiative; a separate ProofScope grant application has been submitted, but this project has not received funding.
    <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/formal-verification/" primary>Proof-status tracker</ButtonLink><ButtonLink href="/research/discovery-022/">Theorem under review</ButtonLink></div>
  </PageHeader>
  <section className="border-b border-line bg-ink-900/40"><div className="mx-auto max-w-page px-5 py-12 sm:px-8"><p className="kicker">Current focus</p><h2 className="mt-3 text-3xl font-semibold">Theorem correctness. Novelty. Reproducibility.</h2><p className="mt-4 max-w-3xl leading-relaxed text-fog-400">The Westfall Structural Optimization Theorem (Discovery 022) is a provisional Level 3 candidate. The original AutoCut prototype solved 7/20 benchmark instances, while existing BLX 2.0 and packing SLDP each solved 20/20. We are not claiming a practical speed breakthrough.</p></div></section>
  <Section kicker="Action plan" title="The work that actually changes the evidence">
    <div className="space-y-4">{phases.map(([id,title,tag,detail])=><div key={id} className="card grid gap-4 p-6 md:grid-cols-[80px_1fr_150px]"><div className="font-mono text-2xl text-cyan-300">{id}</div><div><h3 className="text-lg font-semibold text-fog-100">{title}</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">{detail}</p></div><div className="font-mono text-xs tracking-wider text-fog-500">{tag}</div></div>)}</div>
  </Section>
  <Section kicker="Supporting infrastructure" title="What is already public">
    <div className="grid gap-4 md:grid-cols-3">
      {[["Working Python portfolio","BLX 2.0, SLDP, subset DP and MILP wrapper are available in the repository."],["Interactive research site","Browser lab, algorithm explainer, and benchmark dashboard; browser DP is not the full Python BLX solver."],["Exact certificate tools","Independent integer checker and browser BigInt implementation for supported BLX certificates; not formal proof."]].map(([title,detail])=><div key={title} className="card p-6"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">{detail}</p></div>)}
    </div>
    <div className="mt-7 flex flex-wrap gap-3"><ButtonLink href={REPO} external primary>GitHub repository ↗</ButtonLink><ButtonLink href={blob("docs/grant-application-draft.md")} external>Unsubmitted grant draft ↗</ButtonLink></div>
  </Section>
  <Section kicker="Research integrity" title="The boundaries of our claims">
    <p className="max-w-3xl leading-relaxed text-fog-400">Our internal Level 3 scale does not represent external endorsement. Written proofs are not machine-verified unless the exact theorem has passed a trusted kernel. Benchmarks are preliminary without specialized solver baselines. The repository has no selected open-source license yet; public visibility does not automatically authorize redistribution.</p>
  </Section>
 </>;
}
