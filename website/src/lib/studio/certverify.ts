/**
 * Independent in-browser verifier for ATLAS-032 optimality certificates.
 *
 * INDEPENDENCE: this module deliberately imports nothing from the solver (no cutdp, packing, decompose,
 * atlas, solvers or engine code). It re-derives every claim from the certificate data alone, in BigInt
 * arithmetic, following the statements in benchmarks/atlas-032/PROOFS.md (Lemmas 0–3, Lemma 5) and the
 * checks of the separate Python verifier benchmarks/atlas-032/verify_certificate.py.
 *
 * A certificate is ACCEPTED only if all checks pass:
 *  1. M is square, integral, skew-symmetric; `order` is a permutation; the component orders concatenate to it.
 *  2. Decomposition: no strict arc (M_uv > 0) from a later component to an earlier one, so cross pairs are
 *     never backward and OPT_β = Σ OPT_β(C_i).
 *  3. Each component's claimed β equals the backward weight of its order; the total equals claimedBeta and
 *     the objective identity F = W − 2β holds.
 *  4. Each packing lists directed cycles of the strict preference digraph with non-negative integer weights
 *     whose load on every arc is ≤ D·P_e.
 *  5. Each component is optimal: either ⌈L(C)/D⌉ ≥ β (the packing alone certifies), or an exhaustive prefix
 *     search that prunes S only when β_S + cut(S) + ⌈L(C∖S)/D⌉ ≥ β finds no ordering with smaller β.
 * If the search exceeds `maxStates`, the verdict is UNDECIDED (never accepted).
 */

export interface CertificateLike {
  A: number[][];
  order: number[];
  components: { vertices: number[]; order: number[]; beta: number; packing: { D: number; start: number[]; cyc: number[]; w: number[] } | null; verifiable?: boolean }[];
  claimedBeta?: number;
  claimedFA?: number;
}

export interface ComponentVerdict { size: number; how: string; states: number }
export interface Verdict {
  verdict: "ACCEPTED" | "REJECTED" | "UNDECIDED";
  reason: string;
  components: ComponentVerdict[];
  F: string | null;
  beta: string | null;
  ms: number;
}

class Reject extends Error {}
class Undecided extends Error {}
const must = (cond: boolean, msg: string) => { if (!cond) throw new Reject(msg); };
const big = (x: number, what: string) => { must(Number.isSafeInteger(x), `${what} must be a safe integer`); return BigInt(x); };
const ceilDiv = (a: bigint, b: bigint) => (a >= 0n ? (a + b - 1n) / b : -((-a) / b));

function verifyComponent(M: bigint[][], verts: number[], order: number[], beta: bigint, packing: CertificateLike["components"][number]["packing"], maxStates: number): ComponentVerdict {
  const k = verts.length;
  const loc = new Map(verts.map((v, i) => [v, i]));
  must(order.length === k && new Set(order).size === k && order.every((v) => loc.has(v)), "a component order is not a permutation of its vertices");
  const P: bigint[][] = verts.map((u) => verts.map((v) => (M[u][v] > 0n ? M[u][v] : 0n)));
  const o = order.map((v) => loc.get(v)!);
  let b = 0n;
  for (let r = 0; r < k; r++) for (let t = r + 1; t < k; t++) b += P[o[t]][o[r]];
  must(b === beta, `claimed β ${beta} but the component order has backward weight ${b}`);
  if (k <= 1) return { size: k, how: "single item", states: 0 };

  let D = 1n;
  const cycles: { vs: number[]; y: bigint }[] = [];
  if (packing) {
    D = big(packing.D, "packing D");
    must(D >= 1n, "packing D must be ≥ 1");
    must(packing.start.length === packing.w.length + 1, "packing start/w length mismatch");
    const load = new Map<string, bigint>();
    for (let c = 0; c < packing.w.length; c++) {
      const vs = packing.cyc.slice(packing.start[c], packing.start[c + 1]);
      const y = big(packing.w[c], "packing weight");
      must(y >= 0n, "packing weights must be non-negative");
      must(vs.length >= 3 && new Set(vs).size === vs.length && vs.every((x) => Number.isInteger(x) && x >= 0 && x < k), "a packed sequence is not a simple cycle on the component");
      for (let i = 0; i < vs.length; i++) {
        const u = vs[i], v = vs[(i + 1) % vs.length];
        must(P[u][v] > 0n, "a packed cycle uses a pair that is not a strict preference arc");
        const key = `${u},${v}`;
        load.set(key, (load.get(key) ?? 0n) + y);
      }
      cycles.push({ vs, y });
    }
    for (const [key, l] of load) { const [u, v] = key.split(",").map(Number); must(l <= D * P[u][v], "the packing exceeds an arc capacity"); }
  }
  const total = cycles.reduce((a, c) => a + c.y, 0n);
  if (ceilDiv(total, D) >= beta) return { size: k, how: "packing bound equals β (no search needed)", states: 0 };

  // exhaustive pruned prefix search for an ordering with backward weight ≤ β − 1
  const byV: { vs: number[]; y: bigint }[][] = Array.from({ length: k }, () => []);
  for (const c of cycles) for (const v of c.vs) byV[v].push(c);
  const colP = Array.from({ length: k }, (_, v) => P.reduce((a, row) => a + row[v], 0n));
  let layer = new Map<bigint, [bigint, bigint, bigint]>([[0n, [0n, 0n, total]]]); // mask -> [β_S, cut(S), L(C∖S)]
  let states = 1;
  for (let step = 0; step < k; step++) {
    const next = new Map<bigint, [bigint, bigint, bigint]>();
    for (const [S, [bS, cS, L]] of layer) {
      const inS = (x: number) => ((S >> BigInt(x)) & 1n) === 1n;
      for (let v = 0; v < k; v++) {
        if (inS(v)) continue;
        let add = 0n, into = 0n;
        for (let x = 0; x < k; x++) if (inS(x)) { add += P[v][x]; into += P[x][v]; }
        const nb = bS + add, nc = cS - add + colP[v] - into;
        let nL = L;
        for (const c of byV[v]) if (!c.vs.some(inS)) nL -= c.y;
        if (nb + nc + ceilDiv(nL, D) >= beta) continue;
        const T = S | (1n << BigInt(v));
        const prev = next.get(T);
        if (!prev || nb < prev[0]) next.set(T, [nb, nc, nL]);
      }
    }
    states += next.size;
    if (states > maxStates) throw new Undecided(`search exceeded ${maxStates.toLocaleString("en-US")} states on a component of size ${k}`);
    if (next.size === 0) return { size: k, how: "pruned search: no ordering with smaller β exists", states };
    layer = next;
  }
  throw new Reject("an ordering with smaller backward weight exists: the claimed order is not optimal");
}

