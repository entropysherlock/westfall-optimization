"use client";
import { useMemo, useState } from "react";
import { exclusionDP, insertionLocalSearch, score, subsetDP } from "@/lib/engine";
import { Tex } from "./Tex";
import { BLOCKS, INSTANCE } from "@/lib/explainerInstance";
import { OrderingDiagram } from "./views";
import { Stat } from "./ui";

/**
 * Live, reproducible trace of the exclusion rule on a fixed 7-vertex instance.
 * Instance: two cyclic blocks {1,2,3} and {4,5,6,7} with mostly consistent cross preferences
 * and one reversed cross pair. Everything is recomputed in the browser on each load.
 */
const setLabel = (S: number, n: number) => "{" + [...Array(n).keys()].filter((v) => S & (1 << v)).map((v) => v + 1).join(", ") + "}";
const f2 = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(3));

export default function Explainer() {
  const n = INSTANCE.length;
  const [bound, setBound] = useState<"trivial" | "blocks">("trivial");
  const start = useMemo(() => [6, 2, 0, 5, 1, 3, 4], []);
  const incumbent = useMemo(() => insertionLocalSearch(INSTANCE, start), [start]);
  const run = useMemo(() => exclusionDP(INSTANCE, incumbent, { trace: true, blocks: bound === "blocks" ? BLOCKS : undefined }), [incumbent, bound]);
  const exact = useMemo(() => subsetDP(INSTANCE).opt, []);
  const trace = run.trace!;
  const [i, setI] = useState(0);
  const step = trace[Math.min(i, trace.length - 1)];
  const done = i >= trace.length - 1;
  const prefixOrder = useMemo(() => {
    // show S's members first (in index order), then the rest, to visualise the prefix
    const inS = [...Array(n).keys()].filter((v) => step.S & (1 << v));
    const rest = [...Array(n).keys()].filter((v) => !(step.S & (1 << v)));
    return [...inS, ...rest];
  }, [step, n]);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <p className="kicker mb-2">The exclusion rule · mathematical formulation</p>
        <p className="text-fog-400">Build orderings left to right. A <em>prefix state</em> is the set <Tex>{"S"}</Tex> of vertices placed so far. Keep <Tex>{"S"}</Tex> only if</p>
        <Tex block>{"f(S)\\;+\\;r(S)\\;+\\;U(V\\setminus S)\\;\\ge\\;L"}</Tex>
        <ul className="grid gap-2 text-sm text-fog-400 md:grid-cols-2">
          <li><Tex>{"f(S)"}</Tex>: best score of an ordering of <Tex>{"S"}</Tex> reachable through retained states.</li>
          <li><Tex>{"r(S)=\\sum_{u\\in S,\\,w\\notin S}a_{uw}"}</Tex>: fixed contribution of pairs split by the prefix.</li>
          <li><Tex>{"U(T)\\ge \\mathrm{OPT}(A|_T)"}</Tex>: an admissible upper bound for the suffix.</li>
          <li><Tex>{"L=F_A(\\pi_0)"}</Tex>: score of a real incumbent ordering.</li>
        </ul>
        <p className="mt-3 text-sm text-fog-400">
          Why it is safe: if an ordering scores at least <Tex>{"L"}</Tex>, then at each of its prefixes <Tex>{"S"}</Tex> the three terms bound its own score from above, so the inequality holds
          and every prefix is kept. Hence the DP over retained states still finds the optimum.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-fog-400">Suffix bound:</span>
        {(["trivial", "blocks"] as const).map((b) => (
          <button key={b} onClick={() => { setBound(b); setI(0); }} className={`rounded-lg border px-3 py-1.5 text-sm ${bound === b ? "border-cyan-400/60 text-cyan-300" : "border-line text-fog-400"}`}>
            {b === "trivial" ? "Trivial: U(T) = W(T)" : "Block tables: U(T) = W(T) − 2Σ β*(T∩Bᵢ)"}
          </button>
        ))}
        <span className="rounded border border-line px-2 py-1 font-mono text-xs text-fog-500">live trace · computed in your browser · reproducible</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-sm text-fog-300">
              step {i + 1} / {trace.length} · layer |S| = {step.layer} · S = <span className="text-cyan-300">{setLabel(step.S, n)}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setI(Math.max(0, i - 1))} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fog-300" aria-label="Previous step">←</button>
              <button onClick={() => setI(Math.min(trace.length - 1, i + 1))} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fog-300" aria-label="Next step">→</button>
              <button onClick={() => setI(trace.findIndex((t, k) => k > i && !t.kept) === -1 ? i : trace.findIndex((t, k) => k > i && !t.kept))} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fog-300">next exclusion</button>
              <button onClick={() => setI(trace.length - 1)} className="rounded-lg bg-ink-700 px-3 py-1.5 text-sm text-fog-100">finish</button>
            </div>
          </div>
          <OrderingDiagram A={INSTANCE} order={prefixOrder} blocks={BLOCKS} height={200} title="Prefix S placed first" />
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-ink-850 p-4 font-mono text-sm">
            <div className="text-fog-400">
              f(S) + r(S) + U(V∖S) = {f2(step.f)} + {f2(step.r)} + {f2(step.U)} = <span className="text-fog-100">{f2(step.lhs)}</span>
            </div>
            <div className="mt-1 text-fog-400">threshold L = F(π₀) = <span className="text-fog-100">{f2(run.threshold)}</span></div>
            <div className={`mt-3 text-base ${step.kept ? "text-signal-green" : "text-signal-red"}`}>
              {f2(step.lhs)} {step.kept ? "≥" : "<"} {f2(run.threshold)} ⇒ {step.kept ? "RETAINED" : "EXCLUDED — no ordering through this prefix can beat the incumbent"}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Stat label="Incumbent π₀ (local search)" value={<span className="text-sm">[{incumbent.map((v) => v + 1).join(", ")}]</span>} hint={`L = ${f2(score(INSTANCE, incumbent))}`} />
          <Stat label="States generated" value={run.generated} hint={`of 2⁷ = 128 subsets`} />
          <Stat label="Retained / excluded" value={`${run.retained} / ${run.excluded}`} />
          <Stat label={done ? "Proved optimum (end of trace)" : "Result (shown at end)"} value={done ? f2(run.opt) : "…"} hint={done ? `order [${run.order.map((v) => v + 1).join(", ")}] · exact subset DP: ${f2(exact)}` : "step to the end"} />
          <p className="text-xs leading-relaxed text-fog-500">
            Switch to the block-table bound: the same exclusion rule with a tighter <Tex>{"U"}</Tex> discards more states, which is the mechanism behind BLX. The full BLX 2.0 bound also subtracts a
            fractional packing of directed triangles that meet three different blocks (computed by an LP in the Python solver).
          </p>
        </div>
      </div>
    </div>
  );
}
