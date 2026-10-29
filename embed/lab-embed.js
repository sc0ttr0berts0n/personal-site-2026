// Feed embed hooks for a lab page. The sync script adds this as a classic <script> before the lab's modules.
// Without ?embed in the URL it does nothing, so every lab still works standalone.
//
//   lab.html?embed=1              stage only, full frame, playing
//   lab.html?embed=1&paused=1     stage only, frozen; draws &warm=N frames first (default 6) so it isn't blank
//
// The feed drives it by postMessage ({ feed: 'play' | 'pause' | 'snap' | 'grab' }) and hears back
// { feed: 'ready' | 'playing' | 'live' | 'frozen' | 'stats' | 'snap' | 'grab' | 'touched' | 'wheel' | 'key' }.
// 'grab' is the fast snapshot for the feed's GL transitions: an ImageBitmap of the stage (no encode), transferred.
// 'ready' is the first drawn frame; 'live' is the first frame drawn after a 'play'.
//
// In the feed the middle of the screen belongs to the toy: pointers reach the lab directly, and the feed keeps
// the edges for moving between toys. A lab can say what it does with a finger there by setting, before its first
// frame:  window.labFeed = { touch: 'tap' | 'hold' | 'drag' | 'none', hint: 'drag to tilt' }
// which 'ready' carries to the feed ('none' hands the whole screen back to swiping). 'touched' is the first
// press on the toy each time it plays; 'wheel' and the feed's navigation keys are passed up, since they land here once it has focus.
//
// Pausing works on any lab without touching its code: requestAnimationFrame callbacks are parked while
// paused and released on play, and document.hidden reads true, so labs that pause on visibilitychange
// (Neural's training worker) stop too. lab.loop already clamps the step after a long gap.
// A frame only counts as drawn once window.labWarming is falsy (Goop and Vessel set it while their shaders compile).
(() => {
  const q = new URLSearchParams(location.search);
  if (!q.has('embed') || window.parent === window) return;

  // The feed decides when a toy runs (play/pause, below), so a lab's own check for being on screen (lab.loop's
  // IntersectionObserver) only gets in the way: a neighbour waits off screen, and on iOS that reads as not
  // intersecting, so it never drew its warm-up frames and a swipe landed on a toy that had yet to start.
  if (window.IntersectionObserver) {
    const IO = window.IntersectionObserver;
    window.IntersectionObserver = class extends IO {
      constructor(cb, opts) {
        super((entries, o) => cb(entries.map(e => ({ target: e.target, time: e.time, rootBounds: e.rootBounds,
          boundingClientRect: e.boundingClientRect, intersectionRect: e.boundingClientRect, isIntersecting: true, intersectionRatio: 1 })), o), opts);
      }
    };
  }

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
    html.lab-embed .lab-stage { width: 100%; height: 100%; aspect-ratio: auto; max-height: none; border: 0; }
    /* a finger on the toy is the toy's: no panning, no text selection or long-press callout */
    html.lab-embed .lab-stage, html.lab-embed .lab-stage * { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }`;
  document.head.appendChild(css);

  const post = (msg, transfer) => parent.postMessage({ ...msg, slug: location.pathname.split('/').pop().replace(/\.html$/, '') }, location.origin, transfer);

  let playing = !q.has('paused'), touched = false;
  let warm = playing ? 0 : Math.max(1, +q.get('warm') || 6);
  const running = () => playing || warm > 0;

  // ---- requestAnimationFrame gate ----
  const rawRAF = window.requestAnimationFrame.bind(window);
  let seq = 0;
  const pending = new Set(), cancelled = new Set(), parked = new Map();
  let frameCbMs = 0, drew = false, snapWidth = 0, grabs = [];
  const run = (cb, ts) => {
    const t0 = performance.now();
    try { cb(ts); } finally {
      frameCbMs += performance.now() - t0;
      // a lab that compiles its shaders in the background sets window.labWarming until it can draw
      if (!window.labWarming) drew = true;
      // read the canvases in the same frame they were drawn, so WebGL buffers are still valid
      if (snapWidth && drew) { const w = snapWidth; snapWidth = 0; post({ feed: 'snap', url: snapshot(w) }); }
      if (grabs.length && drew) sendGrabs();
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
    if (v) { warm = 0; liveWanted = true; touched = false; release(); post({ feed: 'playing' }); }
    else {
      // a grab or snap asked for just before the pause still gets its frame
      if (grabs.length || snapWidth) { warm = Math.max(warm, 1); release(); }
      post({ feed: 'frozen' });
    }
    visibility();
  }

  // ---- frame meter: frames counted only while running; stats once a second while playing ----
  let frames = 0, last = 0, gaps = 0, worst = 0, statT = performance.now(), firstSent = false, liveWanted = false;
  const meter = now => {
    rawRAF(meter);
    // a lab that only draws on input never runs a frame for a grab: answer from the meter after a few frames
    // (its WebGL canvas may read blank by then)
    if (grabs.length && ++grabWait > 3) sendGrabs();
    if (!drew) { last = now; return; }
    drew = false;
    if (!firstSent) { firstSent = true; const f = window.labFeed || {}; post({ feed: 'ready', touch: f.touch, hint: f.hint }); }
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
    const c = compose(document.createElement('canvas'), w);
    if (!c) return null;
    try { return c.toDataURL('image/jpeg', 0.82); } catch (e) { return null; }
  }
  // grab: the same picture as an ImageBitmap, drawn on one reused offscreen canvas and handed over without copying
  let grabCanvas = null, grabWait = 0;
  function sendGrabs() {
    const list = grabs; grabs = []; grabWait = 0;
    for (const { id, w } of list) {
      let bitmap = null;
      try {
        grabCanvas ||= typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1) : null;
        if (grabCanvas && compose(grabCanvas, w)) bitmap = grabCanvas.transferToImageBitmap();
      } catch (e) { bitmap = null; }
      post({ feed: 'grab', id, bitmap }, bitmap ? [bitmap] : []);
    }
  }
  // draws the stage onto canvas c at width w; returns c, or null if there's no stage to draw
  function compose(c, w) {
    const stage = document.querySelector('.lab-stage');
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const s = w / r.width, h = Math.round(r.height * s);
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
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
    return c;
  }

  // ---- input the feed needs back ----
  addEventListener('pointerdown', () => { if (!touched) { touched = true; post({ feed: 'touched' }); } }, true);
  // 'active': someone is using the toy (the feed holds off starting neighbours meanwhile); a few a second at most
  let activeAt = 0;
  const active = e => { if ((e.type === 'pointerdown' || e.buttons || e.pointerType === 'touch') && e.timeStamp - activeAt > 300) { activeAt = e.timeStamp; post({ feed: 'active' }); } };
  addEventListener('pointerdown', active, true);
  addEventListener('pointermove', active, true);
  addEventListener('wheel', e => { e.preventDefault(); post({ feed: 'wheel', dx: e.deltaX, dy: e.deltaY, mode: e.deltaMode }); }, { passive: false });
  const NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'g'];
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || !NAV_KEYS.includes(e.key)) return;
    if (e.target.closest?.('input, select, textarea')) return;
    e.preventDefault();
    post({ feed: 'key', key: e.key });
  });

  addEventListener('message', e => {
    if (e.source !== parent || !e.data || typeof e.data.feed !== 'string') return;
    const m = e.data;
    if (m.feed === 'play') setPlaying(true);
    else if (m.feed === 'pause') setPlaying(false);
    else if (m.feed === 'snap') {
      snapWidth = Math.max(64, Math.min(1024, m.width || 480));
      // a frozen lab won't draw again, so take one frame to snap it
      if (!running()) { warm = 1; release(); }
    } else if (m.feed === 'grab') {
      grabs.push({ id: m.id, w: Math.max(64, Math.min(2048, m.width || 720)) });
      if (!running()) { warm = 1; release(); }
    }
  });
})();
