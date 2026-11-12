/**
 * Exact certificate verifier — a line-by-line TypeScript (BigInt) port of
 * src/westfall_optimization/certificates/verify_exact.py. Runs entirely in the browser.
 *
 * It recomputes everything it can and trusts nothing: the incumbent threshold, packing feasibility,
 * transversality of hybrid triangles, block tables (own exact subset DP), every DP value, every
 * exclusion inequality, and the exact score of the claimed optimal permutation. Accepting proves
 * OPT(A) = F(order) for the matrix inside the certificate; binding to a user matrix is checked when supplied.
 * This is exact integer arithmetic, NOT a formal (Lean/Coq) proof.
 */

export class Reject extends Error {}

export interface Certificate {
  D: bigint;
  A: bigint[][];
  order0: number[];
  order: number[];
  layers: number[][];
  pack: [number, bigint][];
  hyb: null | { blocks: number[][]; tri: [number, bigint][] };
}

/** Parse certificate JSON, turning every integer literal into an exact BigInt where needed. */
export function parseCertificate(text: string): Certificate {
  // Quote long integer literals so JSON.parse cannot round them.
  const safe = text.replace(/(-?\d{15,})(?=\s*[,\]}])/g, '"$1"');
  const raw = JSON.parse(safe);
  const big = (x: unknown) => {
    if (typeof x === "string" && /^-?\d+$/.test(x)) return BigInt(x);
    if (typeof x === "number" && Number.isInteger(x)) return BigInt(x);
    throw new Reject("certificate contains a non-integer where an integer is required");
  };
  const num = (x: unknown) => {
    const v = typeof x === "string" ? Number(x) : x;
    if (typeof v !== "number" || !Number.isInteger(v)) throw new Reject("malformed integer index");
    return v;
  };
  if (!raw || typeof raw !== "object") throw new Reject("certificate is not a JSON object");
  for (const key of ["D", "A", "order0", "order", "layers", "pack"])
    if (!(key in raw)) throw new Reject(`certificate missing field '${key}'`);
  return {
    D: big(raw.D),
    A: (raw.A as unknown[][]).map((r) => r.map(big)),
    order0: (raw.order0 as unknown[]).map(num),
    order: (raw.order as unknown[]).map(num),
    layers: (raw.layers as unknown[][]).map((L) => L.map(num)),
    pack: (raw.pack as unknown[][]).map((p) => [num(p[0]), big(p[1])] as [number, bigint]),
    hyb: raw.hyb
      ? {
          blocks: (raw.hyb.blocks as unknown[][]).map((B) => B.map(num)),
          tri: (raw.hyb.tri as unknown[][]).map((p) => [num(p[0]), big(p[1])] as [number, bigint]),
        }
      : null,
  };
}

const abs = (x: bigint) => (x < 0n ? -x : x);

function scoreBig(A: bigint[][], order: number[]): bigint {
  let s = 0n;
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) s += A[order[i]][order[j]];
  return s;
}

function isPerm(o: number[], n: number) {
  return o.length === n && [...o].sort((a, b) => a - b).every((v, i) => v === i);
}

function arcsOfTriangle(A: bigint[][], mask: number, n: number): [number, number][] {
  const vs: number[] = [];
  for (let v = 0; v < n; v++) if (Math.floor(mask / 2 ** v) % 2 === 1) vs.push(v);
  if (vs.length !== 3) throw new Reject(`packing mask ${mask} is not a 3-set`);
  const [i, j, k] = vs;
  if (A[i][j] > 0n && A[j][k] > 0n && A[k][i] > 0n) return [[i, j], [j, k], [k, i]];
  if (A[j][i] > 0n && A[k][j] > 0n && A[i][k] > 0n) return [[j, i], [k, j], [i, k]];
  throw new Reject(`mask ${mask} is not a directed 3-cycle of the strict preference digraph`);
}

