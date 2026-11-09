// Copies the labs into this site from the folder they're developed in. Never moves or edits the source.
//
//   node scripts/sync-labs.mjs [path/to/labs]
//
// Default source: workspace/labs in this repo (or LABS_SRC).
// Output: labs/ in this repo (generated, overwritten on every run), plus labs/manifest.js,
// which the feed reads for each lab's number, title, blurb, teaches, hint and old versions, and labs/stories.js,
// each lab's process story (from notes/process-stories.md) for its own page.
// Each copied lab page gets one <script> tag for the feed's embed hooks (embed/lab-embed.js);
// standalone, without ?embed in its URL, that script does nothing.
import { readdir, readFile, writeFile, mkdir, rm, cp, stat } from 'node:fs/promises';
import { join, resolve, dirname, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(process.argv[2] || process.env.LABS_SRC || join(ROOT, 'workspace', 'labs'));
const OUT = join(ROOT, 'labs');
// Feed embed hooks, plus the layout of a lab's own page on the site (embed/lab-page.js).
const EMBED_TAG = '<script src="../embed/lab-embed.js"></script>\n<script src="../embed/lab-page.js"></script>';

// What a lab's own page shows before its code has loaded: the header, the panel's name and tabs, and the toy's first
// frame (the feed's still). It goes in before the lab's module, which only builds the real page once all its imports
// have arrived; embed/lab-page.js swaps this out then. The feed's frames hide it (embed/lab-embed.js).
// The story is here in full, and moves into the real page as it stands: reading never waits for the toy.
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const storyHTML = (slug, story) => {
  if (!story) return '';
  const thumb = src => `<img class="ver-thumb" src="${src}" alt="" loading="lazy" decoding="async">`;
  const tile = (v, i) => `<li><button type="button" class="ver-tile" data-name="${esc(v.name)}" data-href="${esc(v.href)}">${thumb('../posters/' + v.href.replace('labs/notes/', '').replace(/\.html$/, '.jpg'))}<span class="ver-n">${v.name.match(/^\d+[a-z]?/)?.[0] || i + 1}</span><span><span class="ver-cap">${esc(v.note || v.name.replace(/^\d+[a-z]?-?/, '').replace(/-/g, ' '))}</span><br><span class="ver-go">Play ▸</span></span></button></li>`;
  return `<section class="lab-story">${story.blocks.map(b => b.p ? `<p>${b.p}</p>` : `<ol class="lab-versions" aria-label="Saved versions">${b.versions.map(i => tile(story.versions[i], i)).join('')}</ol>`).join('')}${story.open ? `<p class="open"><b>Still open</b>${story.open}</p>` : ''}${story.versions.length ? `<ol class="lab-versions" aria-label="The lab today"><li><button type="button" class="ver-now">${thumb(`../posters/${slug}.jpg`)}<span class="ver-n">Now</span><span><span class="ver-cap">this lab, as it is today</span><br><span class="ver-go">See it ▴</span></span></button></li></ol>` : ''}</section>`;
};
const bootShell = ({ slug, number, title, blurb, teaches }, story) => `<body>
<div class="lab-boot">
<header class="lab-top"><a class="who lab-back" href="../#${slug}" aria-label="Back to all labs"><span class="arr" aria-hidden="true">←</span>${logoSVG({ size: 18 })} scott robertson</a><span>lab ${number}</span></header>
<div class="lab">
<div class="lab-stage" aria-hidden="true"><div class="lab-poster"><picture><source media="(orientation: landscape)" srcset="../posters/first/${slug}-wide.jpg"><img src="../posters/first/${slug}-tall.jpg" alt="" fetchpriority="high"></picture><i class="lab-spin"></i></div></div>
<div class="lab-panel"><div class="lab-peek"></div><div class="lab-tabs" aria-hidden="true"><span class="lab-tab boot-change">Change This</span><span class="lab-tab boot-story">How it got here</span></div>
<div class="lab-group"><span class="num">Lab ${number}</span><h1>${title}</h1></div><p class="blurb">${blurb}</p>
<div class="lab-pane lab-pane-story">${storyHTML(slug, story)}${teaches ? `<p class="teaches"><span>how it’s built →</span> ${teaches}</p>` : ''}<p class="lab-raw"><a href="notes/behind-the-scenes.md" target="_blank" rel="noopener">Raw notes</a></p></div></div>
</div>
</div>
`;
// The labs are written for the artifact viewer, which supplies its own viewport. Served directly, a phone would
// lay them out at desktop width unless the page says otherwise.
const VIEWPORT_TAG = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';

// Lab file → its folder in notes/versions, where the names differ.
const VERSION_DIRS = { fluid: 'vessel', godrays: 'logo-light' };

const exists = p => stat(p).then(() => true, () => false);
if (!(await exists(join(SRC, 'shared', 'lab.js')))) {
  console.error(`No labs found at ${SRC} (expected shared/lab.js). Pass the labs folder as an argument.`);
  process.exit(1);
}
const { logoSVG } = await import(pathToFileURL(join(SRC, 'shared', 'logo.js')).href);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

await cp(join(SRC, 'shared'), join(OUT, 'shared'), { recursive: true });
await mkdir(join(OUT, 'notes'), { recursive: true });
await cp(join(SRC, 'notes', 'behind-the-scenes.md'), join(OUT, 'notes', 'behind-the-scenes.md'));
const STORIES_MD = join(SRC, 'notes', 'process-stories.md');
if (await exists(STORIES_MD)) await cp(STORIES_MD, join(OUT, 'notes', 'process-stories.md'));
if (await exists(join(SRC, 'notes', 'versions'))) {
  await cp(join(SRC, 'notes', 'versions'), join(OUT, 'notes', 'versions'), { recursive: true });
  // the old versions play inside a lab's page as squares, stage only: they get the feed's embed hooks too
  for (const dir of await readdir(join(OUT, 'notes', 'versions'))) {
    const d = join(OUT, 'notes', 'versions', dir);
    if (!(await stat(d)).isDirectory()) continue;
    for (const f of (await readdir(d)).filter(f => f.endsWith('.html'))) {
      const html = await readFile(join(d, f), 'utf8');
      const at = html.search(/<meta charset[^>]*>/i);
      if (at < 0) { console.warn(`  ! versions/${dir}/${f}: no <meta charset>, embed hooks not added`); continue; }
      const end = html.indexOf('>', at) + 1;
      await writeFile(join(d, f), html.slice(0, end) + '\n' + VIEWPORT_TAG + '\n<link rel="icon" href="../../../../favicon.svg" type="image/svg+xml">\n<script src="../../../../embed/lab-embed.js"></script>' + html.slice(end));
    }
  }
}

const field = (src, key) => {
  const m = src.match(new RegExp(`\\b${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
  return m ? m[1].replace(/\\(.)/g, '$1') : '';
};

// feed: { touch: 'drag', hint: '...' } from a lab's createLab spec (one line), for the feed to know before it loads
const feedField = src => {
  const m = src.match(/\bfeed:\s*\{\s*touch:\s*'(\w+)'(?:,\s*hint:\s*'((?:[^'\\]|\\.)*)')?\s*\}/);
  return m ? { touch: m[1], touchHint: (m[2] || '').replace(/\\(.)/g, '$1') } : {};
};

const labs = [], pages = [];
for (const file of (await readdir(SRC)).filter(f => f.endsWith('.html')).sort()) {
  const slug = basename(file, '.html');
  let html = await readFile(join(SRC, file), 'utf8');
  if (!html.includes(EMBED_TAG)) {
    // classic script right after <meta charset>, so it runs before the lab's modules
    const at = html.search(/<meta charset[^>]*>/i);
    if (at < 0) { console.warn(`  ! ${file}: no <meta charset>, embed hooks not added`); }
    else {
      const end = html.indexOf('>', at) + 1;
      const viewport = /<meta name="viewport"/i.test(html) ? '' : '\n' + VIEWPORT_TAG;
      // opened on its own, a lab page would otherwise ask for /favicon.ico and get a 404
      const icon = /rel="icon"/i.test(html) ? '' : '\n<link rel="icon" href="../favicon.svg" type="image/svg+xml">';
      html = html.slice(0, end) + viewport + icon + '\n' + EMBED_TAG + html.slice(end);
    }
  }
    const vdir = VERSION_DIRS[slug] || slug;
  const vpath = join(SRC, 'notes', 'versions', vdir);
  const versions = (await exists(vpath))
    ? (await readdir(vpath)).filter(f => f.endsWith('.html')).sort().map(f => ({ name: basename(f, '.html'), href: `labs/notes/versions/${vdir}/${f}` }))
    : [];
  const spec = html.replace(/\bfeed:\s*\{[^}]*\}/, '');   // so a lab without a hint doesn't pick up its feed hint
  labs.push({
    slug, number: field(spec, 'number'), title: field(spec, 'title'),
    blurb: field(spec, 'blurb'), teaches: field(spec, 'teaches'), hint: field(spec, 'hint'), ...feedField(html),
    href: `labs/${file}`, versions
  });
  // nothing on the page waits for the web fonts (they swap in)
  html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com([^"]*)">/, `<link rel="stylesheet" href="https://fonts.googleapis.com$1" media="print" onload="this.media='all'">`);
  pages.push({ file, html, lab: labs.at(-1) });
}
labs.sort((a, b) => a.number.localeCompare(b.number));

await writeFile(join(OUT, 'manifest.js'),
  `// Generated by scripts/sync-labs.mjs from ${relative(ROOT, SRC).replace(/\\/g, '/')} — do not edit; edit the labs and re-sync.\n` +
  `export const LABS = ${JSON.stringify(labs, null, 2)};\n`);
// ---- process stories: "## Title" per lab (its current title), then paragraphs with *Versions: …* lines
// (`lab/name` (caption) → `name`) between them, each playing where the story talks about it, and an
// optional *Still open: …* line ----
const stories = {};
if (await exists(STORIES_MD)) {
  const md = (await readFile(STORIES_MD, 'utf8')).replace(/\r/g, '');
  const inline = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  for (const sec of md.split(/^## /m).slice(1)) {
    const [head, ...lines] = sec.split('\n');
    const name = head.trim();
    const lab = labs.find(l => l.title === name) || labs.find(l => l.slug === name.toLowerCase());
    if (!lab) { console.warn(`  ! process-stories.md: no lab titled "${name}"`); continue; }
    const story = { blocks: [], versions: [], open: '' };
    // one paragraph per line
    for (const line of lines.map(l => l.trim()).filter(l => l && l !== '---')) {
      const v = line.match(/^\*Versions:\s*(.*)\*$/), o = line.match(/^\*Still open:\s*(.*)\*$/);
      if (o) { story.open = inline(o[1]); continue; }
      if (!v) { story.blocks.push({ p: inline(line) }); continue; }
      let dir = VERSION_DIRS[lab.slug] || lab.slug;
      const group = [];
      for (const step of v[1].split('→')) {
        const m = step.match(/`([^`]+)`\s*(?:\(([^)]*)\))?/);
        if (!m) continue;
        const ref = m[1].includes('/') ? m[1] : `${dir}/${m[1]}`;
        const [d, n] = ref.split('/');
        dir = d;
        const ver = lab.versions.find(x => x.name === n) || lab.versions.find(x => x.name.startsWith(n + '-'));
        if (!ver) { console.warn(`  ! process-stories.md: ${lab.slug} names a version ${ref} that isn't saved`); continue; }
        group.push(story.versions.length);
        story.versions.push({ name: ver.name, href: ver.href, note: m[2] || '' });
      }
      if (group.length) story.blocks.push({ versions: group });
    }
    stories[lab.slug] = story;
  }
  for (const l of labs) if (!stories[l.slug]) console.warn(`  ! process-stories.md: no story for ${l.slug} (${l.title})`);
}
// each page, with its first shell and story; the lab's code waits for the first paint
for (const { file, html, lab } of pages) {
  const at = html.indexOf('<script type="module">');
  if (at < 0) console.warn(`  ! ${file}: no module script, first paint shell not added`);
  await writeFile(join(OUT, file), at < 0 ? html : html.slice(0, at) + bootShell(lab, stories[lab.slug]) + '<script type="module">\nimport \'../embed/lab-first-paint.js\';' + html.slice(at + '<script type="module">'.length));
}
await writeFile(join(OUT, 'stories.js'),
  `// Generated by scripts/sync-labs.mjs from ${relative(ROOT, STORIES_MD).replace(/\\/g, '/')} — do not edit; edit the stories and re-sync.\n` +
  `// Each lab's process story, for the posters script (each lab's own page has its story written in): blocks in reading order, a paragraph (HTML) or indexes into its saved versions.\n` +
  `export const STORIES = ${JSON.stringify(stories, null, 2)};\n`);

await writeFile(join(OUT, 'README.md'),
  '# Generated copy\n\nThis folder is a copy of the labs, made by `npm run sync`. Edits here are overwritten.\n' +
  'Edit the labs where they are developed, then re-sync.\n');

for (const l of labs) console.log(`  ${l.number} ${l.slug.padEnd(9)} ${l.title.padEnd(16)} ${l.versions.length} old version(s)`);
console.log(`Synced ${labs.length} labs from ${SRC}`);
