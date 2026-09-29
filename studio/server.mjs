// Local orchestrator + static server for the Video Studio UI. No dependencies. Binds to 127.0.0.1 only.
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { join, extname, normalize, resolve, sep, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt, randomBytes } from 'node:crypto';
import { STYLES, STATUSES, slugify, validateBrief, generatePlan, validateScenes, rebalance } from './lib/plan.mjs';
import { decode, analyze } from './lib/beats.mjs';
import { fetchMedia, MEDIA_EXT } from './lib/refs.mjs';
import { captureSite } from './lib/capture.mjs';
import { scaffold, tree, promptText, writeFileAtomic, shotlistMd, styleGuideMd } from './lib/scaffold.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PUBLIC = join(HERE, 'public');
const HOME = resolve(process.env.STUDIO_HOME || join(HERE, 'projects'));
const PORT = Number(process.env.PORT || 4173);
const MAX_UPLOAD = 500 * 1024 * 1024;
mkdirSync(HOME, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.m4v': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.m4v'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const AUDIO_EXT = ['.mp3', '.wav', '.m4a'];

const send = (res, code, body, headers = {}) => {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? 'application/json' : 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
};
const fail = (res, code, message, extra = {}) => send(res, code, { error: message, ...extra });

async function readJson(req) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 2e6) throw new Error('Request too large.'); chunks.push(c); }
  if (!n) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new Error('Invalid JSON.'); }
}

// ---------- projects ----------
const pdir = (id) => join(HOME, id);
const pfile = (id) => join(pdir(id), 'project.json');
const validId = (id) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(id) && existsSync(pfile(id));
const load = (id) => ({ ...JSON.parse(readFileSync(pfile(id), 'utf8')), path: pdir(id) });
function save(p) {
  p.updatedAt = new Date().toISOString();
  const { path: _omit, ...persist } = p;
  writeFileAtomic(pfile(p.id), JSON.stringify(persist, null, 2));
  return p;
}
function uniqueId(base) {
  let id = base || 'video', i = 2;
  while (existsSync(pdir(id))) id = `${base}-${i++}`;
  return id;
}
function finishReference(p, name, sourceKind, sourceRef) {
  const id = p.id, ext = extname(name).toLowerCase(), isVideo = VIDEO_EXT.includes(ext), isImage = IMAGE_EXT.includes(ext);
  const rel = `refs/original/${name}`, file = join(pdir(id), rel);
  const info = probe(file);
  const ff = preflight().checks.find((c) => c.id === 'ffmpeg').ok;
  let frames = [];
  if (ff && info) frames = extractFrames(pdir(id), file, info.duration, isVideo).map((f) => `refs/frames/${f}`);
  p.reference = { name, path: rel, mediaType: isVideo ? 'video' : 'image', size: statSync(file).size, duration: isVideo && info ? info.duration : null, width: info && info.width, height: info && info.height, frames, thumb: frames[0] || (isImage ? rel : null), sourceKind, sourceRef: sourceRef || null, ffmpeg: ff };
  if (p.styleGuide) p.styleGuide.take = generatePlan({ ...p, hasReference: true }).styleGuide.take;
  return save(p);
}
const summary = (p) => ({ id: p.id, name: p.name, topic: p.topic, durationSeconds: p.durationSeconds, outputWidth: p.outputWidth, outputHeight: p.outputHeight, status: p.status, stage: p.stage, updatedAt: p.updatedAt, createdAt: p.createdAt, hasPreview: existsSync(join(pdir(p.id), 'data.js')), thumb: p.reference && p.reference.thumb ? `/files/${p.id}/${p.reference.thumb}` : null, palette: p.styleGuide ? p.styleGuide.palette : null });

