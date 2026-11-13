"use client";
import { useEffect, useMemo, useRef, type ReactElement } from "react";

const POS = [13, 148, 136]; // teal: a_uv > 0 (u should precede v)
const NEG = [180, 35, 24]; // red: a_uv < 0

/**
 * Heatmap of a skew-symmetric matrix with rows/columns permuted by `order`. In an optimal order the
 * mass concentrates above the diagonal (teal); entries below the diagonal in teal are disagreements.
 */
export function MatrixHeatmap({ M, order, names, blocks, size = 420, label }: { M: number[][]; order: number[]; names: string[]; blocks?: number[][] | null; size?: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = order.length;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    c.width = size * dpr;
    c.height = size * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, size, size);
    const cell = size / Math.max(1, n);
    let max = 0;
    for (const r of M) for (const x of r) max = Math.max(max, Math.abs(x));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = M[order[i]][order[j]];
        if (i === j) {
          g.fillStyle = "#e2e8f0";
        } else if (v === 0) continue;
        else {
          const a = 0.12 + 0.78 * Math.sqrt(Math.abs(v) / (max || 1));
          const [r, gg, b] = v > 0 ? POS : NEG;
          g.fillStyle = `rgba(${r},${gg},${b},${a.toFixed(3)})`;
        }
        g.fillRect(j * cell, i * cell, Math.ceil(cell), Math.ceil(cell));
      }
    // block boundaries (structural decomposition)
    if (blocks && blocks.length > 1) {
      const pos = new Map(order.map((v, i) => [v, i]));
      g.strokeStyle = "#0b1a2e";
      g.lineWidth = 1.2;
      for (const B of blocks) {
        const ps = B.map((v) => pos.get(v)!);
        const lo = Math.min(...ps), hi = Math.max(...ps);
        if (hi - lo + 1 === B.length) g.strokeRect(lo * cell + 0.5, lo * cell + 0.5, (hi - lo + 1) * cell - 1, (hi - lo + 1) * cell - 1);
      }
    }
    g.strokeStyle = "#cbd5e1";
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [M, order, n, size, blocks]);
  return (
    <figure>
      <canvas ref={ref} style={{ width: "100%", maxWidth: size, aspectRatio: "1 / 1" }} role="img"
        aria-label={`${label}: ${n} by ${n} matrix heatmap; teal entries favour the row item first, red entries the column item first.`} />
      <figcaption className="mt-2 text-xs leading-relaxed text-fog-500">
        {label}. Rows and columns follow the ordering{n <= 12 ? ` (${order.map((v) => names[v]).join(" → ")})` : ""}. Teal above the diagonal is agreement; teal below it is a disagreement.
      </figcaption>
    </figure>
  );
}

/**
 * Arc diagram: items on a line in the given order; an arc for every pair with a_uv > 0. Arcs above
 * the line agree with the order, arcs below are backward (they cost 2·a_uv relative to the ideal).
 */
