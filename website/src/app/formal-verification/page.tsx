import { ButtonLink, PageHeader, Section } from "@/components/ui";
import { blob } from "@/lib/site";

export const metadata = { title: "Formal verification" };

const results = [
  ["Exchange localization", "Kernel-checked", "The formal exchange and localization statements are verified for the stated rational skew-symmetric setting."],
  ["Optimal-prefix width bound", "Kernel-checked", "The optimal-ordering prefix bound is established in Lean."],
  ["Relevant-cut counting", "Kernel-checked", "The integer-partition counting argument is formalized."],
  ["Partition recovery: soundness", "Kernel-checked", "An accepted recognition result gives the required structural witness."],
  ["Partition recovery: completeness", "Kernel-checked", "The recognizer accepts instances meeting the structural threshold."],
  ["Partition recovery: minimality", "Kernel-checked", "The recovered partition attains the intrinsic structural minimum."],
  ["Exact optimization correctness", "Kernel-checked", "The specification and deterministic executable are proved to return optimal orderings under the stated hypotheses."],
  ["Full running-time complexity", "Open", "A complete execution-cost and rational bit-complexity analysis has not yet passed the verification requirements."],
];

export default function FormalVerification() {
  return <>
    <PageHeader kicker="Lean formalization" title="Formal verification of structural optimization">
      The verified development covers structural localization, cut counting, partition recovery, and exact optimization correctness. The asymptotic running-time bound remains an open formalization obligation. These results have not yet received independent specialist assessment of novelty.
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="https://github.com/entropysherlock/westfall-optimization/tree/formal/westfall-theorem/lean/" external primary>Inspect Lean formalization ↗</ButtonLink>
        <ButtonLink href="https://github.com/entropysherlock/westfall-optimization/actions/runs/43404862288" external>Kernel build and axiom audit ↗</ButtonLink>
        <ButtonLink href="/research/discovery-022/">Structural theorem</ButtonLink>
      </div>
    </PageHeader>
    <Section kicker="Verification record" title="Seven checked results; one open complexity theorem"
      intro="The research-branch kernel build confirms the seven primary correctness and structural declarations. Executable refinement and supporting partition-growth results are also formalized. The eighth declaration is not claimed as proved.">
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-fog-100"><tr><th className="px-5 py-4">Statement</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Scope</th></tr></thead>
          <tbody>{results.map(([name,status,note])=><tr className="border-t border-line align-top" key={name}><td className="px-5 py-4 font-medium text-fog-100">{name}</td><td className="whitespace-nowrap px-5 py-4 text-cyan-300">{status}</td><td className="px-5 py-4 text-fog-400">{note}</td></tr>)}</tbody>
        </table>
      </div>
    </Section>
    <Section kicker="Reproducibility" title="Source, statements, and independent scrutiny">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-6"><h3 className="font-semibold">Kernel checking</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">Pinned Lean and Mathlib builds check proof terms and standard axiom dependencies. The research branch is separate from the public site&apos;s main branch.</p></div>
        <div className="card p-6"><h3 className="font-semibold">Specification correspondence</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">Documented audits compare formal types and definitions against the manuscript. External mathematical review remains necessary.</p></div>
        <div className="card p-6"><h3 className="font-semibold">Computational complexity</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">Correctness of an executable algorithm does not certify its running time. Arithmetic costs, rational bit lengths, and data-structure overhead must be proved separately.</p></div>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <ButtonLink href="https://github.com/entropysherlock/westfall-optimization/blob/formal/westfall-theorem/lean/FORMALIZATION_STATUS.md" external primary>Full theorem correspondence ↗</ButtonLink>
        <ButtonLink href={blob("docs/formal-verification.md")} external>Verification protocol ↗</ButtonLink>
      </div>
    </Section>
  </>;
}
