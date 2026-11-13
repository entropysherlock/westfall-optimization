import { ButtonLink, Callout, PageHeader, Section } from "@/components/ui";
import { Tex } from "@/components/Tex";

export const metadata = { title: "Applications", description: "Where weighted linear ordering applies (and where it does not): production sequencing, rank aggregation, tournaments, preference ordering and research." };

function App({ id, title, fits, model, notFit, example }: { id: string; title: string; fits: React.ReactNode; model: React.ReactNode; notFit: React.ReactNode; example?: string }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line py-12 first:pt-0 last:border-0">
      <h2 className="h-display text-2xl">{title}</h2>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div><p className="label">When it fits</p><div className="mt-2 text-[15px] leading-relaxed text-fog-300">{fits}</div></div>
        <div><p className="label">Model</p><div className="mt-2 text-[15px] leading-relaxed text-fog-300">{model}</div></div>
        <div><p className="label">When it does not</p><div className="mt-2 text-[15px] leading-relaxed text-fog-300">{notFit}</div></div>
      </div>
      {example && <p className="mt-5 text-sm text-fog-500">Studio example: <span className="font-medium text-fog-300">{example}</span>.</p>}
    </section>
  );
}

export default function Applications() {
  return (
    <>
      <PageHeader kicker="Applications" title="Problems that are weighted linear ordering">
        A problem fits our solvers when its objective is a sum, over all pairs of items, of a value that depends only on which item comes first. That covers several sequencing, ranking and prioritization tasks exactly. It does not cover general scheduling with resources, release dates or adjacency-dependent costs, and we do not pretend otherwise.
      </PageHeader>

      <Section kicker="The test" title="Is your problem a linear ordering problem?">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-7 text-[15px] leading-relaxed text-fog-300">
            <p>Yes, if for every pair <Tex>{"(i,j)"}</Tex> there are two numbers <Tex>{"c_{ij}, c_{ji}"}</Tex> such that the total value of any complete ordering is</p>
            <Tex block>{"\\text{value}(\\pi)=\\text{const}+\\sum_{i\\text{ before }j} c_{ij},"}</Tex>
            <p>regardless of how far apart <Tex>{"i"}</Tex> and <Tex>{"j"}</Tex> end up and of what lies between them. The Studio converts such data to the skew-symmetric form exactly and reports the constant.</p>
          </div>
          <Callout tone="warn" title="Common mismatches">
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Adjacency costs</strong> (changeover only between consecutive jobs): a travelling-salesman-type problem, not linear ordering.</li>
              <li><strong>Release dates, deadlines, machines, resources</strong>: general scheduling constraints are not modelled.</li>
              <li><strong>Hard precedence constraints</strong> can be approximated with large pairwise weights, but this is not a constraint solver.</li>
              <li><strong>Triple-wise or position-dependent effects</strong> are not pairwise and do not fit.</li>
            </ul>
          </Callout>
        </div>
      </Section>

      <div className="mx-auto max-w-page px-5 pb-16 sm:px-8">
        <App id="manufacturing" title="Manufacturing production sequencing"
          fits={<>Single-machine sequences whose cost is a sum of pairwise precedence terms. Total weighted completion time is one: with processing times <Tex>{"p"}</Tex> and weights <Tex>{"w"}</Tex>, <Tex>{"\\sum_j w_jC_j=\\sum_j w_jp_j+\\sum_{i\\text{ before }j}p_iw_j"}</Tex>. Persistent pairwise effects can be added on top, such as contamination or wear that affects every later job.</>}
          model={<>A cost matrix <Tex>{"d_{ij}=p_iw_j+\\text{penalty}_{ij}"}</Tex> under the “cost” interpretation. Without penalties, Smith&apos;s ratio rule already solves the problem optimally. The ordering model earns its keep when the pairwise penalties break that rule.</>}
          notFit={<>Sequence-dependent setup times between consecutive jobs (adjacency), parallel machines, release dates and due-date constraints.</>}
          example="Single-machine job sequencing" />
        <App id="changeover" title="Changeover-cost minimization"
          fits={<>Only when the changeover effect of running <Tex>{"i"}</Tex> earlier persists for every later item, for example cumulative cleaning requirements that depend on whether a product family has appeared at any point before.</>}
          model={<>Cost matrix of persistent precedence penalties. The Studio reports the exact constant offset so totals can be compared with plant accounting.</>}
          notFit={<>Classic changeover matrices charged between consecutive items. Those need TSP or ATSP methods, and our engine does not solve them directly.</>} />
        <App id="rank-aggregation" title="Rank aggregation"
          fits={<>Combining rankings from judges, voters, search engines or models into one consensus. The Kemeny consensus maximises total pairwise agreement.</>}
          model={<>Benefit matrix <Tex>{"c_{ij}"}</Tex> = number (or weight) of sources ranking <Tex>{"i"}</Tex> above <Tex>{"j"}</Tex>. Partial rankings simply contribute nothing for unranked pairs.</>}
          notFit={<>Objectives based on positional scores (Borda-type sums) are linear in positions and easier. Rank aggregation with fairness quotas or position constraints needs extra modelling.</>}
          example="Rank aggregation (Kemeny)" />
        <App id="preferences" title="Preference ordering and prioritization"
          fits={<>Pairwise comparison surveys, backlog prioritisation from stakeholder comparisons, and feature preference studies.</>}
          model={<>Edge list <span className="font-mono text-sm">first,second,count</span> under the benefit interpretation. Duplicate pairs are summed and missing pairs contribute zero.</>}
          notFit={<>Statistical estimation of latent utilities (Bradley–Terry and similar) is a different, probabilistic question. The ordering model optimises agreement with the observed comparisons.</>}
          example="Pairwise preference survey" />
        <App id="tournaments" title="Tournament optimization"
          fits={<>Ranking competitors from match outcomes or score margins so that as few (or as small) upsets as possible are contradicted. This is weighted feedback arc set in tournaments.</>}
          model={<>Skew-symmetric margins: winner, loser, margin. Ties are zero. The backward weight of the result is exactly the total margin of the upsets it implies.</>}
          notFit={<>Schedule generation (who plays whom, when) is a different combinatorial problem.</>}
          example="Tournament ranking from match margins" />
        <App id="scheduling" title="Specialized scheduling subproblems"
          fits={<>Subproblems inside larger planners where the remaining choice is the relative order of a set of tasks with pairwise interaction costs, for example after assignment to a machine.</>}
          model={<>Any pairwise matrix exported from the planner, together with the initial order as a baseline. The exported result re-imports with full provenance.</>}
          notFit={<>The full planning problem. Our engine optimises the ordering subproblem it is given and makes no claim about the overall plan.</>} />
        <App id="research" title="Industrial research and mathematical optimization"
          fits={<>Studying the structure of ordering instances: whether a hidden block structure exists, how large λ(A) is, and how hard instances are for exact methods.</>}
          model={<>AutoCut recovers a partition attaining λ(A) on small instances in the browser. Larger exact studies use the BLX solver and its exact certificates.</>}
          notFit={<>Large-scale production use of the structural algorithm. The verified implementation is currently practical only for small n.</>} />
      </div>

      <Section muted kicker="Next step" title="Try your own data, or discuss a formulation">
        <div className="flex flex-wrap gap-3"><ButtonLink href="/studio/" primary>Open the Studio</ButtonLink><ButtonLink href="/docs/#model">Modelling guide</ButtonLink><ButtonLink href="/contact/">Contact</ButtonLink></div>
      </Section>
    </>
  );
}
