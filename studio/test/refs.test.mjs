import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPrivateIp, checkUrl, fetchMedia } from '../lib/refs.mjs';

test('private and special addresses are recognised', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.9', '172.16.5.5', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:10.0.0.1']) assert.equal(isPrivateIp(ip), true, ip);
  for (const ip of ['93.184.216.34', '8.8.8.8', '2606:4700:4700::1111']) assert.equal(isPrivateIp(ip), false, ip);
});
test('checkUrl rejects bad schemes, credentials, platforms and private hosts', async () => {
  await assert.rejects(checkUrl('file:///etc/passwd'), /http and https/);
  await assert.rejects(checkUrl('ftp://example.com/a.mp4'), /http and https/);
  await assert.rejects(checkUrl('https://user:pw@93.184.216.34/a.mp4'), /credentials/);
  await assert.rejects(checkUrl('https://www.youtube.com/watch?v=abc'), /Video platform/);
  await assert.rejects(checkUrl('http://127.0.0.1:8080/a.mp4'), /not a public site/);
  await assert.rejects(checkUrl('http://[::1]/a.mp4'), /not a public site/);
  await assert.rejects(checkUrl('not a url'), /link/);
  await assert.doesNotReject(checkUrl('https://93.184.216.34/a.mp4'));
});
const resp = (body, headers = {}, status = 200) => new Response(body, { status, headers });
const dir = mkdtempSync(join(tmpdir(), 'refs-'));

test('fetchMedia streams a media file and names it safely', async () => {
  const got = await fetchMedia('https://93.184.216.34/a%20clip.mp4', (n) => join(dir, n), { fetchImpl: async () => resp('hello', { 'content-type': 'video/mp4' }) });
  assert.equal(got.ext, '.mp4'); assert.equal(got.size, 5); assert.equal(readFileSync(join(dir, got.name), 'utf8'), 'hello');
});
test('fetchMedia refuses html, login walls and oversize files', async () => {
  const f = (o) => fetchMedia('https://93.184.216.34/x.mp4', (n) => join(dir, n), o);
  await assert.rejects(f({ fetchImpl: async () => resp('<html>', { 'content-type': 'text/html' }) }), /not a video or image/);
  await assert.rejects(f({ fetchImpl: async () => resp('no', { 'content-type': 'video/mp4' }, 403) }), /login/);
  await assert.rejects(f({ maxBytes: 3, fetchImpl: async () => resp('123456', { 'content-type': 'video/mp4' }) }), /over 500 MB|aborted|destroy/i);
});
test('redirects to a private address are refused', async () => {
  const f = async () => resp('', { location: 'http://10.0.0.5/secret.mp4' }, 302);
  await assert.rejects(fetchMedia('https://93.184.216.34/a.mp4', (n) => join(dir, n), { fetchImpl: f }), /not a public site/);
});