function checkPacking(A: bigint[][], tri: [number, bigint][], n: number, blk?: Map<number, number>) {
  const load = new Map<string, bigint>();
  for (const [mask, y] of tri) {
    if (y < 0n) throw new Reject("negative packing value");
    const arcs = arcsOfTriangle(A, mask, n);
    if (blk && new Set(arcs.flat().map((v) => blk.get(v))).size !== 3)
      throw new Reject("hybrid packing uses a non-transversal triangle (would double count)");
    for (const [u, v] of arcs) load.set(`${u},${v}`, (load.get(`${u},${v}`) ?? 0n) + y);
  }
  for (const [key, s] of load) {
    const [u, v] = key.split(",").map(Number);
    if (s > A[u][v]) throw new Reject(`arc capacity violated on (${u}, ${v})`);
  }
}

function blockBetaTable(A: bigint[][], B: number[]): bigint[] {
  const b = B.length;
  const best: (bigint | null)[] = Array(1 << b).fill(null);
  best[0] = 0n;
  for (let m = 1; m < 1 << b; m++) {
    let cand: bigint | null = null;
    for (let k = 0; k < b; k++) {
      if (!(m & (1 << k))) continue;
      const prev = m ^ (1 << k);
      let g = best[prev]!;
      for (let j = 0; j < b; j++) if (prev & (1 << j)) g += A[B[j]][B[k]];
      if (cand === null || g > cand) cand = g;
    }
    best[m] = cand;
  }
  const tab: bigint[] = [];
  for (let m = 0; m < 1 << b; m++) {
    let W = 0n;
    for (let i = 0; i < b; i++) for (let j = i + 1; j < b; j++) if (m & (1 << i) && m & (1 << j)) W += abs(A[B[i]][B[j]]);
    const diff = W - best[m]!;
    if (diff % 2n !== 0n) throw new Reject("internal parity error");
    tab.push(diff / 2n);
  }
  return tab;
}

/** Exact rational value of an IEEE double: returns [numerator, denominator] with denominator a power of two. */
export function doubleToFraction(x: number): [bigint, bigint] {
  if (!Number.isFinite(x)) throw new Reject("non-finite matrix entry");
  if (Number.isInteger(x)) return [BigInt(x), 1n];
  let den = 1n;
  let v = x;
  while (!Number.isInteger(v)) {
    v *= 2;
    den *= 2n;
  }
  return [BigInt(v), den];
}

export interface VerifyResult {
  accepted: true;
  OPT: number;
  OPT_scaled: bigint;
  D: bigint;
  kept: number;
  excludedChecked: number;
  bound: boolean;
}

