// Reference-by-link support: fetch a directly linked media file with SSRF guards. No scraping of video platforms.
import dns from 'node:dns/promises';
import net from 'node:net';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { extname, basename } from 'node:path';

export const MEDIA_EXT = ['.mp4', '.mov', '.webm', '.m4v', '.png', '.jpg', '.jpeg', '.webp'];
const PLATFORMS = /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|vimeo\.com|x\.com|twitter\.com|dailymotion\.com|twitch\.tv|reddit\.com)$/i;
const MIME_EXT = { 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm', 'video/x-m4v': '.m4v', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' };

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::' || v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd')) return true;
    const m = /::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    return m ? isPrivateIp(m[1]) : false;
  }
  return true;
}

export async function checkUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw Object.assign(new Error('That does not look like a link.'), { status: 422 }); }
  if (!['http:', 'https:'].includes(u.protocol)) throw Object.assign(new Error('Only http and https links are supported.'), { status: 422 });
  if (u.username || u.password) throw Object.assign(new Error('Links with embedded credentials are not supported.'), { status: 422 });
  if (PLATFORMS.test(u.hostname)) throw Object.assign(new Error('Video platform pages cannot be downloaded here. Download the file yourself if you are allowed to, then upload it.'), { status: 422 });
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => { throw Object.assign(new Error('We couldn’t open that link. Upload the file instead.'), { status: 422 }); });
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw Object.assign(new Error('That address is not a public site. Upload the file instead.'), { status: 422 });
  return u;
}

// returns { name, ext, size }
export async function fetchMedia(raw, destFor, { maxBytes = 500 * 1024 * 1024, timeoutMs = 60000, fetchImpl = fetch } = {}) {
  let u = await checkUrl(raw);
  const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let r;
    for (let hop = 0; hop < 4; hop++) {
      r = await fetchImpl(u, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': 'VideoStudio/1.0 (reference fetch)', Accept: 'video/*,image/*' } });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = await checkUrl(new URL(r.headers.get('location'), u).href); continue; }
      break;
    }
    if (r.status >= 300 && r.status < 400) throw Object.assign(new Error('Too many redirects.'), { status: 422 });
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error('That link needs a login or blocks downloads. Upload the file instead.'), { status: 422 });
    if (!r.ok) throw Object.assign(new Error(`That link returned ${r.status}. Upload the file instead.`), { status: 422 });
    const type = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    let ext = extname(u.pathname).toLowerCase();
    if (!MEDIA_EXT.includes(ext)) ext = MIME_EXT[type] || '';
    if (!ext || (!type.startsWith('video/') && !type.startsWith('image/') && type !== 'application/octet-stream')) throw Object.assign(new Error('That link is not a video or image file.'), { status: 415 });
    const len = Number(r.headers.get('content-length') || 0);
    if (len > maxBytes) throw Object.assign(new Error('That file is over 500 MB.'), { status: 413 });
    const name = (basename(u.pathname, extname(u.pathname)).replace(/[^\w.\- ]/g, '_').slice(0, 60) || 'reference') + ext;
    const dest = destFor(name);
    let n = 0;
    const src = Readable.fromWeb(r.body);
    src.on('data', (c) => { n += c.length; if (n > maxBytes) src.destroy(Object.assign(new Error('That file is over 500 MB.'), { status: 413 })); });
    await pipeline(src, createWriteStream(dest));
    return { name, ext, size: n };
  } catch (e) {
    if (e.name === 'AbortError') throw Object.assign(new Error('The link took too long to respond. Upload the file instead.'), { status: 504 });
    throw e;
  } finally { clearTimeout(timer); }
}
