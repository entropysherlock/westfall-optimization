import Link from "next/link";
import { ButtonLink, Callout, PageHeader, Section, Stat } from "@/components/ui";
import { REPO } from "@/lib/site";
import { CS, cells, greedy, localSearch, n, optimum, optimumF, orderingsSci, pairs, reductionPct, violatedPairs } from "@/lib/caseStudy40";

export const metadata = {
  title: "Case study: 40 items, one proven best sequence",
  description: `On a reproducible 40-item sequencing benchmark, ATLAS found the lowest-penalty ordering, ${reductionPct.toFixed(1)}% below a greedy baseline, with an independently checkable proof of optimality.`,
};

const EVIDENCE = `${REPO}/tree/main/benchmarks/case-study-40`;
const fmtPct = reductionPct.toFixed(1);
const t = CS.timing;

function PenaltyChart() {
  const rows: { label: string; sub: string; value: number; tone: "base" | "mid" | "best" }[] = [
    { label: "Greedy baseline", sub: "take the most-preferred remaining item, repeatedly", value: greedy, tone: "base" },
    { label: "Greedy + local search", sub: "a standard improvement heuristic; no proof", value: localSearch, tone: "mid" },
    { label: "Proven optimum", sub: "ATLAS (also reached by HiGHS)", value: optimum, tone: "best" },
  ];
  const max = greedy / 0.88; // leave room for the value label after the longest bar
  const floorPct = (optimum / max) * 100;
  const color = { base: "bg-fog-500/70", mid: "bg-accent-300", best: "bg-accent-600" };
  return (
    <figure className="card p-6 sm:p-8">
      <figcaption className="mb-6 text-sm text-fog-400">Penalty: total weight of violated preferences. Lower is better.</figcaption>
      <div className="relative space-y-5">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center sm:gap-5">
            <div>
              <div className="text-sm font-semibold text-fog-100">{r.label}</div>
              <div className="text-xs text-fog-500">{r.sub}</div>
            </div>
            <div className="relative h-9">
              <div className={`h-full rounded-md ${color[r.tone]}`} style={{ width: `${(r.value / max) * 100}%` }} />
              <span className="absolute inset-y-0 flex items-center pl-3 font-mono text-sm font-semibold text-fog-100" style={{ left: `${(r.value / max) * 100}%` }}>{r.value}</span>
            </div>
          </div>
        ))}
        <div className="pointer-events-none absolute inset-y-[-8px] hidden sm:block" style={{ left: `calc(200px + 1.25rem + (100% - 200px - 1.25rem) * ${floorPct / 100})` }} aria-hidden>
          <div className="h-full border-l-2 border-dashed border-navy-900/60" />
        </div>
      </div>
      <p className="mt-6 flex items-start gap-2 text-sm text-fog-300">
        <span className="mt-1.5 inline-block h-3 w-0 border-l-2 border-dashed border-navy-900/60" aria-hidden />
        <span><strong className="text-fog-100">Proven floor at {optimum}.</strong> The certificate shows that no ordering of these {n} items has a penalty below {optimum}.</span>
      </p>
    </figure>
  );
}

function PreferenceMap({ title, order, note }: { title: string; order: number[]; note: string }) {
  const s = 7;
  const size = n * s;
  return (
    <figure className="card p-5">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="font-semibold text-fog-100">{title}</span>
        <span className="font-mono text-xs text-fog-500">{violatedPairs(order)} of {pairs} pairs violated</span>
      </figcaption>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full" role="img" aria-label={`${title}: ${violatedPairs(order)} violated preferences`}>
        <rect width={size} height={size} fill="#f8fafc" />
        {cells(order).map(({ r, t: c, w }) => (
          <rect key={`${r}-${c}`} x={c * s} y={r * s} width={s - 0.6} height={s - 0.6}
            fill={w > 0 ? "#0d9488" : w < 0 ? "#b42318" : "#e2e8f0"} fillOpacity={w === 0 ? 1 : 0.25 + (0.75 * Math.abs(w)) / 5} />
        ))}
      </svg>
      <p className="mt-3 text-xs leading-relaxed text-fog-500">{note}</p>
    </figure>
  );
}

