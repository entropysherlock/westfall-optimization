import Link from "next/link";
import { Callout, PageHeader } from "@/components/ui";
import { Tex } from "@/components/Tex";

export const metadata = { title: "Documentation", description: "Westfall Optimization Studio: problem specification, input formats, validation, solvers, statuses, verification, exports and limits." };

const toc: [string, string][] = [
  ["start", "Start here"],
  ["walkthrough", "Studio walkthrough"],
  ["workstation", "The Studio workspaces"],
  ["model", "Problem specification"],
  ["input-formats", "Input formats"],
  ["conventions", "Edge cases and conventions"],
  ["validation", "Validation and limits"],
  ["solvers", "Solver selection"],
  ["atlas", "ATLAS-032 settings"],
  ["statuses", "Statuses and guarantees"],
  ["certificates", "Certificates and independent verification"],
  ["output", "Output and verification"],
  ["export", "Export and re-import"],
  ["capacity", "Runtime and capacity"],
  ["examples", "Worked examples"],
  ["developers", "For developers"],
  ["privacy", "Privacy and security"],
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-24 border-t border-line pt-10 text-2xl font-semibold tracking-tight text-fog-100 first:border-0 first:pt-0">{children}</h2>;
}
function Code({ children }: { children: string }) {
  return <pre tabIndex={0} className="my-4 overflow-x-auto rounded-lg border border-line bg-ink-900 p-4 font-mono text-[12.5px] leading-relaxed text-fog-300">{children}</pre>;
}

