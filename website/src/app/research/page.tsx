import { ButtonLink, EvidenceTag, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import { blob, tree } from "@/lib/site";
import Link from "next/link";

export const metadata = { title: "Research" };

const params: [string, string, string?][] = [
  ["n", "number of items (vertices)"],
  ["\\mathcal B=(B_1,\\dots,B_m)", "an ordered partition of the vertices into blocks, supplied to the algorithm"],
  ["b", "largest block size", "b=\\max_i |B_i|"],
  ["I_{\\mathcal B}(S)", "cross-block inversions of a prefix set S", "\\#\\{(w,u): w\\notin S,\\ u\\in S,\\ \\mathrm{blk}(w)<\\mathrm{blk}(u)\\}"],
  ["X", "reversed cross weight", "\\sum_{i<j}\\sum_{u\\in B_i,\\,v\\in B_j}\\max(-a_{uv},0)"],
  ["\\mu_+", "smallest nonzero cross-block margin |a_uv|"],
  ["z", "number of zero-weight cross-block pairs"],
  ["\\delta", "incumbent gap, with L the incumbent's score", "\\delta=(\\mathrm{OPT}-L)/2"],
  ["K", "effective count of cross-block inconsistencies", "K=\\lfloor(\\delta+3X)/\\mu_+\\rfloor+z"],
];

const history = [
  ["Discovery 014", "Paley resistance", "Perturbed quadratic-residue tournaments defeat pairwise local certificates (ACC): zero relations certified although the optimum is unique.", "research/discovery-019/WESTFALL_Discovery_015_Report.md"],
  ["Discovery 015", "Core-Face Lifting", "Prefix states of near-optimal orderings of an integer core localize the search; certified all pairs on seeded Paley(11/19/23), with exponential preprocessing.", "research/discovery-019/WESTFALL_Discovery_015_Report.md"],
  ["Discovery 016", "Symmetric exclusion DP and a barrier", "Orbit-reduced core DP solved perturbed Paley(31); an isolation-lemma argument shows no algorithm can be output-sensitive in the number of optimal prefixes alone unless NP ⊆ ZPP.", "research/discovery-019/WESTFALL_Discovery_016_Report.md"],
  ["Discovery 017", "Self-localizing exclusion DP (SLDP)", "The exclusion rule with any admissible suffix bound confines the search near every optimum; hereditary triangle-packing bound. Audit showed partial overlap with Stein–Andres and Karpinski–Schudy.", "research/discovery-019/WESTFALL_Discovery_017_Report.md"],
  ["Discovery 018", "Block-Localized Exclusion (BLX 1.0)", "Hybrid hereditary bound (exact block tables + transversal triangle packing) and a block-localization theorem with an exponent K log(Kb); LOLIB benchmarking showed MILP wins on input–output instances.", "research/discovery-019/WESTFALL_Discovery_018_Report.md"],
  ["Discovery 019", "Square-root block localization (BLX 2.0)", "Tight 2^Θ(b+√K) counting theorem, zero-weight extension with matching necessity, exact integer certificates, and an out-of-sample portfolio benchmark.", "research/discovery-019/WESTFALL_Discovery_019_Report.md"],
];

export default function Research() {
  return (
    <>
      <PageHeader kicker="Research portal" title="Exact weighted linear ordering with structural guarantees">
        The program asks a precise question: when the difficulty of an ordering problem is concentrated in a few internally cyclic regions, can an exact algorithm pay
        exponentially only for those regions? This page states what has been proved, how, and what remains open.
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/research/paper/" primary>Read the manuscript</ButtonLink>
          <ButtonLink href={tree("research/discovery-019")} external>Discovery reports ↗</ButtonLink>
        </div>
      </PageHeader>

      <Section id="theorem" kicker="BLX 2.0 theorem" title="Square-root block localization"
        intro={<>In plain language: if you can split the items into ordered groups of size at most <Tex>{"b"}</Tex> so that only a few preferences cross the groups in the
          “wrong” direction, then BLX solves the problem exactly while exploring a number of partial orderings that grows like <Tex>{"2^{O(b+\\sqrt K)}"}</Tex>, times a polynomial in
          <Tex>{"n"}</Tex>. Hard structure <em>inside</em> a group costs only the <Tex>{"2^b"}</Tex> factor.</>}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <div className="flex flex-wrap gap-2"><EvidenceTag kind="proved" /><EvidenceTag kind="tested" /><EvidenceTag kind="provisional" /></div>
            <p className="mt-4 font-semibold text-fog-100">Theorem A (counting)</p>
            <p className="mt-1 text-sm text-fog-400">For every ordered partition with maximum block size <Tex>{"b"}</Tex>, every <Tex>{"n"}</Tex> and every <Tex>{"K\\ge0"}</Tex>:</p>
            <Tex block>{"\\big|\\mathcal S_K\\big|=\\big|\\{S\\subseteq V: I_{\\mathcal B}(S)\\le K\\}\\big|\\ \\le\\ (n+1)\\,P(2K+b^2),\\qquad P(M)=\\sum_{j\\le M}p(j)."}</Tex>
            <p className="text-sm text-fog-400">Since <Tex>{"p(j)<e^{\\pi\\sqrt{2j/3}}"}</Tex>, this is <Tex>{"\\mathrm{poly}(n)\\,2^{O(b+\\sqrt K)}"}</Tex>. It is tight up to constants: one free block gives <Tex>{"2^b"}</Tex> sets, and chains of half-full blocks give <Tex>{"2^{\\Omega(\\sqrt K)}"}</Tex>.</p>
          </div>
          <div className="card p-6">
            <div className="flex flex-wrap gap-2"><EvidenceTag kind="proved" /><EvidenceTag kind="provisional" /></div>
            <p className="mt-4 font-semibold text-fog-100">Corollary D (exact algorithm, supplied partition)</p>
            <p className="mt-1 text-sm text-fog-400">Exclusion DP with the hybrid hereditary bound retains only prefixes with <Tex>{"I_{\\mathcal B}(S)\\le K"}</Tex>, so it generates at most</p>
            <Tex block>{"n(n+1)\\,P(2K+b^2)\\ \\text{states, in time}\\ \\mathrm{poly}(n)\\,2^{O(b+\\sqrt K)},"}</Tex>
            <p className="text-sm text-fog-400">including segmentation, block tables, the two packing LPs and certificate generation. Zero-weight pairs enter through <Tex>{"z"}</Tex>, and that term is necessary:
              all-zero instances force <Tex>{"2^{\\lfloor\\sqrt{2z}\\rfloor}"}</Tex> retained states (Theorem C).</p>
          </div>
        </div>
        <div className="card mt-6 overflow-x-auto p-6">
          <p className="mb-3 font-semibold text-fog-100">Parameters</p>
          <table className="w-full text-sm">
            <tbody>
              {params.map(([sym, desc, formula]) => (
                <tr key={sym} className="border-t border-line/60">
                  <td className="w-48 py-2 pr-4 text-fog-100"><Tex>{sym}</Tex></td>
                  <td className="py-2 text-fog-400">{desc}{formula && <>: <Tex>{formula}</Tex></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-fog-500">Scope: the guarantee is relative to an ordered block partition supplied to the algorithm. BLX 2.0 obtains one by exact segmentation of a heuristic incumbent; it does not
            prove that this partition is the best possible. Weights may be any reals; the objective is <Tex>{"F_A(\\pi)=\\sum_{r<s}a_{\\pi_r\\pi_s}"}</Tex> for skew-symmetric <Tex>{"A"}</Tex>.</p>
        </div>
      </Section>

      <section className="border-y border-line bg-ink-900/40">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
          <p className="kicker mb-3">Mathematical derivation</p>
          <h2 className="h-display text-3xl">From one inequality to an integer-partition count</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="card p-6">
              <p className="font-mono text-xs text-cyan-400">Step 1 · central lemma</p>
              <p className="mt-2 text-sm text-fog-400">For a prefix set <Tex>{"S"}</Tex>, let <Tex>{"a_i=|B_i\\setminus S|"}</Tex> and <Tex>{"x_i=|B_i\\cap S|"}</Tex>. Then</p>
              <Tex block>{"\\sum_i a_i x_i\\ \\le\\ b^2+I_{\\mathcal B}(S)."}</Tex>
              <p className="text-sm text-fog-400">With <Tex>{"t_i=\\min(a_i,x_i)"}</Tex>, cross inversions dominate <Tex>{"\\sum_{i<j}t_it_j"}</Tex>, so <Tex>{"(\\sum t)^2\\le \\tfrac b2\\sum t+2I"}</Tex>, giving
                <Tex>{"\\sum t\\le \\tfrac b2+\\sqrt{2I}"}</Tex> and <Tex>{"\\sum a_ix_i\\le b\\sum t\\le b^2+I"}</Tex>.</p>
            </div>
            <div className="card p-6">
              <p className="font-mono text-xs text-cyan-400">Step 2 · encode as a binary word</p>
              <p className="mt-2 text-sm text-fog-400">List the vertices block by block. A set <Tex>{"S"}</Tex> becomes a 0/1 word whose ordinary inversion number equals <Tex>{"I_{\\mathcal B}(S)"}</Tex> plus
                within-block inversions, which are at most <Tex>{"\\sum_i a_ix_i"}</Tex>. By Step 1,</p>
              <Tex block>{"\\mathrm{inv}(\\omega(S))\\le 2I_{\\mathcal B}(S)+b^2."}</Tex>
            </div>
            <div className="card p-6">
              <p className="font-mono text-xs text-cyan-400">Step 3 · count Young diagrams</p>
              <p className="mt-2 text-sm text-fog-400">Words with <Tex>{"s"}</Tex> ones and <Tex>{"j"}</Tex> inversions correspond to partitions of <Tex>{"j"}</Tex> in an <Tex>{"s\\times(n-s)"}</Tex> box, so there are at most <Tex>{"p(j)"}</Tex>. Summing over <Tex>{"s"}</Tex> and <Tex>{"j\\le 2K+b^2"}</Tex>:</p>
              <Tex block>{"|\\mathcal S_K|\\le (n+1)P(2K+b^2)."}</Tex>
            </div>
          </div>
          <div className="card mt-6 p-6 text-sm text-fog-400">
            <p className="font-semibold text-fog-100">From counting to the algorithm</p>
            <p className="mt-2">The hybrid bound <Tex>{"U_{\\mathrm{hyb}}(T)=W(T)-2\\big[\\sum_i\\beta^*(T\\cap B_i)+\\sum_{\\Delta\\subseteq T}y'_\\Delta\\big]"}</Tex> (exact block tables plus a fractional packing of directed
              triangles meeting three different blocks) is admissible for every <Tex>{"T"}</Tex>. Combining the exclusion rule with three inequalities — <Tex>{"\\beta^*\\le\\sum_i\\beta^*(B_i)+X"}</Tex>, the suffix gap of
              <Tex>{"U_{\\mathrm{hyb}}"}</Tex> is at most <Tex>{"X"}</Tex>, and each inverted cross pair either contributes <Tex>{"\\ge\\mu_+"}</Tex>, is reversed, or has weight zero — shows every retained prefix satisfies
              <Tex>{"I_{\\mathcal B}(S)\\le K"}</Tex>. Full proofs: <Link className="text-cyan-300 underline" href="/research/paper/">manuscript §5</Link>.</p>
          </div>
        </div>
      </section>

      <Section kicker="Evidence" title="What was checked, and how">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Counting theorem", "0 violations in 7,192 exhaustive (partition, K) checks (n ≤ 16, blocks ≤ 4, K ≤ 30); exact counts up to n = 608 stay within a factor 1.4–2.3 in the exponent.", "tested"],
            ["Bound admissibility", "Hybrid bound ≥ exact sub-optimum on every subset: 0 violations over 81,920 checks, including random conflicting partitions, ties and zero weights.", "tested"],
            ["Solver-level theorem", "80 runs with ties and zero-weight mixes: no retained prefix exceeded K; no run exceeded the state bound.", "tested"],
            ["Asymptotic constant", "(log₂|S_K| − b)/√K ≈ 3.0–3.3 at K = 256 for every b from 1 to 32 — the reason the √(Kb) target was replaced by √K.", "observed"],
            ["Novelty", "Compared against the closest literature (below); no specialist review yet.", "provisional"],
            ["Partition-free version", "Finding a near-optimal partition within the same budget is open.", "future"],
          ].map(([t, b, e]) => (
            <div key={t} className="card p-5">
              <EvidenceTag kind={e as "tested"} />
              <p className="mt-3 font-semibold text-fog-100">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-fog-400">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      <section id="history" className="border-y border-line bg-ink-900/40">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
          <p className="kicker mb-3">Research history</p>
          <h2 className="h-display text-3xl">From failed local certificates to block localization</h2>
          <p className="mt-3 max-w-3xl text-fog-400">Only results documented in the repository&apos;s discovery reports are listed. Earlier discoveries (006–013) are referenced in those reports but are not reproduced here.</p>
          <ol className="mt-10 space-y-4 border-l border-line pl-6">
            {history.map(([d, t, b, src]) => (
              <li key={d} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-cyan-400 bg-ink-950" />
                <p className="font-mono text-xs text-cyan-400">{d}</p>
                <p className="font-semibold text-fog-100">{t}</p>
                <p className="mt-1 max-w-3xl text-sm text-fog-400">{b} <a className="text-cyan-300 underline" href={blob(src)}>source</a></p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Section id="prior-art" kicker="Prior art" title="How this relates to existing work"
        intro="A stronger guarantee in a structural regime is not the same as better practical performance. Both comparisons are given separately.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-line text-left text-fog-100"><th className="py-2 pr-4">Work</th><th className="py-2 pr-4">What it proves</th><th className="py-2">Relation to BLX</th></tr></thead>
            <tbody className="text-fog-400">
              {[
                ["Karpinski & Schudy (ISAAC 2010)", "Weighted FAST in O*(2^O(√OPT)) via DP over position windows of an approximate ranking (weights with w_uv + w_vu = 1); ETH lower bound.", "Closest technique. Their exponent charges all backward weight, including frustration inside blocks: on m Paley-like blocks of size b the guarantee is 2^O(b√m+√K) vs 2^O(b+√K). Separation of guarantees only — not measured."],
                ["Feige, Faster FAST (2009)", "n^O(1)·2^O(√k) for unweighted FAST with k = optimal cost.", "Same parameter family as Karpinski–Schudy."],
                ["Stein & Andres (ICML 2024)", "Polynomial-time partial optimality: improving maps (transposition, grouping, conditional grouping, shifting).", "Pair-fixing, not exact global optimization. Our earlier ACC rules partly overlap; a 9-vertex instance separates our block certificate from their single-pass conditions."],
                ["Akbari & Escobedo (2023)", "Approximate Condorcet partitioning for large Kemeny instances, with instance-specific approximation guarantees.", "Approximation only; no exact state-count or runtime bound in block size or violating pairs."],
                ["Condorcet / modular decompositions (Truchon; Phung & Hamel 2025)", "Exact decomposition when every cross pair agrees with the block order.", "Our K = 0 case (X = z = 0, δ = 0). Not claimed as new."],
                ["Morin & Marsten (1976); state-space relaxation", "Bounding states in dynamic programming.", "The general paradigm BLX instantiates."],
                ["LOP branch-and-cut (Grötschel–Jünger–Reinelt; Charon–Hudry)", "Strong exact solvers for LOLIB-type instances.", "Not benchmarked here — the most important missing comparison."],
              ].map(([w, p, r]) => (
                <tr key={w} className="border-b border-line/60 align-top"><td className="py-3 pr-4 text-fog-100">{w}</td><td className="py-3 pr-4">{p}</td><td className="py-3">{r}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <section id="open" className="border-t border-line bg-ink-900/40">
        <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
          <p className="kicker mb-3">Open problems</p>
          <h2 className="h-display text-3xl">What is not solved</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Partition discovery", "Can a near-optimal ordered partition (minimising b + √K) be found within the same 2^O(b+√K) budget? A positive answer would give a partition-free structural FPT theorem for weighted FAST."],
              ["ETH tightness in K", "Karpinski–Schudy's ETH lower bound suggests 2^o(√K) is impossible uniformly; the transfer to our parameter has not been verified."],
              ["Specialist comparison", "Benchmark against a specialised LOP branch-and-cut solver on LOLIB/xLOLIB, and run an implementation of Karpinski–Schudy."],
              ["Scalable certification", "The exact verifier is pure Python / TypeScript; multi-million-state certificates need a compiled verifier and possibly a formalised checker."],
            ].map(([t, b]) => (
              <div key={t} className="card p-5"><EvidenceTag kind="future" /><p className="mt-3 font-semibold text-fog-100">{t}</p><p className="mt-2 text-sm text-fog-400">{b}</p></div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

