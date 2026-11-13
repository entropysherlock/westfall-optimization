/** Server-side helpers that read the generated ATLAS-032 benchmark file (never hand-typed numbers). */
import fs from "fs";
import path from "path";
import type { A32Data } from "@/lib/atlas032Summary";

export function atlasData(): A32Data {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/atlas-032.json"), "utf8"));
}
export function atlasCounts(d: A32Data = atlasData()) {
  const c = (s: string, real?: boolean) => {
    const x = d.rows.filter((r) => r.solver === s && (real === undefined || r.real === real));
    return { proved: x.filter((r) => r.status === "OPTIMAL").length, total: x.length };
  };
  return { A: c("A"), E: c("E"), H: c("H"), Ereal: c("E", true), Areal: c("A", true), unprovedE: d.rows.filter((r) => r.solver === "E" && r.status !== "OPTIMAL") };
}
