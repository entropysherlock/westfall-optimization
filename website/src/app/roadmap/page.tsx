import { ButtonLink, EvidenceTag, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Open questions and roadmap", description: "Remaining mathematical, verification and engineering questions." };

const questions: [string, string, "open" | "future"][] = [
  ["Is minimum-λ partition recognition new?", "Compare the recognition statement precisely with Fomin–Pilipczuk cut enumeration, Karpinski–Schudy and recent structural-width methods for ordering problems. External specialist review is needed.", "open"],
  ["Can the sharper P(6λ)² bound be verified?", "This needs indexed tables (for example sorted arrays with binary search, or a verified hash map), stored predecessors, and a refinement proof to the verified executable.", "open"],
  ["Bit complexity for rational inputs", "An informal argument suggests every intermediate value has O(L + log n) bits for input size L. Formalizing it would turn the operation bound into a bit-complexity bound.", "open"],
  ["Memory bound", "Table-size lemmas are proved. A space semantics and a complete memory bound are not.", "open"],
  ["Is λ small on real data?", "Measure λ(A) on rank-aggregation, tournament and sequencing data, including LOLIB, to learn where the structural algorithm is practically useful.", "future"],
  ["Matched performance comparison", "Benchmark BLX, AutoCut, packing SLDP, MILP and a specialized LOP branch-and-cut code on identical hardware, time limits and seeds.", "future"],
  ["Faster verified implementation", "Re-engineer AutoCut with indexed state numbering and cached transitions, so that the verified code is also practically fast for n beyond 7.", "future"],
  ["Publication", "Prepare a corrected journal-style manuscript with a precise theorem-to-code correspondence, after the novelty review.", "future"],
];

export default function Roadmap() {
  return (
    <>
      <PageHeader kicker="Open questions" title="What remains to be established">
        The eight flagship declarations are kernel-checked, including an operation-count bound for the executable algorithm. These questions are still open, and we prefer to list them than to leave them implicit.
        <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/formal-verification/" primary>What is verified</ButtonLink><ButtonLink href="/research/theorem/">The theorem</ButtonLink></div>
      </PageHeader>
      <Section kicker="Research agenda" title="Open questions, in priority order">
        <div className="space-y-3">
          {questions.map(([t, d, k], i) => (
            <div key={t} className="card grid gap-3 p-5 md:grid-cols-[48px_1fr_auto] md:items-center">
              <span className="font-mono text-sm text-fog-500">{String(i + 1).padStart(2, "0")}</span>
              <div><h2 className="font-semibold text-fog-100">{t}</h2><p className="mt-1 text-sm leading-relaxed text-fog-400">{d}</p></div>
              <EvidenceTag kind={k} />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
