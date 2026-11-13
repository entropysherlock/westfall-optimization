"use client";
/**
 * Interactive matrix explorer (Mission 039). Canvas rendering, so even a 400 × 400 matrix is one element.
 * - Cells: teal = a_ij > 0 (row item should precede column item), coral = a_ij < 0, flat = 0 (tie).
 *   Rows and columns follow an ordering, so for a good ordering the teal mass sits above the diagonal and
 *   every teal cell below the diagonal is a backward (disagreeing) pair.
 * - Zoom (wheel, buttons, + / −), pan (drag, arrow keys with Shift), hover or keyboard cursor to read the
 *   exact rational entry, click to pin a row/column highlight.
 * - Large matrices are aggregated into blocks when cells would be under 2 px; exact entries remain readable
 *   by zooming in, and through the row inspector below the canvas.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { aggregate } from "@/lib/studio/analysis";

export interface ExplorerProps {
  M: number[][];
  names: string[];
  order: number[];
  /** exact entry a_{u,v} as text (item indices) */
  exact: (u: number, v: number) => string;
  ranges?: { start: number; end: number; size: number }[];
  label: string;
  height?: number;
  testId?: string;
}

const LABEL_PAD = 0;

function cssVar(el: Element, name: string) { return getComputedStyle(el).getPropertyValue(name).trim() || "#888"; }
function hexToRgb(h: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return [128, 128, 128];
  const x = parseInt(m[1], 16);
  return [(x >> 16) & 255, (x >> 8) & 255, x & 255];
}

