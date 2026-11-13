/**
 * Input parsing for Westfall Optimization Studio.
 *
 * Supported inputs (see the Documentation page for the full specification):
 *   - matrix CSV / TSV / whitespace text, with optional header row and/or row labels;
 *   - weighted directed edge list CSV: `from,to,weight` (header optional);
 *   - JSON: `{ "matrix": [[...]] }`, `{ "edges": [...] }`, or an exported Studio result (re-import).
 *
 * Parsing never evaluates code and never trusts sizes: every input is bounded by LIMITS.
 * Values are parsed as exact rationals (decimals or fractions).
 */
import { parseQ, Q } from "./rational";

export const LIMITS = {
  maxBytes: 2_000_000,
  maxVertices: 400,
  maxEdges: 80_000,
  maxNameLength: 80,
  maxAbsValue: Q.of(10n ** 12n),
} as const;

export type Interpretation = "skew" | "benefit" | "cost";

export interface Edge {
  from: number;
  to: number;
  weight: Q;
  line?: number;
}

export interface RawInstance {
  source: "matrix" | "edges";
  names: string[];
  matrix?: (Q | null)[][];
  edges?: Edge[];
  interpretation?: Interpretation;
  initialOrder?: number[];
  title?: string;
  warnings: string[];
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export type ParseResult = { ok: true; value: RawInstance } | { ok: false; errors: ParseError[] };

const fail = (...errors: ParseError[]): ParseResult => ({ ok: false, errors });

function checkSize(text: string): ParseError | null {
  if (text.length > LIMITS.maxBytes) return { message: `input is larger than ${LIMITS.maxBytes / 1e6} MB` };
  if (text.trim().length === 0) return { message: "input is empty" };
  return null;
}

function checkValue(q: Q, where: string): ParseError | null {
  if (q.abs().cmp(LIMITS.maxAbsValue) > 0) return { message: `${where}: |value| exceeds 10^12` };
  return null;
}

function cleanName(s: string): string {
  return s.trim().replace(/^"(.*)"$/, "$1").slice(0, LIMITS.maxNameLength);
}

/** Split CSV-ish text into rows of cells. Lines starting with `#` are comments. */
export function splitRows(text: string): { cells: string[]; line: number }[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const firstData = lines.find((l) => l.trim() && !l.trim().startsWith("#")) ?? "";
  const delim = firstData.includes("\t") ? "\t" : firstData.includes(";") ? ";" : firstData.includes(",") ? "," : null;
  const rows: { cells: string[]; line: number }[] = [];
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (!l || l.startsWith("#")) return;
    const cells = delim ? raw.split(delim).map((c) => c.trim()) : l.split(/\s+/);
    rows.push({ cells, line: i + 1 });
  });
  return rows;
}

const isNumeric = (s: string) => parseQ(s) !== null;

/** Guess whether CSV text is a matrix or an edge list. */
export function guessCsvKind(text: string): "matrix" | "edges" {
  const rows = splitRows(text);
  if (rows.length === 0) return "matrix";
  const widths = new Set(rows.map((r) => r.cells.length));
  if (widths.size === 1 && rows[0].cells.length === 3) {
    const header = rows[0].cells.map((c) => c.toLowerCase());
    if (header[0].includes("from") || header[1].includes("to") || header[2].includes("weight")) return "edges";
    const data = rows.filter((r) => isNumeric(r.cells[2]));
    // a 3-column file whose first two columns are not all numeric is an edge list with labels
    if (data.some((r) => !isNumeric(r.cells[0]) || !isNumeric(r.cells[1]))) return "edges";
    // three numeric columns: a matrix only if the file is exactly square (3 rows)
    return rows.length === 3 ? "matrix" : "edges";
  }
  return "matrix";
}