function listProjects() {
  return readdirSync(HOME).filter((d) => /^[a-z0-9][a-z0-9-]*$/.test(d) && existsSync(pfile(d))).map((d) => { try { return summary(load(d)); } catch { return null; } }).filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ---------- tools ----------
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 20000, ...opts });
  return r;
}
function preflight() {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  const ff = run('ffmpeg', ['-version']);
  const fp = run('ffprobe', ['-version']);
  const claude = run('claude', ['--version']);
  let playwright = false;
  for (const base of [REPO, HERE, process.cwd()]) { if (existsSync(join(base, 'node_modules', 'playwright'))) playwright = true; }
  const chromium = playwright || existsSync(join(process.env.HOME || '', 'Library/Caches/ms-playwright')) || existsSync(join(process.env.HOME || '', '.cache/ms-playwright'));
  const win = process.platform === 'win32';
  return {
    platform: process.platform,
    checks: [
      { id: 'node', label: 'Node.js 22+', ok: nodeMajor >= 22, detail: process.version, fix: 'Install Node.js 22 or newer: https://nodejs.org' },
      { id: 'ffmpeg', label: 'ffmpeg', ok: ff.status === 0, detail: ff.status === 0 ? ff.stdout.split('\n')[0] : 'not found', fix: win ? 'winget install Gyan.FFmpeg' : 'brew install ffmpeg   (macOS)  or  sudo apt install ffmpeg' },
      { id: 'ffprobe', label: 'ffprobe', ok: fp.status === 0, detail: fp.status === 0 ? 'found' : 'not found', fix: 'Installed with ffmpeg.' },
      { id: 'chromium', label: 'Chromium via Playwright', ok: !!chromium, detail: chromium ? 'found' : 'not found', fix: 'In a project folder: npm install && npx playwright install chromium' },
      { id: 'claude', label: 'Claude Code', ok: claude.status === 0, detail: claude.status === 0 ? claude.stdout.trim() : 'not found', fix: 'npm install -g @anthropic-ai/claude-code' },
    ],
  };
}

function probe(file) {
  const r = run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  if (r.status !== 0) return null;
  try {
    const j = JSON.parse(r.stdout);
    const v = (j.streams || []).find((s) => s.codec_type === 'video');
    return { duration: Number(j.format && j.format.duration) || 0, width: v ? v.width : null, height: v ? v.height : null };
  } catch { return null; }
}

function extractFrames(dir, file, duration, isVideo) {
  const out = join(dir, 'refs', 'frames');
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) rmSync(join(out, f));
  if (!isVideo) { run('ffmpeg', ['-y', '-i', file, '-vf', 'scale=640:-2', join(out, 'f001.jpg')]); return readdirSync(out).sort(); }
  const n = Math.max(1, Math.min(12, Math.floor(duration / 0.5) || 1));
  const fps = n / Math.max(duration, 0.5);
  run('ffmpeg', ['-y', '-i', file, '-vf', `fps=${fps},scale=640:-2`, '-frames:v', String(n), join(out, 'f%03d.jpg')], { timeout: 120000 });
  return readdirSync(out).sort();
}

