/** ATLAS-032 benchmark summary logic (pure; shared by the page and tests). */
export interface A32Row { name: string; family: string; real: boolean; n: number; solver: "A" | "S" | "B" | "C" | "E" | "H"; status: "OPTIMAL" | "UNPROVED"; F: number | null; beta: number | null; lowerBoundBeta: number | null; ms: number; states: number | null }
export interface A32Data { conditions: string; solvers: Record<string, string>; rows: A32Row[]; toleranceMislabels: { name: string; defaultGapF: number; exactF: number }[]; generatedFrom: string[] }

export const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const fmtMs = (x: number | null) => (x === null ? "—" : x < 1000 ? `${Math.round(x)} ms` : `${(x / 1000).toFixed(1)} s`);

export function summarize(rows: A32Row[]) {
  const fams = new Map<string, A32Row[]>();
  for (const r of rows) fams.set(r.family, [...(fams.get(r.family) ?? []), r]);
  return [...fams.entries()].map(([family, rs]) => {
    const by = (s: A32Row["solver"]) => rs.filter((r) => r.solver === s);
    const cell = (s: A32Row["solver"]) => {
      const x = by(s);
      if (!x.length) return null;
      const ok = x.filter((r) => r.status === "OPTIMAL");
      return { proved: ok.length, total: x.length, medianMs: median(x.map((r) => r.ms)), medianStates: median(ok.map((r) => r.states).filter((v): v is number => v !== null)) };
    };
    const ns = rs.map((r) => r.n);
    const E = cell("E"), H = cell("H");
    // "faster" is only called when both proved every instance of the family
    const faster = E && H && E.proved === E.total && H.proved === H.total ? (E.medianMs! <= H.medianMs! ? "ATLAS-032" : "HiGHS") : null;
    return { family, real: rs[0].real, n: Math.min(...ns) === Math.max(...ns) ? `${ns[0]}` : `${Math.min(...ns)}–${Math.max(...ns)}`, A: cell("A"), E, H, faster };
  });
}

