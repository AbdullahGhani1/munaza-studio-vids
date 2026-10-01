// Video → GIF converter view: import (link, upload, samples, tab recording) → trim → encode → download.
const FPS = [10, 15, 24, 30, 48, 60];
const RES = [[240, '240p'], [360, '360p'], [480, '480p'], [720, '720p HD'], [1080, '1080p']];
const DITHER = [['bayer', 'Bayer Dither: crisp, film-grain, hides colour banding'], ['floyd', 'Floyd-Steinberg: smooth gradients, larger file'], ['sierra', 'Sierra 2-4A: balanced, soft grain'], ['none', 'None: flat colour, smallest file']];
const PRESETS = [['2s Snippet', 2], ['3s Loop', 3], ['5s Standard', 5], ['10s Highlight', 10], ['30s Scene', 30], ['Full Video', Infinity]];
const SAMPLES = [['smpte', 'SMPTE 60FPS Color Matrix', 'Test pattern with a running clock, 8 s'], ['fractal', 'Mandelbrot zoom', 'Smooth zoom, good for dithering, 8 s'], ['rgb', 'Colour gradients', 'Spiralling gradients, 8 s']];
const I = {
  link: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 11.5a3 3 0 004.2 0l2.6-2.6a3 3 0 00-4.2-4.2l-.9.9M11.5 8.5a3 3 0 00-4.2 0L4.7 11.1a3 3 0 004.2 4.2l.9-.9"/></svg>',
  up: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13V4M6.5 7.5L10 4l3.5 3.5M4 14v2h12v-2"/></svg>',
  spark: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6zM16 14v3M14.5 15.5h3"/></svg>',
  rec: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="11" height="10" rx="2"/><path d="M13.5 9l4-2.5v7L13.5 11"/></svg>',
  play: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6z"/></svg>',
  pause: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 4h4v12H5zM11 4h4v12h-4z"/></svg>',
  loop: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V8a3 3 0 013-3h7l-2-2M16 11v1a3 3 0 01-3 3H6l2 2"/></svg>',
  dl: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v9M6.5 8.5L10 12l3.5-3.5M4 15v2h12v-2"/></svg>',
  film: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M8 7.5l4.5 2.5L8 12.5z"/></svg>',
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const tc = (t) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`; };
const sz = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

export async function viewGif({ shell, api, toast, esc, $, $$, onCleanup }) {
  const st = await api('/gif/status').catch(() => ({ ytdlp: false, ffmpeg: false, maxFps: 50 }));
  const S = { tab: 'link', item: null, start: 0, len: 3.5, fps: 60, height: 360, speed: 1, dither: 'bayer', bayer: 5, colors: 256, caption: '', capPos: 'bottom', boom: false, rev: false, loop: true, converting: false };
  const timers = [];
  onCleanup(() => { timers.forEach(clearInterval); $('#rec-modal')?.remove(); });
  const dur = () => S.item?.info?.duration || 0;
  const end = () => Math.min(dur(), S.start + S.len);
  const effFps = () => Math.min(S.fps, st.maxFps || 50);
  const outH = () => Math.min(S.height, S.item?.info?.height || S.height);
  const outW = () => Math.round(outH() * (S.item?.info ? S.item.info.width / S.item.info.height : 16 / 9) / 2) * 2;
  const frames = () => Math.round((S.len / S.speed) * effFps()) * (S.boom ? 2 : 1);
  const estBytes = () => frames() * outW() * outH() * 0.2 * ({ bayer: 1, floyd: 1.25, sierra: 1.15, none: .7 }[S.dither]) * ({ 64: .7, 128: .85, 256: 1 }[S.colors]);

  shell(`<div class="page-head gif-head"><div><h1 class="display">Video to GIF</h1><p class="muted" style="max-width:62ch;margin-top:8px">Paste a video link, upload a file or record a tab, trim the exact moment, then download a palette-optimised GIF. Clips up to 10 minutes.</p></div><div class="gif-pills mono"><span>Up to 50 fps</span><span>10 min max</span><span>2-pass palette</span></div></div>
  <div id="gif-warn"></div>
  <section class="card gif-card" aria-labelledby="g1"><div class="gif-card-head"><div><h2 id="g1">1. Import source</h2><p class="small muted">Video links from most sites, direct MP4 / WebM files, local files or a screen recording, up to 10 minutes.</p></div>
    <div class="gif-tabs" role="tablist" aria-label="Import method">${[['link', I.link, 'Video Link'], ['upload', I.up, 'Upload File'], ['samples', I.spark, 'Samples']].map(([k, ic, l]) => `<button role="tab" data-gtab="${k}" aria-selected="${k === 'link'}">${ic}${l}</button>`).join('')}<button data-gact="record" class="gif-rec">${I.rec}Record tab</button></div></div>
    <div id="gif-pane"></div><div id="gif-media"></div></section>
  <section class="card gif-card" id="gif-trim" aria-labelledby="g2" hidden></section>
  <section class="card gif-card" id="gif-engine" aria-labelledby="g3" hidden></section>`, { crumb: 'Video to GIF' });

  if (!st.ffmpeg) $('#gif-warn').innerHTML = '<div class="banner"><p><strong>ffmpeg not found.</strong> <span class="muted">Install it with</span> <code>brew install ffmpeg</code></p></div>';
  else if (!st.ytdlp) $('#gif-warn').innerHTML = '<div class="banner"><p><strong>Links need yt-dlp.</strong> <span class="muted">Install it with</span> <code>brew install yt-dlp</code> <span class="muted">then reload. Uploads and samples work without it.</span></p></div>';

  // ---------- 1. import ----------
  function drawPane() {
    $$('[data-gtab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.gtab === S.tab)));
    const p = $('#gif-pane');
    if (S.tab === 'link') {
      p.innerHTML = `<form id="gif-link" class="gif-linkrow"><input id="gif-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Paste YouTube, Vimeo, TikTok, Reddit, X or a direct MP4 / WebM link" aria-label="Video link"><button class="btn primary" id="gif-load" type="submit">${I.link}Load video</button></form><p class="small faint" style="margin-top:12px">Works with the sites yt-dlp supports, plus direct MP4 / WebM links. Only convert videos you own or have permission to use.</p>`;
      $('#gif-url').focus({ preventScroll: true });
    } else if (S.tab === 'upload') {
      p.innerHTML = `<div class="dropzone" id="gif-dz" tabindex="0" role="button">Drop a video here, or choose a file<br><span class="small faint">mp4, mov, webm, m4v, mkv · up to 1 GB · 10 minutes</span></div><input id="gif-file" type="file" accept="video/*,.mkv" hidden>`;
    } else {
      p.innerHTML = `<div class="gif-samples">${SAMPLES.map(([k, t, d]) => `<button class="gif-sample" data-sample="${k}">${I.film}<span><strong>${esc(t)}</strong><small>${esc(d)} · 640×360 · 60 fps</small></span></button>`).join('')}</div>`;
    }
  }
  function drawMedia() {
    const it = S.item, m = $('#gif-media');
    if (!it) { m.innerHTML = ''; return; }
    const info = it.info;
    const meta = info ? `Duration ${info.duration.toFixed(1)} s · ${info.fps} fps · ${info.width}×${info.height}` : esc(it.stage || '');
    const right = it.state === 'ready' ? '<span class="gif-ok">✓ Ready to trim</span>' : it.state === 'error' ? '<span class="gif-bad">Could not load</span>' : `<span class="muted small">${esc(it.stage)} ${Math.round((it.progress || 0) * 100)}%${it.speed ? ' · ' + esc(it.speed) : ''}</span> <button class="btn ghost compact" data-gact="cancel-import">Cancel</button>`;
    m.innerHTML = `<div class="gif-media"><div class="gif-media-ic">${I.film}</div><div class="grow"><div class="gif-media-t">${esc(it.title)}</div><div class="mono faint">${meta}</div>${it.state === 'error' ? `<div class="gif-bad small" role="alert" style="margin-top:4px">${esc(it.error)}</div>` : ''}${it.state === 'working' ? `<div class="gif-bar"><i style="width:${Math.round((it.progress || 0.04) * 100)}%"></i></div>` : ''}</div>${right}</div>`;
  }
  async function begin(fn) {
    if (S.item && S.item.state === 'working') return;
    const prev = S.item;
    try { S.item = await fn(); } catch (e) { toast(e.message, 'error'); return; }
    if (prev) api(`/gif/${prev.id}`, { method: 'DELETE' }).catch(() => {});
    S.start = 0; drawMedia(); $('#gif-trim').hidden = true; $('#gif-engine').hidden = true;
    if (S.item.state === 'working') poll(); else if (S.item.state === 'ready') ready();
  }
  function poll() {
    const t = setInterval(async () => {
      try { S.item = await api(`/gif/${S.item.id}`); } catch { clearInterval(t); return; }
      drawMedia();
      if (S.item.state !== 'working') { clearInterval(t); if (S.item.state === 'ready') ready(); else if (S.item.state === 'error') toast(S.item.error, 'error'); }
    }, 600);
    timers.push(t);
  }

  // ---------- 2 & 3. trim + engine ----------
  function ready() {
    S.len = Math.min(3.5, dur()); S.start = 0;
    $('#gif-trim').hidden = false; $('#gif-engine').hidden = false;
    $('#gif-trim').innerHTML = `<div class="gif-card-head"><div><h2 id="g2">2. Trim the clip</h2><p class="small muted">Scrub, step by frame, then mark the start and end. The loop button previews just the selection.</p></div></div>
      <div class="gif-stage"><video id="gif-v" src="${S.item.video}" muted playsinline preload="auto"></video></div>
      <div class="gif-ctrl"><button class="btn secondary icon-btn" id="gif-play" data-gact="play" aria-label="Play">${I.play}</button><span class="gif-sep"></span>${[['−1f', 'step', -1], ['+1f', 'step', 1], ['−0.5s', 'nudge', -.5], ['+0.5s', 'nudge', .5]].map(([l, a, v]) => `<button class="btn secondary compact" data-gact="${a}" data-v="${v}">${l}</button>`).join('')}<span class="grow"></span><button class="btn secondary compact mono" data-gact="set-start" id="gif-ss"></button><button class="btn secondary compact mono" data-gact="set-end" id="gif-se"></button><button class="btn secondary icon-btn" id="gif-loop" data-gact="loop" aria-pressed="${S.loop}" aria-label="Loop the selection" title="Loop the selection">${I.loop}</button></div>
      <div class="gif-tl-labels mono"><span>Start <b id="gif-l-s"></b></span><span class="gif-ph">Playhead <b id="gif-l-p"></b></span><span>End <b id="gif-l-e"></b></span></div>
      <div class="gif-tl" id="gif-tl" role="group" aria-label="Timeline"><div class="gif-sel" id="gif-selbar"><span id="gif-selt"></span></div><div class="gif-h s" id="gif-hs" tabindex="0" role="slider" aria-label="Start"></div><div class="gif-h e" id="gif-he" tabindex="0" role="slider" aria-label="End"></div><div class="gif-head-line" id="gif-pl"></div></div>
      <div class="gif-sliders"><label><span class="row small" style="justify-content:space-between"><span class="muted">Start time (offset)</span><b class="num mono" id="gif-v-s"></b></span><input id="gif-r-s" type="range" min="0" step="0.05"></label><label><span class="row small" style="justify-content:space-between"><span class="muted">Clip duration (max 10 min)</span><b class="num mono" id="gif-v-d"></b></span><input id="gif-r-d" type="range" min="0.1" step="0.05"></label></div>
      <div class="gif-presets small"><span class="muted">Quick presets:</span>${PRESETS.map(([l, v]) => `<button class="btn secondary compact" data-gact="preset" data-v="${v}">${l}</button>`).join('')}</div>`;
    drawEngine();
    const v = $('#gif-v');
    v.addEventListener('loadedmetadata', () => { $('#gif-r-s').max = dur(); $('#gif-r-d').max = dur(); syncAll(); v.currentTime = 0; });
    v.addEventListener('timeupdate', () => { if (S.loop && !v.paused && v.currentTime >= end() - 0.02) v.currentTime = S.start; syncPlayhead(); });
    v.addEventListener('seeked', syncPlayhead);
    v.addEventListener('play', () => { $('#gif-play').innerHTML = I.pause; if (S.loop && (v.currentTime < S.start || v.currentTime >= end())) v.currentTime = S.start; });
    v.addEventListener('pause', () => { $('#gif-play').innerHTML = I.play; });
    wireTimeline();
    syncAll();
    $('#gif-trim').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  function drawEngine() {
    $('#gif-engine').innerHTML = `<div class="gif-card-head"><div><h2 id="g3">3. GIF engine <span class="gif-tag mono">50 fps max</span></h2><p class="small muted">Frame rate, size, dithering and colours. The palette is built from the whole clip, then applied.</p></div><button class="btn primary gif-go" id="gif-go" data-gact="generate">${I.spark}Generate GIF</button></div>
      <div class="gif-grid">
        <div class="gif-opt"><div class="row" style="justify-content:space-between"><span class="label">Frame rate</span><b class="num" id="gif-o-fps"></b></div><div class="gif-seg" data-seg="fps">${FPS.map((f) => `<button data-v="${f}" aria-pressed="${f === S.fps}">${f}</button>`).join('')}</div><p class="small faint" id="gif-fps-note"></p></div>
        <div class="gif-opt"><div class="row" style="justify-content:space-between"><span class="label">Output size</span><b class="num" id="gif-o-res"></b></div><div class="gif-seg" data-seg="height">${RES.map(([h, l]) => `<button data-v="${h}" aria-pressed="${h === S.height}">${l}</button>`).join('')}</div><p class="small faint">Taller output is crisper and larger. It never upscales the source.</p></div>
        <div class="gif-opt"><div class="row" style="justify-content:space-between"><span class="label">Playback speed</span><b class="num" id="gif-o-spd"></b></div><input id="gif-speed" type="range" min="0.25" max="3" step="0.25" value="${S.speed}"><div class="row small faint" style="justify-content:space-between"><span>0.25× slow-mo</span><span>1×</span><span>3× fast</span></div></div>
        <div class="gif-opt"><label class="label" for="gif-dither">Dithering</label><select id="gif-dither">${DITHER.map(([k, l]) => `<option value="${k}" ${k === S.dither ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><div class="row small" id="gif-bayer" style="gap:6px"><span class="muted">Bayer scale</span>${[1, 2, 3, 4, 5].map((n) => `<button class="gif-chip" data-seg="bayer" data-v="${n}" aria-pressed="${n === S.bayer}">${n}</button>`).join('')}</div></div>
        <div class="gif-opt"><div class="row" style="justify-content:space-between"><span class="label">Palette</span><b class="num" id="gif-o-col"></b></div><div class="gif-seg" data-seg="colors">${[64, 128, 256].map((c) => `<button data-v="${c}" aria-pressed="${c === S.colors}">${c} colours</button>`).join('')}</div><p class="small faint">Fewer colours means a smaller file.</p></div>
        <div class="gif-opt"><label class="label" for="gif-cap">Caption (optional)</label><div class="row" style="gap:8px;flex-wrap:nowrap"><input id="gif-cap" type="text" maxlength="80" placeholder="e.g. Stretch for 30 seconds" value="${esc(S.caption)}"><select id="gif-cappos" style="width:110px"><option value="bottom">Bottom</option><option value="top">Top</option></select></div><div class="row small" style="gap:18px"><label class="row" style="gap:6px"><input type="checkbox" id="gif-boom" ${S.boom ? 'checked' : ''}> Boomerang</label><label class="row" style="gap:6px"><input type="checkbox" id="gif-rev" ${S.rev ? 'checked' : ''}> Reverse</label></div></div>
      </div>
      <div class="gif-stats mono" id="gif-stats"></div><div id="gif-result"></div>`;
    syncEngine();
  }
  function syncEngine() {
    if (!$('#gif-stats')) return;
    $('#gif-o-fps').textContent = `${S.fps} fps`;
    $('#gif-o-res').textContent = `${outW()}×${outH()}`;
    $('#gif-o-spd').textContent = `${S.speed}×`;
    $('#gif-o-col').textContent = `${S.colors} colours`;
    $('#gif-fps-note').textContent = S.fps > effFps() ? `A GIF stores frame delays in 10 ms steps, so ${S.fps} fps is encoded at ${effFps()} fps, the fastest that plays true.` : `${S.fps} fps ${S.fps >= 30 ? 'looks fluid.' : 'keeps the file small.'}`;
    $('#gif-bayer').style.display = S.dither === 'bayer' ? '' : 'none';
    $$('[data-seg]').forEach((g) => { const key = g.dataset.seg; if (g.classList.contains('gif-seg')) $$('button', g).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === S[key]))); else g.setAttribute('aria-pressed', String(+g.dataset.v === S[key])); });
    const f = frames(), d = (S.len / S.speed) * (S.boom ? 2 : 1), big = estBytes() > 50e6;
    $('#gif-stats').innerHTML = `<span>Duration: <b>${d.toFixed(2)}s</b></span><span>Frames: <b class="acc">${f}</b></span><span>Rate: <b>${effFps()} fps</b></span><span>Est. size: <b>~${sz(estBytes())}</b>${big ? ' <span class="gif-warn">large</span>' : ''}</span><span class="grow faint end">2-pass palette, ${S.colors} colours</span>`;
  }

  // ---------- trim plumbing ----------
  const v = () => $('#gif-v');
  function syncAll() {
    if (!dur() || !$('#gif-tl')) return;
    S.start = clamp(S.start, 0, Math.max(0, dur() - 0.1)); S.len = clamp(S.len, 0.1, Math.min(600, dur() - S.start));
    const pc = (t) => `${(t / dur()) * 100}%`;
    $('#gif-selbar').style.left = pc(S.start); $('#gif-selbar').style.width = `${(S.len / dur()) * 100}%`;
    $('#gif-hs').style.left = pc(S.start); $('#gif-he').style.left = pc(end());
    $('#gif-selt').textContent = `${S.len.toFixed(1)}s`;
    $('#gif-l-s').textContent = tc(S.start); $('#gif-l-e').textContent = tc(end());
    $('#gif-r-s').max = Math.max(0, dur() - 0.1); $('#gif-r-s').value = S.start; $('#gif-r-d').max = Math.min(600, dur() - S.start); $('#gif-r-d').value = S.len;
    $('#gif-v-s').textContent = `${S.start.toFixed(2)}s`; $('#gif-v-d').textContent = `${S.len.toFixed(2)}s`;
    $('#gif-hs').setAttribute('aria-valuetext', tc(S.start)); $('#gif-he').setAttribute('aria-valuetext', tc(end()));
    syncPlayhead(); syncEngine();
  }
  function syncPlayhead() {
    const el = v(); if (!el || !dur() || !$('#gif-pl')) return;
    const t = el.currentTime;
    $('#gif-pl').style.left = `${(t / dur()) * 100}%`; $('#gif-l-p').textContent = tc(t);
    $('#gif-ss').textContent = `Set start [${tc(t).slice(0, 8)}]`; $('#gif-se').textContent = `Set end [${tc(t).slice(0, 8)}]`;
  }
  function wireTimeline() {
    const tl = $('#gif-tl');
    const at = (e) => clamp(((e.clientX - tl.getBoundingClientRect().left) / tl.clientWidth) * dur(), 0, dur());
    tl.addEventListener('pointerdown', (e) => {
      const h = e.target.closest('.gif-h');
      tl.setPointerCapture(e.pointerId);
      const mode = h ? (h.classList.contains('s') ? 's' : 'e') : 'seek';
      const move = (ev) => {
        const t = at(ev);
        if (mode === 'seek') { v().currentTime = t; return; }
        if (mode === 's') { const e2 = end(); S.start = clamp(t, 0, e2 - 0.1); S.len = e2 - S.start; v().currentTime = S.start; } else { S.len = clamp(t - S.start, 0.1, Math.min(600, dur() - S.start)); v().currentTime = end(); }
        syncAll();
      };
      move(e);
      const up = () => { tl.removeEventListener('pointermove', move); tl.removeEventListener('pointerup', up); tl.removeEventListener('pointercancel', up); };
      tl.addEventListener('pointermove', move); tl.addEventListener('pointerup', up); tl.addEventListener('pointercancel', up);
    });
    tl.addEventListener('keydown', (e) => {
      const h = e.target.closest('.gif-h'); if (!h || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault(); const d = (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 0.1);
      if (h.classList.contains('s')) { const e2 = end(); S.start = clamp(S.start + d, 0, e2 - 0.1); S.len = e2 - S.start; } else S.len = clamp(S.len + d, 0.1, dur() - S.start);
      syncAll();
    });
  }

  // ---------- generate ----------
  async function captionPng() {
    const text = S.caption.trim(); if (!text) return null;
    await document.fonts.ready;
    const w = outW(), h = outH(), pad = Math.round(h * 0.04);
    const c = document.createElement('canvas'), g = c.getContext('2d');
    let fs = Math.max(14, Math.round(h * 0.085));
    const setFont = () => { g.font = `700 ${fs}px Inter, "Noto Sans", system-ui, sans-serif`; };
    setFont(); while (fs > 10 && g.measureText(text).width > w - pad * 2) { fs -= 1; setFont(); }
    c.width = w; c.height = fs + pad * 2; setFont(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'auto';
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, w, c.height);
    g.lineJoin = 'round'; g.lineWidth = Math.max(2, fs / 7); g.strokeStyle = '#000'; g.strokeText(text, w / 2, c.height / 2 + 1); g.fillStyle = '#fff'; g.fillText(text, w / 2, c.height / 2 + 1);
    return c.toDataURL('image/png');
  }
  async function generate() {
    if (S.converting) return; S.converting = true;
    const go = $('#gif-go'); go.setAttribute('aria-disabled', 'true'); v()?.pause();
    $('#gif-result').innerHTML = `<div class="gif-prog" role="status"><div class="row small" style="justify-content:space-between"><span id="gif-ps">Starting</span><span class="num" id="gif-pp">0%</span></div><div class="gif-bar"><i id="gif-pb" style="width:2%"></i></div><button class="btn ghost compact" data-gact="cancel-convert" style="margin-top:8px">Cancel</button></div>`;
    try {
      const body = { start: S.start, duration: S.len, fps: S.fps, height: S.height, speed: S.speed, dither: S.dither, bayerScale: S.bayer, colors: S.colors, boomerang: S.boom, reverse: S.rev, captionPos: S.capPos, captionPng: await captionPng() };
      S.item = await api(`/gif/${S.item.id}/convert`, { method: 'POST', json: body });
      await new Promise((resolve, reject) => {
        const t = setInterval(async () => {
          try {
            S.item = await api(`/gif/${S.item.id}`); const c = S.item.convert;
            $('#gif-ps') && ($('#gif-ps').textContent = c.stage); $('#gif-pp') && ($('#gif-pp').textContent = `${Math.round(c.progress * 100)}%`); $('#gif-pb') && ($('#gif-pb').style.width = `${Math.max(2, c.progress * 100)}%`);
            if (c.state === 'done') { clearInterval(t); resolve(); } else if (c.state === 'error') { clearInterval(t); reject(new Error(c.error)); } else if (c.state === 'cancelled') { clearInterval(t); reject(Object.assign(new Error('Cancelled.'), { quiet: true })); }
          } catch (e) { clearInterval(t); reject(e); }
        }, 400);
        timers.push(t);
      });
      const c = S.item.convert;
      $('#gif-result').innerHTML = `<div class="gif-out"><img src="${c.url}" alt="Generated GIF preview" width="${c.width}" height="${c.height}"><div class="gif-out-side"><h3>Your GIF is ready</h3><p class="mono muted">${c.width}×${c.height} · ${c.frames} frames · ${c.seconds.toFixed(2)} s · ${c.fps} fps</p><p class="gif-size">${sz(c.size)}</p><div class="row"><a class="btn primary" href="${c.url}&download=1" download>${I.dl}Download GIF</a><button class="btn secondary" data-gact="generate">Re-generate</button></div><p class="small faint">Too big? Lower the size, frame rate or colours and generate again.</p></div></div>`;
      toast(`GIF ready: ${sz(c.size)}.`);
    } catch (e) {
      $('#gif-result').innerHTML = e.quiet ? '' : `<p class="gif-bad" role="alert" style="margin-top:16px">${esc(e.message)}</p>`;
      if (!e.quiet) toast(e.message, 'error');
    } finally { S.converting = false; $('#gif-go')?.removeAttribute('aria-disabled'); }
  }

  // ---------- screen recording ----------
  function record() {
    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) return toast('This browser cannot record a tab. Use Chrome or Edge, or upload a file.', 'error');
    const el = document.createElement('div'); el.id = 'rec-modal'; el.className = 'modal-scrim';
    el.innerHTML = `<div class="modal wide" role="dialog" aria-modal="true" aria-label="Record a tab"><h2>Record a tab or screen</h2><p class="muted small" style="margin:4px 0 16px">Pick the tab playing your video. The studio records it (up to 10 minutes) and loads it into the trimmer. No sound is captured.</p><div class="gif-recview"><div id="rec-state"><strong>Ready to record</strong><br><span class="small muted">Choose a tab, window or screen in the next dialog.</span></div></div><div class="actions"><button class="btn secondary" data-r="close">Close</button><button class="btn primary" data-r="start">${I.rec}Choose a tab and start</button></div></div>`;
    document.body.append(el);
    let stream = null, rec = null, tick = null, chunks = [];
    const done = () => { clearInterval(tick); stream?.getTracks().forEach((t) => t.stop()); el.remove(); };
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-r]'); if (!b && e.target !== el) return;
      const r = b?.dataset.r;
      if (r === 'close' || e.target === el) { if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } return done(); }
      if (r === 'start') {
        try { stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60 } }, audio: false }); } catch { return toast('Recording was cancelled.', 'error'); }
        const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
        rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
        const t0 = performance.now();
        rec.onstop = async () => {
          const blob = new Blob(chunks, { type: 'video/webm' }); done();
          if (!blob.size) return;
          $('#gif-media').innerHTML = '<div class="gif-media"><div class="gif-media-ic">' + I.film + '</div><div class="grow"><div class="gif-media-t">Recording</div><div class="mono faint">Uploading…</div></div></div>';
          begin(() => api('/gif/upload?name=recording.webm', { method: 'POST', body: blob }));
        };
        stream.getVideoTracks()[0].addEventListener('ended', () => rec.state !== 'inactive' && rec.stop());
        rec.start(1000);
        $('.actions', el).innerHTML = '<button class="btn danger" data-r="stop">Stop recording</button>';
        tick = setInterval(() => { const s = (performance.now() - t0) / 1000; $('#rec-state').innerHTML = `<strong class="gif-bad">● Recording ${tc(s).slice(0, 5)}</strong><br><span class="small muted">Stops by itself at 10:00.</span>`; if (s >= 600 && rec.state !== 'inactive') rec.stop(); }, 250);
      }
      if (r === 'stop' && rec?.state !== 'inactive') rec.stop();
    });
  }

  // ---------- events ----------
  const root = $('#main');
  root.addEventListener('submit', (e) => { if (e.target.id === 'gif-link') { e.preventDefault(); const url = $('#gif-url').value.trim(); if (!url) return toast('Paste a video link first.', 'error'); begin(() => api('/gif/import', { method: 'POST', json: { url } })); } });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'gif-file' && t.files[0]) { const f = t.files[0]; begin(() => api(`/gif/upload?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f })); }
    if (t.id === 'gif-dither') { S.dither = t.value; syncEngine(); }
    if (t.id === 'gif-boom') { S.boom = t.checked; if (t.checked) { S.rev = false; $('#gif-rev').checked = false; } syncEngine(); }
    if (t.id === 'gif-rev') { S.rev = t.checked; if (t.checked) { S.boom = false; $('#gif-boom').checked = false; } syncEngine(); }
    if (t.id === 'gif-cappos') S.capPos = t.value;
  });
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'gif-r-s') { const e2 = end(); S.start = +t.value; S.len = Math.min(S.len, dur() - S.start); if (e2 > dur()) S.len = dur() - S.start; v().currentTime = S.start; syncAll(); }
    if (t.id === 'gif-r-d') { S.len = +t.value; syncAll(); }
    if (t.id === 'gif-speed') { S.speed = +t.value; syncEngine(); }
    if (t.id === 'gif-cap') { S.caption = t.value; }
  });
  root.addEventListener('dragover', (e) => { if (e.target.closest('#gif-dz')) { e.preventDefault(); e.target.closest('#gif-dz').classList.add('over'); } });
  root.addEventListener('dragleave', (e) => e.target.closest('#gif-dz')?.classList.remove('over'));
  root.addEventListener('drop', (e) => { const dz = e.target.closest('#gif-dz'); if (!dz) return; e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) begin(() => api(`/gif/upload?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f })); });
  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-gtab]'); if (tab) { S.tab = tab.dataset.gtab; drawPane(); return; }
    if (e.target.closest('#gif-dz')) { $('#gif-file').click(); return; }
    const sm = e.target.closest('[data-sample]'); if (sm) { begin(() => api('/gif/sample', { method: 'POST', json: { kind: sm.dataset.sample } })); return; }
    const seg = e.target.closest('[data-seg] button, button[data-seg]');
    if (seg) { const key = (seg.closest('.gif-seg') || seg).dataset.seg; S[key] = +seg.dataset.v; syncEngine(); return; }
    const b = e.target.closest('[data-gact]'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const el = v(), a = b.dataset.gact, val = +b.dataset.v, fr = 1 / (S.item?.info?.fps || 30);
    if (a === 'record') return record();
    if (a === 'cancel-import') return api(`/gif/${S.item.id}/cancel`, { method: 'POST' }).then((x) => { S.item = x; drawMedia(); });
    if (a === 'cancel-convert') return api(`/gif/${S.item.id}/cancel`, { method: 'POST' });
    if (a === 'play') return el.paused ? el.play() : el.pause();
    if (a === 'step') { el.pause(); el.currentTime = clamp(el.currentTime + val * fr, 0, dur()); }
    if (a === 'nudge') el.currentTime = clamp(el.currentTime + val, 0, dur());
    if (a === 'set-start') { const e2 = end(), t = clamp(el.currentTime, 0, dur() - 0.1); S.start = t; S.len = e2 - t >= 0.1 ? e2 - t : Math.min(3.5, dur() - t); syncAll(); }
    if (a === 'set-end') { const t = el.currentTime; if (t > S.start + 0.05) { S.len = t - S.start; syncAll(); } else toast('Move the playhead after the start first.', 'error'); }
    if (a === 'loop') { S.loop = !S.loop; b.setAttribute('aria-pressed', String(S.loop)); }
    if (a === 'preset') { S.len = Math.min(val, dur() - S.start); if (val === Infinity) { S.start = 0; S.len = Math.min(dur(), 600); } el.currentTime = S.start; syncAll(); }
    if (a === 'generate') generate();
  });
  drawPane();
}
