import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function findChrome() {
  const env = process.env.CHROME_PATH || process.env.HYPERFRAMES_BROWSER_PATH;
  if (env && existsSync(env)) return env;
  const home = homedir();
  const walk = (base, names, depth = 5) => {
    if (!existsSync(base) || depth < 0) return null;
    for (const e of readdirSync(base, { withFileTypes: true })) {
      const p = join(base, e.name);
      if (e.isFile() && names.includes(e.name)) return p;
      if (e.isDirectory()) { const r = walk(p, names, depth - 1); if (r) return r; }
    }
    return null;
  };
  const shells = ['chrome-headless-shell', 'chrome-headless-shell.exe'];
  for (const b of [join(home, '.cache/hyperframes/chrome'), join(home, 'Library/Caches/ms-playwright'), join(home, '.cache/ms-playwright'), join(home, '.cache/puppeteer')]) {
    const r = walk(b, shells); if (r) return r;
  }
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']) if (existsSync(p)) return p;
  return null;
}

export async function loadPuppeteer() {
  const { resolve, dirname } = await import('node:path');
  const { pathToFileURL, fileURLToPath } = await import('node:url');
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  try { return (await import(pathToFileURL(join(repo, 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).href)).default; }
  catch { try { return (await import('puppeteer-core')).default; } catch { throw Object.assign(new Error('puppeteer-core is not installed. Run npm install in the repo root.'), { status: 424 }); } }
}
