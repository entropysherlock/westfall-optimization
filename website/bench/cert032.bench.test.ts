// Exports ATLAS-032 optimality certificates for independent checking (benchmarks/atlas-032/verify_certificate.py).
import { it } from "vitest";
import fs from "fs";
import path from "path";
import { generate } from "../src/lib/engine";
import { solveAtlas } from "../src/lib/studio/atlas";
it("export certificates", () => {
  const out: Record<string, unknown> = {};
  const cases: [string, number[][]][] = [];
  for (const kind of ["random-int", "ties"] as const) for (const s of [1, 2, 3]) cases.push([`${kind} n=24 s=${s}`, generate(kind, 24, s)]);
  const extra = (process.env.CERT_EXTRA ?? "").split(",").filter(Boolean);
  const lolib = path.resolve(__dirname, "../../benchmarks/atlas-032/lolib_io.json");
  if (extra.length && fs.existsSync(lolib)) { const L = JSON.parse(fs.readFileSync(lolib, "utf8")); for (const e of extra) cases.push([e, L[e].A]); }
  for (const [name, M] of cases) {
    const r = solveAtlas(M, { deadline: performance.now() + 120_000, maxStates: 4_000_000 });
    if (!r.optimal) { process.stdout.write(`${name}: not proved, no certificate\n`); continue; }
    out[name] = { A: M, order: r.order, components: r.certificates };
    process.stdout.write(`${name}: certificate exported (${r.components.length} components)\n`);
  }
  fs.writeFileSync(path.resolve(__dirname, "../../benchmarks/atlas-032/certificates.json"), JSON.stringify(out));
});
