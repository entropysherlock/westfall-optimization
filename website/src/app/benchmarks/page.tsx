import BenchmarkDashboard from "@/components/BenchmarkDashboard";
import { EvidenceTag, PageHeader } from "@/components/ui";
import { blob, tree } from "@/lib/site";

export const metadata = { title: "Benchmarks" };

export default function Benchmarks() {
  return (
    <>
      <PageHeader kicker="Reproducible benchmark dashboard" title="Where BLX helps — and where it does not">
        Historical results from Discoveries 018–019, parsed directly from the raw logs in <a className="text-cyan-300 underline" href={tree("benchmarks/data")}>benchmarks/data</a> by
        <a className="ml-1 text-cyan-300 underline" href={blob("scripts/build_site_data.py")}>scripts/build_site_data.py</a>. Nothing on this page is entered by hand.
        <div className="mt-4 flex flex-wrap gap-2"><EvidenceTag kind="observed" /></div>
      </PageHeader>
      <div className="mx-auto max-w-page px-5 py-10 sm:px-8"><BenchmarkDashboard /></div>
    </>
  );
}
