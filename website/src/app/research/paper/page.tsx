import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { EvidenceTag, PageHeader, ButtonLink } from "@/components/ui";
import { loadRepoFile } from "@/lib/data";
import { blob } from "@/lib/site";

export const metadata = { title: "Manuscript — Square-Root Block Localization" };

export default function Paper() {
  const md = loadRepoFile("papers/square-root-block-localization-v2.md").replace(/^# .*\n/, "");
  return (
    <>
      <PageHeader kicker="Provisional manuscript · v2 (Discovery 019)" title="Square-Root Block Localization for Exact Weighted Linear Ordering">
        <div className="flex flex-wrap gap-2"><EvidenceTag kind="provisional" /></div>
        <p className="mt-3">Historical Discovery 019 manuscript, preceding the provisional Westfall Structural Optimization Theorem (Discovery 022). Caleb Westfall, with Claude (Anthropic) as AI research collaborator. Not peer-reviewed.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/research/manuscript/" primary>Read the newer Westfall theorem →</ButtonLink><ButtonLink href={blob("papers/square-root-block-localization-v2.md")} external>019 Markdown source ↗</ButtonLink>
          <ButtonLink href={blob("research/discovery-019/WESTFALL_Discovery_019_Report.md")} external>Discovery 019 report ↗</ButtonLink>
          <ButtonLink href={blob("papers/block-localized-exclusion-v1.md")} external>Previous version (v1) ↗</ButtonLink>
        </div>
      </PageHeader>
      <article className="prose-research mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{md}</ReactMarkdown>
      </article>
    </>
  );
}
