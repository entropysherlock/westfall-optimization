import Link from "next/link";
import { Callout, PageHeader } from "@/components/ui";
import { Tex } from "@/components/Tex";

export const metadata = { title: "Documentation", description: "Westfall Optimization Studio: problem specification, input formats, validation, solvers, statuses, verification, exports and limits." };

const toc: [string, string][] = [
  ["model", "Problem specification"],
  ["input-formats", "Input formats"],
  ["conventions", "Edge cases and conventions"],
  ["validation", "Validation and limits"],
  ["solvers", "Solver selection"],
  ["statuses", "Statuses and guarantees"],
  ["output", "Output and verification"],
  ["export", "Export and re-import"],
  ["capacity", "Runtime and capacity"],
  ["examples", "Worked examples"],
  ["privacy", "Privacy and security"],
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-24 border-t border-line pt-10 text-2xl font-semibold tracking-tight text-fog-100 first:border-0 first:pt-0">{children}</h2>;
}
function Code({ children }: { children: string }) {
  return <pre className="my-4 overflow-x-auto rounded-lg border border-line bg-ink-900 p-4 font-mono text-[12.5px] leading-relaxed text-fog-300">{children}</pre>;
}

export default function Docs() {
  return (
    <>
      <PageHeader kicker="Documentation" title="Westfall Optimization Studio">
        Everything needed to prepare data, choose a solver and interpret the result. For programmatic access to the remote solver service, see the <Link className="text-accent-600 underline" href="/docs/api/">job API</Link>.
      </PageHeader>
      <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Documentation contents" className="lg:sticky lg:top-24 lg:self-start">
          <p className="label">Contents</p>
          <ol className="mt-3 space-y-1.5 text-sm">{toc.map(([id, t]) => <li key={id}><a href={`#${id}`} className="text-fog-400 hover:text-accent-600">{t}</a></li>)}</ol>
        </nav>
        <article className="max-w-3xl space-y-5 text-[15px] leading-relaxed text-fog-300">
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
                <tr><td className="text-fog-100">AutoCut structural solver</td><td>n ≤ 9</td><td>optimal + λ(A) partition</td><td>you want the structural decomposition</td></tr>
                <tr><td className="text-fog-100">Exact subset DP</td><td>n ≤ 20</td><td>optimal</td><td>small to medium instances; real progress reporting</td></tr>
                <tr><td className="text-fog-100">Exact exclusion DP</td><td>n ≤ 26</td><td>optimal if it completes within 3 million states</td><td>structured instances somewhat beyond the subset DP</td></tr>
                <tr><td className="text-fog-100">Local search</td><td>n ≤ 400</td><td>none (feasible)</td><td>large instances, quick answers</td></tr>
                <tr><td className="text-fog-100">Remote: BLX 2.0, MILP, subset DP</td><td>service limits</td><td>optimal only when proved</td><td>if a job service is configured (see API)</td></tr>
              </tbody>
            </table>
          </div>
          <p>The browser AutoCut is a TypeScript port of the Lean-verified algorithm. It reproduces the Lean executable&apos;s output exactly on 103 archived instances, but it is not itself formally verified. No browser solver is the Lean executable.</p>

          <H id="statuses">Statuses and guarantees</H>
          <dl className="space-y-3">
            <div><dt className="font-semibold text-fog-100">Optimality established</dt><dd>An exact solver completed under its stated assumptions, in exact integer arithmetic. The ordering is a global optimum, though other optimal orderings may exist.</dd></div>
            <div><dt className="font-semibold text-fog-100">Feasible solution only</dt><dd>A heuristic returned the ordering, an exact search was interrupted (state budget), or arithmetic was not exact. No optimality claim is made, even if the ordering happens to be optimal.</dd></div>
            <div><dt className="font-semibold text-fog-100">Verification passed</dt><dd>The ordering is a valid permutation, its objective was recomputed exactly from your original data, the transformation identity holds, and any independent check that ran (exhaustive enumeration for n ≤ 9, or a second exact method) agreed.</dd></div>
            <div><dt className="font-semibold text-fog-100">Lean-verified implementation</dt><dd>Never shown for browser runs. The claim applies only to the compiled Lean executable on the research branch (see <Link className="text-accent-600 underline" href="/formal-verification/">Verification</Link>).</dd></div>
          </dl>
          <p>A run that exceeds its time limit, or that you cancel, produces <em>no</em> result. The worker is terminated and partial work is discarded.</p>

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
          <p>Browser solvers run in a background Web Worker, so the page stays responsive. You set a time limit of 0.1–600 s, and a watchdog terminates the worker 3 s after it. Memory use is dominated by the subset DP (about 9 bytes × 2ⁿ, roughly 10 MB at n = 20). Measured in Chrome on one 2.1 GHz Xeon core: the subset DP takes about 30 ms at n = 15 and about 0.5 s at n = 20. AutoCut ranges from milliseconds to seconds for n ≤ 9 depending on λ. Exact solving is exponential in the worst case; for large instances use the heuristic and treat its output as feasible only.</p>

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

          <H id="privacy">Privacy and security</H>
          <p>The Studio is a static web application. Parsing, solving and exporting happen in your browser, and your data is not transmitted. If a deployment configures a remote job service, the Studio says so and sends data only when you press “Submit job”. The service keeps jobs in memory only and deletes them after an hour. The site sets no cookies and includes no analytics.</p>
        </article>
      </div>
    </>
  );
}