export function ArcDiagram({ M, order, names, highlight, height = 220 }: { M: number[][]; order: number[]; names: string[]; highlight?: Set<number>; height?: number }) {
  const n = order.length;
  const W = 820;
  const pad = 26;
  const mid = height / 2;
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1));
  const { arcs, maxW } = useMemo(() => {
    const pos = new Map(order.map((v, i) => [v, i]));
    const out: { d: string; back: boolean; w: number; key: string }[] = [];
    let mw = 0;
    for (let u = 0; u < n; u++)
      for (let v = 0; v < n; v++) {
        if (!(M[u][v] > 0)) continue;
        mw = Math.max(mw, M[u][v]);
        const pu = pos.get(u)!, pv = pos.get(v)!;
        const back = pu > pv;
        const span = Math.abs(pu - pv) / Math.max(1, n - 1);
        const h = 6 + span * (mid - 22);
        const x1 = x(pu), x2 = x(pv);
        out.push({ d: `M ${x1} ${mid} Q ${(x1 + x2) / 2} ${back ? mid + 2 * h : mid - 2 * h} ${x2} ${mid}`, back, w: M[u][v], key: `${u}-${v}` });
      }
    return { arcs: out, maxW: mw || 1 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M, order, n, height]);
  if (n > 60) return <p className="text-sm text-fog-500">The arc diagram is shown for up to 60 items.</p>;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Ordering arc diagram: arcs above the line agree with the ordering, arcs below are backward.">
      <line x1={pad - 10} x2={W - pad + 10} y1={mid} y2={mid} stroke="#cbd5e1" />
      {arcs.filter((a) => !a.back).map((a) => (
        <path key={a.key} d={a.d} fill="none" stroke="#0d9488" strokeOpacity={0.18 + 0.55 * (a.w / maxW)} strokeWidth={0.7 + 1.8 * (a.w / maxW)} />
      ))}
      {arcs.filter((a) => a.back).map((a) => (
        <path key={a.key} d={a.d} fill="none" stroke="#b42318" strokeOpacity={0.45 + 0.5 * (a.w / maxW)} strokeWidth={0.9 + 2.2 * (a.w / maxW)} />
      ))}
      {order.map((v, i) => (
        <g key={v} transform={`translate(${x(i)},${mid})`}>
          <circle r={n > 30 ? 3.5 : 6} fill={highlight?.has(v) ? "#0b1a2e" : "#ffffff"} stroke="#0b1a2e" strokeWidth={1.2} />
          {n <= 30 && (
            <text y={-12} textAnchor="middle" className="fill-fog-300" style={{ font: "500 10px Inter Variable, sans-serif" }}>
              {names[v].length > 8 ? names[v].slice(0, 7) + "…" : names[v]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Directed graph: an arrow u → v for every pair with a_uv > 0, items placed on a circle in the given order. */
export function GraphView({ M, order, names, size = 420 }: { M: number[][]; order: number[]; names: string[]; size?: number }) {
  const n = order.length;
  const R = size / 2 - 46;
  const c = size / 2;
  const pos = useMemo(() => {
    const m = new Map<number, [number, number]>();
    order.forEach((v, i) => {
      const t = -Math.PI / 2 + (2 * Math.PI * i) / n;
      m.set(v, [c + R * Math.cos(t), c + R * Math.sin(t)]);
    });
    return m;
  }, [order, n, R, c]);
  if (n > 30) return <p className="text-sm text-fog-500">The graph view is shown for up to 30 items.</p>;
  const rank = new Map(order.map((v, i) => [v, i]));
  let maxW = 0;
  for (const r of M) for (const x of r) maxW = Math.max(maxW, x);
  const edges: ReactElement[] = [];
  for (let u = 0; u < n; u++)
    for (let v = 0; v < n; v++) {
      if (!(M[u][v] > 0)) continue;
      const [x1, y1] = pos.get(u)!, [x2, y2] = pos.get(v)!;
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      const back = rank.get(u)! > rank.get(v)!;
      edges.push(
        <line key={`${u}-${v}`} x1={x1 + (dx / L) * 13} y1={y1 + (dy / L) * 13} x2={x2 - (dx / L) * 15} y2={y2 - (dy / L) * 15}
          stroke={back ? "#b42318" : "#0d9488"} strokeOpacity={back ? 0.75 : 0.35} strokeWidth={0.8 + 1.8 * (M[u][v] / (maxW || 1))}
          markerEnd={`url(#arrow-${back ? "b" : "f"})`} />,
      );
    }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[460px]" role="img" aria-label="Directed preference graph; red arrows point against the ordering.">
      <defs>
        {(["f", "b"] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={k === "f" ? "#0d9488" : "#b42318"} />
          </marker>
        ))}
      </defs>
      {edges}
      {order.map((v, i) => {
        const [x, y] = pos.get(v)!;
        return (
          <g key={v}>
            <circle cx={x} cy={y} r={11} fill="#ffffff" stroke="#0b1a2e" strokeWidth={1.3} />
            <text x={x} y={y + 3.5} textAnchor="middle" style={{ font: "600 9.5px Inter Variable, sans-serif" }} className="fill-fog-100">{i + 1}</text>
            <text x={c + (x - c) * 1.17} y={c + (y - c) * 1.17 + 3} textAnchor="middle" style={{ font: "500 10px Inter Variable, sans-serif" }} className="fill-fog-400">
              {names[v].length > 10 ? names[v].slice(0, 9) + "…" : names[v]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
