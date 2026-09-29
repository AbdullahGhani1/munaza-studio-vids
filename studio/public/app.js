// Video Studio UI: vanilla ES modules, hash router, no build step.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
const fmt = (t) => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; };
const rel = (iso) => { const d = (Date.now() - new Date(iso)) / 1000; if (d < 60) return 'just now'; if (d < 3600) return `${Math.floor(d / 60)} min ago`; if (d < 86400) return `${Math.floor(d / 3600)} hours ago`; return `${Math.floor(d / 86400)} days ago`; };
const bytes = (n) => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n > 1e3 ? (n / 1e3).toFixed(0) + ' KB' : n + ' B';
const SCENE_COLORS = ['#D97757', '#6C9BEF', '#3FB68B', '#F0A93B', '#B58CF0', '#F06BA0', '#5CC8D6', '#A8A69C'];
const STAGES = [['brief', 'Brief', 'Project input summary'], ['reference', 'Reference review', 'Frames and style guide'], ['plan', 'Plan', 'Storyboard and shot list'], ['build', 'Build', 'Claude Code writes the renderer'], ['animatic', 'Animatic', 'Low-resolution preview'], ['audio', 'Audio prep', 'Beat map and sound'], ['critique', 'Critique', 'Scores, proofs and issues'], ['final', 'Final render', 'MP4 export'], ['delivered', 'Delivered', 'Deliverables']];
const TABS = [['plan', 'Plan'], ['scenes', 'Scenes'], ['preview', 'Preview'], ['sound', 'Sound'], ['assets', 'Assets'], ['files', 'Files'], ['review', 'Review']];
const STAGE_TAB = { brief: 'plan', reference: 'assets', plan: 'plan', build: 'preview', animatic: 'preview', audio: 'sound', critique: 'review', final: 'review', delivered: 'review' };
const ICON = {
  check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"/></svg>',
  dot: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="5"/></svg>',
  alert: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 3l8 14H2z"/><path d="M10 8v4M10 14.5v.1"/></svg>',
  clock: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/></svg>',
  bolt: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2L4 11h5l-1 7 7-9h-5z"/></svg>',
  pencil: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l1-4L14 3l3 3L7 16z"/></svg>',
};
const statusIcon = { Draft: 'pencil', Planning: 'clock', Building: 'bolt', 'Preview ready': 'check', Rendering: 'bolt', Complete: 'check', 'Needs attention': 'alert' };
const chip = (s) => `<span class="chip s-${String(s).toLowerCase().replace(/\s+/g, '-')}">${ICON[statusIcon[s]] || ICON.dot}${esc(s)}</span>`;

// ---------- infrastructure ----------
async function api(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: {} };
  if (opts.json !== undefined) { init.body = JSON.stringify(opts.json); init.headers['Content-Type'] = 'application/json'; }
  if (opts.body) init.body = opts.body;
  let r;
  try { r = await fetch('/api' + path, init); } catch { throw Object.assign(new Error('The studio server is not reachable. Start it with npm run studio.'), { status: 0 }); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: r.status, data });
  return data;
}
function toast(msg, kind = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'error' ? ' error' : '');
  el.textContent = msg;
  $('#toasts').append(el);
  (kind === 'error' ? $('#alert') : $('#live')).textContent = msg;
  if (kind !== 'error') setTimeout(() => el.remove(), 6000); else el.addEventListener('click', () => el.remove());
}
function modal({ title, body, actions, wide }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const el = document.createElement('div');
    el.className = 'modal-scrim';
    el.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2><div>${body}</div><div class="actions">${actions.map((a, i) => `<button class="btn ${a.kind || 'secondary'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div></div>`;
    document.body.append(el);
    const close = (v) => { el.remove(); document.removeEventListener('keydown', key); prev && prev.focus && prev.focus(); resolve(v); };
    const key = (e) => { if (e.key === 'Escape') close(null); if (e.key === 'Tab') { const f = $$('button,textarea,input', el); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } };
    document.addEventListener('keydown', key);
    el.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) close(actions[+b.dataset.i].value); else if (e.target === el) close(null); });
    (el.querySelector('.btn.primary, .btn.danger') || el.querySelector('.btn')).focus();
  });
}
const confirmBox = (title, text, label, kind = 'primary') => modal({ title, body: `<p class="muted">${esc(text)}</p>`, actions: [{ label: 'Cancel', value: false }, { label, kind, value: true }] });

let preflightCache = null;
async function getPreflight(force) { if (!preflightCache || force) preflightCache = await api('/preflight').catch(() => null); return preflightCache; }
function banner() {
  const bad = (preflightCache?.checks || []).filter((c) => !c.ok);
  if (!bad.length) return '';
  return `<div class="banner" role="status"><div style="flex:1;min-width:260px">${bad.map((c) => `<p><strong>${esc(c.label)} not found.</strong> <span class="muted">${esc(c.fix)}</span> <code>${esc(c.fix)}</code></p>`).join('')}</div><button class="btn secondary compact" data-act="recheck">Check again</button></div>`;
}
function shell(inner, { crumb, action } = {}) {
  app.innerHTML = `<header class="topbar"><a class="brand" href="#/"><i></i>Video Studio</a><nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Projects</a>${crumb ? `<span>/</span><span class="cur" title="${esc(crumb)}">${esc(crumb)}</span>` : ''}</nav><div class="spacer"></div>${action || ''}<label class="row small muted" style="gap:6px;cursor:pointer"><input type="checkbox" id="reduce" ${document.documentElement.dataset.reduce === '1' ? 'checked' : ''}> Reduce motion</label></header>${banner()}<main id="main" class="route" tabindex="-1">${inner}</main>`;
}

// ---------- state ----------
let P = null;            // current project
let plan = null;         // editable working copy of scenes
let dirty = false;
let selScene = 0;
let view = null;

// ---------- router ----------
async function route() {
  cleanup();
  const h = location.hash.replace(/^#/, '') || '/';
  const parts = h.split('/').filter(Boolean);
  await getPreflight();
  try {
    if (!parts.length) return await viewProjects();
    if (parts[0] === 'new') return viewNew();
    if (parts[0] === 'p' && parts[1]) return await viewProject(parts[1], parts[2] || null);
    location.hash = '#/';
  } catch (e) {
    shell(`<div class="empty"><h2>${e.status === 404 ? 'Project not found' : 'Something went wrong'}</h2><p class="muted">${esc(e.message)}</p><a class="btn primary" href="#/">Back to projects</a></div>`);
  }
  $('#main')?.focus({ preventScroll: true });
}
window.addEventListener('hashchange', async () => {
  route();
});
let cleanups = [];
function cleanup() { cleanups.forEach((f) => f()); cleanups = []; }

// ---------- Projects ----------
async function viewProjects() {
  const list = await api('/projects');
  const draw = () => {
    const q = ($('#q')?.value || '').toLowerCase(), st = $('#st')?.value || '';
    const items = list.filter((p) => (!q || (p.name + ' ' + p.topic).toLowerCase().includes(q)) && (!st || p.status === st));
    $('#grid').innerHTML = items.length ? items.map(card).join('') : `<p class="muted">No projects match.</p>`;
  };
  const card = (p) => {
    const ar = p.outputWidth / p.outputHeight, bw = ar >= 1 ? 88 : Math.round(88 * ar), bh = ar >= 1 ? Math.round(88 / ar) : 88;
    const bg = p.palette ? p.palette[0] : '#1C1C1A';
    return `<div class="card link" style="position:relative"><a href="#/p/${p.id}/${p.stage === 'plan' ? 'plan' : STAGE_TAB[p.stage] || 'plan'}" style="color:inherit;text-decoration:none;display:block"><div class="thumb">${p.thumb ? `<img alt="" src="${p.thumb}">` : `<div class="shape" style="width:${bw}px;height:${bh}px;background:${bg}"></div>`}</div><div class="card-body"><div class="name">${esc(p.name)}</div><p class="topic small">${esc(p.topic)}</p><div class="row small muted num"><span>${p.durationSeconds} s · ${aspect(p.outputWidth, p.outputHeight)} · ${p.outputWidth}×${p.outputHeight}</span></div><div class="row" style="justify-content:space-between">${chip(p.status)}<span class="small faint" title="${new Date(p.updatedAt).toLocaleString()}">${rel(p.updatedAt)}</span></div></div></a><div class="menu" style="position:absolute;top:8px;right:8px"><button class="btn ghost icon-btn" style="background:rgba(20,20,19,.7)" aria-label="More actions for ${esc(p.name)}" aria-haspopup="true" data-act="menu" data-id="${p.id}">⋯</button></div></div>`;
  };
  shell(`<div class="page-head"><div><h1 class="display">Projects</h1></div><a class="btn primary" href="#/new">New video</a></div>${list.length ? `<div class="filters"><input id="q" type="search" placeholder="Search name or topic" aria-label="Search projects"><select id="st" aria-label="Filter by status"><option value="">All statuses</option>${['Draft', 'Planning', 'Building', 'Preview ready', 'Rendering', 'Complete', 'Needs attention'].map((s) => `<option>${s}</option>`).join('')}</select></div><div id="grid" class="grid"></div>` : `<div class="empty card"><h2>Start with five inputs</h2><ol><li>Topic: the one idea</li><li>Reference video (optional)</li><li>Visual style</li><li>Length</li><li>Output size</li></ol><a class="btn primary" href="#/new">New video</a></div>`}`, {});
  if (list.length) {
    draw();
    let tm; $('#q').addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(draw, 200); });
    $('#st').addEventListener('change', draw);
  }
}
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function aspect(w, h) { const g = gcd(w, h), a = w / g, b = h / g; return a <= 32 && b <= 32 ? `${a}:${b}` : (w / h).toFixed(2) + ':1'; }

