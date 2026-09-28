/* Paper engine: every frame is a pure function of time t (seconds).
   A single paused GSAP timeline drives `t`, so HyperFrames can seek any frame in any order. */
(function (G) {
  'use strict';
  const W = 1080, H = 1920;

  // ---------- math ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = k => k * k * (3 - 2 * k);
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const easeIn = k => k * k * k;
  const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const backOut = (k, s = 1.6) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
  const elasticOut = k => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI / 3)) + 1);
  const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // keyframes: kf(t, [[t0, v0], [t1, v1], ...], easing) with numbers or arrays
  function kf(t, keys, fn = easeInOut) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
      if (t <= t1) {
        const k = fn(seg(t, t0, t1));
        return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
      }
    }
    return keys[keys.length - 1][1];
  }
  // blink: returns 0..1 eyelid closure, natural irregular timing
  function blink(t, seed = 0) {
    const period = 3.1 + hash(seed) * 1.8;
    const ph = ((t + seed * 1.37) % period) / period;
    return ph > 0.955 ? Math.sin((ph - 0.955) / 0.045 * Math.PI) : 0;
  }
  const f = n => (Math.round(n * 10) / 10).toString();

  // ---------- svg helpers ----------
  const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const circ = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
  const ell = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${extra}/>`;
  const rect = (x, y, w, h, fill, r = 0, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}" fill="${fill}" ${extra}/>`;
  const line = (pts, stroke, w, extra = '') => `<polyline points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const g = (inner, tr = '', extra = '') => `<g${tr ? ` transform="${tr}"` : ''} ${extra}>${inner}</g>`;
  const at = (x, y, s = 1, r = 0) => `translate(${f(x)} ${f(y)})${r ? ` rotate(${f(r)})` : ''}${s !== 1 ? ` scale(${s.toFixed(4)})` : ''}`;
  // paper layer: flat shape with a soft cast shadow (the 2.5D paper-cut look)
  const layer = (inner, depth = 1, extra = '') => `<g filter="url(#ps${Math.min(3, Math.max(1, depth))})" ${extra}>${inner}</g>`;
  // camera: world point (cx, cy) placed at frame centre with zoom z
  const cam = (inner, cx = W / 2, cy = H / 2, z = 1, r = 0) =>
    `<g transform="translate(${W / 2} ${H / 2}) scale(${z.toFixed(4)})${r ? ` rotate(${f(r)})` : ''} translate(${f(-cx)} ${f(-cy)})">${inner}</g>`;

  // ---------- 2-bone IK for arms ----------
  function ik(sx, sy, tx, ty, l1, l2, bend = 1) {
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy);
    const maxd = l1 + l2 - 0.5;
    if (d > maxd) { tx = sx + dx / d * maxd; ty = sy + dy / d * maxd; dx = tx - sx; dy = ty - sy; d = maxd; }
    d = Math.max(d, Math.abs(l1 - l2) + 1);
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const base = Math.atan2(dy, dx);
    const ang = base + a * bend;
    return { ex: sx + Math.cos(ang) * l1, ey: sy + Math.sin(ang) * l1, hx: tx, hy: ty };
  }

  // ---------- scene registry ----------
  const SHOTS = [];
  function shot(start, end, fn) { SHOTS.push({ start, end, fn }); }

  function mount(opts) {
    const stage = document.getElementById('stage');
    const world = document.getElementById('world');
    const ui = document.getElementById('ui');
    const caps = document.getElementById('caps');
    const dur = opts.duration;
    let last = -1;
    function render(t) {
      t = clamp(t, 0, dur - 1e-4);
      if (t === last) return; last = t;
      let s = SHOTS[SHOTS.length - 1];
      for (const x of SHOTS) if (t >= x.start && t < x.end) { s = x; break; }
      const lt = t - s.start, len = s.end - s.start;
      const out = s.fn(t, lt, len) || {};
      world.innerHTML = `${opts.defs}<rect width="${W}" height="${H}" fill="${out.bg || '#000'}"/>${out.svg || ''}`;
      stage.dataset.theme = out.theme || 'dark';
      ui.innerHTML = out.ui || '';
      caps.innerHTML = opts.captions ? opts.captions(t, out) : '';
    }
    const state = { t: 0 };
    const tl = G.gsap.timeline({ paused: true });
    tl.to(state, { t: dur, duration: dur, ease: 'none', onUpdate: () => render(state.t) }, 0);
    G.__timelines = G.__timelines || {};
    G.__timelines[opts.id] = tl;
    render(0);
    G.__render = render; // for manual scrubbing in a browser
  }

  G.PAPER = { W, H, clamp, lerp, seg, ease, easeOut, easeIn, easeInOut, backOut, elasticOut, hash, kf, blink, f,
    path, circ, ell, rect, line, g, at, layer, cam, ik, shot, SHOTS, mount };
})(window);
