import Link from "next/link";
import { ButtonLink, EvidenceTag, FeatureCard, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import { blob, leanBlob, REPO, tree } from "@/lib/site";
import { InProgressCards } from "@/components/ResearchStatus";
import { atlasCounts } from "@/lib/atlasData";

export const metadata = { title: "Research", description: "A research program in exact weighted linear ordering: structural localization, partition recovery and verified parameterized algorithms." };

const program: [string, string, "lean" | "proved" | "provisional", string][] = [
  ["Block localization with a supplied partition", "Given an ordered partition with largest block b, the prefix states an exact search must keep are bounded by (n+1)·P(2K+b²) (square-root localization).", "provisional", "/research/paper/"],
  ["Exchange localization (gap-free bound K₀)", "For every ordered partition, the cross-block inversions of any optimal prefix are bounded by a computable quantity K₀(𝓑), with no incumbent required.", "lean", "/formal-verification/"],
  ["Intrinsic parameter and optimal-prefix width", "λ(A) = min over 𝓑 of b² + 3K₀ bounds the weak-majority cut of every optimal prefix.", "lean", "/research/theorem/"],
  ["Partition recovery", "A shortest-path search over cut states decides λ(A) ≤ k and recovers a minimizing partition, without a supplied partition.", "lean", "/research/theorem/"],
  ["Verified parameterized algorithm", "AutoCut is correct and runs in poly(n)·2^{O(√λ)} arithmetic operations (unit-cost model; sharper and bit-level bounds open).", "lean", "/formal-verification/"],
];

export default function Research() {
  const ac = atlasCounts();
  return (
    <>
      <PageHeader kicker="Research program" title="Structure and exactness in weighted ordering">
        The central question: when can an exact algorithm for weighted linear ordering discover and exploit hidden structure on its own? The program runs from block-localized search with a supplied partition to an intrinsic structural parameter, an algorithm that recovers it, and machine-checked proofs.
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/research/theorem/" primary>The structural theorem</ButtonLink>
          <ButtonLink href="/research/manuscript/">Full manuscript</ButtonLink>
          <ButtonLink href="/roadmap/">Open questions</ButtonLink>
        </div>
      </PageHeader>

      <Section kicker="Main result (Lean-checked; not peer reviewed)" title="Structural decomposition theorem for weighted linear ordering">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="card p-7 text-[15px] leading-relaxed text-fog-300">
            <p className="font-semibold text-fog-100">Theorem (informal statement of the verified form).</p>
            <p className="mt-2">Let <Tex>{"A"}</Tex> be a skew-symmetric rational matrix on <Tex>{"n"}</Tex> items, and let</p>
            <Tex block>{"\\lambda(A)=\\min_{\\mathcal B}\\bigl(b(\\mathcal B)^2+3K_0(\\mathcal B)\\bigr)."}</Tex>
            <p>There is a deterministic algorithm that receives only <Tex>{"A"}</Tex> and returns (i) the optimum <Tex>{"\\max_\\pi F_A(\\pi)"}</Tex>, (ii) an ordering attaining it, and (iii) an ordered partition <Tex>{"\\hat{\\mathcal B}"}</Tex> with <Tex>{"b(\\hat{\\mathcal B})^2+3K_0(\\hat{\\mathcal B})=\\lambda(A)"}</Tex>. It uses <Tex>{"\\operatorname{poly}(n)\\,2^{O(\\sqrt{\\lambda(A)})}"}</Tex> arithmetic operations.</p>
            <div className="mt-4 flex flex-wrap gap-2"><EvidenceTag kind="lean" /><EvidenceTag kind="provisional" /></div>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-fog-300">
            <p>The proof combines three ingredients. Optimal prefixes are low-width cuts (exchange localization). Low-width cuts are few, which follows from counting integer partitions. A layered shortest-path formulation recognizes the best partition among those cuts.</p>
            <p>The cut-state dynamic program follows Fomin and Pilipczuk. The step under study is recognizing a minimum-λ partition, and its novelty has not been independently assessed.</p>
            <Link href="/research/theorem/" className="inline-block font-semibold text-accent-600 hover:underline">Statements, lemmas and proofs →</Link>
          </div>
        </div>
      </Section>

      <Section muted kicker="Supporting results" title="The development, result by result">
        <div className="space-y-3">
          {program.map(([t, d, k, href], i) => (
            <Link key={t} href={href} className="card grid gap-3 p-5 transition hover:shadow-lift md:grid-cols-[48px_1fr_auto] md:items-center">
              <span className="font-mono text-sm text-fog-500">{String(i + 1).padStart(2, "0")}</span>
              <div><h3 className="font-semibold text-fog-100">{t}</h3><p className="mt-1 text-sm leading-relaxed text-fog-400">{d}</p></div>
              <EvidenceTag kind={k} />
            </Link>
          ))}
        </div>
      </Section>

      <Section id="in-progress" kicker="Research in progress · not established results" title="Proof drafts, conjectures and experimental capabilities"
        intro={<>These items are under active investigation. None is peer reviewed, and none is claimed as a solved problem. In particular, the 2013 Fomin–Pilipczuk question is <strong>not</strong> claimed as answered: the candidate proof is a draft awaiting independent mathematical and literature review, and the Airy asymptotic is an unproved conjecture. The full status of every result is on the <Link className="text-accent-600 underline" href="/formal-verification/#status">verification page</Link>.</>}>
        <InProgressCards />
      </Section>

      <Section muted kicker="Engineering" title="ATLAS-032: the exact solver behind the Studio">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-3 text-[15px] leading-relaxed text-fog-300">
            <p>ATLAS-032 combines strong-component decomposition, a cut-bounded prefix dynamic program and lower bounds from directed-cycle packings (triangles plus longer cycles), and proves its incumbent optimal when no prefix can beat it. These are established techniques from the linear-ordering literature, implemented natively in the browser with exact integer arithmetic.</p>
            <p>On the {ac.E.total}-instance benchmark it proved {ac.E.proved} instances, against {ac.H.proved} for HiGHS with an exact gap, including {ac.Ereal.proved} of {ac.Ereal.total} real LOLIB input–output instances. HiGHS is faster on several families, and {ac.unprovedE.length} dense instances remain unproved.</p>
          </div>
          <div className="flex flex-wrap content-start gap-3">
            <ButtonLink href="/studio/" primary>Try it in the Studio</ButtonLink>
            <ButtonLink href="/benchmarks/#atlas-032">Benchmarks, including losses</ButtonLink>
            <ButtonLink href={blob("benchmarks/atlas-032/NOVELTY.md")}>Novelty audit</ButtonLink>
          </div>
        </div>
      </Section>

      <Section kicker="Publications" title="Manuscripts and technical notes"
        intro="These manuscripts are provisional. They have not been peer reviewed and have not been submitted for publication. The original reports are preserved verbatim as an archival record.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard kicker="Manuscript" title="Automatic structural decomposition for exact weighted linear ordering" href="/research/manuscript/" cta="Read">The full original report of the structural theorem, partition recovery, the cut DP and the experimental study.</FeatureCard>
          <FeatureCard kicker="Manuscript" title="Square-root block localization" href="/research/paper/" cta="Read">The earlier counting bound for block-localized prefix states when a partition is supplied.</FeatureCard>
          <FeatureCard kicker="Manuscript" title="Block-localized exclusion (v1)" href={blob("papers/block-localized-exclusion-v1.md")} cta="Source">Hybrid hereditary bounds and pairwise block certificates: the BLX solver&apos;s foundations.</FeatureCard>
          <FeatureCard kicker="Technical note" title="Formal verification report" href={leanBlob("MISSION_025_REPORT.md")} cta="Read">Cost semantics, the running-time theorem, and an explicit list of what is not established.</FeatureCard>
          <FeatureCard kicker="Technical note" title="Exact certificates" href={blob("docs/certificates.md")} cta="Read">Certificate format and the independent exact-integer checker.</FeatureCard>
          <FeatureCard kicker="Technical note" title="Prior-art audit" href={blob("docs/novelty-audit.md")} cta="Read">A preliminary, targeted comparison with the literature. Not an originality certification.</FeatureCard>
        </div>
      </Section>

      <Section muted kicker="Related literature" title="The work this builds on">
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard title="Fomin & Pilipczuk (2013): subexponential parameterized algorithms on tournaments" href="https://arxiv.org/abs/1301.7314" cta="arXiv">k-cut enumeration and dynamic programming are the direct antecedents of the cut-state engine.</FeatureCard>
          <FeatureCard title="Karpinski & Schudy (2010): faster algorithms for feedback arc set tournament" href="https://arxiv.org/abs/1006.4396" cta="arXiv">Subexponential algorithms and ETH lower bounds for weighted FAST.</FeatureCard>
          <FeatureCard title="Condorcet decompositions" href="https://arxiv.org/abs/2609.19593" cta="arXiv">Perfect and approximate Condorcet decompositions precede this work. The question here is algorithmic recognition under bounded disagreement.</FeatureCard>
          <FeatureCard title="Martí & Reinelt (2011): The Linear Ordering Problem">The standard monograph on exact and heuristic methods: branch-and-cut, LOLIB benchmarks and metaheuristics. A matched comparison with a specialized LOP solver is still outstanding.</FeatureCard>
        </div>
      </Section>

      <Section kicker="Reproducibility" title="Everything needed to check the work">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard title="Lean development" href={leanBlob("FORMALIZATION_STATUS.md")} cta="Status & correspondence">Pinned toolchain, axiom audit and a theorem-to-manuscript table.</FeatureCard>
          <FeatureCard title="Solvers and tests" href={tree("src/westfall_optimization")} cta="Python package">BLX 2.0, exact DP, MILP, certificates, with tests run in CI.</FeatureCard>
          <FeatureCard title="Original research records" href={tree("research")} cta="Archive">Historical reports, original code and the exact small-instance reference checker.</FeatureCard>
        </div>
        <p className="mt-6 text-sm text-fog-500">Historical file names keep their original research numbering so that the archival record stays reproducible. <a className="text-accent-600 underline" href={REPO}>Repository</a>.</p>
      </Section>
    </>
  );
}
