// Re-enact a clip with Munaza, entirely in the browser.
// Per frame: MediaPipe Pose Landmarker reads the person's skeleton → the movement is retargeted onto Munaza's own bone lengths
// (torso lean, head tilt, both arms) → her cutout is bent by linear-blend skinning on a textured mesh (WebGL) → drawn onto a
// background rebuilt from the clip with the person and chair painted out. Frames go to the server like replace.js does.
// It is a 2D puppet: it follows what the camera sees (lean, tilt, arm swings) but cannot turn her body or invent hidden limbs.
const L = { nose: 0, lEye: 2, rEye: 5, lEar: 7, rEar: 8, lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16, lIdx: 19, rIdx: 20, lHip: 23, rHip: 24, lKn: 25, rKn: 26, lAn: 27, rAn: 28 };
const KEYS = Object.values(L);
const MAX_FRAMES = 5000;
let poseP = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function seek(video, t) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('The video did not seek in time.')), 8000);
    const done = () => { clearTimeout(to); video.removeEventListener('seeked', done); resolve(); };
    video.addEventListener('seeked', done);
    if (Math.abs(video.currentTime - t) < 1e-4) { done(); return; }
    video.currentTime = t;
  });
}
async function landmarker() {
  poseP ||= (async () => {
    const mp = await import('/vendor/mediapipe/vision_bundle.mjs');
    const fileset = await mp.FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
    return mp.PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: '/vendor/mediapipe/pose_landmarker_full.task', delegate: 'CPU' }, runningMode: 'IMAGE', numPoses: 1 });
  })().catch((e) => { poseP = null; throw Object.assign(new Error('The pose detector could not load (' + (e.message || e) + '). Check that vendor/mediapipe/pose_landmarker_full.task exists.'), { cause: e }); });
  return poseP;
}
// → { k: [x, y, visibility] } in pixels of the canvas, or null
function readPose(lm, canvas) {
  const r = lm.detect(canvas), p = r.landmarks && r.landmarks[0];
  if (!p) return null;
  const out = {}; for (const k of KEYS) out[k] = [p[k].x * canvas.width, p[k].y * canvas.height, p[k].visibility ?? 1];
  return out;
}

// ---------- small maths ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, s) => [a[0] * s, a[1] * s];
const len = (a) => Math.hypot(a[0], a[1]), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const rot = (a, t) => { const c = Math.cos(t), s = Math.sin(t); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; };
const ang = (a) => Math.atan2(a[1], a[0]);
const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const wrap = (t) => { while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI; return t; };
function segDist(p, a, b) { const ab = sub(b, a), t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1] || 1))); return len(sub(p, add(a, mul(ab, t)))); }

// per-landmark time series: drop low-visibility samples, fill gaps linearly, median(5) then mean(2k+1)
function smoothSeries(poses, fps) {
  const n = poses.length, k = Math.max(1, Math.round(fps * 0.06)), out = poses.map(() => ({}));
  for (const key of KEYS) for (const c of [0, 1]) {
    let a = poses.map((p) => (p && p[key][2] > 0.35 ? p[key][c] : null));
    const idx = a.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
    if (!idx.length) { a = a.map(() => 0); } else {
      a = a.map((v, i) => { if (v != null) return v; let lo = -1, hi = -1; for (const j of idx) { if (j < i) lo = j; else { hi = j; break; } } if (lo < 0) return a[hi]; if (hi < 0) return a[lo]; return a[lo] + ((a[hi] - a[lo]) * (i - lo)) / (hi - lo); });
    }
    const med = a.map((_, i) => { const w = []; for (let j = i - 2; j <= i + 2; j++) w.push(a[Math.max(0, Math.min(n - 1, j))]); return w.sort((x, y) => x - y)[2]; });
    for (let i = 0; i < n; i++) { let s = 0, m = 0; for (let j = i - k; j <= i + k; j++) { s += med[Math.max(0, Math.min(n - 1, j))]; m++; } (out[i][key] ||= [0, 0])[c] = s / m; }
  }
  return out;
}

