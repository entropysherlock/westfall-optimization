import Link from "next/link";
import { ButtonLink, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import { blob } from "@/lib/site";

export const metadata = { title: "Research & discoveries" };

const timeline = [
  ["014–017", "Foundations", "Local certificates, core-face lifting, symmetry-reduced DP, and self-localizing exclusion."],
  ["018", "BLX 1.0", "Hybrid hereditary bounds and block-localized exclusion; early benchmarks exposed weaknesses on LOLIB."],
  ["019", "Square-root localization", "Supplied-partition counting bound |S_K| ≤ (n+1)P(2K+b²)."],
  ["021", "Gap-free localization", "Computable K₀ for a supplied partition. Manuscript and code reported on a local branch."],
  ["022", "Partition-free candidate", "Intrinsic λ and proposed exact recognition of a minimizing partition; internal Level 3 candidate."],
];
export default function Research() {
  return <>
    <PageHeader kicker="Research archive · 2026" title="A research program in exact ordering">
      A transparent record of theorems, algorithms, falsified ideas, and computational evidence. Current theoretical flagship: Discovery 022 (provisional, not machine-verified).
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/research/discovery-022/" primary>Discovery 022 →</ButtonLink>
        <ButtonLink href="/research/paper/">Discovery 019 manuscript</ButtonLink>
        <ButtonLink href="/formal-verification/">Formal proof tracker</ButtonLink>
      </div>
    </PageHeader>
    <Section kicker="The mathematical problem" title="Weighted linear ordering">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-7">
          <p className="text-fog-400">For a skew-symmetric weight matrix A, choose a permutation π maximizing:</p>
          <Tex block>{"F_A(\\pi)=\\sum_{r<s}a_{\\pi_r\\pi_s}"}</Tex>
          <p className="mt-4 text-sm leading-relaxed text-fog-400">Applications include rank aggregation and tournament feedback arc set. Solving generally is NP-hard. The research concerns exact parameterized algorithms for structurally favorable families.</p>
        </div>
        <div className="card p-7">
          <p className="font-mono text-xs text-cyan-300">CURRENT RESEARCH QUESTION</p>
          <h3 className="mt-4 text-xl font-semibold">Can the method recover its own structure?</h3>
          <p className="mt-3 text-sm leading-relaxed text-fog-400">Discovery 019 needs a supplied ordered partition. Discovery 022 proposes that the optimal partition witness for a specific structural parameter can itself be recovered in subexponential parameterized time.</p>
          <Link href="/research/discovery-022/" className="mt-6 inline-block text-sm text-cyan-300 hover:underline">Read the formal statements →</Link>
        </div>
      </div>
    </Section>
    <section className="border-y border-line bg-ink-900/40">
      <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
        <p className="kicker">Research timeline</p>
        <h2 className="mt-3 text-3xl font-semibold">What changed between the discoveries</h2>
        <div className="mt-9 grid gap-4">
          {timeline.map(([number,title,detail],i)=><div key={number} className={`card grid gap-3 p-6 md:grid-cols-[100px_1fr_auto] md:items-center ${i===4?"border-cyan-400/50":""}`}>
            <span className="font-mono text-lg text-cyan-300">{number}</span>
            <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-fog-400">{detail}</p></div>
            {i===4?<Link href="/research/discovery-022/" className="text-sm text-cyan-300">Read report →</Link>:null}
          </div>)}
        </div>
      </div>
    </section>
    <Section kicker="Theory" title="Two distinct guarantees">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-7">
          <div className="flex flex-wrap gap-2"><EvidenceTag kind="proved"/><EvidenceTag kind="provisional"/></div>
          <h3 className="mt-4 text-xl font-semibold">Discovery 019 · supplied partition</h3>
          <Tex block>{"|\\mathcal S_K|\\le(n+1)P(2K+b^2)"}</Tex>
          <p className="mt-3 text-sm text-fog-400">The square-root counting bound for block-localized prefix states. The manuscript is public; specialist novelty review remains outstanding.</p>
          <Link href="/research/paper/" className="mt-5 inline-block text-sm text-cyan-300">Read the existing manuscript →</Link>
        </div>
        <div className="card border-cyan-400/30 p-7">
          <div className="flex flex-wrap gap-2"><EvidenceTag kind="proved"/><EvidenceTag kind="provisional"/></div>
          <h3 className="mt-4 text-xl font-semibold">Discovery 022 · partition-free candidate</h3>
          <Tex block>{"T(A)=\\operatorname{poly}(n)2^{O(\\sqrt{\\lambda(A)})}"}</Tex>
          <p className="mt-3 text-sm text-fog-400">A reported recognition procedure computes λ and a minimizing partition. The written proof and small-instance tests are promising; no verified Lean implementation or specialist novelty decision exists.</p>
          <Link href="/research/discovery-022/" className="mt-5 inline-block text-sm text-cyan-300">Examine Theorems 1–7 →</Link>
        </div>
      </div>
    </Section>
    <Section kicker="Prior work" title="What we did not invent"
      intro="Our proposed cut-state engine builds on existing literature. Naming a new parameter does not by itself demonstrate originality.">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6"><h3 className="font-semibold">Fomin & Pilipczuk (2013)</h3><p className="mt-2 text-sm text-fog-400">k-cut enumeration and dynamic programming form the existing engine of the Discovery 022 algorithm.</p><a className="mt-4 inline-block text-sm text-cyan-300" href="https://arxiv.org/abs/1301.7314">Read paper ↗</a></div>
        <div className="card p-6"><h3 className="font-semibold">Karpinski & Schudy (2010)</h3><p className="mt-2 text-sm text-fog-400">Subexponential algorithms and ETH lower bounds for weighted tournament feedback arc set are classical predecessors.</p><a className="mt-4 inline-block text-sm text-cyan-300" href="https://arxiv.org/abs/1006.4396">Read paper ↗</a></div>
        <div className="card p-6"><h3 className="font-semibold">Condorcet decomposition literature</h3><p className="mt-2 text-sm text-fog-400">Perfect and approximate decompositions precede this project. The proposed new point is algorithmic recognition under bounded disagreement.</p><a className="mt-4 inline-block text-sm text-cyan-300" href="https://arxiv.org/abs/2609.19593">Recent comparison ↗</a></div>
        <div className="card p-6"><h3 className="font-semibold">Width and ordering frameworks</h3><p className="mt-2 text-sm text-fog-400">2026 work on structural width for ordering problems needs careful comparison before claiming novelty.</p><Link href="/research/discovery-022/" className="mt-4 inline-block text-sm text-cyan-300">Our outstanding questions →</Link></div>
      </div>
    </Section>
    <Section kicker="Open record" title="The code and the limits">
      <p className="max-w-3xl leading-relaxed text-fog-400">BLX 2.0 and its exact certificate checker are public. The 021 and 022 experiments were reported on a local branch and were not part of the initial public release; the current research summary is not a substitute for their executable source files.</p>
      <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href={blob("papers/square-root-block-localization-v2.md")} external>019 proof source ↗</ButtonLink><ButtonLink href="/benchmarks/">Benchmarks</ButtonLink><ButtonLink href="/formal-verification/">What Lean has verified</ButtonLink></div>
    </Section>
  </>;
}
