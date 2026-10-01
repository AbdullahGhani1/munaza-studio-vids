import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 4900 + Math.floor(Math.random() * 500), BASE = `http://127.0.0.1:${PORT}`;
const HOME = mkdtempSync(join(tmpdir(), 'studio-gif-'));
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
let server;
const post = async (path, body) => { const r = await fetch(BASE + '/api/gif' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const get = async (path) => { const r = await fetch(BASE + '/api/gif' + path); return { status: r.status, body: await r.json().catch(() => null) }; };
const until = async (fn, ms = 30000) => { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timeout'); await new Promise((r) => setTimeout(r, 150)); } };

before(async () => {
  server = spawn(process.execPath, [join(HERE, '..', 'server.mjs')], { env: { ...process.env, PORT: String(PORT), STUDIO_HOME: HOME }, stdio: 'ignore' });
  await until(() => fetch(BASE + '/api/gif/status').then((r) => r.ok, () => false));
});
after(() => server && server.kill());

test('status reports the tools and the 10 minute / 50 fps limits', async () => {
  const r = await get('/status'); assert.equal(r.status, 200);
  assert.equal(r.body.maxSeconds, 600); assert.equal(r.body.maxFps, 50);
});
test('rejects links that are not public http(s) URLs', async () => {
  for (const url of ['', 'not a url', 'file:///etc/passwd', 'http://127.0.0.1:4173/x.mp4', 'http://169.254.169.254/latest', 'https://user:pw@example.com/a.mp4']) {
    const r = await post('/import', { url }); assert.ok([422, 424].includes(r.status), `${url} -> ${r.status}`);
  }
});
test('unknown items are 404', async () => { assert.equal((await get('/aaaaaaaaaaaa')).status, 404); });
test('rejects unsupported upload types', async () => {
  const r = await fetch(BASE + '/api/gif/upload?name=x.exe', { method: 'POST', body: 'x' }); assert.equal(r.status, 415);
});

test('sample → trim → 2-pass GIF → download', { skip: !hasFfmpeg }, async () => {
  const s = await post('/sample', { kind: 'smpte' });
  assert.equal(s.status, 200); assert.equal(s.body.state, 'ready'); assert.equal(s.body.info.fps, 60); assert.ok(s.body.info.duration >= 7.9);
  const id = s.body.id;
  const bad = await post(`/${id}/convert`, { start: 0, duration: 2, reverse: true, height: 1080, fps: 60, speed: 0.25 });
  assert.ok([202, 422].includes(bad.status));
  if (bad.status === 202) await until(async () => (await get(`/${id}`)).body.convert.state !== 'running');
  const c = await post(`/${id}/convert`, { start: 1, duration: 2, fps: 60, height: 240, colors: 64, dither: 'bayer', bayerScale: 3, speed: 2, boomerang: true });
  assert.equal(c.status, 202);
  const done = await until(async () => { const v = (await get(`/${id}`)).body; if (v.convert.state === 'error') throw new Error(v.convert.error); return v.convert.state === 'done' ? v : null; });
  // 2 s at 2x = 1 s, at 50 fps (60 is capped: GIF delays are whole 10 ms ticks), boomerang doubles it
  assert.equal(done.convert.fps, 50); assert.equal(done.convert.frames, 100); assert.equal(done.convert.height, 240); assert.ok(done.convert.size > 1000);
  const r = await fetch(BASE + done.convert.url + '&download=1');
  assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/gif'); assert.match(r.headers.get('content-disposition'), /attachment; filename="[\w-]+\.gif"/);
  const buf = Buffer.from(await r.arrayBuffer()); assert.equal(buf.subarray(0, 6).toString(), 'GIF89a');
  assert.equal((await fetch(BASE + '/gif/' + id + '/..%2F..%2Fproject.json')).status, 404);
  assert.equal((await fetch(BASE + '/gif/' + id + '/%2e%2e')).status, 404);
  const del = await fetch(BASE + '/api/gif/' + id, { method: 'DELETE' }); assert.equal(del.status, 200);
  assert.equal((await get(`/${id}`)).status, 404);
});
