// Replace the main person in a video clip with the Munaza Ghani cutout, entirely in the browser.
// Per frame: segment people (MediaPipe DeepLab, vendored in /vendor/mediapipe) → keep the largest person → paint that person out with a
// clean background plate (median of the frames where the spot is uncovered) → draw the cutout on the same feet line, smoothed.
// The finished frames are uploaded as JPEGs and encoded by the server with the same 2-pass palette pipeline.
const G = 4;               // mask grid cell, in pixels
const PERSON = 15;         // Pascal VOC class index for "person"
const CONF = 0.18;         // person confidence needed to count a pixel
const CONF_NEAR = 0.05;    // a lower bar, used only close to the person, to catch detached hands, heels and sleeves
const MAX_FRAMES = 5000;
let segP = null, charP = null;

async function segmenter() {
  segP ||= (async () => {
    const mp = await import('/vendor/mediapipe/vision_bundle.mjs');
    const fileset = await mp.FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
    return mp.ImageSegmenter.createFromOptions(fileset, { baseOptions: { modelAssetPath: '/vendor/mediapipe/deeplab_v3.tflite', delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: false, outputConfidenceMasks: true });
  })().catch((e) => { segP = null; throw Object.assign(new Error('The person detector could not load (' + (e.message || e) + '). Check that vendor/mediapipe exists.'), { cause: e }); });
  return segP;
}
// every Munaza pose in /munaza-poses (the files made for assets/images/dr-munaza-poses), each with its tight alpha box
const POSES = ['01-arms-crossed', '02-neutral', '03-walk-left-a', '03-walk-left-b', '04-walk-right-a', '04-walk-right-b', '05-walk-front-a', '05-walk-front-b', '06-walk-back-a', '06-walk-back-b', '07-wave', '08-explain', '09-point', '10-clipboard', '11-seated', '12-neck-stretch', '13-seated-hold-upper-arm', '14-seated-hands-clasped-chair-left', '15-seated-hands-clasped-chair-right'];
export const POSE_LABELS = { '01-arms-crossed': 'Arms crossed', '02-neutral': 'Neutral', '07-wave': 'Wave', '08-explain': 'Explain', '09-point': 'Point', '10-clipboard': 'Clipboard', '11-seated': 'Seated (side)', '12-neck-stretch': 'Neck stretch', '13-seated-hold-upper-arm': 'Seated, hand on upper arm', '14-seated-hands-clasped-chair-left': 'Seated, hands clasped (chair left)', '15-seated-hands-clasped-chair-right': 'Seated, hands clasped (chair right)' };
async function loadPose(name) {
  const img = await createImageBitmap(await (await fetch(`/munaza-poses/${name}.png`)).blob());
  const s = 256 / img.height, w = Math.round(img.width * s), h = 256;
  const c = new OffscreenCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data; let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { img, sx: Math.max(0, x0 / s - 2), sy: Math.max(0, y0 / s - 2), sw: Math.min(img.width, (x1 - x0 + 1) / s + 4), sh: Math.min(img.height, (y1 - y0 + 1) / s + 4) };
}
async function character() {
  charP ||= (async () => {
    const list = await Promise.all(POSES.map(loadPose));
    return Object.fromEntries(POSES.map((n, i) => [n, list[i]]));
  })().catch((e) => { charP = null; throw e; });
  return charP;
}
// what the person is doing in each frame → a pose group; walking alternates the A/B step frames by distance travelled, standing cycles the gesture poses
const SEATED_CYCLE = [['14-seated-hands-clasped-chair-left', 1.8], ['13-seated-hold-upper-arm', 1.6], ['15-seated-hands-clasped-chair-right', 1.8], ['11-seated', 1.6]];
const IDLE_CYCLE = [['02-neutral', 1.6], ['08-explain', 1.4], ['02-neutral', 1.0], ['10-clipboard', 1.4], ['02-neutral', 1.0], ['09-point', 1.2], ['02-neutral', 1.0], ['07-wave', 1.4], ['02-neutral', 1.0], ['01-arms-crossed', 1.4], ['02-neutral', 1.0], ['12-neck-stretch', 1.6]];
function planPoses({ n, fps, sx, sb, sh, bw, bh, H, pose }) {
  if (pose && pose !== 'auto') return new Array(n).fill(pose);
  const k = Math.max(1, Math.round(fps * 0.25)), group = new Array(n).fill('idle'), dist = new Array(n).fill(0);
  const at = (a, i) => a[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n; i++) {
    if (sh[i] == null) continue;
    const j0 = Math.max(0, i - k), j1 = Math.min(n - 1, i + k), dt = (j1 - j0) / fps || 1;
    const vx = sx[j1] != null && sx[j0] != null ? (sx[j1] - sx[j0]) / dt / sh[i] : 0;   // body heights per second
    const vs = sh[j1] != null && sh[j0] != null ? (sh[j1] - sh[j0]) / dt / sh[i] : 0;   // growing = coming toward the camera
    const asp = bw[i] ? bh[i] / bw[i] : 3, floor = sb[i] < H - 12;
    if (asp < 1.45 && floor && Math.abs(vx) < 0.15) group[i] = 'seated';
    else if (Math.abs(vx) > 0.2 && Math.abs(vx) >= Math.abs(vs) * 1.4) group[i] = vx < 0 ? 'walk-left' : 'walk-right';
    else if (Math.abs(vs) > 0.07) group[i] = vs > 0 ? 'walk-front' : 'walk-back';
    dist[i] = (i ? dist[i - 1] : 0) + (Math.abs(vx) + Math.abs(vs)) * sh[i] / fps;
  }
  const win = Math.max(1, Math.round(fps * 0.3));       // a pose has to hold for a moment: take the commonest group in a short window
  const sm = group.map((g, i) => { const c = {}; let best = g, bc = 0; for (let j = i - win; j <= i + win; j++) { const v = at(group, j); c[v] = (c[v] || 0) + 1; if (c[v] > bc) { bc = c[v]; best = v; } } return best; });
  const out = new Array(n); let idleStart = 0;
  for (let i = 0; i < n; i++) {
    const g = sm[i];
    if (g === 'idle' || g === 'seated') {
      if (i === 0 || sm[i - 1] !== g) idleStart = i;
      const cyc = g === 'seated' ? SEATED_CYCLE : IDLE_CYCLE, total = cyc.reduce((a, c) => a + c[1], 0); let t = ((i - idleStart) / fps) % total;
      out[i] = (cyc.find((c) => (t -= c[1]) < 0) || cyc[0])[0];
    } else {
      const stride = Math.max(4, sh[i] * 0.22), ab = Math.floor(dist[i] / stride) % 2 ? 'b' : 'a';
      out[i] = { 'walk-left': '03-walk-left-', 'walk-right': '04-walk-right-', 'walk-front': '05-walk-front-', 'walk-back': '06-walk-back-' }[g] + ab;
    }
  }
  return out;
}

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
function dilate(grid, gw, gh) {
  const out = new Uint8Array(grid.length);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (!grid[y * gw + x]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) out[yy * gw + xx] = 1; }
  }
  return out;
}
// largest 8-connected component → { cells, bbox } or null
function largest(grid, gw, gh) {
  const seen = new Uint8Array(grid.length); let best = null; const stack = [];
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] || seen[i]) continue;
    const cells = []; stack.push(i); seen[i] = 1; let x0 = gw, x1 = 0, y0 = gh, y1 = 0;
    while (stack.length) {
      const c = stack.pop(); cells.push(c); const x = c % gw, y = (c / gw) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= gh || xx < 0 || xx >= gw) continue; const k = yy * gw + xx; if (grid[k] && !seen[k]) { seen[k] = 1; stack.push(k); } }
    }
    if (!best || cells.length > best.cells.length) best = { cells, x0, x1, y0, y1 };
  }
  if (!best || best.cells.length < grid.length * 0.004) return null;
  return best;
}
// fill masked pixels from the nearest unmasked pixel on the same row (left/right average); rows with none use the row above
function fillHoles(px, hole, W, H) {
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (!hole(x, y)) { x++; continue; }
      let a = x; while (a < W && hole(a, y)) a++;
      const L = x > 0 ? (y * W + x - 1) * 4 : -1, R = a < W ? (y * W + a) * 4 : -1;
      for (let k = x; k < a; k++) {
        const o = (y * W + k) * 4;
        for (let c = 0; c < 3; c++) {
          px[o + c] = L >= 0 && R >= 0 ? (px[L + c] * (a - k) + px[R + c] * (k - x + 1)) / (a - x + 1) : L >= 0 ? px[L + c] : R >= 0 ? px[R + c] : y > 0 ? px[((y - 1) * W + k) * 4 + c] : 128;
        }
        px[o + 3] = 255;
      }
      x = a;
    }
  }
}
function smooth(a, win) {
  const n = a.length, out = new Array(n);
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -win; k <= win; k++) { const v = a[i + k]; if (v !== undefined && v !== null) { s += v; c++; } } out[i] = c ? s / c : null; }
  return out;
}

