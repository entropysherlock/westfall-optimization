import Explainer from "@/components/Explainer";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "How BLX works" };

export default function Page() {
  return (
    <>
      <PageHeader kicker="Exclusion dynamic programming" title="Why BLX can skip most of the search space — safely">
        Step through a real exclusion-DP run on a 7-vertex instance with two cyclic blocks. Each prefix state is either retained or excluded by an exact inequality.
        The trace is computed live in your browser from the code in <code className="text-cyan-300">website/src/lib/engine.ts</code>.
      </PageHeader>
      <div className="mx-auto max-w-page px-5 py-10 sm:px-8">
        <Explainer />
      </div>
    </>
  );
}
