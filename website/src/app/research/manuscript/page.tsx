import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { PageHeader, ButtonLink, EvidenceTag } from "@/components/ui";
import { loadRepoFile } from "@/lib/data";
import { blob } from "@/lib/site";

export const metadata = {
  title: "Westfall Structural Optimization Theorem — Full research manuscript",
  description: "Original research manuscript, preserved verbatim as an archival record. Consult the formal verification page for the current proof status.",
};

export default function WestfallManuscript() {
  const source = loadRepoFile("research/discovery-022/WESTFALL_Discovery_022_Report.md")
    .replace(/^# .*\n/, "");
  return <>
    <PageHeader kicker="Original full research report · November 12, 2026" title="The Westfall Structural Optimization Theorem">
      <p>Automatic Structural Decomposition for Exact Weighted Linear Ordering. The report below is published in full, as originally authored. The partition-discovery result is now called the <strong>Westfall Partition Recovery Theorem.</strong></p>
      <div className="mt-4 flex flex-wrap gap-2"><EvidenceTag kind="provisional" /></div>
      <p className="mt-3 text-sm">This is a complete <em>written</em> research report, not a peer-reviewed manuscript or a completed Lean verification. Its historical status notes describe the original local branch; the source document is now publicly archived.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href={blob("research/discovery-022/WESTFALL_Discovery_022_Report.md")} external primary>Original Markdown source ↗</ButtonLink>
        <ButtonLink href="/research/discovery-022/">Theorem overview</ButtonLink>
        <ButtonLink href="/formal-verification/">Proof verification status</ButtonLink>
      </div>
    </PageHeader>
    <article className="prose-research mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <ReactMarkdown remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[rehypeKatex]}>{source}</ReactMarkdown>
    </article>
  </>;
}