// ---------- New video ----------
const PRESET_SIZES = { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080], '4:5': [1080, 1350] };
let STYLES = null;
async function viewNew() {
  if (!STYLES) STYLES = (await api('/meta')).styles;
  let draft = {}; try { draft = JSON.parse(localStorage.getItem('studio.draft') || '{}'); } catch { /* ignore */ }
  let file = null;
  const styleOpts = Object.values(STYLES).map((s) => `<option value="${esc(s.label)}">`).join('');
  shell(`<div class="narrow-note small">Editing works best in a wider window.</div><form id="brief" novalidate class="brief"><div><h1 class="display" style="margin-bottom:8px">New video</h1><p class="muted" style="margin-bottom:var(--space-12);max-width:60ch">Answer five questions. We build a plan for you to approve. Nothing renders yet.</p>
    <div class="field"><label for="topic">Topic</label><textarea id="topic" name="topic" maxlength="600" placeholder="One central idea, who it is for, and what they should take away.">${esc(draft.topic || '')}</textarea><div class="help" id="topic-h"><span id="topic-c"></span></div><div class="error" id="e-topic" hidden></div></div>
    <div class="field"><span class="label" id="ref-l">Reference video (optional)</span><div class="dropzone" id="dz" tabindex="0" role="button" aria-labelledby="ref-l">Drop a video or image, or choose a file<br><span class="small faint">mp4, mov, webm, m4v, png, jpg, webp · up to 500 MB</span></div><input id="file" type="file" accept="video/*,image/*" hidden><div id="filerow"></div><input id="rlink" type="text" placeholder="Or paste a direct link (https://…/clip.mp4) or a file path on this computer" aria-label="Reference link or file path" style="margin-top:8px"><div class="error" id="e-rlink" hidden></div><div class="help">We borrow pacing, palette and type. We never copy the story, logos or characters.</div></div>
    <div class="field"><label for="style">Visual style</label><input id="style" name="style" list="styles" autocomplete="off" placeholder="Choose a preset or describe your own" value="${esc(draft.style || '')}"><datalist id="styles">${styleOpts}</datalist><div class="error" id="e-style" hidden></div></div>
    <div class="row" style="align-items:flex-start"><div class="field grow"><label for="len">Length</label><select id="len" name="len">${[10, 15, 20, 30, 45, 60].map((n) => `<option value="${n}" ${String(draft.len || 30) === String(n) ? 'selected' : ''}>${n} s</option>`).join('')}<option value="custom" ${draft.len === 'custom' ? 'selected' : ''}>Custom…</option></select><input id="lenc" type="number" min="5" max="180" step="1" placeholder="Seconds (5–180)" value="${esc(draft.lenc || '')}" ${draft.len === 'custom' ? '' : 'hidden'} aria-label="Custom length in seconds"><div class="error" id="e-durationSeconds" hidden></div></div>
    <div class="field grow"><label for="size">Output size</label><select id="size" name="size">${Object.entries(PRESET_SIZES).map(([k, [w, h]]) => `<option value="${k}" ${(draft.size || '9:16') === k ? 'selected' : ''}>${k} ${{ '9:16': 'vertical', '1:1': 'square', '16:9': 'landscape', '4:5': 'portrait' }[k]} (${w}×${h})</option>`).join('')}<option value="custom" ${draft.size === 'custom' ? 'selected' : ''}>Custom…</option></select><div class="row" id="szc" ${draft.size === 'custom' ? '' : 'hidden'}><input id="cw" type="number" placeholder="Width" value="${esc(draft.cw || '')}" aria-label="Width in pixels" style="width:48%"><input id="ch" type="number" placeholder="Height" value="${esc(draft.ch || '')}" aria-label="Height in pixels" style="width:48%"></div><div class="error" id="e-size" hidden></div></div></div>
    <details class="adv"><summary>Advanced</summary><div class="field"><label for="name">Project name</label><input id="name" name="name" maxlength="60" placeholder="Derived from the topic" value="${esc(draft.name || '')}"><div class="error" id="e-name" hidden></div></div><div class="row"><div class="field grow"><label for="fps">Frame rate</label><select id="fps"><option>24</option><option selected>30</option><option>60</option></select></div><div class="field grow"><label for="seed">Seed</label><input id="seed" type="number" placeholder="Random, then fixed"></div></div><div class="field"><label for="fw">Render framework</label><select id="fw"><option value="seek">Single HTML + window.seek(t) (recommended)</option><option value="remotion">Remotion (series, templates, data-driven)</option><option value="hyperframes">HyperFrames (HTML + GSAP)</option></select></div></details>
    <div class="submitbar"><button class="btn primary" id="go" type="submit">Build my video plan</button><a class="btn ghost" href="#/" id="cancel">Cancel</a><span class="help" id="goh"></span></div></div>
    <aside class="aspect" aria-label="Output size preview"><span class="label">Frame preview</span><div class="box"><div class="frame" id="fr"></div></div><div class="num" id="dims"></div></aside></form>`);
  const f = $('#brief');
  const setErr = (k, msg) => { const e = $('#e-' + k); if (!e) return; e.hidden = !msg; e.innerHTML = msg ? ICON.alert.replace('<svg', '<svg width="14" height="14"') + esc(msg) : ''; const inp = k === 'topic' ? $('#topic') : k === 'style' ? $('#style') : k === 'name' ? $('#name') : k === 'durationSeconds' ? $('#len') : $('#size'); inp?.classList.toggle('err', !!msg); if (inp) { msg ? inp.setAttribute('aria-describedby', 'e-' + k) : inp.removeAttribute('aria-describedby'); } };
  const dims = () => { if ($('#size').value === 'custom') return [+$('#cw').value, +$('#ch').value]; return PRESET_SIZES[$('#size').value]; };
  const drawShape = () => { const [w, h] = dims(); const fr = $('#fr'); if (w > 0 && h > 0) { const m = 240, s = Math.min(m / w, m / h); fr.style.width = w * s + 'px'; fr.style.height = h * s + 'px'; fr.textContent = aspect(w, h); $('#dims').textContent = `${w} × ${h} px`; } else { fr.style.width = fr.style.height = '80px'; fr.textContent = '?'; $('#dims').textContent = 'Enter width and height'; } };
  const styleKey = () => { const v = $('#style').value.trim(); const hit = Object.entries(STYLES).find(([k, s]) => s.label.toLowerCase() === v.toLowerCase() || k === v.toLowerCase()); return hit ? { style: hit[0], customStyle: '' } : v ? { style: 'custom', customStyle: v } : { style: '', customStyle: '' }; };
  const payload = () => { const sk = styleKey(); const [w, h] = dims(); return { topic: $('#topic').value, ...sk, durationSeconds: $('#len').value === 'custom' ? +$('#lenc').value : +$('#len').value, size: $('#size').value, width: w, height: h, fps: +$('#fps').value, name: $('#name').value, seed: $('#seed').value, framework: $('#fw').value }; };
  const validate = (b) => {
    const e = {};
    if (b.topic.trim().length < 10) e.topic = 'Add a sentence about what the video is for.';
    if (!b.style || (b.style === 'custom' && (b.customStyle.length < 3 || b.customStyle.length > 120))) e.style = 'Choose a style or describe your own.';
    if (!Number.isInteger(b.durationSeconds) || b.durationSeconds < 5 || b.durationSeconds > 180) e.durationSeconds = 'Enter a length between 5 and 180 seconds.';
    const ok = (n) => Number.isInteger(n) && n >= 240 && n <= 4096 && n % 2 === 0;
    if (!ok(b.width) || !ok(b.height)) e.size = 'Width and height must be even numbers from 240 to 4096.';
    if (b.name && !/^[\w -]{1,60}$/.test(b.name.trim())) e.name = 'Use letters, digits, spaces, hyphens or underscores (60 max).';
    return e;
  };
  const showAll = (e) => { for (const k of ['topic', 'style', 'durationSeconds', 'size', 'name']) setErr(k, e[k]); const first = ['topic', 'style', 'len', 'size', 'name'].find((id, i) => e[['topic', 'style', 'durationSeconds', 'size', 'name'][i]]); if (first) $('#' + first).focus(); };
  const upd = () => {
    const c = $('#topic').value.length; $('#topic-c').textContent = c >= 500 ? `${c} / 600` : '';
    $('#lenc').hidden = $('#len').value !== 'custom'; $('#szc').hidden = $('#size').value !== 'custom'; drawShape();
    const e = validate(payload()); const ok = !Object.keys(e).length;
    $('#go').setAttribute('aria-disabled', String(!ok)); $('#go').title = ok ? '' : 'Complete topic, style, length and size first.';
    $('#goh').textContent = '';
    try { localStorage.setItem('studio.draft', JSON.stringify({ topic: $('#topic').value, style: $('#style').value, len: $('#len').value, lenc: $('#lenc').value, size: $('#size').value, cw: $('#cw').value, ch: $('#ch').value, name: $('#name').value })); } catch { /* ignore */ }
  };
  f.addEventListener('input', () => { clearTimeout(f._t); f._t = setTimeout(upd, 200); drawShape(); });
  f.addEventListener('change', upd);
  for (const [id, k] of [['topic', 'topic'], ['style', 'style'], ['name', 'name']]) $('#' + id).addEventListener('blur', () => { const e = validate(payload()); if (id === 'topic' && !$('#topic').value.trim()) return setErr(k, e[k]); setErr(k, e[k]); });
  $('#len').addEventListener('blur', () => setErr('durationSeconds', validate(payload()).durationSeconds));
  $('#size').addEventListener('blur', () => setErr('size', validate(payload()).size));
  $('#cancel').addEventListener('click', (ev) => { if ($('#topic').value.trim() && !confirm('Discard this brief? Your draft stays saved on this device.')) ev.preventDefault(); });
  const setFile = (fl) => { file = fl; $('#filerow').innerHTML = fl ? `<div class="file-row"><div style="flex:1;min-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(fl.name)}</div><div class="small muted num">${bytes(fl.size)}</div></div><button type="button" class="btn secondary compact" id="rep">Replace</button><button type="button" class="btn ghost compact" id="rem">Remove</button></div>` : ''; $('#dz').hidden = !!fl; $('#rep')?.addEventListener('click', () => $('#file').click()); $('#rem')?.addEventListener('click', () => setFile(null)); };
  const takeFile = (fl) => { if (!fl) return; if (fl.size > 500 * 1024 * 1024) return toast('That file is over 500 MB.', 'error'); if (!/\.(mp4|mov|webm|m4v|png|jpe?g|webp)$/i.test(fl.name)) return toast('Use mp4, mov, webm, m4v, png, jpg or webp.', 'error'); setFile(fl); };
  const dz = $('#dz');
  dz.addEventListener('click', () => $('#file').click());
  dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } });
  ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', (e) => takeFile(e.dataTransfer.files[0]));
  $('#file').addEventListener('change', (e) => takeFile(e.target.files[0]));
  let busy = false;
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (busy) return;
    const b = payload(), e = validate(b);
    if (Object.keys(e).length) return showAll(e);
    busy = true; const go = $('#go'); go.setAttribute('aria-disabled', 'true'); go.textContent = 'Building plan…';
    try {
      const p = await api('/projects', { method: 'POST', json: b });
      if (file) { go.textContent = 'Uploading reference…'; await api(`/projects/${p.id}/reference?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file }); }
      else if ($('#rlink').value.trim()) {
        go.textContent = 'Fetching reference…';
        const v = $('#rlink').value.trim();
        try { await api(`/projects/${p.id}/reference-link`, { method: 'POST', json: /^https?:\/\//i.test(v) ? { url: v } : { path: v } }); }
        catch (er) { toast('Reference skipped: ' + er.message, 'error'); }
      }
      go.textContent = 'Writing storyboard…';
      await api(`/projects/${p.id}/plan`, { method: 'POST' });
      try { localStorage.removeItem('studio.draft'); } catch { /* ignore */ }
      location.hash = `#/p/${p.id}/plan`;
    } catch (err) {
      busy = false; go.removeAttribute('aria-disabled'); go.textContent = 'Build my video plan';
      if (err.data?.fields) showAll(err.data.fields); else toast(err.message, 'error');
    }
  });
  upd();
  $('#topic').focus();
}

