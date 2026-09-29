import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = 4300 + Math.floor(Math.random() * 500), BASE = `http://127.0.0.1:${PORT}`;
const HOME = mkdtempSync(join(tmpdir(), 'studio-home-'));
let server, hang = false;

const api = async (path, method = 'GET', body, headers = {}) => {
  const r = await fetch(BASE + '/api' + path, { method, headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 15000) { const t = Date.now(); for (;;) { const v = await fn(); if (v) return v; if (Date.now() - t > ms) throw new Error('timeout'); await sleep(100); } }

before(async () => {
  const fake = join(HERE, 'fixtures', 'fake-claude.mjs');
  const wrapper = join(HOME, 'claude'); writeFileSync(wrapper, `#!/bin/sh\nexec node "${fake}" "$@"\n`, { mode: 0o755 });
  server = spawn(process.execPath, [join(HERE, '..', 'server.mjs')], { env: { ...process.env, PORT: String(PORT), STUDIO_HOME: join(HOME, 'projects'), STUDIO_CLAUDE_BIN: wrapper }, stdio: 'ignore' });
  await until(async () => fetch(BASE + '/api/meta').then((r) => r.ok, () => false));
});
after(() => server && server.kill());

const brief = { topic: 'Three habits that stop lower back pain after long desk days.', style: 'kinetic', durationSeconds: 15, size: '9:16', fps: 30 };
let id, project;

test('rejects invalid briefs with per-field messages', async () => {
  const r = await api('/projects', 'POST', { topic: 'x' });
  assert.equal(r.status, 422); assert.ok(r.body.fields.topic && r.body.fields.style);
});
test('creates a project, generates a valid plan, persists it', async () => {
  const c = await api('/projects', 'POST', brief); assert.equal(c.status, 201); id = c.body.id;
  const p = await api(`/projects/${id}/plan`, 'POST'); assert.equal(p.status, 200);
  assert.equal(p.body.scenes.at(-1).endSeconds, 15); project = p.body;
  assert.ok(existsSync(join(HOME, 'projects', id, 'project.json')));
  assert.equal((await api('/projects')).body.length, 1);
});
test('rejects a plan whose times do not add up, accepts after rebalance', async () => {
  const scenes = structuredClone(project.scenes); scenes[0].endSeconds = 1;
  const bad = await api(`/projects/${id}/plan`, 'PUT', { scenes }); assert.ok(bad.body.errors.length);
  const ok = await api(`/projects/${id}/plan`, 'PUT', { scenes: project.scenes, rebalance: true }); assert.deepEqual(ok.body.errors, []);
  project = ok.body.project;
});
test('cannot render, run Claude or capture before approval / without consent', async () => {
  assert.equal((await api(`/projects/${id}/render`, 'POST', { kind: 'animatic' })).status, 409);
  assert.equal((await api(`/projects/${id}/claude`, 'POST', { confirmed: true })).status, 409);
  assert.equal((await api(`/projects/${id}/capture`, 'POST', { url: 'https://93.184.216.34' })).status, 422);
});
test('approve scaffolds the folder and prompt', async () => {
  const a = await api(`/projects/${id}/approve`, 'POST'); assert.equal(a.status, 200); assert.equal(a.body.status, 'Preview ready');
  for (const f of ['CLAUDE.md', 'index.html', 'render.mjs', 'data.js', 'docs/shotlist.md', 'docs/style_guide.md', 'CLAUDE-PROMPT.md']) assert.ok(existsSync(join(HOME, 'projects', id, f)), f);
  assert.doesNotMatch(readFileSync(join(HOME, 'projects', id, 'CLAUDE.md'), 'utf8'), /\{\{/);
});
test('Claude Code needs explicit confirmation, then runs, streams and finishes', async () => {
  assert.equal((await api(`/projects/${id}/claude`, 'POST', {})).status, 422);
  const s = await api(`/projects/${id}/claude`, 'POST', { confirmed: true, budget: 3 }); assert.equal(s.status, 202);
  assert.equal((await api(`/projects/${id}/claude`, 'POST', { confirmed: true })).status, 409, 'one job at a time');
  const j = await until(async () => { const r = (await api(`/projects/${id}/job`)).body; return r.state !== 'running' && r; });
  assert.equal(j.state, 'done'); assert.equal(j.cost, 0.0123); assert.equal(j.done, 1, 'one tool call counted');
  assert.ok(j.log.some((l) => l.startsWith('→ Write')));
  const out = readFileSync(join(HOME, 'projects', id, 'src-fake-output.txt'), 'utf8');
  assert.match(out, /--permission-mode acceptEdits/); assert.match(out, /--max-budget-usd 3/); assert.match(out, /--allowedTools Read Write Edit/);
  assert.match(out, /has-claude-md=true/);
  assert.doesNotMatch(JSON.stringify(j.log), /sk-abcdefghijklmnop/);
  assert.equal((await api(`/projects/${id}`)).body.status, 'Preview ready');
});
test('a running Claude job can be cancelled', async () => {
  await new Promise((r) => { server.once('exit', r); server.kill(); });
  const fake = join(HERE, 'fixtures', 'fake-claude.mjs'), wrapper = join(HOME, 'claude');
  writeFileSync(wrapper, `#!/bin/sh\nFAKE_CLAUDE_HANG=1 exec node "${fake}" "$@"\n`, { mode: 0o755 });
  server = spawn(process.execPath, [join(HERE, '..', 'server.mjs')], { env: { ...process.env, PORT: String(PORT), STUDIO_HOME: join(HOME, 'projects'), STUDIO_CLAUDE_BIN: wrapper }, stdio: 'ignore' });
  await until(async () => fetch(BASE + '/api/meta').then((r) => r.ok, () => false));
  assert.equal((await api(`/projects/${id}/claude`, 'POST', { confirmed: true })).status, 202);
  await until(async () => (await api(`/projects/${id}/job`)).body.log.length > 0);
  assert.equal((await api(`/projects/${id}/job`, 'DELETE')).status, 200);
  const j = await until(async () => { const r = (await api(`/projects/${id}/job`)).body; return r.endedAt && r; });
  assert.equal(j.state, 'cancelled');
  assert.equal((await api(`/projects/${id}`)).body.status, 'Preview ready');
});
test('voiceover and effects endpoints validate input', async () => {
  const sid = project.scenes[0].id;
  assert.equal((await api(`/projects/${id}/vo/${sid}/generate`, 'POST', {})).status, 422, 'no text yet');
  assert.equal((await api(`/projects/${id}/vo/nope/generate`, 'POST', {})).status, 404);
  const fx = await api(`/projects/${id}/sfx`, 'POST'); assert.equal(fx.status, 200); assert.ok(fx.body.sfx.cues >= 3);
  assert.ok(existsSync(join(HOME, 'projects', id, 'audio', 'sfx.wav')));
  assert.equal((await api(`/projects/${id}/sfx`, 'PUT', { enabled: false })).body.sfx.enabled, false);
});
test('foreign hosts and cross-origin writes are rejected; traversal is blocked', async () => {
  const status = await new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: '/api/projects', headers: { Host: 'evil.example' } }, (r) => { r.resume(); res(r.statusCode); }).on('error', rej));
  assert.equal(status, 403);
  assert.equal((await fetch(BASE + '/api/projects', { method: 'POST', headers: { Origin: 'http://evil.example', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  assert.notEqual((await fetch(BASE + `/files/${id}/..%2f..%2fserver.mjs`)).status, 200);
  assert.equal((await fetch(BASE + `/files/${id}/.env`)).status, 403);
});
test('delete moves the project to .trash', async () => {
  assert.equal((await api(`/projects/${id}`, 'DELETE')).status, 200);
  assert.equal((await api('/projects')).body.length, 0);
  assert.ok(existsSync(join(HOME, 'projects', '.trash')));
});
