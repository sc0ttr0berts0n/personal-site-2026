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
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(process.argv[2] || process.env.LABS_SRC || join(ROOT, 'workspace', 'labs'));
const OUT = join(ROOT, 'labs');
// Feed embed hooks, plus the layout of a lab's own page on the site (embed/lab-page.js).
const EMBED_TAG = '<script src="../embed/lab-embed.js"></script>\n<script src="../embed/lab-page.js"></script>';
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
      await writeFile(join(d, f), html.slice(0, end) + '\n' + VIEWPORT_TAG + '\n<script src="../../../../embed/lab-embed.js"></script>' + html.slice(end));
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

const labs = [];
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
      html = html.slice(0, end) + viewport + '\n' + EMBED_TAG + html.slice(end);
    }
  }
  await writeFile(join(OUT, file), html);

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
}
labs.sort((a, b) => a.number.localeCompare(b.number));

await writeFile(join(OUT, 'manifest.js'),
  `// Generated by scripts/sync-labs.mjs from ${relative(ROOT, SRC).replace(/\\/g, '/')} — do not edit; edit the labs and re-sync.\n` +
  `export const LABS = ${JSON.stringify(labs, null, 2)};\n`);
// ---- process stories: "## Title" per lab (its current title), paragraphs, then the *Versions: …* line
// (`lab/name` (caption) → `name` → live) and an optional *Still open: …* line ----
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
    const story = { paras: [], versions: [], open: '' };
    // one paragraph per line
    for (const line of lines.map(l => l.trim()).filter(l => l && l !== '---')) {
      const v = line.match(/^\*Versions:\s*(.*)\*$/), o = line.match(/^\*Still open:\s*(.*)\*$/);
      if (o) { story.open = inline(o[1]); continue; }
      if (!v) { story.paras.push(inline(line)); continue; }
      let dir = VERSION_DIRS[lab.slug] || lab.slug;
      for (const step of v[1].split('→')) {
        const m = step.match(/`([^`]+)`\s*(?:\(([^)]*)\))?/);
        if (!m) continue;
        const ref = m[1].includes('/') ? m[1] : `${dir}/${m[1]}`;
        const [d, n] = ref.split('/');
        dir = d;
        const ver = lab.versions.find(x => x.name === n) || lab.versions.find(x => x.name.startsWith(n + '-'));
        if (!ver) { console.warn(`  ! process-stories.md: ${lab.slug} names a version ${ref} that isn't saved`); continue; }
        story.versions.push({ name: ver.name, href: ver.href, note: m[2] || '' });
      }
    }
    stories[lab.slug] = story;
  }
  for (const l of labs) if (!stories[l.slug]) console.warn(`  ! process-stories.md: no story for ${l.slug} (${l.title})`);
}
await writeFile(join(OUT, 'stories.js'),
  `// Generated by scripts/sync-labs.mjs from ${relative(ROOT, STORIES_MD).replace(/\\/g, '/')} — do not edit; edit the stories and re-sync.\n` +
  `// Each lab's process story for its own page (embed/lab-page.js): paragraphs and notes are HTML.\n` +
  `export const STORIES = ${JSON.stringify(stories, null, 2)};\n`);

await writeFile(join(OUT, 'README.md'),
  '# Generated copy\n\nThis folder is a copy of the labs, made by `npm run sync`. Edits here are overwritten.\n' +
  'Edit the labs where they are developed, then re-sync.\n');

for (const l of labs) console.log(`  ${l.number} ${l.slug.padEnd(9)} ${l.title.padEnd(16)} ${l.versions.length} old version(s)`);
console.log(`Synced ${labs.length} labs from ${SRC}`);
