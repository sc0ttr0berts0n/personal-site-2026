// The feed: one toy at a time, swiped sideways (up/down on a portrait phone), preloaded like a video feed.
//
// Window: the current toy plays; its two neighbours are mounted but frozen (paused after a few warm-up
// frames, so a swipe never lands on a blank stage). Anything further away is disposed, which keeps live
// WebGL contexts at three or fewer. Toys are iframes of the lab pages in ?embed mode (embed/lab-embed.js).
//
// Touch: the middle of the screen belongs to the toy on it (its iframe takes pointers directly); a drag that
// starts at the edges of the screen, across the swipe axis, moves between toys. See "gestures" below.
//
// URL: #slug, or #slug/settings-code to carry a lab's settings (e.g. #prism/glass_diamond~pal_reef).
import { LABS } from '../labs/manifest.js';
import { ORDER, START, ARTIST, NO_PRELOAD, TOUCH } from './config.js';
import { logoSVG } from '../labs/shared/logo.js';
import { createTransitions } from './transition.js';
import { LOAD_MS } from './load-times.js';

const bySlug = new Map(LABS.map(l => [l.slug, l]));
const toys = [...ORDER.filter(s => bySlug.has(s)), ...LABS.map(l => l.slug).filter(s => !ORDER.includes(s))].map(s => bySlug.get(s));
const N = toys.length;
const indexOf = slug => toys.findIndex(t => t.slug === slug);
const wrap = i => ((i % N) + N) % N;
const rel = i => wrap(i - cur + Math.floor(N / 2)) - Math.floor(N / 2);   // shortest signed distance from the current toy
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stripTags = s => s.replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = id => document.getElementById(id);

// The swipe axis: 'y' on a portrait touch phone, 'x' everywhere else (desktop, tablets, phones held sideways).
// Everything that moves slides or reads a drag asks this, so it's the one place the decision lives.
const verticalMQ = matchMedia('(orientation: portrait) and (hover: none) and (pointer: coarse) and (max-width: 600px)');
const axis = () => verticalMQ.matches ? 'y' : 'x';
const along = (e, a = axis()) => a === 'y' ? e.clientY : e.clientX;   // a pointer's position on the swipe axis
const across = (e, a = axis()) => a === 'y' ? e.clientX : e.clientY;

const feed = $('feed'), slidesEl = $('slides');
const codes = new Map();          // slug → settings code from the URL
const slides = new Map();         // slug → slide
// not even after a first visit: on an iPhone a heavy toy's second start froze the page for 5-10 s too
const heavy = t => NO_PRELOAD.includes(t.slug);
const touchedToys = new Set();    // toys someone has pressed on this visit, so their hint stops showing
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
let cur = 0;

// ---- metrics (window.feedMetrics; ?stats shows a readout) ----
const metrics = { loads: [], swipes: [], stats: {} };
window.feedMetrics = metrics;
const showStats = new URLSearchParams(location.search).has('stats');
if (new URLSearchParams(location.search).has('trace')) import('./trace.js');   // a run-through record for a real device
const solo = new URLSearchParams(location.search).has('solo');   // measuring only: no preloaded neighbours

// ---- the ripple transition over the slides (site/transition.js); ?fx=off, reduced motion or no WebGL keep the CSS slide ----
const fx = calm || new URLSearchParams(location.search).get('fx') === 'off' ? null : createTransitions(feed);
// Swipe cues, on a tall screen: a chevron at the foot of the top edge zone and one over the caption, as quiet as
// the labs' corner brackets until a swipe starts, so there's always a mark for where a swipe down or up begins.
// They sit over the ripple, so they stay in sight through a move. (Wide screens have the � � buttons.)
const cues = document.createElement('div');
cues.className = 'cues'; cues.setAttribute('aria-hidden', 'true');
cues.innerHTML = '<i class="slot"></i><i class="cue lo"></i><i class="cue hi"></i><i class="ring"></i>' +
  '<i class="pie lo"><b></b><b></b></i><i class="pie hi"><b></b><b></b></i>';