export function verifyCertificate(cert: Certificate, Ainput?: number[][]): VerifyResult {
  const A = cert.A;
  const n = A.length;
  if (n > 30) throw new Reject("browser verifier supports n <= 30 (bitmask width)");
  for (let i = 0; i < n; i++) {
    if (A[i].length !== n) throw new Reject("matrix not square");
    if (A[i][i] !== 0n) throw new Reject("nonzero diagonal");
    for (let j = 0; j < n; j++) if (A[i][j] !== -A[j][i]) throw new Reject("matrix not skew-symmetric");
  }
  let bound = false;
  if (Ainput) {
    if (Ainput.length !== n) throw new Reject("certificate is not about the supplied instance");
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const [num, den] = doubleToFraction(Ainput[i][j]);
        if (num * cert.D !== A[i][j] * den) throw new Reject("certificate is not about the supplied instance");
      }
    bound = true;
  }
  if (!(isPerm(cert.order0, n) && isPerm(cert.order, n))) throw new Reject("orders are not permutations");
  const t = scoreBig(A, cert.order0);
  checkPacking(A, cert.pack, n);
  let tabs: [number[], bigint[]][] | null = null;
  if (cert.hyb) {
    const blocks = cert.hyb.blocks;
    const flat = blocks.flat().sort((a, b) => a - b);
    if (flat.length !== n || !flat.every((v, i) => v === i)) throw new Reject("blocks are not a partition");
    const blk = new Map<number, number>();
    blocks.forEach((B, k) => B.forEach((v) => blk.set(v, k)));
    checkPacking(A, cert.hyb.tri, n, blk);
    tabs = blocks.map((B) => [B, blockBetaTable(A, B)]);
  }
  const absA = A.map((r) => r.map(abs));
  const inSet = (T: number, v: number) => (T & (1 << v)) !== 0;
  const U2 = (T: number) => {
    let W = 0n;
    for (let i = 0; i < n; i++) if (inSet(T, i)) for (let j = i + 1; j < n; j++) if (inSet(T, j)) W += absA[i][j];
    let lb = 0n;
    for (const [m, y] of cert.pack) if ((T & m) === m) lb += y;
    let lb2 = 2n * lb;
    if (tabs && cert.hyb) {
      let lbh = 0n;
      for (const [B, tab] of tabs) {
        let idx = 0;
        B.forEach((v, k) => {
          if (inSet(T, v)) idx |= 1 << k;
        });
        lbh += tab[idx];
      }
      lbh *= 2n;
      let tri = 0n;
      for (const [m, y] of cert.hyb.tri) if ((T & m) === m) tri += y;
      const h = lbh + 2n * tri;
      if (h > lb2) lb2 = h;
    }
    return 2n * W - 2n * lb2;
  };
  const layers = cert.layers;
  if (layers.length !== n + 1 || layers[0].length !== 1 || layers[0][0] !== 0) throw new Reject("layer structure malformed");
  const full = (1 << n) - 1;
  let fPrev = new Map<number, bigint>([[0, 0n]]);
  let checked = 0;
  for (let k = 1; k <= n; k++) {
    const cand = new Map<number, bigint>();
    for (const [S, fS] of fPrev) {
      for (let v = 0; v < n; v++) {
        if (inSet(S, v)) continue;
        const C = S | (1 << v);
        let val = fS;
        for (let u = 0; u < n; u++) if (inSet(S, u)) val += A[u][v];
        const cur = cand.get(C);
        if (cur === undefined || val > cur) cand.set(C, val);
      }
    }
    const kept = new Set(layers[k]);
    for (const s of kept) if (!cand.has(s)) throw new Reject(`layer ${k}: a kept state has no kept parent`);
    for (const [C, fc] of cand) {
      if (kept.has(C)) continue;
      checked++;
      let r = 0n;
      for (let u = 0; u < n; u++) if (inSet(C, u)) for (let w = 0; w < n; w++) if (!inSet(C, w)) r += A[u][w];
      if (!(2n * (fc + r) + U2(full ^ C) < 2n * t)) throw new Reject(`layer ${k}: excluded state ${C} not justified`);
    }
    const next = new Map<number, bigint>();
    for (const C of kept) next.set(C, cand.get(C)!);
    fPrev = next;
  }
  if (!fPrev.has(full)) throw new Reject("no kept chain reaches V");
  const opt = scoreBig(A, cert.order);
  if (fPrev.get(full)! !== opt) throw new Reject("claimed order's score differs from the kept DAG value");
  if (opt < t) throw new Reject("claimed optimum below the incumbent threshold");
  const kept = layers.reduce((s, L) => s + L.length, 0);
  // OPT as a float for display: opt / D
  const OPT = Number(opt) / Number(cert.D) || bigDiv(opt, cert.D);
  return { accepted: true, OPT, OPT_scaled: opt, D: cert.D, kept, excludedChecked: checked, bound };
}

function bigDiv(a: bigint, b: bigint): number {
  // precise-enough division for display when Number(a)/Number(b) overflows
  const shift = BigInt(Math.max(0, b.toString(2).length - 60));
  return Number(a >> shift) / Number(b >> shift);
}
