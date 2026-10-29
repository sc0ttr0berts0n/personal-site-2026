// Times how long each toy takes to load cold, to give the feed's loading pies a good first guess:
//   site/load-times.js   LOAD_MS: ms from a toy's frame being created to its first drawn frame ('ready')
// Each toy is opened alone in the feed (?solo) in a fresh browser, so nothing is cached and no shader is compiled
// yet, at phone size with the CPU slowed 4x (a mid-range phone's pace). What matters is the ratio between toys:
// the feed scales the whole table by how this device has done on the toys it has already loaded (feed.js eta()).
// Real numbers from visitors (analytics) can replace the table later, in the same shape.
//
//   npm run load-times [slug ...] [-- --reps 3]     (the median of the runs; a slug or two: just those, merged in)
//
// Needs Chrome or Edge (or BROWSER=path/to/browser) and the dev dependency puppeteer-core. Takes a few minutes.
// Re-run after a sync when a toy changes how much it does at start-up.
import { spawn } from 'node:child_process';
import { writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8125, BASE = `http://localhost:${PORT}/`;
const { LABS } = await import('../labs/manifest.js');
const args = process.argv.slice(2), at = args.indexOf('--reps'), REPS = at >= 0 ? +args[at + 1] || 1 : 1;
const only = args.filter((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1));
const labs = only.length ? LABS.filter(l => only.includes(l.slug)) : LABS;
const CPU = 4, GIVE_UP = 60000;

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

async function time(slug) {
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => console.log('  ', slug, 'error:', e.message));
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const cdp = await page.createCDPSession();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await page.goto(`${BASE}?solo#${slug}`, { waitUntil: 'load' });
    const t0 = Date.now();
    while (Date.now() - t0 < GIVE_UP) {
      const ms = await page.evaluate(() => window.feedMetrics?.loads?.[0]?.ms).catch(() => undefined);
      if (ms != null) return ms;
      await sleep(250);
    }
    return null;
  } finally { await browser.close(); }
}

const runs = {};
try {
  for (let r = 0; r < REPS; r++) for (const { slug } of labs) {
    const ms = await time(slug);
    console.log(slug.padEnd(10), ms == null ? 'gave up' : `${ms} ms`);
    if (ms != null) (runs[slug] ||= []).push(ms);
  }
} finally { server.kill(); }

const median = a => { const s = [...a].sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
// toys not timed this run keep their old time
const { LOAD_MS: old } = await import('../site/load-times.js').catch(() => ({ LOAD_MS: {} }));
const ms = slug => runs[slug] ? Math.round(median(runs[slug]) / 10) * 10 : old[slug];
const rows = LABS.filter(l => ms(l.slug)).map(l => `  ${l.slug}: ${ms(l.slug)},`);
await writeFile(join(ROOT, 'site', 'load-times.js'), `// Made by scripts/load-times.mjs (npm run load-times): how long each toy takes to load cold, in ms, alone, at
// phone size with the CPU slowed ${CPU}x. Only the ratios matter: the feed scales them to the device (feed.js eta()).
export const LOAD_MS = {
${rows.join('\n')}
};
`);
console.log('wrote site/load-times.js');
