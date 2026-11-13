"use client";
import { useMemo } from "react";
import type { Matrix } from "@/lib/engine";

const BLOCK_COLORS = ["#0f766e", "#5b3fb8", "#b7791f", "#15803d", "#be185d", "#c2410c", "#0e7490", "#7e22ce"];
export const blockColor = (i: number) => BLOCK_COLORS[i % BLOCK_COLORS.length];

function blockIndex(blocks?: number[][] | null) {
  const m = new Map<number, number>();
  blocks?.forEach((B, i) => B.forEach((v) => m.set(v, i)));
  return m;
}

/**
 * Ordering view: vertices on a line in the given order. An arc is drawn for every pair with a_uv > 0
 * (u should precede v). Forward arcs (u left of v) arch above in cyan; backward arcs arch below in red.
 * F_A(order) = (sum of forward weights) - (sum of backward weights).
 */
export function OrderingDiagram({ A, order, blocks, height = 230, label = true, title }: { A: Matrix; order: number[]; blocks?: number[][] | null; height?: number; label?: boolean; title?: string }) {
  const n = order.length;
  const W = 760;
  const pad = 30;
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1));
  const mid = height / 2;
  const pos = new Map(order.map((v, i) => [v, i]));
  const maxW = Math.max(1e-9, ...A.flat().map(Math.abs));
  const bi = blockIndex(blocks);
  const arcs: { d: string; back: boolean; w: number; key: string }[] = [];
  for (let u = 0; u < n; u++)
    for (let v = 0; v < n; v++) {
      if (!(A[u][v] > 0)) continue;
      const pu = pos.get(u)!, pv = pos.get(v)!;
      const back = pu > pv;
      const x1 = x(pu), x2 = x(pv);
      const h = Math.min((mid - 16) / 2, 6 + (Math.abs(pu - pv) * (mid - 16)) / (2 * Math.max(1, n - 1)));
      const cy = back ? mid + 2 * h : mid - 2 * h; // quadratic control point: above = forward, below = backward
      const d = `M ${x1} ${mid} Q ${(x1 + x2) / 2} ${cy} ${x2} ${mid}`;
      arcs.push({ d, back, w: A[u][v], key: `${u}-${v}` });
    }
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={title ?? "Ordering diagram"}>
        {title && <title>{title}</title>}
        <line x1={pad - 12} y1={mid} x2={W - pad + 12} y2={mid} stroke="#e2e8f0" />
        {arcs.filter((a) => !a.back).map((a) => (
          <path key={a.key} d={a.d} fill="none" stroke="#0f766e" strokeOpacity={0.18 + 0.5 * (a.w / maxW)} strokeWidth={0.8 + 2 * (a.w / maxW)} />
        ))}
        {arcs.filter((a) => a.back).map((a) => (
          <path key={a.key} d={a.d} fill="none" stroke="#b42318" strokeOpacity={0.45 + 0.5 * (a.w / maxW)} strokeWidth={1 + 2.4 * (a.w / maxW)} />
        ))}
        {order.map((v, i) => (
          <g key={v} style={{ transform: `translate(${x(i)}px, ${mid}px)`, transition: "transform 700ms cubic-bezier(.2,.7,.2,1)" }}>
            <circle r={11} fill="#ffffff" stroke={bi.has(v) ? blockColor(bi.get(v)!) : "#0d9488"} strokeWidth={bi.has(v) ? 2.4 : 1.4} />
            {label && <text y={4} textAnchor="middle" className="fill-fog-100 font-mono" fontSize={10}>{v + 1}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 font-mono text-[11px] text-fog-500">
        <span><span className="text-cyan-400">━</span> forward arc (agrees with order)</span>
        <span><span className="text-signal-red">━</span> backward arc (counted in backward weight)</span>
        {blocks && <span>ring colour = block</span>}
      </figcaption>
    </figure>
  );
}

/** Weighted directed graph on a circle: arrow u→v when a_uv > 0; red when backward in `order`. */
export function GraphCircle({ A, order, blocks }: { A: Matrix; order: number[]; blocks?: number[][] | null }) {
  const n = A.length;
  const S = 360, R = 140, c = S / 2;
  const pt = (v: number) => {
    const ang = (2 * Math.PI * v) / n - Math.PI / 2;
    return [c + R * Math.cos(ang), c + R * Math.sin(ang)];
  };
  const pos = new Map(order.map((v, i) => [v, i]));
  const maxW = Math.max(1e-9, ...A.flat().map(Math.abs));
  const bi = blockIndex(blocks);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-md" role="img" aria-label="Weighted directed graph">
      <defs>
        {["c", "r"].map((k) => (
          <marker key={k} id={`ah-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={k === "c" ? "#0f766e" : "#b42318"} />
          </marker>
        ))}
      </defs>
      {A.flatMap((row, u) =>
        row.map((w, v) => {
          if (!(w > 0)) return null;
          const [x1, y1] = pt(u), [x2, y2] = pt(v);
          const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
          const sx = x1 + (dx / L) * 13, sy = y1 + (dy / L) * 13, ex = x2 - (dx / L) * 15, ey = y2 - (dy / L) * 15;
          const back = pos.get(u)! > pos.get(v)!;
          return (
            <line key={`${u}-${v}`} x1={sx} y1={sy} x2={ex} y2={ey} stroke={back ? "#b42318" : "#0f766e"}
              strokeOpacity={back ? 0.85 : 0.25 + 0.45 * (w / maxW)} strokeWidth={0.8 + 2 * (w / maxW)} markerEnd={`url(#ah-${back ? "r" : "c"})`} />
          );
        })
      )}
      {A.map((_, v) => {
        const [x, y] = pt(v);
        return (
          <g key={v}>
            <circle cx={x} cy={y} r={12} fill="#ffffff" stroke={bi.has(v) ? blockColor(bi.get(v)!) : "#0d9488"} strokeWidth={bi.has(v) ? 2.4 : 1.4} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize={10} className="fill-fog-100 font-mono">{v + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Weight matrix shown in a chosen vertex order (rows/cols permuted); block boundaries drawn when given. */
export function MatrixView({ A, order, blocks }: { A: Matrix; order: number[]; blocks?: number[][] | null }) {
  const n = A.length;
  const maxW = Math.max(1e-9, ...A.flat().map(Math.abs));
  const bi = useMemo(() => blockIndex(blocks), [blocks]);
  const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
  return (
    <div className="overflow-x-auto">
      <table className="mx-auto border-separate border-spacing-0 font-mono text-[10.5px]">
        <thead>
          <tr>
            <th className="p-1 text-fog-500" />
            {order.map((v) => <th key={v} className="p-1 text-center text-fog-400">{v + 1}</th>)}
          </tr>
        </thead>
        <tbody>
          {order.map((u, r) => (
            <tr key={u}>
              <th className="p-1 pr-2 text-right text-fog-400">{u + 1}</th>
              {order.map((v, s) => {
                const w = A[u][v];
                const a = Math.min(1, Math.abs(w) / maxW);
                const bg = w > 0 ? `rgba(13,148,136,${0.08 + 0.5 * a})` : w < 0 ? `rgba(180,35,24,${0.08 + 0.5 * a})` : "transparent";
                const edgeR = blocks && s < n - 1 && bi.get(order[s]) !== bi.get(order[s + 1]);
                const edgeB = blocks && r < n - 1 && bi.get(order[r]) !== bi.get(order[r + 1]);
                return (
                  <td key={v} title={`a(${u + 1},${v + 1}) = ${w}`} className="h-7 min-w-[1.9rem] px-1 text-center text-fog-100"
                    style={{ background: u === v ? "#f1f5f9" : bg, borderRight: edgeR ? "1px solid #b7791f" : undefined, borderBottom: edgeB ? "1px solid #b7791f" : undefined }}>
                    {u === v ? "·" : fmt(w)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-center font-mono text-[11px] text-fog-500">
        Rows/columns in the displayed order. Upper-triangle sum = F<sub>A</sub>(order). Blue: a<sub>ij</sub> &gt; 0 (i should precede j); red: a<sub>ij</sub> &lt; 0.
      </p>
    </div>
  );
}
