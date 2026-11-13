"use client";
/**
 * Problem workspace: load (examples, files, paste, synthetic generator, local sessions), edit (text or grid),
 * validate, and preview the exact transformation to the skew-symmetric model.
 */
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { generate, type Generator } from "@/lib/engine";
import { EXAMPLES, largeExample, type Example } from "@/lib/studio/examples";
import { LIMITS, type ParseError } from "@/lib/studio/parse";
import type { Problem } from "@/lib/studio/model";
import { parseQ } from "@/lib/studio/rational";
import type { InputFormat, InterpChoice, SessionEntry } from "@/lib/studio/session";
import { Panel, Term } from "./ui";

export interface Built { problem: Problem | null; errors: ParseError[]; stage: "parse" | "model" | null }

const INTERP_LABEL: Record<InterpChoice, string> = {
  auto: "Detect (or use the file's declaration)",
  skew: "Skew-symmetric margins (a_ij = −a_ji)",
  benefit: "Benefit: entry (i, j) is gained when i precedes j",
  cost: "Cost: entry (i, j) is paid when i precedes j",
};

const GENERATORS: [Generator, string, string][] = [
  ["near-transitive", "Near-transitive", "a consistent ranking with 15% of pairs reversed"],
  ["random-int", "Random integer margins", "every pair has a margin in −5…5 (no ties)"],
  ["ties", "Ties-heavy", "margins in −2…2, so about one pair in five is a tie"],
  ["blocks", "Three frustrated blocks", "consistent between blocks, cyclic inside them"],
  ["cyclic", "Cyclic tournament", "every item beats the next ⌊(n−1)/2⌋; maximally intransitive"],
];

export function generatedText(kind: Generator, n: number, seed: number): string {
  const M = generate(kind, n, seed);
  const names = M.map((_, i) => `x${String(i + 1).padStart(String(n).length, "0")}`);
  return [`# synthetic ${kind} instance, n = ${n}, seed = ${seed} (Westfall Studio generator; reproducible)`, "," + names.join(","), ...M.map((r, i) => [names[i], ...r].join(","))].join("\n") + "\n";
}

export interface ProblemProps {
  text: string; setText: (t: string) => void;
  format: InputFormat; setFormat: (f: InputFormat) => void;
  interp: InterpChoice; setInterp: (i: InterpChoice) => void;
  exampleId: string;
  loadExample: (ex: Example) => void;
  loadText: (text: string, format: InputFormat, interp: InterpChoice, note: string) => void;
  onFile: (f: File | undefined) => void;
  fileNote: string | null;
  built: Built;
  nameEdits: Record<number, string>; setNameEdits: (f: (x: Record<number, string>) => Record<number, string>) => void;
  dirty: boolean; resetOriginal: () => void;
  sessions: SessionEntry[]; saveCurrent: (name: string) => void; duplicate: () => void; restore: (id: string) => void; remove: (id: string) => void;
  exportSession: () => void; importSession: (f: File | undefined) => void; sessionNote: string | null;
  initialOverride: number[] | null; clearInitial: () => void;
}

