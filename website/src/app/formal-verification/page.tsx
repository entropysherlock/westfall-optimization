import { ButtonLink, Callout, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { ResearchStatusTable } from "@/components/ResearchStatus";
import { Tex } from "@/components/Tex";
import { leanBlob, leanTree, RESEARCH_BRANCH, RESEARCH_CI, RESEARCH_COMMIT } from "@/lib/site";

export const metadata = { title: "Formal verification", description: "Eight flagship declarations kernel-checked in Lean 4, with their exact scope and limitations." };

const flagship: [string, string, number, string][] = [
  ["k0_exchange_localization", "Westfall022/Exchange.lean", 266, "For every ordered partition 𝓑, every optimal ordering π* and every prefix S: I_𝓑(S) ≤ R_𝓑(π*) ≤ K₀(𝓑)."],
  ["optimal_prefix_width_bound", "Westfall022/PrefixWidth.lean", 91, "Every prefix of every optimal ordering has weak-majority cut at most λ(A)."],
  ["cut_count_bound", "Westfall022/Counting.lean", 340, "If λ(A) ≤ k, the number of k-cuts is at most (n+1)·P(3k)."],
  ["partition_recovery_sound", "Westfall022/RecoveryThm.lean", 395, "If the recognizer accepts at threshold k with partition 𝓑̂, then λ(𝓑̂) ≤ k."],
  ["partition_recovery_complete", "Westfall022/RecoveryThm.lean", 412, "If λ(A) ≤ k, the recognizer accepts (including its abort rule)."],
  ["partition_recovery_minimal", "Westfall022/RecoveryThm.lean", 426, "The returned partition attains the global minimum: λ(𝓑̂) = λ(A)."],
  ["autoCut_correct", "Westfall022/AutoCut.lean", 148, "AutoCut returns OPT(A), an ordering attaining it, a partition attaining λ(A), and a threshold k with λ(A) ≤ k and (k = 1 or k < 2λ(A))."],
  ["autoCut_complexity", "Westfall022/Complexity.lean", 284, "The executable autoCutC equals autoCutX, and its counted cost is at most 1 728 000 (n+1)¹⁸ 2^{45(⌊√λ(A)⌋+1)}, in a unit-cost arithmetic model."],
];

const supporting: [string, string, string][] = [
  ["autoCutX_correct, autoCutM_eq, autoCutC_eq", "Westfall022/Exec.lean, PartitionCountDP.lean, CostedAutoCut.lean", "Executable refinement chain: the deterministic, memoised and costed programs return identical results for every matrix."],
  ["partition_card_le_exp, Pcum_le_exp", "Westfall022/PartitionGrowth.lean", "p(M) ≤ e^{3√M} and P(M) ≤ (M+1)e^{3√M}, with every analytic step proved from Mathlib."],
  ["recognizeC_cost_le, firstAcceptC_cost_le", "Westfall022/CostBounds.lean, Complexity.lean", "Cost bounds for every round the algorithm attempts (aborted, rejected or accepted)."],
  ["K0_spec", "Westfall022/Thresholds.lean", "The finite threshold set computes the manuscript's minimum over all τ ∈ (0, ∞]."],
];

export default function FormalVerification() {
  return (
    <>
      <PageHeader kicker="Formal verification · Lean 4 + Mathlib" title="Eight flagship declarations, kernel-checked">
        The structural theorem, partition recovery, AutoCut&apos;s correctness and an explicit operation-count bound for its executable implementation are proved in Lean 4 (v4.32.0, pinned Mathlib). The Lean kernel checks them on every build. This page states exactly what that does and does not establish.
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={leanTree()} external primary>Lean source at {RESEARCH_COMMIT.slice(0, 7)} ↗</ButtonLink>
          <ButtonLink href={RESEARCH_CI} external>GitHub Actions kernel build ↗</ButtonLink>
          <ButtonLink href={leanBlob("MISSION_025_REPORT.md")} external>Verification report ↗</ButtonLink>
        </div>
      </PageHeader>

      <Section id="status" kicker="Status of every result" title="What is kernel-checked, what is proved by hand, and what is open"
        intro="One table for the whole program. Only rows marked Lean kernel-checked are machine-verified; ATLAS-032 and the semicomplete and hyperbola-partition work are not.">
        <ResearchStatusTable />
      </Section>

      <Section muted kicker="Flagship declarations" title="Theorem-to-source correspondence"
        intro={<>All links point to the verified commit <span className="font-mono text-base">{RESEARCH_COMMIT.slice(0, 12)}</span> on branch <span className="font-mono text-base">{RESEARCH_BRANCH}</span>. The research branch is separate from this website&apos;s branch.</>}>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="table-clean">
            <thead><tr><th>#</th><th>Lean declaration</th><th>Statement (informal)</th><th>Status</th></tr></thead>
            <tbody>
              {flagship.map(([name, file, line, stmt], i) => (
                <tr key={name}>
                  <td className="font-mono text-fog-500">{i + 1}</td>
                  <td><a className="font-mono text-[13px] text-accent-600 underline" href={`${leanBlob(file)}#L${line}`}>{name}</a><div className="mt-0.5 text-xs text-fog-500">{file}</div></td>
                  <td>{stmt}</td>
                  <td><EvidenceTag kind="lean" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-fog-500">Hypotheses: rational weights, skew-symmetric input (<span className="font-mono">IsSkew A</span>) where the manuscript uses it. Ordered partitions are modelled as block-index functions. The equivalence with genuine ordered partitions, and the other modelling choices, are documented in <a className="text-accent-600 underline" href={leanBlob("FORMALIZATION_STATUS.md")}>FORMALIZATION_STATUS.md</a> and <a className="text-accent-600 underline" href={leanBlob("SEMANTIC_AUDIT_023.md")}>the semantic audit</a>.</p>
      </Section>

      <Section kicker="The eighth theorem" title="The running-time bound and its computation model">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-7">
            <p className="text-sm text-fog-400">For every skew-symmetric rational matrix <Tex>{"A"}</Tex> on <Tex>{"n"}</Tex> items, the costed program&apos;s counted cost satisfies</p>
            <Tex block>{"T(A)\\le 1{,}728{,}000\\,(n+1)^{18}\\,2^{45(\\lfloor\\sqrt{\\lambda(A)}\\rfloor+1)},"}</Tex>
            <p className="text-sm text-fog-400">and therefore <Tex>{"T(A)=\\operatorname{poly}(n)\\,2^{O(\\sqrt{\\lambda(A)})}"}</Tex>. An intermediate form is also proved: <Tex>{"T(A)\\le 1000(n+1)^9\\,(U(n,K)+1)^3"}</Tex> with <Tex>{"K=\\max(1,2\\lambda)"}</Tex> and the closed-form abort bound <Tex>{"U(n,k)\\ge(n+1)P(3k)"}</Tex>.</p>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-fog-300">
            <p><strong className="text-fog-100">Same program.</strong> The algorithm is written once in a step-counting monad. The executable <span className="font-mono text-sm">autoCutC</span> is its value projection, and <span className="font-mono text-sm">autoCutC_eq</span> proves it returns exactly what the verified executable returns.</p>
            <p><strong className="text-fog-100">What is counted.</strong> Every collection operation pays one step per element visited, plus the cost of its callbacks. Duplicate removal is quadratic. Lookups are linear scans; no constant-time lookup is assumed. Leaf operations on a single subset carry explicit polynomial charges. Rational arithmetic is unit cost. Every doubling round is charged: aborted, rejected and accepted.</p>
            <p><strong className="text-fog-100">No oracle.</strong> A mechanical audit confirms the program never evaluates λ(A), OPT, partition counts or classical choice. λ(A) appears only in the analysis.</p>
          </div>
        </div>
      </Section>

      <Section muted kicker="Mandatory qualifications" title="What kernel verification does not establish">
        <div className="grid gap-4 md:grid-cols-2">
          <Callout tone="warn" title="Sharper runtime: not established">The expression <Tex>{"\\operatorname{poly}(n)\\,P(6\\lambda)^2"}</Tex> from the manuscript has not been formally established. The proved exponent comes from linear-scan tables and the closed-form abort bound.</Callout>
          <Callout tone="warn" title="Bit complexity: not established">All arithmetic is counted at unit cost. No bound on the bit length of rational intermediate values is formalized.</Callout>
          <Callout tone="warn" title="Memory: not established">Only table-size lemmas are proved. There is no complete memory bound and no space semantics.</Callout>
          <Callout tone="warn" title="Cost charges: declared, not machine-checked">The per-operation charges are declared upper bounds for list-based finite sets. They are not verified against compiled execution semantics, because Lean has none to verify against.</Callout>
          <Callout title="Novelty and value">Lean verification establishes the stated formal results. It does not establish mathematical novelty, peer acceptance, or practical or commercial superiority over other methods.</Callout>
          <Callout title="The website's solvers">The Studio&apos;s browser solvers are TypeScript programs, not the Lean executable. The AutoCut port is tested for exact output equality with the Lean executable on 103 archived instances; it is not itself formally verified.</Callout>
        </div>
      </Section>

      <Section kicker="Evidence" title="Kernel build and axiom audit">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-6"><h3 className="font-semibold">GitHub Actions</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">The <em>Lean Foundations</em> workflow builds the full development on a clean runner from the pinned toolchain and Mathlib cache. <a className="text-accent-600 underline" href={RESEARCH_CI}>Run 43419080867</a> on commit {RESEARCH_COMMIT.slice(0, 7)} succeeded.</p></div>
          <div className="card p-6"><h3 className="font-semibold">Standard axioms only</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">The workflow&apos;s axiom audit covered 963 declarations under <span className="font-mono">Westfall022</span>, all within <span className="font-mono">propext</span>, <span className="font-mono">Classical.choice</span>, <span className="font-mono">Quot.sound</span>. There is no <span className="font-mono">sorry</span>, <span className="font-mono">admit</span>, <span className="font-mono">native_decide</span> or user axiom.</p></div>
          <div className="card p-6"><h3 className="font-semibold">Correspondence documents</h3><p className="mt-2 text-sm leading-relaxed text-fog-400"><a className="text-accent-600 underline" href={leanBlob("FORMALIZATION_STATUS.md")}>Status and correspondence</a>, <a className="text-accent-600 underline" href={leanBlob("MISSION_025_REPORT.md")}>cost-model report</a>, and <a className="text-accent-600 underline" href={leanBlob("Westfall022/Main.lean")}>Main.lean</a> (68 audited entry points).</p></div>
        </div>
        <h3 className="mt-12 text-lg font-semibold">Supporting declarations</h3>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="table-clean">
            <thead><tr><th>Declarations</th><th>File</th><th>Content</th></tr></thead>
            <tbody>{supporting.map(([d, f, c]) => <tr key={d}><td className="font-mono text-[13px] text-fog-100">{d}</td><td className="text-xs">{f}</td><td>{c}</td></tr>)}</tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