export default function CaseStudy40() {
  return (
    <>
      <PageHeader kicker="Case study · reproducible benchmark" title={<>{n} items. One proven best sequence.</>}>
        On a {n}-item sequencing benchmark, ATLAS found the ordering with the lowest possible penalty, <strong>{fmtPct}% lower than a greedy baseline</strong>. It also exported a proof that no better ordering exists, which anyone can check in milliseconds.
      </PageHeader>

      <div className="mx-auto max-w-page px-5 pt-10 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Penalty" value={<>{greedy} → {optimum}</>} hint="greedy baseline → proven optimum" />
          <Stat label="Improvement" value={`${fmtPct}% lower`} hint="relative to the greedy baseline only" />
          <Stat label="Status" value="Proved optimal" hint={`certificate verified independently in ${t.certificateCheckS} s`} />
          <Stat label="ATLAS runtime" value={`${(t.atlasRecordedMs / 1000).toFixed(3)} s`} hint={`HiGHS proves the same optimum in ${t.highsRecordedS} s`} />
        </div>
      </div>

      <Section kicker="The problem" title="Putting 40 things in the best order"
        intro={<>Sequencing jobs, ranking options or scheduling tasks all come down to the same question: in what order? Here each of the {pairs} pairs of items carries a weight saying how strongly one should come before the other. An ordering&apos;s <strong>penalty</strong> is the total weight of the preferences it breaks. There are about {orderingsSci.mantissa} × 10<sup>{orderingsSci.exp}</sup> possible orderings, far too many to try.</>}>
        <PenaltyChart />
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-fog-400">
          The greedy baseline leaves {greedy - optimum} penalty points on the table. A standard local-search clean-up recovers almost all of them, reaching {localSearch}. But only a proof can say how close that is to the best possible, and here the proof says the floor is {optimum}.
        </p>
      </Section>

      <Section muted kicker="What changed" title="Every broken preference, before and after"
        intro="Each square is one pair of items, placed in the order the method chose. Teal means the preference is kept; red means it is broken. Darker means a heavier weight.">
        <div className="grid gap-5 md:grid-cols-2">
          <PreferenceMap title={`Greedy · penalty ${greedy}`} order={CS.orders.greedy} note="The greedy rule commits to early choices it cannot revisit, leaving heavy broken preferences scattered through the order." />
          <PreferenceMap title={`Proven optimum · penalty ${optimum}`} order={CS.orders.atlas} note={`The remaining red squares cannot be removed: every ordering of these items breaks at least ${optimum} points of preference.`} />
        </div>
      </Section>

      <Section kicker="Speed, stated plainly" title="Fast enough, and checkable">
        <div className="overflow-x-auto rounded-xl border border-line bg-white" tabIndex={0} role="region" aria-label="Runtime comparison">
          <table className="table-clean">
            <thead><tr><th>Solver</th><th>Result</th><th>Time</th><th>Proof you can check yourself</th></tr></thead>
            <tbody>
              <tr><td className="font-semibold text-fog-100">ATLAS-032</td><td>penalty {optimum}, optimal</td><td className="font-mono">{(t.atlasRecordedMs / 1000).toFixed(3)} s</td><td>Yes: exported certificate, verified in {t.certificateCheckS} s by an independent checker</td></tr>
              <tr><td className="font-semibold text-fog-100">HiGHS 1.16 (exact MILP, zero gap)</td><td>penalty {CS.verified.highsF === optimumF ? optimum : "—"}, optimal</td><td className="font-mono">{t.highsRecordedS} s</td><td>No: the solver&apos;s &ldquo;Optimal&rdquo; status must be trusted</td></tr>
              <tr><td className="font-semibold text-fog-100">Greedy + local search</td><td>penalty {localSearch}</td><td className="font-mono">&lt; 0.1 s</td><td>No: cannot tell how far it is from the best</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-fog-500">{t.hardware}. ATLAS and HiGHS times are the recorded benchmark runs; an independent re-run on the same specification gave medians of {(t.atlasRerunMedianMs / 1000).toFixed(2)} s and {t.highsRerunMedianS} s.</p>
        <div className="mt-6">
          <Callout title="HiGHS is faster on this instance">
            A general-purpose open-source MILP solver proves the same optimum about 5–6× faster ({t.highsRecordedS} s against {(t.atlasRecordedMs / 1000).toFixed(3)} s recorded; {t.highsRerunMedianS} s against {(t.atlasRerunMedianMs / 1000).toFixed(2)} s re-run). The {fmtPct}% figure compares ATLAS with a greedy heuristic, not with HiGHS, Gurobi or any other exact solver. What ATLAS adds here is the certificate: a compact proof of optimality that does not require trusting the solver.
          </Callout>
        </div>
      </Section>

      <Section muted kicker="Scope" title="What this shows, and what it does not">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <p className="font-semibold text-fog-100">Shows</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-fog-300">
              <li>On this {n}-item instance, the best possible penalty is exactly {optimum}, and that is proved.</li>
              <li>A simple greedy rule is {fmtPct}% worse than optimal; a cheap clean-up gets within {localSearch - optimum} points.</li>
              <li>Every number can be reproduced from the published generator, seed and scripts.</li>
            </ul>
          </div>
          <div className="card p-6">
            <p className="font-semibold text-fog-100">Does not show</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-fog-300">
              <li>Savings on a real production line or business process. This is a synthetic benchmark, not customer data.</li>
              <li>That ATLAS is faster than exact solvers. On this instance HiGHS is faster.</li>
              <li>That results generalize: other instances can be much harder, and some remain unproved within time limits (see <Link href="/benchmarks/" className="link">Benchmarks</Link>).</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section kicker="Evidence" title="Reproduce every number"
        intro={<>The instance is <span className="font-mono text-[0.92em]">{CS.instance}</span>, generated by <span className="font-mono text-[0.92em]">{CS.generator}</span>. Greedy rule: {CS.greedyRule}.</>}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {([
            [EVIDENCE, "Case-study evidence folder", "Matrix, all orderings, timings, certificate and the independent verifier."],
            [`${EVIDENCE}/verification.json`, "Independent verification", "Matrix regenerated, greedy recomputed, certificate checked, HiGHS re-run."],
            [`${REPO}/blob/main/benchmarks/atlas-032/results_E.json`, "Recorded ATLAS benchmark", `The ${(t.atlasRecordedMs / 1000).toFixed(3)} s run (field "ms": ${t.atlasRecordedMs}).`],
          ] as const).map(([href, title, text]) => (
            <li key={href}>
              <a href={href} className="card block h-full p-5 hover:border-accent-600/40">
                <span className="font-semibold text-fog-100">{title} ↗</span>
                <span className="mt-1 block text-sm text-fog-400">{text}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/studio/" primary>Try your own sequence in the Studio</ButtonLink>
          <ButtonLink href="/benchmarks/">See all benchmarks</ButtonLink>
        </div>
      </Section>
    </>
  );
}