feed.appendChild(cues);
const [slot, cueLo, cueHi, ring, pieLo, pieHi] = cues.children;
const swiping = on => feed.classList.toggle('swiping', on);
// While a drag is on, the chevron it pulls from rides just ahead of the finger, and a ring waits where the drag
// counts: letting go there moves on (EASY of the screen), or, for a touched toy, getting there does (HARD). Reach
// it and the ring flares with the ripple's front (fx.glow) and fades, and the chevron carries on with the finger;
// pull back short and the ring is back, waiting. A faint glass slot runs from the chevron to the ring, like a
// slide-to-unlock track: only the way still to go. All of it on the screen's centre line, wherever the finger is.
const LEAD = 84;      // px from the finger to the chevron, clear of a thumb
function guide(d, e) {
  if (d.axis !== 'y') return;
  const r = feed.getBoundingClientRect();
  const s = d.dx < 0 ? -1 : 1;                       // -1: pulling up, toward the next toy
  const T = feed.clientHeight * (d.hard ? HARD : EASY);
  const armed = Math.abs(d.dx) >= T;
  const cy = d.x0 + d.dx - r.top + s * LEAD;         // the chevron's centre
  const ry = armed ? cy : d.x0 - r.top + s * (T + LEAD);
  const [on, off] = s < 0 ? [cueHi, cueLo] : [cueLo, cueHi];
  on.style.cssText = `top: ${cy - 5}px`;
  off.style.cssText = '';
  ring.style.cssText = `top: ${ry - 11}px`;
  slot.style.cssText = `top: ${Math.min(cy, ry) - 15}px; height: ${Math.abs(ry - cy) + 30}px`;
  if (armed && !feed.classList.contains('armed')) fx?.glow();
  feed.classList.add('guiding');
  feed.classList.toggle('armed', armed);
}
function unguide() {
  for (const el of [slot, cueLo, cueHi, ring]) el.style.cssText = '';
  feed.classList.remove('guiding', 'armed');
}
// Past each chevron (above the top one, below the bottom one), a small pie fills while the toy that way loads, and fades once it has drawn, so a swipe
// there lands on a live toy. An empty ring: it's waiting its turn. The pie turns on the compositor (transforms
// only), so it keeps going while a toy starting up holds the main thread.
// Its pace is a guess at the load: that toy's last load on this device, or else its time in LOAD_MS (each toy
// timed cold, by scripts/load-times.mjs) scaled by how this device has done against that table on the toys it has
// loaded (the median ratio), so one slow or quick toy doesn't throw the rest. Loads are kept across visits.
const LOAD_GUESS = 2500;
let seenLoads = {};
try { seenLoads = JSON.parse(localStorage.getItem('feed-loads')) || {}; } catch (e) {}
function sawLoad(slug, ms) {
  seenLoads[slug] = Math.round(ms);
  try { localStorage.setItem('feed-loads', JSON.stringify(seenLoads)); } catch (e) {}
}
function eta(slug) {
  if (seenLoads[slug]) return seenLoads[slug];
  const r = Object.keys(seenLoads).filter(k => LOAD_MS[k]).map(k => seenLoads[k] / LOAD_MS[k]).sort((a, b) => a - b);
  const pace = r.length ? r[(r.length - 1) >> 1] : 1;
  return (LOAD_MS[slug] || LOAD_GUESS) * pace;
}
function paintPies() {
  for (const [pie, cue, d] of [[pieHi, cueHi, 1], [pieLo, cueLo, -1]]) {
    const s = solo ? null : slides.get(toys[wrap(cur + d)].slug);
    // a heavy toy waits to load until it's on screen, where the spinner and pie say so: nothing to wait for here
    const state = !s || s.ready ? '' : s.iframe ? 'loading' : heavy(s.toy) ? '' : 'queued';
    cue.classList.toggle('nudge', !!state);   // its chevron nudges the way it points, now and then, until it's ready
    fillPie(pie, s, state);
  }
}
// state: 'loading' (fills over the guess, from when s's frame was made), 'queued' (an empty ring) or '' (hidden).
// A toy that loads sooner than the guess doesn't leave its pie part-filled: the fill runs out to full in FINISH,
// then the pie fades (unless it hadn't shown yet). One that takes longer sits full until it's done.
const FINISH = 220;
function fillPie(pie, s, state) {
  const key = state && `${s.toy.slug} ${state} ${s.born}`;
  if (pie.dataset.key === key) return;
  pie.dataset.key = key;
  clearTimeout(pie.finishTimer);
  const t = performance.now(), left = pie.etaMs - (t - pie.bornAt);
  // full, it fades ('done' holds it full); a pie that never showed just goes
  const done = () => { pie.classList.remove('loading', 'queued', 'finishing'); pie.classList.add('done'); };
  if (!state && pie.classList.contains('loading') && t - pie.addedAt > 500) {
    const runs = left > FINISH && pie.getAnimations?.({ subtree: true }) || [];
    if (runs.length) {
      for (const a of runs) a.updatePlaybackRate ? a.updatePlaybackRate(left / FINISH) : (a.playbackRate = left / FINISH);
      pie.classList.add('finishing');
      pie.finishTimer = setTimeout(done, FINISH + 40);
    } else done();
    return;
  }
  pie.classList.remove('loading', 'queued', 'finishing', 'done');
  if (!state) return;
  pie.etaMs = Math.round(eta(s.toy.slug) * 1.2); pie.bornAt = s.born; pie.addedAt = t;
  pie.style.setProperty('--eta', `${pie.etaMs}ms`);
  pie.style.setProperty('--t0', `${Math.round(t - s.born)}ms`);
  void pie.offsetWidth;   // restart the fill
  pie.classList.add(state);
}
function placeCues() {
  const cap = slides.get(toys[cur].slug)?.el.querySelector('.caption');
  if (cap) feed.style.setProperty('--cap-top', `${cap.offsetTop}px`);
}
addEventListener('resize', placeCues);
if (fx) { metrics.fx = fx.stats; window.requestIdleCallback ? requestIdleCallback(() => fx.prepare()) : fx.prepare(); }

// ---- posters: a small snapshot of each toy, for the overview grid and as an underlay while a toy loads ----
// Under a loading toy: its first frame from npm run posters (what it looks like as it starts, so the live toy
// carries on from much the same picture), then this browser's own snapshot; until one of them has loaded, the
// breathing mark. The ripple uses the same underlay for a toy that hasn't drawn yet.
const firstFrame = t => `posters/first/${t.slug}-${innerHeight > innerWidth ? 'tall' : 'wide'}.jpg`;
// the stills two toys either way are fetched ahead, so even a fast swipe to a toy with no slide yet has its picture
const fetched = new Map();
function prefetchAround() {
  for (const d of [1, -1, 2, -2]) {
    const u = firstFrame(toys[wrap(cur + d)]);
    if (!fetched.has(u)) { const im = new Image(); im.decoding = 'async'; im.src = u; fetched.set(u, im); }
  }
}
const posters = new Map();
for (const t of toys) { try { const u = localStorage.getItem('feed-poster:' + t.slug); if (u) posters.set(t.slug, u); } catch (e) {} }
function savePoster(slug, url) {
  posters.set(slug, url);
  try { localStorage.setItem('feed-poster:' + slug, url); } catch (e) {}
}

