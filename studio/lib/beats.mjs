// Dependency-free tempo and onset estimation. ffmpeg decodes to mono PCM; we build an onset
// envelope (half-wave-rectified change in log energy), autocorrelate it for tempo, and align phase.
import { spawn } from 'node:child_process';

const SR = 11025, HOP = 256;

export function decode(file, maxSeconds = 300) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-i', file, '-t', String(maxSeconds), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']);
    const chunks = [];
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.on('error', () => reject(new Error('ffmpeg not found.')));
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error('Could not decode that audio file.'));
      const buf = Buffer.concat(chunks);
      resolve(new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4)));
    });
  });
}

export function analyze(pcm) {
  const n = Math.floor(pcm.length / HOP);
  if (n < 200) throw new Error('That audio is too short to analyze (need at least 5 seconds).');
  // first difference acts as a crude high-pass so bass drones do not dominate
  const e = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < HOP; k++) { const j = i * HOP + k; const d = pcm[j] - (j ? pcm[j - 1] : 0); s += d * d; }
    e[i] = Math.log(1e-6 + s / HOP);
  }
  const on = new Float32Array(n);
  for (let i = 1; i < n; i++) on[i] = Math.max(0, e[i] - e[i - 1]);
  // normalise by local mean so loud and quiet passages weigh equally
  const w = 43; let acc = 0; const on2 = new Float32Array(n);
  for (let i = 0; i < n; i++) { acc += on[i]; if (i >= w) acc -= on[i - w]; on2[i] = Math.max(0, on[i] - (acc / Math.min(i + 1, w)) * 1.0); }
  const fps = SR / HOP; // envelope frames per second
  // autocorrelation of the onset envelope, then a harmonic comb over candidate tempi with a soft prior around 120 BPM
  const maxLag = Math.min(n - 1, Math.ceil(fps * 4 * 1.05));
  const ac = new Float32Array(maxLag + 2);
  for (let lag = 1; lag <= maxLag + 1; lag++) { let s = 0; for (let i = lag; i < n; i++) s += on2[i] * on2[i - lag]; ac[lag] = s / (n - lag); }
  const at = (x) => { const i = Math.floor(x), f = x - i; return (ac[i] || 0) * (1 - f) + (ac[i + 1] || 0) * f; };
  let best = -1, bpm = 120, lag = fps / 2; const cands = [];
  for (let b = 60; b <= 200; b += 0.25) {
    const L = (60 / b) * fps;
    const comb = at(L) + 0.5 * at(2 * L) + 0.25 * at(3 * L) + 0.125 * at(4 * L);
    const prior = Math.exp(-0.5 * Math.pow(Math.log2(b / 120) / 0.75, 2));
    const sc = comb * prior; cands.push(sc);
    if (sc > best) { best = sc; bpm = b; lag = L; }
  }
  // phase: choose the offset (in envelope frames) that maximises the onset energy on the beat comb
  let bestOff = 0, bestSum = -1; bpm = (60 * fps) / lag;
  const P = Math.round(lag);
  for (let off = 0; off < P; off++) { let s = 0; for (let t = off; t < n; t += lag) { const k = Math.round(t); s += (on2[k] || 0) + 0.5 * ((on2[k - 1] || 0) + (on2[k + 1] || 0)); } if (s > bestSum) { bestSum = s; bestOff = off; } }
  const offset = bestOff / fps;
  // hits: local maxima of the onset envelope above an adaptive threshold
  const sorted = [...on2].sort((x, y) => x - y); const thr = sorted[Math.floor(sorted.length * 0.94)] || 0;
  const hits = []; let last = -1;
  for (let i = 2; i < n - 2; i++) if (on2[i] > thr && on2[i] >= on2[i - 1] && on2[i] > on2[i + 1] && (last < 0 || (i - last) / fps > 0.12)) { hits.push(Math.round((i / fps) * 1000) / 1000); last = i; }
  const med = [...cands].sort((x, y) => x - y)[Math.floor(cands.length / 2)] || 1e-9;
  const confidence = Math.max(0, Math.min(1, (best / med - 1) / 6));
  return { bpm: Math.round(bpm * 10) / 10, offset: Math.round(offset * 1000) / 1000, hits: hits.slice(0, 2000), confidence: Math.round(confidence * 100) / 100, duration: pcm.length / SR };
}
