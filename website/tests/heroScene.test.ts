/** Smoke test of the homepage 3D scene with a mock canvas: no exceptions, finite geometry, real data. */
import { describe, expect, it, vi } from "vitest";
import { generate, subsetDP, score } from "@/lib/engine";
import { createHeroScene } from "@/lib/heroScene";

function setupDom(reduced = false) {
  const calls: { op: string; args: number[] }[] = [];
  const nums = (a: unknown[]) => a.filter((x): x is number => typeof x === "number");
  const grad = { addColorStop: () => {} };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_t, k: string) => k === "createRadialGradient" ? (...a: number[]) => { calls.push({ op: k, args: a }); return grad; }
      : (...a: unknown[]) => { calls.push({ op: k, args: nums(a) }); },
    set: () => true,
  });
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 560, height: 340 }), width: 0, height: 0 } as unknown as HTMLCanvasElement;
  let rafCb: ((t: number) => void) | null = null;
  vi.stubGlobal("window", { devicePixelRatio: 2, matchMedia: () => ({ matches: reduced }) });
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => { rafCb = cb; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return { canvas, calls, frame: (t: number) => rafCb?.(t) };
}

describe("homepage hero scene", () => {
  const A = generate("near-transitive", 9, 11);
  const r = subsetDP(A);
  const data = { A, names: "ABCDEFGHI".split(""), input: [...Array(9).keys()], optimal: r.order };
  it("animates a full loop with finite geometry and reports both phases", () => {
    const dom = setupDom();
    const phases: boolean[] = [];
    const now = performance.now();
    const scene = createHeroScene(dom.canvas, data, { onPhase: (p) => phases.push(p.ordered) });
    for (let s = 0; s <= 11; s += 0.05) dom.frame(now + s * 1000);
    const bad = dom.calls.filter((c) => c.args.some((x) => !Number.isFinite(x)));
    expect(bad).toEqual([]);
    expect(phases).toContain(true);
    expect(phases).toContain(false);
    expect(dom.calls.filter((c) => c.op === "fillText").length).toBeGreaterThan(9);
    scene.setData({ ...data, A: generate("near-transitive", 9, 12), optimal: subsetDP(generate("near-transitive", 9, 12)).order });
    scene.replay(); scene.destroy();
  });
  it("draws one static optimal frame under prefers-reduced-motion", () => {
    const dom = setupDom(true);
    const phases: boolean[] = [];
    const scene = createHeroScene(dom.canvas, data, { onPhase: (p) => phases.push(p.ordered) });
    expect(scene.reduced).toBe(true);
    expect(phases).toEqual([true]);
    scene.destroy();
  });
  it("the numbers shown are real: the optimum is the exact subset-DP value", () => {
    expect(score(A, r.order)).toBe(r.opt);
    expect(r.opt).toBeGreaterThanOrEqual(score(A, data.input));
  });
});
