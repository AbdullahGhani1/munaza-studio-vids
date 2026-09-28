// node render.mjs [--fps 30] [--sub 1] [--scale 1] [--out out/final.mp4]
// Walks time, calls window.seek(t) for each subframe, pipes PNGs to ffmpeg (H.264, yuv420p, CRF 16).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const P = JSON.parse(readFileSync('project.json', 'utf8'));
const FPS = Number(arg('fps', P.fps || 30)), SUB = Number(arg('sub', 1)), SCALE = Number(arg('scale', 1));
const OUT = arg('out', 'out/final.mp4');
const W = Math.round(P.outputWidth * SCALE / 2) * 2, H = Math.round(P.outputHeight * SCALE / 2) * 2;
mkdirSync('out', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: P.outputWidth, height: P.outputHeight }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve('index.html')).href + '?manual=1');
await page.evaluate(() => window.__ready);

const track = existsSync('audio') ? readdirSync('audio').find((f) => /^track\.(wav|mp3|m4a)$/.test(f)) : null;
const vf = `scale=${W}:${H}:flags=lanczos` + (SUB > 1 ? `,tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB` : '');
const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-'];
if (track) args.push('-i', 'audio/' + track, '-shortest', '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11');
args.push('-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', OUT);
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round(P.durationSeconds * FPS * SUB);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.seek(t), i / (FPS * SUB));
  const png = await page.locator('#c').screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % (FPS * SUB) === 0) console.log(`rendered ${Math.floor(i / (FPS * SUB))}s / ${P.durationSeconds}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('done ->', OUT);
