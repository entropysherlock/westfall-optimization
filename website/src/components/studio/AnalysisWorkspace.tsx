"use client";
/**
 * Analysis workspace: matrix explorer, ordering changes, per-item contributions, weighted disagreements,
 * arc and graph views. All values come from analysis.ts, which is tested against exact recomputation.
 */
import { useMemo, useState } from "react";
import { backwardPairs, componentRanges, itemContributions, movement } from "@/lib/studio/analysis";
import type { Problem } from "@/lib/studio/model";
import type { SolveResult } from "@/lib/studio/report";
import { Q } from "@/lib/studio/rational";
import MatrixExplorer from "./MatrixExplorer";
import { ArcDiagram, GraphView } from "./Viz";
import { Empty, Metric, Panel, Term, fmtInt } from "./ui";

type Tab = "matrix" | "movement" | "contrib" | "disagree" | "arcs";

export default function AnalysisWorkspace({ p, r, stale }: { p: Problem | null; r: SolveResult | null; stale: boolean }) {
  const [tab, setTab] = useState<Tab>("matrix");
  if (!p) return <Empty title="Nothing to analyse yet">Load a valid problem first.</Empty>;
  const tabs: [Tab, string][] = [["matrix", "Matrix"], ["movement", "Ordering changes"], ["contrib", "Item contributions"], ["disagree", "Disagreements"], ["arcs", "Arcs and graph"]];
  return (
    <div className="space-y-4">
      {stale && <div className="ws-panel px-4 py-2.5 text-[13px] ws-amber" role="status">The problem changed after the last run: the optimized ordering below belongs to the earlier instance, so only the input ordering is shown.</div>}
      <div className="ws-tabs" role="tablist" aria-label="Analysis views">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className="ws-tab" onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === "matrix" && <MatrixTab p={p} r={stale ? null : r} />}
      {tab !== "matrix" && (!r || stale) && <Empty title="Run a solver to analyse an ordering">These views compare the optimized ordering with the input ordering.</Empty>}
      {tab === "movement" && r && !stale && <MovementTab p={p} r={r} />}
      {tab === "contrib" && r && !stale && <ContribTab p={p} order={r.order} />}
      {tab === "disagree" && r && !stale && <DisagreeTab p={p} order={r.order} initial={p.initialOrder} />}
      {tab === "arcs" && r && !stale && (
        <Panel title="Arc diagram and preference graph" sub="An arc joins every pair with a positive margin. Arcs above the line agree with the ordering; arcs below it (coral) are backward.">
          <p className="ws-lbl">Optimized ordering</p>
          <ArcDiagram M={p.M} order={r.order} names={p.names} />
          <p className="ws-lbl mt-3">Initial ordering</p>
          <ArcDiagram M={p.M} order={p.initialOrder} names={p.names} height={180} />
          <p className="ws-lbl mt-4">Directed preference graph (items numbered by optimized position)</p>
          <GraphView M={p.M} order={r.order} names={p.names} />
        </Panel>
      )}
    </div>
  );
}

function MatrixTab({ p, r }: { p: Problem; r: SolveResult | null }) {
  const [mode, setMode] = useState<"optimized" | "initial" | "compare">(r ? "optimized" : "initial");
  const exact = useMemo(() => (u: number, v: number) => { const x = p.A[u][v]; return x.den === 1n ? x.toString() : `${x.toString()} ≈ ${x.toDecimal(4)}`; }, [p]);
  const rangesOpt = useMemo(() => (r ? componentRanges(p.M, r.order) : []), [p, r]);
  const effective = r ? mode : "initial";
  return (
    <Panel id="matrix" title="Matrix explorer" sub={<>Entry (row, column) is the margin <span className="num">a</span> for placing the row item first. With rows and columns in a good ordering, teal concentrates above the diagonal; teal below it marks a backward pair. Dashed violet squares are strong components.</>}
      actions={r ? (
        <div className="flex rounded-md border p-0.5" style={{ borderColor: "var(--ws-line-strong)" }} role="radiogroup" aria-label="Matrix ordering">
          {([["optimized", "Optimized"], ["initial", "Initial"], ["compare", "Side by side"]] as const).map(([m, l]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className="rounded px-2.5 py-1 text-[12.5px] font-medium"
              style={{ background: mode === m ? "var(--ws-raised)" : "transparent", color: mode === m ? "var(--ws-text)" : "var(--ws-muted)" }}>{l}</button>
          ))}
        </div>) : undefined}>
      {effective === "compare" && r ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <MatrixExplorer M={p.M} names={p.names} order={p.initialOrder} exact={exact} label="Initial ordering" height={460} testId="matrix-initial" />
          <MatrixExplorer M={p.M} names={p.names} order={r.order} exact={exact} ranges={rangesOpt} label="Optimized ordering" height={460} testId="matrix-optimized" />
        </div>
      ) : effective === "optimized" && r ? (
        <MatrixExplorer M={p.M} names={p.names} order={r.order} exact={exact} ranges={rangesOpt} label="Optimized ordering" testId="matrix-explorer" />
      ) : (
        <MatrixExplorer M={p.M} names={p.names} order={p.initialOrder} exact={exact} label="Initial ordering" testId="matrix-explorer" />
      )}
      <Legend />
    </Panel>
  );
}