export function verifyCertificate(cert: CertificateLike, opts: { maxStates?: number } = {}): Verdict {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const maxStates = opts.maxStates ?? 2_000_000;
  const out = (verdict: Verdict["verdict"], reason: string, comps: ComponentVerdict[] = [], F: string | null = null, beta: string | null = null): Verdict =>
    ({ verdict, reason, components: comps, F, beta, ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0 });
  const comps: ComponentVerdict[] = [];
  try {
    must(cert && Array.isArray(cert.A) && Array.isArray(cert.order) && Array.isArray(cert.components), "malformed certificate (A, order and components are required)");
    const n = cert.A.length;
    must(cert.A.every((r) => Array.isArray(r) && r.length === n), "M must be square");
    const M = cert.A.map((r, i) => r.map((x, j) => big(x, `M[${i}][${j}]`)));
    for (let i = 0; i < n; i++) { must(M[i][i] === 0n, "M must have a zero diagonal"); for (let j = i + 1; j < n; j++) must(M[i][j] === -M[j][i], "M is not skew-symmetric"); }
    must(cert.order.length === n && new Set(cert.order).size === n && cert.order.every((v) => Number.isInteger(v) && v >= 0 && v < n), "order is not a permutation");
    const compOf = new Array(n).fill(-1);
    cert.components.forEach((c, ci) => c.vertices.forEach((v) => { must(Number.isInteger(v) && v >= 0 && v < n && compOf[v] === -1, "components must partition the items"); compOf[v] = ci; }));
    must(compOf.every((c) => c >= 0), "components must cover every item");
    for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) must(!(compOf[u] > compOf[v] && M[u][v] > 0n), "decomposition invalid: a preference arc points from a later component to an earlier one");
    must(cert.components.flatMap((c) => c.order).every((v, i) => v === cert.order[i]), "the component orders do not concatenate to the claimed order");
    let W = 0n, F = 0n, B = 0n;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) W += M[i][j] < 0n ? -M[i][j] : M[i][j];
    for (let r = 0; r < n; r++) for (let t = r + 1; t < n; t++) F += M[cert.order[r]][cert.order[t]];
    for (const c of cert.components) {
      must(c.verifiable !== false, "a component was not solved exactly, so there is nothing to certify");
      const beta = big(c.beta, "component β");
      comps.push(verifyComponent(M, c.vertices, c.order, beta, c.packing, maxStates));
      B += beta;
    }
    must(F === W - 2n * B, "objective identity F = W − 2β fails");
    if (cert.claimedBeta !== undefined) must(big(cert.claimedBeta, "claimedBeta") === B, "claimedBeta does not match the components");
    if (cert.claimedFA !== undefined) must(big(cert.claimedFA, "claimedFA") === F, "claimedFA does not match the order");
    return out("ACCEPTED", "every check passed: the order is optimal for M", comps, F.toString(), B.toString());
  } catch (e) {
    if (e instanceof Reject) return out("REJECTED", e.message, comps);
    if (e instanceof Undecided) return out("UNDECIDED", e.message, comps);
    return out("REJECTED", `malformed certificate: ${(e as Error).message}`, comps);
  }
}