// ---------- Project workspace ----------
async function viewProject(id, tab) {
  if (!P || P.id !== id) { P = await api('/projects/' + id); plan = null; dirty = false; selScene = 0; }
  else P = await api('/projects/' + id);
  tab = TABS.some(([k]) => k === tab) ? tab : (P.stage === 'plan' || !P.approvedAt ? 'plan' : 'preview');
  if (tab !== 'plan' && !P.scenes) tab = 'plan';
  if (!plan) plan = clone(P.scenes || []);
  const stageIdx = STAGES.findIndex(([k]) => k === P.stage);
  const rail = STAGES.map(([k, label, art], i) => {
    const done = i < stageIdx || (k === 'reference' && P.reference && i <= stageIdx) || (k === 'audio' && P.audio?.beatsPath), active = i === stageIdx;
    const blocked = i > stageIdx && k !== 'audio' && k !== 'reference';
    return `<a class="stage ${done ? 'done' : ''} ${active ? 'active' : ''}" ${blocked ? 'aria-disabled="true" title="Complete ' + esc(STAGES[stageIdx][1]) + ' first" style="pointer-events:none;opacity:.6"' : `href="#/p/${id}/${STAGE_TAB[k]}"`} ${active ? 'aria-current="step"' : ''}>${done ? ICON.check : ICON.dot}<span>${esc(label)}</span></a>`;
  }).join('');
  const action = P.approvedAt ? `<a class="btn primary" href="#/p/${id}/${P.stage === 'critique' || P.stage === 'delivered' ? 'review' : 'preview'}">${P.stage === 'animatic' ? 'Open preview' : 'Open review'}</a>` : `<button class="btn primary" data-act="approve">Approve and build</button>`;
  shell(`<div class="ws" id="ws"><aside class="rail" aria-label="Pipeline stages"><span class="label" style="display:block;margin:0 8px 8px">Pipeline</span>${rail}</aside><section><div class="ws-head"><button class="btn secondary compact drawer-btn" data-act="drawer" data-d="rail">Stages</button><h1 id="pname" title="${esc(P.name)}" data-act="rename" tabindex="0" role="button" aria-label="Project name, press Enter to rename">${esc(P.name)}</h1>${chip(P.status)}<span class="small faint" id="saved">Saved ${new Date(P.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span class="spacer"></span><button class="btn secondary compact drawer-btn" data-act="drawer" data-d="insp">Details</button>${P.approvedAt ? '' : ''}</div><nav class="tabs" aria-label="Project sections">${TABS.map(([k, l]) => `<a class="tab" href="#/p/${id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav><div id="tabbody"></div></section><aside class="inspector" aria-label="Details" id="insp"></aside></div>`, { crumb: P.name, action });
  view = tab;
  const renderers = { plan: tabPlan, scenes: tabScenes, preview: tabPreview, sound: tabSound, assets: tabAssets, files: tabFiles, review: tabReview };
  await renderers[tab]();
  drawInspector();
}
const clone = (o) => JSON.parse(JSON.stringify(o));

function drawInspector() {
  const el = $('#insp'); if (!el) return;
  const s = plan[selScene];
  const ar = P.outputWidth && P.outputHeight ? aspect(P.outputWidth, P.outputHeight) : '';
  el.innerHTML = `<div class="card stack" style="gap:var(--space-4);padding:var(--space-6)"><span class="label">Project</span><dl class="kv small"><dt>Style</dt><dd>${esc(P.styleGuide?.label || P.style)}</dd><dt>Length</dt><dd class="num">${P.durationSeconds} s</dd><dt>Size</dt><dd class="num">${P.outputWidth}×${P.outputHeight} (${ar})</dd><dt>Frame rate</dt><dd class="num">${P.fps} fps</dd><dt>Seed</dt><dd class="num">${P.seed}</dd><dt>Framework</dt><dd>${{ seek: 'HTML + seek(t)', remotion: 'Remotion', hyperframes: 'HyperFrames' }[P.framework] || P.framework}</dd></dl>${(view === 'preview' || view === 'scenes') && s ? `<hr style="border:0;border-top:1px solid var(--border);width:100%"><span class="label">Scene ${s.order}: ${esc(s.beat || '')}</span><dl class="kv small"><dt>Time</dt><dd class="num">${fmt(s.startSeconds)}–${fmt(s.endSeconds)}</dd><dt>Purpose</dt><dd>${esc(s.purpose)}</dd><dt>Visual</dt><dd>${esc(s.visual)}</dd><dt>Motion</dt><dd>${esc(s.motion)}</dd><dt>Text</dt><dd>${esc((s.onScreenText || []).join(' / ') || '—')}</dd><dt>Transition</dt><dd>${esc(s.transition)}</dd></dl><a class="btn secondary compact" href="#/p/${P.id}/plan">Edit in plan</a>` : ''}</div>`;
}

// --- Plan tab ---
async function tabPlan() {
  if (!P.scenes) { $('#tabbody').innerHTML = '<div class="card">Generating…</div>'; return; }
  const g = P.styleGuide || {};
  const total = plan.length ? plan[plan.length - 1].endSeconds : 0;
  $('#tabbody').innerHTML = `<div class="stack">
    <div class="card stack" style="gap:var(--space-4)"><div><span class="label">Logline</span><input id="logline" maxlength="160" value="${esc(P.logline)}" aria-label="Logline" style="margin-top:8px"></div>
      <div><span class="label">Style summary</span><div style="margin-top:8px">${(g.palette || []).map((c) => `<span class="swatch"><i style="background:${c}"></i><span class="mono">${c}</span></span>`).join('')}</div><dl class="kv small" style="margin-top:12px"><dt>Style</dt><dd>${esc(g.label)}</dd><dt>Type</dt><dd>${esc(g.type)}</dd><dt>Texture</dt><dd>${esc(g.texture)}</dd><dt>Camera</dt><dd>${esc(g.camera)}</dd></dl></div>
      <div class="guard small" role="note"><strong>Originality guardrail.</strong> This video borrows pacing, palette and type from your reference. It does not reuse its story, logos, characters or claims.</div></div>
    ${P.reference?.frames?.length ? `<div class="card stack" style="gap:var(--space-4)"><span class="label">Reference frames</span><div class="frames">${P.reference.frames.map((f, i) => `<figure><img loading="lazy" alt="Reference frame ${i + 1}" src="/files/${P.id}/${f}"><figcaption class="num">${i + 1}</figcaption></figure>`).join('')}</div></div>` : ''}
    <div class="cols list-edit"><div class="card"><span class="label">Take (one per line)</span><textarea id="take" aria-label="Traits to take" style="margin-top:8px">${esc((g.take || []).join('\n'))}</textarea></div><div class="card"><span class="label">Do not take (one per line)</span><textarea id="avoid" aria-label="Content to avoid" style="margin-top:8px">${esc((g.avoid || []).join('\n'))}</textarea></div></div>
    <div class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px"><span class="label">Beat sheet</span><span id="tot" class="small num"></span><button class="btn secondary compact" data-act="rebalance">Rebalance</button></div><div id="btl"></div></div>
    <div class="stack" id="cards"></div>
    <div class="row"><button class="btn secondary" data-act="add-scene-end">Add scene</button><button class="btn ghost" data-act="regen">Regenerate plan</button></div>
    <div class="approve" role="region" aria-label="Approval"><span class="help" style="flex:1;min-width:200px">Claude Code starts writing code only after you approve. Nothing renders yet.</span><span id="errsum" class="error" hidden></span><button class="btn ghost" id="undo" data-act="undo" title="Undo (Ctrl/Cmd+Z outside a field)" aria-disabled="true">Undo</button><button class="btn ghost" id="redo" data-act="redo" title="Redo (Ctrl/Cmd+Shift+Z)" aria-disabled="true">Redo</button><button class="btn secondary" data-act="save-plan">Save draft</button><button class="btn primary" data-act="approve">${P.approvedAt ? 'Rebuild scaffold' : 'Approve and build'}</button></div></div>`;
  drawPlanParts();
  resetHist();
}
// ---- undo / redo for the plan editor (snapshots of logline, style lists and scenes) ----
let hist = [], fut = [], cur = '', histTimer = 0;
const snapPlan = () => JSON.stringify({ plan, logline: $('#logline')?.value ?? '', take: $('#take')?.value ?? '', avoid: $('#avoid')?.value ?? '' });
function resetHist() { hist = []; fut = []; collectPlan(); cur = snapPlan(); syncUndo(); }
function commitHist() { collectPlan(); const n = snapPlan(); if (n !== cur) { hist.push(cur); if (hist.length > 100) hist.shift(); cur = n; fut = []; } syncUndo(); }
function syncUndo() { const u = $('#undo'), r = $('#redo'); if (u) u.setAttribute('aria-disabled', String(!hist.length)); if (r) r.setAttribute('aria-disabled', String(!fut.length)); }
function applySnap(str) { const o = JSON.parse(str); plan = o.plan; $('#logline').value = o.logline; $('#take').value = o.take; $('#avoid').value = o.avoid; dirty = true; drawPlanParts(); syncUndo(); }
function undo() { if (!hist.length) return; collectPlan(); fut.push(snapPlan()); cur = hist.pop(); applySnap(cur); toast('Undid last change.'); }
function redo() { if (!fut.length) return; hist.push(cur); cur = fut.pop(); applySnap(cur); toast('Redid change.'); }
document.addEventListener('keydown', (e) => {
  if (view !== 'plan' || !(e.metaKey || e.ctrlKey) || e.altKey) return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; // native text undo wins inside fields
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
});

function sceneColor(i) { return SCENE_COLORS[i % SCENE_COLORS.length]; }
function drawPlanParts() {
  const D = P.durationSeconds;
  $('#btl').innerHTML = `<div class="tl-scenes" style="height:40px">${plan.map((s, i) => `<button type="button" class="tl-scene" style="flex:${Math.max(0.1, s.endSeconds - s.startSeconds)};background:${sceneColor(i)}" data-act="jump-card" data-i="${i}" title="${esc(s.purpose)}">${s.order} ${esc((s.beat || '').slice(0, 12))}</button>`).join('')}</div>`;
  const tot = plan.length ? plan[plan.length - 1].endSeconds : 0;
  const errs = planErrors();
  const t = $('#tot'); t.textContent = errs.length ? errs.find((e) => e.startsWith('Scenes add up')) || errs[0] : `Scenes add up to ${tot} s`;
  t.className = 'small num ' + (errs.length ? 'total-bad' : 'total-ok');
  $('#cards').innerHTML = plan.map((s, i) => `<div class="card scene-card" id="sc${i}" data-i="${i}"><div class="scene-head"><span class="no" style="background:${sceneColor(i)}">${s.order}</span><h3 style="flex:1">${esc(s.beat || 'Scene')}</h3><label class="small muted">Start <input class="num" data-f="startSeconds" type="number" step="0.1" min="0" value="${s.startSeconds}" style="width:84px;height:32px"></label><label class="small muted">End <input class="num" data-f="endSeconds" type="number" step="0.1" min="0" value="${s.endSeconds}" style="width:84px;height:32px"></label><button class="btn ghost icon-btn" data-act="up" data-i="${i}" aria-label="Move scene ${s.order} up" ${i === 0 ? 'aria-disabled="true"' : ''}>↑</button><button class="btn ghost icon-btn" data-act="down" data-i="${i}" aria-label="Move scene ${s.order} down" ${i === plan.length - 1 ? 'aria-disabled="true"' : ''}>↓</button><button class="btn ghost compact" data-act="split" data-i="${i}">Duplicate</button><button class="btn ghost compact" data-act="del" data-i="${i}" ${plan.length < 2 ? 'aria-disabled="true"' : ''}>Delete</button></div>
    <div class="field" style="margin:0"><label>Purpose</label><input data-f="purpose" maxlength="120" value="${esc(s.purpose)}"></div>
    <div class="field" style="margin:0"><label>Visual</label><textarea data-f="visual" maxlength="240" style="min-height:64px">${esc(s.visual)}</textarea></div>
    <div class="two"><div class="field" style="margin:0"><label>Camera</label><input data-f="camera" maxlength="100" value="${esc(s.camera || '')}"></div><div class="field" style="margin:0"><label>Motion</label><input data-f="motion" maxlength="200" value="${esc(s.motion || '')}"></div></div>
    <div class="two"><div class="field" style="margin:0"><label>On-screen text (one per line, max 3, 40 characters each)</label><textarea data-f="onScreenText" style="min-height:64px">${esc((s.onScreenText || []).join('\n'))}</textarea></div><div class="field" style="margin:0"><label>Voiceover (optional)</label><textarea data-f="voiceover" style="min-height:64px">${esc(s.voiceover || '')}</textarea></div></div>
    <div class="two"><div class="field" style="margin:0"><label>Audio cue</label><input data-f="audioCue" maxlength="100" value="${esc(s.audioCue || '')}"></div><div class="field" style="margin:0"><label>Transition</label><input data-f="transition" maxlength="100" value="${esc(s.transition)}"></div></div></div>`).join('');
  const es = $('#errsum'); if (es) { es.hidden = !errs.length; es.innerHTML = errs.length ? ICON.alert.replace('<svg', '<svg width="14" height="14"') + esc(errs[0]) + (errs.length > 1 ? ` (+${errs.length - 1} more)` : '') : ''; }
}
function planErrors() {
  const D = P.durationSeconds, fr = 1 / P.fps, out = []; let prev = 0;
  plan.forEach((s, i) => {
    if (!(s.endSeconds > s.startSeconds)) out.push(`Scene ${i + 1}: end must be after start.`);
    if (Math.abs(s.startSeconds - prev) > fr + 1e-6) out.push(s.startSeconds < prev ? `Scene ${i + 1}: this scene overlaps the previous one.` : `Scene ${i + 1}: there is a gap before this scene.`);
    if (!String(s.purpose).trim()) out.push(`Scene ${i + 1}: add a purpose.`);
    if (!String(s.visual).trim()) out.push(`Scene ${i + 1}: add a visual description.`);
    if (!String(s.transition).trim()) out.push(`Scene ${i + 1}: add a transition.`);
    if ((s.onScreenText || []).length > 3) out.push(`Scene ${i + 1}: at most 3 on-screen text items.`);
    if ((s.onScreenText || []).some((x) => x.length > 40)) out.push(`Scene ${i + 1}: on-screen text is over 40 characters.`);
    prev = s.endSeconds;
  });
  if (plan.length && Math.abs(prev - D) > fr + 1e-6) out.unshift(`Scenes add up to ${Math.round(prev * 10) / 10} s. Target is ${D} s.`);
  return out;
}
function collectPlan() {
  $$('#cards .scene-card').forEach((c) => {
    const s = plan[+c.dataset.i];
    $$('[data-f]', c).forEach((inp) => {
      const k = inp.dataset.f;
      if (k === 'startSeconds' || k === 'endSeconds') s[k] = Math.round((parseFloat(inp.value) || 0) * 10) / 10;
      else if (k === 'onScreenText') s[k] = inp.value.split('\n').map((x) => x.trim()).filter(Boolean);
      else s[k] = inp.value;
    });
  });
}
const lines = (id) => ($(id).value || '').split('\n').map((x) => x.trim()).filter(Boolean);
async function savePlan(force) {
  collectPlan();
  const body = { logline: $('#logline').value, styleGuide: { take: lines('#take'), avoid: lines('#avoid') }, scenes: plan, force: !!force };
  const r = await api(`/projects/${P.id}/plan`, { method: 'PUT', json: body });
  P = r.project; plan = clone(P.scenes); dirty = false;
  return r.errors;
}

// --- Scenes tab ---
async function tabScenes() {
  $('#tabbody').innerHTML = `<div class="card" style="padding:0;overflow:auto"><table><thead><tr><th>#</th><th>Beat</th><th>Time</th><th>Purpose</th><th>Text</th><th></th></tr></thead><tbody>${plan.map((s, i) => `<tr><td class="num">${s.order}</td><td><span class="chip" style="background:${sceneColor(i)}22;color:${sceneColor(i)}">${esc(s.beat)}</span></td><td class="mono">${fmt(s.startSeconds)}–${fmt(s.endSeconds)}</td><td>${esc(s.purpose)}</td><td class="muted">${esc((s.onScreenText || []).join(' / '))}</td><td><a class="btn secondary compact" href="#/p/${P.id}/preview" data-act="goto-scene" data-i="${i}">Preview</a></td></tr>`).join('')}</tbody></table></div>`;
}

// --- Preview tab ---
async function tabPreview() {
  if (!P.approvedAt) { $('#tabbody').innerHTML = `<div class="card stack"><h2>Preview appears after approval</h2><p class="muted">Approve the plan to create the project folder and a scaffold animatic that you can scrub here.</p><div><a class="btn primary" href="#/p/${P.id}/plan">Go to plan</a></div></div>`; return; }
  const beats = await api(`/projects/${P.id}/beats`).catch(() => ({ beats: [], downbeats: [] }));
  const prompt = await fetch(`/api/projects/${P.id}/prompt`).then((r) => r.text());
  const D = P.durationSeconds;
  const exp = await api(`/projects/${P.id}/export`).catch(() => ({ files: [] }));
  const anim = exp.files.find((f) => f.name === 'animatic.mp4'), fin = exp.files.find((f) => f.name === 'final.mp4');
  $('#tabbody').innerHTML = `<div class="stack"><div class="player"><div class="stagebox" id="sb"><iframe id="pv" title="Animatic preview" src="/files/${P.id}/index.html?manual=1"></iframe></div><div class="controls"><button class="btn secondary icon-btn" id="pp" aria-label="Play">▶</button><span class="mono num" id="tc">${fmt(0)} / ${fmt(D)}</span><input id="scrub" type="range" min="0" max="${D}" step="${1 / P.fps}" value="0" aria-label="Seek"><button class="btn ghost icon-btn" id="mute" aria-label="Mute" ${P.audio ? '' : 'hidden'}>🔊</button><span class="small muted">Scaffold animatic · ${P.outputWidth}×${P.outputHeight}</span></div></div>
    ${P.audio ? `<audio id="au" src="/files/${P.id}/${P.audio.path}" preload="auto"></audio>` : ''}
    <div class="timeline" id="tl" aria-label="Timeline"><div class="tl-scenes">${plan.map((s, i) => `<button class="tl-scene" style="flex:${s.endSeconds - s.startSeconds};background:${sceneColor(i)}" data-act="seek-scene" data-i="${i}" ${i === selScene ? 'aria-current="true"' : ''} aria-label="Scene ${s.order}, ${esc(s.beat)}, starts at ${fmt(s.startSeconds)}">${s.order} ${esc((s.beat || '').slice(0, 10))}</button>`).join('')}</div><div class="tl-audio" title="${P.audio ? esc(P.audio.name) : 'No audio track'}">${(beats.beats || []).filter((t) => t <= D).map((t) => `<i class="tl-tick ${(beats.downbeats || []).includes(t) ? 'down' : ''}" style="left:${(t / D) * 100}%"></i>`).join('')}${P.audio ? '' : '<span class="small faint" style="position:absolute;left:12px;top:5px">No audio. Add a track in Sound.</span>'}</div><div class="tl-head" id="head" style="left:${16}px"></div></div>
    <div class="card stack" style="gap:var(--space-4)" id="act"><div class="row" style="justify-content:space-between"><h3>Render</h3><span class="small muted">Uses the project's index.html and window.seek(t)</span></div><div class="row"><button class="btn secondary" data-act="render" data-kind="animatic">Render animatic (540p)</button><button class="btn primary" data-act="render" data-kind="final">Render final (${P.outputWidth}×${P.outputHeight})</button><button class="btn danger" data-act="cancel-render" id="cancel-r" hidden>Cancel</button></div><div id="job" class="act" hidden><div class="row" style="justify-content:space-between"><span id="jobline">Starting…</span><span class="mono num" id="jobpct"></span></div><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" id="jobbar"><i style="width:0%"></i></div><pre class="log" id="joblog"></pre><div class="row" id="jobend" hidden><button class="btn secondary compact" data-act="render" data-kind="retry">Retry</button></div></div>${anim ? `<div><span class="label">out/animatic.mp4 · ${bytes(anim.size)}</span><video controls preload="metadata" src="${anim.url}?v=${Date.now()}" style="display:block;margin-top:8px;max-height:360px;max-width:100%;border-radius:var(--radius-md);background:#000"></video></div>` : ''}${fin ? `<div class="row"><span class="chip s-complete">${ICON.check}out/final.mp4 · ${bytes(fin.size)}</span><a class="btn secondary compact" href="${fin.url}" download>Download</a><a class="btn ghost compact" href="#/p/${P.id}/review">Open delivery</a></div>` : ''}</div>
    <div class="card stack" style="gap:var(--space-4)"><h3>Hand off to Claude Code</h3><p class="muted small">Direct launch is not built in, so the studio prepares the folder and a copy-ready prompt. Project folder: <span class="mono" id="ppath">${esc(P.path || '')}</span></p><pre class="prompt" id="prm">${esc(prompt)}</pre><div class="row"><button class="btn primary" data-act="copy-prompt">Copy prompt</button><button class="btn secondary" data-act="copy-cmd">Copy launch command</button><button class="btn secondary" data-act="reveal">Open project folder</button></div></div></div>`;
  const ifr = $('#pv'), sb = $('#sb'), scrub = $('#scrub'), tl = $('#tl'), head = $('#head'), au = $('#au');
  const fit = () => { const bw = sb.clientWidth, bh = sb.clientHeight, s = Math.min(bw / P.outputWidth, bh / P.outputHeight); ifr.style.width = P.outputWidth * s + 'px'; ifr.style.height = P.outputHeight * s + 'px'; };
  fit(); const ro = new ResizeObserver(fit); ro.observe(sb); cleanups.push(() => ro.disconnect());
  let t = 0, playing = false, raf = 0, t0 = 0, base = 0;
  const seek = (x, fromAudio) => {
    if (!$('#tc') || !ifr.isConnected) return;
    t = Math.min(Math.max(x, 0), D - 1e-3);
    try { ifr.contentWindow.seek(t); } catch { /* not loaded yet */ }
    scrub.value = t; $('#tc').textContent = `${fmt(t)} / ${fmt(D)}`;
    const wrap = tl.getBoundingClientRect(), inner = $('.tl-scenes', tl).getBoundingClientRect();
    head.style.left = (inner.left - wrap.left + (t / D) * inner.width) + 'px';
    const i = plan.findIndex((s) => t >= s.startSeconds && t < s.endSeconds);
    if (i >= 0 && i !== selScene) { selScene = i; $$('.tl-scene', tl).forEach((b, k) => b.toggleAttribute('aria-current', k === i)); drawInspector(); }
    if (au && !fromAudio && Math.abs(au.currentTime - t) > 0.15) { try { au.currentTime = t; } catch { /* ignore */ } }
  };
  const tick = (now) => { if (!playing) return; seek(base + (now - t0) / 1000); if (t >= D - 0.05) { toggle(false); return; } raf = requestAnimationFrame(tick); };
  const toggle = (on) => {
    playing = on === undefined ? !playing : on; $('#pp').textContent = playing ? '⏸' : '▶'; $('#pp').setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if (playing) { if (t >= D - 0.05) t = 0; base = t; t0 = performance.now(); raf = requestAnimationFrame(tick); if (au) au.play().catch(() => {}); } else { cancelAnimationFrame(raf); if (au) au.pause(); }
  };
  ifr.addEventListener('load', () => { const w = ifr.contentWindow; (w.__ready || Promise.resolve()).then(() => seek(t)); });
  scrub.addEventListener('input', () => { if (playing) toggle(false); seek(+scrub.value); });
  $('#pp').addEventListener('click', () => toggle());
  $('#mute')?.addEventListener('click', (e) => { au.muted = !au.muted; e.currentTarget.textContent = au.muted ? '🔇' : '🔊'; });
  tl.addEventListener('click', (e) => { if (e.target.closest('.tl-scene')) return; const r = $('.tl-scenes', tl).getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * D); });
  view_actions.seekScene = (i) => { const s = plan[i]; selScene = i; seek(s.startSeconds + 0.001); drawInspector(); };
  const key = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== 'range') return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); toggle(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); seek(t - (e.shiftKey ? 1 : 1 / P.fps)); }
    else if (k === 'ArrowRight') { e.preventDefault(); seek(t + (e.shiftKey ? 1 : 1 / P.fps)); }
    else if (k === '[') { const i = Math.max(0, selScene - 1); view_actions.seekScene(i); }
    else if (k === ']') { const i = Math.min(plan.length - 1, selScene + 1); view_actions.seekScene(i); }
    else if (k.toLowerCase() === 'm' && au) $('#mute').click();
  };
  document.addEventListener('keydown', key);
  cleanups.push(() => { document.removeEventListener('keydown', key); cancelAnimationFrame(raf); if (au) au.pause(); });
  const onResize = () => seek(t); window.addEventListener('resize', onResize); cleanups.push(() => window.removeEventListener('resize', onResize));
  pollJob(true);
  if (window._pendingScene !== undefined) { const i = window._pendingScene; window._pendingScene = undefined; setTimeout(() => view_actions.seekScene(i), 100); }
}

