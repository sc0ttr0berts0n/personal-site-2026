// Share previews: what a link to the site shows in Messages, Slack and so on.
//   share/<slug>.jpg         a 1200x1200 card: the name, the toy running, its title (scripts/share-card.html)
//   lab/<slug>/index.html    a copy of index.html whose preview is that lab; the feed puts these links in the address bar
//   index.html               its own preview is the first toy's (config START)
// Previews can't see the #part of a link, so each lab needs a page of its own for its card to show.
//
//   npm run share [slug ...] [-- --pages]     (--pages: only rewrite the pages, keep the pictures)
//
// Needs Chrome or Edge (or BROWSER=path/to/browser) and the dev dependency puppeteer-core.
// Re-run after a sync (new titles or blurbs) and when a toy looks different. SITE_URL and SHARE_AT are in site/config.js.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'share');
const PORT = 8125, BASE = `http://localhost:${PORT}/`;
const { LABS } = await import('../labs/manifest.js');
const { SITE_URL, SHARE_AT, START, ORDER, ARTIST } = await import('../site/config.js');
const args = process.argv.slice(2), pagesOnly = args.includes('--pages');
const only = args.filter(a => !a.startsWith('--'));
const labs = only.length ? LABS.filter(l => only.includes(l.slug)) : LABS;

const exists = p => stat(p).then(() => true, () => false);
const sleep = ms => new Promise(r => setTimeout(r, ms));
await mkdir(OUT, { recursive: true });

if (!pagesOnly) {
  const browsers = [process.env.BROWSER,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  let executablePath = null;
  for (const b of browsers) if (await exists(b)) { executablePath = b; break; }
  if (!executablePath) { console.error('No Chrome or Edge found. Set BROWSER to one.'); process.exit(1); }

  const server = spawn(process.execPath, [join(ROOT, 'scripts', 'serve.mjs'), String(PORT)], { stdio: 'ignore' });
  await sleep(400);
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
  try {
    for (const l of labs) {
      // one toy at a time, so none waits on the GPU for another; 600 css px at 2x, the card's layout size
      const page = await browser.newPage();
      await page.setViewport({ width: 600, height: 600, deviceScaleFactor: 2 });
      await page.goto(`${BASE}scripts/share-card.html?slug=${l.slug}`, { waitUntil: 'load' });
      await sleep(SHARE_AT?.[l.slug] ?? 6000);
      const jpg = await page.screenshot({ type: 'jpeg', quality: 86 });
      await writeFile(join(OUT, `${l.slug}.jpg`), jpg);
      await page.close();
      console.log(`  ${l.number} ${l.slug.padEnd(9)} ${(jpg.length / 1024).toFixed(0).padStart(4)} KB`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

// ---- pages ----
const esc = s => String(s).replace(/<[^>]*>/g, '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// the picture's hash goes on its link, so a preview cached from an older card is fetched again
const version = async slug => createHash('sha1').update(await readFile(join(OUT, `${slug}.jpg`))).digest('hex').slice(0, 8);
const block = async (l, { title, url }) => [
  '<!-- share -->',
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="${esc(ARTIST.name)}">`,
  `<meta property="og:title" content="${esc(title)}">`,
  `<meta property="og:description" content="${esc(l.blurb)}">`,
  `<meta property="og:url" content="${esc(url)}">`,
  `<meta property="og:image" content="${esc(`${SITE_URL}share/${l.slug}.jpg?v=${await version(l.slug)}`)}">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="1200">`,
  `<meta property="og:image:alt" content="${esc(`${l.title}, lab ${l.number} by ${ARTIST.name}`)}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  '<!-- /share -->'
].join('\r\n');
const SHARE = /<!-- share -->[\s\S]*?<!-- \/share -->/;

const index = await readFile(join(ROOT, 'index.html'), 'utf8');
if (!SHARE.test(index)) { console.error('index.html has no <!-- share --> <!-- /share --> block.'); process.exit(1); }
const first = LABS.find(l => l.slug === (START || ORDER[0])) || LABS[0];
const home = index.replace(SHARE, await block(first, { title: `${ARTIST.name} · ${ARTIST.line}`, url: SITE_URL }));
await writeFile(join(ROOT, 'index.html'), home);
for (const l of LABS) {
  if (!(await exists(join(OUT, `${l.slug}.jpg`)))) { console.warn(`  ! ${l.slug}: no card yet, no page`); continue; }
  const title = `${l.title} · ${ARTIST.name}`;
  const page = home.replace(SHARE, await block(l, { title, url: `${SITE_URL}lab/${l.slug}/` }))
    // a plain <base> (every lab page is two folders down), so the browser's early fetches already use the root
    .replace(/<script>\{ \/\/ lab\/<slug>\/ pages[\s\S]*?<\/script>/, '<base href="../../">')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(l.blurb)}">`);
  await mkdir(join(ROOT, 'lab', l.slug), { recursive: true });
  await writeFile(join(ROOT, 'lab', l.slug, 'index.html'), page);
}
console.log(`Pages: index.html and lab/<slug>/ for ${LABS.length} labs`);