export default function ProblemWorkspace(props: ProblemProps) {
  const { built } = props;
  const p = built.problem;
  const [editor, setEditor] = useState<"text" | "grid">("text");
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="space-y-4">
        <LoadPanel {...props} />
        <SessionPanel {...props} />
      </div>
      <div className="space-y-4 min-w-0">
        <Panel id="editor" title="Data" sub={<>Paste or edit a matrix, an edge list (<span className="num">from,to,weight</span>) or JSON. <Link className="ws-accent underline" href="/docs/#input-formats">Format reference</Link>.</>}
          actions={<>
            {props.dirty && <button type="button" className="ws-btn ws-btn-ghost" onClick={props.resetOriginal}>Reset to original input</button>}
            <div className="ws-tabs !border-0" role="tablist" aria-label="Editor">
              <button type="button" role="tab" aria-selected={editor === "text"} className="ws-tab" onClick={() => setEditor("text")}>Text</button>
              <button type="button" role="tab" aria-selected={editor === "grid"} className="ws-tab" onClick={() => setEditor("grid")} data-testid="grid-tab">Grid</button>
            </div>
          </>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="ws-lbl" htmlFor="format">Format</label>
              <select id="format" className="ws-field mt-1" value={props.format} onChange={(e) => props.setFormat(e.target.value as InputFormat)}>
                <option value="auto">Detect automatically</option>
                <option value="matrix">Matrix (CSV / TSV / spaces)</option>
                <option value="edges">Edge list: from,to,weight</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="ws-lbl" htmlFor="interp">How to read the numbers</label>
              <select id="interp" className="ws-field mt-1" value={props.interp} onChange={(e) => props.setInterp(e.target.value as InterpChoice)}>
                {(Object.keys(INTERP_LABEL) as InterpChoice[]).map((k) => <option key={k} value={k}>{INTERP_LABEL[k]}</option>)}
              </select>
            </div>
          </div>
          {editor === "text" ? (
            <div className="mt-3">
              <label className="ws-lbl" htmlFor="data">Data</label>
              <textarea id="data" data-testid="data-input" spellCheck={false} value={props.text} onChange={(e) => props.setText(e.target.value)}
                className="ws-field ws-scroll num mt-1 h-64 resize-y text-[12px] leading-relaxed" />
              <p className="ws-sub mt-1">{props.text.length.toLocaleString("en-US")} characters · limit {LIMITS.maxBytes / 1e6} MB, {LIMITS.maxVertices} items, values up to 10¹² (decimals and fractions such as 3/7 are exact).</p>
            </div>
          ) : (
            <GridEditor key={gridKey(p)} p={p} interp={props.interp} loadText={props.loadText} />
          )}
          <Validation built={built} />
          {props.initialOverride && p && (
            <p className="ws-sub mt-2">The initial order is set from a previous result (it seeds local search and the exclusion DP, and is the baseline for “improvement”). <button type="button" className="ws-accent underline" onClick={props.clearInitial}>Use the input order instead</button></p>
          )}
        </Panel>
        {p && <ModelPreview p={p} nameEdits={props.nameEdits} setNameEdits={props.setNameEdits} />}
      </div>
    </div>
  );
}

