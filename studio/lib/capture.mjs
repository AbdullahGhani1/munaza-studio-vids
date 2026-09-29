// Optional asset gathering (FR-23): real screenshots, logo, colours and fonts from a site the user is allowed to capture.
// Never invents UI. Everything saved is listed in assets/manifest.json with its source.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkUrl, fetchMedia } from './refs.mjs';
import { findChrome, loadPuppeteer } from './chrome.mjs';

const hex = (c) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c); if (!m) return null; if (m[4] !== undefined && +m[4] < 0.5) return null; return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join('').toUpperCase(); };

export async function captureSite(rawUrl, projectDir, { timeoutMs = 60000 } = {}) {
  const u = await checkUrl(rawUrl);
  const chrome = findChrome();
  if (!chrome) throw Object.assign(new Error('No Chrome or Chromium found. Install Chrome, or set CHROME_PATH.'), { status: 424 });
  const puppeteer = await loadPuppeteer();
  const siteDir = join(projectDir, 'assets', 'site');
  mkdirSync(siteDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] });
  const files = [];
  const deadline = setTimeout(() => browser.close().catch(() => {}), timeoutMs);
  try {
    const page = await browser.newPage();
    const seen = new Map();
    await page.setRequestInterception(true);
    page.on('request', async (req) => {
      try {
        if (req.resourceType() === 'media') return req.abort();
        if (req.isNavigationRequest()) {
          const h = new URL(req.url()).host;
          if (!seen.has(h)) seen.set(h, checkUrl(req.url()).then(() => true, () => false));
          if (!(await seen.get(h))) return req.abort();
        }
        req.continue();
      } catch { req.abort().catch(() => {}); }
    });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(u.href, { waitUntil: 'networkidle2', timeout: 30000 }).catch((e) => { if (!/timeout/i.test(e.message)) throw Object.assign(new Error('We couldn’t open that page: ' + e.message.split('\n')[0]), { status: 422 }); });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const final = new URL(page.url());
    await checkUrl(final.href); // redirected somewhere private? refuse
    const info = await page.evaluate(() => {
      const meta = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content || '';
      const vis = [document.documentElement, document.body, ...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 12 && r.top < 4000; }).slice(0, 900);
      const bg = {}, fg = {};
      for (const e of vis) { const s = getComputedStyle(e); bg[s.backgroundColor] = (bg[s.backgroundColor] || 0) + e.getBoundingClientRect().width * e.getBoundingClientRect().height; fg[s.color] = (fg[s.color] || 0) + (e.textContent || '').trim().length; }
      const fam = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim() : ''; };
      return {
        title: document.title, description: meta('description') || meta('og:description'), themeColor: meta('theme-color'), ogImage: meta('og:image'),
        icons: [...document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]')].map((l) => ({ href: l.href, sizes: l.sizes ? l.sizes.value : '' })),
        logos: [...document.querySelectorAll('img')].filter((i) => /logo/i.test(i.src + i.alt + i.className + (i.closest('a,header') ? i.closest('a,header').className : ''))).slice(0, 3).map((i) => ({ src: i.currentSrc || i.src, alt: i.alt })),
        bg, fg, fonts: { body: fam('body'), heading: fam('h1') || fam('h2'), button: fam('button, a[class*=btn], a[class*=button]') },
        headings: [...document.querySelectorAll('h1,h2')].map((h) => h.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 8),
        height: document.documentElement.scrollHeight,
      };
    });
    const shot = async (name, opts, usage) => { const path = `assets/site/${name}`; await page.screenshot({ path: join(projectDir, path), ...opts }); files.push({ path, kind: 'screenshot', usage, source: final.href }); };
    await shot('home-desktop.png', { type: 'png' }, 'Hero / first impression, 1440×900');
    if (info.height > 1000) await shot('home-desktop-full.png', { type: 'png', clip: { x: 0, y: 0, width: 1440, height: Math.min(info.height, 3600) } }, 'Full home page (capped at 3600 px)');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(final.href, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await shot('home-mobile.png', { type: 'png' }, 'Mobile first screen, 390×844 @2x');
    // images the site itself publishes
    const grab = async (src, base, kind, usage) => {
      if (!src) return;
      if (/^data:/i.test(src)) { files.push({ path: null, kind, usage, source: 'inline data: URI', note: 'Not downloaded: inline icon' }); return; }
      try { const got = await fetchMedia(new URL(src, final).href, (n) => join(siteDir, `${base}-${n}`), { maxBytes: 15 * 1024 * 1024, timeoutMs: 20000 }); files.push({ path: `assets/site/${base}-${got.name}`, kind, usage, source: new URL(src, final).href }); }
      catch (e) { files.push({ path: null, kind, usage, source: new URL(src, final).href, note: 'Not downloaded: ' + e.message }); }
    };
    const icon = [...info.icons].sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0))[0];
    await grab(info.logos[0]?.src, 'logo', 'logo', 'Brand logo as published on the page');
    await grab(icon?.href, 'icon', 'icon', 'Site icon');
    await grab(info.ogImage, 'og', 'image', 'Social share image');
    const top = (o, k) => Object.entries(o).map(([c, w]) => [hex(c), w]).filter(([c]) => c).reduce((m, [c, w]) => (m.set(c, (m.get(c) || 0) + w), m), new Map());
    const rank = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c);
    const manifest = {
      source: final.href, capturedAt: new Date().toISOString(), title: info.title, description: info.description, themeColor: info.themeColor,
      colors: { background: rank(top(info.bg)), text: rank(top(info.fg)) }, fonts: info.fonts, headings: info.headings, files,
      note: 'Captured from the live page by the studio. Use only these assets; never redraw the product UI or invent claims.',
    };
    writeFileSync(join(projectDir, 'assets', 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
  } finally { clearTimeout(deadline); await browser.close().catch(() => {}); }
}
