import Link from "next/link";
import { ButtonLink, EvidenceTag, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import HeroGraph from "@/components/HeroGraph";
import { loadPresets } from "@/lib/data";
import { REPO } from "@/lib/site";

const milestones = [
  { number: "019", label: "Block localization", detail: "A square-root bound for prefix-state enumeration when an ordered partition is supplied.", status: "Written proof · provisional" },
  { number: "021", label: "Gap-free localization", detail: "An incumbent-independent structural parameter for a supplied partition.", status: "Research report · unreviewed" },
  { number: "022", label: "Westfall Partition Recovery", detail: "A proposed intrinsic parameter and a partition-free exact algorithm based on cut enumeration.", status: "Level 3 candidate · not formalized" },
];

const research = [
  { title: "A structural theory", category: "THEOREM DEVELOPMENT", description: "From block-localized search to a proposed intrinsic parameter: λ(A) = min over ordered partitions of b² + 3K₀.", href: "/research/discovery-022/", label: "Read full proof report" },
  { title: "Proof status, without ambiguity", category: "FORMAL VERIFICATION", description: "Track written arguments, independent checks, exact certificates, and Lean kernel verification as separate forms of evidence.", href: "/formal-verification/", label: "View proof status" },
  { title: "The algorithm in your browser", category: "INTERACTIVE LAB", description: "Explore weighted ordering, compare exact subset DP and exclusion DP, and inspect small-instance behavior.", href: "/lab/", label: "Open the lab" },
];

export default function Home() {
  const presets = loadPresets();
  const hero = presets.find((p) => p.id === "blocks-14-mixed") || presets[0];

  return (
    <>
      <section className="grid-bg relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -right-32 -top-44 h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-60 w-96 rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="relative mx-auto grid max-w-page items-center gap-10 px-5 pb-24 pt-20 sm:px-8 lg:grid-cols-[1.12fr_.88fr] lg:pb-32 lg:pt-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 font-mono text-[11px] tracking-wider text-cyan-300">
              <span className="h-2 w-2 rounded-full bg-cyan-400" /> INDEPENDENT MATHEMATICAL RESEARCH · 2026
            </div>
            <h1 className="mt-8 text-5xl font-semibold leading-[1.01] tracking-[-.065em] text-fog-100 sm:text-6xl lg:text-[75px]">
              Discover the<br /><span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">structure.</span><br />Prove the optimum.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-fog-300">
              WESTFALL OPTIMIZATION studies why hard weighted-ordering problems sometimes admit exact, checkable solutions—and how hidden structure can be discovered algorithmically.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/research/discovery-022/" primary>Explore the Westfall theorem →</ButtonLink>
              <ButtonLink href="/research/manuscript/">Full original manuscript</ButtonLink><ButtonLink href="/lab/">Try the interactive lab</ButtonLink>
            </div>
            <p className="mt-5 max-w-xl text-xs leading-relaxed text-fog-500">
              The Westfall Structural Optimization Theorem (Discovery 022) is provisional, not peer-reviewed or Lean-verified. Its prototype is slower than existing project solvers on the reported benchmark.
            </p>
            <div className="mt-11 grid grid-cols-3 gap-4 border-t border-line pt-7">
              <div><div className="font-mono text-2xl text-fog-100">019→022</div><div className="mt-1 text-xs text-fog-500">Research progression</div></div>
              <div><div className="font-mono text-2xl text-fog-100">2<sup>O(√λ)</sup></div><div className="mt-1 text-xs text-fog-500">Proposed exact bound</div></div>
              <div><div className="font-mono text-2xl text-fog-100">7 / 20</div><div className="mt-1 text-xs text-fog-500">022 prototype benchmark</div></div>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-[28px] border border-cyan-400/20 bg-ink-900/80 p-5 shadow-[0_24px_90px_-30px_rgba(56,189,248,.24)] sm:p-7">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div><p className="font-mono text-[11px] uppercase tracking-widest text-cyan-400">Ordering laboratory</p><p className="mt-1 text-xs text-fog-500">Weighted interaction graph · sample instance</p></div>
                <span className="rounded-full border border-signal-green/30 px-2.5 py-1 font-mono text-[10px] text-signal-green">LIVE DEMO</span>
              </div>
              {hero && <HeroGraph A={hero.matrix} blocks={hero.reference.blocks} />}
              <Link href="/explainer/" className="mt-1 inline-flex text-xs text-cyan-300 hover:underline">How exact exclusion works →</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-ink-900/30">
        <div className="mx-auto grid max-w-page gap-4 px-5 py-7 sm:px-8 md:grid-cols-3">
          <div className="text-sm text-fog-300"><span className="mr-2 text-cyan-400">01 /</span> Mathematical structure, not heuristic hype</div>
          <div className="text-sm text-fog-300"><span className="mr-2 text-cyan-400">02 /</span> Exact certificate checking, independently implemented</div>
          <div className="text-sm text-fog-300"><span className="mr-2 text-cyan-400">03 /</span> Negative benchmarks published alongside successes</div>
        </div>
      </section>

      <Section kicker="The current research frontier" title="Three discoveries. One central question."
        intro="Can an exact algorithm exploit structure it has to find for itself? The research has progressed from supplied blocks to a provisional partition-free result.">
        <div className="grid gap-4 md:grid-cols-3">
          {milestones.map((m, i) => (
            <div key={m.number} className={`card relative overflow-hidden p-6 ${i === 2 ? "border-cyan-400/50 bg-cyan-500/[.06]" : ""}`}>
              <div className="flex items-start justify-between"><span className="font-mono text-xs text-cyan-300">DISCOVERY / {m.number}</span><span className="text-xs text-fog-500">{i === 2 ? "CURRENT" : "FOUNDATION"}</span></div>
              <h3 className="mt-6 text-xl font-semibold text-fog-100">{m.label}</h3>
              <p className="mt-3 min-h-[92px] text-sm leading-relaxed text-fog-400">{m.detail}</p>
              <div className="mt-5 border-t border-line pt-4 font-mono text-[11px] text-fog-500">{m.status}</div>
            </div>
          ))}
        </div>
        <div className="mt-7"><ButtonLink href="/research/" primary>Explore the full research history →</ButtonLink></div>
      </Section>

      <section className="border-y border-line bg-ink-900/50">
        <div className="mx-auto grid max-w-page items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="kicker">Westfall Structural Optimization Theorem · Research 022</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-fog-100 sm:text-4xl">What if the algorithm finds the partition itself?</h2>
            <p className="mt-5 leading-relaxed text-fog-400">The proposed Westfall Partition Recovery Theorem uses a Robust Condorcet parameter that minimizes block size and cross-block disagreement over all ordered partitions. The proposed recognition algorithm searches for a witness without receiving one as input.</p>
            <div className="mt-5 flex flex-wrap gap-2"><EvidenceTag kind="provisional" /><EvidenceTag kind="proved" /></div>
            <p className="mt-3 text-xs text-fog-500">“Proved” means written in the research report. Novelty, complete formal correctness, and practical advantage are not established.</p>
            <div className="mt-7"><ButtonLink href="/research/manuscript/">Read the full provisional manuscript →</ButtonLink></div>
          </div>
          <div className="card p-7">
            <div className="font-mono text-[11px] tracking-widest text-cyan-300">INTRINSIC STRUCTURAL PARAMETER</div>
            <Tex block>{"\\lambda(A)=\\min_{\\mathcal B}(b(\\mathcal B)^2+3K_0(\\mathcal B))"}</Tex>
            <div className="my-5 border-t border-line" />
            <div className="font-mono text-[11px] tracking-widest text-fog-500">PROPOSED PARAMETERIZED ALGORITHM</div>
            <Tex block>{"T(A)=\\operatorname{poly}(n)2^{O(\\sqrt{\\lambda(A)})}"}</Tex>
            <div className="mt-5 rounded-xl border border-signal-amber/25 bg-signal-amber/5 p-3 text-xs leading-relaxed text-fog-400">The algorithm uses prior cut-enumeration ideas of Fomin–Pilipczuk. Recognition of the specific minimizing partition is the possible new contribution; independent novelty is still under review.</div>
          </div>
        </div>
      </section>

      <Section kicker="Explore the platform" title="From theorem to executable evidence."
        intro="Read the mathematics, run the browser laboratory, inspect certificates, and reproduce the software results. Each component says what it does—and what it does not prove.">
        <div className="grid gap-4 lg:grid-cols-3">
          {research.map((item) => (
            <Link key={item.title} href={item.href} className="group card flex flex-col p-6 transition hover:border-cyan-400/50 hover:bg-ink-800">
              <span className="font-mono text-[11px] tracking-widest text-cyan-400">{item.category}</span>
              <h3 className="mt-6 text-xl font-semibold text-fog-100">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-fog-400">{item.description}</p>
              <span className="mt-8 border-t border-line pt-4 text-sm font-medium text-cyan-300">{item.label} →</span>
            </Link>
          ))}
        </div>
      </Section>

      <section className="border-y border-line bg-ink-900/40">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
          <p className="kicker">Reality check</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">No benchmark cherry-picking.</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-fog-400">The research prototype for the Westfall Structural Optimization Theorem proved only 7 of 20 reported instances, versus 20 of 20 for both BLX 2.0 and packing SLDP. It was slower wherever it finished. This is a proposed theoretical contribution, not a claim of state-of-the-art speed.</p>
          <div className="mt-7 flex flex-wrap gap-3"><ButtonLink href="/benchmarks/" primary>BLX benchmark dashboard</ButtonLink><ButtonLink href="/research/discovery-022/">022 experimental details</ButtonLink></div>
        </div>
      </section>

      <Section kicker="Reproducible research" title="Inspect. Reproduce. Challenge."
        intro="Westfall Optimization is an independent initiative. The available software and complete 022 written research report are public, with no claim of peer review, grant funding, or institutional endorsement.">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={REPO} external primary>Explore source on GitHub ↗</ButtonLink>
          <ButtonLink href="/verify/">Verify BLX certificates</ButtonLink>
          <ButtonLink href="/roadmap/">See the validation roadmap</ButtonLink>
        </div>
      </Section>
    </>
  );
}
