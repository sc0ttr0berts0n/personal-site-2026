// Feed embed hooks for a lab page. The sync script adds this as a classic <script> before the lab's modules.
// Without ?embed in the URL it does nothing, so every lab still works standalone.
//
//   lab.html?embed=1              stage only, full frame, playing
//   lab.html?embed=1&paused=1     stage only, frozen; draws &warm=N frames first (default 6) so it isn't blank
//
// The feed drives it by postMessage ({ feed: 'play' | 'pause' | 'snap' }) and hears back
// { feed: 'ready' | 'playing' | 'live' | 'frozen' | 'stats' | 'snap' }.
// 'ready' is the first drawn frame; 'live' is the first frame drawn after a 'play'.
//
// Pausing works on any lab without touching its code: requestAnimationFrame callbacks are parked while
// paused and released on play, and document.hidden reads true, so labs that pause on visibilitychange
// (Neural's training worker) stop too. lab.loop already clamps the step after a long gap.
(() => {
  const q = new URLSearchParams(location.search);
  if (!q.has('embed') || window.parent === window) return;

  const root = document.documentElement;
  root.classList.add('lab-embed');
  const css = document.createElement('style');
  css.textContent = `
    html.lab-embed, html.lab-embed body { height: 100%; overflow: hidden; }
    html.lab-embed body { padding: 0; display: block; }
    html.lab-embed .lab-top, html.lab-embed .lab-panel, html.lab-embed .lab-hint, html.lab-embed .lab-hud { display: none !important; }
    /* controls a lab puts on its stage (Sand's element picker) belong to its own page, not the feed */
    html.lab-embed .lab-stage > :is(button, input, select, :has(button, input, select)) { display: none !important; }
    html.lab-embed .lab { display: block; height: 100%; }
    html.lab-embed .lab-stage { width: 100%; height: 100%; aspect-ratio: auto; max-height: none; border: 0; }`;
  document.head.appendChild(css);

  const post = msg => parent.postMessage({ ...msg, slug: location.pathname.split('/').pop().replace(/\.html$/, '') }, location.origin);

  let playing = !q.has('paused');
  let warm = playing ? 0 : Math.max(1, +q.get('warm') || 6);
  const running = () => playing || warm > 0;

  // ---- requestAnimationFrame gate ----
  const rawRAF = window.requestAnimationFrame.bind(window);
  let seq = 0;
  const pending = new Set(), cancelled = new Set(), parked = new Map();
  let frameCbMs = 0, drew = false, snapWidth = 0;
  const run = (cb, ts) => {
    const t0 = performance.now();
    try { cb(ts); } finally {
      frameCbMs += performance.now() - t0;
      drew = true;
      // read the canvases in the same frame they were drawn, so WebGL buffers are still valid
      if (snapWidth) { const w = snapWidth; snapWidth = 0; post({ feed: 'snap', url: snapshot(w) }); }
    }
  };
  window.requestAnimationFrame = cb => {
    const id = ++seq;
    pending.add(id);
    rawRAF(ts => {
      pending.delete(id);
      if (cancelled.delete(id)) return;
      if (running()) run(cb, ts); else parked.set(id, cb);
    });
    return id;
  };
  window.cancelAnimationFrame = id => { if (!parked.delete(id) && pending.has(id)) cancelled.add(id); };
  const release = () => { const cbs = [...parked.values()]; parked.clear(); cbs.forEach(cb => window.requestAnimationFrame(cb)); };

  // ---- document.hidden follows pause ----
  const desc = k => Object.getOwnPropertyDescriptor(Document.prototype, k);
  const realHidden = desc('hidden').get, realState = desc('visibilityState').get;
  Object.defineProperty(document, 'hidden', { configurable: true, get() { return realHidden.call(this) || !running(); } });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get() { return running() ? realState.call(this) : 'hidden'; } });
  const visibility = () => document.dispatchEvent(new Event('visibilitychange'));

  function setPlaying(v) {
    if (v === playing) return;
    playing = v;
    if (v) { warm = 0; liveWanted = true; release(); post({ feed: 'playing' }); }
    else post({ feed: 'frozen' });
    visibility();
  }

  // ---- frame meter: frames counted only while running; stats once a second while playing ----
  let frames = 0, last = 0, gaps = 0, worst = 0, statT = performance.now(), firstSent = false, liveWanted = false;
  const meter = now => {
    rawRAF(meter);
    if (!drew) { last = now; return; }
    drew = false;
    if (!firstSent) { firstSent = true; post({ feed: 'ready' }); }
    if (liveWanted && playing) { liveWanted = false; post({ feed: 'live' }); }
    if (last) { const g = now - last; gaps += g; worst = Math.max(worst, g); }
    last = now; frames++;
    if (warm > 0 && --warm === 0 && !playing) { post({ feed: 'frozen' }); visibility(); }
    if (playing && now - statT > 1000) {
      post({ feed: 'stats', fps: frames * 1000 / (now - statT), cbMs: frameCbMs / frames, worstMs: worst });
      frames = 0; gaps = 0; worst = 0; frameCbMs = 0; statT = now;
    }
    if (!playing) { frames = 0; frameCbMs = 0; statT = now; worst = 0; }
  };
  rawRAF(meter);

  // ---- snapshot: every canvas on the stage, over the bench grid, as a small JPEG ----
  function snapshot(w) {
    const stage = document.querySelector('.lab-stage');
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const s = w / r.width, h = Math.round(r.height * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const cs = getComputedStyle(root);
    g.fillStyle = cs.getPropertyValue('--bg') || '#000'; g.fillRect(0, 0, w, h);
    if (!stage.classList.contains('no-grid')) {
      const gs = (parseFloat(cs.getPropertyValue('--grid-size')) || 16) * s;
      g.fillStyle = cs.getPropertyValue('--grid') || '#1c1c22';
      for (let x = ((w / 2) % gs); x < w; x += gs) g.fillRect(Math.round(x), 0, 1, h);
      for (let y = ((h / 2) % gs); y < h; y += gs) g.fillRect(0, Math.round(y), w, 1);
    }
    for (const cv of stage.querySelectorAll('canvas')) {
      const st = getComputedStyle(cv);
      if (st.display === 'none' || st.visibility === 'hidden' || !cv.width) continue;
      const b = cv.getBoundingClientRect();
      g.globalAlpha = +st.opacity;
      try { g.drawImage(cv, (b.left - r.left) * s, (b.top - r.top) * s, b.width * s, b.height * s); } catch (e) {}
    }
    g.globalAlpha = 1;
    try { return c.toDataURL('image/jpeg', 0.82); } catch (e) { return null; }
  }

  addEventListener('message', e => {
    if (e.source !== parent || !e.data || typeof e.data.feed !== 'string') return;
    const m = e.data;
    if (m.feed === 'play') setPlaying(true);
    else if (m.feed === 'pause') setPlaying(false);
    else if (m.feed === 'snap') {
      snapWidth = Math.max(64, Math.min(1024, m.width || 480));
      // a frozen lab won't draw again, so take one frame to snap it
      if (!running()) { warm = 1; release(); }
    }
  });
})();