// ---- URL ----
function readHash() {
  // a hand-typed or truncated link can hold a stray % (e.g. #sand/50%), which decodeURIComponent rejects
  let h = location.hash.slice(1);
  try { h = decodeURIComponent(h); } catch (e) {}
  const i = h.indexOf('/');
  let slug = i < 0 ? h : h.slice(0, i), code = i < 0 ? '' : h.slice(i + 1);
  // lab/<slug>/#code is each lab's own page (made by npm run share), so a shared link previews that lab;
  // an old-style #slug/code link still wins
  const path = location.pathname.match(/\/lab\/([^/]+)\/?$/);
  if (path && bySlug.has(path[1]) && !bySlug.has(slug)) { slug = path[1]; code = h; }
  if (!bySlug.has(slug)) return null;
  if (code) codes.set(slug, code); else codes.delete(slug);
  return slug;
}
const pageHref = t => t.href + (codes.get(t.slug) ? '#' + codes.get(t.slug) : '');
const frameSrc = (t, play) => `${t.href}?embed=1${play ? '' : '&paused=1'}${codes.get(t.slug) ? '#' + codes.get(t.slug) : ''}`;
function writeHash() {
  const t = toys[cur], code = codes.get(t.slug);
  history.replaceState(null, '', `lab/${t.slug}/${location.search}` + (code ? '#' + code : ''));
  document.title = `${t.title} · ${ARTIST.name}`;
  $('count').textContent = `${t.number} / ${String(N).padStart(2, '0')}`;
}

// ---- slides ----
function makeSlide(t, play, defer = false) {
  const el = document.createElement('section');
  el.className = 'slide';
  el.setAttribute('aria-roledescription', 'slide');
  el.setAttribute('aria-label', `${t.number} ${t.title}`);
  el.innerHTML = `
    <div class="stage">
      <img class="poster" alt="" hidden>
      <div class="loader" aria-hidden="true">${logoSVG({ size: 56 })}</div>
      <i class="wait" aria-hidden="true"></i><i class="pie" aria-hidden="true"><b></b><b></b></i>
      <div class="edge lo" aria-hidden="true"></div><div class="edge hi" aria-hidden="true"></div>
      <span class="toyhint" aria-hidden="true"></span>
    </div>
    <div class="caption">
      <button type="button" class="cap" aria-haspopup="dialog">
        <span class="num">lab ${t.number}</span>
        <span class="title">${esc(t.title)}</span>
        <span class="blurb">${esc(t.blurb)}</span>
        <span class="more">more <span class="arr" aria-hidden="true"></span></span>
      </button>
      <a class="btn primary play" href="${esc(pageHref(t))}">Change This <span aria-hidden="true">→</span></a>
    </div>`;
  const s = { toy: t, el, iframe: null, ready: false, playing: play, offset: 0, born: performance.now(), touch: t.touch || TOUCH[t.slug]?.touch || 'none', hint: t.touchHint || TOUCH[t.slug]?.hint || '' };
  const img = el.querySelector('.poster');
  img.onload = () => { img.hidden = false; el.classList.add('has-poster'); };
  img.onerror = () => { const own = posters.get(t.slug); if (own && img.src !== own) img.src = own; };
  img.src = firstFrame(t);
  if (img.complete && img.naturalWidth) img.onload();   // fetched ahead: there now, not a frame later
  el.querySelector('.cap').addEventListener('click', () => openSheet(t));
  slidesEl.appendChild(el);
  slides.set(t.slug, s);
  if (!defer) mount(s);
  return s;
}
function mount(s) {
  if (s.iframe) return;
  const f = document.createElement('iframe');
  f.title = s.toy.title; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
  f.allow = 'clipboard-write';
  f.src = frameSrc(s.toy, s.playing);
  s.born = performance.now();
  s.el.querySelector('.stage').appendChild(f);
  s.iframe = f;
  waiting(); paintPies();   // the pies start filling now, before a heavy start-up can hold the main thread
}

// reload a resting neighbour from scratch; it comes back frozen on its first frame, like any preload
function restart(s) {
  s.peeked = false;
  if (!s.iframe) return;
  s.ready = false; s.el.classList.remove('ready'); s.born = performance.now();
  s.iframe.src = frameSrc(s.toy, false);
}

function dispose(s) {
  slides.delete(s.toy.slug);
  // unloading the document releases its WebGL contexts right away
  if (s.iframe) s.iframe.src = 'about:blank';
  s.el.remove();
}

const send = (s, feedMsg, extra) => s?.iframe?.contentWindow?.postMessage({ feed: feedMsg, ...extra }, location.origin);
const playCurrent = () => { const c = slides.get(toys[cur].slug); if (c) play(c); };
function play(s) { if (!s.playing) { s.playing = true; s.playAt = performance.now(); s.wantLive = true; send(s, 'play'); waiting(); } }
function pause(s) { if (s.playing) { s.playing = false; s.wantLive = false; send(s, 'pause'); } }
// A spinner over the toy on screen while it hasn't drawn, or has been told to play and hasn't moved yet
// (feed.css shows it only after a moment, so a quick start never flashes it). It spins on the compositor too.
// While it hasn't drawn (loading, compiling its shaders) a pie inside the spinner fills over the guess at its load,
// like the ones by the chevrons: Goop's twenty-odd seconds read as a wait with an end, not a hang.
function waiting() {
  const c = slides.get(toys[cur].slug);
  for (const s of slides.values()) {
    const on = s === c;
    s.el.classList.toggle('waiting', on && (!s.ready || !!s.wantLive));
    fillPie(s.el.querySelector('.stage .pie'), s, on && !s.ready ? (s.iframe ? 'loading' : 'queued') : '');
  }
}

