import { ButtonLink, PageHeader, Section } from "@/components/ui";
import { REPO } from "@/lib/site";

export const metadata = { title: "Research agenda" };
const phases = [
  ["01", "Make the Westfall Structural Optimization Theorem reproducible", "NOW", "The original structural optimization report is now public and an independently written exhaustive reference has been added. Recover earlier research reports and AutoCut source/logs, pin versions and regenerate all reported results."],
  ["02", "Machine-check the mathematical dependency chain", "NEXT", "Preserve the verified structural and correctness proofs, complete the executable complexity analysis, and audit every computational assumption."],
  ["03", "Settle the potential originality", "RESEARCH", "Compare the exact minimization and partition-recognition statement against Fomin–Pilipczuk, Karpinski–Schudy, and structural-width methods, including recent 2026 work."],
  ["04", "Challenge the performance claim", "EVALUATION", "Benchmark BLX, AutoCut, packing SLDP, generic MILP, and a specialized LOP branch-and-cut implementation using matched resources and multiple seeds."],
  ["05", "Publication-quality package", "RELEASE", "Keep the full original manuscript public; prepare a corrected journal-style revision after the Lean and novelty audit. Publish precise theorem-to-code correspondence and reproducible benchmark tables."],
  ["06", "External review and dissemination", "LATER", "Seek specialist review of novelty and significance, then prepare a journal-style manuscript and a complete reproducibility package."],
];
export default function Roadmap() {
 return <>
  <PageHeader kicker="Research agenda · 2026 onward" title="From promising results to defensible mathematics">
    Current priorities are complete formal complexity verification, comparative algorithm evaluation, and independent assessment of the mathematical contribution.
    <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/formal-verification/" primary>Proof-status tracker</ButtonLink><ButtonLink href="/research/discovery-022/">Theorem under review</ButtonLink></div>
  </PageHeader>
  <section className="border-b border-line bg-ink-900/40"><div className="mx-auto max-w-page px-5 py-12 sm:px-8"><p className="kicker">Current focus</p><h2 className="mt-3 text-3xl font-semibold">Theorem correctness. Novelty. Reproducibility.</h2><p className="mt-4 max-w-3xl leading-relaxed text-fog-400">The structural, partition-recovery, and exactness theorems have kernel-checked proofs. Formal verification of the algorithmic running-time bound is unfinished, and competitive performance remains an empirical question.</p></div></section>
  <Section kicker="Action plan" title="The work that actually changes the evidence">
    <div className="space-y-4">{phases.map(([id,title,tag,detail])=><div key={id} className="card grid gap-4 p-6 md:grid-cols-[80px_1fr_150px]"><div className="font-mono text-2xl text-cyan-300">{id}</div><div><h3 className="text-lg font-semibold text-fog-100">{title}</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">{detail}</p></div><div className="font-mono text-xs tracking-wider text-fog-500">{tag}</div></div>)}</div>
  </Section>
  <Section kicker="Supporting infrastructure" title="What is already public">
    <div className="grid gap-4 md:grid-cols-3">
      {[["Working Python portfolio","BLX 2.0, SLDP, subset DP and MILP wrapper are available in the repository."],["Interactive research site","Browser lab, algorithm explainer, and benchmark dashboard; browser DP is not the full Python BLX solver."],["Exact certificate tools","Independent integer checker and browser BigInt implementation for supported BLX certificates; not formal proof."]].map(([title,detail])=><div key={title} className="card p-6"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">{detail}</p></div>)}
    </div>
    <div className="mt-7 flex flex-wrap gap-3"><ButtonLink href={REPO} external primary>GitHub repository ↗</ButtonLink><ButtonLink href="/research/manuscript/">Research manuscript</ButtonLink></div>
  </Section>
  <Section kicker="Research integrity" title="The boundaries of our claims">
    <p className="max-w-3xl leading-relaxed text-fog-400">Formal correctness and algorithmic complexity are separate obligations. The structural and exactness results are kernel-checked; the complete running-time theorem is not. Benchmarks are preliminary without specialized solver baselines. The repository has no selected open-source license yet; public visibility does not automatically authorize redistribution.</p>
  </Section>
 </>;
}
