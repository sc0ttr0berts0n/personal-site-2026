// The feed: one toy at a time, swiped sideways, preloaded like a video feed.
//
// Window: the current toy plays; its two neighbours are mounted but frozen (paused after a few warm-up
// frames, so a swipe never lands on a blank stage). Anything further away is disposed, which keeps live
// WebGL contexts at three or fewer. Toys are iframes of the lab pages in ?embed mode (embed/lab-embed.js).
//
// URL: #slug, or #slug/settings-code to carry a lab's settings (e.g. #prism/glass_diamond~pal_reef).
import { LABS } from '../labs/manifest.js';
import { ORDER, START, ARTIST, NO_PRELOAD } from './config.js';
import { logoSVG } from '../labs/shared/logo.js';

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

const feed = $('feed'), slidesEl = $('slides');
const codes = new Map();          // slug → settings code from the URL
const slides = new Map();         // slug → slide
const warmed = new Set();         // toys that have drawn once this visit, so their shaders are compiled
const heavy = t => NO_PRELOAD.includes(t.slug) && !warmed.has(t.slug);
let cur = 0;

// ---- metrics (window.feedMetrics; ?stats shows a readout) ----
const metrics = { loads: [], swipes: [], stats: {} };
window.feedMetrics = metrics;
const showStats = new URLSearchParams(location.search).has('stats');
const solo = new URLSearchParams(location.search).has('solo');   // measuring only: no preloaded neighbours