export default function Docs() {
  return (
    <>
      <PageHeader kicker="Documentation" title="Westfall Optimization Studio">
        Everything needed to prepare data, choose a solver and interpret the result. For programmatic access to the remote solver service, see the <Link className="text-accent-600 underline" href="/docs/api/">job API</Link>.
      </PageHeader>
      <div className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Documentation contents" className="lg:sticky lg:top-24 lg:self-start">
          <p className="label">Contents</p>
          <ol className="mt-3 space-y-1.5 text-sm">{toc.map(([id, t]) => <li key={id}><a href={`#${id}`} className="text-fog-400 hover:text-accent-600">{t}</a></li>)}</ol>
        </nav>
        <article className="max-w-3xl space-y-5 text-[15px] leading-relaxed text-fog-300">
          <H id="start">Start here</H>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card p-4 text-sm"><p className="font-semibold text-fog-100">New users</p><p className="mt-1">Westfall Optimization orders items to agree with as much pairwise preference weight as possible (weighted linear ordering / feedback arc set). Follow the <a className="text-accent-600 underline" href="#walkthrough">walkthrough</a>, then try your own data in the <Link className="text-accent-600 underline" href="/studio/">Studio</Link>.</p></div>
            <div className="card p-4 text-sm"><p className="font-semibold text-fog-100">Optimization practitioners</p><p className="mt-1">Solver guarantees and sizes are in <a className="text-accent-600 underline" href="#solvers">Solver selection</a>; what each status promises is in <a className="text-accent-600 underline" href="#statuses">Statuses</a>; measured performance and losses are on <Link className="text-accent-600 underline" href="/benchmarks/#atlas-032">Benchmarks</Link>.</p></div>
            <div className="card p-4 text-sm"><p className="font-semibold text-fog-100">Researchers</p><p className="mt-1">Definitions are below; theorem statements and the verification status of every result (Lean, hand proof, draft, conjecture) are on <Link className="text-accent-600 underline" href="/formal-verification/#status">Verification</Link>; work in progress is on <Link className="text-accent-600 underline" href="/research/#in-progress">Research</Link>.</p></div>
            <div className="card p-4 text-sm"><p className="font-semibold text-fog-100">Developers</p><p className="mt-1">Internal representation, architecture, certificate format and test commands are in <a className="text-accent-600 underline" href="#developers">For developers</a>.</p></div>
          </div>

          <H id="walkthrough">Studio walkthrough: a 60-item instance, proved and independently verified</H>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Open the <Link className="text-accent-600 underline" href="/studio/">Studio</Link>. In the <strong>Problem</strong> workspace choose the example <strong>Large instance (n = 60)</strong>. It is an edge list read as skew-symmetric margins (validation shows 60 items).</li>
            <li>The <strong>Solver</strong> workspace profiles the instance (one strongly connected component of 60 items, 45% density) and recommends <strong>ATLAS-032</strong>, saying why: decomposition does not help, so the cut-bounded DP with cycle-packing bounds is used.</li>
            <li>Press <em>Run optimization</em> (or Ctrl/⌘ + Enter). While it runs, the inspector shows measured progress: the best ordering so far, the rigorous bound and the gap between them. The status becomes <strong>Proven optimal</strong> with objective <strong>3027</strong> (the initial order scores 597), the rigorous upper bound equals 3027, and the gap is 0. On our test machine (Chrome, one 2.3 GHz Xeon core) this took about 1 s; your browser may differ.</li>
            <li>In <strong>Results</strong>, the <strong>Search</strong> tab lists states, pruning and the root packing bound. The <strong>Verification</strong> workspace has already run the independent verifier (it should report <strong>ACCEPTED</strong>); <em>Export certificate</em> saves a file that the Python verifier also accepts.</li>
            <li>In <strong>Compare</strong>, run ATLAS-032 and the local search on the same snapshot. The heuristic is labelled <em>Feasible — not proven optimal</em> even when it reaches 3027.</li>
          </ol>
          <p className="text-sm text-fog-500">The objective, initial value and certificate verdict in this walkthrough are pinned by an automated test (<span className="font-mono">tests/studio038.test.ts</span>), so this page fails CI if they change.</p>

          <H id="workstation">The Studio workspaces</H>
          <p>The Studio is one page with six workspaces that share the same problem and settings; switching between them never discards data (Alt + 1…6 switches, Ctrl/⌘ + Enter runs, Esc cancels a run).</p>
          <dl className="space-y-3">
            <div><dt className="font-semibold text-fog-100">Problem</dt><dd>Examples, file import (drag and drop), pasted text, a reproducible synthetic generator (kind, size, seed), a grid editor for up to 40 items, validation with line-level errors, and a preview of the exact transformation to the skew-symmetric model. Local sessions can be saved, restored, duplicated and downloaded; they are stored only in this browser&apos;s local storage.</dd></div>
            <div><dt className="font-semibold text-fog-100">Solver</dt><dd>A measured profile (density, strong components, ties, exact arithmetic) with a difficulty class taken from the ATLAS-032 benchmark conditions — a classification, not a runtime prediction — and the recommended solver with its reasons. Beginner mode chooses for you; Advanced mode exposes every engine option (time limit, seed, state budget, incumbent search time, cycle-packing mode, strict proving, decomposition, certificate generation, verification options).</dd></div>
            <div><dt className="font-semibold text-fog-100">Results</dt><dd>Status, objective, improvement, forward and backward weight, rigorous bound and gap (ATLAS-032), proof method, states explored and pruned, resource limits and any interruption reason; exports including a reproducibility bundle.</dd></div>
            <div><dt className="font-semibold text-fog-100">Analysis</dt><dd>A canvas matrix explorer (zoom, pan, exact rational readout by pointer or keyboard, pinned row and column, block aggregation for large instances, strong-component outlines, initial and optimized side by side), ordering changes (Kendall distance, footrule, slope chart), per-item contributions that add up exactly to F_A, and the backward pairs whose weights add up exactly to β.</dd></div>
            <div><dt className="font-semibold text-fog-100">Verification</dt><dd>An evidence ladder that keeps six guarantees apart: feasible ordering, exact objective recomputation, rigorous bound, complete certificate, independently accepted certificate, and Lean verification (never claimed for browser runs). It also checks certificate files and offers a tamper test.</dd></div>
            <div><dt className="font-semibold text-fog-100">Compare</dt><dd>Runs several solvers one after another on one frozen snapshot of the problem with the same time limit and seed, flags inconsistencies, and states what the comparison can and cannot show. Single browser runs are indicative; they are not a benchmark study.</dd></div>
          </dl>
          <p><strong>Live measurements.</strong> During an ATLAS-032 run the worker streams what the search actually measured: per-component phases, the prefix length and number of states at that length, states used against the budget, and a bracket on the optimal backward weight — the best ordering found so far (always attained) and the rigorous lower bound (exact solves plus cycle-packing bounds of unfinished components). The bracket narrows only when a component finishes or is bounded; it does not predict the remaining time. The heuristic streams its incumbent improvements. Solvers that measure nothing show elapsed time only.</p>

          <H id="model">Problem specification</H>
          <p>An instance has <Tex>{"n"}</Tex> items and pairwise data. A solution is an ordering <Tex>{"\\pi"}</Tex> (a permutation of all items). Internally every instance becomes a skew-symmetric matrix <Tex>{"A"}</Tex> (<Tex>{"a_{ij}=-a_{ji}"}</Tex>, <Tex>{"a_{ii}=0"}</Tex>), and the solvers maximise <Tex>{"F_A(\\pi)=\\sum_{r<s}a_{\\pi_r\\pi_s}"}</Tex>. You choose how your numbers are read:</p>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="table-clean">
              <thead><tr><th>Interpretation</th><th>Meaning of entry (i, j)</th><th>Objective</th><th>Transformation</th></tr></thead>
              <tbody>
                <tr><td className="font-semibold text-fog-100">skew</td><td>margin by which i should precede j; must satisfy a_ji = −a_ij</td><td>maximise F_A</td><td>A as given</td></tr>
                <tr><td className="font-semibold text-fog-100">benefit</td><td>gained when i is placed (anywhere) before j</td><td>maximise Σ c_ij over i before j</td><td><Tex>{"A=C-C^\\top,\\ \\text{obj}=\\tfrac12(F_A+S)"}</Tex></td></tr>
                <tr><td className="font-semibold text-fog-100">cost</td><td>paid when i is placed (anywhere) before j</td><td>minimise Σ d_ij over i before j</td><td><Tex>{"A=D^\\top-D,\\ \\text{obj}=\\tfrac12(S-F_A)"}</Tex></td></tr>
              </tbody>
            </table>
          </div>
          <p>Here <Tex>{"S"}</Tex> is the sum of all off-diagonal entries of your matrix. These identities are exact, and the Studio re-checks them for every result. Diagonal entries never affect an ordering: they are ignored (with a warning) for benefit and cost data and must be zero for skew data. A matrix that is not skew-symmetric is <strong>never</strong> reinterpreted silently. You must pick benefit or cost.</p>

          <H id="input-formats">Input formats</H>
          <p><strong>Matrix (CSV, TSV or whitespace).</strong> One row per item. An optional header row holds item names; the first column may hold row labels. Comma, semicolon, tab and whitespace delimiters are detected from the first data line. Lines starting with <span className="font-mono">#</span> are comments. Values are exact decimals (<span className="font-mono">-1.25</span>, <span className="font-mono">3e-2</span>) or fractions (<span className="font-mono">7/4</span>).</p>
          <Code>{`,Ames,Baker,Chen
Ames,0,3,4
Baker,2,0,1
Chen,1,4,0`}</Code>
          <p><strong>Weighted edge list.</strong> One line per directed pair: <span className="font-mono">from,to,weight</span>. A header line is optional. Labels are arbitrary text; items are numbered in order of first appearance.</p>
          <Code>{`from,to,weight
Harbor,Summit,3
Summit,Pioneers,2
Pioneers,Harbor,1`}</Code>
          <p><strong>JSON.</strong> An object with <span className="font-mono">matrix</span> (rows of numbers or numeric strings, <span className="font-mono">null</span> allowed on the diagonal) or <span className="font-mono">edges</span> (<span className="font-mono">[from, to, weight]</span> triples or objects). Optional fields: <span className="font-mono">names</span>, <span className="font-mono">interpretation</span>, <span className="font-mono">initialOrder</span> (names or 0-based indices) and <span className="font-mono">title</span>. A bare array of rows is accepted as a matrix. Exported Studio results are also accepted (see re-import).</p>
          <Code>{`{
  "title": "Ties and fractions",
  "interpretation": "skew",
  "names": ["a", "b", "c"],
  "matrix": [["0", "1", "-1/2"], ["-1", "0", "1"], ["1/2", "-1", "0"]],
  "initialOrder": ["c", "a", "b"]
}`}</Code>

          <H id="conventions">Edge cases and conventions</H>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Duplicate edges</strong> (the same from→to pair more than once) are <em>summed</em> under benefit and cost, with a warning. Under skew they are rejected.</li>
            <li><strong>Both directions</strong> (u→v and v→u) are normal for benefit and cost data. For skew data they must be consistent: w_vu = −w_uv.</li>
            <li><strong>Self-edges</strong> (an item to itself) are rejected with the line number.</li>
            <li><strong>Zero weights</strong> are allowed and change nothing. Pairs that never appear in an edge list have weight zero.</li>
            <li><strong>Missing matrix entries</strong> (empty cell, <span className="font-mono">-</span>, <span className="font-mono">NA</span>) are errors off the diagonal and read as 0 on the diagonal. Nothing is imputed.</li>
            <li><strong>Asymmetric matrices</strong> are rejected under skew, with the first offending pairs listed. Choose benefit or cost to model general pairwise data.</li>
            <li><strong>Names</strong> must be unique and non-empty (at most 80 characters). You can rename items in the Model panel.</li>
          </ul>

          <H id="validation">Validation and limits</H>
          <p>Validation runs as you type and reports every problem with its line and column where possible. Inputs are parsed as data only; nothing is evaluated. Limits: file size 2 MB, 400 items, 80 000 edges, |value| ≤ 10¹², 30 significant digits per value. Values are scaled to integers by their common denominator. When every partial sum fits in 2⁵³, the solvers use exact integer arithmetic. Otherwise they use floating point, and exact solvers then report “feasible solution only”, because rounding could in principle affect optimality.</p>

          <H id="solvers">Solver selection</H>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="table-clean">
              <thead><tr><th>Solver</th><th>Size</th><th>Guarantee</th><th>Use when</th></tr></thead>
              <tbody>
                <tr><td className="text-fog-100">ATLAS-032 (recommended for n ≥ 10)</td><td>n ≤ 400</td><td>optimal when every strong component is proved; otherwise interrupted with the best ordering and a rigorous gap; certificate when proved</td><td>default exact solver; benchmarked up to dense 30–35-item components and 79-item real instances</td></tr>
                <tr><td className="text-fog-100">AutoCut structural solver (recommended for n ≤ 9)</td><td>n ≤ 9</td><td>optimal + λ(A) partition</td><td>you want the structural decomposition</td></tr>
                <tr><td className="text-fog-100">Exact subset DP</td><td>n ≤ 20</td><td>optimal</td><td>small to medium instances; real progress reporting</td></tr>
                <tr><td className="text-fog-100">Exact exclusion DP</td><td>n ≤ 26</td><td>optimal if it completes within 3 million states</td><td>structured instances somewhat beyond the subset DP</td></tr>
                <tr><td className="text-fog-100">Local search</td><td>n ≤ 400</td><td>none (feasible)</td><td>large instances, quick answers</td></tr>
                <tr><td className="text-fog-100">Remote: BLX 2.0, MILP, subset DP</td><td>service limits</td><td>optimal only when proved</td><td>if a job service is configured (see API)</td></tr>
              </tbody>
            </table>
          </div>
          <p>The <strong>recommended</strong> solver is chosen from the instance: AutoCut for exact inputs with n ≤ 9, ATLAS-032 up to 400 items, and the heuristic only beyond every exact limit. The Studio shows the reasons (size, strong components, density, ties, exactness) and warns when a dense component may not be proved in time. Choosing another solver by hand is always possible; a heuristic result is never presented as optimal.</p>
          <p>The browser AutoCut is a TypeScript port of the Lean-verified algorithm. It reproduces the Lean executable&apos;s output exactly on 103 archived instances, but it is not itself formally verified. No browser solver is the Lean executable.</p>

          <H id="atlas">ATLAS-032 settings</H>
          <p>ATLAS-032 splits the instance into strongly connected components of the strict preference graph (exact: an optimal ordering is a concatenation of optimal component orderings), solves components of up to 13 items by the subset DP and larger ones by a cut-bounded prefix DP, and concatenates. For a prefix S it discards S when</p>
          <Tex block>{"\\beta_S+\\operatorname{cut}(S)+\\lceil L(V\\setminus S)\\rceil\\ \\ge\\ B,"}</Tex>
          <p>where β<sub>S</sub> is the least backward weight inside S, cut(S) the weight that must point backward across S, L a directed-cycle packing lower bound on the remaining items, and B the incumbent&apos;s backward weight. These are standard techniques; proofs are in <a className="text-accent-600 underline" href="https://github.com/entropysherlock/westfall-optimization/blob/main/benchmarks/atlas-032/PROOFS.md">PROOFS.md</a>.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Residual lower bound</strong>: fractional triangles + longer cycles (default; matters on tie-heavy and sparse input), fractional triangles, greedy triangles, or none (no residual bound). Used only for exact integer models.</li>
            <li><strong>State budget</strong> (per component): caps memory. A component that exceeds it is reported, not silently approximated.</li>
            <li><strong>Local search per component</strong>: time for the incumbent; blank chooses a size-dependent default.</li>
            <li><strong>Strict incumbent proving</strong>: keep only prefixes that could beat the incumbent; if none survives, the incumbent is proved optimal.</li>
            <li><strong>Decomposition</strong> and <strong>certificate generation</strong> can be switched off for comparison.</li>
          </ul>

          <H id="statuses">Statuses and guarantees</H>
          <dl className="space-y-3">
            <div><dt className="font-semibold text-fog-100">Proven optimal</dt><dd>An exact solver completed under its stated assumptions, in exact integer arithmetic. The ordering is a global optimum, though other optimal orderings may exist.</dd></div>
            <div><dt className="font-semibold text-fog-100">Feasible — not proven optimal</dt><dd>A heuristic returned the ordering, or the arithmetic was not exact. No optimality claim is made, even if the ordering happens to be optimal.</dd></div>
            <div><dt className="font-semibold text-fog-100">Interrupted — not proven optimal</dt><dd>An exact search (ATLAS-032 or the exclusion DP) stopped at its state budget or time limit. The best ordering found is returned; ATLAS-032 also reports a rigorous bound and the remaining gap.</dd></div>
            <div><dt className="font-semibold text-fog-100">Invalid or failed</dt><dd>The data could not be read or modelled (every problem is listed and nothing is solved), or a run produced no valid result (hard time limit, worker crash or out of memory). Your problem and settings are kept; adjust and run again.</dd></div>
            <div><dt className="font-semibold text-fog-100">Verification passed</dt><dd>The ordering is a valid permutation, its objective was recomputed exactly from your original data, the transformation identity holds, and any independent check that ran (exhaustive enumeration for n ≤ 9, or a second exact method) agreed.</dd></div>
            <div><dt className="font-semibold text-fog-100">Lean-verified implementation</dt><dd>Never shown for browser runs. The claim applies only to the compiled Lean executable on the research branch (see <Link className="text-accent-600 underline" href="/formal-verification/">Verification</Link>). ATLAS-032 is not Lean-verified.</dd></div>
          </dl>
          <p>A cancelled run, or a subset DP / AutoCut run that reaches the hard time limit, produces <em>no</em> result: the worker is terminated and partial work is discarded. ATLAS-032 checks its own deadline and returns an interrupted result instead.</p>

          <H id="certificates">Certificates and independent verification</H>
          <p>When ATLAS-032 proves an exact integer model optimal, it emits a certificate for the integer matrix M = scale · A: the strong components in topological order and, for each, its ordering, its backward weight and the cycle packing used as a lower bound. It certifies optimality for M, which is equivalent to optimality for your objective by the exact identity shown in the model summary.</p>
          <p>Two independent verifiers exist. The in-browser verifier (<span className="font-mono">certverify.ts</span>) is a separate implementation that imports no solver code, uses exact BigInt arithmetic and runs in its own worker. The Python verifier is independent of both:</p>
          <Code>{`python3 benchmarks/atlas-032/verify_certificate.py certificate.json`}</Code>
          <p>Each checks the decomposition, recomputes every β, checks that each packed sequence is a directed cycle within capacity, and then either observes that the packing bound already equals β or runs its own pruned search showing that no better ordering exists. The verdict is ACCEPTED, REJECTED or UNDECIDED (search budget exceeded; never accepted). These are computational checks, not formal proofs. Interrupted runs, inexact models and other solvers produce no certificate, and the Studio says why.</p>

          <H id="output">Output and verification</H>
          <p>The results dashboard shows:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>the ordering, with each item&apos;s move relative to the initial order;</li>
            <li>the objective in your own units, the initial objective and the change;</li>
            <li>the backward weight <Tex>{"\\beta=\\tfrac12(W-F_A)\\ge0"}</Tex>: total margin of pairs placed against their preference;</li>
            <li>runtime, solver and the verification checklist.</li>
          </ul>
          <p>A percentage improvement is shown only when the baseline is strictly positive. For zero or negative baselines the absolute change is reported, because a ratio would be meaningless. The β reduction is always well defined when the initial β is positive. The pairwise tab lists every ordered pair&apos;s contribution in your units.</p>

          <H id="export">Export and re-import</H>
          <p><strong>JSON</strong> contains the exact input (as fraction strings), interpretation, model identity and offset S, solver and configuration, status, ordering (by name), exact objectives, verification results, timestamps and version. <strong>CSV</strong> lists position, item and original index. The <strong>summary report</strong> (Markdown) is human-readable, and <em>Print / PDF</em> uses the browser&apos;s print dialog. Loading an exported JSON file restores the instance and uses the exported ordering as the initial order, so the result can be re-verified or improved.</p>

          <H id="capacity">Runtime and capacity</H>
          <p>Browser solvers run in a background Web Worker, so the page stays responsive. You set a time limit of 0.1–600 s, and a watchdog terminates the worker 3 s after it. Memory use is dominated by the subset DP (about 9 bytes × 2ⁿ, roughly 10 MB at n = 20). Measured in Chrome on one 2.1 GHz Xeon core: the subset DP takes about 30 ms at n = 15 and about 0.5 s at n = 20. ATLAS-032 memory is capped by its state budget per component (default 1.5 million states; lowered automatically on devices that report 2 GB of memory or less). Since Studio 2.0 the cut-bounded DP stores its states in flat typed arrays: on the benchmark instances in <span className="font-mono">benchmarks/studio-039</span> it explores exactly the same states 2.1–3.0× faster, with peak memory reduced from about 700 MB to about 400 MB on the largest one (Node 22, one 2.3 GHz Xeon core). The independent certificate verifier is intentionally simple and can take much longer than the solve (7.9 s versus 0.9 s for the 60-item example). AutoCut ranges from milliseconds to seconds for n ≤ 9 depending on λ. Exact solving is exponential in the worst case; for large instances use the heuristic and treat its output as feasible only.</p>

          <H id="examples">Worked examples</H>
          <p><strong>1. Weighted completion time with a contamination penalty (cost).</strong> Jobs A (p = 3, w = 1), B (p = 1, w = 2) and C (p = 2, w = 2). The pairwise cost of i before j is <Tex>{"p_iw_j"}</Tex>, and running A anywhere before C adds 4.</p>
          <Code>{`,A,B,C
A,0,6,10
B,1,0,2
C,2,4,0`}</Code>
          <p>With the cost interpretation, S = 25. The optimum is <strong>B, C, A</strong> with pairwise cost 5, so F_A = S − 2·5 = 15. Adding the constant Σ w_j p_j = 9 gives a total weighted completion time of 14, the same order that Smith&apos;s ratio rule gives here. For reference, the six orderings ABC, ACB, BAC, BCA, CAB and CBA cost 18, 20, 13, 5, 12 and 7.</p>
          <p><strong>2. Pairwise preferences with fractions (benefit).</strong></p>
          <Code>{`x,y,2
y,x,5
x,z,1.5
z,y,1/2
y,z,3`}</Code>
          <p>As a benefit edge list: S = 12, and the optimum is <strong>y, x, z</strong> with total benefit 19/2 = 9.5 (F_A = 7). The Studio shows the value as “9.5 (= 19/2)”.</p>
          <Callout title="Try them">Both examples can be pasted into the <Link className="text-accent-600 underline" href="/studio/">Studio</Link>. Choose “Matrix” or “Edge list” format and the stated interpretation.</Callout>

          <H id="developers">For developers</H>
          <p><strong>Internal representation.</strong> Every input (matrix, edge list, JSON, CSV/TSV) is parsed into names plus exact rationals, then turned into a skew-symmetric matrix A by the chosen interpretation (skew: as given; benefit: A = C − Cᵀ; cost: A = Dᵀ − D). Solvers use M = scale · A, an integer matrix when every partial sum fits in 2⁵³ (otherwise floating point and no optimality claims). A generic weighted digraph is never reinterpreted silently: benefit or cost must be chosen when the matrix is not skew-symmetric.</p>
          <p><strong>Architecture</strong> (<span className="font-mono">website/src/lib/studio/</span>): <span className="font-mono">parse.ts</span> → <span className="font-mono">model.ts</span> → <span className="font-mono">select.ts</span> (recommendation) → <span className="font-mono">runner.ts</span> in <span className="font-mono">studio.worker.ts</span> → solvers (<span className="font-mono">solvers.ts</span>, <span className="font-mono">atlas.ts</span>, <span className="font-mono">cutdp.ts</span>, <span className="font-mono">bounds/packing.ts</span>, <span className="font-mono">decompose.ts</span>, <span className="font-mono">autocut.ts</span>) → <span className="font-mono">report.ts</span>. Certificates are checked by <span className="font-mono">certverify.ts</span> in <span className="font-mono">verify.worker.ts</span>.</p>
          <Code>{`cd website && npm ci
npx tsc --noEmit && npm run lint
npx vitest run                     # unit and regression tests
npm run build                      # static export to out/
npx playwright test                # end-to-end (needs a browser)
node scripts/build-atlas032-data.mjs   # regenerate benchmark data from benchmarks/atlas-032`}</Code>

          <H id="privacy">Privacy and security</H>
          <p>The Studio is a static web application. Parsing, solving and exporting happen in your browser, and your data is not transmitted. If a deployment configures a remote job service, the Studio says so and sends data only when you press “Submit job”. The service keeps jobs in memory only and deletes them after an hour. The site sets no cookies and includes no analytics.</p>
        </article>
      </div>
    </>
  );
}