const lab = (j) => (j.size ? `final ${j.size[0]}×${j.size[1]}` : j.kind);
let jobTimer = 0, lastKind = 'animatic', lastSize = null;
async function pollJob(first) {
  clearTimeout(jobTimer);
  if (view !== 'preview' || !$('#job')) return;
  let j; try { j = await api(`/projects/${P.id}/job`); } catch { return; }
  const box = $('#job');
  if (j.state === 'idle') return;
  box.hidden = false;
  const pct = j.total ? Math.round((j.done / j.total) * 100) : 0;
  $('#jobbar i').style.width = pct + '%'; $('#jobbar').setAttribute('aria-valuenow', pct);
  $('#jobpct').textContent = j.total ? `${j.done} / ${j.total} frames · ${pct}%` : '';
  const log = $('#joblog'); const atEnd = log.scrollTop + log.clientHeight >= log.scrollHeight - 8; log.textContent = j.log.join('\n'); if (atEnd) log.scrollTop = log.scrollHeight;
  const running = j.state === 'running';
  $('#cancel-r').hidden = !running;
  $$('#act [data-act="render"]:not([data-kind="retry"])').forEach((b) => b.toggleAttribute('aria-disabled', running));
  $('#jobend').hidden = j.state !== 'failed';
  const label = { running: `Rendering ${lab(j)}…`, done: `${lab(j)} render finished`, failed: 'Render failed' + (j.error ? ': ' + j.error : ''), cancelled: 'Render cancelled' }[j.state];
  $('#jobline').textContent = label; $('#jobline').className = j.state === 'failed' ? 'total-bad' : j.state === 'done' ? 'total-ok' : '';
  lastKind = j.kind; lastSize = j.size;
  if (running) jobTimer = setTimeout(pollJob, 700);
  else if (!first && j.state === 'done') { $('#live').textContent = label; toast(label + '.'); P = await api('/projects/' + P.id); await tabPreview(); drawInspector(); }
}
cleanups.push(() => clearTimeout(jobTimer));

