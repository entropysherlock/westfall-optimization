import HeroGraph from "@/components/HeroGraph";
import { ButtonLink, EvidenceTag, Section, type Evidence } from "@/components/ui";
import { Tex } from "@/components/Tex";
import { loadPresets } from "@/lib/data";
import { blob, REPO } from "@/lib/site";
import Link from "next/link";

export default function Home() {
  const presets = loadPresets();
  const hero = presets.find((p) => p.id === "blocks-14-mixed")!;

  const claims: { title: string; body: string; ev: Evidence[] }[] = [
    { title: "Square-root block-localization bound", body: "For a supplied ordered block partition, exclusion DP retains at most (n+1)·P(2K+b²) prefix states, giving poly(n)·2^O(b+√K) exact optimization.", ev: ["proved", "provisional"] },
    { title: "Tightness of the counting", body: "Exhaustive enumeration (7,192 cases) and exact generating-function counts up to n = 608 match the 2^Θ(b+√K) order.", ev: ["tested"] },
    { title: "Exact optimality certificates", body: "Certificates are checked in exact integer arithmetic by a verifier independent of the search code, bound to the input matrix, and tested against deliberate tampering.", ev: ["tested"] },
    { title: "Reproducible benchmarks, including losses", body: "Wins on embedded cyclic cores; a generic MILP is faster on LOLIB input–output instances; large xLOLIB instances remain unresolved.", ev: ["observed"] },
  ];

  const steps = [
    ["Construct an incumbent", "Insertion local search produces a feasible ordering π₀. Its score L = F_A(π₀) becomes the exclusion threshold."],
    ["Analyze structure", "A fractional directed-triangle packing gives a global lower bound on unavoidable backward weight; the gap to π₀ and the zero-weight fraction are measured."],
    ["Identify ordered blocks", "An exact dynamic program segments π₀ into contiguous blocks that keep as much backward weight inside blocks as possible."],
    ["Compute admissible bounds", "Exact block tables β*(X) plus a transversal triangle packing give U_hyb(T) ≥ OPT(A|T) for every vertex subset T, with no double counting."],
    ["Exclude impossible prefixes", "A prefix S survives only if f(S) + r(S) + U(V∖S) ≥ L. Every ordering scoring ≥ L keeps all its prefixes, so nothing optimal is lost."],
    ["Solve exactly", "A longest-path DP over the surviving prefix states returns the optimum and every forced precedence. A portfolio routes LP-friendly instances to MILP."],
    ["Certify", "The retained states, packings and block partition form a certificate that an independent exact verifier re-checks from scratch."],
  ];

  return (
    <>
      {/* HERO */}
      <section className="grid-bg relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-page items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:py-28">
          <div>
            <p className="kicker">Independent research initiative · exact combinatorial optimization</p>
            <h1 className="h-display mt-5 text-5xl leading-[1.04] sm:text-6xl">
              WESTFALL<br />OPTIMIZATION
            </h1>
            <p className="mt-6 text-2xl font-medium text-cyan-300">Optimization, with mathematical guarantees.</p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fog-400">
              Researching exact algorithms that transform complex weighted-ordering problems into mathematically verifiable solutions.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/lab/" primary>Launch BLX Laboratory →</ButtonLink>
              <ButtonLink href="/research/">Explore the Research</ButtonLink>
              <ButtonLink href={REPO} external>View GitHub ↗</ButtonLink>
            </div>
          </div>
          <div>
            <HeroGraph A={hero.matrix} blocks={hero.reference.blocks} />
            <p className="mt-3 text-xs leading-relaxed text-fog-500">
              A 14-vertex instance with two cyclic cores and two reversed cross-block preferences. Every arc u→v means “u should precede v” with weight a<sub>uv</sub>;
              red arcs point backward in the current ordering. The final stage is computed exactly in your browser.
            </p>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <Section kicker="The problem" title="Weighted linear ordering"
        intro={<>Given pairwise preferences between n items, find the ordering that agrees with them as much as possible. This is the weighted
          linear-ordering problem, equivalent to minimum weighted feedback arc set in tournaments, and NP-hard in general.</>}>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="card p-6 md:col-span-2">
            <p className="text-fog-400">For a skew-symmetric matrix <Tex>{"A=(a_{ij}),\\ a_{ij}=-a_{ji}"}</Tex>, maximise</p>
            <Tex block>{"F_A(\\pi)=\\sum_{r<s} a_{\\pi_r\\pi_s},\\qquad \\beta_A(\\pi)=\\frac{W(A)-F_A(\\pi)}{2},\\quad W(A)=\\sum_{i<j}|a_{ij}|."}</Tex>
            <p className="text-fog-400">Maximising <Tex>{"F_A"}</Tex> is the same as minimising the backward weight <Tex>{"\\beta_A"}</Tex>: the total weight of preferences the ordering violates.</p>
          </div>
          <div className="card p-6 text-sm leading-relaxed text-fog-400">
            <p className="font-semibold text-fog-100">Where it appears</p>
            <p className="mt-2">Rank aggregation (Kemeny), tournament ranking, input–output table triangulation, scheduling with pairwise costs, and feedback-arc-set problems in graph drawing and verification.</p>
          </div>
        </div>
      </Section>

      {/* CREDIBILITY */}
      <section className="border-y border-line bg-ink-900/40">
        <div className="mx-auto max-w-page px-5 py-16 sm:px-8">
          <p className="kicker mb-8">What has actually been established</p>
          <div className="grid gap-5 md:grid-cols-2">
            {claims.map((c) => (
              <div key={c.title} className="card p-6">
                <div className="flex flex-wrap gap-2">{c.ev.map((e) => <EvidenceTag key={e} kind={e} />)}</div>
                <h3 className="mt-4 text-lg font-semibold text-fog-100">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog-400">{c.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-fog-500">
            Labels: “proved in manuscript” means a complete proof appears in the provisional manuscript; it has not been peer-reviewed. Our internal research scale rates the result
            “Level 3 (provisional)”; that is an internal classification, not an external endorsement.
          </p>
        </div>
      </section>

      {/* BLX */}
      <Section kicker="Flagship technology" title="BLX 2.0 — Block-Localized Exclusion"
        intro="An exact search over prefix sets that discards states which provably cannot lead to an ordering better than the incumbent, using bounds that stay tight when the difficulty is concentrated in a few cyclic blocks.">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([t, b], i) => (
            <li key={t} className={`card p-5 ${i === 4 ? "lg:col-span-2 border-cyan-400/40" : ""}`}>
              <div className="font-mono text-xs text-cyan-400">0{i + 1}</div>
              <div className="mt-2 font-semibold text-fog-100">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-fog-400">{b}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/explainer/" primary>See the exclusion rule run step by step</ButtonLink>
          <ButtonLink href="/benchmarks/">Where it helps — and where it does not</ButtonLink>
        </div>
      </Section>

      {/* PAPER */}
      <section className="border-y border-line bg-ink-900/40">
        <div className="mx-auto grid max-w-page gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="kicker">Featured research</p>
            <h2 className="h-display mt-3 text-3xl">Square-Root Block Localization for Exact Weighted Linear Ordering</h2>
            <div className="mt-4 flex flex-wrap gap-2"><EvidenceTag kind="provisional" /><EvidenceTag kind="proved" /></div>
            <p className="mt-5 leading-relaxed text-fog-400">
              Exclusion dynamic programming with a hybrid hereditary bound — exact optima on subsets of blocks plus a packing of directed triangles that meet three different
              blocks — explores a number of prefix states governed only by the block size <Tex>{"b"}</Tex> and an effective count <Tex>{"K"}</Tex> of cross-block inconsistencies.
              Frustration inside blocks costs only <Tex>{"2^{b}"}</Tex>, however severe it is.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/research/paper/" primary>Read the manuscript</ButtonLink>
              <ButtonLink href="/research/#theorem">Theorem & proof idea</ButtonLink>
              <ButtonLink href={blob("papers/square-root-block-localization-v2.md")} external>Manuscript source ↗</ButtonLink>
            </div>
          </div>
          <div className="card p-6">
            <p className="font-mono text-xs uppercase tracking-wider text-fog-500">Theorem A (counting)</p>
            <Tex block>{"\\big|\\{S\\subseteq V:\\ I_{\\mathcal B}(S)\\le K\\}\\big|\\ \\le\\ (n+1)\\,P(2K+b^2)"}</Tex>
            <p className="font-mono text-xs uppercase tracking-wider text-fog-500">Corollary (exact algorithm, supplied partition)</p>
            <Tex block>{"T(n)=\\mathrm{poly}(n)\\cdot 2^{O(b+\\sqrt{K})},\\qquad K=\\Big\\lfloor\\tfrac{\\delta+3X}{\\mu_+}\\Big\\rfloor+z"}</Tex>
            <p className="mt-2 text-xs leading-relaxed text-fog-500">
              <Tex>{"P(M)=\\sum_{j\\le M}p(j)"}</Tex> counts integer partitions. The guarantee is relative to an ordered block partition supplied to the algorithm; finding an optimal partition
              efficiently is an open problem.
            </p>
          </div>
        </div>
      </section>

      {/* METHOD */}
      <Section kicker="Methodology" title="How the research is done"
        intro="Each result passes through the same loop. Claims that fail a step are revised or dropped, and the failures are kept in the record.">
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ["AI-assisted exploration", "Candidate bounds and algorithms are proposed and stress-tested with an AI research collaborator (Claude, Anthropic)."],
            ["Exact computation", "Conjectured counts and bounds are computed exactly — e.g. exact generating-function counts showed the original √(Kb) target was loose."],
            ["Theorem development", "Only statements with complete written proofs are labelled as proved; everything else is labelled as observed or conjectural."],
            ["Adversarial testing", "Exhaustive small cases, random partitions, ties and zero weights, adversarial instance families, and certificate tampering."],
            ["Independent verification", "Solutions are re-checked by a separate exact verifier and cross-checked against exact subset DP and MILP."],
          ].map(([t, b], i) => (
            <div key={t} className="card p-5">
              <div className="font-mono text-xs text-cyan-400">{["I", "II", "III", "IV", "V"][i]}</div>
              <div className="mt-2 font-semibold text-fog-100">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-fog-400">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* OPEN */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-page gap-8 px-5 py-20 sm:px-8 md:grid-cols-2">
          <div>
            <p className="kicker">Open research</p>
            <h2 className="h-display mt-3 text-3xl">Inspect it. Reproduce it. Try to break it.</h2>
            <p className="mt-4 leading-relaxed text-fog-400">
              The solver, verifier, benchmark logs and manuscripts are in the repository. Mathematicians, optimization researchers and engineers are invited to check the proofs,
              rerun the benchmarks, compare against specialised branch-and-cut codes, and report errors or prior art we missed.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={blob("CONTRIBUTING.md")} external>How to contribute ↗</ButtonLink>
              <ButtonLink href={blob("CITATION.cff")} external>Citation metadata ↗</ButtonLink>
              <ButtonLink href="/verify/">Verify a certificate</ButtonLink>
            </div>
          </div>
          <div className="card p-6 font-mono text-[13px] leading-relaxed text-fog-300">
            <p className="text-fog-500"># install and solve a seeded Paley(11) instance</p>
            <p>git clone {REPO}.git</p>
            <p>cd westfall-optimization && pip install -e .</p>
            <p>python -c &quot;import westfall_optimization as w; print(w.solve(w.perturbed_paley(11))[&apos;OPT&apos;])&quot;</p>
            <p className="mt-3 text-fog-500"># → 15.52614286834…  (status PROVED_OPTIMAL)</p>
            <p className="mt-4 text-fog-500">Cite as: Westfall, C. (2026). Westfall Optimization: BLX 2.0. Software, {REPO.replace("https://", "")}</p>
            <p className="mt-4 text-xs text-fog-500">See <Link href="/roadmap/" className="text-cyan-300">Roadmap</Link> for proposed next steps.</p>
          </div>
        </div>
      </section>
    </>
  );
}
