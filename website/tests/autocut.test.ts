/**
 * Correspondence test: the TypeScript AutoCut port against the compiled Lean executable.
 *
 * Fixtures (copied verbatim from branch formal/westfall-theorem, commit 5de1b5b):
 *   fixtures/autocut_instances.json    = lean/tests/memo_instances.json (119 instances, seeds 23023/24024)
 *   fixtures/autocut_lean_output.txt   = lean/tests/m025/costed_raw.txt (103 completed Lean runs of autoCutC)
 * Each Lean line: id|value|order|objective|partition|lamB|k|reachable|nodes|cost=..|ms=..
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { autoCut } from "@/lib/studio/autocut";
import { parseQ, Q } from "@/lib/studio/rational";

const dir = path.join(__dirname, "fixtures");
const instances: { id: number; A: string[][] }[] = JSON.parse(fs.readFileSync(path.join(dir, "autocut_instances.json"), "utf8"));
const lean = fs
  .readFileSync(path.join(dir, "autocut_lean_output.txt"), "utf8")
  .trim()
  .split("\n")
  .map((l) => l.split("|"));

const toQ = (A: string[][]) => A.map((r) => r.map((x) => parseQ(x) as Q));
const list = (s: string) => s.replace(/[[\]\s]/g, "").split(",").filter(Boolean).map(Number);

describe("AutoCut port ≡ Lean executable (autoCutC) on archived instances", () => {
  it(`agrees exactly on all ${lean.length} completed Lean runs`, () => {
    let checked = 0;
    for (const f of lean) {
      const id = Number(f[0]);
      const inst = instances.find((x) => x.id === id)!;
      const r = autoCut(toQ(inst.A));
      expect(r, `instance ${id}`).not.toBeNull();
      expect(r!.value.toString(), `value ${id}`).toBe(f[1]);
      expect(r!.order, `order ${id}`).toEqual(list(f[2]));
      expect(r!.partition, `partition ${id}`).toEqual(list(f[4]));
      expect(r!.lambda, `lambda ${id}`).toBe(Number(f[5]));
      expect(r!.k, `k ${id}`).toBe(Number(f[6]));
      expect(r!.reachable, `reachable ${id}`).toBe(Number(f[7]));
      expect(r!.nodes, `nodes ${id}`).toBe(Number(f[8]));
      checked++;
    }
    expect(checked).toBe(103);
  }, 600_000);
});