// --- Sound tab ---
async function tabSound() {
  const a = P.audio;
  $('#tabbody').innerHTML = `<div class="stack"><div class="card stack" style="gap:var(--space-4)"><div class="row" style="justify-content:space-between"><h3>Music</h3><span class="small muted">Optional. mp3, wav or m4a</span></div>${a ? `<div class="file-row"><div style="flex:1;min-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</div><div class="small muted num">${a.duration ? fmt(a.duration) : ''} ${a.bpm ? '· ' + a.bpm + ' BPM' : '· tempo not set'}</div></div><audio controls src="/files/${P.id}/${a.path}" style="height:32px"></audio><button class="btn secondary compact" data-act="pick-audio">Replace</button><button class="btn ghost compact" data-act="del-audio">Remove</button></div>
      <div class="two"><div class="field" style="margin:0"><label for="bpm">Tempo (BPM)</label><input id="bpm" type="number" min="40" max="240" step="0.1" value="${a.bpm || ''}" placeholder="40–240"><div class="help">"Detect tempo" estimates tempo, first beat and hits from the audio${a.confidence != null ? ` (last run: ${a.bpm} BPM)` : ''}. It can land on double or half time, and the first beat can be off by about 0.05 s. Use ×2 / ÷2 or edit the fields.</div></div><div class="field" style="margin:0"><label for="off">First downbeat at (seconds)</label><input id="off" type="number" min="0" step="0.01" value="${a.offset ?? 0}"></div></div>
      <div class="field" style="margin:0"><label for="mix">Mix level: <span id="mixv">${a.mixLevelDb} dB</span></label><input id="mix" type="range" min="-40" max="0" value="${a.mixLevelDb}"></div><div class="row"><button class="btn primary" data-act="detect">Detect tempo</button><button class="btn secondary" data-act="beatmap">${a.beatsPath ? 'Rebuild from tempo' : 'Build from tempo'}</button>${a.bpm ? '<button class="btn ghost compact" data-act="bpm-x" data-m="2" aria-label="Double the tempo">×2</button><button class="btn ghost compact" data-act="bpm-x" data-m="0.5" aria-label="Halve the tempo">÷2</button>' : ''} ${a.beatsPath ? '<span class="chip s-complete">' + ICON.check + 'audio/beats.json</span>' : ''}</div>` : `<div class="dropzone" data-act="pick-audio" tabindex="0" role="button">Choose a music file</div>`}<input id="afile" type="file" accept="audio/*" hidden></div>
    <div class="card"><h3 style="margin-bottom:8px">Voiceover</h3><p class="muted small">One file per scene, never time-stretched. Generate voiceover with your own provider key in <span class="mono">.env</span> (never shown here). None yet.</p></div>
    <div class="card"><h3 style="margin-bottom:8px">Sound effects</h3><p class="muted small">Clicks, pops, thumps and whooshes are synthesized in code by the project. None yet.</p></div></div>`;
  $('#mix')?.addEventListener('input', (e) => { $('#mixv').textContent = e.target.value + ' dB'; });
  $('#afile').addEventListener('change', async (e) => {
    const fl = e.target.files[0]; if (!fl) return;
    if (!/\.(mp3|wav|m4a)$/i.test(fl.name)) return toast('Use mp3, wav or m4a.', 'error');
    try { P = await api(`/projects/${P.id}/audio?name=${encodeURIComponent(fl.name)}`, { method: 'POST', body: fl }); toast('Track added.'); await tabSound(); } catch (er) { toast(er.message, 'error'); }
  });
}

