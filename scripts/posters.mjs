// Takes a still of each toy for the overview grid, so the picker has pictures before anyone has visited a toy.
//
//   npm run posters [slug ...]
//
// Needs Chrome or Edge (or BROWSER=path/to/browser) and the dev dependency puppeteer-core.
// Output: posters/<slug>.jpg, 4:5, which the feed falls back to when this browser has no live snapshot yet.
// Re-run after a sync when a toy looks different.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'posters');
const PORT = 8124, BASE = `http://localhost:${PORT}/`;
const { LABS } = await import('../labs/manifest.js');
const only = process.argv.slice(2);
const labs = only.length ? LABS.filter(l => only.includes(l.slug)) : LABS;

const exists = p => stat(p).then(() => true, () => false);
const browsers = [process.env.BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
let executablePath = null;
for (const b of browsers) if (await exists(b)) { executablePath = b; break; }
if (!executablePath) { console.error('No Chrome or Edge found. Set BROWSER to one.'); process.exit(1); }

const server = spawn(process.execPath, [join(ROOT, 'scripts', 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(400);
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });

try {
  for (const l of labs) {
    const page = await browser.newPage();
    // 4:5 like the tiles; twice the size of a phone tile so it stays sharp
    await page.setViewport({ width: 400, height: 500, deviceScaleFactor: 1 });
    // ?solo: just this toy, no neighbours competing for the GPU
    await page.goto(`${BASE}?solo#${l.slug}`);
    await page.addStyleTag({ content: '.topbar, .caption, .nav, .loader, .poster { display: none !important; }' });
    // wait for the first frame (Goop compiles for a while), then let it move a little
    await page.waitForFunction(() => window.feedMetrics?.loads.length > 0, { timeout: 90000 }).catch(() => console.warn(`  ! ${l.slug}: no frame after 90 s`));
    await sleep(2500);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 80 });
    await writeFile(join(OUT, `${l.slug}.jpg`), jpg);
    console.log(`  ${l.number} ${l.slug.padEnd(9)} ${(jpg.length / 1024).toFixed(0)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