// At rest, the neighbours are parked: on screen, under the toy on screen (.parked), not beside it. Safari barely
// runs animation frames in an iframe outside the viewport, so a neighbour waiting beside the screen didn't draw
// its first frame (a phone trace: not until a swipe brought it into view, or ~20 s). Any move unparks them first,
// back to their places beside the screen, with no transition; they park again once it has settled.
let parked = true;
function place(s, dx = 0) {
  const park = parked && !!s.offset && !s.pinned;
  s.el.classList.toggle('parked', park);
  const d = park ? '0px' : `calc(${s.offset * 100}% + ${dx}px)`;
  s.el.style.transform = s.pinned ? 'none' : axis() === 'y' ? `translate3d(0, ${d}, 0)` : `translate3d(${d}, 0, 0)`;
}
function placeAll(dx = 0) { for (const s of slides.values()) place(s, dx); }
function unpark() {
  if (!parked) return;
  parked = false;
  animate(false);
  placeAll();
  for (const s of slides.values()) s.el.getBoundingClientRect();   // there now, so a slide that follows starts from there
}
function park() {
  if (parked || drag?.active) return;
  parked = true;
  placeAll();
}
function animate(on, ms) {
  for (const s of slides.values()) s.el.classList.toggle('anim', on && !calm);
  if (ms) document.documentElement.style.setProperty('--slide-ms', ms + 'ms');
}

// Neighbours load one at a time, and only once the toy on screen has drawn: the next toy first, then the one
// before, each after the last has drawn. Until its turn a neighbour has its slide (still or loader) and no frame.
// Every toy shares the page's main thread, and starting one up holds it for a second or more on a phone (a toy
// still compiling its shaders, like Goop, holds the GPU for many seconds), so two starting together, or one behind
// the toy on screen, froze the feed and the toy you're playing with. One at a time leaves gaps between the stalls.
let neighbourTimer = 0;
const STUCK = 8000;   // a neighbour that hasn't drawn in this long stops holding up the next
// Nor does one start while someone is using the toy on screen: the stall would land under their finger. Touch
// on the feed and in the toys (the embed's 'active') counts; neighbours wait for QUIET of none.
const QUIET = 1500;
let activeAt = -Infinity;
const busyNow = () => { activeAt = performance.now(); };
function loadNeighbours() {
  clearTimeout(neighbourTimer);
  if (solo) return;
  const idle = performance.now() - activeAt;
  if (idle < QUIET) { neighbourTimer = setTimeout(loadNeighbours, QUIET - idle + 50); return; }
  let busy = !slides.get(toys[cur].slug)?.ready;
  for (const d of [1, -1]) {
    const t = toys[wrap(cur + d)];
    let s = slides.get(t.slug);
    // a heavy toy still gets its slide (poster or loader), just no frame until someone stops on it
    if (!s) { s = makeSlide(t, false, true); s.offset = d; place(s); }
    if (!s.iframe && !heavy(t) && !busy) mount(s);
    if (s.iframe && !s.ready && performance.now() - s.born < STUCK) busy = true;
  }
  paintPies();
  if (busy) neighbourTimer = setTimeout(loadNeighbours, 2000);   // in case a 'ready' never comes
}
function scheduleNeighbours() {
  clearTimeout(neighbourTimer);
  const c = slides.get(toys[cur].slug);
  if (c?.ready) neighbourTimer = setTimeout(loadNeighbours, settling ? 460 : 300);
  else neighbourTimer = setTimeout(loadNeighbours, 1500);
}

// After a move settles, dispose of anything outside prev/current/next.
let settleTimer = 0, settling = false;
function settle(ms) {
  settling = true;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settling = false;
    const c = slides.get(toys[cur].slug);
    if (c && !c.iframe) mount(c);
    for (const s of [...slides.values()]) if (s.pinned || Math.abs(rel(indexOf(s.toy.slug))) > 1) dispose(s);
    animate(false);
    park();
    scheduleNeighbours();
  }, ms + 40);
}

let snapTimer = 0;
// held: the ripple is covering the move and starts the toy itself when it lifts
function becameCurrent(s, t0, held = false) {
  for (const o of slides.values()) if (o !== s) pause(o);
  s.peeked = false; s.touched = false;
  if (!s.playing) { if (!held) play(s); s.swipeAt = t0; }
  waiting(); paintPies();
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => send(s, 'snap', { width: 540 }), 2600);
  updateCurrentTile();
  prefetchAround();
  placeCues();
  setLive();
  showHint(s);
}

// Only the toy on screen takes pointers, and only if it does something with them; otherwise its whole slide swipes.
function setLive() {
  const c = slides.get(toys[cur].slug);
  for (const s of slides.values()) s.el.classList.toggle('live', s === c && s.touch !== 'none');
}
// A few words over a toy that arrives, saying what a finger does to it, until it's pressed (or a few seconds pass).
// It waits for the toy's first frame. Mice get the lab's own hint, written for a pointer that hovers and clicks.
function showHint(s) {
  clearTimeout(s.hintTimer);
  const text = finePointer && s.toy.hint ? stripTags(s.toy.hint.split(/<br\s*\/?>/i)[0]) : s.hint;
  if (!s.ready || s.touch === 'none' || !text || touchedToys.has(s.toy.slug)) { s.el.classList.remove('hinting'); return; }
  s.el.querySelector('.toyhint').textContent = text;
  s.el.classList.add('hinting');
  s.hintTimer = setTimeout(() => s.el.classList.remove('hinting'), 4200);
}