// --- Assets tab ---
async function tabAssets() {
  const r = P.reference;
  $('#tabbody').innerHTML = `<div class="stack"><div class="card stack" style="gap:var(--space-4)"><div class="row" style="justify-content:space-between"><h3>Reference</h3>${r ? '<button class="btn ghost compact" data-act="del-ref">Remove</button>' : ''}</div>${r ? `<div class="file-row">${r.thumb ? `<img alt="" src="/files/${P.id}/${r.thumb}">` : ''}<div style="flex:1;min-width:0"><div>${esc(r.name)}</div><div class="small muted num">${r.mediaType}${r.duration ? ' · ' + r.duration.toFixed(1) + ' s' : ''}${r.width ? ' · ' + r.width + '×' + r.height : ''} · ${bytes(r.size)}</div></div></div>${r.ffmpeg === false ? '<p class="error">ffmpeg is missing, so no frames were extracted. Install it, then re-upload.</p>' : ''}` : `<p class="muted small">No reference. Upload a file, or paste a direct link or a local file path.</p><div class="row"><button class="btn secondary" data-act="pick-ref">Choose a file</button><input id="rl" class="grow" placeholder="https://…/clip.mp4 or /path/to/clip.mp4" aria-label="Reference link or file path" style="max-width:420px"><button class="btn secondary" data-act="ref-link">Add</button></div><div class="help">Links must point straight at a public video or image file. Video-platform pages and private addresses are refused.</div>`}<input id="rfile" type="file" accept="video/*,image/*" hidden></div>
    <div class="card" style="padding:0;overflow:auto"><table><caption class="sr">Project assets</caption><thead><tr><th>Asset</th><th>Source</th><th>Local path</th><th>Used in</th></tr></thead><tbody>${r ? `<tr><td>${esc(r.name)}</td><td>${{ upload: 'Supplied upload', url: 'Link: ' + esc(r.sourceRef || ''), path: 'Local file: ' + esc(r.sourceRef || '') }[r.sourceKind] || 'Supplied'}</td><td class="mono">${esc(r.path)}</td><td>Style extraction</td></tr>` : ''}${(r?.frames || []).map((f) => `<tr><td>${esc(f.split('/').pop())}</td><td>Extracted from reference</td><td class="mono">${esc(f)}</td><td>Plan review</td></tr>`).join('')}${P.audio ? `<tr><td>${esc(P.audio.name)}</td><td>Supplied upload</td><td class="mono">${esc(P.audio.path)}</td><td>Sound</td></tr>` : ''}${!r && !P.audio ? '<tr><td colspan="4" class="muted">Nothing yet. Real screenshots, logos and fonts you add to <span class="mono">assets/</span> are listed here.</td></tr>' : ''}</tbody></table></div></div>`;
  $('#rfile').addEventListener('change', async (e) => {
    const fl = e.target.files[0]; if (!fl) return;
    try { P = await api(`/projects/${P.id}/reference?name=${encodeURIComponent(fl.name)}`, { method: 'POST', body: fl }); toast('Reference added.'); await tabAssets(); } catch (er) { toast(er.message, 'error'); }
  });
}

// --- Files tab ---
async function tabFiles() {
  const t = await api(`/projects/${P.id}/files`);
  const ul = (n) => `<ul>${n.map((x) => `<li>${x.type === 'dir' ? `📁 ${esc(x.path.split('/').pop())}${ul(x.children || [])}` : `<a href="/files/${P.id}/${x.path.split('/').map(encodeURIComponent).join('/')}" target="_blank" rel="noopener">${esc(x.path.split('/').pop())}</a><span class="sz">${bytes(x.size)}</span>`}</li>`).join('')}</ul>`;
  $('#tabbody').innerHTML = `<div class="card stack" style="gap:var(--space-4)"><div class="row" style="justify-content:space-between"><h3>Project folder</h3><button class="btn secondary compact" data-act="reveal">Reveal in folder</button></div><p class="mono muted">${esc(P.path || '')}</p><div class="filetree">${ul(t)}</div></div>`;
}