// ---------- Munaza's rest skeleton and skin ----------
async function munazaRest(lm, name) {
  const img = await createImageBitmap(await (await fetch(`/munaza-poses/${name}.png`)).blob());
  const pad = Math.round(img.height * 0.12), cw = img.width + pad * 2, ch = img.height + pad * 2;
  const c = new OffscreenCanvas(cw, ch), g = c.getContext('2d'); g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, cw, ch); g.drawImage(img, pad, pad);
  const p = readPose(lm, c);
  if (!p) throw new Error('The pose detector could not find Munaza in her own image.');
  for (const k of KEYS) { p[k][0] -= pad; p[k][1] -= pad; }
  return { img, pose: p };
}
function buildBones(m) {
  const hipC = mid(m[L.lHip], m[L.rHip]), shC = mid(m[L.lSh], m[L.rSh]);
  const earC = mid(m[L.lEar], m[L.rEar]), headC = [(earC[0] * 2 + m[L.nose][0]) / 3, (earC[1] * 2 + m[L.nose][1]) / 3];
  const torsoLen = len(sub(shC, hipC)), shW = len(sub(m[L.lSh], m[L.rSh])), headTop = add(shC, mul(sub(headC, shC), 1.4));
  const arm = (sh, el, wr, ix) => { const hand = add(m[wr], mul(sub(m[wr], m[el]), 0.35)); return { sh: m[sh], el: m[el], wr: m[wr], hand }; };
  return {
    hipC, shC, headC, headTop, torsoLen, shW,
    L: arm(L.lSh, L.lEl, L.lWr, L.lIdx), R: arm(L.rSh, L.rEl, L.rWr, L.rIdx),
    uLen: { L: len(sub(m[L.lEl], m[L.lSh])), R: len(sub(m[L.rEl], m[L.rSh])) }, fLen: { L: len(sub(m[L.lWr], m[L.lEl])), R: len(sub(m[L.rWr], m[L.rEl])) },
  };
}
// bones: rest segments + radius used for the skin weights
function restBones(B) {
  const ar = B.torsoLen * 0.15, sL = Math.sign(B.L.sh[0] - B.R.sh[0]) || 1;
  return [
    { id: 'torso', a: B.hipC, b: B.shC, wa: add(B.hipC, mul(sub(B.shC, B.hipC), 0.3)), r: Math.max(B.shW * 0.5, B.torsoLen * 0.34) },
    { id: 'head', a: B.shC, b: B.headTop, r: Math.max(B.torsoLen * 0.34, 10) },
    { id: 'uL', a: B.L.sh, b: B.L.el, r: ar, side: sL }, { id: 'fL', a: B.L.el, b: B.L.hand, r: ar, side: sL },
    { id: 'uR', a: B.R.sh, b: B.R.el, r: ar, side: -sL }, { id: 'fR', a: B.R.el, b: B.R.hand, r: ar, side: -sL },
  ];
}

// ---------- WebGL skinned mesh ----------
function makeRenderer(W, H, imgs) {
  const img = imgs[0];
  const cv = new OffscreenCanvas(W, H), gl = cv.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) throw new Error('This browser has no WebGL2, which the Munaza re-enactment needs.');
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, `#version 300 es\nin vec2 pos; in vec2 uv; uniform vec2 res; out vec2 v;\nvoid main(){ v=uv; gl_Position=vec4(pos.x/res.x*2.-1., 1.-pos.y/res.y*2., 0., 1.); }`));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, `#version 300 es\nprecision mediump float; in vec2 v; uniform sampler2D tex; out vec4 o;\nvoid main(){ o=texture(tex, v); }`));
  gl.linkProgram(pr); gl.useProgram(pr);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const texs = imgs.map((im) => {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  });
  gl.uniform2f(gl.getUniformLocation(pr, 'res'), W, H);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const GX = 110, GY = Math.round(GX * img.height / img.width), nv = (GX + 1) * (GY + 1);
  const uv = new Float32Array(nv * 2), rest = new Float32Array(nv * 2), pos = new Float32Array(nv * 2);
  for (let y = 0; y <= GY; y++) for (let x = 0; x <= GX; x++) { const i = y * (GX + 1) + x; uv[i * 2] = x / GX; uv[i * 2 + 1] = y / GY; rest[i * 2] = (x / GX) * img.width; rest[i * 2 + 1] = (y / GY) * img.height; }
  const idx = []; for (let y = 0; y < GY; y++) for (let x = 0; x < GX; x++) { const a = y * (GX + 1) + x, b = a + 1, c = a + GX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const mk = (data, name, dyn) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0); return b; };
  mk(uv, 'uv', false); const pb = mk(pos, 'pos', true);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
  return {
    canvas: cv, nv, rest,
    // layers: [{ tex index, pos Float32Array }], drawn in order
    draw(layers) {
      gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const l of layers) { gl.bindTexture(gl.TEXTURE_2D, texs[l.tex]); gl.bindBuffer(gl.ARRAY_BUFFER, pb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, l.pos); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0); }
    },
  };
}