/**
 * o: { video, start, len, fps, speed, workH, fill: 'plate'|'blur', scale, onStage(text, 0..1), upload(n, blob), signal: {cancelled} }
 * returns { frames, width, height }
 */
export async function replaceCharacter(o) {
  const { video, start, fps, speed, fill, scale = 1, pose = 'auto', onStage, upload, signal } = o;
  const vh = video.videoHeight, vw = video.videoWidth;
  const H = Math.min(o.workH, vh), W = Math.round((H * vw / vh) / 2) * 2;
  const n = Math.round((o.len / speed) * fps);
  if (n < 2) throw new Error('Pick a clip of at least a few frames.');
  if (n > MAX_FRAMES) throw new Error(`That is ${n} frames. Character replacement handles up to ${MAX_FRAMES}; shorten the clip or lower the frame rate.`);
  const check = () => { if (signal && signal.cancelled) throw Object.assign(new Error('Cancelled.'), { quiet: true }); };
  video.pause();
  onStage('Loading the person detector', 0.01);
  const [seg, ch] = await Promise.all([segmenter(), character()]);
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d', { willReadFrequently: true });
  const timeAt = (i) => Math.min(video.duration - 0.001, start + (i * speed) / fps);
  const grab = async (i) => { await seek(video, timeAt(i)); cx.drawImage(video, 0, 0, W, H); };
  const gw = Math.ceil(W / G), gh = Math.ceil(H / G);

  // pass 1: find the main person in every frame
  const chosen = new Array(n).fill(null), box = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    check(); await grab(i);
    const res = seg.segment(cv);
    const cm = res.confidenceMasks[PERSON], m = cm.getAsFloat32Array(), mw = cm.width, mh = cm.height; // person confidence, a lower bar than argmax so thin limbs are kept
    const grid = new Uint8Array(gw * gh), lo = new Uint8Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const v = m[Math.min(mh - 1, Math.round(((y * G + G / 2) / H) * (mh - 1))) * mw + Math.min(mw - 1, Math.round(((x * G + G / 2) / W) * (mw - 1)))]; grid[y * gw + x] = v > CONF ? 1 : 0; lo[y * gw + x] = v > CONF_NEAR ? 1 : 0; }
    res.close && res.close();
    const comp = largest(dilate(grid, gw, gh), gw, gh);
    if (comp) {
      const g2 = new Uint8Array(gw * gh); for (const c of comp.cells) g2[c] = 1;
      const ex = Math.round((comp.y1 - comp.y0 + 1) * 0.45); // low-confidence cells within reach of the person join the removal mask
      for (let y = Math.max(0, comp.y0 - ex); y <= Math.min(gh - 1, comp.y1 + ex); y++) for (let x = Math.max(0, comp.x0 - ex); x <= Math.min(gw - 1, comp.x1 + ex); x++) if (lo[y * gw + x]) g2[y * gw + x] = 1;
      chosen[i] = dilate(dilate(g2, gw, gh), gw, gh);
      let x0 = gw, x1 = 0, y0 = gh, y1 = 0; // bbox of the real person cells (inside the dilated blob)
      for (const c of comp.cells) if (grid[c]) { const x = c % gw, y = (c / gw) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 >= x0) box[i] = { cx: ((x0 + x1 + 1) / 2) * G, bottom: Math.min(H, (y1 + 1) * G), h: (y1 - y0 + 1) * G, top: y0 * G, w: (x1 - x0 + 1) * G };
    }
    onStage(`Finding the person, frame ${i + 1} of ${n}`, 0.02 + 0.38 * ((i + 1) / n));
    if (i % 4 === 3) await sleep(0);
  }
  if (!box.some(Boolean)) throw new Error('No person was found in this clip. Pick a clip where a person is clearly visible.');

  // smooth the placement over time; hold through short gaps, hide through long ones
  const idx = box.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
  const hold = (key) => box.map((b, i) => { if (b) return b[key]; let near = null, dist = 1e9; for (const j of idx) { if (Math.abs(j - i) < dist) { dist = Math.abs(j - i); near = j; } } return dist <= Math.round(fps * 0.4) ? box[near][key] : null; });
  const rollMax = (arr, win) => arr.map((v, i) => { let m = null; for (let k = -win; k <= win; k++) { const u = arr[i + k]; if (u != null && (m === null || u > m)) m = u; } return m; });
  const sx = smooth(hold('cx'), 2), st = smooth(hold('top'), 2);
  const sbMax = smooth(rollMax(hold('bottom'), Math.max(2, Math.round(fps * 0.8))), 3);
  // the detector tends to lose thin legs and heels: feet stay on the floor, so use the lowest recent foot line plus a margin
  const sb = sbMax.map((b, i) => (b == null || st[i] == null ? null : Math.min(H, b + 0.09 * (b - st[i]))));
  const sh = sb.map((b, i) => (b == null || st[i] == null ? null : b - st[i]));
  // extend the removal mask down through the hip columns to that foot line, so legs are painted out too
  for (let i = 0; i < n; i++) {
    const m = chosen[i], bx = box[i]; if (!m || !bx || sb[i] == null) continue;
    const topC = (bx.top / G) | 0, botC = Math.min(gh - 1, Math.ceil(sb[i] / G)), mid = topC + (botC - topC) * 0.5, ext = new Uint8Array(m);
    for (let x = 0; x < gw; x++) {
      let low = -1; for (let y = gh - 1; y >= 0; y--) if (m[y * gw + x]) { low = y; break; }
      if (low >= mid) for (let y = low; y <= botC; y++) ext[y * gw + x] = 1;
    }
    chosen[i] = dilate(ext, gw, gh);
  }

  const plan = planPoses({ n, fps, sx, sb, sh, bw: smooth(hold('w'), 2), bh: sh, H, pose });
  const poseUsed = new Set(plan);

  // clean background plate
  let plate = null;
  if (fill === 'plate') {
    const K = Math.min(9, n), picks = Array.from({ length: K }, (_, k) => Math.round((k * (n - 1)) / Math.max(1, K - 1)));
    const shots = [];
    for (let k = 0; k < K; k++) {
      check(); await grab(picks[k]);
      shots.push({ px: cx.getImageData(0, 0, W, H).data, m: chosen[picks[k]] });
      onStage('Cleaning up the background', 0.4 + 0.08 * ((k + 1) / K)); await sleep(0);
    }
    plate = new Uint8ClampedArray(W * H * 4);
    const vals = [new Uint8Array(K), new Uint8Array(K), new Uint8Array(K)];
    const hole = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gi = (y / G | 0) * gw + (x / G | 0), p = (y * W + x) * 4; let c = 0;
      for (const s of shots) if (!(s.m && s.m[gi])) { vals[0][c] = s.px[p]; vals[1][c] = s.px[p + 1]; vals[2][c] = s.px[p + 2]; c++; }
      if (!c) { hole[y * W + x] = 1; continue; }
      for (let ch2 = 0; ch2 < 3; ch2++) { const a = vals[ch2]; for (let i = 1; i < c; i++) { const v = a[i]; let j = i - 1; while (j >= 0 && a[j] > v) { a[j + 1] = a[j]; j--; } a[j + 1] = v; } plate[p + ch2] = a[c >> 1]; }
      plate[p + 3] = 255;
    }
    fillHoles(plate, (x, y) => hole[y * W + x] === 1, W, H);
  }
  const plateCanvas = new OffscreenCanvas(W, H), pg = plateCanvas.getContext('2d');
  if (plate) pg.putImageData(new ImageData(plate, W, H), 0, 0);

  // pass 2: composite every frame and hand it to the server
  const out = new OffscreenCanvas(W, H), og = out.getContext('2d');
  const mini = new OffscreenCanvas(gw, gh), mg = mini.getContext('2d');
  const maskC = new OffscreenCanvas(W, H), mcg = maskC.getContext('2d');
  const tmp = new OffscreenCanvas(W, H), tg = tmp.getContext('2d');
  const bgC = new OffscreenCanvas(W, H), bg = bgC.getContext('2d', { willReadFrequently: true });
  const jobs = new Set();
  for (let i = 0; i < n; i++) {
    check(); await grab(i);
    og.globalCompositeOperation = 'source-over'; og.drawImage(cv, 0, 0);
    const m = chosen[i];
    if (m) {
      const im = mg.createImageData(gw, gh); for (let k = 0; k < m.length; k++) im.data[k * 4 + 3] = m[k] ? 255 : 0;
      mg.putImageData(im, 0, 0);
      mcg.clearRect(0, 0, W, H); mcg.filter = `blur(${G}px)`; mcg.imageSmoothingQuality = 'high'; mcg.drawImage(mini, 0, 0, W, H); mcg.filter = 'none';
      tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H);
      if (fill === 'plate') tg.drawImage(plateCanvas, 0, 0);
      else { // per-frame fill from the surrounding row pixels, softened
        const px = cx.getImageData(0, 0, W, H); fillHoles(px.data, (x, y) => m[(y / G | 0) * gw + (x / G | 0)] === 1, W, H);
        bg.putImageData(px, 0, 0); tg.filter = 'blur(5px)'; tg.drawImage(bgC, 0, 0); tg.filter = 'none';
      }
      tg.globalCompositeOperation = 'destination-in'; tg.drawImage(maskC, 0, 0);
      og.drawImage(tmp, 0, 0);
    }
    if (sh[i] && sh[i] > H * 0.06) {
      const P = ch[plan[i]] || ch['02-neutral'], hgt = sh[i] * scale, w = hgt * (P.sw / P.sh), t = i / fps;
      const dx = sx[i + 1] != null && sx[i - 1] != null ? Math.abs(sx[i + 1] - sx[i - 1]) * fps / 2 : 0;
      const walk = !/walk/.test(plan[i]) ? 0 : Math.min(1, dx / (sh[i] * 0.5));
      const bob = Math.sin(t * Math.PI * 2 * 1.8) * 0.012 * hgt * walk, sway = Math.sin(t * Math.PI * 2 * 0.9) * 0.02 * walk;
      og.save();
      og.fillStyle = 'rgba(0,0,0,.22)'; og.beginPath(); og.ellipse(sx[i], sb[i] - 1, w * 0.3, Math.max(2, w * 0.045), 0, 0, Math.PI * 2); og.fill();
      og.translate(sx[i], sb[i] + bob); og.rotate(sway); og.drawImage(P.img, P.sx, P.sy, P.sw, P.sh, -w / 2, -hgt, w, hgt);
      og.restore();
    }
    const blob = await out.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    const job = upload(i + 1, blob).finally(() => jobs.delete(job)); jobs.add(job);
    if (jobs.size >= 4) await Promise.race(jobs);
    onStage(`Composing frame ${i + 1} of ${n}`, 0.48 + 0.4 * ((i + 1) / n));
  }
  await Promise.all(jobs);
  return { frames: n, width: W, height: H, poses: [...poseUsed] };
}
