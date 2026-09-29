// Sound helpers: code-synthesized tactile SFX (click, pop, thump, whoosh), local text-to-speech, WAV writing.
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

export const SR = 48000;

export function writeWav16(path, samples, sr = SR) {
  const n = samples.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, b);
}

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2147483648) - 1; }

export const VOICES = {
  click: [0.05, (t) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5],
  pop: [0.15, (t) => Math.sin(2 * Math.PI * (600 + 900 * t) * t) * Math.exp(-t * 30) * 0.4],
  thump: [0.5, (t) => Math.sin(2 * Math.PI * (90 - 60 * t) * t) * Math.exp(-t * 9) * 0.9],
  whoosh: [0.35, (t, noise) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.25],
};

// cues: [{ t, type }] -> Float32Array of `duration` seconds. Deterministic (seeded noise).
export function synthSfx(cues, duration) {
  const buf = new Float32Array(Math.ceil(duration * SR));
  const noise = lcg(42);
  for (const c of cues) {
    const v = VOICES[c.type]; if (!v) continue;
    const [len, fn] = v, start = Math.floor(c.t * SR);
    for (let i = 0; i < len * SR && start + i < buf.length; i++) if (start + i >= 0) buf[start + i] += fn(i / SR, noise);
  }
  return buf;
}

// Tactile cues from the storyboard: whoosh into each scene change, click on it, thump on the hook and the last scene.
export function cuesForScenes(scenes, beats = []) {
  const snap = (t) => { let best = t, d = 0.12; for (const b of beats) { const x = Math.abs(b - t); if (x < d) { d = x; best = b; } } return best; };
  const cues = [{ t: 0.02, type: 'thump' }];
  scenes.forEach((s, i) => {
    if (i === 0) return;
    const t = snap(s.startSeconds);
    cues.push({ t: Math.max(0, t - 0.25), type: 'whoosh' });
    cues.push({ t, type: i === scenes.length - 1 ? 'thump' : 'click' });
  });
  return cues.sort((a, b) => a.t - b.t).map((c) => ({ t: Math.round(c.t * 1000) / 1000, type: c.type }));
}

// ---- local text-to-speech (macOS `say`); no keys, nothing leaves the machine ----
let voiceCache = null; // `say -v ?` takes over a second; the installed voices do not change while the server runs
const sayVoices = () => (voiceCache ??= spawnSync('say', ['-v', '?'], { encoding: 'utf8' }));
export const ttsAvailable = () => process.platform === 'darwin' && sayVoices().status === 0;

export function listVoices() {
  if (!ttsAvailable()) return [];
  const r = sayVoices();
  return r.stdout.split('\n').map((l) => /^(.+?)\s{2,}([a-z]{2}_[A-Z]{2})\s+#/.exec(l)).filter(Boolean).map((m) => ({ name: m[1].trim(), locale: m[2] }));
}

export function speak(text, voice, outWav) {
  if (!ttsAvailable()) throw Object.assign(new Error('Built-in speech needs macOS. Upload a voiceover file instead.'), { status: 424 });
  if (voice && !listVoices().some((v) => v.name === voice)) throw Object.assign(new Error('That voice is not installed.'), { status: 422 });
  const tmp = join(tmpdir(), `vo-${process.pid}-${Date.now()}.aiff`);
  const args = ['-o', tmp]; if (voice) args.push('-v', voice); args.push('--', String(text).slice(0, 2000));
  const r = spawnSync('say', args, { encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0) throw Object.assign(new Error('Speech synthesis failed.'), { status: 500 });
  const f = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', String(SR), outWav]);
  rmSync(tmp, { force: true });
  if (f.status !== 0) throw Object.assign(new Error('Could not convert the speech to WAV (is ffmpeg installed?).'), { status: 424 });
}

export function toWav(input, outWav) {
  mkdirSync(dirname(outWav), { recursive: true });
  const f = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-vn', '-ac', '1', '-ar', String(SR), outWav]);
  if (f.status !== 0) throw Object.assign(new Error('Could not read that audio file.'), { status: 422 });
}

// Build the ffmpeg audio inputs and filter graph for a project. Returns null when there is nothing to mix.
export function buildMix(P, dir, { animatic = false } = {}) {
  const inputs = [], labels = [], filters = [];
  const has = (rel) => existsSync(join(dir, rel));
  const hasVo = Object.values(P.vo || {}).some((v) => v && has(v.file));
  let idx = 1; // input 0 is the piped video
  if (P.audio && has(P.audio.path) && !P.audio.muted) {
    inputs.push(join(dir, P.audio.path));
    const db = (P.audio.mixLevelDb || 0) - (hasVo ? 8 : 0); // duck the music under speech
    filters.push(`[${idx}:a]aresample=${SR},aformat=channel_layouts=mono,volume=${db}dB[m]`); labels.push('[m]'); idx++;
  }
  if (P.sfx && P.sfx.enabled && has('audio/sfx.wav')) {
    inputs.push(join(dir, 'audio/sfx.wav'));
    filters.push(`[${idx}:a]aresample=${SR},aformat=channel_layouts=mono,volume=-6dB[x]`); labels.push('[x]'); idx++;
  }
  const scenes = new Map((P.scenes || []).map((s) => [s.id, s]));
  let n = 0;
  for (const [sid, v] of Object.entries(P.vo || {})) {
    const s = scenes.get(sid);
    if (!s || !v || !has(v.file)) continue;
    inputs.push(join(dir, v.file));
    const ms = Math.round(s.startSeconds * 1000);
    filters.push(`[${idx}:a]aresample=${SR},aformat=channel_layouts=mono,adelay=${ms}:all=1[v${n}]`); labels.push(`[v${n}]`); idx++; n++;
  }
  if (!labels.length) return null;
  const D = P.durationSeconds;
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=0:${D},apad=whole_dur=${D}[aout]`);
  return { inputs, filter: filters.join(';'), map: '[aout]', bitrate: animatic ? '128k' : '192k' };
}
