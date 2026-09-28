// Child process: render a project's index.html (window.seek(t)) to MP4 with puppeteer-core + ffmpeg.
// usage: node render-job.mjs <projectDir> <animatic|final>
// Prints "PROGRESS <done> <total>" lines; exits 0 on success. Writes to a temp file, then renames.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const [dir, kind] = process.argv.slice(2);
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = JSON.parse(readFileSync(join(dir, 'project.json'), 'utf8'));

function findChrome() {
  const env = process.env.CHROME_PATH || process.env.HYPERFRAMES_BROWSER_PATH;
  if (env && existsSync(env)) return env;
  const home = homedir();
  const walk = (base, names, depth = 5) => {
    if (!existsSync(base) || depth < 0) return null;
    for (const e of readdirSync(base, { withFileTypes: true })) {
      const p = join(base, e.name);
      if (e.isFile() && names.includes(e.name)) return p;
      if (e.isDirectory()) { const r = walk(p, names, depth - 1); if (r) return r; }
    }
    return null;
  };
  const shells = ['chrome-headless-shell', 'chrome-headless-shell.exe'];
  for (const b of [join(home, '.cache/hyperframes/chrome'), join(home, 'Library/Caches/ms-playwright'), join(home, '.cache/ms-playwright'), join(home, '.cache/puppeteer')]) {
    const r = walk(b, shells); if (r) return r;
  }
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']) if (existsSync(p)) return p;
  return null;
}

const fail = (m) => { console.error('ERROR ' + m); process.exit(1); };
let puppeteer;
try { puppeteer = (await import(pathToFileURL(join(REPO, 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).href)).default; }
catch { try { puppeteer = (await import('puppeteer-core')).default; } catch { fail('puppeteer-core is not installed. Run npm install in the repo root.'); } }
const chrome = findChrome();
if (!chrome) fail('No Chrome or Chromium found. Install Chrome, or set CHROME_PATH to a Chromium executable.');
if (!existsSync(join(dir, 'index.html'))) fail('index.html is missing. Approve the plan first.');

const animatic = kind === 'animatic';
const scale = animatic ? Math.min(1, 540 / Math.min(P.outputWidth, P.outputHeight)) : 1;
const W = Math.max(2, Math.round((P.outputWidth * scale) / 2) * 2), H = Math.max(2, Math.round((P.outputHeight * scale) / 2) * 2);
const FPS = P.fps || 30, total = Math.round(P.durationSeconds * FPS);
mkdirSync(join(dir, 'out'), { recursive: true });
const finalName = animatic ? 'animatic.mp4' : 'final.mp4';
const tmp = join(dir, 'out', `.${finalName}.part.mp4`);
rmSync(tmp, { force: true });

const audio = existsSync(join(dir, 'audio')) ? readdirSync(join(dir, 'audio')).find((f) => /^track\.(wav|mp3|m4a)$/.test(f)) : null;
const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
if (audio) args.push('-i', join(dir, 'audio', audio), '-shortest', '-c:a', 'aac', '-b:a', animatic ? '128k' : '192k', '-af', `loudnorm=I=-14:TP=-1.5:LRA=11,volume=${((P.audio && P.audio.mixLevelDb) || 0)}dB`);
args.push('-vf', `scale=${W}:${H}:flags=lanczos`, '-c:v', 'libx264', '-crf', animatic ? '23' : '16', '-preset', animatic ? 'veryfast' : 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp);
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
ff.on('error', () => fail('ffmpeg not found.'));

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--font-render-hinting=none'] });
const cleanup = async () => { try { await browser.close(); } catch { /* ignore */ } };
process.on('SIGTERM', async () => { try { ff.kill('SIGKILL'); } catch { /* ignore */ } rmSync(tmp, { force: true }); await cleanup(); process.exit(143); });
const page = await browser.newPage();
await page.setViewport({ width: P.outputWidth, height: P.outputHeight, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(dir, 'index.html')).href + '?manual=1', { waitUntil: 'load' });
await page.evaluate(() => window.__ready);
if (!(await page.$('#c'))) fail('index.html has no #c canvas to capture.');
// Read pixels straight from the canvas (no compositor screenshot): PNG for final, scaled JPEG for the animatic.
await page.evaluate((W, H, jpeg) => {
  const src = document.getElementById('c'); const off = document.createElement('canvas'); off.width = W; off.height = H; const ctx = off.getContext('2d');
  window.__grab = () => { if (jpeg) { ctx.drawImage(src, 0, 0, W, H); return off.toDataURL('image/jpeg', 0.92).slice(23); } return src.toDataURL('image/png').slice(22); };
}, W, H, animatic);
console.log(`INFO chrome=${chrome}`);
console.log(`INFO ${W}x${H} @ ${FPS} fps, ${total} frames${audio ? ', audio ' + audio : ''}`);
for (let i = 0; i < total; i++) {
  const buf = Buffer.from(await page.evaluate((t) => { window.seek(t); return window.__grab(); }, i / FPS), 'base64');
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % 10 === 0 || i === total - 1) console.log(`PROGRESS ${i + 1} ${total}`);
}
ff.stdin.end();
const code = await new Promise((r) => ff.on('close', r));
await cleanup();
if (code !== 0) { rmSync(tmp, { force: true }); fail('ffmpeg exited with code ' + code); }
let target = join(dir, 'out', finalName);
if (!animatic && existsSync(target)) { // never overwrite a finished render silently
  let v = 1; while (existsSync(join(dir, 'out', `final-v${v}.mp4`))) v++;
  renameSync(target, join(dir, 'out', `final-v${v}.mp4`));
  console.log(`INFO previous final.mp4 kept as final-v${v}.mp4`);
}
renameSync(tmp, target);
console.log('DONE ' + target);