/** Parse a square matrix with optional header row (names) and optional row labels. */
export function parseMatrixText(text: string): ParseResult {
  const sz = checkSize(text);
  if (sz) return fail(sz);
  let rows = splitRows(text);
  if (rows.length === 0) return fail({ message: "no data rows found" });
  let names: string[] | null = null;
  // header: first row contains a non-numeric, non-empty cell after the first column, or the first cell is empty
  const first = rows[0].cells;
  const headerLike = first.slice(1).some((c) => c !== "" && !isNumeric(c)) || (first[0] === "" && first.length > 1);
  if (headerLike) {
    rows = rows.slice(1);
  }
  // row labels: first column of every data row is non-numeric (and not blank)
  const rowLabels = rows.length > 0 && rows.every((r) => r.cells[0] !== "" && !isNumeric(r.cells[0]));
  if (rowLabels) {
    names = rows.map((r) => cleanName(r.cells[0]));
    rows = rows.map((r) => ({ ...r, cells: r.cells.slice(1) }));
  }
  if (headerLike) {
    const h = first.slice(rowLabels || first[0] === "" ? 1 : 0).map(cleanName);
    if (names && h.length === names.length && h.some((x, i) => x !== names![i]))
      return fail({ message: "header names and row labels disagree", line: 1 });
    names = names ?? h;
  }
  const n = rows.length;
  if (n === 0) return fail({ message: "no data rows found" });
  if (n > LIMITS.maxVertices) return fail({ message: `at most ${LIMITS.maxVertices} items are supported (found ${n})` });
  const errors: ParseError[] = [];
  const matrix: (Q | null)[][] = [];
  rows.forEach((r, i) => {
    if (r.cells.length !== n)
      errors.push({ message: `row ${i + 1} has ${r.cells.length} entries but the matrix has ${n} rows; a square matrix needs ${n} entries per row`, line: r.line });
    const row: (Q | null)[] = [];
    for (let j = 0; j < n; j++) {
      const c = r.cells[j] ?? "";
      if (c === "" || c === "-" || c.toLowerCase() === "na") {
        if (i === j) row.push(null);
        else {
          row.push(null);
          errors.push({ message: `missing entry at row ${i + 1}, column ${j + 1}`, line: r.line, column: j + 1 });
        }
        continue;
      }
      const q = parseQ(c);
      if (!q) {
        errors.push({ message: `entry "${c.slice(0, 20)}" at row ${i + 1}, column ${j + 1} is not a number`, line: r.line, column: j + 1 });
        row.push(null);
        continue;
      }
      const e = checkValue(q, `row ${i + 1}, column ${j + 1}`);
      if (e) errors.push({ ...e, line: r.line, column: j + 1 });
      row.push(q);
    }
    matrix.push(row);
  });
  if (names && names.length !== n) errors.push({ message: `${names.length} names given for ${n} rows` });
  if (errors.length) return { ok: false, errors: errors.slice(0, 25) };
  const finalNames = names ?? Array.from({ length: n }, (_, i) => `v${i + 1}`);
  const dup = findDuplicate(finalNames);
  if (dup) return fail({ message: `duplicate name "${dup}"` });
  return { ok: true, value: { source: "matrix", names: finalNames, matrix, warnings: [] } };
}

function findDuplicate(names: string[]): string | null {
  const seen = new Set<string>();
  for (const s of names) {
    if (seen.has(s)) return s;
    seen.add(s);
  }
  return null;
}

