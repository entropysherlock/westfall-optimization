"use client";
import { useEffect, useMemo, useState } from "react";
import { backwardWeight, insertionLocalSearch, score, subsetDP, type Matrix } from "@/lib/engine";
import { OrderingDiagram } from "./views";

/** Live, mathematically faithful hero: an arbitrary ordering, the local-search incumbent, and the exact optimum (subset DP, in your browser). */
export default function HeroGraph({ A, blocks }: { A: Matrix; blocks: number[][] | null }) {
  const n = A.length;
  const stages = useMemo(() => {
    const ident = [...Array(n).keys()];
    const inc = insertionLocalSearch(A, ident);
    const opt = subsetDP(A);
    return [
      { label: "Arbitrary ordering", order: ident },
      { label: "Local-search incumbent (heuristic)", order: inc },
      { label: "Exact optimum (proved by exhaustive subset DP in your browser)", order: opt.order },
    ];
  }, [A, n]);
  const [k, setK] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setK((s) => (s + 1) % stages.length), 2600);
    return () => clearInterval(id);
  }, [auto, stages.length]);
  const s = stages[k];
  return (
    <div className="card glow p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-xs text-fog-400">
          <span className="text-cyan-300">stage {k + 1}/3</span> · {s.label}
        </div>
        <div className="flex gap-2">
          {stages.map((_, i) => (
            <button key={i} onClick={() => { setAuto(false); setK(i); }} aria-label={`Show stage ${i + 1}`}
              className={`h-2.5 w-8 rounded-full transition ${i === k ? "bg-cyan-400" : "bg-ink-600 hover:bg-ink-600/70"}`} />
          ))}
        </div>
      </div>
      <OrderingDiagram A={A} order={s.order} blocks={blocks} height={250} title={`Ordering: ${s.label}`} />
      <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm">
        <div className="rounded-lg border border-line px-3 py-2">
          <span className="text-fog-500">F<sub>A</sub>(π) = </span><span className="text-fog-100">{score(A, s.order)}</span>
        </div>
        <div className="rounded-lg border border-line px-3 py-2">
          <span className="text-fog-500">backward weight = </span><span className="text-signal-red">{backwardWeight(A, s.order)}</span>
        </div>
      </div>
    </div>
  );
}