// ---------- request handling ----------
const jobs = new Map(); // projectId -> { kind, state, done, total, log[], startedAt, endedAt, error, child }
const jobView = (j) => j && { kind: j.kind, size: j.size, state: j.state, done: j.done, total: j.total, log: j.log.slice(-200), startedAt: j.startedAt, endedAt: j.endedAt, error: j.error };
function startJob(p, kind, size) {
  const old = jobs.get(p.id);
  if (old && old.state === 'running') throw Object.assign(new Error('A render is already running for this project.'), { status: 409 });
  const child = spawn(process.execPath, [join(HERE, 'lib', 'render-job.mjs'), pdir(p.id), kind, ...(size ? [`${size[0]}x${size[1]}`] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
  const j = { kind, size, state: 'running', done: 0, total: 0, log: [], startedAt: new Date().toISOString(), endedAt: null, error: null, child };
  jobs.set(p.id, j);
  const onData = (buf) => {
    for (const line of buf.toString().split('\n')) {
      if (!line.trim()) continue;
      const m = /^PROGRESS (\d+) (\d+)/.exec(line);
      if (m) { j.done = +m[1]; j.total = +m[2]; continue; }
      j.log.push(line.replace(/(key|token|secret)[=:]\S+/gi, '$1=***'));
      if (j.log.length > 400) j.log.shift();
      const e = /^ERROR (.*)/.exec(line); if (e) j.error = e[1];
    }
  };
  child.stdout.on('data', onData); child.stderr.on('data', onData);
  child.on('close', (code, sig) => {
    j.endedAt = new Date().toISOString(); j.child = null;
    const cur = load(p.id);
    if (j.state === 'cancelled') { cur.status = cur.stage === 'delivered' ? 'Complete' : 'Preview ready'; }
    else if (code === 0) { j.state = 'done'; cur.status = kind === 'final' ? 'Complete' : 'Preview ready'; if (kind === 'final') cur.stage = 'delivered'; else if (cur.stage === 'animatic') cur.stage = 'animatic'; }
    else { j.state = 'failed'; j.error = j.error || `Render stopped (exit ${code ?? sig}).`; cur.status = 'Needs attention'; }
    save(cur);
  });
  const cur = load(p.id); cur.status = 'Rendering'; save(cur);
  return j;
}

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // after "api"
  const m = req.method;

  if (parts[0] === 'preflight' && m === 'GET') return send(res, 200, preflight());
  if (parts[0] === 'meta' && m === 'GET') return send(res, 200, { styles: Object.fromEntries(Object.entries(STYLES).map(([k, v]) => [k, { label: v.label, palette: v.palette }])), statuses: STATUSES });

  if (parts[0] === 'projects' && parts.length === 1) {
    if (m === 'GET') return send(res, 200, listProjects());
    if (m === 'POST') {
      const body = await readJson(req);
      const { errors, value } = validateBrief(body);
      if (Object.keys(errors).length) return fail(res, 422, 'Fix the highlighted fields.', { fields: errors });
      const name = value.name || value.topic.split(/[.!?\n]/)[0].slice(0, 48).trim();
      const id = uniqueId(slugify(value.name || name));
      const now = new Date().toISOString();
      const p = { id, name: value.name || name, topic: value.topic, style: value.style, customStyle: value.customStyle, durationSeconds: value.durationSeconds, outputWidth: value.outputWidth, outputHeight: value.outputHeight, fps: value.fps, status: 'Planning', stage: 'plan', createdAt: now, updatedAt: now, seed: Number.isInteger(Number(body.seed)) && body.seed !== '' ? Number(body.seed) : randomInt(1, 2 ** 31 - 1), framework: ['seek', 'remotion', 'hyperframes'].includes(body.framework) ? body.framework : 'seek', reference: null, audio: null, review: null, approvedAt: null, path: pdir(id) };
      mkdirSync(pdir(id), { recursive: true });
      for (const d of ['refs/frames', 'docs']) mkdirSync(join(pdir(id), d), { recursive: true });
      save(p);
      return send(res, 201, p);
    }
  }

  if (parts[0] === 'projects' && parts[1]) {
    const id = parts[1];
    if (!validId(id)) return fail(res, 404, 'Project not found.');
    const p = load(id);
    const sub = parts[2];

    if (!sub) {
      if (m === 'GET') return send(res, 200, p);
      if (m === 'DELETE') {
        const trash = join(HOME, '.trash'); mkdirSync(trash, { recursive: true });
        renameSync(pdir(id), join(trash, `${id}-${Date.now()}`));
        return send(res, 200, { ok: true });
      }
      if (m === 'PUT') {
        const b = await readJson(req);
        if (typeof b.name === 'string') {
          const name = b.name.trim();
          if (!name || name.length > 60 || !/^[\w -]+$/.test(name)) return fail(res, 422, 'Use letters, digits, spaces, hyphens or underscores (60 max).');
          p.name = name;
        }
        return send(res, 200, save(p));
      }
    }

    if (sub === 'plan') {
      if (m === 'POST') { // (re)generate
        const plan = generatePlan({ ...p, hasReference: !!p.reference });
        Object.assign(p, plan, { status: 'Draft', stage: 'plan', approvedAt: null });
        return send(res, 200, save(p));
      }
      if (m === 'PUT') {
        const b = await readJson(req);
        if (p.approvedAt && !b.force) return fail(res, 409, 'This plan is approved. Editing it will need a new build.', { needsForce: true });
        if (typeof b.logline === 'string') p.logline = b.logline.slice(0, 160);
        if (b.styleGuide) {
          const g = p.styleGuide || {};
          for (const k of ['take', 'avoid']) if (Array.isArray(b.styleGuide[k])) g[k] = b.styleGuide[k].map(String).map((x) => x.slice(0, 80)).filter(Boolean).slice(0, 8);
          p.styleGuide = g;
        }
        let scenes = Array.isArray(b.scenes) ? b.scenes : p.scenes;
        if (b.rebalance) scenes = rebalance(scenes, p.durationSeconds);
        scenes = scenes.map((s, i) => ({ ...s, order: i + 1, startSeconds: Number(s.startSeconds), endSeconds: Number(s.endSeconds), onScreenText: (s.onScreenText || []).map(String).filter(Boolean) }));
        const errors = validateScenes(scenes, p.durationSeconds, p.fps);
        p.scenes = scenes;
        if (p.approvedAt) { p.approvedAt = null; p.status = 'Draft'; p.stage = 'plan'; }
        save(p);
        return send(res, 200, { project: p, errors });
      }
    }

    if (sub === 'approve' && m === 'POST') {
      const errors = validateScenes(p.scenes || [], p.durationSeconds, p.fps);
      if (errors.length) return fail(res, 422, 'Fix the timing before approving.', { errors });
      p.approvedAt = new Date().toISOString();
      if (p.audio) p.audio.beatsPath = existsSync(join(pdir(id), 'audio', 'beats.json')) ? 'audio/beats.json' : null;
      scaffold(pdir(id), p);
      p.status = 'Preview ready'; p.stage = 'animatic';
      save(p);
      return send(res, 200, p);
    }

    if (sub === 'prompt' && m === 'GET') return send(res, 200, promptText(p));

    if (sub === 'reference' && m === 'POST') {
      const name = basename(url.searchParams.get('name') || 'reference').replace(/[^\w.\- ]/g, '_');
      if (!MEDIA_EXT.includes(extname(name).toLowerCase())) return fail(res, 415, 'Use mp4, mov, webm, m4v, png, jpg or webp.');
      if (Number(req.headers['content-length'] || 0) > MAX_UPLOAD) return fail(res, 413, 'That file is over 500 MB.');
      mkdirSync(join(pdir(id), 'refs', 'original'), { recursive: true });
      await pipeline(req, createWriteStream(join(pdir(id), 'refs', 'original', name)));
      return send(res, 200, finishReference(p, name, 'upload'));
    }
    if (sub === 'reference-link' && m === 'POST') {
      const b = await readJson(req);
      const kind = b.url ? 'url' : b.path ? 'path' : null;
      if (!kind) return fail(res, 422, 'Enter a link or a local file path.');
      mkdirSync(join(pdir(id), 'refs', 'original'), { recursive: true });
      if (kind === 'url') {
        try {
          const got = await fetchMedia(String(b.url).trim(), (n) => join(pdir(id), 'refs', 'original', n));
          return send(res, 200, finishReference(p, got.name, 'url', String(b.url).trim()));
        } catch (e) { return fail(res, e.status || 500, e.message); }
      }
      const src = resolve(String(b.path).trim().replace(/^~(?=$|\/)/, process.env.HOME || '~'));
      const ext = extname(src).toLowerCase();
      if (!MEDIA_EXT.includes(ext)) return fail(res, 415, 'Use mp4, mov, webm, m4v, png, jpg or webp.');
      let st; try { st = statSync(src); } catch { return fail(res, 422, 'That file was not found on this computer.'); }
      if (!st.isFile()) return fail(res, 422, 'That path is not a file.');
      if (st.size > MAX_UPLOAD) return fail(res, 413, 'That file is over 500 MB.');
      const name = basename(src).replace(/[^\w.\- ]/g, '_');
      const { copyFileSync } = await import('node:fs');
      copyFileSync(src, join(pdir(id), 'refs', 'original', name));
      return send(res, 200, finishReference(p, name, 'path', src));
    }
    if (sub === 'capture' && m === 'POST') {
      const b = await readJson(req);
      if (!b.authorized) return fail(res, 422, 'Confirm you are allowed to capture this site.');
      if (!b.url) return fail(res, 422, 'Enter the site address.');
      try {
        const man = await captureSite(String(b.url).trim(), pdir(id));
        p.capture = { url: man.source, at: man.capturedAt, files: man.files.filter((f) => f.path).length };
        return send(res, 200, { project: save(p), manifest: man });
      } catch (e) { return fail(res, e.status || 500, e.message); }
    }
    if (sub === 'manifest' && m === 'GET') {
      const f = join(pdir(id), 'assets', 'manifest.json');
      return send(res, 200, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
    }
    if (sub === 'reference' && m === 'DELETE') {
      rmSync(join(pdir(id), 'refs', 'original'), { recursive: true, force: true });
      rmSync(join(pdir(id), 'refs', 'frames'), { recursive: true, force: true });
      mkdirSync(join(pdir(id), 'refs', 'frames'), { recursive: true });
      p.reference = null;
      return send(res, 200, save(p));
    }

    if (sub === 'audio') {
      if (m === 'POST' && !parts[3]) {
        const name = basename(url.searchParams.get('name') || 'track').replace(/[^\w.\- ]/g, '_');
        const ext = extname(name).toLowerCase();
        if (!AUDIO_EXT.includes(ext)) return fail(res, 415, 'Use mp3, wav or m4a.');
        mkdirSync(join(pdir(id), 'audio'), { recursive: true });
        for (const f of readdirSync(join(pdir(id), 'audio'))) if (/^track\./.test(f)) rmSync(join(pdir(id), 'audio', f));
        const rel = `audio/track${ext}`;
        await pipeline(req, createWriteStream(join(pdir(id), rel)));
        const info = probe(join(pdir(id), rel));
        p.audio = { name, path: rel, duration: info ? info.duration : null, bpm: null, beatsPath: null, mixLevelDb: 0, muted: false };
        return send(res, 200, save(p));
      }
      if (m === 'POST' && parts[3] === 'analyze' && p.audio) {
        const ok = preflight().checks.find((c) => c.id === 'ffmpeg');
        if (!ok.ok) return fail(res, 424, 'ffmpeg is not installed. ' + ok.fix);
        let r;
        try { r = analyze(await decode(join(pdir(id), p.audio.path))); } catch (e) { return fail(res, 422, e.message); }
        const beat = 60 / r.bpm, dur = p.audio.duration || r.duration, beats = [];
        for (let t = r.offset; t < dur; t += beat) beats.push(Math.round(t * 1000) / 1000);
        mkdirSync(join(pdir(id), 'audio'), { recursive: true });
        writeFileAtomic(join(pdir(id), 'audio', 'beats.json'), JSON.stringify({ bpm: r.bpm, source: 'auto', confidence: r.confidence, offset: r.offset, beats, downbeats: beats.filter((_, i) => i % 4 === 0), hits: r.hits }, null, 1));
        p.audio.bpm = r.bpm; p.audio.beatsPath = 'audio/beats.json'; p.audio.confidence = r.confidence; p.audio.offset = r.offset;
        return send(res, 200, save(p));
      }
      if (m === 'PUT' && p.audio) {
        const b = await readJson(req);
        const bpm = Number(b.bpm), offset = Number(b.offset || 0);
        if (!(bpm >= 40 && bpm <= 240)) return fail(res, 422, 'Enter a tempo between 40 and 240 BPM.');
        const beat = 60 / bpm, dur = p.audio.duration || p.durationSeconds;
        const beats = []; for (let t = offset; t < dur; t += beat) beats.push(Math.round(t * 1000) / 1000);
        mkdirSync(join(pdir(id), 'audio'), { recursive: true });
        writeFileAtomic(join(pdir(id), 'audio', 'beats.json'), JSON.stringify({ bpm, source: 'manual', beats, downbeats: beats.filter((_, i) => i % 4 === 0), hits: [] }, null, 1));
        p.audio.bpm = bpm; p.audio.beatsPath = 'audio/beats.json'; p.audio.confidence = null; p.audio.offset = offset;
        if (b.mixLevelDb !== undefined) p.audio.mixLevelDb = Math.max(-40, Math.min(0, Number(b.mixLevelDb) || 0));
        return send(res, 200, save(p));
      }
      if (m === 'DELETE') {
        rmSync(join(pdir(id), 'audio'), { recursive: true, force: true });
        p.audio = null;
        return send(res, 200, save(p));
      }
    }

    if (sub === 'beats' && m === 'GET') {
      const f = join(pdir(id), 'audio', 'beats.json');
      return send(res, 200, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : { bpm: null, beats: [], downbeats: [], hits: [] });
    }

    if (sub === 'review' && m === 'PUT') {
      const b = await readJson(req);
      const CATS = ['hook', 'readability', 'motion', 'variety', 'composition', 'style', 'sync'];
      const scores = {};
      for (const c of CATS) { const v = Number(b.scores && b.scores[c]); if (b.scores && b.scores[c] !== undefined && b.scores[c] !== null && b.scores[c] !== '') { if (!Number.isInteger(v) || v < 1 || v > 10) return fail(res, 422, 'Scores are whole numbers from 1 to 10.'); scores[c] = v; } }
      const issues = (Array.isArray(b.issues) ? b.issues : []).slice(0, 50).map((i) => ({ time: Math.max(0, Number(i.time) || 0), category: CATS.includes(i.category) ? i.category : 'motion', text: String(i.text || '').slice(0, 160), severity: i.severity === 'blocking' ? 'blocking' : 'minor', done: !!i.done })).filter((i) => i.text);
      const prev = p.review || { rounds: [] };
      const rounds = Array.isArray(prev.rounds) ? prev.rounds.slice() : [];
      if (b.commitRound && Object.keys(scores).length === CATS.length) rounds.push({ at: new Date().toISOString(), scores });
      p.review = { scores, issues, rounds };
      const passed = rounds.length >= 3 && rounds.slice(-3).every((r) => Object.values(r.scores).every((v) => v >= 8));
      if (p.stage === 'animatic' && Object.keys(scores).length) p.stage = 'critique';
      if (passed) { p.status = 'Complete'; p.stage = 'delivered'; } else if (Object.values(scores).some((v) => v < 8) && p.status === 'Complete') { p.status = 'Needs attention'; }
      save(p);
      return send(res, 200, { project: p, passed });
    }

    if (sub === 'render' && m === 'POST') {
      if (!p.approvedAt) return fail(res, 409, 'Approve the plan before rendering.');
      const b = await readJson(req);
      if (!['animatic', 'final'].includes(b.kind)) return fail(res, 422, 'Choose animatic or final.');
      const ff = preflight().checks.find((c) => c.id === 'ffmpeg');
      if (!ff.ok) return fail(res, 424, 'ffmpeg is not installed. ' + ff.fix);
      let size = null;
      if (b.width || b.height) {
        const ok = (n) => Number.isInteger(n) && n >= 240 && n <= 4096 && n % 2 === 0;
        if (b.kind !== 'final' || !ok(Number(b.width)) || !ok(Number(b.height))) return fail(res, 422, 'Width and height must be even numbers from 240 to 4096.');
        size = [Number(b.width), Number(b.height)];
      }
      try { return send(res, 202, jobView(startJob(p, b.kind, size))); } catch (e) { return fail(res, e.status || 500, e.message); }
    }
    if (sub === 'job' && m === 'GET') return send(res, 200, jobView(jobs.get(id)) || { state: 'idle' });
    if (sub === 'job' && m === 'DELETE') {
      const j = jobs.get(id);
      if (!j || j.state !== 'running') return fail(res, 409, 'Nothing is running.');
      j.state = 'cancelled'; j.child && j.child.kill('SIGTERM');
      return send(res, 200, jobView(j));
    }
    if (sub === 'files' && m === 'GET') return send(res, 200, tree(pdir(id)));
    if (sub === 'reveal' && m === 'POST') {
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
      spawn(cmd, [pdir(id)], { detached: true, stdio: 'ignore' }).unref();
      return send(res, 200, { ok: true, path: pdir(id) });
    }
    if (sub === 'duplicate' && m === 'POST') {
      const nid = uniqueId(slugify(p.name + ' copy'));
      const { cpSync } = await import('node:fs');
      cpSync(pdir(id), pdir(nid), { recursive: true });
      const np = load(nid); np.id = nid; np.name = p.name + ' copy'; np.status = 'Draft'; np.stage = 'plan'; np.approvedAt = null; np.createdAt = new Date().toISOString();
      return send(res, 201, save(np));
    }
    if (sub === 'export' && m === 'GET') {
      // exports are produced by the project's own scripts; report what exists
      const out = join(pdir(id), 'out');
      const files = existsSync(out) ? readdirSync(out).map((f) => ({ name: f, size: statSync(join(out, f)).size, url: `/files/${id}/out/${encodeURIComponent(f)}` })) : [];
      return send(res, 200, { files });
    }
  }

  return fail(res, 404, 'Not found.');
}

function serveFile(req, res, file) {
  let st;
  try { st = statSync(file); } catch { return fail(res, 404, 'Not found.'); }
  if (!st.isFile()) return fail(res, 404, 'Not found.');
  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  if (range && /^bytes=\d*-\d*$/.test(range)) {
    let [a, b] = range.replace('bytes=', '').split('-');
    a = a === '' ? Math.max(0, st.size - Number(b)) : Number(a); b = b === '' || range.endsWith('-') ? st.size - 1 : Math.min(Number(b), st.size - 1);
    if (a > b || a >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1 });
    return createReadStream(file, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}

const inside = (base, target) => { const t = resolve(target); return t === base || t.startsWith(base + sep); };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const host = (req.headers.host || '').split(':')[0];
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host)) return fail(res, 403, 'Local access only.');
    if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return fail(res, 403, 'Cross-origin request blocked.');
    const path = decodeURIComponent(url.pathname);
    if (path.startsWith('/api/')) return await api(req, res, url);
    if (path.startsWith('/files/')) {
      const [, , id, ...rest] = path.split('/');
      if (!validId(id)) return fail(res, 404, 'Not found.');
      const file = normalize(join(pdir(id), ...rest));
      if (!inside(pdir(id), file) || rest.some((s) => s.startsWith('.'))) return fail(res, 403, 'Forbidden.');
      return serveFile(req, res, file);
    }
    if (path.startsWith('/fonts/') || path === '/paper-grain.png') {
      const base = join(REPO, 'assets');
      const file = normalize(join(base, path.startsWith('/fonts/') ? path : 'paper-grain.png'));
      if (!inside(base, file)) return fail(res, 403, 'Forbidden.');
      return serveFile(req, res, file);
    }
    const file = normalize(join(PUBLIC, path === '/' ? 'index.html' : path));
    if (!inside(PUBLIC, file)) return fail(res, 403, 'Forbidden.');
    if (!existsSync(file)) return serveFile(req, res, join(PUBLIC, 'index.html')); // SPA fallback
    return serveFile(req, res, file);
  } catch (e) {
    if (!res.headersSent) fail(res, 500, e.message || 'Server error.'); else res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Video Studio running at http://127.0.0.1:${PORT}`);
  console.log(`Projects folder: ${HOME}`);
});
