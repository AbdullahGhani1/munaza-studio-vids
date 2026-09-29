import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { synthSfx, cuesForScenes, buildMix, SR } from '../lib/audio.mjs';

const scenes = [0, 4, 9, 14].map((a, i, arr) => ({ id: `s${i + 1}`, order: i + 1, startSeconds: a, endSeconds: arr[i + 1] ?? 20 }));

test('sfx cues: thump on the hook, whoosh then click into each scene, thump on the last', () => {
  const c = cuesForScenes(scenes);
  assert.deepEqual(c[0], { t: 0.02, type: 'thump' });
  assert.equal(c.filter((x) => x.type === 'whoosh').length, 3);
  assert.equal(c.filter((x) => x.type === 'click').length, 2);
  assert.equal(c.at(-1).type, 'thump'); assert.equal(c.at(-1).t, 14);
  assert.ok(c.every((x, i) => i === 0 || x.t >= c[i - 1].t));
});
test('sfx cues snap to a nearby beat only', () => {
  const c = cuesForScenes(scenes, [3.95, 9.5]);
  assert.ok(c.some((x) => x.type === 'click' && x.t === 3.95), 'within 0.12 s snaps');
  assert.ok(c.some((x) => x.type === 'click' && x.t === 9), 'beyond 0.12 s stays');
});
test('sfx synthesis is deterministic and audible', () => {
  const a = synthSfx([{ t: 0.1, type: 'whoosh' }, { t: 0.5, type: 'thump' }], 2), b = synthSfx([{ t: 0.1, type: 'whoosh' }, { t: 0.5, type: 'thump' }], 2);
  assert.equal(a.length, 2 * SR);
  assert.deepEqual(a, b);
  assert.ok(a.some((x) => Math.abs(x) > 0.1));
  assert.ok(a.every((x) => Math.abs(x) <= 1.5));
});
test('buildMix: nothing to mix returns null', () => assert.equal(buildMix({ durationSeconds: 20, scenes }, mkdtempSync(join(tmpdir(), 'mx-'))), null));
test('buildMix: music, sfx and delayed voiceover with ducking', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mx-')); mkdirSync(join(dir, 'audio/vo'), { recursive: true });
  for (const f of ['audio/track.wav', 'audio/sfx.wav', 'audio/vo/s3.wav']) writeFileSync(join(dir, f), 'x');
  const P = { durationSeconds: 20, scenes, audio: { path: 'audio/track.wav', mixLevelDb: -3 }, sfx: { enabled: true }, vo: { s3: { file: 'audio/vo/s3.wav' }, gone: { file: 'audio/vo/none.wav' } } };
  const m = buildMix(P, dir);
  assert.equal(m.inputs.length, 3);
  assert.match(m.filter, /\[1:a\].*volume=-11dB\[m\]/, 'music ducked by 8 dB on top of -3');
  assert.match(m.filter, /adelay=9000:all=1\[v0\]/, 'voice starts at scene 3');
  assert.match(m.filter, /amix=inputs=3:normalize=0/);
  assert.match(m.filter, /loudnorm=I=-14/);
  assert.match(m.filter, /atrim=0:20/);
});
test('buildMix: muted music and disabled sfx are left out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mx-')); mkdirSync(join(dir, 'audio'), { recursive: true });
  writeFileSync(join(dir, 'audio/track.wav'), 'x'); writeFileSync(join(dir, 'audio/sfx.wav'), 'x');
  assert.equal(buildMix({ durationSeconds: 20, scenes, audio: { path: 'audio/track.wav', muted: true }, sfx: { enabled: false } }, dir), null);
});
