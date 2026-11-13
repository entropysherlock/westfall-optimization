import fs from "fs";
import path from "path";
import BenchmarkDashboard from "@/components/BenchmarkDashboard";
import { BenchTable, SpeedScatter, type BenchRow } from "@/components/AutoCutBench";
import { ButtonLink, Callout, EvidenceTag, PageHeader, Section, Stat } from "@/components/ui";
import { blob, leanBlob, tree } from "@/lib/site";

export const metadata = { title: "Benchmarks", description: "Measured results with provenance, time limits and unsolved cases: AutoCut algorithm generations, exact oracle comparisons and the historical BLX benchmark series." };

interface BenchFile { source: string; time_limit_s: number; hardware: string; summary: Record<string, unknown>; rows: BenchRow[] }

export default function Benchmarks() {
  const data: BenchFile = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/autocut-m025.json"), "utf8"));
  const rows = data.rows;
  const done = rows.filter((r) => r.status === "PASS");
  const shared = done.filter((r) => r.ms_memo !== null && r.ms_memo !== undefined && r.ms_memo >= 200 && (r.ms_costed ?? 0) > 0);
  const speed = shared.map((r) => r.ms_memo! / r.ms_costed!).sort((a, b) => a - b);
  const median = speed.length ? speed[Math.floor(speed.length / 2)] : 0;
  const notDone = rows.filter((r) => r.status !== "PASS");
  return (
    <>
      <PageHeader kicker="Benchmarks · measured, with provenance" title="Empirical evaluation">
        Each data set below has its own provenance, hardware and time limit, and they are never pooled into one headline number. Unsolved cases are listed. The comparisons are between our own algorithm generations and our own reference solvers. They are <strong>not</strong> evidence of superiority over commercial or specialized optimization software, and no such comparison has been made.
        <div className="mt-4 flex flex-wrap gap-2"><EvidenceTag kind="observed" /></div>
      </PageHeader>

      <Section kicker="A · Internal algorithm generations" title="Verified AutoCut: three implementations of one algorithm"
        intro={<>The same 119 adversarial instances (fixed seeds) run through the deterministic executable (<span className="font-mono text-base">autoCutX</span>), the memoised version (<span className="font-mono text-base">autoCutM</span>) and the costed, re-engineered version (<span className="font-mono text-base">autoCutC</span>). All three are proved to return identical outputs. Time limit {data.time_limit_s} s per run; hardware: Intel Xeon @ 2.10 GHz container, 2 vCPU, 7.8 GB RAM, one process per core.</>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Completed (autoCutC)" value={`${done.length} / ${rows.length}`} hint={`${notDone.length} not completed within ${data.time_limit_s} s`} />
          <Stat label="Exact-oracle agreement" value={`${done.length} / ${done.length}`} hint="value, ordering, λ, certificate, k bound, cut-count bound" />
          <Stat label="Speed vs autoCutM" value={`${speed.length ? speed[0].toFixed(1) : "—"}–${speed.length ? speed[speed.length - 1].toFixed(1) : "—"}×`} hint={`median ${median.toFixed(1)}× on ${shared.length} shared instances (autoCutM ≥ 200 ms)`} />
          <Stat label="Completed (autoCutM / autoCutX)" value="83 / 60" hint="same inputs and limits; identical outputs where both finished" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <SpeedScatter rows={rows} />
          <div className="space-y-4">
            <Callout title="How to read this">
              These are successive versions of our own verified algorithm. The improvement comes from engineering (computing the node set once per round instead of once per query), not from a new mathematical idea. Nothing here compares AutoCut with other solvers.
            </Callout>
            <Callout tone="warn" title={`Not completed (${notDone.length})`}>
              {notDone.map((r) => `#${r.id} ${r.family.replace(/_/g, " ")} (n = ${r.n})`).join(", ")}. All stopped at the time limit; none produced an error or a wrong answer.
            </Callout>
            <p className="text-sm text-fog-500">Raw data: <a className="text-accent-600 underline" href={leanBlob("tests/m025/costed_raw.txt")}>costed_raw.txt</a>, <a className="text-accent-600 underline" href={leanBlob("tests/m025/costed_comparison.json")}>costed_comparison.json</a>, <a className="text-accent-600 underline" href={leanBlob("tests/check_costed_results.py")}>checker script</a>, and the <a className="text-accent-600 underline" href={leanBlob("MISSION_025_REPORT.md")}>report</a>.</p>
          </div>
        </div>
        <div className="mt-10"><BenchTable rows={rows} /></div>
      </Section>

      <Section muted kicker="B · Exact oracle comparisons" title="Correctness checks against independent references">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-6"><p className="font-mono text-2xl">103 / 103</p><h3 className="mt-2 font-semibold">Lean executable vs exhaustive oracle</h3><p className="mt-2 text-sm text-fog-400">For every completed run: optimum, ordering, λ(A), partition certificate and the k-bound were recomputed by exhaustive enumeration in exact arithmetic.</p></div>
          <div className="card p-6"><p className="font-mono text-2xl">103 / 103</p><h3 className="mt-2 font-semibold">Browser AutoCut vs Lean executable</h3><p className="mt-2 text-sm text-fog-400">The Studio&apos;s TypeScript port reproduces the Lean output exactly (value, ordering, partition, λ, k, cut counts). It is a test in the website&apos;s CI, and it is not a proof.</p></div>
          <div className="card p-6"><p className="font-mono text-2xl">119 / 119</p><h3 className="mt-2 font-semibold">Browser AutoCut vs enumeration</h3><p className="mt-2 text-sm text-fog-400">The port&apos;s optimum equals the exhaustive optimum on all 119 archived instances, including the 16 the Lean run did not complete.</p></div>
        </div>
      </Section>

      <Section kicker="C · Reported study (original manuscript)" title="AutoCut prototype versus BLX 2.0 and packing SLDP"
        intro="These figures are transcribed from the original research report. They were not regenerated from its original code, so they stay separate from the reproducible data sets.">
        <div className="grid gap-4 md:grid-cols-3">
          {[["BLX 2.0", "20 / 20"], ["Packing SLDP", "20 / 20"], ["AutoCut prototype", "7 / 20"]].map(([s, v]) => (
            <div key={s} className="card p-6"><p className="label">{s}</p><p className="mt-2 font-mono text-3xl">{v}</p><p className="mt-1 text-xs text-fog-500">instances solved to proven optimality (reported)</p></div>
          ))}
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-fog-400">All solvers reportedly agreed wherever they finished. The prototype was slower on every instance it solved. The structural algorithm is a theoretical contribution, and on this study it is not the fastest exact method.</p>
        <div className="mt-5"><ButtonLink href={blob("research/discovery-022/WESTFALL_Discovery_022_Report.md")} external>Original benchmark table ↗</ButtonLink></div>
      </Section>

      <section className="border-t border-line bg-ink-900">
        <div className="mx-auto max-w-page px-5 pt-16 sm:px-8">
          <p className="kicker">D · Historical BLX series and baseline methods</p>
          <h2 className="h-display mt-3 text-[28px] sm:text-[34px]">BLX, packing SLDP and HiGHS MILP</h2>
          <p className="lede mt-4 max-w-3xl">This dashboard is generated from raw logs published in <a className="text-accent-600 underline" href={tree("benchmarks/data")}>benchmarks/data</a> by <a className="text-accent-600 underline" href={blob("scripts/build_site_data.py")}>build_site_data.py</a>. It compares our exact solvers with a general-purpose MILP baseline (HiGHS) on the earlier benchmark series. It contains no AutoCut measurements.</p>
        </div>
        <div className="mx-auto max-w-page px-5 py-10 sm:px-8"><BenchmarkDashboard /></div>
      </section>

      <Section kicker="Reproduce" title="Definitions and commands">
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-fog-300">
            <li><strong>Completed</strong>: the solver returned within the time limit. <strong>PASS</strong>: every returned field matches an independent exhaustive computation in exact arithmetic.</li>
            <li><strong>Counted cost</strong>: the step count of the Lean cost semantics (a model, not CPU cycles). Measured time per counted step ranged over 12–583 ns.</li>
            <li><strong>Time</strong>: wall-clock time of a native Lean binary, with the two generations run concurrently on separate cores.</li>
            <li>Inputs are fixed by the seeds 23023 and 24024 (<span className="font-mono">memo_instances.json</span>).</li>
          </ul>
          <pre className="overflow-x-auto rounded-lg border border-line bg-ink-900 p-4 text-[12.5px] leading-relaxed text-fog-300">{`git checkout formal/westfall-theorem && cd lean
lake build westfall-costed-bench westfall-memo-bench
python tests/run_with_rss.py .lake/build/bin/westfall-costed-bench \\
       tests/m025/costed_raw.txt 3600
cd tests && python3 check_costed_results.py`}</pre>
        </div>
      </Section>
    </>
  );
}