// ---- posters: a small snapshot of each toy, for the overview grid and as an underlay while a toy loads ----
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
  const slug = i < 0 ? h : h.slice(0, i), code = i < 0 ? '' : h.slice(i + 1);
  if (!bySlug.has(slug)) return null;
  if (code) codes.set(slug, code); else codes.delete(slug);
  return slug;
}
const pageHref = t => t.href + (codes.get(t.slug) ? '#' + codes.get(t.slug) : '');
const frameSrc = (t, play) => `${t.href}?embed=1${play ? '' : '&paused=1'}${codes.get(t.slug) ? '#' + codes.get(t.slug) : ''}`;
function writeHash() {
  const t = toys[cur], code = codes.get(t.slug);
  history.replaceState(null, '', '#' + t.slug + (code ? '/' + code : ''));
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
    </div>
    <div class="caption">
      <button type="button" class="cap" aria-haspopup="dialog">
        <span class="num">lab ${t.number}</span>
        <span class="title">${esc(t.title)}</span>
        <span class="blurb">${esc(t.blurb)}</span>
        <span class="more">more ↑</span>
      </button>
      <a class="btn primary play" href="${esc(pageHref(t))}">Play with this <span aria-hidden="true">→</span></a>
    </div>`;
  const s = { toy: t, el, iframe: null, ready: false, playing: play, offset: 0, born: performance.now() };
  const poster = posters.get(t.slug);
  if (poster) { const img = el.querySelector('.poster'); img.src = poster; img.hidden = false; el.classList.add('has-poster'); }
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
function play(s) { if (!s.playing) { s.playing = true; s.playAt = performance.now(); send(s, 'play'); } }
function pause(s) { if (s.playing) { s.playing = false; send(s, 'pause'); } }

function place(s, dx = 0) {
  s.el.style.transform = s.pinned ? 'none' : `translate3d(calc(${s.offset * 100}% + ${dx}px), 0, 0)`;
}
function placeAll(dx = 0) { for (const s of slides.values()) place(s, dx); }
function animate(on, ms) {
  for (const s of slides.values()) s.el.classList.toggle('anim', on && !calm);
  if (ms) document.documentElement.style.setProperty('--slide-ms', ms + 'ms');
}

// Neighbours load once the current toy has drawn, so they never compete with it for the first frame.
let neighbourTimer = 0;
function loadNeighbours() {
  clearTimeout(neighbourTimer);
  if (solo) return;
  for (const d of [1, -1]) {
    const t = toys[wrap(cur + d)];
    // a heavy toy still gets its slide (poster or loader), just no frame until someone stops on it
    if (!slides.has(t.slug)) { const s = makeSlide(t, false, heavy(t)); s.offset = d; place(s); }
  }
}
function scheduleNeighbours() {
  clearTimeout(neighbourTimer);
  const c = slides.get(toys[cur].slug);
  if (c?.ready) neighbourTimer = setTimeout(loadNeighbours, settling ? 460 : 60);
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
    scheduleNeighbours();
  }, ms + 40);
}

let snapTimer = 0;
function becameCurrent(s, t0) {
  for (const o of slides.values()) if (o !== s) pause(o);
  s.peeked = false;
  if (s.playing) {} else { play(s); s.swipeAt = t0; }
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => send(s, 'snap', { width: 540 }), 2600);
  updateCurrentTile();
}

// Move by one toy (dir ±1). ms: slide duration, shorter after a fast flick.
function go(dir, { ms = 420, t0 = performance.now() } = {}) {
  cur = wrap(cur + dir);
  const t = toys[cur];
  let s = slides.get(t.slug);
  if (!s) { s = makeSlide(t, true, heavy(t)); s.offset = dir; place(s); s.el.getBoundingClientRect(); }
  for (const o of slides.values()) o.offset = rel(indexOf(o.toy.slug));
  animate(true, ms);
  placeAll();
  if (calm) { s.el.classList.remove('entering'); void s.el.offsetWidth; s.el.classList.add('entering'); }
  becameCurrent(s, t0);
  writeHash();
  settle(calm ? 160 : ms);
}

// Jump anywhere (overview, URL). Neighbours slide; anything further cuts with a short fade over the old toy.
function jump(i) {
  if (i === cur) return;
  const d = rel(i);
  if (Math.abs(d) === 1) return go(d);
  const old = slides.get(toys[cur].slug);
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
    s.ready = true; s.el.classList.add('ready'); warmed.add(s.toy.slug);
    metrics.loads.push({ slug: s.toy.slug, ms: Math.round(now - s.born), asNeighbour: !s.playing && !s.swipeAt });
    if (s.swipeAt) { metrics.swipes.push({ slug: s.toy.slug, msToLive: Math.round(now - s.swipeAt), wasPreloaded: false }); s.swipeAt = 0; }
    if (s.toy === toys[cur]) scheduleNeighbours();
  } else if (m.feed === 'live' && s.swipeAt) {
    metrics.swipes.push({ slug: s.toy.slug, msToLive: Math.round(now - s.swipeAt), wasPreloaded: s.ready });
    s.swipeAt = 0;
  } else if (m.feed === 'stats') {
    metrics.stats[s.toy.slug] = { fps: +m.fps.toFixed(1), cbMs: +m.cbMs.toFixed(2), worstMs: Math.round(m.worstMs) };
    if (showStats && s.toy === toys[cur]) renderStats(s.toy.slug);
  } else if (m.feed === 'snap' && m.url) savePoster(s.toy.slug, m.url);
});

function renderStats(slug) {
  const st = metrics.stats[slug], el = $('stats'), mem = performance.memory;
  const lastSwipe = metrics.swipes.at(-1);
  el.hidden = false;
  el.innerHTML = `${slug} · <b>${st.fps}</b> fps · lab js <b>${st.cbMs}</b> ms/frame · worst gap <b>${st.worstMs}</b> ms` +
    `<br>mounted <b>${slides.size}</b>${mem ? ` · js heap <b>${Math.round(mem.usedJSHeapSize / 1048576)}</b> MB` : ''}` +
    (lastSwipe ? ` · last swipe live in <b>${lastSwipe.msToLive}</b> ms` : '');
}

// ---- gestures: drag, wheel/trackpad, keys, buttons ----
const dialogOpen = () => !!document.querySelector('dialog[open]');
let drag = null;
const SLOP = 8;
feed.addEventListener('pointerdown', e => {
  if (e.button !== 0 || dialogOpen()) return;
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, active: false, samples: [[e.timeStamp, e.clientX]] };
});
feed.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.active) {
    if (Math.abs(dx) > SLOP && Math.abs(dx) > Math.abs(dy)) {
      drag.active = true;
      // pick up from where the slides are now: mid-slide after a quick second swipe, at rest otherwise
      const c = slides.get(toys[cur].slug);
      const at = c && !c.pinned ? new DOMMatrix(getComputedStyle(c.el).transform).m41 : 0;
      drag.x0 = e.clientX - at;                 // no jump at the slop either
      feed.setPointerCapture(e.pointerId);
      clearTimeout(settleTimer); clearTimeout(neighbourTimer);
      animate(false);
      placeAll(at);
      // a neighbour that isn't mounted yet (fast swiping) gets mounted now, frozen
      loadNeighbours();
    } else if (Math.abs(dy) > 16) drag = null;
    return;
  }
  drag.dx = e.clientX - drag.x0;
  drag.samples.push([e.timeStamp, e.clientX]);
  while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 90) drag.samples.shift();
  placeAll(drag.dx);
  // the toy coming into view is live as soon as any of it shows; the one on the other side rests
  if (drag.dx) for (const s of slides.values()) {
    if (s.offset === (drag.dx < 0 ? 1 : -1)) { play(s); s.peeked = true; }
    else if (s.offset === (drag.dx < 0 ? -1 : 1)) pause(s);
  }
});
function endDrag(e, cancelled) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (!d.active) return;
  suppressClickUntil = performance.now() + 80;
  const W = feed.clientWidth;
  const [ta, xa] = d.samples[0], [tb, xb] = d.samples.at(-1);
  // px/ms over the last ~90 ms of movement; a finger that stopped before lifting has no flick left
  const v = tb > ta && e.timeStamp - tb < 80 ? (xb - xa) / (tb - ta) : 0;
  const flick = Math.abs(v) > 0.35 && Math.sign(v) === Math.sign(d.dx);
  if (!cancelled && (Math.abs(d.dx) > W * 0.18 || flick)) {
    const remaining = W - Math.abs(d.dx);
    const ms = Math.round(Math.max(200, Math.min(420, flick ? remaining / Math.abs(v) * 1.6 : 420)));
    go(d.dx < 0 ? 1 : -1, { ms, t0: performance.now() });
  } else {
    animate(true, 300); placeAll(0); settle(300);
    for (const s of slides.values()) if (s.offset) pause(s);
    // a toy that was peeked at and sent back starts over next time, not from where the peek left it
    setTimeout(() => {
      for (const s of slides.values()) if (s.peeked && s.offset && !s.playing && !drag?.active) restart(s);
    }, 320);
  }
}
feed.addEventListener('pointerup', e => endDrag(e, false));
feed.addEventListener('pointercancel', e => endDrag(e, true));
// a drag that started on the caption or the play button doesn't also click it
let suppressClickUntil = 0;
addEventListener('click', e => { if (performance.now() < suppressClickUntil) { e.stopPropagation(); e.preventDefault(); } }, true);

let wheelAcc = 0, wheelLock = false, wheelTimer = 0;
addEventListener('wheel', e => {
  if (dialogOpen()) return;
  e.preventDefault();
  const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 16 : 1);
  clearTimeout(wheelTimer);
  // one move per gesture: a trackpad's inertia keeps sending events, so wait for a quiet gap before the next
  wheelTimer = setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 160);
  if (wheelLock) return;
  wheelAcc += d;
  if (Math.abs(wheelAcc) > 40) { wheelLock = true; go(Math.sign(wheelAcc)); wheelAcc = 0; }
}, { passive: false });

addEventListener('keydown', e => {
  if (dialogOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(1); }
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
  else if (e.key === 'g') openOverview();
});
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
    <div class="row"><a class="btn primary" href="${esc(pageHref(t))}">Play with this <span aria-hidden="true">→</span></a></div>
    ${motion ? `<section><span class="label">Motion</span>
      <p class="stub">${forced ? 'Labs play full motion even though your system asks for reduced motion.' : 'Your system asks for reduced motion, so the labs hold still.'}</p>
      <div class="row"><button type="button" class="btn" id="motion-toggle">${forced ? 'Reduce motion again' : 'Play motion anyway'}</button></div></section>` : ''}
    <section>
      <span class="label">Process</span>
      ${t.versions.length
        ? `<p class="stub">Old versions, from before each decisive change (they run on today’s shared code, so some may look a little off).</p>
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
scheduleNeighbours();
