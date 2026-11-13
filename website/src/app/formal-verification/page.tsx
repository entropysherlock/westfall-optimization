import { ButtonLink, PageHeader, Section } from "@/components/ui";
import { blob } from "@/lib/site";

export const metadata = { title: "Formal verification status" };

const proofs = [
  ["Definitions: finite weighted ordering, cuts and partitions", "Planned", "Lean formalization has been started in a separate Colab workflow; no build log or proof artifact is publicly committed."],
  ["Discovery 021: weighted exchange / K₀ localization", "Not verified", "Written mathematical argument; needs formalization before it can support the headline result."],
  ["Discovery 022 Theorem 1: optimal-prefix width", "Not verified", "The core inequality should be proven with the exact report definitions."],
  ["Discovery 022 Lemma 2: cut counting", "Not verified", "Requires a formal proof of the integer-partition counting result."],
  ["Discovery 022 Theorem 3: minimum-partition recovery", "Not verified", "This is the flagship potential novelty claim and highest-priority kernel proof."],
  ["Discovery 022 Theorem 4: AutoCut exactness", "Not verified", "Must refer to the real algorithm, not an unrestricted brute-force substitute."],
  ["Discovery 022: parameterized runtime bound", "Not verified", "Must separately formalize state-count and asymptotic complexity; exactness alone is insufficient."],
  ["ETH lower bound", "Not verified", "Requires a precise reduction and computational-complexity formalization or a clearly documented external theorem assumption."],
];

export default function FormalVerification() {
 return <>
  <PageHeader kicker="Research integrity · Lean 4" title="Proof status, claim by claim">
    A written proof, small-instance tests, an integer certificate checker, and a Lean kernel proof are different kinds of evidence. This page keeps them separate. There is currently <strong>no publicly confirmed Lean verification of the Discovery 022 flagship theorem.</strong>
    <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/research/discovery-022/" primary>Discovery 022 theorem →</ButtonLink><ButtonLink href={blob("docs/formal-verification.md")} external>Verification protocol ↗</ButtonLink></div>
  </PageHeader>
  <section className="border-b border-line bg-ink-900/40">
    <div className="mx-auto grid max-w-page gap-4 px-5 py-12 sm:px-8 sm:grid-cols-3">
      {[["0","022 flagship theorems kernel-verified"],["8","proof obligations tracked"],["1","critical recognition theorem"]].map(([v,k])=><div className="card p-6" key={k}><div className="font-mono text-4xl text-fog-100">{v}</div><div className="mt-2 text-sm text-fog-400">{k}</div></div>)}
    </div>
  </section>
  <Section kicker="Formalization backlog" title="A proof means the complete statement">
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead className="bg-ink-800 text-fog-100"><tr><th className="px-5 py-4">Obligation</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">What remains</th></tr></thead>
        <tbody>{proofs.map(([name,status,note])=><tr className="border-t border-line align-top" key={name}><td className="px-5 py-4 font-medium text-fog-100">{name}</td><td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-signal-amber">{status}</td><td className="px-5 py-4 text-fog-400">{note}</td></tr>)}</tbody>
      </table>
    </div>
  </Section>
  <Section kicker="What counts" title="Requirements for a verified theorem">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-6"><h3 className="font-semibold text-fog-100">Statement correspondence</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">Every Lean theorem must express the original manuscript statement, including the exact K₀ floor, all quantifiers, and the computational model. A weaker or differently defined result does not count.</p></div>
      <div className="card p-6"><h3 className="font-semibold text-fog-100">Trusted-kernel audit</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">Clean pinned build, independent rechecking, no sorry/admit, no unreviewed custom axioms, and inspected #print axioms output. Compile success alone is not sufficient.</p></div>
      <div className="card p-6"><h3 className="font-semibold text-fog-100">Complexity is a separate proof</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">Even a kernel-verified exact algorithm could have exponential runtime in n. The claimed square-root exponential dependence on λ needs its own checked derivation.</p></div>
      <div className="card p-6"><h3 className="font-semibold text-fog-100">Novelty remains separate</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">Lean can establish logical correctness under stated assumptions, not whether a result was published earlier or deserves a journal publication.</p></div>
    </div>
  </Section>
  <Section kicker="Existing certificate checker" title="What already works">
    <p className="max-w-3xl leading-relaxed text-fog-400">The public BLX solver generates exact arithmetic optimality certificates, and a separate Python verifier and browser BigInt implementation can inspect supported certificates. This is valuable computational evidence, but it is not Lean verification of Discovery 022.</p>
    <div className="mt-7 flex flex-wrap gap-3"><ButtonLink href="/verify/" primary>Try the certificate checker</ButtonLink><ButtonLink href="/roadmap/">Roadmap and research priorities</ButtonLink></div>
  </Section>
 </>;
}
