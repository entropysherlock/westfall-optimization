import Link from "next/link";
import { ButtonLink, Callout, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import { blob, leanBlob } from "@/lib/site";

export const metadata = { title: "Westfall Structural Optimization Theorem", description: "Statements, supporting lemmas, proof outline and verification status of the structural theorem for exact weighted linear ordering." };

const results: [string, string, string, string, "lean" | "proved" | "provisional"][] = [
  ["Theorem 1", "Optimal-prefix localization", "Every prefix S of every optimal ordering satisfies cut_A(S) ≤ λ(A), where cut_A counts weak-majority arcs entering S.", "optimal_prefix_width_bound", "lean"],
  ["Lemma 2", "Cut counting", "If λ(A) ≤ k, the number of k-cuts is at most (n+1)·P(3k), where P(M) = Σ_{j ≤ M} p(j) counts integer partitions.", "cut_count_bound", "lean"],
  ["Theorem 3", "Partition recovery", "A shortest-path search over the reachable cut DAG decides λ(A) ≤ k and returns a partition 𝓑̂ with λ(𝓑̂) = λ(A).", "partition_recovery_sound / _complete / _minimal", "lean"],
  ["Theorem 4", "Partition-free exact algorithm", "Doubling k and solving the cut-restricted DP returns OPT(A), an optimal ordering and a minimizing partition, stopping at k = 1 or k < 2λ(A).", "autoCut_correct", "lean"],
  ["Theorem 4 (time)", "Parameterized running time", "The executable algorithm uses poly(n)·2^{O(√λ(A))} arithmetic operations; explicitly ≤ 1 728 000 (n+1)¹⁸ 2^{45(⌊√λ⌋+1)} in the declared cost model.", "autoCut_complexity", "lean"],
  ["Lemma", "Partition growth", "p(M) ≤ e^{3√M}, hence P(M) ≤ (M+1)·e^{3√M}.", "partition_card_le_exp", "lean"],
  ["Theorems 5–6", "Relation to weighted FAST and ETH", "λ is related to the weighted feedback-arc-set cost, with a claimed ETH-tight square-root exponent.", "—", "provisional"],
  ["Theorem 7", "Finding versus certifying", "A band family is claimed to separate small optimal cut width from a much larger partition parameter.", "—", "provisional"],
];

export default function Theorem() {
  return (
    <>
      <PageHeader kicker="Westfall Structural Optimization Theorem" title="Automatic structural decomposition for exact weighted linear ordering">
        The theorem identifies an intrinsic parameter λ(A) of a weighted ordering instance and gives an algorithm that recovers a partition attaining it and solves the instance exactly, in time subexponential in √λ. Its correctness and its operation-count bound are kernel-checked in Lean. The original manuscript is published in full. Novelty and significance have not been externally reviewed.
        <div className="mt-5 flex flex-wrap gap-2"><EvidenceTag kind="lean" /><EvidenceTag kind="provisional" /></div>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/research/manuscript/" primary>Full manuscript</ButtonLink>
          <ButtonLink href="/formal-verification/">Verification details</ButtonLink>
          <ButtonLink href={blob("papers/discovery-022-research-summary.md")} external>Research summary (source) ↗</ButtonLink>
        </div>
      </PageHeader>

      <Section kicker="Definitions" title="The parameter">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 text-[15px] leading-relaxed text-fog-300">
            <p>For an ordered partition <Tex>{"\\mathcal B=(B_1,\\dots,B_m)"}</Tex>, call a pair <Tex>{"(u,v)"}</Tex> with <Tex>{"u\\in B_i,\\ v\\in B_j,\\ i<j"}</Tex> a cross pair with margin <Tex>{"c_{uv}=a_{uv}"}</Tex>. Write:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><Tex>{"N^-"}</Tex> for the number of negative cross margins and <Tex>{"X"}</Tex> for their total magnitude;</li>
              <li><Tex>{"Z(\\tau)"}</Tex> for the number of cross margins in <Tex>{"[0,\\tau)"}</Tex>.</li>
            </ul>
            <Tex block>{"K_0(\\mathcal B)=\\min_{\\tau\\in(0,\\infty]}\\Bigl(N^-+Z(\\tau)+\\bigl\\lfloor X/\\tau\\bigr\\rfloor\\Bigr),\\qquad \\lambda(A)=\\min_{\\mathcal B}\\bigl(b(\\mathcal B)^2+3K_0(\\mathcal B)\\bigr)."}</Tex>
            <p>Here <Tex>{"b(\\mathcal B)"}</Tex> is the largest block size. The minimum over <Tex>{"\\tau"}</Tex> is attained at <Tex>{"\\tau=\\infty"}</Tex> or at a positive cross margin (proved as <span className="font-mono text-sm">K0_spec</span>).</p>
          </div>
          <div className="card p-7">
            <p className="font-semibold text-fog-100">Main theorem</p>
            <p className="mt-2 text-[15px] leading-relaxed text-fog-300">For every skew-symmetric rational <Tex>{"A"}</Tex>, AutoCut returns <Tex>{"\\mathrm{OPT}(A)=\\max_\\pi F_A(\\pi)"}</Tex>, an optimal ordering, and a partition attaining <Tex>{"\\lambda(A)"}</Tex>, using</p>
            <Tex block>{"T(A)=\\operatorname{poly}(n)\\,2^{O(\\sqrt{\\lambda(A)})}"}</Tex>
            <p className="text-[15px] leading-relaxed text-fog-300">arithmetic operations. It never receives λ(A), a partition, or the optimum as input.</p>
            <p className="mt-3 text-xs text-fog-500">Edge case: for n = 0, λ = 0 and the loop stops at k = 1. The Lean statement therefore reads “k = 1 or k &lt; 2λ(A)”.</p>
          </div>
        </div>
      </Section>

      <Section muted kicker="Supporting lemmas" title="Statements and status">
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="table-clean">
            <thead><tr><th>Result</th><th>Statement</th><th>Lean</th><th>Status</th></tr></thead>
            <tbody>
              {results.map(([id, t, s, lean, k]) => (
                <tr key={id + t}><td className="whitespace-nowrap"><span className="font-semibold text-fog-100">{t}</span><div className="text-xs text-fog-500">{id}</div></td><td>{s}</td><td className="font-mono text-[12.5px]">{lean}</td><td><EvidenceTag kind={k} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section kicker="Proof outline" title="Why the algorithm works">
        <ol className="grid gap-4 md:grid-cols-2">
          {[
            ["Exchange localization", "Sorting an optimal ordering into the blocks of any partition 𝓑 changes the objective by an exchange identity. As a result, cross-block inversions of optimal prefixes are bounded by K₀(𝓑)."],
            ["Width bound", "Combining the exchange bound with the block sizes shows that every optimal prefix has weak-majority cut at most b(𝓑)² + 3K₀(𝓑), for every partition 𝓑. Hence it is at most λ(A)."],
            ["Counting", "Relative to a minimizing partition, every k-cut has few cross-block inversions. Sets with a bounded inversion count are encoded by integer partitions (their gap multisets), which gives at most (n+1)·P(3k) cuts. Partition growth p(M) ≤ e^{3√M} then supplies the subexponential factor."],
            ["Recognition", "Ordered partitions with small K₀ correspond to chains of cuts. A shortest path in the cut DAG, for each threshold τ and block cap b, minimizes b² + 3⌊cost⌋ and reads off the partition."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-6"><p className="font-mono text-xs text-fog-500">Step {i + 1}</p><h3 className="mt-1 font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">{d}</p></li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-fog-500">Full proofs: the <Link className="text-accent-600 underline" href="/research/manuscript/">manuscript</Link> (written arguments) and the <a className="text-accent-600 underline" href={leanBlob("Westfall022/Main.lean")}>Lean development</a> (machine-checked forms).</p>
      </Section>

      <Section muted kicker="Evidence and limitations" title="What has been measured">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-6"><p className="font-mono text-2xl text-fog-100">103 / 103</p><p className="mt-2 font-semibold">Exact on archived instances</p><p className="mt-1 text-sm text-fog-400">The verified executable completed 103 of 119 adversarial instances within 3600 s, all matching an exhaustive oracle. 16 larger cases were not completed.</p></div>
          <div className="card p-6"><p className="font-mono text-2xl text-fog-100">7 / 20</p><p className="mt-2 font-semibold">Original prototype study</p><p className="mt-1 text-sm text-fog-400">In the original report, the AutoCut prototype solved 7 of 20 instances, while BLX 2.0 and packing SLDP solved all 20. The method is a structural contribution, not a speed claim.</p></div>
          <div className="card p-6"><p className="font-mono text-2xl text-fog-100">650</p><p className="mt-2 font-semibold">Small-instance checks (reported)</p><p className="mt-1 text-sm text-fog-400">The original report states zero violations of the theorems on 650 small instances. That is supporting evidence, not proof.</p></div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Callout tone="warn" title="Open">Not established: novelty relative to Fomin–Pilipczuk and to recent width-based methods, the sharper P(6λ)² running-time expression, and bit-level complexity.</Callout>
          <Callout title="Not a performance claim">A small λ makes exact solution possible in principle. The proved constants are large, and practical speed must be measured against specialized solvers. That comparison is still outstanding.</Callout>
        </div>
      </Section>
    </>
  );
}