// --- Review tab ---
const CATS = [['hook', 'Hook in first 2 s'], ['readability', 'Phone readability'], ['motion', 'Motion quality'], ['variety', 'Visual variety'], ['composition', 'Composition'], ['style', 'Style match'], ['sync', 'Sound sync']];
async function tabReview() {
  if (!P.approvedAt) { $('#tabbody').innerHTML = `<div class="card stack"><h2>Review starts after the build</h2><p class="muted">Approve the plan first.</p><div><a class="btn primary" href="#/p/${P.id}/plan">Go to plan</a></div></div>`; return; }
  const rv = P.review || { scores: {}, issues: [], rounds: [] };
  const exp = await api(`/projects/${P.id}/export`).catch(() => ({ files: [] }));
  const low = Object.entries(rv.scores || {}).filter(([, v]) => v < 8).length;
  const all = CATS.every(([k]) => rv.scores?.[k] !== undefined);
  const rounds = rv.rounds?.length || 0;
  const passed = rounds >= 3 && rv.rounds.slice(-3).every((r) => Object.values(r.scores).every((v) => v >= 8));
  const mp4 = exp.files.find((f) => f.name === 'final.mp4');
  $('#tabbody').innerHTML = `<div class="stack"><div class="card stack" style="gap:var(--space-4)"><div class="row" style="justify-content:space-between"><h3>Scores</h3><span class="gate ${passed ? 'total-ok' : ''}">${passed ? ICON.check.replace('<svg', '<svg width="16" height="16"') + ' Passed' : `Review round ${rounds + 1} of at least 3${all && low ? ` · needs work: ${low} below 8` : ''}`}</span></div><p class="muted small">Scores are entered by you (or written to <span class="mono">review.json</span> by Claude Code during its critique loop). The gate needs 8+ on every category for three consecutive rounds.</p><div class="scores">${CATS.map(([k, l]) => `<label class="score"><span class="small muted">${l}</span><input type="number" min="1" max="10" step="1" data-score="${k}" value="${rv.scores?.[k] ?? ''}" aria-label="${l} score, 1 to 10"></label>`).join('')}</div><div class="row"><button class="btn secondary" data-act="save-scores">Save scores</button><button class="btn primary" data-act="commit-round" ${all ? '' : 'aria-disabled="true" title="Score all seven categories first"'}>Record round</button></div>${rounds ? `<div class="small muted">History: ${rv.rounds.map((r, i) => `Round ${i + 1}: ${Object.values(r.scores).join(' ')}`).join(' · ')}</div>` : ''}</div>
    <div class="card stack" style="gap:var(--space-4)"><div class="row" style="justify-content:space-between"><h3>Proofs</h3><button class="btn secondary compact" data-act="gen-proofs">Generate proofs</button></div><p class="muted small">Contact sheet (one frame per scene start and midpoint), fast-action strip (12 frames around the second scene start) and a 360 px phone proof. Rendered live from the same <span class="mono">seek(t)</span> the final render uses.</p><div id="proofs"></div></div>
    <div class="card stack" style="gap:var(--space-4)"><h3>Issues</h3><div id="issues">${(rv.issues || []).map((i, n) => issueRow(i, n)).join('') || '<p class="muted small">No issues logged.</p>'}</div><div class="row" style="align-items:flex-end"><label class="small muted">Time <input id="it" type="number" step="0.1" min="0" value="0" style="width:88px;height:32px"></label><label class="small muted">Category <select id="ic" style="height:32px;width:170px">${CATS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label><label class="small muted grow">Issue <input id="ix" maxlength="160" placeholder="What is wrong, at this time" style="height:32px"></label><label class="small muted">Severity <select id="is" style="height:32px;width:110px"><option value="minor">Minor</option><option value="blocking">Blocking</option></select></label><button class="btn secondary compact" data-act="add-issue">Add</button></div><div><button class="btn primary" data-act="fix-issues">Fix selected issues</button></div></div>
    <div class="card stack" style="gap:var(--space-4)"><h3>Delivery</h3>${exp.files.length ? `<table><thead><tr><th>File</th><th>Size</th><th></th></tr></thead><tbody>${exp.files.map((f) => `<tr><td class="mono">${esc(f.name)}</td><td class="num">${bytes(f.size)}</td><td><a class="btn secondary compact" href="${f.url}" target="_blank" rel="noopener">Open</a> <a class="btn ghost compact" href="${f.url}" download>Download</a></td></tr>`).join('')}</tbody></table>${mp4 ? `<video controls preload="metadata" src="${mp4.url}" style="max-height:420px;max-width:100%;border-radius:var(--radius-md);background:#000"></video>` : ''}` : `<p class="muted small">No exports yet. Render from the project folder:</p><pre class="prompt">cd "${esc(P.path || '')}"\nnpm install &amp;&amp; npx playwright install chromium\nnpm run animatic   # low-res preview  -> out/animatic.mp4\nnpm run render     # final H.264      -> out/final.mp4</pre>`}<div class="row" style="align-items:flex-end"><label class="small muted">Export another format <select id="xf" style="height:32px;width:220px">${[['1080x1080', '1:1 square 1080×1080'], ['1920x1080', '16:9 landscape 1920×1080'], ['1080x1350', '4:5 portrait 1080×1350'], ['1080x1920', '9:16 vertical 1080×1920']].filter(([v]) => v !== `${P.outputWidth}x${P.outputHeight}`).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label><button class="btn secondary compact" data-act="export-format">Render</button><span class="help">Recomposes the layout from the same timeline; it does not crop the master.</span></div><div class="row"><button class="btn secondary" data-act="reveal">Open project folder</button></div><p class="help">A finished render is never overwritten silently. Rename or move out/final.mp4 before rendering again.</p></div></div>`;
}
function issueRow(i, n) { return `<div class="row" data-n="${n}" style="border-bottom:1px solid var(--border);padding:8px 0"><input type="checkbox" data-issue-done aria-label="Select for fix pass" ${i.done ? 'checked' : ''}><button class="btn ghost compact mono" data-act="issue-seek" data-t="${i.time}">${fmt(i.time)}</button><span class="chip">${esc(CATS.find(([k]) => k === i.category)?.[1] || i.category)}</span><span class="grow">${esc(i.text)}</span><span class="chip ${i.severity === 'blocking' ? 's-needs-attention' : ''}">${i.severity}</span><button class="btn ghost compact" data-act="del-issue" data-n="${n}" aria-label="Remove issue">Remove</button></div>`; }
async function saveReview(extra = {}) {
  const scores = {}; $$('[data-score]').forEach((i) => { if (i.value !== '') scores[i.dataset.score] = Number(i.value); });
  const issues = (P.review?.issues || []).map((x, n) => ({ ...x, done: $$('[data-issue-done]')[n]?.checked ?? x.done }));
  const r = await api(`/projects/${P.id}/review`, { method: 'PUT', json: { scores, issues, ...extra } });
  P = r.project; return r;
}
function genProofs() {
  const D = P.durationSeconds, url = `/files/${P.id}/index.html?manual=1`;
  const times = []; plan.forEach((s) => { times.push(s.startSeconds + 0.05); times.push((s.startSeconds + s.endSeconds) / 2); });
  const contact = times.slice(0, 24);
  const s2 = plan[1]?.startSeconds ?? 1;
  const strip = Array.from({ length: 12 }, (_, i) => Math.max(0, s2 - 0.15 + i / P.fps));
  const cell = (t, w) => { const h = w * P.outputHeight / P.outputWidth; return `<button class="proof" data-act="proof-open" data-t="${t}" style="width:${w}px;height:${h}px" aria-label="Open frame at ${fmt(t)}"><iframe data-t="${t}" src="${url}" style="width:${P.outputWidth}px;height:${P.outputHeight}px;transform:scale(${w / P.outputWidth})" tabindex="-1" title=""></iframe><span>${t.toFixed(2)}s</span></button>`; };
  $('#proofs').innerHTML = `<div class="stack"><div><span class="label">Contact sheet</span><div class="proofs" style="margin-top:8px">${contact.map((t) => cell(t, 160)).join('')}</div></div><div><span class="label">Fast-action strip · ${fmt(strip[0])}</span><div class="row" style="gap:4px;margin-top:8px;flex-wrap:nowrap;overflow:auto">${strip.map((t) => cell(t, 96)).join('')}</div></div><div><span class="label">Phone proof · 360 px wide</span><div class="row" style="gap:8px;margin-top:8px;flex-wrap:nowrap;overflow:auto">${plan.slice(0, 5).map((s) => cell(s.startSeconds + 0.6 < s.endSeconds ? s.startSeconds + 0.6 : s.startSeconds, 180)).join('')}</div></div></div>`;
  $$('#proofs iframe').forEach((f) => f.addEventListener('load', () => { const w = f.contentWindow; (w.__ready || Promise.resolve()).then(() => w.seek(+f.dataset.t)); }));
}

// ---------- actions ----------
const view_actions = {};
document.addEventListener('change', (e) => { if (e.target.id === 'reduce') { document.documentElement.dataset.reduce = e.target.checked ? '1' : ''; try { localStorage.setItem('studio.reduce', e.target.checked ? '1' : ''); } catch { /* ignore */ } } });
try { if (localStorage.getItem('studio.reduce')) document.documentElement.dataset.reduce = '1'; } catch { /* ignore */ }
document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) $$('.menu-list').forEach((m) => m.remove()); });
document.addEventListener('keydown', (e) => { if (e.target.dataset?.act === 'rename' && e.key === 'Enter') e.target.click(); });

