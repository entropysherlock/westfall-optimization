import VerifyCenter from "@/components/VerifyCenter";
import { EvidenceTag, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";
import { loadPresets } from "@/lib/data";
import { blob } from "@/lib/site";

export const metadata = { title: "Certificate verification" };

export default function Verify() {
  const items = loadPresets().map((p) => ({ id: p.id, title: p.title, matrix: p.matrix, reference: { OPT: p.reference.OPT, certificate: p.reference.certificate } }));
  return (
    <>
      <PageHeader kicker="Exact certificate verification center" title="Don't trust the solver. Check the certificate.">
        A solver&apos;s <em>claimed</em> optimum is only as reliable as its code. An exclusion-DP certificate (BLX 2.0) or an ATLAS-032 certificate (from the Studio) lets anyone re-establish optimality with a separate, much simpler program
        working in exact integer arithmetic. These are independent computational checks, not Lean proofs.
        <div className="mt-4 flex flex-wrap gap-2"><EvidenceTag kind="tested" /></div>
      </PageHeader>

      <div className="mx-auto max-w-page px-5 py-10 sm:px-8"><VerifyCenter items={items} /></div>

      <Section kicker="What is verified" title="The checks, in order">
        <div className="grid gap-6 lg:grid-cols-2">
          <ol className="card list-decimal space-y-2 p-6 pl-10 text-sm text-fog-300">
            <li>The matrix is square and skew-symmetric; if an input is supplied, every entry equals the certificate&apos;s entry exactly (binding).</li>
            <li>The threshold <Tex>{"L"}</Tex> is recomputed as the exact score of the stated incumbent ordering — it is never read from the certificate.</li>
            <li>Every packing triangle is a directed 3-cycle; the load on every arc is at most its weight; hybrid triangles meet three different blocks.</li>
            <li>Block tables <Tex>{"\\beta^*(X)"}</Tex> are recomputed by the verifier&apos;s own exact subset DP; the partition itself is untrusted (any partition gives a valid bound).</li>
            <li>Every retained state&apos;s DP value is recomputed from retained parents only.</li>
            <li>Every child of a retained state that is <em>not</em> retained must satisfy <Tex>{"f+r+U(V\\setminus S)<L"}</Tex> exactly.</li>
            <li>The claimed ordering is a permutation whose exact score equals the DP value at <Tex>{"V"}</Tex>.</li>
          </ol>
          <div className="card space-y-4 p-6 text-sm text-fog-400">
            <p><span className="font-semibold text-fog-100">Why acceptance proves optimality.</span> Any ordering scoring at least <Tex>{"L"}</Tex> keeps all its prefixes under the exclusion rule
              (the bound is admissible), so it would appear in the replayed DAG; the DAG&apos;s maximum is the claimed score.</p>
            <p><span className="font-semibold text-fog-100">Exact arithmetic.</span> Inputs and LP values are IEEE doubles, i.e. dyadic rationals; the producer multiplies everything by one common
              denominator <Tex>{"D"}</Tex> and the verifier works in big integers. No tolerance is used anywhere.</p>
            <p><span className="font-semibold text-fog-100">Two independent implementations.</span> <a className="text-cyan-300 underline" href={blob("src/westfall_optimization/certificates/verify_exact.py")}>verify_exact.py</a> (Python) and its
              line-by-line BigInt port <a className="text-cyan-300 underline" href={blob("website/src/lib/verify.ts")}>verify.ts</a> (this page). Neither shares code with the search.</p>
            <p><span className="font-semibold text-fog-100">Limits.</span> Certificates grow with the retained state count; the current verifiers are interpreted and become slow beyond roughly 10⁴–10⁵ states
              (the browser verifier is limited to n ≤ 30). MILP-proved optima do not produce certificates. This is exact computation, <em>not</em> a formal proof in Lean or Coq.</p>
          </div>
        </div>
      </Section>

      <Section kicker="Reproduce locally" title="Verification commands">
        <pre className="card overflow-x-auto p-6 font-mono text-[13px] leading-relaxed text-fog-300">{`pip install -e .                                   # from a clone of the repository
westfall-opt solve examples/paley11.json --mode blx --certificate cert.json
westfall-opt verify cert.json --instance examples/paley11.json   # exit code 0 = ACCEPTED
# certificates shown on this page:  website/public/data/certificates/*.json
westfall-opt verify website/public/data/certificates/paley-11-perturbed.json`}</pre>
      </Section>
    </>
  );
}
