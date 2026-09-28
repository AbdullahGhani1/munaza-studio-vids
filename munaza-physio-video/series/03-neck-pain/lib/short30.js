/* 30 s narrated short: fast cuts, side-view posture shots, sofa assessment, ergonomic payoff.
   Every frame is a pure function of t (see paper.js). */
(function (G) {
  'use strict';
  const { W, H, clamp, lerp, seg, easeOut, easeInOut, backOut, kf, f, path, circ, rect, line, g, layer, cam, shot, mount } = G.PAPER;
  const { person, P } = G.CAST;
  const { side, SP, joints } = G.SIDE;
  const S = G.SCENES;
  const { div, chip } = S;
  const RED = '#E7212B', INK = '#151515', GREY = '#474747', ACC = '#FFF3F3';
  const FLOOR = 1500, SURF = FLOOR - 434;      // floor line and desk surface

  const DEFS = '<defs>' +
    '<filter id="ps1" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".22"/></filter>' +
    '<filter id="ps2" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".28"/></filter>' +
    '<filter id="ps3" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".32"/></filter>' +
    '<linearGradient id="screenGlow" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#FFF3F3" stop-opacity=".42"/><stop offset="1" stop-color="#FFF3F3" stop-opacity="0"/></linearGradient>' +
    '</defs>';

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];

  // ---------- WORK: desk in profile. k: 0 = hunched over a low laptop, 1 = ergonomic setup ----------
  function deskWorld(t, o = {}) {
    const dark = o.dark !== false, k = clamp(o.k || 0), nh = clamp(o.neckHand || 0);
    let s = '';
    if (dark) {
      s += rect(0, 0, W, H, '#0D0D0D') + layer(rect(60, 360, 960, 1140, '#121212', 28), 1) + P.windowNight(660, 440, 280, 320, 1);
      s += rect(0, FLOOR, W, H - FLOOR, '#060606') + rect(0, FLOOR - 2, W, 5, '#1E1E1E');
    } else {
      s += rect(0, 0, W, H, '#FFFFFF') + layer(P.windowDay(620, 380, 320, 400, 1), 1) + P.plant(120, FLOOR, 0.9);
      s += rect(0, FLOOR, W, H - FLOOR, '#F6F1ED') + rect(0, FLOOR - 2, W, 5, '#E6DCD4');
    }
    s += SP.chair(300, FLOOR, 0.86, dark ? {} : { col: '#8E8E8E', dk: '#6E6E6E', lt: '#A8A8A8', metal: '#A0A0A0' });
    s += SP.desk(440, FLOOR, 600, 410, dark ? { col: '#2A211D', top: '#3A2E28' } : { col: '#CFC3B8', top: '#E0D5CB' });
    // laptop: flat on the desk (bad) -> raised on a stand at eye level (good), with a separate keyboard
    const lift = easeInOut(seg(k, 0.15, 0.75));
    const lx = lerp(760, 820, lift), ly = SURF - 150 * lift;
    s += SP.stand(820, SURF, 150 * lift, 230);
    s += SP.laptop(lx, ly, 0.7, { dark, glow: 1 });
    const kb = easeOut(seg(k, 0.55, 0.95));
    if (kb > 0) s += g(SP.keyboard(0, 0) + SP.mouse(130, 0), `translate(${f(lerp(700, 575, kb))} ${SURF}) `, `opacity="${kb.toFixed(3)}"`);
    // figure
    const hip = [lerp(362, 330, k), 1200];
    const lean = lerp(17, -3, k) + (o.leanAdd || 0), neck = lerp(30, 0, k) + (o.neckAdd || 0);
    const J = joints(lean, neck);
    const typing = o.typing ? Math.sin(t * 22) * 5 : 0;
    const badN = [lx - 72 + typing, ly - 14], badF = [lx - 36 - typing, ly - 14];
    const goodN = [560 + typing, SURF - 16], goodF = [610 - typing, SURF - 16];
    const handK = easeInOut(seg(k, 0.5, 0.9));
    let hN = sub([lerp(badN[0], goodN[0], handK), lerp(badN[1], goodN[1], handK)], hip);
    const hF = sub([lerp(badF[0], goodF[0], handK), lerp(badF[1], goodF[1], handK)], hip);
    if (nh > 0) hN = [lerp(hN[0], J.neckPt[0], nh), lerp(hN[1], J.neckPt[1], nh)];
    s += side({ who: 'ayesha', x: hip[0], y: hip[1], lean, neck, hN, hF, t, seed: 2, rim: dark ? 1 : 0,
      eyes: o.eyes || (k > 0.6 ? 'open' : 'down'), brows: o.brows, mouth: o.mouth || (k > 0.8 ? 'smile' : 'neutral'), knee: [236, -12], ankle: [254, 280] });
    return { s, hip, J, lx, ly };
  }

  // ---------- READ: armchair in profile, head bent over a low book ----------
  function readWorld(t, o = {}) {
    const nh = clamp(o.neckHand || 0);
    let s = rect(0, 0, W, H, '#D9D2CC');
    s += SP.bookshelf(640, 470, 360, 1030) + SP.bookshelf(-60, 560, 200, 940);
    s += rect(0, FLOOR, W, H - FLOOR, '#B9AEA6') + rect(0, FLOOR - 2, W, 5, '#A89C93');
    s += SP.armchair(300, FLOOR, 0.84);
    const hip = [330, 1200], lean = 18 + (o.leanAdd || 0), neck = 34 + (o.neckAdd || 0);
    const J = joints(lean, neck);
    const page = o.page || 0;
    let hN = [212, -150];
    const hF = [190, -140];
    if (nh > 0) hN = [lerp(hN[0], J.neckPt[0], nh), lerp(hN[1], J.neckPt[1], nh)];
    s += side({ who: 'ayesha', x: hip[0], y: hip[1], lean, neck, hN, hF, t, seed: 4,
      holdF: (x, y) => SP.book(x + 26, y + 6, 0.85, -32 + page), eyes: o.eyes || 'down', brows: o.brows, mouth: o.mouth, knee: [236, -12], ankle: [254, 280] });
    return { s, hip, J };
  }

  // ---------- REST: lying on the back, head propped on stacked pillows ----------
  function restWorld(t, o = {}) {
    const nh = clamp(o.neckHand || 0);
    let s = rect(0, 0, W, H, '#0D0D0D') + layer(rect(60, 360, 960, 1140, '#111111', 28), 1) + P.windowNight(640, 470, 280, 330, 1);
    s += rect(0, FLOOR, W, H - FLOOR, '#060606') + rect(0, FLOOR - 2, W, 5, '#1E1E1E');
    s += SP.bed(120, FLOOR, 860, 330, { dark: true });
    const top = FLOOR - 330;
    s += SP.pillow(215, top + 8, 230, 62, '#E4DDD7') + SP.pillow(210, top - 46, 210, 60, '#F2ECE7');
    const sc = 0.85, hip = [560, top - 88 * sc];
    const neck = 26 + (o.neckAdd || 0), J = joints(0, neck);
    let hN = [70, -130];
    if (nh > 0) hN = [lerp(hN[0], J.neckPt[0], nh), lerp(hN[1], J.neckPt[1], nh)];
    s += side({ who: 'ayesha', x: hip[0], y: hip[1], s: sc, pose: 'lie', neck, hN, hF: [60, -150], t, seed: 6, rim: 1,
      eyes: o.eyes || 'open', brows: o.brows, mouth: o.mouth });
    // blanket over the legs
    s += path(`M${hip[0] - 30},${top - 40} C${hip[0] + 120},${top - 70} ${hip[0] + 300},${top - 64} ${hip[0] + 420},${top - 30} L${hip[0] + 430},${top + 60} L${hip[0] - 40},${top + 60} Z`, '#3A2F2F', 'stroke="#5A4A4A" stroke-width="3"');
    return { s, hip, J };
  }

  // quick horizontal whip-in for hard cuts
  const whip = (svg, lt, dir = 1) => {
    const k = easeOut(seg(lt, 0, 0.22));
    return k >= 1 ? svg : `<g transform="translate(${f((1 - k) * 420 * dir)} 0)">${svg}</g>`;
  };
  const tabAt = (x, y, lt, t0) => P.pauseTab(x, y, seg(lt, t0, t0 + 0.28), 1.05);

  // ---------- shots ----------
  function sHook(t) {
    const d = deskWorld(t, { typing: 1, neckAdd: kf(t, [[0, -8], [1.6, 4]]), leanAdd: kf(t, [[0, -4], [1.6, 2]]) });
    const hip = d.hip, J = d.J;
    // posture guide: where the head is vs. over the shoulders
    const sh = [hip[0] + J.shoulder[0], hip[1] + J.shoulder[1]], ear = [hip[0] + J.headC[0] - 10, hip[1] + J.headC[1] + 10];
    const k = easeOut(seg(t, 1.0, 1.5));
    let ov = '';
    if (k > 0) {
      ov += line([sh, [sh[0], lerp(sh[1], sh[1] - 330, k)]], '#FFFFFF', 5, 'stroke-dasharray="4 16" opacity=".85"');
      ov += line([sh, [lerp(sh[0], ear[0], k), lerp(sh[1], ear[1], k)]], RED, 7, 'stroke-dasharray="4 16"');
      ov += circ(ear[0], ear[1], 14 * backOut(seg(t, 1.4, 1.7)), RED) + circ(sh[0], sh[1], 10 * k, '#FFFFFF');
    }
    const z = kf(t, [[0, 1.55], [2.62, 1.78]]);
    const ui = chip('HEAD FORWARD', 620, 470, seg(t, 1.55, 1.9), 'red', 34);
    return { bg: '#0D0D0D', theme: 'dark', svg: cam(d.s + ov, 520, 900, z), ui };
  }
  function sWork(t, lt) {
    const pain = easeInOut(seg(lt, 0.55, 1.0));
    const d = deskWorld(t, { typing: lt < 0.6 ? 1 : 0, neckHand: pain, eyes: pain > 0.4 ? 'wince' : 'down', brows: pain > 0.4 ? 'worried' : null, mouth: pain > 0.4 ? 'tight' : null, neckAdd: -6 * pain });
    const z = kf(lt, [[0, 1.0], [0.9, 1.0], [1.15, 1.14], [2.0, 1.18]]);
    const svg = whip(cam(d.s + tabAt(830, 640, lt, 1.0), 560, 1030, z), lt);
    return { bg: '#0D0D0D', theme: 'dark', svg, ui: '' };
  }
  function sRead(t, lt) {
    const pain = easeInOut(seg(lt, 0.55, 1.0));
    const d = readWorld(t, { neckHand: pain, eyes: pain > 0.4 ? 'wince' : 'down', brows: pain > 0.4 ? 'worried' : null, mouth: pain > 0.4 ? 'tight' : null, page: Math.sin(lt * 3) * 2 });
    const z = kf(lt, [[0, 1.0], [0.9, 1.0], [1.15, 1.14], [2.0, 1.18]]);
    return { bg: '#D9D2CC', theme: 'light', svg: whip(cam(d.s + tabAt(760, 600, lt, 1.0), 540, 1030, z), lt, -1), ui: '' };
  }
  function sRest(t, lt) {
    const pain = easeInOut(seg(lt, 0.6, 1.1));
    const d = restWorld(t, { neckHand: pain, eyes: pain > 0.4 ? 'wince' : 'open', brows: pain > 0.4 ? 'worried' : null, mouth: pain > 0.4 ? 'tight' : null, neckAdd: -4 * pain });
    const z = kf(lt, [[0, 1.0], [1.0, 1.0], [1.3, 1.12], [2.2, 1.16]]);
    return { bg: '#0D0D0D', theme: 'dark', svg: whip(cam(d.s + tabAt(700, 760, lt, 1.2), 520, 1060, z), lt), ui: '' };
  }
  // three stacked panels, each paused
  function sMontage(t, lt) {
    const worlds = [
      [deskWorld(t, { neckHand: 1, eyes: 'wince', brows: 'worried', mouth: 'tight', neckAdd: -6 }).s, 560, 1010, '#0D0D0D'],
      [readWorld(t, { neckHand: 1, eyes: 'wince', brows: 'worried', mouth: 'tight' }).s, 520, 1000, '#D9D2CC'],
      [restWorld(t, { neckHand: 1, eyes: 'wince', brows: 'worried', mouth: 'tight', neckAdd: -4 }).s, 520, 1080, '#0D0D0D']
    ];
    let svg = rect(0, 0, W, H, '#0D0D0D'), ui = '';
    const ph = 380;
    worlds.forEach(([w, cx, cy, bg], i) => {
      const y0 = 200 + i * (ph + 20);
      const k = easeOut(seg(lt, i * 0.12, i * 0.12 + 0.3));
      const dx = (1 - k) * (i % 2 ? -1 : 1) * 900;
      const z = 0.52 + seg(lt, 0, 2.2) * 0.04;
      svg += `<clipPath id="mp${i}"><rect x="${f(90 + dx)}" y="${y0}" width="900" height="${ph}" rx="26"/></clipPath>`;
      svg += `<g clip-path="url(#mp${i})">${rect(90 + dx, y0, 900, ph, bg)}<g transform="translate(${f(540 + dx)} ${y0 + ph / 2}) scale(${z.toFixed(4)}) translate(${-cx} ${-cy})">${w}</g></g>`;
      svg += rect(90 + dx, y0, 900, ph, 'none', 26, 'stroke="#2A2A2A" stroke-width="3"');
      svg += P.pauseTab(900 + dx, y0 + 80, seg(lt, 0.45 + i * 0.3, 0.75 + i * 0.3), 0.9);
      ui += div(`left:${f(120 + dx)}px;top:${y0 + 28}px;font:900 46px Inter;letter-spacing:.12em;color:#FFFFFF;text-shadow:0 3px 10px rgba(0,0,0,.6);opacity:${k}`, ['WORK', 'READ', 'REST'][i]);
    });
    // everything pauses: panels dim slightly at the end
    const dim = seg(lt, 1.7, 2.2) * 0.35;
    if (dim > 0) svg += rect(0, 0, W, H, '#000', 0, `opacity="${dim.toFixed(3)}"`);
    return { bg: '#0D0D0D', theme: 'dark', svg, ui };
  }
  // the headfake: "one quick fix?" gets stamped out
  function sQuickFix(t, lt) {
    const drop = backOut(seg(lt, 0.0, 0.45), 1.3);
    const shake = lt > 1.25 && lt < 1.6 ? Math.sin(lt * 90) * 10 * (1.6 - lt) / 0.35 : 0;
    const fall = easeInOut(seg(lt, 2.0, 2.35));
    let ui = div(`left:90px;top:${f(560 + lerp(-600, 0, drop) + fall * 900)}px;width:900px;height:600px;transform:translateX(${f(shake)}px) rotate(${f(-2 + fall * 14)}deg);background:${ACC};border-radius:26px;box-shadow:0 30px 60px rgba(0,0,0,.55);display:flex;flex-direction:column;justify-content:center;padding:0 70px;box-sizing:border-box`,
      `<div style="font:700 34px Inter;letter-spacing:.2em;color:${GREY}">THE USUAL SEARCH</div><div style="font:900 136px/0.98 Inter;letter-spacing:-0.02em;color:${INK};margin-top:18px">ONE QUICK<br>FIX<span style="color:${RED}">?</span></div>` +
      (lt > 1.25 ? `<div style="position:absolute;left:40px;right:40px;top:300px;height:26px;background:${RED};border-radius:13px;transform:rotate(-12deg) scaleX(${easeOut(seg(lt, 1.25, 1.45)).toFixed(3)});transform-origin:0 50%"></div>` : ''));
    return { bg: '#0D0D0D', theme: 'dark', svg: rect(0, 0, W, H, '#0D0D0D'), ui };
  }
  function sStory(t, lt) {
    const light = easeInOut(seg(lt, 0, 0.25));
    let svg = rect(0, 0, W, H, '#0D0D0D') + rect(0, H * (1 - light), W, H * light + 2, '#FAFAFA');
    const open = easeOut(seg(lt, 0.15, 0.7));
    svg += P.notebook(540, 1000, 1.5, open, [], 0);
    let ui = '';
    const k = seg(lt, 0.35, 0.8);
    ui += div(`left:150px;top:760px;width:780px;opacity:${k};transform:translateY(${f((1 - easeOut(k)) * 30)}px);font:900 92px/1.02 Inter;color:${INK};letter-spacing:-0.02em`, 'START WITH<br><span style="color:#E7212B">YOUR STORY.</span>');
    return { bg: '#FAFAFA', theme: 'light', svg, ui };
  }
  // assessment on the sofa: both stay seated the whole time
  function sSofa(t, lt, W30) {
    let s = S.clinicSet(t);
    s += layer(P.sofa(545, 1500, 650, '#DDD6CF', '#CBC2BA', 1.23), 1);
    const inCheck = t >= W30.check;
    const talk = !inCheck && lt > 0.3 && lt < 3.6 ? Math.abs(Math.sin(lt * 8.5)) : 0;
    const touch = !inCheck && lt > 1.0 && lt < 2.6;
    const turn = inCheck ? Math.sin((t - W30.check) * 2.2) * 0.42 * seg(t, W30.check, W30.check + 0.4) : 0.5;
    s += layer(person({ who: 'ayesha', x: 330, y: 1500, s: 0.74, pose: 'sit', turn, mouth: talk ? 'talk' : inCheck ? 'neutral' : 'neutral', talk, eyes: 'open', brows: touch ? 'worried' : 'neutral',
      hL: touch ? [64, -650] : [-72, -226], t, seed: 1 }), 2);
    const write = !inCheck ? Math.sin(lt * 7) * 9 : 0;
    s += layer(person({ who: 'munaza', x: 760, y: 1500, s: 0.74, pose: 'sit', turn: -0.5, eyes: inCheck ? 'soft' : 'down', tilt: inCheck ? 0 : 4,
      hL: [-50, -262], hR: [20 + write, -270], holdL: (x, y) => P.notebook(x + 40, y - 14, 0.3, 1, []), t, seed: 5 }), 2);
    if (inCheck) {
      const k = seg(t, W30.check + 0.2, W30.check + 0.7);
      s += `<path d="M190,640 A150,150 0 0 1 470,640" fill="none" stroke="${RED}" stroke-width="7" stroke-dasharray="4 16" stroke-linecap="round" opacity="${k}"/>`;
    }
    const z = inCheck ? kf(t, [[W30.check, 1.28], [W30.check + 2.4, 1.36]]) : kf(lt, [[0, 1.0], [3.6, 1.08]]);
    const cx = inCheck ? 380 : 545, cy = inCheck ? 900 : 1080;
    let ui = '';
    ui += chip('Dr. Munaza Ghani', 90, 230, seg(lt, 0.2, 0.6) * (1 - seg(t, W30.check - 0.2, W30.check)), 'dark', 34);
    W30.goals.forEach(([w, t0], i) => {
      const k = seg(t, t0 - 0.05, t0 + 0.3) * (1 - seg(t, W30.check - 0.2, W30.check));
      ui += chip(`✓ ${w}`, 90 + i * 300, 330, k, i === 2 ? 'red' : 'light', 36);
    });
    if (inCheck) ui += chip('Comfortable range only', 90, 250, seg(t, W30.check + 0.5, W30.check + 0.9), 'accent', 34);
    return { bg: '#FAFAFA', theme: 'light', svg: cam(s, cx, cy, z), ui };
  }
  // the plan: from hunched to an ergonomic desk setup
  function sPlan(t, lt) {
    const k = easeInOut(seg(lt, 0.25, 1.35));
    const d = deskWorld(t, { dark: false, k, typing: lt > 1.3 ? 1 : 0, eyes: k > 0.7 ? 'open' : 'down', mouth: k > 0.7 ? 'smile' : 'neutral', brows: k > 0.7 ? 'relaxed' : null });
    let s = d.s, ui = '';
    const hip = d.hip, J = d.J;
    // guides: eye line to the top of the screen, back on the lumbar support, feet flat
    const eye = [hip[0] + J.eye[0], hip[1] + J.eye[1]];
    const g1 = seg(lt, 1.35, 1.7), g2 = seg(lt, 1.7, 2.05), g3 = seg(lt, 2.05, 2.4);
    if (g1 > 0) s += line([eye, [lerp(eye[0], d.lx + 110, g1), eye[1]]], RED, 5, 'stroke-dasharray="4 14"');
    if (g2 > 0) s += circ(hip[0] - 88, hip[1] - 150, 22 * backOut(g2), RED, 'opacity=".9"');
    if (g3 > 0) s += line([[hip[0] + 200, FLOOR + 4], [lerp(hip[0] + 200, hip[0] + 330, g3), FLOOR + 4]], RED, 8);
    ui += chip('Screen at eye level', 420, 560, g1, 'red', 32);
    ui += chip('Back supported', 90, 1040, g2, 'dark', 32);
    ui += chip('Feet flat', 560, 1530, g3, 'dark', 32);
    const z = kf(lt, [[0, 1.14], [1.4, 1.0], [3.3, 1.03]]);
    return { bg: '#FFFFFF', theme: 'light', svg: cam(s, 545, 1040, z), ui };
  }

  // ---------- word-by-word captions ----------
  function buildWords(N) {
    const chunks = [];
    N.forEach((p, pi) => {
      if (p.scene === 'cta') return;                     // the brand finish shows these words
      const ws = p.text.split(' ');
      const wt = ws.map(w => w.replace(/[^A-Za-z0-9']/g, '').length + 2);
      const tot = wt.reduce((a, b) => a + b, 0), dur = p.end - p.start;
      let acc = p.start;
      const words = ws.map((w, i) => { const a = acc; acc += dur * wt[i] / tot; return { w, a, b: acc }; });
      let cur = [];
      words.forEach((w, i) => {
        cur.push(w);
        const len = cur.map(x => x.w).join(' ').length;
        const endSentence = /[.?!,]$/.test(w.w);
        if (cur.length >= 3 || len >= 15 || endSentence || i === words.length - 1) { chunks.push({ words: cur, a: cur[0].a, pi }); cur = []; }
      });
    });
    chunks.forEach((c, i) => {
      const next = chunks[i + 1];
      const lastB = c.words[c.words.length - 1].b;
      c.b = next ? Math.min(next.a, lastB + 0.5) : lastB + 0.5;
    });
    return chunks;
  }

  G.FILM30 = {
    build() {
      const N = G.NARRATION30;
      const by = id => N.filter(p => p.scene === id);
      const listen = by('listen'), check = by('check')[0];
      // times of "symptoms", "routine", "goals" inside "Your symptoms. Your routine. Your goals."
      const gp = listen[1], gd = gp.end - gp.start;
      const W30 = { check: check.start - 0.15, goals: [['Symptoms', gp.start + gd * 0.08], ['Routine', gp.start + gd * 0.42], ['Goals', gp.start + gd * 0.76]] };
      const T = {
        work: by('work')[0].start - 0.12, read: by('read')[0].start - 0.12, rest: by('rest')[0].start - 0.12,
        pause: by('pause')[0].start - 0.1, fix: by('pause')[1].start - 0.1, story: by('story')[0].start - 0.08,
        listen: listen[0].start - 0.15, plan: by('plan')[0].start - 0.15, cta: by('cta')[0].start - 0.2
      };
      shot(0, T.work, (t, lt) => sHook(t));
      shot(T.work, T.read, (t, lt) => sWork(t, lt));
      shot(T.read, T.rest, (t, lt) => sRead(t, lt));
      shot(T.rest, T.pause, (t, lt) => sRest(t, lt));
      shot(T.pause, T.fix, (t, lt) => sMontage(t, lt));
      shot(T.fix, T.story, (t, lt) => sQuickFix(t, lt));
      shot(T.story, T.listen, (t, lt) => sStory(t, lt));
      shot(T.listen, T.plan, (t, lt) => sSofa(t, lt, W30));
      shot(T.plan, T.cta, (t, lt) => sPlan(t, lt));
      shot(T.cta, 30.0, (t, lt) => S.sBrand(lt, { assembleStart: 0.05, assembleEnd: 1.9, textTop: 860, lines: [
        ['Book your assessment', 0.5, 'font:800 64px/1.1 Inter;color:#FFFFFF'],
        ['Munaza Physio Studio', 1.0, 'font:700 44px/1.2 Inter;color:#FAFAFA'],
        ['Women-only physiotherapy · Lahore', 1.4, 'font:600 34px/1.2 Inter;color:#FAFAFA'],
        ['munazaphysio.studio', 1.8, 'font:800 50px/1 Inter;color:#FFFFFF;background:#E7212B;padding:20px 38px;border-radius:999px']] }));
      const chunks = buildWords(N);
      G.CHUNKS30 = chunks;
      mount({ id: 'munaza-neck-30s', duration: 30, defs: DEFS, captions: (t) => {
        const c = chunks.find(c => t >= c.a - 0.04 && t < c.b);
        if (!c) return '';
        const pop = backOut(seg(t, c.a - 0.04, c.a + 0.1));
        return `<div class="kc" style="transform:scale(${pop.toFixed(3)})">` + c.words.map(w => {
          const on = t >= w.a - 0.02 && t < w.b + 0.02;
          const done = t >= w.b;
          return `<span class="${on ? 'on' : done ? 'said' : ''}">${w.w}</span>`;
        }).join(' ') + '</div>';
      } });
    }
  };
})(window);
