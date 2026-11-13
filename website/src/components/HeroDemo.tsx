"use client";
import { useMemo, useState } from "react";
import { generate, score, subsetDP } from "@/lib/engine";
import { ArcDiagram, MatrixHeatmap } from "./studio/Viz";

/**
 * Homepage demonstration: a random weighted ordering instance is solved exactly in the browser
 * (exhaustive subset dynamic program). Nothing moves unless the visitor acts.
 */
export default function HeroDemo() {
  const [seed, setSeed] = useState(11);
  const [view, setView] = useState<"initial" | "optimal">("optimal");
  const { A, names, initial, opt, f0, f1 } = useMemo(() => {
    const A = generate("near-transitive", 9, seed);
    const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const initial = [...Array(9).keys()];
    const r = subsetDP(A);
    return { A, names, initial, opt: r.order, f0: score(A, initial), f1: r.opt };
  }, [seed]);
  const order = view === "optimal" ? opt : initial;
  return (
    <div className="rounded-xl border border-white/10 bg-white p-5 text-fog-100 shadow-2xl shadow-black/30 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Live example · 9 items</p>
          <p className="mt-1 text-xs text-fog-500">Solved exactly by an exhaustive dynamic program over all 512 prefix sets</p>
        </div>
        <div className="flex rounded-lg bg-ink-850 p-1" role="tablist" aria-label="Ordering shown">
          {(["initial", "optimal"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`tab ${view === v ? "tab-active" : ""}`}>
              {v === "initial" ? "Input order" : "Optimal order"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[180px_1fr]">
        <MatrixHeatmap M={A} order={order} names={names} size={180} label={view === "optimal" ? "Optimal order" : "Input order"} />
        <div>
          <ArcDiagram M={A} order={order} names={names} height={170} />
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-sm">
            <div className="rounded-md border border-line px-3 py-2"><span className="text-fog-500">F(π) </span>{view === "optimal" ? f1 : f0}</div>
            <div className="rounded-md border border-line px-3 py-2"><span className="text-fog-500">optimum </span>{f1}</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-fog-500">
        <span>Teal arcs agree with the order; red arcs are backward.</span>
        <button type="button" className="font-semibold text-accent-600 hover:underline" onClick={() => setSeed((s) => s + 1)}>New instance</button>
      </div>
    </div>
  );
}
