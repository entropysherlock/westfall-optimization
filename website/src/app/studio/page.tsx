import Link from "next/link";
import Studio from "@/components/studio/Studio";

export const metadata = {
  title: "Optimization Studio",
  description: "Upload a weighted ordering problem, solve it exactly or heuristically in your browser, verify the objective and export the result.",
};

export default function StudioPage() {
  return (
    <>
      <header className="border-b border-line bg-ink-900">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-3 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="kicker">Westfall Optimization Studio</p>
            <h1 className="h-display mt-2 text-3xl sm:text-[34px]">Optimize an ordering</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-fog-400">
              Load pairwise data, inspect the model, run an exact or heuristic solver, and export a verified result. Computation runs locally in your browser.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href="/docs/" className="font-medium text-accent-600 hover:underline">Documentation</Link>
            <Link href="/docs/#statuses" className="font-medium text-accent-600 hover:underline">What the statuses mean</Link>
            <Link href="/verify/" className="font-medium text-accent-600 hover:underline">Certificate verifier</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[92rem] px-5 py-8 sm:px-8">
        <Studio />
      </div>
    </>
  );
}
