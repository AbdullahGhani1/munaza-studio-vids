/* Side-view (profile) rig and side-view props, for desk, reading and lying-down shots.
   The figure faces +x. Origin is the hip joint (on the seat). Modesty is structural, as in cast.js:
   the hood wraps under the chin and joins the drape, so the neck is never shown; garments are
   opaque, loose and full length; Dr. Munaza (if drawn in profile) always wears a mask and has no mouth. */
(function (G) {
  'use strict';
  const { f, path, circ, ell, rect, line, g, at, ik, clamp, lerp, blink } = G.PAPER;
  const { LOOKS, hand } = G.CAST;
  const rad = d => d * Math.PI / 180;
  // rotate point p by a degrees (clockwise on screen) about o
  const rot = (p, a, o = [0, 0]) => {
    const c = Math.cos(rad(a)), s = Math.sin(rad(a)), x = p[0] - o[0], y = p[1] - o[1];
    return [o[0] + x * c - y * s, o[1] + x * s + y * c];
  };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

  // ---------- head in profile (local: centre of the head, facing +x) ----------
  function headSide(L, o) {
    const doc = o.who === 'munaza';
    const t = o.t || 0;
    const k = clamp((o.blinkOff ? 0 : blink(t, o.seed || 1)) + (o.eyes === 'closed' ? 1 : 0), 0, 1);
    let s = '';
    // hood: covers the head, wraps under the chin and falls into the drape
    s += path('M0,-113 C62,-113 98,-72 100,-18 C102,32 94,74 72,100 L44,126 L-104,124 C-114,64 -116,22 -112,-12 C-108,-74 -62,-113 0,-113 Z', L.hijab);
    s += path('M-40,-96 C-82,-80 -104,-40 -104,10', 'none', `stroke="${L.hijabDk}" stroke-width="5" stroke-linecap="round" opacity=".7"`);
    // face (forehead, brow, nose, lips, chin)
    s += path('M30,-76 C52,-74 62,-58 64,-36 L66,-20 C70,-10 80,-2 82,6 C83,12 76,14 68,15 C70,22 70,26 67,29 C70,33 70,38 66,42 C66,52 60,62 46,66 C32,68 18,60 12,46 C6,20 6,-20 12,-50 C16,-68 22,-76 30,-76 Z', L.skin);
    s += ell(36, 16, 11, 6, '#B3634C', 'opacity=".25"');
    // eye
    const mood = o.eyes || 'open';
    let h = mood === 'wince' ? 1.6 : mood === 'down' ? 3.2 : mood === 'soft' ? 4 : 6;
    h *= 1 - k;
    const ex = 48, ey = -16 + (mood === 'down' ? 2 : 0);
    if (mood === 'wince' && k < 0.5) {
      s += `<path d="M${ex - 9},${ey - 3} L${ex + 5},${ey + 1} L${ex - 7},${ey + 4}" fill="none" stroke="#1B120E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else if (h < 0.8) {
      s += `<path d="M${ex - 9},${ey} Q${ex},${ey + 4} ${ex + 8},${ey}" fill="none" stroke="#1B120E" stroke-width="3" stroke-linecap="round"/>`;
    } else {
      s += `<path d="M${ex - 9},${ey} Q${ex - 1},${f(ey - h * 1.4)} ${ex + 8},${ey + 1} Q${ex},${f(ey + h * 0.6)} ${ex - 9},${ey} Z" fill="#1B120E"/>`;
      const lk = mood === 'down' ? 2 : 0;
      s += circ(ex + 1, ey - h * 0.3 + lk, 1.5, '#FFFFFF', 'opacity=".85"');
      s += `<path d="M${ex - 10},${ey - 1} Q${ex - 1},${f(ey - h * 1.55 - 1)} ${ex + 10},${ey}" fill="none" stroke="#120B08" stroke-width="2.6" stroke-linecap="round"/>`;
    }
    // brow (the inner end is toward the nose, +x)
    const worried = mood === 'wince' || o.brows === 'worried';
    const bi = worried ? -8 : o.brows === 'raised' ? -5 : 0;
    s += `<path d="M${ex - 14},${ey - 16} Q${ex - 2},${ey - 22 + bi / 2} ${ex + 12},${ey - 16 + bi}" fill="none" stroke="#2A1912" stroke-width="4.4" stroke-linecap="round"/>`;
    if (doc) {
      // medical mask over nose and mouth, under the chin; strap runs back under the hood
      s += path('M24,-6 C44,-10 70,-8 86,6 C90,22 84,40 74,52 C64,66 50,74 34,72 C22,66 16,50 16,30 Z', L.mask, `stroke="${L.maskDk}" stroke-width="2.5"`);
      s += `<path d="M24,18 Q52,12 84,20 M22,34 Q52,28 80,38 M24,50 Q50,46 72,56" fill="none" stroke="${L.maskDk}" stroke-width="2" opacity=".8"/>`;
    } else {
      const m = o.mouth || 'neutral';
      if (m === 'talk') s += ell(62, 35, 5, 1.5 + (o.talk || 0) * 4.5, '#5A2A24');
      else if (m === 'smile') s += `<path d="M55,31 Q60,37 67,32" fill="none" stroke="${L.lip}" stroke-width="3.4" stroke-linecap="round"/>`;
      else if (m === 'tight') s += `<path d="M54,37 L67,33" stroke="${L.lip}" stroke-width="3.6" stroke-linecap="round"/>`;
      else s += `<path d="M57,34 L67,33" stroke="${L.lip}" stroke-width="3.2" stroke-linecap="round"/>`;
    }
    // hood rim frames the face (drawn over the back edge of the face)
    s += `<path d="M70,-56 C60,-90 18,-94 8,-60 C0,-22 2,28 14,56 C26,78 52,82 74,70" fill="none" stroke="${L.hijab}" stroke-width="16" stroke-linecap="round"/>`;
    s += `<path d="M66,-50 C56,-80 22,-82 14,-56 C8,-22 10,26 20,50 C30,68 50,72 68,64" fill="none" stroke="${L.hijabDk}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
    return s;
  }

  // ---------- figure ----------
  // o: { who, x, y, s, pose: 'sit'|'lie', lean, neck, hN, hF (near/far hand targets, hip-local),
  //      eyes, brows, mouth, talk, t, seed, rim, knee: [x,y], ankle: [x,y], holdN, holdF }
  function side(o) {
    const who = o.who || 'ayesha', L = LOOKS[who], doc = who === 'munaza';
    const lie = o.pose === 'lie';
    const lean = o.lean || 0, neck = o.neck || 0;
    const rim = o.rim ? `stroke="#5A5A5A" stroke-width="4"` : '';
    const cloth = doc ? L.coat : L.cloth, clothDk = doc ? L.coatDk : L.clothDk, clothLt = doc ? L.coatDk : L.clothLt;
    const sleeve = doc ? L.coat : L.sleeve, sleeveEdge = doc ? L.coatDk : (o.rim ? '#5A5A5A' : L.clothDk);
    const R = p => rot(p, lean);                    // torso-local -> hip-local
    const shoulder = R([4, -286]);
    const neckBase = R([14, -326]);
    const headC = add(neckBase, rot([12, -118], lean + neck));
    let s = '';

    // far arm (behind the body)
    const farT = o.hF || R([60, -120]);
    const fa = ik(shoulder[0] - 10, shoulder[1] + 4, farT[0], farT[1], 150, 142, o.bendF || 1);
    s += line([[shoulder[0] - 10, shoulder[1] + 4], [fa.ex, fa.ey], [fa.hx, fa.hy]], doc ? L.coatDk : L.clothDk, 50);
    s += g(ell(0, 0, 19, 22, L.skinDk), at(fa.hx, fa.hy));
    if (o.holdF) s += o.holdF(fa.hx, fa.hy);

    // legs / lower garment (stays on the seat, not rotated by lean)
    if (!lie) {
      const kn = o.knee || [236, -12], an = o.ankle || [252, 226];
      if (!o.hideLegs) {
        s += ell(an[0] + 22, an[1] + 12, 42, 13, L.shoe || '#2B2B2B');
        s += path(`M-86,26 C-74,-40 0,-50 60,-48 C${f(kn[0] - 80)},${f(kn[1] - 40)} ${f(kn[0] - 10)},${f(kn[1] - 48)} ${f(kn[0] + 26)},${f(kn[1] - 30)} C${f(kn[0] + 50)},${f(kn[1] + 20)} ${f(an[0] + 30)},${f(an[1] - 90)} ${f(an[0] + 34)},${f(an[1] - 2)} L${f(an[0] - 64)},${f(an[1] + 2)} C${f(an[0] - 60)},${f(an[1] - 80)} ${f(kn[0] - 44)},${f(kn[1] + 110)} ${f(kn[0] - 52)},${f(kn[1] + 56)} L-60,50 Z`, doc ? L.navyDk : cloth, rim);
        s += `<path d="M20,-40 C${f(kn[0] - 60)},${f(kn[1] - 34)} ${f(kn[0] - 20)},${f(kn[1] - 36)} ${f(kn[0] + 8)},${f(kn[1] - 22)}" fill="none" stroke="${clothLt}" stroke-width="4" opacity=".7"/>`;
      }
    } else {
      s += ell(22, 456, 38, 14, L.shoe || '#2B2B2B');   // toes point up once the figure is laid down
      s += path('M-86,20 C-90,150 -84,300 -74,448 L72,448 C80,300 78,150 70,8 Z', cloth, rim);
      s += `<path d="M-10,40 C-14,180 -10,320 -4,440" fill="none" stroke="${clothLt}" stroke-width="4" opacity=".7"/>`;
    }

    // torso garment
    const torso = doc
      ? path('M-88,24 C-96,-80 -94,-200 -74,-302 L60,-306 C82,-220 88,-120 74,14 Z', L.coat, `stroke="${L.coatDk}" stroke-width="2.5"`) + rect(40, -290, 30, 280, L.navy)
      : path('M-88,24 C-96,-80 -94,-200 -74,-302 L60,-306 C82,-220 88,-120 74,14 Z', cloth, rim);
    s += g(torso, `rotate(${f(lean)})`);
    // drape (lower hijab over shoulders, chest and upper back)
    const drape = path('M-78,-338 C-104,-300 -110,-230 -100,-178 C-64,-150 34,-140 84,-170 C98,-226 92,-296 66,-344 Z', L.hijab, rim) +
      `<path d="M-84,-246 C-60,-214 -30,-198 0,-192 M40,-300 C62,-260 72,-222 74,-184" fill="none" stroke="${L.hijabDk}" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
    s += g(drape, `rotate(${f(lean)})`);
    // neck wrap joins drape and hood, so a head tilt never opens a gap
    s += ell(neckBase[0] + 4, neckBase[1] - 8, 70, 62, L.hijab, `transform="rotate(${f(lean + neck * 0.5)} ${f(neckBase[0] + 4)} ${f(neckBase[1] - 8)})"`);
    // head
    s += g(headSide(L, Object.assign({}, o, { who })), `translate(${f(headC[0])} ${f(headC[1])}) rotate(${f(lean + neck)})`);

    // near arm (over the drape)
    const nearT = o.hN || R([90, -110]);
    const na = ik(shoulder[0], shoulder[1], nearT[0], nearT[1], 150, 142, o.bendN || 1);
    s += line([[shoulder[0], shoulder[1]], [na.ex, na.ey], [na.hx, na.hy]], sleeveEdge, 56) + line([[shoulder[0], shoulder[1]], [na.ex, na.ey], [na.hx, na.hy]], sleeve, 49);
    const ang = Math.atan2(na.hy - na.ey, na.hx - na.ex) * 180 / Math.PI - 90;
    s += hand(na.hx, na.hy, L, ang);
    if (o.holdN) s += o.holdN(na.hx, na.hy);

    let tr = at(o.x || 0, o.y || 0, o.s || 1);
    if (lie) tr += ' rotate(-90)';
    if (o.flip) tr += ' scale(-1 1)';
    return g(s, tr);
  }

  // ---------- side-view props (floor-anchored at y) ----------
  const SP = {};
  // ergonomic office chair: seat top at y - 250*s, lumbar support, adjustable arm, 5-star base on casters
  SP.chair = (x, y, s = 1, c = {}) => {
    const col = c.col || '#3A3A3A', dk = c.dk || '#262626', lt = c.lt || '#4C4C4C', metal = c.metal || '#7A7A7A';
    let k = '';
    k += line([[0, -120], [-150, -34]], metal, 16) + line([[0, -120], [150, -34]], metal, 16) + line([[0, -120], [0, -34]], metal, 16);
    k += circ(-150, -18, 17, dk) + circ(150, -18, 17, dk) + circ(0, -18, 17, dk);
    k += rect(-13, -250, 26, 140, metal, 6) + rect(-20, -150, 40, 40, dk, 8);
    k += rect(-60, -268, 120, 22, dk, 8);
    // backrest with a forward lumbar curve
    k += path('M-140,-262 C-120,-300 -96,-360 -100,-420 C-104,-500 -124,-600 -110,-700 C-104,-730 -76,-736 -66,-706 C-76,-610 -64,-520 -64,-440 C-64,-370 -84,-310 -96,-262 Z', col);
    k += path('M-104,-262 L-124,-262 L-126,-290 L-106,-300 Z', dk);
    k += `<path d="M-88,-330 C-72,-380 -70,-430 -76,-470" fill="none" stroke="${lt}" stroke-width="6" stroke-linecap="round"/>`;
    // seat cushion
    k += rect(-128, -292, 250, 44, col, 20) + rect(-120, -288, 234, 10, lt, 6, 'opacity=".6"');
    // armrest
    k += rect(-30, -370, 18, 90, metal, 5) + rect(-86, -386, 150, 22, dk, 11);
    return g(k, at(x, y, s));
  };
  SP.desk = (x, y, w, top = 410, c = {}) => {
    const col = c.col || '#3A2E28', tp = c.top || '#4A3B33';
    return g(rect(w - 90, -top, 20, top, col, 0, 'opacity=".55"') + rect(0, -top - 24, w, 26, tp, 6) + rect(w - 50, -top, 24, top, col), at(x, y));
  };
  // laptop in profile: base on the desk at (x, y); hinge at the far end (+x); screen faces -x (toward the user)
  SP.laptop = (x, y, s = 1, o = {}) => {
    const glow = o.glow == null ? 1 : o.glow, open = o.open == null ? 104 : o.open, dark = !!o.dark;
    let k = '';
    const hinge = [132, -16], top = rot([0, -236], -(open - 90), [0, 0]);
    const tx = hinge[0] + top[0], ty = hinge[1] + top[1];
    if (glow > 0 && dark) {
      // light from the screen falls toward the user's face
      k += `<path d="M${f(hinge[0] - 8)},${f(hinge[1] - 10)} L${f(tx - 8)},${f(ty)} L${f(tx - 420)},${f(ty - 90)} L${f(hinge[0] - 420)},${f(hinge[1] + 40)} Z" fill="url(#screenGlow)" opacity="${f(0.8 * glow)}"/>`;
    }
    k += rect(-150, -16, 290, 16, '#A8A8A8', 5) + rect(-126, -20, 200, 5, '#8A8A8A', 2);
    // lid: back (grey) with the lit screen edge on the user's side
    k += `<polygon points="${f(hinge[0] - 4)},${f(hinge[1])} ${f(hinge[0] + 12)},${f(hinge[1])} ${f(tx + 12)},${f(ty)} ${f(tx - 4)},${f(ty)}" fill="#BDBDBD"/>`;
    k += line([[hinge[0] - 6, hinge[1] - 4], [tx - 6, ty + 6]], glow > 0 ? '#FFF3F3' : '#2A2A2A', 6);
    return g(k, at(x, y, s));
  };
  // laptop stand (raises the screen to eye level) and a separate keyboard
  SP.stand = (x, y, h, w = 220) => h < 2 ? '' : g(
    line([[-w * 0.3, 0], [w * 0.3, -h + 8]], '#8A8A8A', 12) + line([[w * 0.3, 0], [-w * 0.3, -h + 8]], '#9C9C9C', 12) +
    rect(-w * 0.4, -6, w * 0.8, 8, '#8A8A8A', 3) + rect(-w / 2, -h, w, 12, '#A8A8A8', 4), at(x, y));
  SP.keyboard = (x, y, s = 1) => g(rect(-90, -14, 180, 14, '#2E2E2E', 4) + rect(-84, -18, 168, 6, '#4A4A4A', 3), at(x, y, s));
  SP.mouse = (x, y, s = 1) => g(ell(0, -8, 22, 10, '#2E2E2E'), at(x, y, s));
  SP.armchair = (x, y, s = 1, c = {}) => {
    const col = c.col || '#6E625A', dk = c.dk || '#5A4F48', lt = c.lt || '#82766D';
    return g(
      path('M-150,-250 C-190,-420 -180,-600 -150,-660 C-126,-690 -96,-680 -96,-640 C-100,-540 -96,-380 -60,-250 Z', col) +
      rect(-150, -290, 330, 150, col, 30) + rect(-130, -300, 300, 40, lt, 18) +
      rect(-70, -400, 250, 44, dk, 22) + rect(140, -400, 44, 250, dk, 18) +
      rect(-140, -150, 20, 150, dk) + rect(150, -150, 20, 150, dk), at(x, y, s));
  };
  SP.bookshelf = (x, y, w, h, c = {}) => {
    const col = c.col || '#8B7B70', dk = c.dk || '#6E6058', book = c.books || ['#7A6A60', '#9C8B80', '#5E524B', '#A89A90'];
    let k = rect(0, 0, w, h, col, 6) + rect(12, 12, w - 24, h - 24, dk, 4);
    const rows = Math.max(2, Math.round(h / 180));
    for (let r = 0; r < rows; r++) {
      const y0 = 12 + (r + 1) * (h - 24) / rows;
      k += rect(12, y0 - 10, w - 24, 12, col);
      let xx = 26, i = 0;
      while (xx < w - 60) {
        const bw = 18 + ((r * 7 + i * 13) % 4) * 6, bh = (h - 24) / rows - 40 - ((r + i * 5) % 3) * 14;
        const lean = (i + r) % 7 === 3 ? 10 : 0;
        k += g(rect(0, -bh, bw, bh, book[(i + r) % book.length], 2), `translate(${xx} ${f(y0 - 10)}) rotate(${lean})`);
        xx += bw + 6 + (lean ? 10 : 0); i++;
        if (i % 6 === 5) xx += 40;
      }
    }
    return g(k, at(x, y));
  };
  // bed in profile: mattress top at y - top; headboard at the left
  SP.bed = (x, y, w, top = 330, c = {}) => {
    const dark = c.dark !== false;
    const frame = dark ? '#2E2626' : '#D8CCC4', matt = dark ? '#D9D2CC' : '#FFFFFF', sheet = dark ? '#C7BFB9' : '#F4EEEA', head = dark ? '#3A2F2F' : '#CDBFB5';
    return g(rect(-40, -top - 260, 44, top + 260, head, 12) + rect(0, -top + 60, w, top - 80, frame, 10) + rect(0, -top, w, 80, matt, 26) + rect(0, -top + 40, w, 40, sheet, 10) +
      rect(10, -30, 24, 30, head) + rect(w - 34, -30, 24, 30, head), at(x, y));
  };
  SP.pillow = (x, y, w = 230, h = 70, col = '#FFFFFF') => g(rect(-w / 2, -h, w, h, col, h / 2, 'stroke="#D8D0CA" stroke-width="3"'), at(x, y));
  // open book held at (x, y), tilted by rot degrees
  SP.book = (x, y, s = 1, r = 0) => g(
    `<path d="M0,0 L-70,-18 L-74,-104 L0,-86 Z" fill="#FFFFFF" stroke="#D6CCC4" stroke-width="2"/>` +
    `<path d="M0,0 L70,-18 L74,-104 L0,-86 Z" fill="#FAFAFA" stroke="#D6CCC4" stroke-width="2"/>` +
    `<path d="M-78,-10 L0,8 L78,-10 L74,-18 L0,0 L-74,-18 Z" fill="#C80710"/>` +
    [0, 1, 2, 3].map(i => `<path d="M-60,${-36 - i * 14} L-12,${-24 - i * 14} M12,${-24 - i * 14} L60,${-36 - i * 14}" stroke="#CFC6BF" stroke-width="3"/>`).join(''),
    at(x, y, s, r));

  // key points of the figure in hip-local coordinates (for hand targets and overlays)
  function joints(lean = 0, neck = 0) {
    const R = p => rot(p, lean);
    const neckBase = R([14, -326]);
    const headC = add(neckBase, rot([12, -118], lean + neck));
    return { shoulder: R([4, -286]), neckBase, headC, eye: add(headC, rot([48, -16], lean + neck)), neckPt: R([-2, -334]) };
  }

  G.SIDE = { side, headSide, SP, rot, joints };
})(window);