// Move by one toy (dir ±1). ms: slide duration, shorter after a fast flick.
function go(dir, { ms = 420, t0 = performance.now() } = {}) {
  unpark();
  const from = slides.get(toys[cur].slug);
  cur = wrap(cur + dir);
  const t = toys[cur];
  let s = slides.get(t.slug);
  if (!s) { s = makeSlide(t, true, heavy(t)); s.offset = dir; place(s); s.el.getBoundingClientRect(); }
  for (const o of slides.values()) o.offset = rel(indexOf(o.toy.slug));
  // with a GL transition the slide runs underneath it, once the overlay is up
  const slide = () => { animate(true, ms); placeAll(); };
  // the ripple plays over stills: the incoming toy stays paused until it lifts, so it carries on from its picture.
  // Loading and disposing neighbours waits for it too: they share this main thread and would stall it mid-ripple.
  const held = !!fx?.cover(from, s, dir, ms, slide, axis(), slid => { playCurrent(); settle(slid ? ms : 0); });
  if (!held) slide();
  if (calm) { s.el.classList.remove('entering'); void s.el.offsetWidth; s.el.classList.add('entering'); }
  becameCurrent(s, t0, held);
  writeHash();
  if (held) { clearTimeout(settleTimer); clearTimeout(neighbourTimer); }
  else settle(calm ? 160 : ms);
}

// Jump anywhere (overview, URL). Neighbours slide; anything further cuts with a short fade over the old toy.
function jump(i) {
  if (i === cur) return;
  unpark();
  const d = rel(i);
  if (Math.abs(d) === 1) return go(d);
  const old = slides.get(toys[cur].slug);
  fx?.stop();
  cur = i;
  const t = toys[cur];
  let s = slides.get(t.slug) || makeSlide(t, true, heavy(t));
  animate(false);   // first, so slides still sliding from a recent swipe cut instead of crossing the screen
  for (const o of slides.values()) { o.offset = rel(indexOf(o.toy.slug)); if (o !== old) place(o); }
  if (old) { old.pinned = true; old.el.classList.add('pinned'); place(old); }
  s.el.classList.remove('entering'); void s.el.offsetWidth; s.el.classList.add('entering');
  place(s);
  becameCurrent(s, performance.now());
  writeHash();
  settle(260);
}

// ---- messages from the toys ----
addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || typeof e.data.feed !== 'string') return;
  const s = [...slides.values()].find(o => o.iframe?.contentWindow === e.source);
  if (!s) return;
  const m = e.data, now = performance.now();
  if (m.feed === 'ready') {
    // the lab's own word on what it does with a finger beats the feed's table
    if (m.touch) s.touch = m.touch;
    if (m.hint) s.hint = m.hint;
    s.ready = true; s.wantLive = false; s.el.classList.add('ready');
    if (s.toy === toys[cur]) { setLive(); showHint(s); }
    waiting(); paintPies();
    sawLoad(s.toy.slug, now - s.born);
    metrics.loads.push({ slug: s.toy.slug, ms: Math.round(now - s.born), asNeighbour: !s.playing && !s.swipeAt });
    if (s.swipeAt) { metrics.swipes.push({ slug: s.toy.slug, msToLive: Math.round(now - s.swipeAt), wasPreloaded: false }); s.swipeAt = 0; }
    scheduleNeighbours();   // the toy on screen, or a neighbour: either way the next one in line can start
  } else if (m.feed === 'live') {
    s.wantLive = false; waiting();
    if (s.swipeAt) { metrics.swipes.push({ slug: s.toy.slug, msToLive: Math.round(now - s.swipeAt), wasPreloaded: s.ready }); s.swipeAt = 0; }
  } else if (m.feed === 'stats') {
    metrics.stats[s.toy.slug] = { fps: +m.fps.toFixed(1), cbMs: +m.cbMs.toFixed(2), worstMs: Math.round(m.worstMs) };
    if (showStats && s.toy === toys[cur]) renderStats(s.toy.slug);
  } else if (m.feed === 'frozen') fx?.keep(s);
  else if (m.feed === 'snap' && m.url) savePoster(s.toy.slug, m.url);
  else if (m.feed === 'active') busyNow();
  else if (m.feed === 'touched') { if (s.toy === toys[cur]) s.touched = true; touchedToys.add(s.toy.slug); clearTimeout(s.hintTimer); s.el.classList.remove('hinting'); }
  // a toy under the pointer gets the wheel, and one that was pressed keeps the focus (even once swiped away),
  // so they pass the feed's own back up
  else if (m.feed === 'wheel') wheel(m.dx, m.dy, m.mode);
  else if (m.feed === 'key') navKey(m.key);
});

function renderStats(slug) {
  const st = metrics.stats[slug], el = $('stats'), mem = performance.memory;
  const lastSwipe = metrics.swipes.at(-1);
  el.hidden = false;
  el.innerHTML = `${slug} · <b>${st.fps}</b> fps · lab js <b>${st.cbMs}</b> ms/frame · worst gap <b>${st.worstMs}</b> ms` +
    `<br>mounted <b>${slides.size}</b>${mem ? ` · js heap <b>${Math.round(mem.usedJSHeapSize / 1048576)}</b> MB` : ''}` +
    (lastSwipe ? ` · last swipe live in <b>${lastSwipe.msToLive}</b> ms` : '') +
    (fx ? `<br>ripple · worst frame <b>${Math.round(fx.stats.worstMs)}</b> ms · up in <b>${fx.stats.coverMs}</b> ms` : '');
}

