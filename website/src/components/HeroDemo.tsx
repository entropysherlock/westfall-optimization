"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { backwardWeight, generate, score, subsetDP } from "@/lib/engine";
import { createHeroScene } from "@/lib/heroScene";

/**
 * Homepage demonstration: a real 9-item weighted-ordering instance, solved exactly in the browser by the
 * exhaustive subset dynamic program (all 512 prefix sets), shown as an animated 3D scene. The items move
 * from the input ordering into the proven optimal ordering; every number shown is computed, not illustrative.
 */
const NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

export default function HeroDemo() {
  const [seed, setSeed] = useState(11);
  const [ordered, setOrdered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<ReturnType<typeof createHeroScene> | null>(null);
  const d = useMemo(() => {
    const A = generate("near-transitive", 9, seed);
    const input = [...Array(9).keys()];
    const r = subsetDP(A);
    return { A, names: NAMES, input, optimal: r.order, f0: score(A, input), f1: r.opt, b0: backwardWeight(A, input), b1: backwardWeight(A, r.order) };
  }, [seed]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const scene = createHeroScene(canvasRef.current, d, { onPhase: (p) => setOrdered(p.ordered) });
    sceneRef.current = scene;
    if (scene.reduced) setOrdered(true);
    return () => { scene.destroy(); sceneRef.current = null; };
    // the scene is created once; new instances are passed with setData below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { sceneRef.current?.setData(d); }, [d]);

  const f = ordered ? d.f1 : d.f0, b = ordered ? d.b1 : d.b0;
  const order = (ordered ? d.optimal : d.input).map((v) => NAMES[v]).join(" ");
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-accent-300">Live exact solve · 9 items</p>
          <p className="mt-1 text-xs text-slate-400">Exhaustive dynamic program over all 512 prefix sets, in your browser</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-700 ${ordered ? "border-accent-400/40 bg-accent-400/10 text-accent-300" : "border-white/15 bg-white/5 text-slate-300"}`} aria-live="polite">
          <span className={`h-1.5 w-1.5 rounded-full ${ordered ? "bg-accent-300 shadow-[0_0_8px_2px_rgba(92,205,189,.7)]" : "bg-slate-400"}`} aria-hidden />
          {ordered ? "Proven optimal" : "Input order"}
        </span>
      </div>

      <canvas ref={canvasRef} className="mt-1 block h-[300px] w-full sm:h-[340px]" role="img"
        aria-label={`Nine items and their pairwise preferences. Currently showing the ${ordered ? "proven optimal" : "input"} ordering ${order}, objective ${f}, backward weight ${b}. Teal arcs agree with the ordering; red arcs point backward.`} />

      <div className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10 text-center">
        <Stat label="Objective F(π)" value={f} accent={ordered} />
        <Stat label="Proven optimum" value={d.f1} />
        <Stat label="Backward weight" value={b} warn={!ordered && b > 0} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-slate-400 sm:px-6">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent-400" aria-hidden />agrees</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#ef6a5e]" aria-hidden />backward</span>
        </span>
        <span className="flex gap-4">
          <button type="button" className="font-semibold text-slate-300 hover:text-white" onClick={() => sceneRef.current?.replay()}>Replay</button>
          <button type="button" className="font-semibold text-accent-300 hover:text-accent-100" onClick={() => setSeed((s) => s + 1)}>New instance</button>
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  return (
    <div className="bg-navy-950/60 px-2 py-3">
      <p className="text-[10.5px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-lg tabular-nums transition-colors duration-700 ${accent ? "text-accent-300" : warn ? "text-[#ef6a5e]" : "text-white"}`}>{value}</p>
    </div>
  );
}
