import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const file = path.join(root, "public/data/lolib-full.json");
const raw = (p: string) => fs.readFileSync(path.resolve(root, "..", p), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l.replace(/:\s*(-?)Infinity\b/g, ': "$1Infinity"')));

describe("LOLIB benchmark page data is derived from the committed records", () => {
  it("the published data file is exactly what the generator produces", () => {
    const before = fs.readFileSync(file, "utf8");
    execFileSync("node", [path.join(root, "scripts/build-lolib-data.mjs")]);
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  it("has all 232 instances and every solver ran every instance", () => {
    expect(data.instances).toHaveLength(232);
    for (const i of data.instances) for (const s of data.solvers) expect(i.by[s.key], `${i.id} ${s.key}`).toBeTruthy();
  });
  it("proved counts match a direct count of the raw records", () => {
    const files: Record<string, string> = {
      atlas060: "benchmarks/atlas-060/results/atlas060.exact.jsonl", atlas032: "benchmarks/lolib-full/results/atlas.exact.jsonl",
      atlas032r: "benchmarks/lolib-full/results/atlas.repro_2026-11-14.jsonl", highs: "benchmarks/lolib-full/results/highs.exact.jsonl", scip: "benchmarks/lolib-full/results/scip.exact.jsonl",
    };
    for (const [k, f] of Object.entries(files)) {
      const fams = new Set(data.families);
      const n = raw(f).filter((r) => fams.has(r.family) && r.solved).length;
      expect(data.instances.filter((i: { by: Record<string, { solved: boolean }> }) => i.by[k].solved).length, k).toBe(n);
    }
  });
  it("no proved result is better than the best-known value, and every proved result equals it", () => {
    for (const i of data.instances) for (const s of data.solvers) {
      const r = i.by[s.key];
      if (r.F !== null && i.bks !== null) expect(r.F, `${i.id} ${s.key}`).toBeLessThanOrEqual(i.bks);
      if (r.solved) expect(r.F, `${i.id} ${s.key}`).toBe(i.bks);
    }
  });
  it("the GPT-6 score is labelled unverified", () => {
    expect(data.challenge.rounds[1].gpt6.verified).toBe(false);
    expect(data.challenge.rounds[0].optimum).toBe(7288);
  });
});