// ---- gestures: drag, wheel/trackpad, keys, buttons ----
// Pointers in the middle of a live toy go straight into its iframe and never reach the feed. What the feed sees
// is everything else: the edge zones (.edge, a strip at each end of the swipe axis), the caption, and the whole
// slide of a toy that takes no input. A press on an edge zone lights it, so it's plain from the first touch that
// this drag leaves the toy rather than playing with it.
const dialogOpen = () => !!document.querySelector('dialog[open]');
let drag = null, cue = null;
const SLOP = 8;
// Two tiers of swiping. Until someone touches the toy on screen, a swipe moves on easily (18% of the screen, or a
// flick). Once they have touched it (a press that reaches the toy, which its embed reports as 'touched', or a tap or
// stray stroke on a slide the feed handles), leaving takes a long pull, from the edge zones too: a bubble of the toy
// itself forms at the entering edge and only breaks through to the next toy at HARD of the screen; let go before
// that and it shrinks back out. Reset on every visit.
const HARD = 0.45, EASY = 0.18;
const touchedCurrent = () => { const c = slides.get(toys[cur].slug); if (c) c.touched = true; };
const clearCue = () => { cue?.classList.remove('pressed'); cue = null; swiping(false); unguide(); };
feed.addEventListener('pointerdown', busyNow, true);
feed.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') busyNow(); }, true);
feed.addEventListener('pointerdown', e => {
  if (e.button !== 0 || dialogOpen()) return;
  // positions are along the swipe axis (x0, dx) and across it (y0); the axis is fixed for the life of a drag
  const a = axis();
  drag = { id: e.pointerId, axis: a, x0: along(e, a), y0: across(e, a), dx: 0, active: false, samples: [[e.timeStamp, along(e, a)]],
    onToy: !e.target.closest('.caption, a, button, .edge') };
  clearCue();
  cue = e.target.closest('.edge');
  cue?.classList.add('pressed');
  if (cue) swiping(true);
});
addEventListener('pointerup', clearCue);
addEventListener('pointercancel', clearCue);
feed.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const a = drag.axis, dx = along(e, a) - drag.x0, dy = across(e, a) - drag.y0;
  if (!drag.active) {
    if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy)) {
      drag.active = true;
      swiping(true);
      // pick up from where the slides are now: mid-slide after a quick second swipe, at rest otherwise
      const c = slides.get(toys[cur].slug);
      drag.hard = !!c?.touched;
      const m = c && !c.pinned ? new DOMMatrix(getComputedStyle(c.el).transform) : null;
      const at = m ? (a === 'y' ? m.m42 : m.m41) : 0;
      drag.x0 = along(e, a) - at;               // no jump at the slop either
      feed.setPointerCapture(e.pointerId);
      clearTimeout(settleTimer); clearTimeout(neighbourTimer);
      unpark();
      animate(false);
      placeAll(at);
      // a neighbour that isn't mounted yet (fast swiping) gets mounted now, frozen
      loadNeighbours();
      fx?.hold(c, slides.get(toys[wrap(cur - 1)].slug), slides.get(toys[wrap(cur + 1)].slug), a, drag.hard);
      if (fx && c) pause(c);   // under the ripple everything is a still until it lifts
    } else if (Math.abs(dy) > 16) { if (drag.onToy) touchedCurrent(); drag = null; }
    return;
  }
  drag.dx = along(e, a) - drag.x0;
  guide(drag, e);
  drag.samples.push([e.timeStamp, along(e, a)]);
  while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 90) drag.samples.shift();
  const L = a === 'y' ? feed.clientHeight : feed.clientWidth;
  if (drag.hard) {
    // the next toy doesn't show until the pull breaks through: just the bubble (or, without the ripple, a stiff band)
    placeAll(fx ? 0 : drag.dx * 0.3);
    fx?.drag(drag.dx / L);
    if (Math.abs(drag.dx) > L * HARD) {
      const d = drag; drag = null;
      suppressClickUntil = performance.now() + 80;
      go(d.dx < 0 ? 1 : -1, { ms: 420 });
    }
    return;
  }
  placeAll(drag.dx);
  fx?.drag(drag.dx / L);
  // the toy coming into view is live as soon as any of it shows (unless the ripple is showing stills); the one
  // on the other side rests
  if (drag.dx) for (const s of slides.values()) {
    if (s.offset === (drag.dx < 0 ? 1 : -1)) { if (!fx) { play(s); s.peeked = true; } }
    else if (s.offset === (drag.dx < 0 ? -1 : 1)) pause(s);
  }
});
function endDrag(e, cancelled) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.active) { if (d.onToy && !cancelled) touchedCurrent(); return; }   // a tap on the toy
  suppressClickUntil = performance.now() + 80;
  const W = d.axis === 'y' ? feed.clientHeight : feed.clientWidth;
  const [ta, xa] = d.samples[0], [tb, xb] = d.samples.at(-1);
  // px/ms over the last ~90 ms of movement; a finger that stopped before lifting has no flick left
  const v = tb > ta && e.timeStamp - tb < 80 ? (xb - xa) / (tb - ta) : 0;
  const flick = Math.abs(v) > 0.35 && Math.sign(v) === Math.sign(d.dx);
  // (a hard-tier pull commits as it crosses HARD, in pointermove; letting go is always a spring-back)
  if (!cancelled && !d.hard && (Math.abs(d.dx) > W * EASY || flick)) {
    const remaining = W - Math.abs(d.dx);
    const ms = Math.round(Math.max(200, Math.min(420, flick ? remaining / Math.abs(v) * 1.6 : 420)));
    go(d.dx < 0 ? 1 : -1, { ms, t0: performance.now() });
  } else {
    animate(true, 300); placeAll(0); settle(300);
    fx?.release(300, () => { if (!drag?.active) playCurrent(); });
    for (const s of slides.values()) if (s.offset) pause(s);
    // a toy that was peeked at and sent back starts over next time, not from where the peek left it
    setTimeout(() => {
      for (const s of slides.values()) if (s.peeked && s.offset && !s.playing && !drag?.active) restart(s);
    }, 320);
  }
}
feed.addEventListener('pointerup', e => endDrag(e, false));
feed.addEventListener('pointercancel', e => endDrag(e, true));
// rotating a phone swaps the axis: a drag in flight is dropped (as if cancelled) and the slides cut to rest on the new axis
verticalMQ.addEventListener('change', () => {
  document.documentElement.dataset.axis = axis();
  if (fx) { fx.stop(); playCurrent(); settle(0); }
  if (drag?.active) endDrag({ pointerId: drag.id, timeStamp: performance.now() }, true);
  drag = null;
  animate(false); placeAll(0);
});
document.documentElement.dataset.axis = axis();
// a drag that started on the caption or the play button doesn't also click it
let suppressClickUntil = 0;
addEventListener('click', e => { if (performance.now() < suppressClickUntil) { e.stopPropagation(); e.preventDefault(); } }, true);

