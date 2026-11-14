import { PageHeader } from "@/components/ui";
import ContactForm from "@/components/ContactForm";
import { ISSUES } from "@/lib/site";

export const metadata = { title: "Contact and licensing", description: "Commercial licensing, research collaboration and technical inquiries." };

export default function Contact() {
  return (
    <>
      <PageHeader kicker="Contact" title="Licensing, collaboration and technical inquiries">
        We welcome inquiries about applying the solvers to your ordering problems, licensing the software, and research collaboration. The code is open source under GPL-3.0. If you need other terms, for example for a closed-source product, we discuss each inquiry individually; no standard commercial terms are set yet.
      </PageHeader>
      <div className="mx-auto grid max-w-page gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
        <ContactForm />
        <aside className="space-y-5 text-[15px] leading-relaxed text-fog-300">
          <div className="card p-6">
            <h2 className="font-semibold text-fog-100">Public technical questions</h2>
            <p className="mt-2 text-sm">For bug reports, questions about the mathematics or reproducibility, and feature requests, open an issue on GitHub. Issues are <strong>public</strong>, so do not include confidential data.</p>
            <a className="btn-secondary mt-4" href={`${ISSUES}/new?title=${encodeURIComponent("Inquiry: ")}&labels=question`} target="_blank" rel="noreferrer">Open a GitHub issue ↗</a>
          </div>
          <div className="card-muted p-6 text-sm">
            <h2 className="font-semibold text-fog-100">What to include</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>what is being ordered, and roughly how many items;</li>
              <li>how pairwise costs or preferences arise;</li>
              <li>any constraints beyond pairwise effects;</li>
              <li>whether you need an exact optimum or a fast feasible ordering.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
