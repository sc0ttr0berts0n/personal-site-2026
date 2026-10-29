// ?trace: a record of a run-through on a real device, for finding where the feed stalls. Watches from outside
// (no hooks in feed.js beyond loading this file):
//   stall    the page's main thread missed frames for 100 ms or more (it's shared by the feed and every toy)
//   mount / unmount / ready / live / touched    a toy's frame being made or dropped, its first frame, its first
//            frame after a play, its first touch (the embed's messages)
//   move     the toy on screen changed (#slug)
//   finger   a touch began or ended, on the feed (edge, caption) or in the toy on screen
//   late     a touch reached the toy 100 ms or more after it happened (the worst in each run of them)
//   spinner  the loading spinner over the toy on screen came or went
//   hidden / shown   the page went to the background and back
// A Send button posts it all to the dev server (scripts/serve.mjs saves it in traces/), and keeps a copy in
// localStorage so a page that reloads doesn't lose it. Where there's no dev server (a deploy, over HTTPS) it hands
// the trace to the share sheet as a file (or copies it, or downloads it) instead.
// bench: how fast this page runs plain JS, three rounds of the same loop a second in: a phone with its JIT off
// (seen over a LAN dev server) runs it 10-70x slower, which makes every other number here look worse.
const T0 = performance.now(), events = [];
const now = () => Math.round(performance.now() - T0);
const log = (type, data) => {
  const e = [now(), type, ...(data === undefined ? [] : [data])], p = events.at(-1);
  if (p && p[1] === type && e[0] - p[0] < 30 && JSON.stringify(p[2]) === JSON.stringify(e[2])) return;   // one thing seen twice
  events.push(e);
  if (events.length % 25 === 0) keep();
};
const slugs = new WeakMap();   // frame -> the toy it held, for its unmount
const slugOf = src => (src || '').replace(/.*labs\/|\.html.*/g, '') || 'blank';
const keep = () => { try { localStorage.setItem('feed-trace', JSON.stringify(report())); } catch (e) {} };

// main-thread stalls, from the gaps between animation frames
let last = 0;
requestAnimationFrame(function tick(t) {
  if (last && t - last >= 100 && !document.hidden) log('stall', Math.round(t - last));
  last = t;
  requestAnimationFrame(tick);
});
document.addEventListener('visibilitychange', () => { last = 0; log(document.hidden ? 'hidden' : 'shown'); });

// the toy on screen
let hash = location.hash;
log('move', hash.slice(1) || '(start)');
setInterval(() => { if (location.hash !== hash) { hash = location.hash; log('move', hash.slice(1)); } }, 50);

// the toys' own messages
addEventListener('message', e => {
  const m = e.data;
  if (e.origin !== location.origin || !m || typeof m.feed !== 'string') return;
  if (!['ready', 'live', 'touched', 'frozen', 'playing'].includes(m.feed)) return;
  const f = [...document.querySelectorAll('.slide iframe')].find(f => f.contentWindow === e.source);
  log(m.feed, slugOf(f?.src));
});

// frames made and dropped, and touch in the toys
function watchFrame(f) {
  slugs.set(f, slugOf(f.src));
  log('mount', slugOf(f.src));
  f.addEventListener('load', () => {
    const w = f.contentWindow, slug = slugOf(f.src);
    if (!w || slug === 'blank') return;
    let worst = 0, worstAt = 0;
    const flush = () => { if (worst) { log('late', { toy: slug, ms: worst, at: worstAt }); worst = 0; } };
    try {
      w.addEventListener('pointerdown', () => log('finger', { down: slug }), true);
      w.addEventListener('pointerup', () => { flush(); log('finger', { up: slug }); }, true);
      w.addEventListener('pointermove', e => {
        const lag = Math.round(w.performance.now() - e.timeStamp);
        if (lag >= 100) { if (lag > worst) { worst = lag; worstAt = now(); } } else flush();
      }, true);
    } catch (e) {}
  });
}
new MutationObserver(ms => {
  for (const m of ms) {
    if (m.type === 'attributes' && m.target.tagName === 'IFRAME') { if (!m.target.src.endsWith('about:blank')) { slugs.set(m.target, slugOf(m.target.src)); log('mount', slugOf(m.target.src)); } continue; }
    if (m.type === 'attributes' && m.target.classList?.contains('slide')) {
      const was = (m.oldValue || '').includes('waiting'), is = m.target.classList.contains('waiting');
      if (was !== is) log('spinner', { [is ? 'on' : 'off']: (m.target.getAttribute('aria-label') || '').split(' ').slice(1).join(' ') });
      continue;
    }
    for (const n of m.addedNodes) {
      if (n.tagName === 'IFRAME') watchFrame(n);
      else n.querySelectorAll?.('iframe').forEach(watchFrame);
    }
    for (const n of m.removedNodes) { const f = n.querySelector?.('iframe'); if (f) log('unmount', slugs.get(f) || slugOf(f.src)); }
  }
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'class'], attributeOldValue: true });
document.querySelectorAll('.slide iframe').forEach(watchFrame);

// touches the feed gets (edge zones, caption, chrome)
addEventListener('pointerdown', e => log('finger', { down: e.target.closest('.edge, .caption, .nav, button, a')?.className.split(' ')[0] || 'feed' }), true);
addEventListener('pointerup', () => log('finger', { up: 'feed' }), true);

const bench = [];
setTimeout(() => {
  for (let r = 0; r < 3; r++) {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 3e6; i++) x = (x + i * 31) % 1000003;
    bench.push(Math.round(performance.now() - t) + (x < 0 ? 1 : 0));
  }
  log('bench', bench);
}, 1000);

function report() {
  return {
    at: new Date().toISOString(), ua: navigator.userAgent, origin: location.origin, screen: [innerWidth, innerHeight, devicePixelRatio],
    bench, ms: now(), metrics: window.feedMetrics, events
  };
}
// no dev server to post to: the share sheet (a file), else the clipboard, else a download
async function handOver(body) {
  const name = `trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const file = new File([body], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return 'shared ✓ ' + name; }
    catch (e) { if (e.name === 'AbortError') return 'not sent (share cancelled)'; }
  }
  try { await navigator.clipboard.writeText(body); return 'copied ✓ (paste it to Claude)'; } catch (e) {}
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: name });
  a.click();
  return 'downloaded ✓ ' + name;
}

// the Send button
const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;z-index:99;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));display:flex;gap:6px;align-items:center;font:11px/1 ui-monospace,monospace;color:#f4f4f6';
bar.innerHTML = '<button type="button" style="font:inherit;color:inherit;background:#000c;border:1px solid #f4f4f655;border-radius:999px;padding:8px 12px">send trace</button><span style="background:#000c;padding:6px 8px;border-radius:6px"></span>';
document.body.appendChild(bar);
const [btn, note] = bar.children;
setInterval(() => { if (!note.dataset.hold) note.textContent = `${Math.round(now() / 1000)} s · ${events.filter(e => e[1] === 'stall').length} stalls`; }, 1000);
btn.addEventListener('click', async e => {
  e.stopPropagation();
  const body = JSON.stringify(report());
  keep();
  note.dataset.hold = 1; note.textContent = 'sending…';
  try {
    const r = await fetch('__trace', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    if (!r.ok) throw new Error(r.status);
    note.textContent = `sent ✓ ${(await r.json()).file}`;
  } catch (err) {
    try { note.textContent = await handOver(body); } catch (err2) { note.textContent = 'failed: ' + err2.message; }
  }
  setTimeout(() => delete note.dataset.hold, 4000);
});
btn.addEventListener('pointerdown', e => e.stopPropagation());
