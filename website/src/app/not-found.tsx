import Link from "next/link";
import { ButtonLink, PageHeader } from "@/components/ui";

export const metadata = { title: "Page not found", robots: { index: false } };

const destinations: [string, string, string][] = [
  ["/studio/", "Optimization Studio", "Upload a problem and solve it in your browser."],
  ["/research/", "Research program", "The structural theorem, results in progress and open questions."],
  ["/formal-verification/", "Formal verification", "What the Lean kernel checks, and what it does not."],
  ["/docs/", "Documentation", "Input formats, solvers, statuses and certificates."],
];

export default function NotFound() {
  return (
    <>
      <PageHeader kicker="Error 404" title="This page doesn't exist">
        The link may be out of date, or the page may have moved when the site was reorganised. These are the most-used places to continue from.
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/" primary>Go to the home page</ButtonLink>
          <ButtonLink href="/studio/">Open the Studio</ButtonLink>
        </div>
      </PageHeader>
      <div className="mx-auto max-w-page px-5 py-14 sm:px-8">
        <ul className="grid gap-4 sm:grid-cols-2">
          {destinations.map(([href, title, text]) => (
            <li key={href}>
              <Link href={href} className="card block p-5 hover:border-accent-600/40">
                <span className="font-semibold text-fog-100">{title}</span>
                <span className="mt-1 block text-sm text-fog-400">{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
