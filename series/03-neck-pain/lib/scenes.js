/* Scene painters for the neck-pain film. Each painter takes local time (seconds into the scene)
   and returns { bg, theme, svg, ui }. Painters are shared by the 177 s film and the 20 s cut. */
(function (G) {
  'use strict';
  const { W, H, clamp, lerp, seg, ease, easeOut, easeInOut, backOut, elasticOut, hash, kf, f, path, circ, ell, rect, line, g, at, layer, cam } = G.PAPER;
  const { person, P } = G.CAST;
  const RED = '#E7212B', DRED = '#C80710', INK = '#151515', GREY = '#474747', ACC = '#FFF3F3';

  // ---------- UI (HTML overlay) helpers ----------
  const div = (style, html = '') => `<div style="position:absolute;${style}">${html}</div>`;
  // Masked Type: each line slides up from behind a paper mask; a red paper strip sweeps across as it lands
  function masked(lines, x, y, size, t, t0, opts = {}) {
    const gap = opts.gap || 0.45, col = opts.color || '#FFFFFF', lh = size * 1.08;
    return lines.map((ln, i) => {
      const k = easeOut(seg(t, t0 + i * gap, t0 + i * gap + 0.7));
      const strip = seg(t, t0 + i * gap - 0.1, t0 + i * gap + 0.55);
      const sw = Math.sin(strip * Math.PI);
      const out = opts.out != null ? easeInOut(seg(t, opts.out, opts.out + 0.5)) : 0;
      return div(`left:${x}px;top:${y + i * lh}px;overflow:hidden;height:${lh}px;padding-right:20px`,
        `<div style="font:800 ${size}px/1.02 Inter;letter-spacing:-0.02em;color:${col};white-space:nowrap;transform:translateY(${(1 - k + out) * 110}%)">${ln}</div>` +
        `<div style="position:absolute;left:0;top:${size * 0.2}px;height:${size * 0.7}px;width:100%;background:${RED};transform-origin:${strip < 0.5 ? 'left' : 'right'};transform:scaleX(${sw.toFixed(3)})"></div>`);
    }).join('');
  }
  // Elastic Type: letters stretch in with an elastic settle, then fold away
  function elastic(word, x, y, size, t, t0, hold = 1.6, col = RED) {
    if (t < t0 || t > t0 + hold + 0.5) return '';
    const out = seg(t, t0 + hold, t0 + hold + 0.4);
    return div(`left:${x}px;top:${y}px;display:flex;font:900 ${size}px/1 Inter;letter-spacing:-0.01em;color:${col}`,
      word.split('').map((c, i) => {
        const k = seg(t, t0 + i * 0.05, t0 + i * 0.05 + 0.9);
        const sy = k <= 0 ? 0 : elasticOut(k), sx = 1 + (1 - Math.min(1, k * 1.6)) * 0.5;
        return `<span style="display:inline-block;transform-origin:50% 100%;transform:scale(${(sx * (1 - out)).toFixed(3)},${(sy * (1 - out)).toFixed(3)})">${c === ' ' ? '&nbsp;' : c}</span>`;
      }).join(''));
  }
  function chip(text, x, y, k, style = 'light', size = 34) {
    if (k <= 0) return '';
    const s = backOut(clamp(k));
    const bg = style === 'red' ? RED : style === 'dark' ? '#101010' : style === 'accent' ? ACC : '#FFFFFF';
    const fg = style === 'red' || style === 'dark' ? '#FFFFFF' : INK;
    return div(`left:${x}px;top:${y}px;transform:scale(${s.toFixed(3)});transform-origin:0 50%;opacity:${clamp(k * 3)};padding:14px 26px;border-radius:999px;background:${bg};color:${fg};font:700 ${size}px/1.1 Inter;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.18)`, text);
  }
  // Spring Stack cards
  function stack(items, t, x, y, opts = {}) {
    const w = opts.w || 420, hgt = opts.h || 118;
    let html = '';
    const n = items.filter(it => t >= it[1]).length;
    items.forEach((it, i) => {
      if (t < it[1]) return;
      const k = seg(t, it[1], it[1] + 0.9);
      const spring = 1 - Math.exp(-6 * k) * Math.cos(k * 14);
      const depth = n - 1 - i;
      const yy = y + (1 - spring) * 260 + depth * (hgt * 0.34);
      const sc = 1 - depth * 0.06;
      const active = depth === 0;
      html += div(`left:${x}px;top:${yy.toFixed(1)}px;width:${w}px;height:${hgt}px;transform:scale(${sc.toFixed(3)});transform-origin:0 0;z-index:${10 + i};border-radius:22px;background:${active ? '#FFFFFF' : ACC};box-shadow:0 14px 30px rgba(0,0,0,.18);display:flex;align-items:center;gap:22px;padding:0 30px;box-sizing:border-box;opacity:${clamp(k * 4)}`,
        `<div style="width:54px;height:54px;border-radius:50%;background:${active ? RED : '#151515'};color:#fff;font:800 28px/54px Inter;text-align:center">${i + 1}</div><div style="font:800 46px/1 Inter;color:${INK}">${it[0]}</div>`);
    });
    return html;
  }

  // ---------- shared sets ----------
  function darkRoom(t, warm = 0, noLamp = false) {
    let s = rect(0, 0, W, H, '#0D0D0D');
    s += layer(rect(60, 200, 960, 1320, '#121212', 28), 1);
    s += layer(rect(120, 300, 300, 380, '#161616', 16) + rect(140, 320, 260, 340, '#1B1B1B', 12), 1);
    s += P.windowNight(640, 280, 340, 420, 1);
    s += rect(0, 1500, W, 420, '#050505') + rect(0, 1498, W, 6, '#1E1E1E');
    if (!noLamp) s += P.lamp(560, 1500, 1, 0.8 + warm * 0.6);
    return s;
  }
  function clinicSet(t, light = 1) {
    let s = rect(0, 0, W, H, '#FAFAFA');
    s += rect(0, 1480, W, 440, '#F2ECE7') + rect(0, 1478, W, 6, '#E3D9D1');
    s += layer(P.windowDay(560, 320, 420, 560, light), 1);
    s += layer(rect(520, 300, 36, 620, '#EDE6DF', 10) + rect(984, 300, 36, 620, '#EDE6DF', 10), 1);
    s += P.rug(540, 1560, 900, 140, '#F7F1EC');
    return s;
  }
  function homeLight(t, light = 1, noWindow = false) {
    let s = rect(0, 0, W, H, '#FFFFFF');
    s += rect(0, 1480, W, 440, '#F6F1ED') + rect(0, 1478, W, 6, '#E6DCD4');
    if (!noWindow) s += layer(P.windowDay(120, 300, 380, 520, light), 1);
    s += P.plant(880, 1480, 1.1);
    return s;
  }

  // ---------- S1: the interrupted moment (dark) ----------
  function sOpening(t, o = {}) {
    const resolved = !!o.resolved;
    const z = kf(t, [[0, 1.0], [8, 1.07]], ease);
    let svg = darkRoom(t, resolved ? 1 : 0);
    svg += P.sofa(770, 1500, 420, '#2A2A2A', '#1F1F1F');
    const mTurn = kf(t, [[0, -0.2], [1.4, -0.55]]);
    svg += layer(person({ who: 'mother', x: 780, y: 1500, s: 0.7, pose: 'sit', turn: mTurn, t, seed: 3, mouth: resolved ? 'smile' : (t > 3.6 ? 'neutral' : 'smile'), brows: !resolved && t > 3.6 ? 'worried' : 'neutral',
      hR: [60, -300], holdR: (x, y) => P.cup(x - 10, y - 10, 0.9, 1, t) }), 2);
    let turn, tilt, eyes, brows, mouth, hL;
    if (!resolved) {
      turn = kf(t, [[0.2, -0.3], [2.2, 0.55], [3.2, 0.5], [4.2, 0.18]]);
      tilt = kf(t, [[3.0, 0], [3.8, 7]]);
      const pain = t > 3.1;
      eyes = pain ? 'wince' : 'open'; brows = pain ? 'worried' : 'neutral'; mouth = pain ? 'tight' : 'smile';
      hL = kf(t, [[3.0, [-128, -282]], [3.9, [64, -650]]]);
    } else {
      turn = kf(t, [[0.3, -0.2], [2.4, 0.62]]);
      tilt = kf(t, [[0.3, 0], [2.4, -3]]);
      eyes = t > 2.2 ? 'soft' : 'open'; brows = 'relaxed'; mouth = 'smile'; hL = null;
    }
    svg += layer(person({ who: 'ayesha', x: 330, y: 1500, s: 0.72, turn, tilt, eyes, brows, mouth, hL, t, seed: 1, rim: 1 }), 3);
    if (!resolved) svg += P.pauseTab(520, 620, seg(t, 3.4, 3.9), 1.05);
    const ui = resolved ? '' : masked(['Neck pain can', '<span style="color:#E7212B">interrupt</span>', 'the smallest', 'moments.'], 90, 200, 100, t, 0.8, { gap: 0.35, out: 6.4 });
    return { bg: '#0D0D0D', theme: 'dark', svg: cam(svg, 540, 1110, z * 1.08), ui };
  }

  // ---------- S2: everyday interruptions (connected dioramas) ----------
  function room(i, t, lt) {
    // lt: time relative to this room's beat start; i: 0 desk, 1 reading, 2 bed
    const ox = i * W;
    let s = layer(rect(ox + 60, 360, 960, 1200, i === 2 ? '#101010' : '#141414', 30), 1);
    const pain = lt > 1.4;
    const hand = kf(lt, [[1.3, 0], [2.1, 1]]);
    const shoulder = [64, -650];
    if (i === 0) {
      s += P.lamp(ox + 860, 1360, 0.9, 1);
      const typing = lt < 1.3 ? Math.sin(lt * 18) * 6 : 0;
      const hR = [lerp(70, shoulder[0], 0) + typing, -250];
      const hL = pain ? [lerp(-70, shoulder[0], hand), lerp(-250, shoulder[1], hand)] : [-70 - typing, -250];
      s += layer(person({ who: 'ayesha', x: ox + 540, y: 1330, s: 0.8, pose: 'sit', hideLegs: 1, turn: pain ? 0.15 : -0.05, tilt: pain ? 6 : 0, eyes: pain ? 'wince' : 'down', brows: pain ? 'worried' : 'neutral', mouth: pain ? 'tight' : 'neutral', hL, hR, t: lt + 10, seed: 2, rim: 1 }), 2);
      s += P.desk(ox + 540, 1330, 820, '#2A211D', '#3A2E28');
      s += P.laptop(ox + 540, 1312, 1, 1);
    } else if (i === 1) {
      s += P.sofa(ox + 540, 1440, 640, '#2A2A2A', '#1F1F1F');
      s += P.lamp(ox + 170, 1440, 0.9, 1);
      const bookY = pain ? kf(lt, [[1.3, -330], [2.1, -250]]) : -330;
      const hL = pain ? [lerp(-60, shoulder[0], hand), lerp(bookY, shoulder[1], hand)] : [-60, bookY];
      s += layer(person({ who: 'ayesha', x: ox + 540, y: 1440, s: 0.8, pose: 'sit', turn: 0.05, tilt: pain ? 6 : 3, eyes: pain ? 'wince' : 'down', brows: pain ? 'worried' : 'neutral', mouth: pain ? 'tight' : 'neutral', hL, hR: [60, bookY],
        holdR: (x, y) => P.book(x - 60, y - 10, 0.95), t: lt + 20, seed: 4, rim: 1 }), 2);
    } else {
      s += P.windowNight(ox + 620, 470, 300, 360, 1);
      s += P.bed(ox + 540, 1440, 1, 1);
      const pil = kf(lt, [[0, 0], [1.2, 1]]);
      const hL = pain ? [lerp(-150, shoulder[0], hand), lerp(-420, shoulder[1], hand)] : [lerp(-200, -150, pil), -420];
      s += P.pillow(ox + 540 - 190 + pil * 40, 1440 - 470 * 0.8 + 10, 0.9, '#D9D2CC');
      s += layer(person({ who: 'ayesha', x: ox + 600, y: 1440, s: 0.8, pose: 'sit', hideLegs: 1, turn: -0.25, tilt: pain ? -6 : 0, eyes: pain ? 'wince' : 'open', brows: pain ? 'worried' : 'neutral', mouth: pain ? 'tight' : 'neutral', hL, t: lt + 30, seed: 6, rim: 1 }), 2);
      s += rect(ox + 160, 1300, 760, 150, '#3A2F2F', 22);
    }
    s += P.pauseTab(ox + 790, 820, seg(lt, 1.8, 2.3), 1.1);
    return s;
  }
  function sEveryday(t) {
    // beats: desk 0-4, reading 4-8.4, bed 8.4-11.8, pull back 11.8-15
    const beats = [0, 4.0, 7.3];
    let world = '';
    for (let i = 0; i < 3; i++) world += room(i, t, t - beats[i]);
    const cx = kf(t, [[0, 540], [3.5, 540], [4.3, 540 + W], [6.8, 540 + W], [7.6, 540 + 2 * W], [11.0, 540 + 2 * W], [12.0, 540 + W]], easeInOut);
    const z = kf(t, [[0, 1], [11.0, 1], [12.0, 0.33]], easeInOut);
    const cy = kf(t, [[11.0, 1000], [12.0, 960]]);
    let ui = elastic('WORK', 110, 230, 150, t, 0.9) + elastic('READ', 110, 230, 150, t, 4.2) + elastic('REST', 110, 230, 150, t, 7.5);
    ui += t > 12.2 ? elastic('EVERYDAY', 110, 300, 140, t, 12.3, 2.2) : '';
    return { bg: '#0D0D0D', theme: 'dark', svg: rect(0, 0, 3 * W, H, '#0D0D0D') + cam(world, cx, cy, z), ui };
  }

  // ---------- S3: why it matters ----------
  function sStakes(t) {
    let svg, ui = '';
    if (t < 3.0) {
      const close = easeInOut(seg(t, 0.4, 1.8));
      let s = darkRoom(t, 0, true) + ell(760, 1000, 260, 260, '#FFF3F3', 'opacity=".05"');
      s += layer(person({ who: 'ayesha', x: 540, y: 1330, s: 0.95, pose: 'sit', hideLegs: 1, turn: kf(t, [[1.6, 0], [2.6, 0.3]]), eyes: t > 1.8 ? 'closed' : 'down', brows: 'worried', mouth: 'neutral',
        hL: [-80, -250], hR: [80 - close * 20, -250], t: t + 40, seed: 2, rim: 1 }), 2);
      s += P.desk(540, 1330, 860, '#2A211D', '#3A2E28');
      s += g(P.laptop(0, 0, 1.1, 1 - close), `translate(540 1312) scale(1 ${f(1 - close * 0.9)})`);
      s += layer(rect(640, 1200, 250, 110, '#EDE3DA', 8) + rect(660, 1220, 180, 10, '#474747', 3, 'opacity=".4"'), 1);
      svg = cam(s, 540, 1100, 1.25);
    } else {
      const lt = t - 3.0;
      let s = darkRoom(t, 0.4);
      s += P.sofa(540, 1500, 760, '#2A2A2A', '#1F1F1F');
      const talk = lt < 4 ? Math.abs(Math.sin(lt * 9)) : 0;
      s += layer(person({ who: 'mother', x: 740, y: 1500, s: 0.72, pose: 'sit', turn: -0.5, mouth: lt < 4 ? 'talk' : 'smile', talk, hR: [kf(lt, [[0, 110], [1, 200], [2, 120], [3, 190]]), -420], hL: [-60, -230], t: t + 5, seed: 3 }), 2);
      const disc = lt > 1.8 && lt < 3.4;
      s += layer(person({ who: 'ayesha', x: 350, y: 1500, s: 0.72, pose: 'sit', turn: 0.5, tilt: disc ? 6 : 0, eyes: disc ? 'wince' : lt > 3.6 ? 'soft' : 'open', brows: disc ? 'worried' : 'neutral', mouth: lt > 3.6 ? 'smile' : 'neutral',
        hL: disc ? [64, -650] : [-72, -226], hR: [72, -236], holdR: (x, y) => P.cup(x - 20, y - 10, 0.8, 1, t), t: t + 7, seed: 1, rim: 1 }), 2);
      s += layer(rect(380, 1440, 320, 26, '#3A2E28', 8), 1);
      const pull = kf(lt, [[6.8, 0], [7.8, 1]]);
      svg = cam(s, 540, 1060, lerp(1.08, 1.0, pull)) + (pull > 0 ? rect(0, 0, W, H, '#0D0D0D', 0, `opacity="${(pull * 0.72).toFixed(3)}"`) : '');
      const tags = [['Comfort', 120, 330, 7.5], ['Concentration', 520, 420, 7.9], ['Rest', 180, 560, 8.3], ['Confidence', 560, 640, 8.7]];
      ui += tags.map(([w, x, y, t0], i) => {
        const k = seg(t, t0, t0 + 0.5), out = seg(t, 11.3, 11.6);
        return k > 0 && out < 1 ? div(`left:${x}px;top:${y}px;transform:rotate(${(hash(i) - 0.5) * 8}deg) scale(${backOut(k) * (1 - out)});padding:14px 26px 14px 44px;background:#FFFFFF;color:${INK};font:700 38px Inter;border-radius:10px;box-shadow:0 10px 24px rgba(0,0,0,.4)`,
          `<span style="position:absolute;left:16px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:${RED}"></span>${w}`) : '';
      }).join('');
      ui += masked(['What does it', 'interrupt', 'for <span style="color:#E7212B">you?</span>'], 100, 360, 128, t, 11.8, { gap: 0.3 });
    }
    return { bg: '#0D0D0D', theme: 'dark', svg, ui };
  }

  // ---------- S4: the unexpected turn (headfake) ----------
  function sHeadfake(t) {
    const fold = easeInOut(seg(t, 5.6, 6.8));      // card folds into the notebook
    const light = easeInOut(seg(t, 5.9, 7.0));     // dark -> light
    let svg = rect(0, 0, W, H, '#0D0D0D');
    if (light > 0) svg += `<g clip-path="inset(0)">${rect(0, H * (1 - light), W, H * light + 2, '#FAFAFA')}</g>`;
    let ui = '';
    if (fold < 1) {
      const drop = backOut(seg(t, 0.2, 1.0), 1.2), swing = Math.sin(t * 2.4) * 3 * (1 - seg(t, 1, 5));
      const wob = t > 3.5 && t < 5.6 ? Math.sin((t - 3.5) * 7) * 2.5 : 0;
      const sy = 1 - fold, y = lerp(-500, 0, drop);
      ui += div(`left:90px;top:${560 + y}px;width:900px;height:620px;transform:perspective(1400px) rotateX(${(fold * 88).toFixed(1)}deg) rotate(${(swing + wob).toFixed(2)}deg);transform-origin:50% 100%;background:${ACC};border-radius:26px;box-shadow:0 30px 60px rgba(0,0,0,.55);display:flex;flex-direction:column;justify-content:center;padding:0 70px;box-sizing:border-box;opacity:${(1 - fold * 0.6).toFixed(3)}`,
        `<div style="font:700 34px Inter;letter-spacing:.2em;color:${GREY}">THE USUAL SEARCH</div><div style="font:900 132px/0.98 Inter;letter-spacing:-0.02em;color:${INK};margin-top:18px">ONE QUICK<br>FIX<span style="color:${RED}">?</span></div>`);
    }
    if (fold > 0.4) {
      const open = easeOut(seg(t, 6.3, 7.4));
      const lines = [];
      svg += P.notebook(540, 1070, 1.55, open, lines, 0);
      const title = seg(t, 7.0, 7.8);
      ui += div(`left:${140}px;top:${800}px;width:780px;opacity:${title};font:900 76px/1.02 Inter;color:${INK};letter-spacing:-0.02em`, 'START WITH<br><span style="color:#E7212B">YOUR STORY.</span>');
      [['Your symptoms', 10.1], ['Your routine', 11.4], ['Your goals', 12.6]].forEach(([w, t0], i) => {
        const k = seg(t, t0, t0 + 0.6);
        if (k > 0) ui += div(`left:150px;top:${1020 + i * 100}px;display:flex;align-items:center;gap:22px;font:700 48px Inter;color:${INK};opacity:${k}`,
          `<span style="display:inline-block;width:46px;height:46px;border-radius:12px;border:4px solid ${RED};position:relative"><span style="position:absolute;left:10px;top:-2px;width:14px;height:30px;border:solid ${RED};border-width:0 6px 6px 0;transform:rotate(45deg) scale(${easeOut(seg(t, t0 + 0.2, t0 + 0.6))})"></span></span><span style="clip-path:inset(0 ${(1 - easeOut(k)) * 100}% 0 0)">${w}</span>`);
      });
    }
    return { bg: light > 0.5 ? '#FAFAFA' : '#0D0D0D', theme: light > 0.5 ? 'light' : 'dark', svg, ui };
  }

  // ---------- S5: meet Dr. Munaza ----------
  function sMeet(t) {
    let svg = clinicSet(t), ui = '';
    if (t < 7.6) {
      svg += layer(P.sofa(210, 1480, 300, '#E6DDD3', '#D8CDC1'), 1);
      const walk = seg(t, 0.2, 3.2);
      const ax = lerp(-220, 340, easeOut(walk));
      const bob = walk < 1 ? Math.abs(Math.sin(t * 5.2)) * 10 : 0;
      svg += layer(person({ who: 'ayesha', x: ax, y: 1500 - bob, s: 0.74, turn: 0.45, eyes: t > 3 ? 'soft' : 'open', mouth: t > 3.2 ? 'smile' : 'neutral', t, seed: 1 }), 2);
      const wel = seg(t, 2.4, 3.2);
      svg += layer(person({ who: 'munaza', x: 760, y: 1500, s: 0.74, turn: -0.45, eyes: t > 3 ? 'soft' : 'open', tilt: -3 * wel, hR: [lerp(128, 250, wel), lerp(-282, -520, wel)], t, seed: 5 }), 2);
      const k = seg(t, 3.6, 4.3);
      if (k > 0) ui += div(`left:90px;top:200px;opacity:${k};transform:translateX(${(1 - easeOut(k)) * -40}px)`,
        `<div style="font:800 76px/1 Inter;color:${INK};letter-spacing:-0.02em">Dr. Munaza Ghani</div><div style="margin-top:14px;display:flex;gap:14px;align-items:center"><span style="width:44px;height:6px;background:${RED}"></span><span style="font:700 38px Inter;color:${RED}">Munaza Physio Studio</span></div><div style="margin-top:10px;font:600 30px Inter;color:${GREY}">Women-only physiotherapy · Lahore</div>`);
    } else {
      const lt = t - 7.6;
      svg += layer(P.chair(330, 1500, 0.9) + P.chair(760, 1500, 0.9), 1);
      const nod = Math.sin(lt * 2.2) * 2.5;
      const talk = lt > 4 && lt < 11 ? Math.abs(Math.sin(lt * 8)) : 0;
      svg += layer(person({ who: 'ayesha', x: 330, y: 1500, s: 0.74, pose: 'sit', turn: 0.55, mouth: talk ? 'talk' : 'neutral', talk, eyes: 'open', hL: [lt > 5 && lt < 8 ? 64 : -72, lt > 5 && lt < 8 ? -650 : -226], t, seed: 1 }), 2);
      svg += layer(person({ who: 'munaza', x: 760, y: 1500, s: 0.74, pose: 'sit', turn: -0.55, tilt: nod, eyes: 'soft', hL: [-60, -250], hR: [40, -262], holdL: (x, y) => P.notebook(x + 50, y - 20, 0.28, 0, []), t, seed: 5 }), 2);
      [['Private room', 0.6, 'accent'], ['Your pace', 5.5, 'light'], ['Your questions', 8.6, 'light'], ['Your choice', 10.4, 'red']].forEach(([w, t0, st], i) => {
        ui += chip(w, 90 + (i % 2) * 420, 240 + Math.floor(i / 2) * 110, seg(lt, t0, t0 + 0.5), st, 38);
      });
    }
    return { bg: '#FAFAFA', theme: 'light', svg, ui };
  }

  // ---------- S6: assessment ----------
  function sAssess(t) {
    let svg = clinicSet(t), ui = '';
    if (t < 10) {
      svg += layer(P.chair(330, 1500, 0.9) + P.chair(760, 1500, 0.9), 1);
      const talk = t > 3 && t < 9 ? Math.abs(Math.sin(t * 8.5)) : 0;
      const write = Math.sin(t * 6) * 8;
      let s = svg + layer(person({ who: 'ayesha', x: 330, y: 1500, s: 0.74, pose: 'sit', turn: 0.55, mouth: talk ? 'talk' : 'neutral', talk, hL: t > 3.6 && t < 6 ? [64, -650] : [-72, -226], t, seed: 1 }), 2);
      s += layer(person({ who: 'munaza', x: 760, y: 1500, s: 0.74, pose: 'sit', turn: -0.5, eyes: 'down', tilt: 4, hL: [-50, -262], hR: [20 + write, -270], holdL: (x, y) => P.notebook(x + 40, y - 14, 0.3, 1, []), t, seed: 5 }), 2);
      svg = cam(s, 560, 1050, kf(t, [[0, 1.0], [10, 1.12]]));
    } else if (t < 14) {
      const lt = t - 10;
      const turn = Math.sin(lt * 1.3) * 0.32;
      svg += layer(person({ who: 'ayesha', x: 350, y: 1500, s: 0.76, turn, eyes: 'open', mouth: 'neutral', t, seed: 1 }), 2);
      svg += layer(person({ who: 'munaza', x: 790, y: 1500, s: 0.74, turn: -0.4, eyes: 'open', hL: [-60, -470], hR: [40, -470], holdL: (x, y) => P.notebook(x + 50, y - 10, 0.3, 1, []), t, seed: 5 }), 2);
      svg += `<path d="M230,700 A150,150 0 0 1 470,700" fill="none" stroke="${RED}" stroke-width="6" stroke-dasharray="4 16" stroke-linecap="round" opacity="${seg(lt, 0.3, 1)}"/>`;
      ui += chip('Comfortable range only', 90, 440, seg(lt, 0.6, 1.1), 'accent', 32);
    } else {
      const lt = t - 14;
      svg = rect(0, 0, W, H, '#FAFAFA') + layer(rect(80, 520, 920, 900, '#FFFFFF', 30), 1);
      const goals = [['Desk work', 'laptop', 0.2], ['Reading', 'book', 4.3], ['Resting at night', 'moon', 5.2]];
      goals.forEach(([w, icon, t0], i) => {
        const k = seg(lt, t0, t0 + 0.6), y = 620 + i * 250;
        if (k <= 0) return;
        let ic = icon === 'laptop' ? P.laptop(0, 40, 0.4, 1) : icon === 'book' ? P.book(0, 0, 0.7) : circ(0, 0, 44, '#151515') + circ(18, -12, 38, '#FFFFFF');
        svg += g(layer(rect(-360, -95, 720, 190, ACC, 24) + g(ic, 'translate(-270 0)'), 2), `translate(540 ${y + (1 - backOut(k)) * 80}) scale(${backOut(k)})`);
        ui += div(`left:${390}px;top:${y - 30}px;font:800 50px Inter;color:${INK};opacity:${k}`, w);
        const c = seg(lt, t0 + 0.7, t0 + 1.2);
        if (c > 0) ui += div(`left:840px;top:${y - 36}px;width:70px;height:70px;border-radius:50%;background:${RED};transform:scale(${backOut(c)})`, `<div style="position:absolute;left:24px;top:10px;width:18px;height:36px;border:solid #fff;border-width:0 7px 7px 0;transform:rotate(45deg)"></div>`);
      });
    }
    ui += stack([['Listen.', 0.8], ['Assess.', 10.1], ['Set goals.', 22.1]], t, 90, 200);
    return { bg: '#FAFAFA', theme: 'light', svg, ui };
  }

  // ---------- S7: the individual plan ----------
  function sPlan(t) {
    let svg, ui = '';
    const label = (n, txt, t0, t1) => {
      const k = seg(t, t0, t0 + 0.5), out = seg(t, t1 - 0.3, t1);
      return k > 0 && out < 1 ? div(`left:80px;top:320px;opacity:${k * (1 - out)};display:flex;align-items:center;gap:18px;background:#FFFFFF;padding:14px 26px 14px 14px;border-radius:999px;box-shadow:0 10px 24px rgba(0,0,0,.14);max-width:920px`, `<span style="width:64px;height:64px;border-radius:50%;background:${RED};color:#fff;font:800 34px/64px Inter;text-align:center">${n}</span><span style="font:800 40px/1.1 Inter;color:${INK};max-width:780px">${txt}</span>`) : '';
    };
    if (t < 9.8) {
      // beat 1: guided movement and strengthening, demonstrated side by side
      svg = clinicSet(t) + layer(P.chair(330, 1500, 0.9), 1);
      const on = seg(t, 5.8, 6.4);
      const roll = Math.sin((t - 5.8) * 2.4) * on, tuck = Math.max(0, Math.sin((t - 5.8) * 1.2)) * on;
      svg += layer(person({ who: 'ayesha', x: 330, y: 1500 - roll * 6, s: 0.74, pose: 'sit', turn: 0.3, tilt: -tuck * 3, eyes: 'open', mouth: t < 5 ? 'neutral' : 'smile', t, seed: 1 }), 2);
      svg += layer(person({ who: 'munaza', x: 780, y: 1500 - roll * 6, s: 0.74, turn: -0.35, tilt: -tuck * 3, eyes: 'soft', hR: t < 5.8 ? [lerp(128, 230, seg(t, 3, 3.8)), lerp(-282, -480, seg(t, 3, 3.8))] : null, t, seed: 5 }), 2);
      ui += div(`left:90px;top:200px;font:700 34px Inter;letter-spacing:.14em;color:${RED};opacity:${seg(t, 2.9, 3.4)}`, 'YOUR PLAN MAY INCLUDE');
      ui += div(`left:90px;top:250px;font:600 30px Inter;color:${GREY};opacity:${seg(t, 3.2, 3.7)}`, 'Depending on your assessment');
      ui += label(1, 'Guided movement &amp; strengthening', 6.2, 9.8);
    } else if (t < 14.6) {
      const lt = t - 9.8;
      svg = homeLight(t, 1, true);
      const lift = easeOut(seg(lt, 0.8, 1.8));
      svg += layer(person({ who: 'ayesha', x: 540, y: 1360, s: 0.8, pose: 'sit', hideLegs: 1, turn: 0, tilt: lerp(8, 0, lift), eyes: lift > 0.5 ? 'open' : 'down', hL: [-70, -250], hR: lt > 2.4 ? [lerp(70, 150, seg(lt, 2.4, 3.2)), lerp(-250, -560, seg(lt, 2.4, 3.2))] : [70, -250],
        holdR: lt > 2.4 ? (x, y) => P.phoneHand(x + 10, y - 60, 0.9) : null, t, seed: 1 }), 2);
      svg += P.desk(540, 1360, 820, '#CFC3B8', '#E0D5CB');
      svg += P.laptop(540, 1342, 1, 1, lift * 70);
      svg += g(P.pillow(0, 0, 0.8), `translate(820 1250) scale(${seg(lt, 3.3, 3.8)})`);
      ui += label(2, 'Practical changes to your desk, phone &amp; sleep setup', 9.8, 14.6);
      ui += chip('Screen higher', 560, 520, seg(lt, 1.2, 1.7), 'accent', 30) + chip('Phone at eye level', 560, 610, seg(lt, 2.8, 3.3), 'accent', 30) + chip('Pillow support', 560, 700, seg(lt, 3.6, 4.1), 'accent', 30);
    } else if (t < 19.2) {
      const lt = t - 14.6;
      svg = clinicSet(t) + layer(P.chair(420, 1500, 0.9), 1);
      const agree = seg(lt, 0.3, 1.2), handK = easeInOut(seg(lt, 1.6, 2.6));
      svg += layer(person({ who: 'ayesha', x: 420, y: 1500, s: 0.74, pose: 'sit', turn: 0.2, tilt: agree > 0 && agree < 1 ? Math.sin(agree * Math.PI * 2) * 4 : 0, eyes: lt > 2.6 ? 'soft' : 'open', mouth: lt > 0.5 ? 'smile' : 'neutral', t, seed: 1 }), 2);
      // Dr. Munaza stands to the side; her hand rests on Ayesha's shoulder, over the hijab
      svg += layer(person({ who: 'munaza', x: 740, y: 1500, s: 0.74, turn: -0.5, eyes: 'soft', tilt: -3, hL: [lerp(-128, -270, handK), lerp(-282, -452, handK)], t, seed: 5 }), 3);
      ui += chip('✓ Agreed together', 90, 470, seg(lt, 0.4, 0.9), 'red', 34);
      ui += label(3, 'Hands-on care, when appropriate', 14.6, 19.2);
    } else {
      const lt = t - 19.2;
      svg = rect(0, 0, W, H, '#FAFAFA');
      const cards = [['1', 'Guided movement'], ['2', 'Daily setup'], ['3', 'Hands-on care']];
      cards.forEach(([n, w], i) => {
        const k = seg(lt, i * 0.3, i * 0.3 + 0.8), sp = 1 - Math.exp(-6 * k) * Math.cos(k * 13);
        if (k > 0) ui += div(`left:${120 + i * 40}px;top:${560 + i * 190 + (1 - sp) * 200}px;width:760px;height:160px;border-radius:26px;background:${i === 2 ? '#FFFFFF' : ACC};box-shadow:0 16px 34px rgba(0,0,0,.14);display:flex;align-items:center;gap:26px;padding:0 36px;box-sizing:border-box;transform:rotate(${(i - 1) * 1.5}deg)`,
          `<span style="width:70px;height:70px;border-radius:50%;background:${RED};color:#fff;font:800 36px/70px Inter;text-align:center">${n}</span><span style="font:800 50px Inter;color:${INK}">${w}</span>`);
      });
      ui += masked(['Built around', '<span style="color:#E7212B">you.</span>'], 110, 230, 110, t, 22.2, { color: INK, gap: 0.3 });
      ui += div(`left:120px;top:1200px;font:600 34px Inter;color:${GREY};opacity:${seg(lt, 0.5, 1)}`, 'Depending on your assessment.');
    }
    return { bg: '#FAFAFA', theme: 'light', svg, ui };
  }

  // ---------- S8: practice and review ----------
  function sPractice(t) {
    let svg, ui = '';
    const days = [['6', 'MONDAY'], ['8', 'WEDNESDAY'], ['11', 'SATURDAY'], ['14', 'TUESDAY']];
    if (t < 9.3) {
      const di = t < 5.6 ? 0 : t < 7 ? 1 : 2;
      const light = [1, 0.55, 0.85][di];
      svg = homeLight(t, light, true) + (light > 0.7 ? circ(170, 560, 44, '#FFF3F3', 'stroke="#E7212B" stroke-width="6"') + [0,1,2,3,4,5,6,7].map(i => line([[170 + Math.cos(i * 0.785) * 62, 560 + Math.sin(i * 0.785) * 62], [170 + Math.cos(i * 0.785) * 82, 560 + Math.sin(i * 0.785) * 82]], '#E7212B', 6)).join('') : circ(170, 560, 50, '#474747') + circ(192, 544, 46, '#FFFFFF'));
      if (light < 1) svg += rect(0, 0, W, H, '#151515', 0, `opacity="${(1 - light) * 0.35}"`);
      svg += layer(P.chair(420, 1500, 0.9, '#E3DAD2', '#CFC3B8'), 1);
      const roll = Math.sin(t * 2.2);
      const moodEyes = di === 1 ? 'down' : 'open';
      svg += layer(person({ who: 'ayesha', x: 420, y: 1500 - roll * 6, s: 0.76, pose: 'sit', turn: 0.15, tilt: di === 1 ? 4 : 0, eyes: moodEyes, brows: di === 1 ? 'worried' : 'relaxed', mouth: di === 1 ? 'neutral' : 'smile', t, seed: 1 }), 2);
      const flip = t < 5.6 ? 0 : t < 7 ? seg(t, 5.6, 5.9) : seg(t, 7, 7.3);
      svg += g(P.calendar(0, 0, 1, days[di][0], 'OCT', days[di][1]), `translate(830 520) scale(1 ${f(1 - Math.sin(flip * Math.PI) * 0.9)})`);
      ui += masked(['Practice.'], 90, 220, 110, t, 0.5, { color: INK });
    } else if (t < 15.9) {
      const lt = t - 9.3;
      svg = clinicSet(t) + layer(P.chair(330, 1500, 0.9) + P.chair(760, 1500, 0.9), 1);
      const talk = lt < 3 ? Math.abs(Math.sin(lt * 8)) : 0;
      svg += layer(person({ who: 'ayesha', x: 330, y: 1500, s: 0.74, pose: 'sit', turn: 0.55, mouth: talk ? 'talk' : 'smile', talk, t, seed: 1 }), 2);
      svg += layer(person({ who: 'munaza', x: 760, y: 1500, s: 0.74, pose: 'sit', turn: -0.55, eyes: lt > 3 ? 'down' : 'soft', tilt: 3, hL: [-50, -262], hR: [20 + (lt > 3 ? Math.sin(lt * 6) * 8 : 0), -270], holdL: (x, y) => P.notebook(x + 40, y - 14, 0.3, 1, []), t, seed: 5 }), 2);
      svg += P.calendar(830, 520, 0.8, days[3][0], 'OCT', 'FOLLOW-UP');
      ui += masked(['Practice.', 'Review.', '<span style="color:#E7212B">Adjust.</span>'], 90, 220, 110, t, 9.3, { color: INK, gap: 2.6 });
    } else {
      const lt = t - 15.9;
      svg = homeLight(t, 1, true);
      svg += layer(person({ who: 'ayesha', x: 540, y: 1360, s: 0.8, pose: 'sit', hideLegs: 1, turn: kf(lt, [[0.8, 0], [2.2, -0.45], [3.4, -0.4]]), eyes: lt > 2 ? 'soft' : 'open', mouth: 'smile', brows: 'relaxed',
        hL: [-70 - Math.sin(lt * 14) * 5 * (lt < 0.8 ? 1 : 0), -250], hR: [70, -250], t, seed: 1 }), 2);
      svg += P.desk(540, 1360, 820, '#CFC3B8', '#E0D5CB');
      svg += P.laptop(540, 1342, 1, 1, 70);
      svg = cam(svg, 540, 1060, kf(lt, [[0, 1.1], [3.4, 0.96]]));
      ui += masked(['Practice.', 'Review.', '<span style="color:#E7212B">Adjust.</span>'], 90, 220, 110, t, -10, { color: INK, gap: 0, out: 17.6 });
    }
    return { bg: '#FFFFFF', theme: 'light', svg, ui };
  }

  // ---------- S9: website walkthrough (real captures) ----------
  function sWebsite(t) {
    const screens = [
      [0, 'home-00'], [3.7, 'menu-02'], [9.0, 'neck-00'], [9.8, 'neck-02'], [11.3, 'about-02'], [12.9, 'menu-02'], [14.2, 'book-00']
    ];
    let cur = screens[0];
    for (const s of screens) if (t >= s[0]) cur = s;
    const px = 470, py = 190, pw = 540, ph = 1170;
    const sw = pw - 28, sh = ph - 28;
    const slide = seg(t, cur[0], cur[0] + 0.35);
    let ui = '';
    // step chips (left column)
    const steps = [['1', 'Find neck-pain information', 2.4, 11.3], ['2', 'Learn about Dr. Munaza', 11.3, 12.9], ['3', 'Book an assessment', 12.9, 99]];
    ui += div(`left:90px;top:200px;width:350px;font:800 58px/1.05 Inter;color:${INK};letter-spacing:-0.02em;opacity:${seg(t, 0.2, 0.7)}`, 'The first<br>step, <span style="color:#E7212B">online.</span>');
    steps.forEach(([n, w, t0, t1], i) => {
      const k = seg(t, t0, t0 + 0.5), act = t >= t0 && t < t1;
      if (k > 0) ui += div(`left:90px;top:${520 + i * 190}px;width:350px;opacity:${k};transform:translateY(${(1 - easeOut(k)) * 30}px)`,
        `<div style="display:flex;gap:16px;align-items:flex-start"><span style="flex:none;width:58px;height:58px;border-radius:50%;background:${act ? RED : '#151515'};color:#fff;font:800 30px/58px Inter;text-align:center">${n}</span><span style="font:${act ? 800 : 600} 36px/1.15 Inter;color:${act ? INK : GREY}">${w}</span></div>`);
    });
    // phone
    const scroll = cur[1] === 'neck-02' ? 0 : 0;
    ui += div(`left:${px}px;top:${py}px;width:${pw}px;height:${ph}px;border-radius:64px;background:#101010;box-shadow:0 30px 70px rgba(0,0,0,.28)`,
      `<div style="position:absolute;left:14px;top:14px;width:${sw}px;height:${sh}px;border-radius:52px;overflow:hidden;background:#fff">` +
      `<img src="assets/site/neck/${cur[1]}.jpg" style="position:absolute;left:0;top:${scroll}px;width:100%;opacity:${(0.3 + 0.7 * slide).toFixed(3)};transform:translateX(${((1 - easeOut(slide)) * 40).toFixed(1)}px)">` + '</div>');
    // taps (finger circle) at real UI positions: scale factor from 390 css px to screen width
    const S = sw / 390;
    const taps = [[3.1, 371, 24], [8.6, 124, 376], [13.9, 166, 660]];
    for (const [t0, cx, cy] of taps) {
      const k = seg(t, t0 - 0.6, t0), r = seg(t, t0, t0 + 0.5);
      if (k > 0 && r < 1) {
        const x = px + 14 + cx * S, y = py + 14 + cy * S;
        ui += div(`left:${x - 34}px;top:${y - 34}px;width:68px;height:68px;border-radius:50%;background:rgba(231,33,43,.28);border:4px solid ${RED};transform:scale(${(1 + r * 0.7).toFixed(3)});opacity:${(k * (1 - r)).toFixed(3)}`);
      }
    }
    // highlight: Initial Assessment row on the booking page (not submitted)
    if (cur[1] === 'book-00') {
      const k = seg(t, 15.0, 15.6);
      const y = py + 14 + 408 * S;
      if (k > 0) ui += div(`left:${px + 14 + 16 * S}px;top:${y}px;width:${(358 * S)}px;height:${58 * S}px;border-radius:14px;border:6px solid ${RED};opacity:${k};box-shadow:0 0 0 ${(1 - k) * 30}px rgba(231,33,43,.15)`);
      if (k > 0) ui += chip('Initial Assessment · 60 min', 90, 1140, seg(t, 15.4, 15.9), 'red', 30) + div(`left:90px;top:1240px;width:350px;font:600 26px/1.3 Inter;color:${GREY};opacity:${seg(t, 15.9, 16.4)}`, 'Preview only. Nothing is booked in this video.');
    }
    return { bg: '#FAFAFA', theme: 'light', svg: rect(0, 0, W, H, '#FAFAFA') + layer(rect(-40, 1440, 1160, 520, '#FFF3F3', 0), 1), ui };
  }

  // ---------- S10b: brand finish with paper-fragment logo ----------
  function sBrand(t, o = {}) {
    const LP = G.LOGO_PARTICLES;
    const lx = 540 - LP.w / 2, ly = 430;
    const done = o.assembleEnd || 4.4, start = o.assembleStart || 0.2;
    let svg = rect(0, 0, W, H, '#000000');
    const crisp = seg(t, done - 0.3, done);
    if (crisp < 1) {
      let frag = '';
      for (let i = 0; i < LP.pts.length; i++) {
        const [x, y, col, a, b, c] = LP.pts[i];
        const d0 = start + a * (done - start) * 0.45;
        const k = easeInOut(seg(t, d0, d0 + (done - start) * 0.55));
        const sx = lerp(-80, W + 80, b), sy = lerp(200, 1700, c);
        const px = lerp(sx, lx + x, k), py = lerp(sy, ly + y, k);
        const rot = (1 - k) * (a * 720 - 360);
        const sz = LP.step * lerp(2.2, 1.05, k);
        frag += `<rect x="${f(-sz / 2)}" y="${f(-sz / 2)}" width="${f(sz)}" height="${f(sz * (0.7 + b * 0.5))}" fill="${col}" transform="translate(${f(px)} ${f(py)}) rotate(${f(rot)})" opacity="${f(0.35 + 0.65 * seg(t, d0 - 0.2, d0 + 0.4))}"/>`;
      }
      svg += `<g opacity="${(1 - crisp).toFixed(3)}">${frag}</g>`;
    }
    let ui = '';
    if (crisp > 0) ui += `<img src="assets/site_logo.png" style="position:absolute;left:${lx}px;top:${ly}px;width:${LP.w}px;height:${LP.h}px;opacity:${crisp}">`;
    const lines = o.lines || [['Start with a neck-pain assessment.', 1.2, 'font:800 52px/1.15 Inter;color:#FFFFFF'], ['Munaza Physio Studio', 2.4, 'font:800 60px/1.1 Inter;color:#FFFFFF'], ['Women-only physiotherapy • Lahore', 3.3, 'font:600 36px/1.2 Inter;color:#FAFAFA'], ['munazaphysio.studio', 4.0, 'font:800 46px/1 Inter;color:#FFFFFF;background:#E7212B;padding:18px 34px;border-radius:999px']];
    const y0 = o.textTop || 880;
    let y = y0;
    lines.forEach(([txt, t0, st], i) => {
      const k = easeOut(seg(t, t0, t0 + 0.5));
      ui += div(`left:0;right:0;top:${y}px;text-align:center;opacity:${k};transform:translateY(${(1 - k) * 24}px)`, `<span style="display:inline-block;${st}">${txt}</span>`);
      y += i === 0 ? 150 : i === 1 ? 90 : 110;
    });
    return { bg: '#000000', theme: 'dark', svg, ui };
  }


  // ---------- 20 s cut: three stacked panels ----------
  function sMontage(t) {
    let svg = rect(0, 0, W, H, '#0D0D0D');
    for (let i = 0; i < 3; i++) {
      const y0 = 210 + i * 470, lt = t - i * 1.1 + 0.2;
      const k = G.PAPER.easeOut(seg(t, i * 0.25, i * 0.25 + 0.5));
      svg += `<clipPath id="mp${i}"><rect x="90" y="${y0}" width="900" height="440" rx="26"/></clipPath>`;
      svg += `<g clip-path="url(#mp${i})" opacity="${k.toFixed(3)}">${rect(90, y0, 900, 440, '#141414')}<g transform="translate(${540 - 0.58 * (i * W + 540)} ${y0 + 220 - 0.58 * 1020}) scale(0.58)">${room(i, t, lt)}</g></g>`;
      svg += rect(90, y0, 900, 440, 'none', 26, 'stroke="#2A2A2A" stroke-width="3"');
    }
    const ui = ['WORK', 'READ', 'REST'].map((w, i) => div(`left:120px;top:${240 + i * 470}px;font:900 44px Inter;letter-spacing:.12em;color:#FFFFFF;opacity:${seg(t, i * 0.25 + 0.3, i * 0.25 + 0.7)}`, w)).join('');
    return { bg: '#0D0D0D', theme: 'dark', svg, ui };
  }

  G.SCENES = { sMontage, sOpening, sEveryday, sStakes, sHeadfake, sMeet, sAssess, sPlan, sPractice, sWebsite, sBrand, room, darkRoom, clinicSet, homeLight, div, masked, elastic, chip, stack };
})(window);
