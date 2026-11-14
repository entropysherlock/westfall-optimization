import Link from "next/link";
import { ButtonLink, Callout, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";

export const metadata = { title: "Technology", description: "Weighted linear ordering, exact optimization, structural decomposition, the parameter λ(A), parameterized complexity and verification." };

const status: [string, "lean" | "proved" | "tested" | "observed" | "open", string][] = [
  ["Every prefix of every optimal ordering is a λ(A)-cut of the weak-majority digraph", "lean", "Kernel-checked (optimal_prefix_width_bound)."],
  ["If λ(A) ≤ k, there are at most (n+1)·P(3k) relevant k-cuts", "lean", "Kernel-checked (cut_count_bound); P is the cumulative partition count."],
  ["The recognizer is sound, complete and returns a partition attaining λ(A)", "lean", "Kernel-checked (partition_recovery_sound / complete / minimal)."],
  ["AutoCut returns OPT(A), an optimal ordering and a minimizing partition", "lean", "Kernel-checked (autoCut_correct) for skew-symmetric rational input."],
  ["AutoCut runs in poly(n)·2^{O(√λ(A))} arithmetic operations", "lean", "Kernel-checked (autoCut_complexity) in a declared unit-cost model. Bit complexity is not covered."],
  ["The sharper bound poly(n)·P(6λ)²", "open", "Not established. The verified implementation scans tables linearly."],
  ["The browser AutoCut port equals the Lean executable", "tested", "Exact output equality on 103 archived instances. The port itself is not formally verified."],
  ["Recognizing a minimum-λ partition is new relative to prior cut-DP methods", "open", "Novelty has not been independently assessed."],
];

export default function Technology() {
  return (
    <>
      <PageHeader kicker="Technology" title="Exact algorithms that exploit structure">
        Our solvers address one mathematical problem, weighted linear ordering, with methods that range from exhaustive dynamic programming to structural decomposition. Each method states what it guarantees, and we keep proved statements separate from tested ones and from open questions.
      </PageHeader>

      <Section id="wlo" kicker="1 · The problem" title="Weighted linear ordering and pairwise matrices">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 text-[15px] leading-relaxed text-fog-300">
            <p>Each pair of items <Tex>{"i, j"}</Tex> carries a margin <Tex>{"a_{ij}"}</Tex>: how much better it is to place <Tex>{"i"}</Tex> before <Tex>{"j"}</Tex>. Margins are skew-symmetric, <Tex>{"a_{ij}=-a_{ji}"}</Tex>. An ordering <Tex>{"\\pi"}</Tex> scores</p>
            <Tex block>{"F_A(\\pi)=\\sum_{r<s} a_{\\pi_r\\pi_s},\\qquad \\beta_A(\\pi)=\\tfrac12\\bigl(W(A)-F_A(\\pi)\\bigr)\\ge 0,"}</Tex>
            <p>where <Tex>{"W(A)=\\sum_{i<j}|a_{ij}|"}</Tex> and <Tex>{"\\beta_A"}</Tex> is the backward (disagreement) weight. Maximising <Tex>{"F_A"}</Tex> is the same as minimising the weighted feedback arc set <Tex>{"\\beta_A"}</Tex>.</p>
          </div>
          <div className="card p-6 text-[15px] leading-relaxed text-fog-300">
            <p className="font-semibold text-fog-100">General pairwise data</p>
            <p className="mt-2">A benefit matrix <Tex>{"C"}</Tex> (<Tex>{"c_{ij}"}</Tex> gained when <Tex>{"i"}</Tex> precedes <Tex>{"j"}</Tex>) need not be skew-symmetric. With <Tex>{"A=C-C^{\\top}"}</Tex> and <Tex>{"S=\\sum_{i\\ne j}c_{ij}"}</Tex>, every ordering satisfies</p>
            <Tex block>{"\\sum_{r<s}c_{\\pi_r\\pi_s}=\\tfrac12\\bigl(F_A(\\pi)+S\\bigr)."}</Tex>
            <p>For a cost matrix <Tex>{"D"}</Tex> (minimised), use <Tex>{"A=D^{\\top}-D"}</Tex> and <Tex>{"\\text{cost}(\\pi)=\\tfrac12(S-F_A(\\pi))"}</Tex>. The Studio applies these identities exactly and re-checks them for every result.</p>
          </div>
        </div>
      </Section>

      <Section muted id="exact" kicker="2 · Exact optimization" title="Proving an ordering is optimal">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-6"><h3 className="font-semibold">Subset dynamic programming</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">The best score of every prefix set <Tex>{"S"}</Tex> satisfies <Tex>{"f(S)=\\max_{v\\in S} f(S\\setminus v)+\\sum_{u\\in S\\setminus v}a_{uv}"}</Tex>. That is <Tex>{"O(2^n n^2)"}</Tex> work: complete and exact, practical up to about 20 items.</p></div>
          <div className="card p-6"><h3 className="font-semibold">Exclusion search</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">Prefix states whose best completion provably cannot beat a known incumbent are discarded, using admissible suffix bounds (block tables, triangle packings). It is exact whenever the search finishes. <Link href="/explainer/" className="text-accent-600 underline">Interactive explainer</Link>.</p></div>
          <div className="card p-6"><h3 className="font-semibold">Integer programming</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">The classical linear-ordering MILP, solved with HiGHS in the backend service. It is exact only when the solver proves optimality within its time limit.</p></div>
        </div>
      </Section>

      <Section id="lambda" kicker="3 · Structural decomposition" title="The intrinsic parameter λ(A)">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 text-[15px] leading-relaxed text-fog-300">
            <p>Consider an ordered partition <Tex>{"\\mathcal B=(B_1,\\dots,B_m)"}</Tex> of the items into blocks. Let <Tex>{"b(\\mathcal B)"}</Tex> be its largest block. Let <Tex>{"K_0(\\mathcal B)"}</Tex> measure disagreement across blocks: the negative cross margins, near-zero cross margins below a threshold <Tex>{"\\tau"}</Tex>, and the negative mass in units of <Tex>{"\\tau"}</Tex>, minimised over all thresholds <Tex>{"\\tau\\in(0,\\infty]"}</Tex>. The parameter</p>
            <Tex block>{"\\lambda(A)=\\min_{\\mathcal B}\\bigl(b(\\mathcal B)^2+3K_0(\\mathcal B)\\bigr)"}</Tex>
            <p>is small exactly when the items split into small, consistently ordered groups with little disagreement between them. A nearly transitive preference structure has small λ. A large tournament-like tangle has large λ.</p>
          </div>
          <div className="card p-6">
            <p className="font-semibold text-fog-100">Partition recovery (AutoCut)</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-fog-400">
              <li>For <Tex>{"k=1,2,4,\\dots"}</Tex>, generate the reachable <Tex>{"k"}</Tex>-cuts layer by layer. Abort early if there are provably too many.</li>
              <li>Over cut sets with small weak cut, run a shortest-path search for every threshold <Tex>{"\\tau"}</Tex> and block cap <Tex>{"b\\le\\lfloor\\sqrt k\\rfloor"}</Tex>. Path costs encode <Tex>{"K_0"}</Tex>.</li>
              <li>If the best value is at most <Tex>{"k"}</Tex>, read off the partition, then compute the optimal ordering by a cut-restricted DP.</li>
            </ol>
            <p className="mt-3 text-sm text-fog-400">No partition is supplied or enumerated. The procedure finds one attaining <Tex>{"\\lambda(A)"}</Tex>, and it stops at <Tex>{"k=1"}</Tex> or <Tex>{"k<2\\lambda(A)"}</Tex>.</p>
          </div>
        </div>
      </Section>

      <Section muted id="complexity" kicker="4 · Parameterized complexity" title="Running time governed by structure, not just size">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 text-[15px] leading-relaxed text-fog-300">
            <p>The number of relevant cuts is bounded through integer partitions, and partition numbers grow like <Tex>{"e^{O(\\sqrt M)}"}</Tex>. Combined, this gives an algorithm whose running time is polynomial in <Tex>{"n"}</Tex> and subexponential in the structure:</p>
            <Tex block>{"T(A)=\\operatorname{poly}(n)\\,2^{O(\\sqrt{\\lambda(A)})}."}</Tex>
            <p>The Lean development proves this for the executable algorithm with explicit constants, counting arithmetic operations in a declared cost model. The cut-enumeration engine follows Fomin–Pilipczuk, and subexponential algorithms for weighted feedback arc set in tournaments (Karpinski–Schudy) are classical. The specific contribution under study is recovering a minimum-λ partition.</p>
          </div>
          <Callout tone="warn" title="Limits of the guarantee">
            Not established: the sharper <Tex>{"\\operatorname{poly}(n)P(6\\lambda)^2"}</Tex> expression, bit complexity for rational inputs, and a memory bound. The large constants (<Tex>{"(n+1)^{18}"}</Tex>, <Tex>{"2^{45\\sqrt\\lambda}"}</Tex>) are artefacts of a crude proof, not predictions of practical speed. Exact solving remains exponential in the worst case: λ can be as large as <Tex>{"n^2"}</Tex>.
          </Callout>
        </div>
      </Section>

      <Section id="verification" kicker="5 · Certificates and verification" title="How a result can be checked">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-6"><h3 className="font-semibold">Objective recomputation</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">Every returned ordering is re-scored in exact rational arithmetic, directly from the input data, independently of the solver.</p></div>
          <div className="card p-6"><h3 className="font-semibold">Independent cross-checks</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">Instances with n ≤ 9 are confirmed by enumerating all n! orderings. Larger exact runs are cross-checked against a second exact method where it is affordable.</p></div>
          <div className="card p-6"><h3 className="font-semibold">Optimality certificates</h3><p className="mt-2 text-sm leading-relaxed text-fog-400">The BLX solver emits exclusion certificates that an independent checker validates in exact integer arithmetic. <Link href="/verify/" className="text-accent-600 underline">Certificate verifier</Link>.</p></div>
        </div>
      </Section>

      <Section muted id="heuristics" kicker="6 · Exact and heuristic methods" title="When to use which">
        <div className="grid gap-6 lg:grid-cols-2">
          <p className="text-[15px] leading-relaxed text-fog-300">
            Local search finds excellent orderings quickly at any size but proves nothing. Exact methods prove optimality but scale exponentially in the worst case. In practice the heuristic supplies the incumbent that exclusion search must beat, and structure such as small λ is what lets exact methods finish. The Studio reports a heuristic result as a <em>feasible solution only</em>, even when it happens to be optimal.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="table-clean">
              <thead><tr><th>Method</th><th>Guarantee</th><th>Practical range</th></tr></thead>
              <tbody>
                <tr><td>ATLAS-032 (decomposition + cut-bounded DP + cycle-packing bounds)</td><td>optimal when every component is proved; otherwise best ordering + rigorous gap; independently checkable certificate</td><td>n ≤ 400 (browser); benchmarked: dense components to ~30–35 items, real instances to 79</td></tr>
                <tr><td>Subset DP</td><td>optimal</td><td>n ≤ 20 (browser)</td></tr>
                <tr><td>Exclusion DP</td><td>optimal if it completes</td><td>n ≤ 26 (browser), ≤ 62 (service)</td></tr>
                <tr><td>AutoCut</td><td>optimal + λ-partition</td><td>small λ; n ≤ 9 in the browser</td></tr>
                <tr><td>MILP (HiGHS)</td><td>optimal if proved</td><td>service, time-limited</td></tr>
                <tr><td>Local search</td><td>none (feasible)</td><td>up to 400 items</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section kicker="Evidence ledger" title="Proved, tested, open">
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="table-clean">
            <thead><tr><th>Statement</th><th>Status</th><th>Scope</th></tr></thead>
            <tbody>{status.map(([s, k, note]) => <tr key={s}><td className="text-fog-100">{s}</td><td><EvidenceTag kind={k} /></td><td>{note}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/formal-verification/" primary>Formal verification</ButtonLink><ButtonLink href="/research/">Research program</ButtonLink><ButtonLink href="/studio/">Try it in the Studio</ButtonLink></div>
      </Section>

      <Section kicker="Go further" title="See it in practice">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["/case-studies/forty-items/", "Case study: 40 items", "One sequence, proved optimal, with every number reproducible."],
            ["/benchmarks/", "Benchmarks", "Measured comparisons with HiGHS, including the cases HiGHS wins."],
            ["/applications/", "Applications", "Sequencing, ranking and prioritization problems the solvers address."],
            ["/verify/", "Certificate verifier", "Check an optimality certificate independently in your browser."],
          ] as const).map(([href, title, text]) => (
            <li key={href}>
              <Link href={href} className="card block h-full p-5 hover:border-accent-600/40">
                <span className="font-semibold text-fog-100">{title}</span>
                <span className="mt-1 block text-sm text-fog-400">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
