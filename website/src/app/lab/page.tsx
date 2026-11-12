import LabApp from "@/components/LabApp";
import { PageHeader } from "@/components/ui";
import { loadPresets } from "@/lib/data";
import { blob } from "@/lib/site";

export const metadata = { title: "BLX Laboratory" };

export default function Lab() {
  return (
    <>
      <PageHeader kicker="Interactive laboratory" title="Run an exact ordering optimization">
        Choose a problem, pick an exact algorithm, and inspect the result. Everything below runs in your browser.
        Preset problems also carry the result and exact certificate produced by the real Python BLX 2.0 solver, which you can re-verify here.
        To run BLX 2.0 itself, install the <a className="text-cyan-300 underline" href={blob("README.md")}>Python package</a>.
      </PageHeader>
      <div className="mx-auto max-w-page px-5 py-10 sm:px-8">
        <LabApp presets={loadPresets()} />
      </div>
    </>
  );
}
