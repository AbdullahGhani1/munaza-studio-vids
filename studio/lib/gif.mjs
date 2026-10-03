// Video → GIF converter: import by link (yt-dlp) or upload, trim, then a 2-pass palettegen/paletteuse encode with ffmpeg.
// Items live in <home>/.gif/<id>/ and are swept after a day. Nothing here touches the studio projects.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync, renameSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { checkUrl } from './refs.mjs';

export const MAX_SECONDS = 600;
export const GIF_MAX_FPS = 50; // a GIF frame delay is a whole number of 10 ms ticks, and browsers play 10 ms delays slowly
export const HEIGHTS = [240, 360, 480, 720, 1080];
export const DITHERS = { bayer: 'bayer', floyd: 'floyd_steinberg', sierra: 'sierra2_4a', none: 'none' };
const SOURCE_EXT = ['.mp4', '.mov', '.webm', '.m4v', '.mkv', '.gif'];
const BROWSER_CODECS = ['h264', 'vp8', 'vp9', 'av1'];
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const bad = (message, status = 422) => Object.assign(new Error(message), { status });

export function createGifService({ home, run }) {
  const root = join(home, '.gif');
  mkdirSync(root, { recursive: true });
  const items = new Map();
  const dir = (id) => join(root, id);
  const valid = (id) => /^[a-f0-9]{12}$/.test(id) && items.has(id);

  const sweep = () => { for (const d of readdirSync(root)) { try { if (Date.now() - statSync(join(root, d)).mtimeMs > 864e5) rmSync(join(root, d), { recursive: true, force: true }); } catch { /* ignore */ } } };
  sweep();

  let tools = null;
  function status() {
    if (!tools) {
      const y = run('yt-dlp', ['--version']);
      tools = { ytdlp: y.status === 0, ytdlpVersion: y.status === 0 ? y.stdout.trim() : null, ffmpeg: run('ffmpeg', ['-version']).status === 0 };
    }
    return { ...tools, maxSeconds: MAX_SECONDS, maxFps: GIF_MAX_FPS };
  }

  function probe(file) {
    const r = run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
    if (r.status !== 0) return null;
    try {
      const j = JSON.parse(r.stdout), v = (j.streams || []).find((s) => s.codec_type === 'video');
      if (!v) return null;
      const [a, b] = String(v.avg_frame_rate || v.r_frame_rate || '0/1').split('/').map(Number);
      return { duration: Number(j.format.duration) || Number(v.duration) || 0, width: v.width, height: v.height, fps: b ? Math.round((a / b) * 100) / 100 : 0, codec: v.codec_name, hasAudio: (j.streams || []).some((s) => s.codec_type === 'audio') };
    } catch { return null; }
  }

  const view = (it) => ({ id: it.id, state: it.state, stage: it.stage, progress: it.progress, speed: it.speed || '', title: it.title, source: it.source, error: it.error, info: it.info, log: it.log.slice(-8), video: it.state === 'ready' ? `/gif/${it.id}/${it.videoFile}` : null, convert: it.convert ? { ...it.convert, child: undefined, url: it.convert.state === 'done' ? `/gif/${it.id}/out.gif?v=${it.convert.n}` : null } : null });
  const fresh = (source, title) => {
    const id = randomBytes(6).toString('hex');
    mkdirSync(dir(id), { recursive: true });
    const it = { id, state: 'working', stage: 'Starting', progress: 0, title, source, error: null, info: null, log: [], videoFile: 'source.mp4', convert: null, child: null, created: Date.now() };
    items.set(id, it);
    return it;
  };
  const fail = (it, message) => { it.state = 'error'; it.error = message; };

  // finish an imported/uploaded file: probe, enforce the length limit, make a browser-playable proxy when needed
  function finalize(it, file) {
    const info = probe(file);
    if (!info || !info.width) return fail(it, 'That file is not a video we can read.');
    if (info.duration > MAX_SECONDS + 0.5) return fail(it, `That video is ${Math.round(info.duration)} s. The limit is ${MAX_SECONDS / 60} minutes; trim it first or pick a shorter one.`);
    if (!(info.duration > 0)) { // screen recordings (MediaRecorder webm) carry no duration: remux through a real encode
      it.stage = 'Preparing recording';
      const fixed = join(dir(it.id), 'fixed.mp4');
      const r = run('ffmpeg', ['-y', '-i', file, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-r', '60', '-movflags', '+faststart', fixed], { timeout: 900000 });
      const fi = r.status === 0 && probe(fixed);
      if (!fi || !(fi.duration > 0)) return fail(it, 'We could not read that recording.');
      file = fixed; Object.assign(info, fi, { codec: 'h264' });
      if (info.duration > MAX_SECONDS + 0.5) return fail(it, `That recording is ${Math.round(info.duration)} s. The limit is ${MAX_SECONDS / 60} minutes.`);
    }
    let play = file;
    if (!BROWSER_CODECS.includes(info.codec) || extname(file) === '.mkv') {
      it.stage = 'Preparing preview';
      const proxy = join(dir(it.id), 'proxy.mp4');
      const r = run('ffmpeg', ['-y', '-i', file, '-an', '-vf', 'scale=-2:min(ih\\,720)', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', proxy], { timeout: 600000 });
      if (r.status !== 0) return fail(it, 'We could not prepare a preview of that video.');
      play = proxy; it.videoFile = 'proxy.mp4';
    } else it.videoFile = file.slice(dir(it.id).length + 1);
    it.playFile = play; it.srcFile = file; it.info = info; it.state = 'ready'; it.stage = 'Ready to trim'; it.progress = 1;
  }

  function importLink(raw) {
    const s = status();
    if (!s.ytdlp) throw bad('Links need yt-dlp. Install it with: brew install yt-dlp   (or pip install yt-dlp). You can still upload a file.', 424);
    const url = String(raw || '').trim();
    return checkUrl(url, { platforms: true }).then((u) => {
      const it = fresh(u.href, u.hostname.replace(/^www\./, ''));
      const out = join(dir(it.id), 'dl.%(ext)s');
      const base = ['--no-playlist', '--no-warnings', '--no-exec', '--newline', '--ignore-config', '--restrict-filenames', '--socket-timeout', '30',
        '--match-filters', `!is_live & duration<=${MAX_SECONDS}`, '--max-filesize', '1500M',
        '-S', 'vcodec:h264,res:1080,acodec:aac', '-f', 'bv*[height<=1080]+ba/b[height<=1080]/b', '--merge-output-format', 'mp4',
        '--no-simulate', '--progress', '--print', 'before_dl:TITLE %(title)s', '--progress-template', 'download:PROG %(progress._percent_str)s %(progress._speed_str)s', '-o', out];
      // YouTube often refuses yt-dlp's default player client with a 403; the embedded/mobile clients usually work, so try them first
      const yt = /(^|\.)(youtube\.com|youtu\.be)$/i.test(u.hostname);
      const attempts = yt ? [['--extractor-args', 'youtube:player_client=web_embedded,mweb'], [], ['--extractor-args', 'youtube:player_client=tv_simply,android_vr,web_safari']] : [[]];
      let filtered = false, errLine = '';
      const onLine = (line) => {
        line = line.trim(); if (!line) return;
        const t = /^TITLE (.+)/.exec(line); if (t) { it.title = t[1].slice(0, 120); return; }
        const p = /^PROG\s+([\d.]+)%\s*(\S*)/.exec(line); if (p) { it.progress = Math.min(0.95, Number(p[1]) / 100); it.speed = p[2] && p[2] !== 'N/A' ? p[2] : ''; return; }
        if (/does not pass filter/i.test(line)) filtered = true;
        if (/^ERROR/i.test(line)) errLine = line.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/i, '');
        if (/Merging/.test(line)) it.stage = 'Merging';
        it.log.push(line.slice(0, 200));
      };
      const attempt = (i) => {
        for (const f of readdirSync(dir(it.id))) if (f.startsWith('dl.')) rmSync(join(dir(it.id), f), { force: true });
        const child = spawn('yt-dlp', [...attempts[i], ...base, '--', u.href], { stdio: ['ignore', 'pipe', 'pipe'] });
        it.child = child; it.stage = i ? 'Retrying with another method' : 'Fetching video'; it.progress = 0; errLine = '';
        let buf = '', stall = null;
        const arm = () => { clearTimeout(stall); stall = setTimeout(() => { it.log.push('stalled, trying another method'); child.kill('SIGKILL'); }, 60000); }; arm();
        const feed = (d) => { arm(); buf += d; const parts = buf.split(/\r?\n/); buf = parts.pop(); parts.forEach(onLine); };
        child.stdout.on('data', (d) => feed(d.toString())); child.stderr.on('data', (d) => feed(d.toString()));
        child.on('error', () => fail(it, 'yt-dlp could not be started.'));
        child.on('close', (code) => {
          clearTimeout(stall); it.child = null; if (buf) onLine(buf);
          if (it.state === 'cancelled') return;
          const file = readdirSync(dir(it.id)).find((f) => f.startsWith('dl.') && SOURCE_EXT.includes(extname(f)));
          if (code === 0 && file) return finalize(it, join(dir(it.id), file));
          if (!filtered && i + 1 < attempts.length) return attempt(i + 1);
          fail(it, filtered ? `That video is longer than ${MAX_SECONDS / 60} minutes (or is a live stream).` : friendly(errLine));
        });
      };
      it.stage = 'Fetching video';
      attempt(0);
      return view(it);
    });
  }
  const friendly = (e) => {
    if (/unsupported url/i.test(e)) return 'That link is not a video page or file we can read.';
    if (/private|sign in|login|members|age/i.test(e)) return 'That video needs a login or is private, so it cannot be fetched.';
    if (/not available|unavailable|removed|geo/i.test(e)) return 'That video is not available from here.';
    if (/HTTP Error 4\d\d/.test(e)) return 'The site refused the download. Try another link or upload the file.';
    return (e || 'The download failed.').slice(0, 200);
  };

  async function importStream(req, name, maxBytes) {
    const { pipeline } = await import('node:stream/promises');
    const { createWriteStream } = await import('node:fs');
    const ext = extname(name).toLowerCase();
    if (!SOURCE_EXT.includes(ext)) throw bad('Use mp4, mov, webm, m4v, mkv or gif.', 415);
    if (Number(req.headers['content-length'] || 0) > maxBytes) throw bad('That file is over 1 GB.', 413);
    const it = fresh('upload', name.replace(/\.[^.]+$/, '').slice(0, 80));
    let file = join(dir(it.id), `upload${ext}`);
    it.stage = 'Reading file';
    try { await pipeline(req, createWriteStream(file)); } catch { rmSync(dir(it.id), { recursive: true, force: true }); items.delete(it.id); throw bad('The upload was interrupted.', 400); }
    if (ext === '.gif') { // a GIF cannot play in a <video>: re-encode it to mp4 first
      it.stage = 'Reading GIF';
      const mp4 = join(dir(it.id), 'upload.mp4');
      const r = run('ffmpeg', ['-y', '-i', file, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', mp4], { timeout: 600000 });
      if (r.status !== 0) { fail(it, 'We could not read that GIF.'); return view(it); }
      file = mp4;
    }
    finalize(it, file);
    return view(it);
  }

  function makeSample(kind) {
    const defs = {
      smpte: { title: 'SMPTE 60FPS Color Matrix', src: 'testsrc2=size=640x360:rate=60:duration=8' },
      fractal: { title: 'Mandelbrot zoom, 60 FPS', src: 'mandelbrot=size=640x360:rate=60:end_pts=480' },
      rgb: { title: 'Colour gradients, 60 FPS', src: 'gradients=size=640x360:rate=60:duration=8:speed=0.03:type=spiral' },
    };
    const d = defs[kind]; if (!d) throw bad('Unknown sample.', 404);
    const it = fresh('sample', d.title);
    const file = join(dir(it.id), 'sample.mp4');
    const r = run('ffmpeg', ['-y', '-f', 'lavfi', '-i', d.src, '-t', '8', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '60', '-movflags', '+faststart', file], { timeout: 120000 });
    if (r.status !== 0 || !existsSync(file)) { fail(it, 'Could not generate that sample.'); return view(it); }
    finalize(it, file);
    return view(it);
  }

  function options(b, info) {
    const dur = info.duration;
    const start = num(b.start, 0, Math.max(0, dur - 0.05), 0);
    const length = num(b.duration, 0.1, Math.min(MAX_SECONDS, dur - start), Math.min(3.5, dur - start));
    const speed = num(b.speed, 0.25, 3, 1);
    const fps = Math.min(GIF_MAX_FPS, Math.max(5, Math.round(num(b.fps, 5, 60, 30))));
    const height = HEIGHTS.includes(Number(b.height)) ? Number(b.height) : 360;
    const colors = [64, 128, 256].includes(Number(b.colors)) ? Number(b.colors) : 256;
    const dither = DITHERS[b.dither] ? b.dither : 'bayer';
    const bayerScale = Math.round(num(b.bayerScale, 0, 5, 3));
    return { start, length, speed, fps, height, colors, dither, bayerScale, boomerang: !!b.boomerang, reverse: !!b.reverse, captionPos: b.captionPos === 'top' ? 'top' : 'bottom' };
  }

  function convert(id, b) {
    if (!valid(id)) throw bad('That video is no longer here. Import it again.', 404);
    const it = items.get(id);
    if (it.state !== 'ready') throw bad('The video is not ready yet.', 409);
    if (it.convert && it.convert.state === 'running') throw bad('A conversion is already running for this video.', 409);
    const o = options(b, it.info);
    let nFrames = 0;
    if (b.fromFrames) {
      const fdir = join(dir(id), 'frames');
      nFrames = existsSync(fdir) ? readdirSync(fdir).filter((f) => /^\d{5}\.jpg$/.test(f)).length : 0;
      if (nFrames < 2) throw bad('No frames were received.');
      o.length = nFrames / o.fps; o.speed = 1;
    }
    const outLen = o.length / o.speed;
    const outFps = o.fps, h = Math.min(o.height, it.info.height), w = Math.round(h * it.info.width / it.info.height / 2) * 2;
    const frames = b.fromFrames ? nFrames : Math.round(outLen * outFps);
    if ((o.reverse || o.boomerang) && frames * w * h * 1.5 > 1.5e9) throw bad('Reverse and boomerang hold every frame in memory. Use a shorter clip, a lower frame rate or a smaller size.');
    if (frames * (o.boomerang ? 2 : 1) > 6000) throw bad('That would be over 6000 frames. Shorten the clip or lower the frame rate.');
    let overlay = null;
    if (typeof b.captionPng === 'string' && b.captionPng.startsWith('data:image/png;base64,')) {
      const raw = Buffer.from(b.captionPng.slice(22), 'base64');
      if (raw.length > 1.5e6 || raw.subarray(1, 4).toString() !== 'PNG') throw bad('The caption image is not valid.');
      overlay = join(dir(id), 'caption.png'); writeFileSync(overlay, raw);
    }
    const n = (it.convert?.n || 0) + 1;
    const c = { n, state: 'running', stage: 'Analysing colours', progress: 0, frames: frames * (o.boomerang ? 2 : 1), width: w, height: h, fps: outFps, seconds: outLen * (o.boomerang ? 2 : 1), size: null, error: null, options: o };
    it.convert = c;
    // input-side seek, then speed → fps → scale → reverse/boomerang → caption, built as one filter graph
    const head = ['[0:v]' + [...(b.fromFrames ? [] : [`setpts=PTS/${o.speed}`, `fps=${outFps}`]), `scale=-2:${h}:flags=lanczos`, ...(o.reverse ? ['reverse'] : [])].join(',') + '[v0]'];
    let last = '[v0]';
    if (o.boomerang) { head.push('[v0]split[fa][fb]', '[fb]reverse[fr]', '[fa][fr]concat=n=2:v=1:a=0[v1]'); last = '[v1]'; }
    let inputs = b.fromFrames ? ['-framerate', String(outFps), '-i', join(dir(id), 'frames', '%05d.jpg')] : ['-ss', String(o.start), '-t', String(o.length), '-i', it.srcFile];
    if (overlay) {
      inputs.push('-i', overlay);
      const y = o.captionPos === 'top' ? '0' : 'H-h';
      head.push(`[1:v]scale=${w}:-1[cap]`, `${last}[cap]overlay=0:${y}:format=auto[v2]`);
      last = '[v2]';
    }
    const base = head.join(';');
    const pal = join(dir(id), 'palette.png'), out = join(dir(id), `out-${n}.gif`);
    const dither = o.dither === 'bayer' ? `dither=bayer:bayer_scale=${o.bayerScale}` : `dither=${DITHERS[o.dither]}`;
    const pass = (args, from, to, label) => new Promise((resolve, reject) => {
      c.stage = label;
      const child = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-progress', 'pipe:1', '-nostats', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
      c.child = child; let err = '';
      child.stdout.on('data', (d) => { const m = /out_time_us=(\d+)/g; let x, t = null; while ((x = m.exec(d.toString()))) t = Number(x[1]); if (t !== null) c.progress = from + (to - from) * Math.min(1, t / 1e6 / Math.max(0.1, c.seconds)); });
      child.stderr.on('data', (d) => { err += d; });
      child.on('error', reject);
      child.on('close', (code) => { c.child = null; code === 0 ? resolve() : reject(new Error(err.split('\n').filter(Boolean).pop() || 'ffmpeg failed')); });
    });
    (async () => {
      await pass([...inputs, '-filter_complex', `${base};${last}palettegen=max_colors=${o.colors}:stats_mode=diff[p]`, '-map', '[p]', '-frames:v', '1', '-update', '1', pal], 0, .4, 'Analysing colours');
      await pass([...inputs, '-i', pal, '-filter_complex', `${base};${last}[${overlay ? 2 : 1}:v]paletteuse=${dither}:diff_mode=rectangle`, '-loop', '0', out], .4, 1, 'Encoding GIF');
      c.size = statSync(out).size; c.state = 'done'; c.progress = 1; c.stage = 'Done';
      try { renameSync(out, join(dir(id), 'out.gif')); } catch { /* keep numbered file */ }
    })().catch((e) => { if (c.state !== 'cancelled') { c.state = 'error'; c.error = String(e.message || e).slice(0, 240); } });
    return { ...view(it) };
  }

  const MAX_FRAMES = 5000;
  function resetFrames(id) {
    if (!valid(id)) throw bad('Not found.', 404);
    rmSync(join(dir(id), 'frames'), { recursive: true, force: true });
    mkdirSync(join(dir(id), 'frames'), { recursive: true });
  }
  async function saveFrame(id, n, req) {
    if (!valid(id)) throw bad('Not found.', 404);
    if (!Number.isInteger(n) || n < 1 || n > MAX_FRAMES) throw bad('Bad frame number.');
    if (Number(req.headers['content-length'] || 0) > 12e6) throw bad('Frame too large.', 413);
    const { pipeline } = await import('node:stream/promises');
    const { createWriteStream } = await import('node:fs');
    mkdirSync(join(dir(id), 'frames'), { recursive: true });
    await pipeline(req, createWriteStream(join(dir(id), 'frames', `${String(n).padStart(5, '0')}.jpg`)));
    return { ok: true };
  }

  function cancel(id) {
    if (!valid(id)) throw bad('Not found.', 404);
    const it = items.get(id);
    if (it.convert?.state === 'running') { it.convert.state = 'cancelled'; it.convert.child?.kill('SIGKILL'); }
    else if (it.state === 'working') { it.state = 'cancelled'; it.child?.kill('SIGKILL'); }
    return view(it);
  }

  return {
    status, valid, view, dir,
    get: (id) => (valid(id) ? view(items.get(id)) : null),
    file: (id, name) => (valid(id) && /^[\w.-]+$/.test(name) ? join(dir(id), name) : null),
    title: (id) => items.get(id)?.title || 'clip',
    importLink, importStream, makeSample, convert, cancel, resetFrames, saveFrame,
    remove: (id) => { if (valid(id)) { cancel(id); rmSync(dir(id), { recursive: true, force: true }); items.delete(id); } },
  };
}