/** Parse `from,to,weight` lines. Vertex labels are arbitrary strings; order of first appearance. */
export function parseEdgeText(text: string, declaredNames?: string[]): ParseResult {
  const sz = checkSize(text);
  if (sz) return fail(sz);
  let rows = splitRows(text);
  // header row: three cells, the third not a number, and either more rows follow or it names a weight column
  if (rows.length && rows[0].cells.length === 3 && !isNumeric(rows[0].cells[2]) &&
      (rows.length > 1 || /^(weight|w|value|cost|benefit)$/i.test(rows[0].cells[2]))) rows = rows.slice(1);
  if (rows.length === 0) return fail({ message: "no edges found" });
  if (rows.length > LIMITS.maxEdges) return fail({ message: `at most ${LIMITS.maxEdges} edges are supported` });
  const index = new Map<string, number>();
  const names: string[] = [];
  (declaredNames ?? []).forEach((s) => {
    const c = cleanName(s);
    if (!index.has(c)) {
      index.set(c, names.length);
      names.push(c);
    }
  });
  const id = (s: string) => {
    const c = cleanName(s);
    if (!index.has(c)) {
      index.set(c, names.length);
      names.push(c);
    }
    return index.get(c)!;
  };
  const errors: ParseError[] = [];
  const edges: Edge[] = [];
  for (const r of rows) {
    if (r.cells.length < 3 || r.cells[2] === "") {
      errors.push({ message: `line ${r.line}: expected "from,to,weight"`, line: r.line });
      continue;
    }
    if (r.cells.length > 3) {
      errors.push({ message: `line ${r.line}: expected exactly 3 fields, found ${r.cells.length}`, line: r.line });
      continue;
    }
    const [a, b, w] = r.cells;
    if (!a || !b) {
      errors.push({ message: `line ${r.line}: missing vertex label`, line: r.line });
      continue;
    }
    const q = parseQ(w);
    if (!q) {
      errors.push({ message: `line ${r.line}: weight "${w.slice(0, 20)}" is not a number`, line: r.line, column: 3 });
      continue;
    }
    const e = checkValue(q, `line ${r.line}`);
    if (e) {
      errors.push({ ...e, line: r.line });
      continue;
    }
    if (cleanName(a) === cleanName(b)) {
      errors.push({ message: `line ${r.line}: self-edge "${cleanName(a)}" → itself is not allowed`, line: r.line });
      continue;
    }
    edges.push({ from: id(a), to: id(b), weight: q, line: r.line });
  }
  if (names.length > LIMITS.maxVertices) errors.push({ message: `at most ${LIMITS.maxVertices} items are supported (found ${names.length})` });
  if (errors.length) return { ok: false, errors: errors.slice(0, 25) };
  if (names.length < 1) return fail({ message: "no vertices found" });
  return { ok: true, value: { source: "edges", names, edges, warnings: [] } };
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function jsonQ(x: Json, where: string): Q | ParseError {
  if (typeof x === "number") {
    if (!Number.isFinite(x)) return { message: `${where}: not a finite number` };
    const q = parseQ(String(x));
    return q ?? { message: `${where}: unsupported number ${x}` };
  }
  if (typeof x === "string") return parseQ(x) ?? { message: `${where}: "${x.slice(0, 20)}" is not a number` };
  return { message: `${where}: expected a number` };
}

const INTERPRETATIONS: Interpretation[] = ["skew", "benefit", "cost"];

/** Parse JSON: an instance object or an exported Studio result (re-import). */
export function parseJsonText(text: string): ParseResult {
  const sz = checkSize(text);
  if (sz) return fail(sz);
  let data: Json;
  try {
    data = JSON.parse(text) as Json;
  } catch (e) {
    return fail({ message: `invalid JSON: ${(e as Error).message}` });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    if (Array.isArray(data)) return parseJsonText(JSON.stringify({ matrix: data }));
    return fail({ message: "JSON must be an object with a \"matrix\" or \"edges\" field" });
  }
  // exported result: { format: "westfall-studio-result", input: {...}, result: { order: [...] } }
  if (data.format === "westfall-studio-result" && data.input && typeof data.input === "object") {
    const inner = parseJsonText(JSON.stringify(data.input));
    if (!inner.ok) return inner;
    const res = data.result as { [k: string]: Json } | undefined;
    const order = res?.order;
    if (Array.isArray(order)) {
      const idx = new Map(inner.value.names.map((s, i) => [s, i]));
      const ord = order.map((s) => (typeof s === "string" ? idx.get(s) : undefined));
      if (ord.every((v) => v !== undefined) && new Set(ord).size === inner.value.names.length)
        inner.value.initialOrder = ord as number[];
      else inner.value.warnings.push("the exported order does not match the instance's item names; it was ignored");
    }
    return inner;
  }
  const names = Array.isArray(data.names) ? data.names.map((s) => cleanName(String(s))) : undefined;
  let interpretation: Interpretation | undefined;
  if (data.interpretation !== undefined) {
    if (typeof data.interpretation !== "string" || !INTERPRETATIONS.includes(data.interpretation as Interpretation))
      return fail({ message: `"interpretation" must be one of ${INTERPRETATIONS.join(", ")}` });
    interpretation = data.interpretation as Interpretation;
  }
  const title = typeof data.title === "string" ? data.title.slice(0, 120) : undefined;
  let out: RawInstance;
  if (Array.isArray(data.matrix)) {
    const M = data.matrix;
    const n = M.length;
    if (n === 0) return fail({ message: "matrix is empty" });
    if (n > LIMITS.maxVertices) return fail({ message: `at most ${LIMITS.maxVertices} items are supported (found ${n})` });
    const errors: ParseError[] = [];
    const matrix: (Q | null)[][] = [];
    M.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== n) {
        errors.push({ message: `matrix row ${i + 1} must be an array of length ${n}` });
        matrix.push(Array(n).fill(null));
        return;
      }
      matrix.push(
        row.map((x, j) => {
          if (x === null) {
            if (i !== j) errors.push({ message: `missing entry at row ${i + 1}, column ${j + 1}` });
            return null;
          }
          const q = jsonQ(x, `entry (${i + 1}, ${j + 1})`);
          if (!(q instanceof Q)) {
            errors.push(q);
            return null;
          }
          const e = checkValue(q, `entry (${i + 1}, ${j + 1})`);
          if (e) errors.push(e);
          return q;
        }),
      );
    });
    if (names && names.length !== n) errors.push({ message: `${names.length} names given for a ${n}×${n} matrix` });
    if (errors.length) return { ok: false, errors: errors.slice(0, 25) };
    out = { source: "matrix", names: names ?? Array.from({ length: n }, (_, i) => `v${i + 1}`), matrix, warnings: [] };
  } else if (Array.isArray(data.edges)) {
    const lines = data.edges.map((e, k) => {
      if (Array.isArray(e) && e.length === 3) return `${String(e[0])},${String(e[1])},${String(e[2])}`;
      if (e && typeof e === "object" && !Array.isArray(e)) return `${String(e.from)},${String(e.to)},${String(e.weight)}`;
      return `__invalid_edge_${k},,`;
    });
    if (lines.some((l) => l.includes(","))) {
      const bad = lines.findIndex((l) => l.startsWith("__invalid_edge_"));
      if (bad >= 0) return fail({ message: `edge ${bad + 1} must be [from, to, weight] or {"from","to","weight"}` });
    }
    const r = parseEdgeText("from,to,weight\n" + lines.join("\n"), names);
    if (!r.ok) return { ok: false, errors: r.errors.map((e) => ({ message: e.message.replace(/line (\d+)/, (_, k) => `edge ${Number(k) - 1}`) })) };
    out = r.value;
  } else {
    return fail({ message: "JSON must contain a \"matrix\" (array of rows) or \"edges\" field" });
  }
  if (out.names.some((s) => s === "")) return fail({ message: "item names must be non-empty" });
  const dup = findDuplicate(out.names);
  if (dup) return fail({ message: `duplicate name "${dup}"` });
  out.interpretation = interpretation;
  out.title = title;
  if (Array.isArray(data.initialOrder)) {
    const idx = new Map(out.names.map((s, i) => [s, i]));
    const ord = data.initialOrder.map((s) => (typeof s === "string" ? idx.get(s) : typeof s === "number" ? s : undefined));
    if (ord.every((v) => typeof v === "number" && v >= 0 && v < out.names.length) && new Set(ord).size === out.names.length)
      out.initialOrder = ord as number[];
    else return fail({ message: "\"initialOrder\" must list every item exactly once (by name or 0-based index)" });
  }
  return { ok: true, value: out };
}

/** Parse any supported text. `kind` overrides auto-detection for CSV text. */
export function parseInput(text: string, kind: "auto" | "matrix" | "edges" | "json" = "auto"): ParseResult {
  const t = text.trimStart();
  if (kind === "json" || (kind === "auto" && (t.startsWith("{") || t.startsWith("[")))) return parseJsonText(text);
  const k = kind === "auto" ? guessCsvKind(text) : kind;
  return k === "edges" ? parseEdgeText(text) : parseMatrixText(text);
}
