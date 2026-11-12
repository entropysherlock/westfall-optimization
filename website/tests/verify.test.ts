import { describe, expect, it } from "vitest";
import { parseCertificate, verifyCertificate, Reject } from "@/lib/verify";
import fs from "fs";
import path from "path";

const dir = path.join(__dirname, "../public/data");
const presets = JSON.parse(fs.readFileSync(path.join(dir, "presets.json"), "utf8"));

describe("browser exact verifier (BigInt port of verify_exact.py)", () => {
  it("accepts every genuine certificate and reproduces the Python optimum, bound to the input", () => {
    for (const p of presets) {
      const cert = parseCertificate(fs.readFileSync(path.join(dir, "certificates", p.id + ".json"), "utf8"));
      const r = verifyCertificate(cert, p.matrix);
      expect(r.accepted).toBe(true);
      expect(r.bound).toBe(true);
      expect(r.OPT).toBeCloseTo(p.reference.OPT, 8);
    }
  });
  it("rejects tampered certificates and altered inputs", () => {
    const p = presets.find((q: { id: string }) => q.id === "blocks-14-mixed");
    const text = fs.readFileSync(path.join(dir, "certificates", p.id + ".json"), "utf8");
    const fresh = () => parseCertificate(text);
    const attempts: [string, (c: ReturnType<typeof fresh>) => void][] = [
      ["drop a kept state", (c) => { const k = c.layers.reduce((b, L, i) => (L.length > c.layers[b].length && i > 0 && i < c.layers.length - 1 ? i : b), 1); c.layers[k] = c.layers[k].slice(1); }],
      ["claim reversed order", (c) => { c.order = c.order.slice().reverse(); }],
      ["break skew symmetry", (c) => { c.A[0][1] += 1n; }],
      ["delete a layer", (c) => { c.layers[c.layers.length - 2] = []; }],
      ["inflate packing", (c) => { if (c.pack.length) c.pack[0][1] = c.pack[0][1] * 3n + c.D; else c.order = c.order.slice().reverse(); }],
    ];
    for (const [, mutate] of attempts) {
      const c = fresh();
      mutate(c);
      expect(() => verifyCertificate(c)).toThrow(Reject);
    }
    const altered = p.matrix.map((r: number[]) => r.slice());
    altered[0][1] += 1; altered[1][0] -= 1;
    expect(() => verifyCertificate(fresh(), altered)).toThrow(/not about the supplied instance/);
  });
});
