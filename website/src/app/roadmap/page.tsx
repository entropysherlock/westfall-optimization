import { ButtonLink, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { blob } from "@/lib/site";

export const metadata = { title: "Research Roadmap & Funding" };

const milestones: [string, string, string, string[]][] = [
  ["M1", "Independent mathematical review", "Months 0–6",
    ["External reading of the square-root block-localization proof by specialists in parameterized algorithms",
      "Public errata log; every correction versioned in the repository",
      "Decision point: submit to a peer-reviewed venue, or revise"]],
  ["M2", "Formalization pilot", "Months 3–12",
    ["Lean 4 formalization of the counting lemma Σaᵢxᵢ ≤ b² + I and the partition bound",
      "Clearly separated from the existing exact (integer) certificate checker, which is not a formal proof"]],
  ["M3", "Fast, reproducible implementation", "Months 3–12",
    ["Compiled (Rust or C++) exclusion-DP core with identical certificate format",
      "Head-to-head benchmarks against a specialised LOP branch-and-cut solver, not only generic MILP",
      "Pinned environments and published raw logs for every run"]],
  ["M4", "Wider benchmark coverage", "Months 6–18",
    ["Full LOLIB and xLOLIB suites with documented time limits",
      "Instance-family analysis: when do block parameters (b, K) stay small in practice?",
      "Negative results published alongside positive ones"]],
  ["M5", "Open problems", "Months 12–24",
    ["Close or explain the gap between the 2^{O(b+√K)} bound and known lower bounds",
      "Automatic block discovery with provable guarantees",
      "Extensions to weighted feedback arc set variants beyond tournaments"]],
];

const opportunities: [string, string][] = [
  ["Government science-foundation programs (e.g. U.S. NSF CISE / Algorithmic Foundations)", "Normally require an eligible host institution; realistic only through a collaborating university PI. Eligibility not yet confirmed."],
  ["Private foundations supporting mathematics and theoretical computer science", "Many fund through institutions or by invitation; check current calls and individual-applicant rules."],
  ["Fast, small grants for independent researchers", "Some programs fund individuals directly with short applications; fit and current availability to be confirmed."],
  ["Open-source software funds (e.g. NLnet / NGI-style programs)", "Relevant to the reproducible solver and verifier (M3), not to the theory alone; regional eligibility rules apply."],
  ["Cloud-compute research credit programs", "Could cover benchmark runs (M4); credits are not cash funding."],
  ["Industry research gifts or collaborations (operations research, scheduling, ranking)", "Requires a concrete use case and usually an institutional partner."],
  ["Formal-methods and proof-assistant community funding", "Relevant to M2 (Lean formalization)."],
  ["Community sponsorship (GitHub Sponsors, Open Collective)", "Small, unrestricted support for maintenance; not set up yet."],
];

export default function Roadmap() {
  return (
    <>
      <PageHeader kicker="Research roadmap & funding" title="What exists, what is unproven, and what support would change">
        Westfall Optimization is an independent research initiative led by Caleb Westfall. It is not a company, institute, or university
        group, and it has received no funding. This page sets out the plan and the kinds of support being explored.
      </PageHeader>

      <Section kicker="Mission" title="Exact optimization you can check">
        <p className="max-w-3xl text-lg leading-relaxed text-fog-400">
          Build exact algorithms for ordering problems (the weighted linear ordering problem and feedback arc set in tournaments) whose answers
          arrive with a certificate that anyone can re-check with integer arithmetic — and be explicit about where the methods do and do not help.
        </p>
      </Section>

      <Section kicker="Current state" title="What has been achieved so far">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <div className="flex flex-wrap gap-2"><EvidenceTag kind="provisional" /></div>
            <p className="mt-3 text-fog-300">A square-root block-localization theorem bounding the exclusion-DP state count by (n+1)·P(2K+b²), giving poly(n)·2<sup>O(b+√K)</sup>,
              with a matching necessity result for the zero-weight term. Proved in an internal manuscript; not peer-reviewed. Level 3 is the initiative&apos;s own
              internal classification, not an external endorsement.</p>
          </div>
          <div className="card p-6">
            <div className="flex flex-wrap gap-2"><EvidenceTag kind="tested" /></div>
            <p className="mt-3 text-fog-300">An open-source Python implementation (BLX 2.0 portfolio) and an exact integer certificate verifier with tamper and input-binding tests,
              plus a browser re-implementation of the verifier. Checked by unit tests against brute force; this is not Lean-style formal verification.</p>
          </div>
          <div className="card p-6">
            <div className="flex flex-wrap gap-2"><EvidenceTag kind="observed" /></div>
            <p className="mt-3 text-fog-300">On structured synthetic families BLX can prove optimality where a 60 s generic MILP did not; on many LOLIB instances generic MILP is faster.
              BLX is not a universally faster solver. See the <a className="text-cyan-300 underline" href="../benchmarks/">benchmark dashboard</a>.</p>
          </div>
          <div className="card p-6">
            <div className="flex flex-wrap gap-2"><EvidenceTag kind="future" /></div>
            <p className="mt-3 text-fog-300">Novelty relative to prior work (Karpinski–Schudy, Feige, Stein–Andres, Akbari–Escobedo and others) still needs independent expert assessment.
              The prior-art comparison on the research page is the initiative&apos;s own reading.</p>
          </div>
        </div>
      </Section>

      <Section kicker="Why it matters" title="Ordering problems are everywhere; certified answers are rare">
        <p className="max-w-3xl text-lg leading-relaxed text-fog-400">
          Ranking aggregation, scheduling with precedence preferences, input–output table triangulation and tournament analysis all reduce to
          ordering problems that are NP-hard in general. Parameterized bounds explain <em>which</em> instances are tractable, and exact certificates
          let a user trust an optimum without trusting the solver.
        </p>
      </Section>

      <Section kicker="Plan" title="Deliverables and milestones">
        <div className="space-y-4">
          {milestones.map(([id, title, when, items]) => (
            <div key={id} className="card grid gap-4 p-6 md:grid-cols-[120px_1fr]">
              <div><p className="font-mono text-cyan-300">{id}</p><p className="font-mono text-xs text-fog-500">{when}</p></div>
              <div>
                <p className="font-semibold text-fog-100">{title}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fog-400">{items.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-fog-500">Timelines are planning estimates and depend on support that has not been secured.</p>
      </Section>

      <Section kicker="Funding" title="Kinds of support being explored" intro="No application has been submitted and no funding has been awarded. Eligibility for each category below still has to be checked against current calls.">
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map(([t, d]) => (
            <div key={t} className="card p-5"><p className="font-semibold text-fog-100">{t}</p><p className="mt-2 text-sm text-fog-400">{d}</p></div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={blob("docs/grant-application-draft.md")} external primary>Read the grant-application draft ↗</ButtonLink>
          <ButtonLink href="/research/">Research portal</ButtonLink>
        </div>
      </Section>

      <Section kicker="Integrity" title="Commitments">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-fog-400">
          <li>Every benchmark figure is generated from raw logs in the repository; unfavorable results are published alongside favorable ones.</li>
          <li>Unreviewed results are labeled provisional. No publication, citation, endorsement, partnership or award is claimed.</li>
          <li>Exact certificate checking is described as what it is — integer re-verification of a bound — and not as formal proof.</li>
          <li>The software license is pending and has not been chosen; until it is, no rights beyond viewing are granted.</li>
        </ul>
      </Section>
    </>
  );
}
