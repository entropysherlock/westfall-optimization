import BenchmarkDashboard from "@/components/BenchmarkDashboard";
import { ButtonLink, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { blob, tree } from "@/lib/site";

export const metadata = { title: "Benchmarks — BLX and theorem prototype" };

const comparison = [
  ["BLX 2.0", "20 / 20", "Reported reference result"],
  ["Packing SLDP", "20 / 20", "Reported reference result"],
  ["AutoCut (022 prototype)", "7 / 20", "Slower on successful cases"],
];

export default function Benchmarks() {
  return <>
    <PageHeader kicker="Benchmark evidence · separate provenance" title="Performance without cherry-picking">
      The historical interactive dashboard below uses Discoveries 018–019
      logs already published in <a className="text-cyan-300 underline" href={tree("benchmarks/data")}>benchmarks/data</a>.
      The Westfall theorem prototype was evaluated separately, and its source/raw
      logs remain unavailable on the public branch.
      <div className="mt-4 flex flex-wrap gap-2"><EvidenceTag kind="observed" /></div>
    </PageHeader>
    <Section kicker="Discovery 022 · source report" title="The partition-free prototype is not the fastest solver"
      intro="These figures are transcribed from the complete original research report. They have not yet been independently regenerated from its original code, so they are separate from the reproducible BLX dashboard.">
      <div className="grid gap-4 md:grid-cols-3">
        {comparison.map(([solver,result,note])=><div key={solver} className="card p-6">
          <p className="font-mono text-xs tracking-widest text-cyan-300">{solver}</p>
          <p className="mt-4 font-mono text-3xl text-fog-100">{result}</p>
          <p className="mt-2 text-xs text-fog-500">{note}</p>
        </div>)}
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-fog-400">All three solvers reportedly agreed on the optimum wherever a result was obtained. AutoCut is an exploratory structural-recognition prototype, not a production implementation. The 20-instance study and the historical BLX benchmark logs have different provenance and must not be combined into an aggregate performance claim.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href={blob("research/discovery-022/WESTFALL_Discovery_022_Report.md")} external primary>Read original full benchmark table ↗</ButtonLink>
        <ButtonLink href="/research/manuscript/">Full manuscript</ButtonLink>
      </div>
    </Section>
    <section className="border-t border-line">
      <div className="mx-auto max-w-page px-5 pt-16 sm:px-8">
        <p className="kicker">Discovery 018–019 · reproducible historical dashboard</p>
        <h2 className="mt-3 text-3xl font-semibold">Earlier BLX benchmark series</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-fog-400">This dashboard is generated from public raw logs with <a className="text-cyan-300 underline" href={blob("scripts/build_site_data.py")}>build_site_data.py</a>. It does not incorporate unreleased AutoCut measurements.</p>
      </div>
      <div className="mx-auto max-w-page px-5 py-10 sm:px-8"><BenchmarkDashboard /></div>
    </section>
  </>;
}
