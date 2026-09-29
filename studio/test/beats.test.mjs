import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/beats.mjs';

// Synthetic 4-on-the-floor track at 11025 Hz: kick + click on each beat, snare-like noise on 2 and 4, quiet off-beat hat.
function track(bpm, offset, seconds = 20) {
  const sr = 11025, n = sr * seconds, out = new Float32Array(n), P = 60 / bpm;
  let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) - 0.5;
  for (let i = 0; i < n; i++) {
    const t = i / sr; if (t < offset) continue;
    const ph = (t - offset) % P, beat = Math.floor((t - offset) / P), hp = (t - offset - P / 2 + P * 4) % P;
    const kick = Math.sin(2 * Math.PI * (55 + 140 * Math.exp(-45 * ph)) * ph) * Math.exp(-12 * ph) + rnd() * 1.2 * Math.exp(-400 * ph);
    const snare = beat % 2 ? rnd() * Math.exp(-30 * ph) : 0, hat = rnd() * 0.25 * Math.exp(-90 * hp);
    out[i] = Math.max(-1, Math.min(1, 0.7 * kick + snare + hat));
  }
  return out;
}
for (const [bpm, off] of [[120, 0], [100, 0.13], [140, 0.31]]) {
  test(`detects ${bpm} BPM within 2%`, () => {
    const r = analyze(track(bpm, off));
    assert.ok(Math.abs(r.bpm - bpm) / bpm < 0.02, `got ${r.bpm}`);
    assert.ok(r.hits.length > 10);
  });
}
test('rejects audio that is too short', () => assert.throws(() => analyze(new Float32Array(11025)), /too short/));