function Legend() {
  const sw = (bg: string) => <span className="inline-block h-3 w-3 rounded-sm align-[-2px]" style={{ background: bg }} />;
  return (
    <p className="ws-sub mt-2 flex flex-wrap gap-x-4 gap-y-1">
      <span>{sw("var(--ws-accent)")} a &gt; 0: row item should come first</span>
      <span>{sw("var(--ws-back)")} a &lt; 0: column item should come first</span>
      <span>{sw("var(--ws-zero)")} tie (a = 0)</span>
      <span>Intensity ∝ √|a|</span>
    </p>
  );
}

function MovementTab({ p, r }: { p: Problem; r: SolveResult }) {
  const m = useMemo(() => movement(p.initialOrder, r.order), [p, r]);
  const n = p.n;
  const show = n <= 80;
  const H = Math.max(160, Math.min(1400, n * 16)), W = 520, x0 = 150, x1 = W - 150;
  const y = (i: number) => 10 + (i * (H - 20)) / Math.max(1, n - 1);
  return (
    <Panel id="movement" title="Ordering changes" sub="How every item moved from the input ordering to the optimized one.">
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label={<Term def="Number of item pairs whose relative order differs between the two orderings.">Kendall distance</Term>} value={fmtInt(m.kendall)} hint={`of ${fmtInt((n * (n - 1)) / 2)} pairs`} testId="kendall" />
        <Metric label={<Term def="Sum over items of |final position − initial position|.">Footrule</Term>} value={fmtInt(m.footrule)} />
        <Metric label="Largest shift" value={fmtInt(m.maxShift)} hint="positions" />
        <Metric label="Unmoved items" value={fmtInt(m.unchanged)} />
      </div>
      {show ? (
        <div className="ws-scroll mt-3 max-h-[620px] overflow-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[640px]" role="img" aria-label={`Slope chart of ${n} items from initial to optimized position`}>
            {m.items.map((it) => {
              const up = it.delta < 0, same = it.delta === 0;
              return (
                <g key={it.item}>
                  <line x1={x0} x2={x1} y1={y(it.from)} y2={y(it.to)} style={{ stroke: same ? "var(--ws-line-strong)" : up ? "var(--ws-accent)" : "var(--ws-back)" }} strokeOpacity={same ? 0.8 : 0.7} strokeWidth={same ? 1 : 1.4} />
                  {n <= 50 && <>
                    <text x={x0 - 6} y={y(it.from) + 3.5} textAnchor="end" style={{ fill: "var(--ws-muted)", font: "500 10.5px Inter Variable, sans-serif" }}>{it.from + 1}. {p.names[it.item].slice(0, 16)}</text>
                    <text x={x1 + 6} y={y(it.to) + 3.5} style={{ fill: "var(--ws-text)", font: "500 10.5px Inter Variable, sans-serif" }}>{it.to + 1}. {p.names[it.item].slice(0, 16)}</text>
                  </>}
                </g>
              );
            })}
          </svg>
          <p className="ws-sub">Left: input ordering. Right: optimized ordering. Teal lines moved earlier, coral moved later, grey stayed.</p>
        </div>
      ) : <p className="ws-sub mt-3">The slope chart is drawn for up to 80 items; the table below lists every move.</p>}
      <div className="ws-scroll mt-3 max-h-[360px] overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
        <table className="ws-table">
          <thead><tr><th>Item</th><th>Initial</th><th>Optimized</th><th>Shift</th></tr></thead>
          <tbody>{[...m.items].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 400).map((it) => (
            <tr key={it.item}><td>{p.names[it.item]}</td><td className="num">{it.from + 1}</td><td className="num">{it.to + 1}</td><td className={`num ${it.delta < 0 ? "ws-accent" : it.delta > 0 ? "ws-back" : "ws-faint"}`}>{it.delta === 0 ? "—" : it.delta < 0 ? `↑ ${-it.delta}` : `↓ ${it.delta}`}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function ContribTab({ p, order }: { p: Problem; order: number[] }) {
  const [sort, setSort] = useState<"position" | "backward" | "net">("backward");
  const c = useMemo(() => itemContributions(p, order), [p, order]);
  const rows = useMemo(() => {
    const x = [...c];
    if (sort === "backward") x.sort((a, b) => b.backward.cmp(a.backward) || a.position - b.position);
    else if (sort === "net") x.sort((a, b) => b.net.cmp(a.net) || a.position - b.position);
    return x;
  }, [c, sort]);
  const max = useMemo(() => Math.max(1e-12, ...c.map((x) => Number(x.satisfied.add(x.backward).toDecimal(8)))), [c]);
  const total = c.reduce((s, x) => s.add(x.net), Q.ZERO);
  return (
    <Panel id="contrib" title="Item contributions" sub={<>For each item: the weight of its pairs that the ordering satisfies (teal) and places backward (coral). Its share of F_A is half the difference; the shares add up exactly to F_A = {total.toDecimal(4)}.</>}
      actions={<select className="ws-field w-auto py-1 text-[12.5px]" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort items"><option value="backward">Most backward weight first</option><option value="net">Largest share first</option><option value="position">Optimized position</option></select>}>
      <div className="ws-scroll max-h-[560px] overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
        <table className="ws-table" data-testid="contrib-table">
          <thead><tr><th>Pos.</th><th>Item</th><th className="w-[40%]">Satisfied | backward</th><th>Backward pairs</th><th>Share of F_A</th></tr></thead>
          <tbody>{rows.slice(0, 400).map((x) => {
            const s = Number(x.satisfied.toDecimal(8)), b = Number(x.backward.toDecimal(8));
            return (
              <tr key={x.item}>
                <td className="num">{x.position + 1}</td><td>{p.names[x.item]}</td>
                <td>
                  <div className="flex h-2.5 overflow-hidden rounded-sm" style={{ background: "var(--ws-sunken)" }} aria-hidden>
                    <div style={{ width: `${(s / max) * 100}%`, background: "var(--ws-accent)" }} /><div style={{ width: `${(b / max) * 100}%`, background: "var(--ws-back)" }} />
                  </div>
                  <span className="num text-[11px] ws-faint">{x.satisfied.toDecimal(2)} | {x.backward.toDecimal(2)}</span>
                </td>
                <td className="num">{x.backwardPairs}</td>
                <td className="num">{x.net.toDecimal(4)}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {rows.length > 400 && <p className="ws-sub mt-1">Showing 400 of {rows.length} items; the JSON export contains the full result.</p>}
    </Panel>
  );
}

function DisagreeTab({ p, order, initial }: { p: Problem; order: number[]; initial: number[] }) {
  const pairs = useMemo(() => backwardPairs(p, order), [p, order]);
  const before = useMemo(() => backwardPairs(p, initial), [p, initial]);
  const sum = pairs.reduce((s, x) => s.add(x.weight), Q.ZERO);
  return (
    <Panel id="disagree" title="Weighted disagreements" sub={<>Pairs the optimized ordering places against their margin. Their weights add up exactly to the backward weight β = {sum.toDecimal(4)}.</>}>
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Backward pairs (optimized)" value={fmtInt(pairs.length)} tone={pairs.length ? "back" : "green"} />
        <Metric label="Backward pairs (initial)" value={fmtInt(before.length)} />
        <Metric label="Backward weight β" value={sum.toDecimal(4)} />
      </div>
      {pairs.length === 0 ? <p className="ws-sub mt-3">No pair is placed against its margin: the ordering agrees with every strict preference.</p> : (
        <div className="ws-scroll mt-3 max-h-[480px] overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
          <table className="ws-table">
            <thead><tr><th>Placed first</th><th>Then</th><th>Margin a(first, then)</th><th>Weight lost</th></tr></thead>
            <tbody>{pairs.slice(0, 500).map((x) => (
              <tr key={`${x.first}-${x.then}`}><td>{p.names[x.first]}</td><td>{p.names[x.then]}</td><td className="num ws-back">{x.margin.toDecimal(4)}</td><td className="num">{x.weight.toDecimal(4)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {pairs.length > 500 && <p className="ws-sub mt-1">Showing the 500 heaviest of {fmtInt(pairs.length)}.</p>}
      <p className="ws-sub mt-2">Backward pairs are unavoidable whenever preferences are cyclic: in a proved optimum no reordering can reduce their total weight.</p>
    </Panel>
  );
}