export default function MatrixExplorer({ M, names, order, exact, ranges, label, height = 520, testId }: ExplorerProps) {
  const n = order.length;
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 600, h: height });
  // null = "fit to the canvas" (follows resizes); any zoom or pan stores an explicit view
  const [userView, setUserView] = useState<{ scale: number; ox: number; oy: number } | null>(null);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [pin, setPin] = useState<{ r: number; c: number } | null>(null);
  const [forceAgg, setForceAgg] = useState<"auto" | "on" | "off">("auto");
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const maxAbs = useMemo(() => { let m = 0; for (const r of M) for (const x of r) m = Math.max(m, Math.abs(x)); return m || 1; }, [M]);

  // responsive size
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.max(240, Math.floor(el.clientWidth));
      setSize({ w, h: Math.min(height, w) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const fitView = useMemo(() => {
    const side = Math.min(size.w, size.h) - LABEL_PAD;
    const scale = side / Math.max(1, n);
    return { scale, ox: (size.w - scale * n) / 2, oy: (size.h - scale * n) / 2 };
  }, [size.w, size.h, n]);
  const view = userView ?? fitView;
  const setView = useCallback((f: (v: { scale: number; ox: number; oy: number }) => { scale: number; ox: number; oy: number }) => setUserView((u) => f(u ?? fitView)), [fitView]);
  const fit = () => setUserView(null);

  const aggregated = forceAgg === "on" || (forceAgg === "auto" && view.scale < 2);
  const bins = Math.max(8, Math.min(n, Math.floor((Math.min(size.w, size.h)) / 4)));
  const grid = useMemo(() => (aggregated ? aggregate(M, order, bins) : null), [aggregated, M, order, bins]);

  // draw
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size.w * dpr; c.height = size.h * dpr;
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const root = c.closest(".ws") ?? document.body;
    const pos = hexToRgb(cssVar(root, "--ws-accent")), neg = hexToRgb(cssVar(root, "--ws-back"));
    const zero = cssVar(root, "--ws-zero"), diag = cssVar(root, "--ws-diag"), line = cssVar(root, "--ws-line-strong"), text = cssVar(root, "--ws-muted"), sunken = cssVar(root, "--ws-sunken");
    g.fillStyle = sunken; g.fillRect(0, 0, size.w, size.h);
    const { scale: s, ox, oy } = view;
    const shade = (v: number, max: number) => {
      const a = 0.14 + 0.86 * Math.sqrt(Math.min(1, Math.abs(v) / max));
      const [r, gg, b] = v > 0 ? pos : neg;
      return `rgba(${r},${gg},${b},${a.toFixed(3)})`;
    };
    if (grid) {
      const k = grid.bins;
      let bmax = 0;
      for (let i = 0; i < k * k; i++) bmax = Math.max(bmax, Math.abs(grid.pos[i] + grid.neg[i]) / Math.max(1, (grid.edges[Math.floor(i / k) + 1] - grid.edges[Math.floor(i / k)]) * (grid.edges[(i % k) + 1] - grid.edges[i % k])));
      for (let bi = 0; bi < k; bi++) for (let bj = 0; bj < k; bj++) {
        const x0 = ox + grid.edges[bj] * s, y0 = oy + grid.edges[bi] * s, w = (grid.edges[bj + 1] - grid.edges[bj]) * s, h = (grid.edges[bi + 1] - grid.edges[bi]) * s;
        if (x0 > size.w || y0 > size.h || x0 + w < 0 || y0 + h < 0) continue;
        const cells = (grid.edges[bi + 1] - grid.edges[bi]) * (grid.edges[bj + 1] - grid.edges[bj]);
        const mean = (grid.pos[bi * k + bj] + grid.neg[bi * k + bj]) / Math.max(1, cells);
        g.fillStyle = bi === bj ? diag : mean === 0 ? zero : shade(mean, bmax || 1);
        g.fillRect(x0, y0, Math.ceil(w) + 0.5, Math.ceil(h) + 0.5);
      }
    } else {
      const i0 = Math.max(0, Math.floor(-oy / s)), i1 = Math.min(n, Math.ceil((size.h - oy) / s));
      const j0 = Math.max(0, Math.floor(-ox / s)), j1 = Math.min(n, Math.ceil((size.w - ox) / s));
      const gap = s >= 6 ? 1 : 0;
      for (let i = i0; i < i1; i++) {
        const row = M[order[i]];
        for (let j = j0; j < j1; j++) {
          const v = row[order[j]];
          g.fillStyle = i === j ? diag : v === 0 ? zero : shade(v, maxAbs);
          g.fillRect(ox + j * s, oy + i * s, Math.max(1, s - gap), Math.max(1, s - gap));
        }
      }
      if (s >= 22) {
        g.font = `${Math.min(12, s / 2.6)}px "JetBrains Mono", monospace`;
        g.textAlign = "center"; g.textBaseline = "middle";
        for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) {
          if (i === j) continue;
          const v = M[order[i]][order[j]];
          if (v === 0) continue;
          g.fillStyle = Math.abs(v) / maxAbs > 0.45 ? "rgba(255,255,255,.92)" : text;
          const t = Number.isInteger(v) ? String(v) : v.toFixed(1);
          if (t.length * s / 4 < s * 1.4) g.fillText(t, ox + j * s + s / 2, oy + i * s + s / 2);
        }
      }
    }
    // strong components (contiguous ranges) as outlines on the diagonal
    if (ranges && ranges.length > 1) {
      g.strokeStyle = cssVar(root, "--ws-violet"); g.lineWidth = 1.25; g.setLineDash([4, 3]);
      for (const r of ranges) if (r.size > 1) g.strokeRect(ox + r.start * s + 0.5, oy + r.start * s + 0.5, r.size * s - 1, r.size * s - 1);
      g.setLineDash([]);
    }
    // diagonal guide
    g.strokeStyle = line; g.lineWidth = 1;
    g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + n * s, oy + n * s); g.stroke();
    // pinned / hovered row & column
    const mark = (p: { r: number; c: number } | null, color: string, alpha: number) => {
      if (!p) return;
      g.fillStyle = color; g.globalAlpha = alpha;
      g.fillRect(ox, oy + p.r * s, n * s, s); g.fillRect(ox + p.c * s, oy, s, n * s);
      g.globalAlpha = 1;
      g.strokeStyle = color; g.lineWidth = 1.5; g.strokeRect(ox + p.c * s, oy + p.r * s, s, s);
    };
    const tc = cssVar(root, "--ws-text");
    mark(pin, tc, 0.08);
    mark(hover, tc, 0.06);
    g.strokeStyle = line; g.strokeRect(ox - 0.5, oy - 0.5, n * s + 1, n * s + 1);
  }, [size, view, grid, M, order, n, maxAbs, ranges, hover, pin]);

  const cellAt = (ex: number, ey: number) => {
    const r = Math.floor((ey - view.oy) / view.scale), c = Math.floor((ex - view.ox) / view.scale);
    return r >= 0 && c >= 0 && r < n && c < n ? { r, c } : null;
  };
  const local = (e: { clientX: number; clientY: number }) => { const b = cv.current!.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const zoomAt = (x: number, y: number, f: number) => setView((v) => {
    const fitS = (Math.min(size.w, size.h) - LABEL_PAD) / Math.max(1, n);
    const s = Math.max(fitS * 0.5, Math.min(80, v.scale * f));
    return { scale: s, ox: x - ((x - v.ox) * s) / v.scale, oy: y - ((y - v.oy) * s) / v.scale };
  });

  // wheel zoom (non-passive so the page does not scroll while zooming the matrix)
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // plain wheel scrolls the page; Ctrl/⌘ + wheel (or a trackpad pinch) zooms
      e.preventDefault();
      const { x, y } = local(e);
      zoomAt(x, y, Math.exp(-e.deltaY * 0.0015));
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  });

  const focusCell = hover ?? pin;
  const onKey = (e: React.KeyboardEvent) => {
    const cur = focusCell ?? { r: 0, c: 1 < n ? 1 : 0 };
    const step = e.shiftKey ? 40 : 0;
    let handled = true;
    if (e.key === "+" || e.key === "=") zoomAt(size.w / 2, size.h / 2, 1.25);
    else if (e.key === "-" || e.key === "_") zoomAt(size.w / 2, size.h / 2, 0.8);
    else if (e.key === "0") fit();
    else if (step && e.key.startsWith("Arrow")) setView((v) => ({ ...v, ox: v.ox + (e.key === "ArrowLeft" ? step : e.key === "ArrowRight" ? -step : 0), oy: v.oy + (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0) }));
    else if (e.key === "ArrowRight") setHover({ ...cur, c: Math.min(n - 1, cur.c + 1) });
    else if (e.key === "ArrowLeft") setHover({ ...cur, c: Math.max(0, cur.c - 1) });
    else if (e.key === "ArrowDown") setHover({ ...cur, r: Math.min(n - 1, cur.r + 1) });
    else if (e.key === "ArrowUp") setHover({ ...cur, r: Math.max(0, cur.r - 1) });
    else if (e.key === "Enter" || e.key === " ") setPin(cur);
    else if (e.key === "Escape") { setPin(null); setHover(null); }
    else handled = false;
    if (handled) e.preventDefault();
  };

  const info = focusCell && (() => {
    const u = order[focusCell.r], v = order[focusCell.c];
    if (u === v) return { title: `${names[u]} (diagonal)`, body: "An item is never ordered relative to itself." };
    const val = exact(u, v);
    const x = M[u][v];
    const below = focusCell.r > focusCell.c;
    const meaning = x === 0 ? "tie: either order scores the same" : x > 0
      ? (below ? `backward: ${names[u]} should precede ${names[v]} but is placed after it` : `agrees: ${names[u]} is placed before ${names[v]}`)
      : (below ? `agrees: ${names[v]} is placed before ${names[u]}` : `backward: ${names[u]} is placed before ${names[v]} although the margin favours ${names[v]}`);
    return { title: `a(${names[u]}, ${names[v]}) = ${val}`, body: `row ${focusCell.r + 1}, column ${focusCell.c + 1} · ${meaning}` };
  })();

  const pinnedRow = pin ? order[pin.r] : null;
  const rowEntries = useMemo(() => {
    if (pinnedRow === null) return [];
    return order.filter((v) => v !== pinnedRow && M[pinnedRow][v] !== 0).map((v) => ({ v, x: M[pinnedRow][v] })).sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
  }, [pinnedRow, order, M]);

  return (
    <div data-testid={testId}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium ws-text">{label}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="ws-btn ws-btn-ghost px-2 py-1" onClick={() => zoomAt(size.w / 2, size.h / 2, 1.4)} aria-label="Zoom in">+</button>
          <button type="button" className="ws-btn ws-btn-ghost px-2 py-1" onClick={() => zoomAt(size.w / 2, size.h / 2, 1 / 1.4)} aria-label="Zoom out">−</button>
          <button type="button" className="ws-btn ws-btn-ghost px-2 py-1 text-[12px]" onClick={fit}>Fit</button>
          {n > 40 && (
            <select className="ws-field w-auto py-1 text-[12px]" value={forceAgg} onChange={(e) => setForceAgg(e.target.value as typeof forceAgg)} aria-label="Block aggregation">
              <option value="auto">Aggregate when dense</option>
              <option value="on">Always aggregate</option>
              <option value="off">Every cell</option>
            </select>
          )}
        </div>
      </div>
      <div ref={wrap} className="relative">
        <canvas ref={cv} tabIndex={0} role="img" data-testid={testId ? `${testId}-canvas` : undefined}
          aria-label={`${label}: ${n} by ${n} preference matrix in the ${label.toLowerCase()}. Arrow keys move the cursor, Enter pins a row and column, plus and minus zoom, 0 fits.`}
          className="block w-full cursor-crosshair rounded-md touch-none"
          style={{ height: size.h }}
          onKeyDown={onKey}
          onPointerDown={(e) => { (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy, moved: false }; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (d) {
              const dx = e.clientX - d.x, dy = e.clientY - d.y;
              if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
              if (d.moved) { setView((v) => ({ ...v, ox: d.ox + dx, oy: d.oy + dy })); return; }
            }
            const { x, y } = local(e);
            const cell = cellAt(x, y);
            setHover((h) => (h?.r === cell?.r && h?.c === cell?.c ? h : cell));
          }}
          onPointerUp={(e) => { const d = drag.current; drag.current = null; if (d && !d.moved) { const { x, y } = local(e); const cell = cellAt(x, y); setPin((p) => (cell && p && p.r === cell.r && p.c === cell.c ? null : cell)); } }}
          onPointerLeave={() => { if (!drag.current) setHover(null); }}
        />
      </div>
      <div className="mt-2 min-h-[44px] rounded-md px-1 text-[12.5px]" aria-live="polite" data-testid={testId ? `${testId}-readout` : undefined}>
        {info ? (<><p className="num ws-text">{info.title}</p><p className="ws-sub">{info.body}</p></>)
          : <p className="ws-sub">{aggregated ? `Colours show ${grid?.bins} × ${grid?.bins} block means. Hovering still reads the exact entry under the pointer; zoom (Ctrl/⌘ + wheel or the buttons) to see individual cells.` : "Hover or use the arrow keys to read an exact entry; click to pin a row and column. Ctrl/⌘ + wheel zooms, drag pans."}</p>}
      </div>
      {pinnedRow !== null && (
        <details className="mt-1 text-[12.5px]" open={n <= 60}>
          <summary className="ws-muted">Row inspector: every nonzero entry of {names[pinnedRow]} ({rowEntries.length})</summary>
          <div className="ws-scroll mt-2 max-h-56 overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
            <table className="ws-table">
              <thead><tr><th>Column item</th><th>Exact a(row, column)</th><th>Placed</th></tr></thead>
              <tbody>{rowEntries.slice(0, 400).map(({ v, x }) => {
                const after = order.indexOf(v) > order.indexOf(pinnedRow);
                const ok = (x > 0) === after;
                return <tr key={v}><td>{names[v]}</td><td className="num">{exact(pinnedRow, v)}</td><td className={ok ? "ws-accent" : "ws-back"}>{after ? "after the row item" : "before the row item"} · {ok ? "agrees" : "backward"}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
