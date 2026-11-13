/**
 * Homepage hero scene: a real weighted-ordering instance rendered in 3D on a 2D canvas (no WebGL, no
 * dependencies). Items are spheres; every preference a_ij > 0 is an arc. The scene loops between the input
 * ordering (a rotating cloud) and the exact optimum (a helix in optimal order). Arc colours are computed
 * from the ordering actually shown: teal arcs agree with it, red arcs point backward.
 *
 * Respects prefers-reduced-motion (static optimal frame), pauses when off-screen or the tab is hidden.
 */
export interface HeroData { A: number[][]; names: string[]; input: number[]; optimal: number[] }
export interface HeroCallbacks { onPhase?: (p: { t: number; ordered: boolean }) => void }

type V3 = [number, number, number];
const TEAL = [43, 179, 161], TEAL_HI = [92, 205, 189], RED = [239, 106, 94];
const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

// timeline (seconds): cloud hold → morph → ordered hold → morph back
const T_CLOUD = 2.6, T_MORPH = 2.2, T_HOLD = 4.2, T_BACK = 1.6, T_LOOP = T_CLOUD + T_MORPH + T_HOLD + T_BACK;

export function createHeroScene(canvas: HTMLCanvasElement, initial: HeroData, cb: HeroCallbacks = {}) {
  const ctx = canvas.getContext("2d")!;
  let data = initial;
  let raf = 0, running = false, visible = true, t0 = performance.now(), last = -1;
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1;

  // layouts in model space (unit scale ~1)
  let cloud: V3[] = [], helix: V3[] = [];
  const pulses: { i: number; j: number; s: number; v: number }[] = [];
  const layout = () => {
    const n = data.A.length;
    cloud = []; helix = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    const posIn = new Map(data.input.map((v, k) => [v, k]));
    for (let v = 0; v < n; v++) {
      const k = posIn.get(v)!;
      const y = 1 - (2 * (k + 0.5)) / n, r = Math.sqrt(1 - y * y), th = golden * k * 3.1;
      cloud[v] = [Math.cos(th) * r * 0.95, y * 0.72, Math.sin(th) * r * 0.95];
    }
    const posOpt = new Map(data.optimal.map((v, k) => [v, k]));
    for (let v = 0; v < n; v++) {
      const k = posOpt.get(v)!, u = k / Math.max(1, n - 1) - 0.5;
      helix[v] = [u * 2.25, Math.sin(k * 0.85) * 0.2 + 0.05, Math.cos(k * 0.85) * 0.32];
    }
    pulses.length = 0;
  };
  layout();

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (!running) draw(reduced ? 1 : phaseAt(performance.now()).m, performance.now());
  };

  const phaseAt = (now: number) => {
    const s = (((now - t0) / 1000) % T_LOOP + T_LOOP) % T_LOOP;
    if (s < T_CLOUD) return { m: 0, s };
    if (s < T_CLOUD + T_MORPH) return { m: ease((s - T_CLOUD) / T_MORPH), s };
    if (s < T_CLOUD + T_MORPH + T_HOLD) return { m: 1, s };
    return { m: 1 - ease((s - T_CLOUD - T_MORPH - T_HOLD) / T_BACK), s };
  };

  const project = (p: V3, yaw: number, pitch: number): [number, number, number, number] => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cp - z1 * sp, z2 = p[1] * sp + z1 * cp;
    const scale = Math.min(W, H * 1.55) * 0.36, cam = 3.4, f = cam / (cam - z2);
    return [W / 2 + x1 * scale * f, H * 0.52 - y2 * scale * f, f, z2];
  };

  function draw(m: number, now: number) {
    const n = data.A.length, time = (now - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // soft backdrop glow
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, Math.max(W, H) * 0.7);
    g.addColorStop(0, "rgba(43,179,161,0.16)"); g.addColorStop(0.55, "rgba(29,64,99,0.10)"); g.addColorStop(1, "rgba(7,17,31,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const yaw = reduced ? 0.25 : mix(time * 0.32, Math.sin(time * 0.45) * 0.38, m);
    const pitch = mix(0.32, 0.18, m);
    const pts: V3[] = [];
    for (let v = 0; v < n; v++) pts[v] = [mix(cloud[v][0], helix[v][0], m), mix(cloud[v][1], helix[v][1], m), mix(cloud[v][2], helix[v][2], m)];
    const P = pts.map((p) => project(p, yaw, pitch));
    // order shown: optimal once the morph is past halfway
    const shown = m > 0.5 ? data.optimal : data.input;
    const pos = new Map(shown.map((v, k) => [v, k]));
    let maxW = 1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (data.A[i][j] > maxW) maxW = data.A[i][j];

    // arcs (back to front by mean depth), additive glow
    const arcs: { i: number; j: number; w: number; z: number }[] = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (data.A[i][j] > 0) arcs.push({ i, j, w: data.A[i][j] / maxW, z: (P[i][3] + P[j][3]) / 2 });
    arcs.sort((a, b) => a.z - b.z);
    ctx.globalCompositeOperation = "lighter";
    const ctrl = (a: number, b: number) => {
      const mid: V3 = [(pts[a][0] + pts[b][0]) / 2, (pts[a][1] + pts[b][1]) / 2, (pts[a][2] + pts[b][2]) / 2];
      const d = Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1], pts[a][2] - pts[b][2]);
      const fwd = pos.get(a)! < pos.get(b)!;
      // ordered state: forward arcs arch above the helix, backward arcs dip below it
      const lift = mix(0.28, fwd ? 0.42 : -0.42, m) * d;
      return project([mid[0], mid[1] + lift, mid[2]], yaw, pitch);
    };
    for (const a of arcs) {
      const fwd = pos.get(a.i)! < pos.get(a.j)!;
      const c = fwd ? TEAL : RED;
      const depth = clamp(0.55 + a.z * 0.35, 0.25, 1);
      const alpha = (fwd ? mix(0.22, 0.42, m) : mix(0.28, 0.75, m)) * (0.4 + 0.6 * a.w) * depth;
      const Q = ctrl(a.i, a.j);
      ctx.beginPath(); ctx.moveTo(P[a.i][0], P[a.i][1]); ctx.quadraticCurveTo(Q[0], Q[1], P[a.j][0], P[a.j][1]);
      ctx.strokeStyle = rgba(c, alpha * 0.35); ctx.lineWidth = (2.5 + 4 * a.w) * depth; ctx.stroke();
      ctx.strokeStyle = rgba(c, alpha); ctx.lineWidth = (0.8 + 1.4 * a.w) * depth; ctx.stroke();
    }
    // light pulses travelling along forward arcs once ordered
    if (!reduced && m > 0.6) {
      if (pulses.length < 14 && Math.random() < 0.18) {
        const f = arcs.filter((a) => pos.get(a.i)! < pos.get(a.j)!);
        if (f.length) { const a = f[Math.floor(Math.random() * f.length)]; pulses.push({ i: a.i, j: a.j, s: 0, v: 0.5 + Math.random() * 0.6 }); }
      }
      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k]; p.s += p.v / 60;
        if (p.s >= 1) { pulses.splice(k, 1); continue; }
        const Q = ctrl(p.i, p.j), u = p.s, A0 = P[p.i], B0 = P[p.j];
        const x = (1 - u) * (1 - u) * A0[0] + 2 * (1 - u) * u * Q[0] + u * u * B0[0];
        const y = (1 - u) * (1 - u) * A0[1] + 2 * (1 - u) * u * Q[1] + u * u * B0[1];
        const r = 7 * (A0[2] + B0[2]) / 2, a = Math.sin(Math.PI * u) * clamp((m - 0.6) / 0.3);
        const pg = ctx.createRadialGradient(x, y, 0, x, y, r);
        pg.addColorStop(0, rgba(TEAL_HI, 0.95 * a)); pg.addColorStop(1, rgba(TEAL_HI, 0));
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    } else pulses.length = 0;
    ctx.globalCompositeOperation = "source-over";

    // nodes, back to front
    const idx = [...Array(n).keys()].sort((a, b) => P[a][3] - P[b][3]);
    for (const v of idx) {
      const [x, y, f] = P[v];
      const r = 13 * f * (1 + 0.04 * Math.sin(time * 2 + v));
      const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.6);
      halo.addColorStop(0, "rgba(92,205,189,0.35)"); halo.addColorStop(1, "rgba(92,205,189,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
      const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
      body.addColorStop(0, "#f8fafc"); body.addColorStop(0.45, "#9fe3d8"); body.addColorStop(1, "#14304d");
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#07111f"; ctx.font = `600 ${Math.round(11 * f)}px Inter Variable, system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(data.names[v], x, y + 0.5);
      if (m > 0.85) { // position number under each node in the ordered state
        ctx.fillStyle = `rgba(203,213,225,${((m - 0.85) / 0.15) * 0.8})`; ctx.font = `500 ${Math.round(9.5 * f)}px JetBrains Mono, monospace`;
        ctx.fillText(String(pos.get(v)! + 1), x, y + r + 11 * f);
      }
    }
    // notify only when the ordering shown flips (not every frame)
    const o = m > 0.5 ? 1 : 0;
    if (o !== last) { last = o; cb.onPhase?.({ t: m, ordered: o === 1 }); }
  }

  const loop = (now: number) => {
    if (!running) return;
    draw(phaseAt(now).m, now);
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (running || reduced || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.05 });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  resize();
  if (reduced) draw(1, performance.now()); else start();

  return {
    setData(d: HeroData) { data = d; layout(); t0 = performance.now(); last = -1; if (reduced) draw(1, t0); },
    replay() { t0 = performance.now(); last = -1; pulses.length = 0; if (reduced) draw(1, t0); },
    destroy() { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); },
    reduced,
  };
}
