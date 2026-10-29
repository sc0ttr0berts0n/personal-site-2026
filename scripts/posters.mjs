// Takes stills of each toy, so the feed has pictures before anyone has visited a toy:
//   posters/<slug>.jpg            4:5, for the overview grid, a moment after the toy starts
//   posters/first/<slug>-tall.jpg  the toy's first frame on a portrait phone (390x844: its frame is 390x964)
//   posters/first/<slug>-wide.jpg  the toy's first frame on a landscape screen (1280x800: its frame is 1280x680)
// The first frames are what a toy looks like as it starts, so the feed shows them under a toy while it loads
// and the ripple uses them for a toy that hasn't drawn yet; the live toy then carries on from much the same picture.
//
//   npm run posters [slug ...] [-- --first]     (--first: only the first frames)
//
// Needs Chrome or Edge (or BROWSER=path/to/browser) and the dev dependency puppeteer-core.
// Re-run after a sync when a toy looks different.
import { spawn } from 'node:child_process';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'posters'), FIRST = join(OUT, 'first');
const PORT = 8124, BASE = `http://localhost:${PORT}/`;
const { LABS } = await import('../labs/manifest.js');
const args = process.argv.slice(2), firstOnly = args.includes('--first');
const only = args.filter(a => !a.startsWith('--'));
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
await mkdir(FIRST, { recursive: true });

const HIDE = '.topbar, .caption, .nav, .loader, .poster, .stats, .edge, .toyhint { display: none !important; }';
// a first frame is of the toy's frame, which runs past the screen (feed.css --toy-top / --toy-cut): the page is
// opened at the frame's size with the frame filling it, so the toy lays itself out exactly as it will in the feed
const FRAME = '.slide { --toy-top: 0px !important; --toy-cut: 0px !important; } .slide :is(.poster, iframe) { -webkit-mask-image: none !important; mask-image: none !important; }';
// ?solo: just this toy, no neighbours competing for the GPU. Resolves once it has drawn (Goop compiles for a while).
async function open(l, viewport, frame = false) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(`${BASE}?solo&fx=off#${l.slug}`);
  await page.addStyleTag({ content: HIDE + (frame ? FRAME : '') });
  await page.waitForFunction(() => window.feedMetrics?.loads.length > 0, { timeout: 90000 }).catch(() => console.warn(`  ! ${l.slug}: no frame after 90 s`));
  return page;
}
async function first(l, name, viewport) {
  const page = await open(l, viewport, true);
  // the iframe fades in over .2 s once it has drawn; the toy itself is screenshotted as soon as that's done
  await sleep(250);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 78 });
  await writeFile(join(FIRST, `${l.slug}-${name}.jpg`), jpg);
  await page.close();
  return jpg.length;
}

try {
  for (const l of labs) {
    // 4:5 like the tiles; twice the size of a phone tile so it stays sharp; let it move a little first
    let jpg = '';
    if (!firstOnly) {
      const page = await open(l, { width: 400, height: 500, deviceScaleFactor: 1 });
      await sleep(2500);
      jpg = await page.screenshot({ type: 'jpeg', quality: 80 });
      await writeFile(join(OUT, `${l.slug}.jpg`), jpg);
      await page.close();
    }
    const tall = await first(l, 'tall', { width: 390, height: 844 + 120, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
    const wide = await first(l, 'wide', { width: 1280, height: 800 - 120, deviceScaleFactor: 1 });
    const kb = n => (n / 1024).toFixed(0).padStart(4);
    console.log(`  ${l.number} ${l.slug.padEnd(9)} grid ${kb(jpg.length)} KB · first tall ${kb(tall)} KB · wide ${kb(wide)} KB`);
  }
} finally {
  await browser.close();
  server.kill();
}