// fill the invalid pixels of a premultiplied RGBA image from their valid surroundings (push-pull pyramid)
function pushPull(px, valid, w, h) {
  const lv = [{ w, h, c: new Float32Array(w * h * 4), a: new Float32Array(w * h) }];
  for (let i = 0; i < w * h; i++) { const v = valid[i]; lv[0].a[i] = v; for (let k = 0; k < 4; k++) lv[0].c[i * 4 + k] = px[i * 4 + k] * v; }
  while (lv.at(-1).w > 1 || lv.at(-1).h > 1) {
    const p = lv.at(-1), nw = Math.max(1, (p.w + 1) >> 1), nh = Math.max(1, (p.h + 1) >> 1), q = { w: nw, h: nh, c: new Float32Array(nw * nh * 4), a: new Float32Array(nw * nh) };
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const i = y * p.w + x, j = (y >> 1) * nw + (x >> 1); q.a[j] += p.a[i]; for (let k = 0; k < 4; k++) q.c[j * 4 + k] += p.c[i * 4 + k]; }
    lv.push(q);
  }
  let fill = null;                                                // average colour per pixel at the level below
  for (let l = lv.length - 1; l >= 0; l--) {
    const q = lv[l], cell = 4 ** l, cur = new Float32Array(q.w * q.h * 4);
    for (let y = 0; y < q.h; y++) for (let x = 0; x < q.w; x++) {
      const i = y * q.w + x, cov = Math.min(1, q.a[i] / cell);
      for (let k = 0; k < 4; k++) {
        const own = q.a[i] > 1e-6 ? q.c[i * 4 + k] / q.a[i] : 0;
        let up = own;
        if (fill) { const fw = lv[l + 1].w, fx = Math.min(fw - 1, x >> 1), fy = Math.min(lv[l + 1].h - 1, y >> 1); up = fill[(fy * fw + fx) * 4 + k]; }
        cur[i * 4 + k] = own * cov + up * (1 - cov);
      }
    }
    fill = cur;
  }
  return fill;
}

// background with the person and chair painted out: row-wise blend between the pixels left and right of the box, softened
function makePlate(frame, W, H, box) {
  const c = new OffscreenCanvas(W, H), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(frame, 0, 0);
  const x0 = Math.max(10, Math.floor(box.x0)), x1 = Math.min(W - 11, Math.ceil(box.x1)), y0 = Math.max(0, Math.floor(box.y0)), y1 = Math.min(H - 1, Math.ceil(box.y1));
  const im = g.getImageData(0, 0, W, H), d = im.data;
  const col = (x, y) => { let r = 0, gg = 0, b = 0; for (let k = 0; k < 6; k++) { const p = (y * W + x + k * (x < W / 2 ? -1 : 1)) * 4; r += d[p]; gg += d[p + 1]; b += d[p + 2]; } return [r / 6, gg / 6, b / 6]; };
  for (let y = y0; y <= y1; y++) {
    const l = col(x0 - 2, y), r = col(x1 + 2, y);
    for (let x = x0; x <= x1; x++) { const t = (x - x0) / Math.max(1, x1 - x0), p = (y * W + x) * 4; d[p] = l[0] + (r[0] - l[0]) * t; d[p + 1] = l[1] + (r[1] - l[1]) * t; d[p + 2] = l[2] + (r[2] - l[2]) * t; }
  }
  g.putImageData(im, 0, 0);
  // blur only the patch, feathered into its surroundings
  const patch = new OffscreenCanvas(W, H), pg = patch.getContext('2d'); pg.filter = `blur(${Math.max(6, Math.round(H / 40))}px)`; pg.drawImage(c, 0, 0); pg.filter = 'none';
  const mask = new OffscreenCanvas(W, H), mg = mask.getContext('2d'); mg.filter = 'blur(8px)'; mg.fillStyle = '#000'; mg.fillRect(x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12); mg.filter = 'none';
  pg.globalCompositeOperation = 'destination-in'; pg.drawImage(mask, 0, 0);
  const out = new OffscreenCanvas(W, H), og = out.getContext('2d'); og.drawImage(frame, 0, 0); og.drawImage(patch, 0, 0);
  return out;
}

