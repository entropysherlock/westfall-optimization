import { ButtonLink, FeatureCard, PageHeader, Section } from "@/components/ui";
import { REPO } from "@/lib/site";

export const metadata = { title: "About", description: "Westfall Optimization is an independent mathematical research and software initiative founded by Caleb Westfall." };

const principles: [string, string][] = [
  ["State what is proved", "Every claim carries its evidence level: machine-checked, proved on paper, tested, measured or open. Limitations sit next to results, not in footnotes."],
  ["Make results checkable", "Solvers recompute objectives exactly, exact methods are cross-checked on small instances, and proofs, data and code are public."],
  ["Publish the negative results", "Unsolved benchmark cases, slower prototypes and open questions are reported alongside successes."],
  ["Model honestly", "We say when a problem is a weighted linear ordering problem and when it is not, rather than stretching one engine over every scheduling task."],
];

export default function About() {
  return (
    <>
      <PageHeader kicker="About" title="An independent research and software initiative">
        Westfall Optimization was founded by Caleb Westfall to study exact algorithms for ordering problems, and to turn the results into software that people can use and check. It is a small, independent effort, with no institutional affiliation, outside funding or commercial customers to date.
      </PageHeader>
      <Section kicker="Focus" title="Weighted ordering, done rigorously">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4 text-[15px] leading-relaxed text-fog-300">
            <p>The work centres on one classical problem: ordering items so that pairwise preferences or precedence costs are respected as well as possible. It is NP-hard in general, yet many real instances have structure. Our research asks how an exact algorithm can detect that structure and use it, and how far that can be proved.</p>
            <p>The results so far: an intrinsic structural parameter λ(A), an algorithm that recovers a partition attaining it, a correctness proof and an operation-count bound, both kernel-checked in Lean, and the Optimization Studio, which puts exact and heuristic solvers in the browser.</p>
            <p>Research and software are developed with AI-assisted research and programming tools. This is one reason we hold ourselves to machine-checked proofs, exact tests and published limitations as the standard of evidence.</p>
          </div>
          <div className="grid gap-4">
            {principles.map(([t, d]) => <FeatureCard key={t} title={t}>{d}</FeatureCard>)}
          </div>
        </div>
      </Section>
      <Section muted kicker="Status" title="Where things stand">
        <ul className="grid gap-3 text-[15px] text-fog-300 md:grid-cols-2">
          <li className="card p-5"><strong className="text-fog-100">Research:</strong> manuscripts are public and provisional. They have not been peer reviewed, and their novelty has not been independently assessed.</li>
          <li className="card p-5"><strong className="text-fog-100">Formal verification:</strong> eight flagship declarations are kernel-checked, with stated limits on the cost model.</li>
          <li className="card p-5"><strong className="text-fog-100">Software:</strong> the Studio runs publicly in the browser. The job service is implemented and tested but not yet deployed.</li>
          <li className="card p-5"><strong className="text-fog-100">Commercial:</strong> licensing terms have not been set and there are no paid plans. The repository license is pending.</li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/contact/" primary>Contact</ButtonLink><ButtonLink href={REPO} external>GitHub ↗</ButtonLink></div>
      </Section>
    </>
  );
}
