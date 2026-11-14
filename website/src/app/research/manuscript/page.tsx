import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ButtonLink, EvidenceTag, PageHeader } from "@/components/ui";
import { loadRepoFile } from "@/lib/data";
import { blob } from "@/lib/site";
import { slug } from "@/lib/slug";

export const metadata = {
  title: "White paper: exact weighted linear ordering with verifiable guarantees",
  description:
    "The Westfall Optimization white paper: the structural theory, cut-counting results, the ATLAS engine, certificates, a 40-item case study, limitations and open problems, each with its verification status.",
};

const SOURCE = "research/WHITE_PAPER.md";

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
  return "";
}

export default function WhitePaper() {
  const raw = loadRepoFile(SOURCE);
  // The page header carries the title, author and version; the article starts at the status note.
  const body = raw.slice(raw.indexOf("> **Status of this document.**"));
  const toc = [...body.matchAll(/^## (.+)$/gm)].map((m) => ({ text: m[1].trim(), id: slug(m[1].trim()) }));

  const tocList = (
    <ol className="space-y-1.5 text-sm">
      {toc.map((t) => (
        <li key={t.id}><a href={`#${t.id}`} className="block text-fog-400 hover:text-accent-600">{t.text}</a></li>
      ))}
    </ol>
  );

  return (
    <>
      <PageHeader kicker="White paper · version 1.0 · 14 November 2026" title="Exact weighted linear ordering with verifiable guarantees">
        <p>
          Structure, algorithms, certificates and machine-checked proofs: the complete Westfall Optimization research program
          in one document, by Caleb Westfall. Every result is labelled with exactly what supports it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <EvidenceTag kind="lean">Lean kernel-checked theorems</EvidenceTag>
          <EvidenceTag kind="proved">Paper proofs</EvidenceTag>
          <EvidenceTag kind="tested">Exact computation</EvidenceTag>
          <EvidenceTag kind="open">Open problems</EvidenceTag>
        </div>
        <p className="mt-3 text-sm">Not peer reviewed. Novelty has been screened against the literature but not independently established.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={blob(SOURCE)} external primary>Markdown source ↗</ButtonLink>
          <ButtonLink href="/formal-verification/">Verification status</ButtonLink>
          <ButtonLink href="/research/report-022/">Original structural report (full proofs)</ButtonLink>
        </div>
      </PageHeader>

      <div className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="White paper contents" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="label mb-3">Contents</p>
            {tocList}
          </div>
        </nav>
        <div>
          <details className="card mb-8 p-4 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-fog-100">Contents</summary>
            <div className="mt-3">{tocList}</div>
          </details>
          <article className="prose-research max-w-3xl" data-testid="white-paper">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h2: ({ children }) => <h2 id={slug(textOf(children))} className="scroll-mt-24">{children}</h2>,
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Table">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </>
  );
}