/**
 * o: { video, start, len, fps, speed, workH, scale, base: 'auto'|pose name, onStage(text, 0..1), upload(n, blob), signal }
 * returns { frames, width, height, base }
 */
export async function reenactExercise(o) {
  const { video, start, fps, speed, scale = 1, onStage, upload, signal } = o;
  const vh = video.videoHeight, vw = video.videoWidth, H = Math.min(o.workH, vh), W = Math.round((H * vw / vh) / 2) * 2;
  const n = Math.round((o.len / speed) * fps);
  if (n < 2) throw new Error('Pick a clip of at least a few frames.');
  if (n > MAX_FRAMES) throw new Error(`That is ${n} frames. The limit is ${MAX_FRAMES}; shorten the clip or lower the frame rate.`);
  const check = () => { if (signal && signal.cancelled) throw Object.assign(new Error('Cancelled.'), { quiet: true }); };
  video.pause();
  onStage('Loading the pose detector', 0.01);
  const lm = await landmarker();
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d', { willReadFrequently: true });
  const timeAt = (i) => Math.min(video.duration - 0.001, start + (i * speed) / fps);
  const grab = async (i) => { await seek(video, timeAt(i)); cx.drawImage(video, 0, 0, W, H); };

  // pass 1: skeleton in every frame
  const raw = new Array(n);
  for (let i = 0; i < n; i++) {
    check(); await grab(i); raw[i] = readPose(lm, cv);
    onStage(`Reading the movement, frame ${i + 1} of ${n}`, 0.02 + 0.38 * ((i + 1) / n));
    if (i % 4 === 3) await sleep(0);
  }
  if (!raw.some(Boolean)) throw new Error('No person was found in this clip. Pick a clip where a person is clearly visible.');
  const S = smoothSeries(raw, fps);
  const first = S.slice(0, Math.max(1, Math.round(fps * 0.4)));
  const r0 = {}; for (const k of KEYS) r0[k] = [0, 1].map((c) => first.map((p) => p[k][c]).sort((a, b) => a - b)[first.length >> 1]);
  const srcHip0 = mid(r0[L.lHip], r0[L.rHip]), srcSh0 = mid(r0[L.lSh], r0[L.rSh]), srcTorso = len(sub(srcSh0, srcHip0));
  const seated = (mid(r0[L.lKn], r0[L.rKn])[1] - srcHip0[1]) < srcTorso * 0.7;
  const baseName = o.base && o.base !== 'auto' ? o.base : (seated ? '14-seated-hands-clasped-chair-left' : '02-neutral');

  // Munaza
  onStage('Preparing Munaza', 0.41);
  const { img, pose: mp } = await munazaRest(lm, baseName);
  const B = buildBones(mp), bones = restBones(B);
  const f = (srcTorso / B.torsoLen) * scale;                       // her pixels → output pixels
  // arm mask: the sleeves, hands and forearms, split by body side so crossed hands do not drag each other
  const iw = img.width, ih = img.height, midX = (B.L.sh[0] + B.R.sh[0]) / 2;
  const ic = new OffscreenCanvas(iw, ih), ig = ic.getContext('2d', { willReadFrequently: true }); ig.drawImage(img, 0, 0);
  const src = ig.getImageData(0, 0, iw, ih), sd = src.data, armBones = bones.filter((q) => q.side);
  const m0 = B.torsoLen * 0.10, m1 = B.torsoLen * 0.17, mask = new Float32Array(iw * ih), valid = new Float32Array(iw * ih), pm = new Float32Array(iw * ih * 4);
  for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) {
    let m = 0;
    for (const q of armBones) { if ((x - midX) * q.side < -B.shW * 0.04) continue; const d = segDist([x, y], q.a, q.b), t = Math.max(0, Math.min(1, (m1 - d) / (m1 - m0)));
      let g = 1; if (q.id[0] === 'u') { const ax = sub(q.b, q.a), pr = ((x - q.a[0]) * ax[0] + (y - q.a[1]) * ax[1]) / (len(ax) ** 2), r = Math.max(0, Math.min(1, pr / 0.3)); g = r * r * (3 - 2 * r); }   // the shoulder end stays with the body (hijab, collar)
      m = Math.max(m, t * t * (3 - 2 * t) * g); }
    const i = y * iw + x; mask[i] = m; valid[i] = m < 0.02 ? 1 : 0;
    const al = sd[i * 4 + 3] / 255; pm[i * 4] = sd[i * 4] / 255 * al; pm[i * 4 + 1] = sd[i * 4 + 1] / 255 * al; pm[i * 4 + 2] = sd[i * 4 + 2] / 255 * al; pm[i * 4 + 3] = al;
  }
  const filled = pushPull(pm, valid, iw, ih), bodyD = ig.createImageData(iw, ih), armD = ig.createImageData(iw, ih);
  for (let i = 0; i < iw * ih; i++) {
    const m = mask[i];
    const fa = Math.max(0, Math.min(1, (filled[i * 4 + 3] - 0.35) / 0.3)), fs = fa * fa * (3 - 2 * fa);   // keep the filled silhouette crisp, no ghost halo
    const fav = filled[i * 4 + 3] > 1e-4 ? filled[i * 4 + 3] : 1;
    const pa = pm[i * 4 + 3] * (1 - m) + fs * m;                         // body layer: arms replaced by what surrounds them
    for (let k = 0; k < 3; k++) { const v = pm[i * 4 + k] * (1 - m) + (filled[i * 4 + k] / fav) * fs * m; bodyD.data[i * 4 + k] = pa > 1e-4 ? Math.min(255, Math.round(v / pa * 255)) : 0; }
    bodyD.data[i * 4 + 3] = Math.round(pa * 255);
    armD.data[i * 4] = sd[i * 4]; armD.data[i * 4 + 1] = sd[i * 4 + 1]; armD.data[i * 4 + 2] = sd[i * 4 + 2]; armD.data[i * 4 + 3] = Math.round(sd[i * 4 + 3] * m);   // arm layer: only the arms
  }
  const bodyC = new OffscreenCanvas(iw, ih), armC = new OffscreenCanvas(iw, ih); bodyC.getContext('2d').putImageData(bodyD, 0, 0); armC.getContext('2d').putImageData(armD, 0, 0);
  const LAYERED = false;   // arm-over-body layering was tried: the filled-in body leaves ghost shapes; the single skinned image looks cleaner
  const ren = makeRenderer(W, H, LAYERED ? [bodyC, armC] : [img]);
  // skin weights, fixed in rest space. Body layer: the arm bones are off (arms are painted over it); arm layer: all bones
  const nb = bones.length;
  const skin = (useArms) => {
    const Wt = new Float32Array(ren.nv * nb);
    for (let v = 0; v < ren.nv; v++) {
      const p = [ren.rest[v * 2], ren.rest[v * 2 + 1]]; let s = 0.06;
      for (let b = 0; b < nb; b++) {
        const d = segDist(p, bones[b].wa || bones[b].a, bones[b].b) / bones[b].r; let w = Math.exp(-d * d * 2.4);
        if (bones[b].side && (!useArms || (p[0] - midX) * bones[b].side < -B.shW * 0.04)) w = 0;
        Wt[v * nb + b] = w; s += w;
      }
      for (let b = 0; b < nb; b++) Wt[v * nb + b] /= s;
      let s2 = 0; for (let b = 0; b < nb; b++) { const w = Wt[v * nb + b]; Wt[v * nb + b] = w * w; s2 += w * w; }     // sharpen so a pixel follows one bone, not a blend
      const bodyShare = 1 - 0.06 / s;
      for (let b = 0; b < nb; b++) Wt[v * nb + b] = s2 > 0 ? (Wt[v * nb + b] / s2) * bodyShare : 0;
    }
    return Wt;
  };
  const WtBody = skin(false), WtArm = skin(true), posBody = new Float32Array(ren.nv * 2), posArm = new Float32Array(ren.nv * 2);
  const staticAnchor = (p) => add(srcHip0, mul(sub(p, B.hipC), f));  // rest placement

  // plate from the clip: box around everything the person and chair cover
  let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
  for (const p of S) for (const k of KEYS) { bx0 = Math.min(bx0, p[k][0]); bx1 = Math.max(bx1, p[k][0]); by0 = Math.min(by0, p[k][1]); by1 = Math.max(by1, p[k][1]); }
  const hw = (bx1 - bx0), padx = Math.max(srcTorso * 0.9, hw * 0.25);
  await grab(0);
  const plate = makePlate(cv, W, H, { x0: bx0 - padx, x1: bx1 + padx, y0: by0 - srcTorso * 0.55, y1: Math.min(H - 1, by1 + srcTorso * 0.5) });
  // her feet line for the soft contact shadow
  const feetY = staticAnchor([0, img.height * 0.985])[1], feetX = staticAnchor([B.hipC[0], 0])[0];

  // pass 2: pose her, draw, upload
  const out = new OffscreenCanvas(W, H), og = out.getContext('2d');
  const jobs = new Set();
  const rb = bones.map((b) => ({ ...b, ang: ang(sub(b.b, b.a)) }));
  for (let i = 0; i < n; i++) {
    check();
    const s = S[i];
    const hipC = add(srcHip0, sub(mid(s[L.lHip], s[L.rHip]), srcHip0)), shS = mid(s[L.lSh], s[L.rSh]);
    const tTorso = ang(sub(shS, mid(s[L.lHip], s[L.rHip]))), rTorso = rb[0].ang, dT = wrap(tTorso - rTorso);
    const place = (p, base, dRot) => add(base, mul(rot(sub(p, B.hipC), dRot), f));   // rigid with torso
    const shC_t = place(B.shC, hipC, dT);
    // head
    const earS = mid(s[L.lEar], s[L.rEar]), headS = [(earS[0] * 2 + s[L.nose][0]) / 3, (earS[1] * 2 + s[L.nose][1]) / 3], headDir = ang(sub(headS, shS)), restHead = ang(sub(B.headC, B.shC)), dH = wrap(headDir - restHead);
    const headTop_t = add(shC_t, mul(rot(sub(B.headTop, B.shC), dH), f));
    // arms
    const T = [{ a: hipC, b: shC_t }, { a: shC_t, b: headTop_t }];
    for (const side of ['L', 'R']) {
      const k = side === 'L' ? { sh: L.lSh, el: L.lEl, wr: L.lWr } : { sh: L.rSh, el: L.rEl, wr: L.rWr };
      const sh_t = place(B[side].sh, hipC, dT);
      const el_t = add(sh_t, mul(unit(sub(s[k.el], s[k.sh])), B.uLen[side] * f));
      const fd = unit(sub(s[k.wr], s[k.el])), wr_t = add(el_t, mul(fd, B.fLen[side] * f));
      const hand_t = add(wr_t, mul(fd, B.fLen[side] * 0.35 * f));
      T.push({ a: sh_t, b: el_t }, { a: el_t, b: hand_t });
    }
    // bone transforms: rotate about the rest start, move to the target start
    const M = rb.map((b, j) => { const th = wrap(ang(sub(T[j].b, T[j].a)) - b.ang); return { th, c: Math.cos(th), s: Math.sin(th), a: b.a, t: T[j].a }; });
    const skinInto = (Wt, out) => {
      for (let v = 0; v < ren.nv; v++) {
        const px = ren.rest[v * 2], py = ren.rest[v * 2 + 1]; let ox = 0, oy = 0, sw = 0;
        for (let b = 0; b < nb; b++) {
          const w = Wt[v * nb + b]; if (w < 1e-4) continue; sw += w; const m = M[b], dx = px - m.a[0], dy = py - m.a[1];
          ox += w * (m.t[0] + f * (m.c * dx - m.s * dy)); oy += w * (m.t[1] + f * (m.s * dx + m.c * dy));
        }
        const rest = staticAnchor([px, py]);                    // leftover weight stays at the rest placement
        out[v * 2] = ox + (1 - sw) * rest[0]; out[v * 2 + 1] = oy + (1 - sw) * rest[1];
      }
    };
    if (LAYERED) skinInto(WtBody, posBody);
    skinInto(WtArm, posArm);
    ren.draw(LAYERED ? [{ tex: 0, pos: posBody }, { tex: 1, pos: posArm }] : [{ tex: 0, pos: posArm }]);
    og.globalCompositeOperation = 'source-over'; og.drawImage(plate, 0, 0);
    og.save(); og.fillStyle = 'rgba(0,0,0,.16)'; og.beginPath(); og.ellipse(feetX, feetY - 2, srcTorso * 0.75 * scale, Math.max(3, srcTorso * 0.09), 0, 0, Math.PI * 2); og.fill(); og.restore();
    og.drawImage(ren.canvas, 0, 0);
    const blob = await out.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    const job = upload(i + 1, blob).finally(() => jobs.delete(job)); jobs.add(job);
    if (jobs.size >= 4) await Promise.race(jobs);
    onStage(`Composing frame ${i + 1} of ${n}`, 0.45 + 0.45 * ((i + 1) / n));
    if (i % 6 === 5) await sleep(0);
  }
  await Promise.all(jobs);
  return { frames: n, width: W, height: H, base: baseName };
}
