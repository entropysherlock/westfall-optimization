/** Mission 038: research-status labels, benchmark data provenance, status vocabulary, navigation. */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { RESEARCH, LEVEL_LABEL } from "@/lib/researchStatus";
import { summarize, type A32Data } from "@/lib/atlas032Summary";
import { STATUS_LABEL } from "@/lib/studio/report";

const root = path.resolve(__dirname, "..");
const byId = (id: string) => RESEARCH.find((r) => r.id === id)!;

describe("research-status labels cannot overstate", () => {
  it("draft and conjectural work is never labelled Lean-checked or proved", () => {
    for (const id of ["kcut-counting", "hyperbola-leading", "airy-representation", "airy-conjecture"]) {
      expect(["draft", "conjecture"]).toContain(byId(id).level);
      expect(byId(id).inProgress).toBe(true);
    }
    expect(byId("airy-conjecture").level).toBe("conjecture");
    expect(byId("airy-conjecture").status).toMatch(/UNPROVED/);
    expect(byId("kcut-counting").status).toMatch(/NOT claimed as solved/);
  });
  it("ATLAS-032 is not described as machine-verified", () => {
    const a = byId("atlas-032");
    expect(a.level).not.toBe("lean");
    expect(a.also ?? []).not.toContain("lean");
    expect(a.status).toMatch(/NOT Lean-verified/);
  });
  it("every item has a label, a source and a status note", () => {
    for (const r of RESEARCH) { expect(LEVEL_LABEL[r.level]).toBeTruthy(); expect(r.source).toMatch(/^(https:|\/)/); expect(r.status.length).toBeGreaterThan(20); }
  });
});

describe("ATLAS-032 benchmark presentation is derived from the records", () => {
  const data: A32Data = JSON.parse(fs.readFileSync(path.join(root, "public/data/atlas-032.json"), "utf8"));
  it("the published data file is exactly what the generator produces from benchmarks/atlas-032", () => {
    const before = fs.readFileSync(path.join(root, "public/data/atlas-032.json"), "utf8");
    execFileSync("node", [path.join(root, "scripts/build-atlas032-data.mjs")]);
    expect(fs.readFileSync(path.join(root, "public/data/atlas-032.json"), "utf8")).toBe(before);
  });
  it("proved counts match a direct count of the raw records", () => {
    const src = path.resolve(root, "../benchmarks/atlas-032");
    const E = JSON.parse(fs.readFileSync(path.join(src, "results_E.json"), "utf8")).rows;
    const A = JSON.parse(fs.readFileSync(path.join(src, "results.json"), "utf8")).rows.filter((r: { variant: string }) => r.variant.startsWith("A"));
    const H = JSON.parse(fs.readFileSync(path.join(src, "highs_results.json"), "utf8"));
    const fam = summarize(data.rows);
    const sum = (k: "A" | "E" | "H") => fam.reduce((s, f) => s + (f[k]?.proved ?? 0), 0);
    expect(sum("E")).toBe(E.filter((r: { status: string }) => r.status === "OPTIMAL").length);
    expect(sum("A")).toBe(A.filter((r: { status: string }) => r.status === "OPTIMAL").length);
    expect(sum("H")).toBe(H.filter((r: { status: string }) => r.status === "Optimal").length);
  });
  it("losses are present in the data and surfaced: unproved ATLAS-032 runs and HiGHS-faster families", () => {
    expect(data.rows.some((r) => r.solver === "E" && r.status === "UNPROVED")).toBe(true);
    expect(summarize(data.rows).some((f) => f.faster === "HiGHS")).toBe(true);
    expect(data.toleranceMislabels.length).toBeGreaterThanOrEqual(1);
  });
});

describe("status vocabulary and navigation", () => {
  it("uses the four distinct statuses and never calls a feasible result optimal", () => {
    expect(STATUS_LABEL.OPTIMAL).toBe("Proven optimal");
    expect(STATUS_LABEL.FEASIBLE).toMatch(/not proven optimal/);
    expect(STATUS_LABEL.INTERRUPTED).toMatch(/not proven optimal/);
  });
  it("every navigation link points to an existing page", () => {
    const nav = fs.readFileSync(path.join(root, "src/components/Nav.tsx"), "utf8");
    const hrefs = [...nav.matchAll(/\["(\/[a-z-]+\/)",/g)].map((m) => m[1]).concat(["/studio/", "/contact/"]);
    expect(hrefs.length).toBeGreaterThanOrEqual(7);
    for (const href of hrefs) expect(fs.existsSync(path.join(root, "src/app", href, "page.tsx")), href).toBe(true);
  });
});