let wheelAcc = 0, wheelLock = false, wheelTimer = 0;
addEventListener('wheel', e => {
  if (dialogOpen()) return;
  e.preventDefault();
  wheel(e.deltaX, e.deltaY, e.deltaMode);
}, { passive: false });
function wheel(dx, dy, mode) {
  if (dialogOpen()) return;
  const d = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * (mode === 1 ? 16 : 1);
  clearTimeout(wheelTimer);
  // one move per gesture: a trackpad's inertia keeps sending events, so wait for a quiet gap before the next
  wheelTimer = setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 160);
  if (wheelLock) return;
  wheelAcc += d;
  if (Math.abs(wheelAcc) > 40) { wheelLock = true; go(Math.sign(wheelAcc)); wheelAcc = 0; }
}

addEventListener('keydown', e => {
  if (dialogOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
  if (navKey(e.key)) e.preventDefault();
});
function navKey(key) {
  if (dialogOpen()) return false;
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') go(1);
  else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') go(-1);
  else if (key === 'g') openOverview();
  else return false;
  return true;
}
$('prev').addEventListener('click', () => go(-1));
$('next').addEventListener('click', () => go(1));
addEventListener('hashchange', () => { const slug = readHash(); if (slug) { const i = indexOf(slug); if (i === cur) reloadCurrent(); else jump(i); } });
function reloadCurrent() {
  // a new settings code for the toy on screen: remount it with the code
  const s = slides.get(toys[cur].slug);
  if (!s?.iframe) return;
  s.iframe.src = frameSrc(s.toy, true);
  s.el.querySelector('.play').href = pageHref(s.toy);
}

// ---- dialogs ----
const closing = new Map();   // dialog → cancels its pending close, so a quick reopen isn't shut by it
function openDialog(d) {
  closing.get(d)?.();
  if (!d.open) {
    d.showModal();
    // showModal focuses the first button, the handle, which then wears a focus ring; start on the sheet instead
    d.tabIndex = -1; d.focus({ preventScroll: true });
  }
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('open')));
}
function closeDialog(d) {
  if (!d.open) return;
  d.classList.remove('open');
  if (calm) { d.close(); return; }
  let timer = 0;
  const cancel = () => { clearTimeout(timer); d.removeEventListener('transitionend', done); closing.delete(d); };
  const done = e => { if (e && e.target !== d) return; cancel(); d.close(); };
  closing.get(d)?.();
  closing.set(d, cancel);
  d.addEventListener('transitionend', done);
  timer = setTimeout(done, 400);
}
// Sheets follow a downward drag (on the handle, or anywhere once scrolled to the top) and tray away past
// a quarter of their height or on a flick; otherwise they spring back.
function sheetDrag(d) {
  let st = null;
  const begin = (y, t, fromHandle) => {
    if (!d.classList.contains('open')) return;
    st = { y0: y, dy: 0, active: fromHandle, samples: [[t, y]] };
  };
  const follow = (y, t, ev) => {
    if (!st) return;
    if (!st.active) {
      const dy = y - st.y0;
      if (d.scrollTop > 0 || dy < -6) { st = null; return; }   // scrolling the sheet's content instead
      if (dy < 6) return;
      st.active = true; st.y0 = y;
    }
    if (ev.cancelable) ev.preventDefault();
    st.dy = Math.max(0, y - st.y0);
    st.samples.push([t, y]);
    while (st.samples.length > 2 && t - st.samples[0][0] > 90) st.samples.shift();
    d.style.transition = 'none';
    d.style.transform = `translateY(${st.dy}px)`;
  };
  const end = t => {
    if (!st) return;
    const s = st; st = null;
    if (!s.active) return;
    suppressClickUntil = performance.now() + 80;
    const [ta, ya] = s.samples[0], [tb, yb] = s.samples.at(-1);
    const v = tb > ta && t - tb < 80 ? (yb - ya) / (tb - ta) : 0;   // px/ms, down is positive
    d.style.transition = ''; d.style.transform = '';
    if (s.dy > d.offsetHeight * 0.25 || v > 0.5) closeDialog(d);
  };
  d.addEventListener('touchstart', e => begin(e.touches[0].clientY, e.timeStamp, !!e.target.closest('.grab')), { passive: true });
  d.addEventListener('touchmove', e => follow(e.touches[0].clientY, e.timeStamp, e), { passive: false });
  d.addEventListener('touchend', e => end(e.timeStamp));
  d.addEventListener('touchcancel', e => end(e.timeStamp));
  // mouse: the handle only
  d.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || !e.target.closest('.grab')) return;
    begin(e.clientY, e.timeStamp, true);
    const mv = ev => follow(ev.clientY, ev.timeStamp, ev);
    const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); end(ev.timeStamp); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
}
for (const d of document.querySelectorAll('dialog')) {
  if (d.classList.contains('sheet')) sheetDrag(d);
  d.addEventListener('cancel', e => { e.preventDefault(); closeDialog(d); });
  // tap outside the sheet (on the backdrop) closes it
  d.addEventListener('click', e => { if (e.target === d && !d.classList.contains('overview')) closeDialog(d); });
  d.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDialog(d); });
}