document.addEventListener('input', (e) => { if (view === 'plan' && e.target.closest('#cards, #logline, #take, #avoid')) { clearTimeout(histTimer); histTimer = setTimeout(commitHist, 600); } if (view === 'plan' && e.target.closest('#cards')) { dirty = true; collectPlan(); const errs = planErrors(); const t = $('#tot'); t.textContent = errs.length ? (errs.find((x) => x.startsWith('Scenes add up')) || errs[0]) : `Scenes add up to ${plan[plan.length - 1].endSeconds} s`; t.className = 'small num ' + (errs.length ? 'total-bad' : 'total-ok'); const es = $('#errsum'); es.hidden = !errs.length; es.textContent = errs.length ? errs[0] + (errs.length > 1 ? ` (+${errs.length - 1} more)` : '') : ''; } });

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.getAttribute('aria-disabled') === 'true') return;
  const act = b.dataset.act, i = +b.dataset.i;
  try {
    switch (act) {
      case 'recheck': await getPreflight(true); route(); break;
      case 'drawer': $('#ws').classList.toggle('show-' + b.dataset.d); break;
      case 'menu': {
        const host = b.closest('.menu'); const open = $('.menu-list', host); $$('.menu-list').forEach((m) => m.remove()); if (open) break;
        const id = b.dataset.id;
        const m = document.createElement('div'); m.className = 'menu-list'; m.setAttribute('role', 'menu');
        m.innerHTML = `<button role="menuitem" data-act="p-reveal" data-id="${id}">Reveal in folder</button><button role="menuitem" data-act="p-dup" data-id="${id}">Duplicate</button><button role="menuitem" class="del" data-act="p-del" data-id="${id}">Delete</button>`;
        host.append(m); m.querySelector('button').focus(); break;
      }
      case 'p-reveal': await api(`/projects/${b.dataset.id}/reveal`, { method: 'POST' }); break;
      case 'p-dup': await api(`/projects/${b.dataset.id}/duplicate`, { method: 'POST' }); toast('Project duplicated.'); route(); break;
      case 'p-del': if (await confirmBox('Delete this project?', 'The folder moves to .trash inside the studio projects folder. You can restore it from there.', 'Delete', 'danger')) { await api(`/projects/${b.dataset.id}`, { method: 'DELETE' }); toast('Project moved to trash.'); route(); } break;
      case 'rename': {
        const r = await modal({ title: 'Rename project', body: `<input id="nn" value="${esc(P.name)}" maxlength="60" aria-label="Project name">`, actions: [{ label: 'Cancel', value: null }, { label: 'Save', kind: 'primary', value: 'save' }] });
        if (r === 'save') { const v = ($('#nn')?.value ?? '').trim(); P = await api(`/projects/${P.id}`, { method: 'PUT', json: { name: v } }); route(); }
        break;
      }
      case 'reveal': { const r = await api(`/projects/${P.id}/reveal`, { method: 'POST' }); toast('Opened ' + r.path); break; }
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'jump-card': $('#sc' + i)?.scrollIntoView({ behavior: document.documentElement.dataset.reduce ? 'auto' : 'smooth', block: 'start' }); $('#sc' + i + ' input')?.focus({ preventScroll: true }); break;
      case 'up': case 'down': { collectPlan(); const j = act === 'up' ? i - 1 : i + 1; if (j < 0 || j >= plan.length) break; const durs = plan.map((s) => Math.round((s.endSeconds - s.startSeconds) * 10) / 10); [plan[i], plan[j]] = [plan[j], plan[i]]; [durs[i], durs[j]] = [durs[j], durs[i]]; let c = 0; plan.forEach((s, k) => { s.order = k + 1; s.startSeconds = Math.round(c * 10) / 10; c += durs[k]; s.endSeconds = k === plan.length - 1 ? P.durationSeconds : Math.round(c * 10) / 10; }); dirty = true; drawPlanParts(); commitHist(); document.querySelector(`#sc${j} [data-act="${act}"]`)?.focus(); break; }
      case 'split': case 'add-scene-end': { collectPlan(); const k = act === 'split' ? i : plan.length - 1, s = plan[k], mid = Math.round(((s.startSeconds + s.endSeconds) / 2) * 10) / 10; const n = clone(s); n.startSeconds = mid; n.id = 's' + Date.now(); if (act === 'add-scene-end') { n.beat = 'Detail'; n.onScreenText = []; } n.transition = s.transition; s.endSeconds = mid; s.transition = 'Match cut into the next scene'; plan.splice(k + 1, 0, n); plan.forEach((x, q) => (x.order = q + 1)); dirty = true; drawPlanParts(); commitHist(); break; }
      case 'del': { collectPlan(); if (plan.length < 2) break; if (!(await confirmBox(`Delete scene ${plan[i].order}?`, 'Its time goes to the previous scene.', 'Delete', 'danger'))) break; const s = plan[i]; if (i > 0) plan[i - 1].endSeconds = s.endSeconds; else plan[1].startSeconds = 0; plan.splice(i, 1); plan.forEach((x, q) => (x.order = q + 1)); dirty = true; drawPlanParts(); commitHist(); break; }
      case 'rebalance': { collectPlan(); const r = await api(`/projects/${P.id}/plan`, { method: 'PUT', json: { scenes: plan, rebalance: true, logline: $('#logline').value, styleGuide: { take: lines('#take'), avoid: lines('#avoid') }, force: true } }); P = r.project; plan = clone(P.scenes); drawPlanParts(); commitHist(); toast('Scene times rebalanced.'); break; }
      case 'regen': if (await confirmBox('Regenerate the plan?', 'Your edits to the logline, style lists and scenes will be replaced.', 'Regenerate', 'danger')) { P = await api(`/projects/${P.id}/plan`, { method: 'POST' }); plan = clone(P.scenes); route(); toast('New plan generated.'); } break;
      case 'save-plan': case 'approve': {
        if (view !== 'plan') { location.hash = `#/p/${P.id}/plan`; break; }
        if (P.approvedAt && !(await confirmBox('Rebuild from this plan?', 'The plan is approved. This overwrites index.html, data.js and the docs in the project folder, and leaves your out/ files alone.', act === 'approve' ? 'Rebuild' : 'Save', 'primary'))) break;
        const errs = await savePlan(true);
        if (errs.length) { drawPlanParts(); toast(errs[0], 'error'); break; }
        if (act === 'save-plan') { toast('Draft saved.'); $('#saved').textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); break; }
        b.setAttribute('aria-disabled', 'true'); b.textContent = 'Building…';
        P = await api(`/projects/${P.id}/approve`, { method: 'POST' }); plan = clone(P.scenes); toast('Plan approved. Scaffold and preview are ready.'); location.hash = `#/p/${P.id}/preview`; break;
      }
      case 'render': {
        const retry = b.dataset.kind === 'retry', kind = retry ? lastKind : b.dataset.kind, size = retry ? lastSize : null;
        if (kind === 'final' && !size && (await api(`/projects/${P.id}/export`)).files.some((f) => f.name === 'final.mp4') && !(await confirmBox('Render again?', 'out/final.mp4 already exists. It is kept as final-v1.mp4 (or the next free number) before the new file is written.', 'Render', 'primary'))) break;
        await api(`/projects/${P.id}/render`, { method: 'POST', json: size ? { kind, width: size[0], height: size[1] } : { kind } }); lastKind = kind; lastSize = size; $('#job').hidden = false; $('#joblog').textContent = ''; pollJob(); break;
      }
      case 'export-format': { const [w, h] = $('#xf').value.split('x').map(Number); await api(`/projects/${P.id}/render`, { method: 'POST', json: { kind: 'final', width: w, height: h } }); toast(`Rendering ${w}×${h}. Follow progress in Preview.`); location.hash = `#/p/${P.id}/preview`; break; }
      case 'cancel-render': if (await confirmBox('Cancel this render?', 'Frames rendered so far are discarded. Earlier outputs are kept.', 'Cancel render', 'danger')) { await api(`/projects/${P.id}/job`, { method: 'DELETE' }); pollJob(); } break;
      case 'seek-scene': view_actions.seekScene(i); break;
      case 'goto-scene': window._pendingScene = i; selScene = i; break;
      case 'copy-prompt': await navigator.clipboard.writeText($('#prm').textContent); toast('Prompt copied.'); break;
      case 'copy-cmd': await navigator.clipboard.writeText(`cd "${P.path}" && claude "$(cat CLAUDE-PROMPT.md)"`); toast('Command copied.'); break;
      case 'pick-audio': $('#afile').click(); break;
      case 'ref-link': { const v = $('#rl').value.trim(); if (!v) { $('#rl').focus(); break; } b.setAttribute('aria-disabled', 'true'); b.textContent = 'Fetching…'; try { P = await api(`/projects/${P.id}/reference-link`, { method: 'POST', json: /^https?:\/\//i.test(v) ? { url: v } : { path: v } }); toast('Reference added.'); } finally { tabAssets(); } break; }
      case 'pick-ref': $('#rfile').click(); break;
      case 'del-audio': if (await confirmBox('Remove the audio track?', 'The beat map is removed too.', 'Remove', 'danger')) { P = await api(`/projects/${P.id}/audio`, { method: 'DELETE' }); tabSound(); } break;
      case 'del-ref': if (await confirmBox('Remove the reference?', 'Extracted frames are removed too.', 'Remove', 'danger')) { P = await api(`/projects/${P.id}/reference`, { method: 'DELETE' }); tabAssets(); } break;
      case 'detect': { b.setAttribute('aria-disabled', 'true'); b.textContent = 'Listening…'; try { P = await api(`/projects/${P.id}/audio/analyze`, { method: 'POST' }); toast(`Detected ${P.audio.bpm} BPM. Check it against the track.`); } finally { tabSound(); } break; }
      case 'bpm-x': { const nb = Math.round(P.audio.bpm * +b.dataset.m * 10) / 10; P = await api(`/projects/${P.id}/audio`, { method: 'PUT', json: { bpm: nb, offset: P.audio.offset || 0, mixLevelDb: P.audio.mixLevelDb } }); toast(`Tempo set to ${nb} BPM.`); tabSound(); break; }
      case 'beatmap': P = await api(`/projects/${P.id}/audio`, { method: 'PUT', json: { bpm: $('#bpm').value, offset: $('#off').value, mixLevelDb: $('#mix').value } }); toast('Beat map saved to audio/beats.json.'); tabSound(); break;
      case 'save-scores': await saveReview(); toast('Scores saved.'); tabReview(); break;
      case 'commit-round': { const r = await saveReview({ commitRound: true }); toast(r.passed ? 'Gate passed for three consecutive rounds.' : 'Round recorded.'); route(); break; }
      case 'add-issue': { const text = $('#ix').value.trim(); if (!text) { $('#ix').focus(); break; } await saveReview(); const issues = [...(P.review?.issues || []), { time: +$('#it').value, category: $('#ic').value, text, severity: $('#is').value, done: false }]; const r = await api(`/projects/${P.id}/review`, { method: 'PUT', json: { scores: P.review?.scores || {}, issues } }); P = r.project; tabReview(); break; }
      case 'del-issue': { const issues = (P.review?.issues || []).filter((_, n) => n !== +b.dataset.n); const r = await api(`/projects/${P.id}/review`, { method: 'PUT', json: { scores: P.review?.scores || {}, issues } }); P = r.project; tabReview(); break; }
      case 'issue-seek': window._pendingScene = Math.max(0, plan.findIndex((s) => +b.dataset.t >= s.startSeconds && +b.dataset.t < s.endSeconds)); location.hash = `#/p/${P.id}/preview`; break;
      case 'fix-issues': {
        await saveReview(); const chosen = (P.review?.issues || []).filter((x) => x.done);
        if (!chosen.length) { toast('Select at least one issue first.', 'error'); break; }
        const text = `Targeted fix pass for "${P.name}". Fix only these, re-render only the affected seconds, then regenerate contact.png, strip.png and phone.png and log old vs new scores in docs/review_log.md:\n\n` + chosen.map((x) => `- ${fmt(x.time)} [${x.category}, ${x.severity}] ${x.text}`).join('\n');
        const r = await modal({ title: 'Fix pass prompt', wide: true, body: `<pre class="prompt" id="fixp">${esc(text)}</pre>`, actions: [{ label: 'Close', value: null }, { label: 'Copy prompt', kind: 'primary', value: 'copy' }] });
        if (r === 'copy') { await navigator.clipboard.writeText(text); toast('Prompt copied.'); }
        break;
      }
      case 'gen-proofs': genProofs(); break;
      case 'proof-open': { const t = +b.dataset.t; const w = Math.min(420, window.innerHeight * 0.7 * P.outputWidth / P.outputHeight); await modal({ title: `Frame at ${t.toFixed(2)} s`, body: `<div style="display:flex;justify-content:center"><iframe id="big" data-t="${t}" src="/files/${P.id}/index.html?manual=1" style="border:0;width:${w}px;height:${w * P.outputHeight / P.outputWidth}px;background:#000" title="Frame preview"></iframe></div>`, actions: [{ label: 'Close', value: null }] }); break; }
    }
  } catch (err) { toast(err.message, 'error'); }
});
document.addEventListener('load', (e) => { if (e.target.id === 'big') { const w = e.target.contentWindow; (w.__ready || Promise.resolve()).then(() => w.seek(+e.target.dataset.t || 0)); } }, true);

window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
route();