function LoadPanel(props: ProblemProps) {
  const [kind, setKind] = useState<Generator>("near-transitive");
  const [gn, setGn] = useState(20);
  const [gseed, setGseed] = useState(1);
  const [over, setOver] = useState(false);
  return (
    <Panel id="load" title="Load a problem" sub="Everything stays in this browser. Nothing is uploaded.">
      <p className="ws-lbl">Examples</p>
      <div className="mt-1.5 grid gap-1">
        {[...EXAMPLES, largeExample()].map((ex) => (
          <button key={ex.id} type="button" onClick={() => props.loadExample(ex)} aria-pressed={props.exampleId === ex.id}
            className="flex items-baseline justify-between gap-3 rounded-md border px-2.5 py-1.5 text-left text-[13px]"
            style={{ borderColor: props.exampleId === ex.id ? "var(--ws-accent)" : "var(--ws-line)", background: props.exampleId === ex.id ? "color-mix(in srgb, var(--ws-accent) 10%, transparent)" : "transparent" }}>
            <span className="font-medium ws-text">{ex.title}</span>
            <span className="shrink-0 text-[11.5px] ws-faint">{ex.domain}</span>
          </button>
        ))}
      </div>

      <p className="ws-lbl mt-4">File</p>
      <label htmlFor="file"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); props.onFile(e.dataTransfer.files?.[0]); }}
        className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-3 py-4 text-center text-[12.5px]"
        style={{ borderColor: over ? "var(--ws-accent)" : "var(--ws-line-strong)", background: over ? "color-mix(in srgb, var(--ws-accent) 8%, transparent)" : "var(--ws-sunken)" }}>
        <span className="ws-text font-medium">Drop a CSV, TSV, TXT or JSON file, or choose one</span>
        <span className="ws-faint mt-0.5">up to {LIMITS.maxBytes / 1e6} MB · exported Studio results re-import with their ordering</span>
        <input id="file" data-testid="file-input" type="file" className="sr-only" accept=".csv,.tsv,.txt,.json,text/csv,application/json,text/plain" onChange={(e) => { props.onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {props.fileNote && <p className="ws-sub mt-1.5" role="status">{props.fileNote}</p>}

      <p className="ws-lbl mt-4">Synthetic instance</p>
      <div className="mt-1.5 grid grid-cols-[1fr_72px_72px] gap-2">
        <select className="ws-field" aria-label="Generator" value={kind} onChange={(e) => setKind(e.target.value as Generator)}>
          {GENERATORS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input className="ws-field num" type="number" min={2} max={400} aria-label="Number of items" value={gn} onChange={(e) => setGn(Math.max(2, Math.min(400, Math.round(Number(e.target.value) || 2))))} />
        <input className="ws-field num" type="number" min={1} max={1_000_000} aria-label="Generator seed" value={gseed} onChange={(e) => setGseed(Math.max(1, Math.min(1_000_000, Math.round(Number(e.target.value) || 1))))} />
      </div>
      <p className="ws-sub mt-1">{GENERATORS.find((g) => g[0] === kind)![2]}. Same kind, size and seed always give the same matrix.</p>
      <button type="button" className="ws-btn mt-2 w-full" data-testid="generate"
        onClick={() => props.loadText(generatedText(kind, gn, gseed), "matrix", "skew", `Generated ${kind} n = ${gn}, seed ${gseed}.`)}>Generate {gn}-item instance</button>
    </Panel>
  );
}

function SessionPanel(props: ProblemProps) {
  const [name, setName] = useState("");
  return (
    <Panel id="sessions" title="Local sessions" sub="Saved in this browser's local storage only; delete them here at any time.">
      <div className="flex gap-2">
        <input className="ws-field" placeholder="Session name" aria-label="Session name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        <button type="button" className="ws-btn" onClick={() => { props.saveCurrent(name); setName(""); }} data-testid="save-session">Save</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" className="ws-btn ws-btn-ghost px-2 py-1 text-[12px]" onClick={props.duplicate}>Duplicate problem</button>
        <button type="button" className="ws-btn ws-btn-ghost px-2 py-1 text-[12px]" onClick={props.exportSession}>Download session file</button>
        <label className="ws-btn ws-btn-ghost cursor-pointer px-2 py-1 text-[12px]">Open session file
          <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { props.importSession(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {props.sessionNote && <p className="ws-sub mt-1.5" role="status" data-testid="session-note">{props.sessionNote}</p>}
      {props.sessions.length > 0 ? (
        <ul className="mt-3 space-y-1" data-testid="session-list">
          {props.sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[12.5px]" style={{ background: "var(--ws-sunken)" }}>
              <span className="min-w-0"><span className="block truncate ws-text">{s.name}</span><span className="ws-faint">{new Date(s.savedAt).toLocaleString()} · {(s.bytes / 1024).toFixed(1)} KB</span></span>
              <span className="flex shrink-0 gap-1">
                <button type="button" className="ws-btn px-2 py-1 text-[12px]" onClick={() => props.restore(s.id)}>Restore</button>
                <button type="button" className="ws-btn ws-btn-ghost ws-btn-danger px-2 py-1 text-[12px]" onClick={() => props.remove(s.id)} aria-label={`Delete session ${s.name}`}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="ws-sub mt-3">No saved sessions yet.</p>}
    </Panel>
  );
}

export function Validation({ built }: { built: Built }) {
  if (built.problem)
    return (
      <div className="mt-3 rounded-md border px-3 py-2 text-[13px] ws-green" role="status" data-testid="validation-ok"
        style={{ borderColor: "color-mix(in srgb, var(--ws-green) 40%, transparent)", background: "color-mix(in srgb, var(--ws-green) 8%, transparent)" }}>
        Valid input: {built.problem.n} items.
        {built.problem.warnings.length > 0 && <ul className="mt-1 list-disc pl-5 text-[12px] ws-amber">{built.problem.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      </div>
    );
  return (
    <div className="mt-3 rounded-md border px-3 py-2 text-[13px] ws-back" role="alert" data-testid="validation-errors"
      style={{ borderColor: "color-mix(in srgb, var(--ws-back) 40%, transparent)", background: "color-mix(in srgb, var(--ws-back) 8%, transparent)" }}>
      <p className="font-semibold">{built.stage === "parse" ? "The input could not be read" : "The input cannot be modelled as stated"}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] leading-relaxed">{built.errors.map((e, i) => <li key={i}>{e.line ? `Line ${e.line}: ` : ""}{e.message}</li>)}</ul>
    </div>
  );
}

const gridKey = (p: Problem | null) => (p && p.n <= 40 ? `${p.n}:${p.names.join("|")}:${p.original.map((r) => r.map((x) => x.toString()).join(",")).join(";")}` : String(p?.n ?? 0));

/** Spreadsheet-style editor of the original data (n ≤ 40). Edits are written back as matrix text (remounted on change). */
function GridEditor({ p, interp, loadText }: { p: Problem | null; interp: InterpChoice; loadText: ProblemProps["loadText"] }) {
  const [draft] = useState<string[][] | null>(() => (p && p.n <= 40 ? p.original.map((r, i) => r.map((x, j) => (i === j ? "" : x.toString()))) : null));
  const [bad, setBad] = useState<string | null>(null);
  const [mirror, setMirror] = useState(true);
  const first = useRef<HTMLInputElement>(null);
  const key = gridKey(p);
  if (!p) return <p className="ws-sub mt-3">Fix the input first: the grid edits a valid instance.</p>;
  if (p.n > 40) return <p className="ws-sub mt-3">The grid editor is for up to 40 items (this instance has {p.n}, i.e. {(p.n * (p.n - 1)).toLocaleString("en-US")} cells). Edit large instances as text or in a spreadsheet, then load the file.</p>;
  if (!draft) return null;
  const skew = p.interpretation === "skew";
  const commit = (i: number, j: number, raw: string) => {
    const q = parseQ(raw.trim() === "" ? "0" : raw.trim());
    if (!q) { setBad(`“${raw}” at (${p.names[i]}, ${p.names[j]}) is not a number; use integers, decimals or fractions such as 3/7.`); return; }
    setBad(null);
    const next = draft.map((r) => r.slice());
    next[i][j] = q.toString();
    if (skew && mirror) next[j][i] = q.neg().toString();
    const text = "," + p.names.join(",") + "\n" + next.map((r, a) => [p.names[a], ...r.map((x, b) => (a === b ? "0" : x || "0"))].join(",")).join("\n") + "\n";
    loadText(text, "matrix", interp === "auto" && skew ? "skew" : interp, "");
  };
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="ws-sub">Rows are placed before columns. Press Enter or leave a cell to apply; values are exact.{p.source === "edges" ? " Editing here converts the edge list to a matrix." : ""}</p>
        {skew && <label className="flex items-center gap-2 text-[12.5px] ws-muted"><input type="checkbox" className="ws-check" checked={mirror} onChange={(e) => setMirror(e.target.checked)} />Keep skew-symmetric (set a_ji = −a_ij)</label>}
      </div>
      <div className="ws-scroll max-h-[420px] overflow-auto rounded-md border" style={{ borderColor: "var(--ws-line)" }}>
        <table className="num border-collapse text-[11.5px]" aria-label="Matrix editor">
          <thead><tr><th className="sticky left-0 top-0 z-20 px-2" style={{ background: "var(--ws-raised)" }} />{p.names.map((s, j) => <th key={j} scope="col" className="sticky top-0 z-10 px-1.5 py-1 font-medium ws-muted" style={{ background: "var(--ws-raised)" }} title={s}>{s.slice(0, 6)}</th>)}</tr></thead>
          <tbody>
            {draft.map((row, i) => (
              <tr key={i}>
                <th scope="row" className="sticky left-0 z-10 px-2 text-right font-medium ws-muted" style={{ background: "var(--ws-raised)" }} title={p.names[i]}>{p.names[i].slice(0, 8)}</th>
                {row.map((x, j) => (
                  <td key={j} className="p-0" style={{ border: "1px solid var(--ws-line)", background: i === j ? "var(--ws-diag)" : undefined }}>
                    {i === j ? <span className="block w-14" /> : (
                      <input ref={i === 0 && j === 1 ? first : undefined} aria-label={`${p.names[i]} before ${p.names[j]}`} defaultValue={x} key={`${key}-${i}-${j}`}
                        className="w-14 bg-transparent px-1.5 py-1 text-right outline-none focus:bg-[var(--ws-raised)]"
                        style={{ color: (parseQ(x)?.sign() ?? 0) > 0 ? "var(--ws-accent-strong)" : (parseQ(x)?.sign() ?? 0) < 0 ? "var(--ws-back)" : "var(--ws-faint)" }}
                        onBlur={(e) => { if (e.target.value !== x) commit(i, j, e.target.value); }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bad && <p className="mt-1.5 text-[12.5px] ws-back" role="alert">{bad}</p>}
    </div>
  );
}

function ModelPreview({ p, nameEdits, setNameEdits }: { p: Problem; nameEdits: Record<number, string>; setNameEdits: ProblemProps["setNameEdits"] }) {
  const [showNames, setShowNames] = useState(false);
  const objective = p.interpretation === "cost" ? "minimise Σ d_ij over pairs with i before j" : p.interpretation === "benefit" ? "maximise Σ c_ij over pairs with i before j" : "maximise F_A(π) = Σ_{r<s} a_{π_r π_s}";
  const identity = p.interpretation === "skew" ? "objective = F_A" : p.interpretation === "benefit" ? "objective = (F_A + S) / 2" : "objective = (S − F_A) / 2";
  const rows = useMemo(() => p.A.slice(0, 12).map((r) => r.slice(0, 12)), [p]);
  return (
    <Panel id="model" title="Transformation preview" sub="Every instance is reduced exactly to a skew-symmetric matrix A; the identity below converts back to your objective.">
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[13px]" data-testid="model-summary">
        <dt className="ws-muted">Items</dt><dd className="num">{p.n}</dd>
        <dt className="ws-muted">Source</dt><dd>{p.source === "edges" ? "edge list" : "matrix"}</dd>
        <dt className="ws-muted">Interpretation</dt><dd>{p.interpretation}</dd>
        <dt className="ws-muted">Your objective</dt><dd>{objective}</dd>
        <dt className="ws-muted">Solved as</dt><dd>maximise F_A with A {p.interpretation === "skew" ? "as given" : p.interpretation === "benefit" ? "= C − Cᵀ" : "= Dᵀ − D"}</dd>
        <dt className="ws-muted">Identity</dt><dd className="num text-[12.5px]">{identity}{p.interpretation !== "skew" && <>, S = {p.offset.toDecimal(4)}</>}</dd>
        <dt className="ws-muted"><Term def="Pairs with a_ij ≠ 0. Pairs with a_ij = 0 are ties: either order scores the same.">Nonzero pairs</Term></dt><dd className="num">{p.stats.nonzeroPairs} of {(p.n * (p.n - 1)) / 2}</dd>
        <dt className="ws-muted"><Term def="Exact: all values are scaled to integers whose partial sums fit in 53 bits, so solvers can prove optimality. Otherwise floating point is used and nothing can be certified.">Arithmetic</Term></dt>
        <dd className={p.exact ? "" : "ws-amber"}>{p.exact ? `exact integers (A scaled by ${p.scale})` : "floating point: optimality cannot be certified"}</dd>
      </dl>
      <div className="ws-scroll mt-3 overflow-x-auto">
        <table className="num border-collapse text-[11px]" aria-label="Transformed skew-symmetric matrix A (first 12 items)">
          <caption className="ws-sub mb-1 text-left">Matrix A{p.n > 12 ? " (first 12 of " + p.n + " items)" : ""}: row before column</caption>
          <thead><tr><th />{p.names.slice(0, 12).map((s, j) => <th key={j} className="px-1.5 py-1 font-medium ws-faint">{s.slice(0, 6)}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => (
            <tr key={i}><th className="pr-2 text-right font-medium ws-faint">{p.names[i].slice(0, 8)}</th>
              {row.map((x, j) => <td key={j} className="px-1.5 py-1 text-right" style={{ border: "1px solid var(--ws-line)", background: i === j ? "var(--ws-diag)" : undefined, color: i === j ? undefined : x.sign() > 0 ? "var(--ws-accent-strong)" : x.sign() < 0 ? "var(--ws-back)" : "var(--ws-faint)" }}>{i === j ? "" : x.den === 1n ? x.toString() : x.toDecimal(2)}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <button type="button" className="ws-btn ws-btn-ghost mt-3 px-2 py-1 text-[12.5px]" onClick={() => setShowNames((v) => !v)} aria-expanded={showNames}>{showNames ? "Hide item names" : "Rename items"}</button>
      {showNames && (
        <div className="ws-scroll mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {p.names.map((s, i) => (
            <label key={i} className="text-[11.5px] ws-faint">#{i + 1}
              <input className="ws-field mt-0.5 py-1" value={nameEdits[i] ?? s} maxLength={80} onChange={(e) => setNameEdits((x) => ({ ...x, [i]: e.target.value }))} />
            </label>
          ))}
        </div>
      )}
    </Panel>
  );
}
