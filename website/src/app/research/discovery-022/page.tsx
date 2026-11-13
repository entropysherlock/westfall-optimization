import { ButtonLink, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import { blob } from "@/lib/site";
import Link from "next/link";

export const metadata = { title: "Westfall Structural Optimization Theorem" };
const theorem = [
  ["01", "Optimal-prefix localization", "Every prefix of every optimal order is a λ-cut of the weak-majority digraph."],
  ["02", "Cut counting", "If λ ≤ k, the number of relevant k-cuts is bounded by (n+1)P(3k)."],
  ["03", "Westfall Partition Recovery Theorem", "A shortest-path search over candidate cuts reportedly detects λ ≤ k and recovers a minimizing partition."],
  ["04", "Partition-free algorithm", "Doubling the radius and applying the cut DP gives a claimed poly(n)·2^{O(√λ)} exact algorithm."],
  ["05–06", "Classical comparison and ETH", "The parameter is related to weighted FAST cost, with a claimed ETH-optimal square-root exponent."],
  ["07", "Finding versus certifying", "A band-family example reportedly separates small optimal cut width from a much larger partition parameter."],
];
export default function Discovery022() {
 return <>
  <PageHeader kicker="Westfall Structural Optimization Theorem · Discovery 022" title="Automatic Structural Decomposition for Exact Weighted Linear Ordering">
    The proposed Westfall Structural Optimization Theorem introduces a partition-free parameterized algorithm through the Robust Condorcet number. Its central partition-recognition result is named the Westfall Partition Recovery Theorem. Written arguments and computational tests are available in the supplied research report; the original prototype remains on an unpublished local branch.
    <div className="mt-5 flex flex-wrap gap-2"><EvidenceTag kind="proved"/><EvidenceTag kind="provisional"/></div>
    <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/formal-verification/" primary>Verification status →</ButtonLink><ButtonLink href="/research/">Research archive</ButtonLink><ButtonLink href={blob("papers/discovery-022-research-summary.md")} external>Research summary source ↗</ButtonLink></div>
  </PageHeader>
  <section className="border-b border-line bg-ink-900/40">
    <div className="mx-auto grid max-w-page gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2">
      <div><p className="kicker">The proposed parameter</p><h2 className="mt-3 text-3xl font-semibold">Structure without a supplied partition</h2><p className="mt-4 leading-relaxed text-fog-400">For any ordered partition B, let b be the maximum block size and K₀ its gap-free cross-block localization bound. The proposed invariant minimizes over all such partitions.</p></div>
      <div className="card p-7"><Tex block>{"\\lambda(A)=\\min_{\\mathcal B}(b(\\mathcal B)^2+3K_0(\\mathcal B))"}</Tex><div className="border-t border-line pt-5"><p className="font-mono text-xs tracking-wider text-fog-500">PROPOSED TIME</p><Tex block>{"T(A)=\\operatorname{poly}(n)2^{O(\\sqrt{\\lambda(A)})}"}</Tex></div></div>
    </div>
  </section>
  <Section kicker="Precise claims" title="Seven mathematical statements, one main theorem."
    intro="These are reported in the Discovery 022 manuscript, not yet Lean-kernel-checked. The center of the potential originality claim is the Westfall Partition Recovery Theorem (Theorem 3).">
    <div className="grid gap-4 md:grid-cols-2">{theorem.map(([id,title,body])=><div className="card p-6" key={id}><p className="font-mono text-xs tracking-wider text-cyan-300">THEOREM / {id}</p><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-fog-400">{body}</p></div>)}</div>
  </Section>
  <section className="border-y border-line bg-ink-900/40">
    <div className="mx-auto max-w-page px-5 py-16 sm:px-8"><p className="kicker">Reported empirical evidence</p><h2 className="mt-3 text-3xl font-semibold">Theoretical ambition. Honest performance.</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[[ "650", "small instances checked by Fable", "Zero reported violations; not a machine proof." ],["7/20","AutoCut instances proved", "A state cap and timeout limited the prototype." ],["20/20","BLX 2.0 and packing SLDP", "Both outperformed AutoCut on the reported set." ]].map(([v,h,n])=><div key={h} className="card p-6"><p className="font-mono text-3xl text-fog-100">{v}</p><p className="mt-2 font-semibold">{h}</p><p className="mt-2 text-xs leading-relaxed text-fog-500">{n}</p></div>)}
      </div>
      <p className="mt-5 text-sm text-fog-400">The small certificate sizes reported for successful cases are structural witnesses; they are not polynomial-time proofs of optimality. The code and exact benchmark records are not yet included in the public main branch.</p>
    </div>
  </section>
  <Section kicker="A stronger standard" title="What would confirm the mathematics?">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card p-6"><h3 className="font-semibold">Formal correctness</h3><p className="mt-2 text-sm text-fog-400">Lean definitions, localization, partition discovery, exact DP correctness, and separate asymptotic complexity verification.</p></div>
      <div className="card p-6"><h3 className="font-semibold">Novelty comparison</h3><p className="mt-2 text-sm text-fog-400">Show that recovering a minimum λ-partition is not already a consequence of Fomin–Pilipczuk or newer width-based methods.</p></div>
      <div className="card p-6"><h3 className="font-semibold">Reproducibility</h3><p className="mt-2 text-sm text-fog-400">Publish the exact source, pin dependencies, rerun all experiments, and compare a specialized LOP solver.</p></div>
    </div>
    <p className="mt-6 max-w-3xl text-sm leading-relaxed text-fog-400">The internal Level 3 label is a research classification, not a publication, award, peer-review endorsement, or formal Lean certification. The current public page is an explicit progress report.</p>
    <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/formal-verification/" primary>Formalization program</ButtonLink><ButtonLink href="/roadmap/">Next milestones</ButtonLink></div>
  </Section>
  <Section kicker="Related work" title="The work we build on">
    <div className="flex flex-wrap gap-4 text-sm"><a className="text-cyan-300 underline" href="https://arxiv.org/abs/1301.7314">Fomin–Pilipczuk (cut enumeration) ↗</a><a className="text-cyan-300 underline" href="https://arxiv.org/abs/1006.4396">Karpinski–Schudy (FAST) ↗</a><a className="text-cyan-300 underline" href="https://arxiv.org/abs/2609.19593">Kawashima–Sukegawa (Condorcet decomposition) ↗</a></div>
    <p className="mt-5 text-sm text-fog-400">The cut-DP engine is not original to Westfall Optimization. The intrinsic parameter and Westfall Partition Recovery Theorem are the specific potential novel contributions. <Link className="text-cyan-300 underline" href="/research/">Compare the rest of the literature</Link>.</p>
  </Section>
 </>;
}