function openSheet(t) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let forced = false; try { forced = localStorage.getItem('lab-motion') === 'on'; } catch (e) {}
  $('sheet-body').innerHTML = `
    <button type="button" class="grab" data-close aria-label="Close"></button>
    <span class="num">lab ${t.number}</span>
    <h2 id="sheet-title">${esc(t.title)}</h2>
    <p class="blurb">${esc(t.blurb)}</p>
    <p class="teaches"><span>demonstrates →</span> ${esc(t.teaches)}</p>
    ${t.hint ? `<p class="hint"><span>on its own page →</span> ${esc(stripTags(t.hint))}</p>` : ''}
    <div class="row"><a class="btn primary" href="${esc(pageHref(t))}">Change This <span aria-hidden="true">→</span></a></div>
    ${motion ? `<section><span class="label">Motion</span>
      <p class="stub">${forced ? 'Labs play full motion even though your system asks for reduced motion.' : 'Your system asks for reduced motion, so the labs hold still.'}</p>
      <div class="row"><button type="button" class="btn" id="motion-toggle">${forced ? 'Reduce motion again' : 'Play motion anyway'}</button></div></section>` : ''}
    <section>
      <span class="label">Process</span>
      ${t.versions.length
        ? `<p class="stub">Old versions, from before each decisive change (each runs on a copy of the shared code frozen on 2026-10-30, not the code it was first built on, so some may look a little off).</p>
           <ul class="versions">${t.versions.map(v => `<li><a href="${esc(v.href)}" target="_blank" rel="noopener">${esc(v.name)}</a></li>`).join('')}</ul>`
        : `<p class="stub">No old versions kept for this one.</p>`}
      <p class="stub">Process notes: coming soon. <a href="labs/notes/behind-the-scenes.md" target="_blank" rel="noopener">Raw notes</a></p>
    </section>`;
  $('motion-toggle')?.addEventListener('click', () => {
    try { localStorage.setItem('lab-motion', forced ? 'off' : 'on'); } catch (e) {}
    location.reload();
  });
  openDialog($('sheet'));
}

function avatarHTML() {
  return ARTIST.avatar ? `<img src="${esc(ARTIST.avatar)}" alt="">` : logoSVG({ size: 16 });
}
$('avatar').innerHTML = avatarHTML();
$('artist-name').textContent = ARTIST.name;
$('artist-btn').addEventListener('click', () => {
  $('artist-body').innerHTML = `
    <button type="button" class="grab" data-close aria-label="Close"></button>
    <div class="who"><span class="avatar">${ARTIST.avatar ? avatarHTML() : logoSVG({ size: 34 })}</span>
      <div><h2 id="artist-title">${esc(ARTIST.name)}</h2><p class="blurb">${esc(ARTIST.line)}</p></div></div>
    <ul class="links">${ARTIST.links.map(l => `<li><span>${esc(l.label)}</span><a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.text)}</a></li>`).join('')}</ul>`;
  openDialog($('artist'));
});

// ---- overview ----
let overviewWasPlaying = null;
function renderTiles() {
  $('ov-count').textContent = `${N} labs`;
  // the still from npm run posters, then this browser's own snapshot, then the mark
  $('tiles').innerHTML = toys.map((t, i) => `<li><button type="button" class="tile" data-slug="${t.slug}" data-i="${i}"${i === cur ? ' aria-current="true"' : ''}>
      <span class="mark">${logoSVG({ size: 32 })}</span><img src="posters/${t.slug}.jpg" alt="" loading="lazy" decoding="async">
      <span class="lbl"><span class="num">${t.number}</span><b>${esc(t.title)}</b></span></button></li>`).join('');
  for (const img of $('tiles').querySelectorAll('img')) img.addEventListener('error', () => {
    const live = posters.get(img.closest('.tile').dataset.slug);
    if (live && img.src !== live) img.src = live; else img.remove();
  });
}
function updateCurrentTile() {
  for (const b of document.querySelectorAll('.tile')) b.setAttribute('aria-current', +b.dataset.i === cur ? 'true' : 'false');
}
function openOverview() {
  renderTiles();
  // nothing on screen while the grid covers it, so the toy rests
  overviewWasPlaying = slides.get(toys[cur].slug);
  if (overviewWasPlaying) pause(overviewWasPlaying);
  openDialog($('overview'));
  $('overview').querySelector(`.tile[data-i="${cur}"]`)?.focus({ preventScroll: false });
}
$('grid-btn').addEventListener('click', openOverview);
$('tiles').addEventListener('click', e => {
  const b = e.target.closest('.tile');
  if (!b) return;
  const i = +b.dataset.i;
  closeDialog($('overview'));
  if (i === cur) { if (overviewWasPlaying) play(overviewWasPlaying); }
  else jump(i);
});
$('overview').addEventListener('close', () => {
  const s = slides.get(toys[cur].slug);
  if (s) play(s);
});

// ---- start ----
const startSlug = readHash() || (START && bySlug.has(START) ? START : toys[0].slug);
cur = indexOf(startSlug);
const first = makeSlide(toys[cur], true);
first.offset = 0; place(first);
writeHash();
renderTiles();
clearTimeout(snapTimer);
snapTimer = setTimeout(() => send(first, 'snap', { width: 540 }), 2600);
prefetchAround();
placeCues();
setLive();
waiting();
scheduleNeighbours();
