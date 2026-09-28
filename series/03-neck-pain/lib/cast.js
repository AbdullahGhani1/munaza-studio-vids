/* Characters and props, drawn as layered paper-cut SVG.
   Modesty rules are structural: hijabs always cover hair, neck and chest; garments are opaque,
   loose and full length; Dr. Munaza's mask always covers nose and mouth and no mouth is ever drawn for her. */
(function (G) {
  'use strict';
  const { f, path, circ, ell, rect, line, g, at, ik, clamp, lerp, blink } = G.PAPER;

  const LOOKS = {
    ayesha: { skin: '#C68A63', skinDk: '#A56C49', hijab: '#9C1520', hijabDk: '#6E0C13', hijabLt: '#B42029',
      cloth: '#171717', clothLt: '#2A2A2A', clothDk: '#0A0A0A', shoe: '#2B2B2B', lip: '#8C4A3C', sleeve: '#1E1E1E' },
    munaza: { skin: '#D09A76', skinDk: '#AE7A58', hijab: '#1D2750', hijabDk: '#111834', hijabLt: '#2A3767',
      coat: '#F6F6F4', coatDk: '#D3D3D0', navy: '#1F2B57', navyDk: '#151E3F', shoe: '#F4F4F4', mask: '#DCEAF1', maskDk: '#AFC6D3' },
    mother: { skin: '#B97E5B', skinDk: '#94613F', hijab: '#CBB9A2', hijabDk: '#A48F77', hijabLt: '#DCCDB9',
      cloth: '#4A3E39', clothLt: '#5C4F49', clothDk: '#362D29', shoe: '#3A3230', lip: '#7E4638', sleeve: '#51453F' }
  };

  // ---------- face ----------
  function face(L, o, fx, fy) {
    const t = o.t || 0, turn = o.turn || 0;
    const k = clamp((o.blinkOff ? 0 : blink(t, o.seed || 1)) + (o.eyes === 'closed' ? 1 : 0), 0, 1);
    const lx = (o.look ? o.look[0] : 0) * 3, ly = (o.look ? o.look[1] : 0) * 2.5;
    const ex = fx + turn * 12;
    let out = '';
    // cheeks
    out += ell(ex - 30, fy + 16, 11, 6, '#B3634C', 'opacity=".22"') + ell(ex + 30, fy + 16, 11, 6, '#B3634C', 'opacity=".22"');
    const eyeY = fy - 10;
    const mood = o.eyes || 'open';
    [-1, 1].forEach(side => {
      const x = ex + side * 23, w = 11 * (1 - side * turn * 0.22);
      let h = mood === 'wince' ? 3.2 : mood === 'down' ? 4.2 : mood === 'soft' ? 5 : 6.8;
      h *= 1 - k;
      if (h < 0.8) {
        out += `<path d="M${f(x - w)},${f(eyeY)} Q${f(x)},${f(eyeY + 4)} ${f(x + w)},${f(eyeY)}" fill="none" stroke="#1B120E" stroke-width="3.2" stroke-linecap="round"/>`;
      } else {
        const lowUp = mood === 'soft' ? -3 : 0;
        out += `<path d="M${f(x - w)},${f(eyeY)} Q${f(x)},${f(eyeY - h * 1.6)} ${f(x + w)},${f(eyeY)} Q${f(x)},${f(eyeY + h * 0.9 + lowUp)} ${f(x - w)},${f(eyeY)} Z" fill="#1B120E"/>`;
        out += circ(x + lx + 2.5, eyeY - h * 0.35 + ly, 1.8, '#FFFFFF', 'opacity=".85"');
        out += `<path d="M${f(x - w - 2)},${f(eyeY - 1)} Q${f(x)},${f(eyeY - h * 1.75 - 1)} ${f(x + w + 1)},${f(eyeY - 1)}" fill="none" stroke="#120B08" stroke-width="2.6" stroke-linecap="round"/>`;
      }
      // brows
      const bY = eyeY - 20;
      const inner = mood === 'wince' || o.brows === 'worried' ? -7 : o.brows === 'raised' ? -5 : 0;
      const outer = o.brows === 'worried' ? 3 : o.brows === 'raised' ? -4 : 0;
      const ix = x - side * 11, ox = x + side * 14;
      out += `<path d="M${f(ix)},${f(bY + inner)} Q${f(x)},${f(bY - 5 + (inner + outer) / 2)} ${f(ox)},${f(bY + outer + 1)}" fill="none" stroke="#2A1912" stroke-width="4.6" stroke-linecap="round"/>`;
    });
    if (o.mask) {
      // medical mask: covers the nose bridge down under the chin
      const mx = fx + turn * 8, top = fy + 1;
      out += `<path d="M${f(mx - 56)},${f(top + 4)} Q${f(mx)},${f(top - 10)} ${f(mx + 56)},${f(top + 4)} L${f(mx + 50)},${f(top + 52)} Q${f(mx)},${f(top + 74)} ${f(mx - 50)},${f(top + 52)} Z" fill="${L.mask}" stroke="${L.maskDk}" stroke-width="2.5"/>`;
      for (let i = 0; i < 3; i++) out += `<path d="M${f(mx - 44)},${f(top + 18 + i * 12)} Q${f(mx)},${f(top + 12 + i * 12)} ${f(mx + 44)},${f(top + 18 + i * 12)}" fill="none" stroke="${L.maskDk}" stroke-width="2" opacity=".8"/>`;
      out += `<path d="M${f(mx - 24)},${f(top)} Q${f(mx)},${f(top - 6)} ${f(mx + 24)},${f(top)}" fill="none" stroke="#9FB6C3" stroke-width="3" stroke-linecap="round"/>`;
    } else {
      // nose + mouth
      const nx = ex + turn * 6;
      out += `<path d="M${f(nx - 3)},${f(fy + 8)} Q${f(nx + 6 + turn * 3)},${f(fy + 20)} ${f(nx + 1)},${f(fy + 23)}" fill="none" stroke="${L.skinDk}" stroke-width="3" stroke-linecap="round"/>`;
      const my = fy + 38, mx = ex + turn * 5, m = o.mouth || 'neutral';
      if (m === 'talk') out += ell(mx, my, 8, 2 + (o.talk || 0) * 5, '#5A2A24');
      else if (m === 'smile') out += `<path d="M${f(mx - 12)},${f(my - 2)} Q${f(mx)},${f(my + 8)} ${f(mx + 12)},${f(my - 2)}" fill="none" stroke="${L.lip}" stroke-width="3.6" stroke-linecap="round"/>`;
      else if (m === 'tight') out += `<path d="M${f(mx - 9)},${f(my + 1)} L${f(mx + 9)},${f(my)}" stroke="${L.lip}" stroke-width="3.6" stroke-linecap="round"/>`;
      else out += `<path d="M${f(mx - 10)},${f(my)} Q${f(mx)},${f(my + 3)} ${f(mx + 10)},${f(my)}" fill="none" stroke="${L.lip}" stroke-width="3.6" stroke-linecap="round"/>`;
    }
    return out;
  }

  // ---------- hands & arms ----------
  function hand(x, y, L, ang = 0) {
    return g(ell(0, 0, 21, 25, L.skin, `stroke="${L.skinDk}" stroke-width="2"`) + ell(-14, -6, 8, 13, L.skin, `stroke="${L.skinDk}" stroke-width="2" transform="rotate(-25 -14 -6)"`), at(x, y, 1, ang));
  }

  // ---------- person ----------
  // o: { who, x, y, s, pose: 'stand'|'sit', turn, tilt, lean, eyes, brows, mouth, talk, look,
  //      hL, hR (hand targets in local coords), t, seed, flip, hideLegs }
  function person(o) {
    const who = o.who || 'ayesha', L = LOOKS[who], doc = who === 'munaza';
    const sit = o.pose === 'sit', up = sit ? 190 : 0, turn = o.turn || 0;
    const Y = v => v + up;
    const rim = o.rim ? 'stroke="#5A5A5A" stroke-width="4"' : '';
    let back = '', mid = '', front = '';
    // lower body
    if (!o.hideLegs) {
      if (doc) {
        if (!sit) {
          back += path('M-150,-300 L150,-300 L146,-250 L-146,-250 Z', L.navy);
          back += path('M-102,-258 L-98,-26 L-14,-26 L-8,-258 Z', L.navyDk) + path('M102,-258 L98,-26 L14,-26 L8,-258 Z', L.navyDk);
          back += ell(-58, -16, 46, 16, L.shoe, `stroke="#CFCFCF" stroke-width="2"`) + ell(58, -16, 46, 16, L.shoe, `stroke="#CFCFCF" stroke-width="2"`);
        } else {
          back += path('M-150,-200 L-128,-26 L-26,-26 L-12,-200 Z', L.navyDk) + path('M150,-200 L128,-26 L26,-26 L12,-200 Z', L.navyDk);
          back += ell(-80, -16, 46, 16, L.shoe, `stroke="#CFCFCF" stroke-width="2"`) + ell(80, -16, 46, 16, L.shoe, `stroke="#CFCFCF" stroke-width="2"`);
        }
      } else {
        const shoeY = -12;
        if (!sit) {
          back += path('M-116,-700 C-148,-600 -165,-320 -192,-42 Q0,-16 192,-42 C165,-320 148,-600 116,-700 Z', L.cloth, rim);
          back += `<path d="M-60,-520 C-72,-380 -84,-220 -96,-52 M58,-500 C70,-360 80,-200 92,-50" fill="none" stroke="${L.clothLt}" stroke-width="4" opacity=".8"/>`;
          back += ell(-44, shoeY, 40, 14, L.shoe) + ell(44, shoeY, 40, 14, L.shoe);
        } else {
          back += ell(-76, shoeY, 40, 14, L.shoe) + ell(76, shoeY, 40, 14, L.shoe);
          back += path('M-135,-268 C-172,-238 -186,-212 -180,-188 L-150,-30 Q0,-12 150,-30 L180,-188 C186,-212 172,-238 135,-268 Z', L.cloth, rim);
          back += `<path d="M-168,-196 Q0,-170 168,-196" fill="none" stroke="${L.clothLt}" stroke-width="4"/>`;
        }
      }
    }
    // torso
    if (doc) {
      if (!sit) {
        mid += path('M-120,-704 C-140,-600 -150,-450 -170,-292 L170,-292 C150,-450 140,-600 120,-704 Z', L.coat, `stroke="${L.coatDk}" stroke-width="2.5"`);
        mid += rect(-34, -660, 68, 380, L.navy);
      } else {
        mid += path(`M-120,${Y(-704)} C-140,${Y(-600)} -146,${Y(-470)} -150,${Y(-400)} L-190,-196 Q0,-176 190,-196 L150,${Y(-400)} C146,${Y(-470)} 140,${Y(-600)} 120,${Y(-704)} Z`, L.coat, `stroke="${L.coatDk}" stroke-width="2.5"`);
        mid += rect(-34, Y(-660), 68, 460 - up + 8, L.navy);
      }
      mid += path(`M-62,${Y(-700)} L-8,${Y(-596)} L-38,${Y(-548)} Z`, '#FFFFFF', `stroke="${L.coatDk}" stroke-width="2"`) + path(`M62,${Y(-700)} L8,${Y(-596)} L38,${Y(-548)} Z`, '#FFFFFF', `stroke="${L.coatDk}" stroke-width="2"`);
      mid += rect(60, Y(-650), 7, 42, '#E7212B', 2) + rect(52, Y(-612), 50, 4, L.coatDk, 2);
      if (!sit) mid += rect(-140, -470, 58, 52, 'none', 6, `stroke="${L.coatDk}" stroke-width="2.5"`) + rect(82, -470, 58, 52, 'none', 6, `stroke="${L.coatDk}" stroke-width="2.5"`);
    } else if (sit) {
      mid += path(`M-116,${Y(-700)} C-146,${Y(-620)} -150,${Y(-520)} -140,${Y(-450)} L140,${Y(-450)} C150,${Y(-520)} 146,${Y(-620)} 116,${Y(-700)} Z`, L.cloth, rim);
    }
    // arms (IK). Shoulders sit under the hijab drape.
    const sh = [[-112, Y(-688)], [112, Y(-688)]];
    const rest = sit ? [[-72, -226], [72, -226]] : [[-128, -282], [128, -282]];
    const targets = [o.hL || rest[0], o.hR || rest[1]];
    const sleeve = doc ? L.coat : L.sleeve, sleeveEdge = doc ? L.coatDk : (o.rim ? '#5A5A5A' : L.clothDk);
    const arms = targets.map((tg, i) => {
      // front view: arms reaching toward the camera are foreshortened, so elbows stay close to the body
      const d = Math.hypot(tg[0] - sh[i][0], tg[1] - sh[i][1]);
      const ff = clamp(d / 430 * 1.25, 0.5, 1);
      return ik(sh[i][0], sh[i][1], tg[0], tg[1], 222 * ff, 208 * ff, i === 0 ? 1 : -1);
    });
    arms.forEach((a, i) => {
      mid += line([sh[i], [a.ex, a.ey]], sleeveEdge, 62) + line([sh[i], [a.ex, a.ey]], sleeve, 55);
    });
    // hijab drape + head
    const hx = turn * 6;
    const head = [];
    head.push(path(`M${hx},${-1002} C${hx + 72},${-1002} ${hx + 112},${-952} ${hx + 112},${-880} C${hx + 112},${-826} ${hx + 104},${-800} ${hx + 98},${-786} L${hx - 98},${-786} C${hx - 104},${-800} ${hx - 112},${-826} ${hx - 112},${-880} C${hx - 112},${-952} ${hx - 72},${-1002} ${hx},${-1002} Z`, L.hijab));
    head.push(ell(hx * 1.4, -872, 64, 79, L.hijabDk));
    head.push(ell(hx * 1.6, -870, 56, 70, L.skin));
    head.push(face(L, Object.assign({}, o, { mask: doc }), hx * 1.6, -870));
    head.push(`<path d="M${hx - 60},-948 Q${hx},-986 ${hx + 60},-948" fill="none" stroke="${L.hijabLt}" stroke-width="5" opacity=".7"/>`);
    const drape = path('M-100,-800 C-136,-770 -160,-735 -156,-690 C-150,-640 -142,-592 -112,-546 Q0,-516 112,-546 C142,-592 150,-640 156,-690 C160,-735 136,-770 100,-800 Z', L.hijab, rim)
      + `<path d="M-72,-792 Q0,-736 72,-792 M-128,-660 Q-84,-606 -58,-560 M128,-660 Q84,-606 58,-560" fill="none" stroke="${L.hijabDk}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
    const tilt = o.tilt || 0;
    mid += g(drape, `translate(0 ${up})`);
    mid += g(g(head.join(''), `rotate(${f(tilt)} 0 -790)`), `translate(0 ${up})`);
    // forearms + hands over the drape (so a hand can rest on the shoulder over the hijab)
    arms.forEach((a, i) => {
      front += line([[a.ex, a.ey], [a.hx, a.hy]], sleeveEdge, 58) + line([[a.ex, a.ey], [a.hx, a.hy]], sleeve, 51);
      const ang = Math.atan2(a.hy - a.ey, a.hx - a.ex) * 180 / Math.PI - 90;
      front += hand(a.hx, a.hy, L, ang);
    });
    if (o.holdL) front += o.holdL(targets[0][0], targets[0][1]);
    if (o.holdR) front += o.holdR(targets[1][0], targets[1][1]);
    const lean = o.lean || 0;
    const body = g(back + g(mid + front, `rotate(${f(lean)} 0 ${sit ? -200 : -300})`));
    return g(body, at(o.x || 0, o.y || 0, o.s || 1) + (o.flip ? ' scale(-1 1)' : ''));
  }

  // ---------- props ----------
  const P = {};
  P.pauseTab = (x, y, k = 1, s = 1, rot = -6) => {
    if (k <= 0) return '';
    const sc = s * G.PAPER.backOut(clamp(k)), r = rot * (1 - clamp(k)) * 2 + rot;
    return g(`<g filter="url(#ps2)">${rect(-46, -58, 92, 116, '#E7212B', 14)}${path('M-46,40 L46,40 L46,44 Q46,58 32,58 L-32,58 Q-46,58 -46,44 Z', '#C80710')}${rect(-22, -30, 14, 52, '#FFFFFF', 4)}${rect(8, -30, 14, 52, '#FFFFFF', 4)}</g>`, at(x, y, sc, r));
  };
  P.laptop = (x, y, s = 1, glow = 1, raised = 0) => g(
    (raised ? rect(-150, -40 - raised, 300, raised, '#8E2B2B', 4) + rect(-150, -40 - raised * 0.5, 300, 4, '#6B1E1E') : '') +
    rect(-190, -20 - raised, 380, 24, '#9A9A9A', 6) + rect(-160, -250 - raised, 320, 230, '#BDBDBD', 10) +
    rect(-146, -236 - raised, 292, 202, glow > 0 ? '#FFF3F3' : '#2A2A2A', 4, `opacity="${0.35 + 0.65 * glow}"`) +
    rect(-120, -200 - raised, 150, 10, '#E7212B', 3, 'opacity=".6"') + rect(-120, -176 - raised, 220, 8, '#474747', 3, 'opacity=".35"') + rect(-120, -158 - raised, 190, 8, '#474747', 3, 'opacity=".35"'),
    at(x, y, s));
  P.book = (x, y, s = 1, rot = 0) => g(rect(-78, -54, 156, 108, '#C80710', 8) + rect(-70, -48, 68, 96, '#FAFAFA', 3) + rect(2, -48, 68, 96, '#FFFFFF', 3) + line([[0, -50], [0, 50]], '#B01018', 4), at(x, y, s, rot));
  P.cup = (x, y, s = 1, steam = 0, t = 0) => g(
    path('M-30,-40 L30,-40 L24,6 Q0,16 -24,6 Z', '#FAFAFA', 'stroke="#D8D0CA" stroke-width="2"') + `<path d="M28,-30 Q48,-24 26,-6" fill="none" stroke="#D8D0CA" stroke-width="6"/>` + ell(0, 14, 44, 8, '#E9E1DA') +
    (steam ? `<path d="M-8,-52 C-18,-70 4,-80 -6,-100 M10,-52 C0,-70 22,-82 12,-102" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="${0.25 * steam}" transform="translate(0 ${f(-(t * 8) % 10)})"/>` : ''),
    at(x, y, s));
  P.lamp = (x, y, s = 1, on = 1) => g((on ? ell(0, -330, 260, 260, '#FFF3F3', `opacity="${0.07 * on}"`) + ell(0, -330, 150, 150, '#FFF3F3', `opacity="${0.08 * on}"`) : '') +
    rect(-6, -300, 12, 300, '#3A3A3A') + path('M-70,-300 L70,-300 L46,-400 L-46,-400 Z', on ? '#EDE3DA' : '#555') + ell(0, -4, 60, 10, '#2A2A2A'), at(x, y, s));
  P.windowNight = (x, y, w, h, moon = 1) => g(rect(0, 0, w, h, '#141414', 6) + rect(10, 10, w - 20, h - 20, '#1C1C1C', 4) + (moon ? circ(w * 0.7, h * 0.3, 34, '#FFF3F3', 'opacity=".9"') + circ(w * 0.7 + 14, h * 0.3 - 8, 30, '#1C1C1C') : '') +
    line([[w / 2, 10], [w / 2, h - 10]], '#141414', 10) + line([[10, h / 2], [w - 10, h / 2]], '#141414', 10), at(x, y));
  P.windowDay = (x, y, w, h, light = 1) => g(rect(0, 0, w, h, '#101010', 6) + rect(12, 12, w - 24, h - 24, '#FFF3F3', 4, `opacity="${0.55 + 0.45 * light}"`) +
    [1, 2].map(i => line([[w * i / 3, 12], [w * i / 3, h - 12]], '#101010', 8)).join('') + [1, 2, 3].map(i => line([[12, h * i / 4], [w - 12, h * i / 4]], '#101010', 6)).join(''), at(x, y));
  P.sofa = (x, y, w, col = '#262626', dk = '#1A1A1A', s = 1) => g(rect(-w / 2, -250, w, 170, dk, 28) + rect(-w / 2 - 30, -170, 70, 170, col, 24) + rect(w / 2 - 40, -170, 70, 170, col, 24) + rect(-w / 2 + 20, -120, w - 40, 110, col, 18) + rect(-w / 2 + 10, -14, 22, 14, dk) + rect(w / 2 - 32, -14, 22, 14, dk), at(x, y, s));
  P.chair = (x, y, s = 1, col = '#E3DAD2', dk = '#C9BDB2') => g(rect(-110, -330, 220, 200, dk, 24) + rect(-120, -150, 240, 60, col, 18) + rect(-100, -90, 14, 90, dk) + rect(86, -90, 14, 90, dk), at(x, y, s));
  P.desk = (x, y, w, col = '#3A2E28', top = '#4A3B33', s = 1) => g(rect(-w / 2, -30, w, 30, top, 6) + rect(-w / 2 + 20, 0, 24, 300, col) + rect(w / 2 - 44, 0, 24, 300, col), at(x, y, s));
  P.bed = (x, y, s = 1, dark = 1) => g(
    rect(-360, -420, 720, 300, dark ? '#242424' : '#E6DDD5', 30) + rect(-380, -140, 760, 150, dark ? '#2E2E2E' : '#F1EBE5', 20) +
    rect(-300, -200, 240, 90, dark ? '#D9D2CC' : '#FFFFFF', 40) + rect(-380, -100, 760, 110, dark ? '#3A2F2F' : '#EAD9D9', 18), at(x, y, s));
  P.notebook = (x, y, s = 1, open = 1, lines = [], rot = 0, extra = '') => {
    const w = 300 + 300 * open;
    let inner = rect(-w / 2 - 10, -210, w + 20, 420, '#101010', 18) + rect(-w / 2, -200, w, 400, '#FFFFFF', 10);
    if (open > 0.5) inner += line([[0, -200], [0, 200]], '#E3D9D9', 3) + rect(w / 2 - 70, -200, 14, 90, '#E7212B', 2);
    for (let i = 0; i < 8; i++) inner += line([[-w / 2 + 30, -140 + i * 42], [w / 2 - 30, -140 + i * 42]], '#F0E6E6', 2);
    inner += lines.join('') + extra;
    return g(`<g filter="url(#ps2)">${inner}</g>`, at(x, y, s, rot));
  };
  P.calendar = (x, y, s, day, month = 'OCT', label = '') => g(`<g filter="url(#ps2)">${rect(-120, -150, 240, 300, '#FFFFFF', 16)}${rect(-120, -150, 240, 80, '#E7212B', 16)}${rect(-120, -90, 240, 20, '#E7212B')}
    <text x="0" y="-98" text-anchor="middle" font-family="Inter" font-weight="700" font-size="34" fill="#FFFFFF" letter-spacing="4">${month}</text>
    <text x="0" y="40" text-anchor="middle" font-family="Inter" font-weight="800" font-size="110" fill="#151515">${day}</text>
    <text x="0" y="110" text-anchor="middle" font-family="Inter" font-weight="600" font-size="28" fill="#474747">${label}</text></g>`, at(x, y, s));
  P.phoneHand = (x, y, s = 1, rot = 0) => g(rect(-34, -64, 68, 128, '#151515', 12) + rect(-28, -56, 56, 110, '#FFF3F3', 8, 'opacity=".9"'), at(x, y, s, rot));
  P.pillow = (x, y, s = 1, col = '#FFFFFF') => g(rect(-120, -45, 240, 90, col, 44, 'stroke="#D8D0CA" stroke-width="3"'), at(x, y, s));
  P.rug = (x, y, w, h, col = '#EFE7E0') => ell(x, y, w / 2, h / 2, col);
  P.plant = (x, y, s = 1, dark = 0) => g(rect(-40, -90, 80, 90, dark ? '#2B2B2B' : '#E3DAD2', 10) + ['M0,-90 C-10,-170 -70,-190 -80,-230', 'M0,-90 C0,-190 20,-230 10,-280', 'M0,-90 C20,-160 70,-180 90,-220'].map(d => `<path d="${d}" fill="none" stroke="${dark ? '#3D4A3A' : '#6E8567'}" stroke-width="10" stroke-linecap="round"/>`).join('') +
    ell(-80, -236, 30, 14, dark ? '#3D4A3A' : '#7C9774', 'transform="rotate(-30 -80 -236)"') + ell(10, -286, 14, 30, dark ? '#3D4A3A' : '#7C9774') + ell(92, -226, 30, 14, dark ? '#3D4A3A' : '#7C9774', 'transform="rotate(30 92 -226)"'), at(x, y, s));

  G.CAST = { LOOKS, person, face, hand, P };
})(window);
