// Site hooks for a lab's own page, the "Change This" landing. The sync script adds this before the lab's modules.
// In the feed (?embed) it does nothing; lab-embed.js handles that.
//
// On a phone the toy stays put behind everything, framed in the part of the screen above the peek, and the
// controls scroll up over it, peeking at the bottom (lab number and title) until pulled up. Pulled up, a bar at
// the bottom shows the toy while you hold it, and the lock beside it keeps the toy showing until tapped again;
// pressing a palette peeks at the toy too. Sliders are big tracks you drag anywhere on, relative to where you
// started; once one moves it flies up into the header, clear of the toy, and keeps scrubbing until you let go.
// The header's name links back to the feed, on this toy.
//
// The panel has two tabs for its two concerns: Change This (palette, sliders, settings) and How it got here (the
// process story). ?story in the URL opens the second; the #part is already the settings code. There the panel rises
// to just under the toy, which shrinks to its key square above it (the real stage, scaled, as for picture in picture).
// The toy pauses once the story has scrolled over it, or while an old version plays; on a wide screen an old version
// opens over the toy, in its place.
(() => {
  if (new URLSearchParams(location.search).has('embed')) return;
  const SCRIPT = document.currentScript?.src || location.href;   // for the generated manifest next to the labs
  const root = document.documentElement;
  root.classList.add('lab-page');
  const PHONE = '(max-width: 899px)';   // lab.css's own breakpoint for the stacked layout
  const EASE = 'cubic-bezier(.22, .8, .24, 1)';
  const FLY_MS = 280;
  const PIP_MS = 320, PIP_M = 10, PIP_R = 10;   // picture in picture: grow/shrink time, margin, corner radius
  const READ_AT = .46;   // reading on a phone: how far down the screen the panel first rises to

  // ---- the first shell (npm run sync adds it, see scripts/sync-labs.mjs) gives way to the real page ----
  // The still moves into the real stage and stays over the toy until the toy has drawn.
  // The story is written into the shell, so it reads from the start: the tabs already switch, and a tile tapped before
  // the page is up plays once it is. The text moves across as it stands, at the place the reader has got to.
  if (new URLSearchParams(location.search).has('story')) { root.classList.add('story'); history.scrollRestoration = 'manual'; }
  let poster = null, bootStory = null, bootY = 0, bootTap = null, bootDead = false;
  const untap = () => { if (bootTap?.classList.contains('ver-tile')) bootTap.querySelector('.ver-go').textContent = 'Play ▸'; bootTap = null; };
  const onBootTap = e => {
    const tabBtn = e.target.closest('.lab-boot .lab-tab');
    if (tabBtn) {
      root.classList.toggle('story', tabBtn.classList.contains('boot-story'));
      scrollTo(0, 0);
      tabBtn.closest('.lab-panel').scrollTop = 0;
      return;
    }
    const tile = e.target.closest('.lab-boot :is(.ver-tile, .ver-now)');
    if (!tile) return;
    untap();
    if (bootDead) { if (tile.classList.contains('ver-tile')) tile.querySelector('.ver-go').textContent = 'Didn’t load'; return; }
    bootTap = tile;
    if (tile.classList.contains('ver-tile')) tile.querySelector('.ver-go').textContent = 'Loading…';
  };
  addEventListener('click', onBootTap);
  const bootSwap = new MutationObserver(() => {
    const boot = document.querySelector('.lab-boot'), real = document.querySelector('.lab-panel');
    if (!boot || !real || real.closest('.lab-boot')) return;
    bootSwap.disconnect();
    removeEventListener('click', onBootTap);
    poster = boot.querySelector('.lab-poster');
    bootStory = boot.querySelector('.lab-story');
    bootY = matchMedia(PHONE).matches ? scrollY : boot.querySelector('.lab-panel').scrollTop;
    if (poster) document.querySelector('.lab-stage').append(poster);
    boot.remove();
    buildPage();
  });
  bootSwap.observe(root, { childList: true, subtree: true });
  // the lab's code failing before it built its page: say so, rather than spin for ever
  const bootFailed = e => {
    if (e.type === 'error' && e.target !== window && e.target?.tagName !== 'SCRIPT') return;   // not a stray image
    const boot = document.querySelector('.lab-boot');
    if (!boot) return;
    bootSwap.disconnect();
    bootDead = true;
    untap();
    boot.querySelector('.lab-spin')?.remove();
    boot.querySelector('.lab-stage').insertAdjacentHTML('beforeend', '<p class="lab-fail">This lab didn’t load. <a href="">Try again</a></p>');
  };
  addEventListener('error', bootFailed, true);
  addEventListener('unhandledrejection', bootFailed);
  const posterGone = () => {
    if (!poster) return;
    const p = poster;
    poster = null;
    p.classList.add('gone');
    setTimeout(() => p.remove(), 300);
  };

  // ---- pausing the toy: frames are parked and document.hidden reads true, as in the feed (lab-embed.js) ----
  // This script runs before the lab's modules, so every frame the lab asks for comes through here.
  let frozen = false, versionOn = false;
  const rawRAF = requestAnimationFrame.bind(window), rawCancel = cancelAnimationFrame.bind(window);
  const parked = new Map();
  let parkId = 0;
  window.requestAnimationFrame = cb => {
    if (frozen) { parked.set(--parkId, cb); return parkId; }
    return rawRAF(ts => {
      if (frozen) { parked.set(--parkId, cb); return; }
      cb(ts);
      if (poster && !window.labWarming) posterGone();   // a lab compiling in the background sets labWarming until it can draw
    });
  };
  window.cancelAnimationFrame = id => { if (!parked.delete(id)) rawCancel(id); };
  const realHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get;
  const realState = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState').get;
  Object.defineProperty(document, 'hidden', { configurable: true, get() { return realHidden.call(this) || frozen; } });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get() { return frozen ? 'hidden' : realState.call(this); } });
  const setFrozen = v => {
    if (v === frozen) return;
    frozen = v;
    if (!v) { const cbs = [...parked.values()]; parked.clear(); cbs.forEach(cb => requestAnimationFrame(cb)); }
    document.dispatchEvent(new Event('visibilitychange'));
  };

  const css = document.createElement('style');
  css.textContent = `
    html.lab-page { --line: #5c5c66; --top-h: 43px; --peek: 168px; }   /* 3:1 on black, the minimum for borders (the feed uses the same); the sizes are the usual ones, until measured */
    html.lab-page, .lab-page .lab-panel { overflow-anchor: none; }   /* the story moving into the real page would otherwise drag the scroll with it */

    /* before the lab's code arrives: the shell's own page, its toy still a still, its controls not yet there */
    .lab-page .lab-boot { display: contents; }
    .lab-page .lab-boot * { pointer-events: none; scroll-snap-align: none !important; }   /* too short to snap: it would pull the panel up */
    .lab-page .lab-boot :is(.lab-panel, .lab-tab, .who, .who *, .lab-pane-story, .lab-pane-story *) { pointer-events: auto; }
    .lab-page .lab-boot .blurb { margin: 0; color: var(--dim); }
    .lab-page .lab-boot .lab-pane-story, .lab-page.story .lab-boot .blurb { display: none; }
    .lab-page.story .lab-boot .lab-pane-story { display: grid; }
    .lab-page .lab-boot .boot-change { color: var(--ink); border-bottom-color: var(--ink); }
    .lab-page.story .lab-boot .boot-change { color: var(--dim); border-bottom-color: transparent; }
    .lab-page.story .lab-boot .boot-story { color: var(--ink); border-bottom-color: var(--ink); }
    .lab-page .lab-tab { display: inline-flex; align-items: center; }
    .lab-page .lab-poster { position: absolute; inset: 0; z-index: 1; pointer-events: none; transition: opacity .25s; }
    .lab-page .lab-poster.gone { opacity: 0; }
    .lab-page .lab-poster img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .lab-page .lab-spin { position: absolute; right: 12px; bottom: 12px; width: 16px; height: 16px; border: 2px solid rgb(255 255 255 / .25); border-top-color: var(--ink); border-radius: 50%;
      animation: ver-spin .8s linear infinite; }   /* turns on the compositor, so it keeps going while the toy starts up */
    .lab-page .lab-fail { position: absolute; left: 12px; right: 44px; bottom: 10px; margin: 0; z-index: 2; pointer-events: auto; font: 400 12px/1.4 var(--mono); }
    .lab-page .lab-fail a { pointer-events: auto; }
    /* the toy takes the finger: a press or a drag on it never selects anything or brings up the callout (the feed does the same) */
    .lab-page .lab-stage, .lab-page .lab-stage * { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
    .lab-page .lab-back { text-decoration: none; }
    .lab-page .lab-back:hover { color: var(--ink); }
    .lab-page .lab-back .arr { color: var(--dim); margin-right: -2px; }
    .lab-page .lab-peek, .lab-page .lab-holdbar, .lab-page .lab-pip, .lab-page .lab-scrub { display: none; }

    /* two tabs, for the panel's two concerns; the bar stays put while its tab scrolls */
    .lab-page .lab-tabs { position: sticky; top: -20px; z-index: 2; display: flex; gap: 20px; margin-top: -20px; background: var(--panel); border-bottom: 1px solid var(--line); }
    .lab-page .lab-tab { height: 44px; padding: 0; margin-bottom: -1px; border: 0; border-bottom: 1px solid transparent; background: none; color: var(--dim); cursor: pointer;
      font: 400 11px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; -webkit-tap-highlight-color: transparent; }
    .lab-page .lab-tab:hover { color: var(--ink); }
    .lab-page .lab-tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--ink); }
    .lab-page .lab-pane { display: grid; gap: inherit; min-width: 0; align-content: start; }
    .lab-page .lab-pane[hidden] { display: none; }

    /* the feed's grid button and overview, so one lab can jump straight to another (styles follow site/feed.css) */
    .lab-page .lab-meta { display: flex; align-items: center; gap: 10px; }
    .lab-page .lab-gridbtn { display: grid; place-items: center; width: 32px; height: 32px; margin: -9px -8px -9px 0; padding: 0; border: 0; border-radius: 2px;
      background: none; color: var(--ink); cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .lab-page .lab-gridbtn:hover { background: rgb(255 255 255 / .08); }
    .lab-page .lab-ov { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
      background: var(--bg); color: var(--ink); overflow: auto; overscroll-behavior: contain; opacity: 0; transition: opacity .2s; }
    .lab-page .lab-ov.open { opacity: 1; }
    .lab-page .lab-ov::backdrop { background: var(--bg); }
    .lab-page .lab-ov .ov-head { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; align-items: center;
      padding: max(12px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) 12px max(16px, env(safe-area-inset-left, 0px));
      background: var(--bg); border-bottom: 1px solid var(--line); }
    .lab-page .lab-ov h2 { margin: 0; font: 400 12px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; display: flex; gap: 10px; align-items: baseline; }
    .lab-page .lab-ov h2 .num { color: var(--dim); }
    .lab-page .lab-ov .tiles { list-style: none; margin: 0; padding: 12px max(16px, env(safe-area-inset-right, 0px)) 32px max(16px, env(safe-area-inset-left, 0px));
      display: grid; gap: 6px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    @media (min-width: 720px) { .lab-page .lab-ov .tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; } }
    @media (min-width: 1100px) { .lab-page .lab-ov .tiles { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    .lab-page .lab-ov .tile { position: relative; display: block; width: 100%; aspect-ratio: 4 / 5; border: 1px solid var(--line); border-radius: 2px; overflow: hidden;
      color: var(--ink); text-decoration: none; background-color: var(--bg); -webkit-tap-highlight-color: transparent;
      background-image: linear-gradient(to right, var(--grid) 1px, transparent 1px), linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
      background-size: 8px 8px; background-position: center; }
    .lab-page .lab-ov .tile:hover, .lab-page .lab-ov .tile[aria-current="page"] { border-color: var(--ink); }
    .lab-page .lab-ov .tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .lab-page .lab-ov .tile .mark { position: absolute; inset: 0; display: grid; place-items: center; color: var(--dim); }
    .lab-page .lab-ov .tile .lbl { position: absolute; left: 0; right: 0; bottom: 0; display: grid; gap: 4px; padding: 24px 8px 8px;
      background: linear-gradient(to top, rgb(0 0 0 / .85), transparent); font: 400 10px/1 var(--mono); letter-spacing: .12em; color: var(--dim); }
    .lab-page .lab-ov .tile .lbl b { font: 300 13px/1.15 var(--display); letter-spacing: 0; color: var(--ink); }
    .lab-page .lab-ov .x { display: grid; place-items: center; width: 32px; height: 32px; margin: -8px -8px -8px 0; padding: 0; border: 0; background: none; color: var(--ink); cursor: pointer; }
    @media (prefers-reduced-motion: reduce) { .lab-page .lab-ov { transition: none; } }
    @media ${PHONE} {
      html.lab-page { scroll-snap-type: y proximity; scroll-padding-top: var(--top-h, 41px); }
      .lab-page .lab-top { position: sticky; top: 0; z-index: 3; background: var(--bg);
        margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding-inline: max(16px, env(safe-area-inset-left, 0px)); }
      .lab-page .lab-top, .lab-page .lab-top > * { transition: opacity .2s; }
      /* the stage ends where the peek starts, so the toy is framed in what you can see */
      .lab-page .lab-stage { position: fixed; z-index: 0; left: 0; right: 0; top: var(--top-h, 41px);
        width: auto; height: calc(100svh - var(--top-h, 41px) - var(--peek, 120px)); aspect-ratio: auto; max-height: none; border: 0; }
      .lab-page .lab { scroll-snap-align: start; }
      .lab-page .lab-panel { position: relative; z-index: 2; scroll-snap-align: start; overflow: visible;
        margin: calc(100svh - var(--top-h, 41px) - var(--peek, 120px)) calc(-1 * max(16px, env(safe-area-inset-left, 0px))) 0;
        padding: 0 max(16px, env(safe-area-inset-left, 0px)) calc(96px + env(safe-area-inset-bottom, 0px)); gap: 20px;
        background: rgb(0 0 0 / .7); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
        border-top: 1px solid var(--line); border-radius: 10px 10px 0 0; transition: background-color .25s, border-color .25s, opacity .2s; }
      .lab-page .lab-peek { display: grid; place-items: center; height: 30px; margin-bottom: -14px; padding: 0; border: 0; background: none; cursor: pointer; }
      .lab-page .lab-peek::before { content: ""; width: 40px; height: 4px; border-radius: 2px; background: var(--line); }
      .lab-page .lab-tabs { top: var(--top-h, 41px); margin: 0 calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding: 0 max(16px, env(safe-area-inset-left, 0px));
        background: rgb(0 0 0 / .6); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }

      /* reading: the toy sits above the panel as its key square, not to be touched */
      html.lab-page.story { scroll-snap-type: none; }
      html.lab-page.story .lab-boot .lab-stage { height: calc(${READ_AT * 100}svh - var(--top-h)); }
      html.lab-page.story .lab-boot .lab-panel { margin-top: calc(${READ_AT * 100}svh - var(--top-h)); }
      html.lab-page.story .lab-boot .lab-poster img { object-fit: contain; }
      html.lab-page.story .lab-holdbar { display: none; }
      .lab-page .lab-pane-story { min-height: 100svh; }

      /* sliders: a big track, filled in ink from the left, its name and value inside (inverted where the fill passes) */
      .lab-page .ctl.track { position: relative; isolation: isolate; display: flex; align-items: center; height: 36px; padding: 0 14px;
        border: 1px solid var(--line); border-radius: 9px; background: rgb(255 255 255 / .06); overflow: hidden;
        touch-action: pan-y; cursor: ew-resize; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .lab-page .ctl.track::before { content: ""; position: absolute; inset: 0 auto 0 0; width: calc(var(--pct, 0) * 1%); background: var(--ink); }
      .lab-page .ctl.track .row { position: relative; flex: 1; min-width: 0; mix-blend-mode: difference; color: #f4f4f6; pointer-events: none; }
      .lab-page .ctl.track .row output { color: inherit; }
      .lab-page .ctl.track input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; pointer-events: none; }
      .lab-page .ctl.track:has(input:focus-visible) { outline: 1px solid var(--ink); outline-offset: 2px; }
      /* tuning: the slider flies into the header (8px all round) and everything else steps aside */
      .lab-page .ctl.track.docked { position: fixed; z-index: 6; margin: 0; background: rgb(0 0 0 / .55); border-color: var(--ink);
        transition: top ${FLY_MS}ms ${EASE}, left ${FLY_MS}ms ${EASE}, width ${FLY_MS}ms ${EASE}, height ${FLY_MS}ms ${EASE},
          border-radius ${FLY_MS}ms, padding ${FLY_MS}ms, font-size ${FLY_MS}ms; }
      .lab-page .ctl.track.in-top { border-radius: 6px; padding: 0 10px; }
      .lab-page .ctl.track.in-top .row { font-size: 11px; }
      .lab-page .lab-panel:has(.docked) { z-index: 4; }
      /* a tapped slider waits in the header: the next drag anywhere on screen scrubs it */
      html.lab-page.armed .lab-scrub { display: block; position: fixed; inset: 0; z-index: 7; cursor: ew-resize; touch-action: none;
        user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
      .lab-page .lab-panel > *, .lab-page .lab-pane > *, .lab-page .lab-group > *, .lab-page .ctls > * { transition: opacity .2s; }
      html.lab-page.tuning .lab-panel { background-color: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; border-color: transparent; }
      html.lab-page.tuning .lab-panel > :not(:has(.ctl.active)),
      html.lab-page.tuning .lab-pane > :not(:has(.ctl.active)),
      html.lab-page.tuning .lab-group:has(.ctl.active) > :not(.ctls),
      html.lab-page.tuning .ctls > :not(.active),
      html.lab-page.tuning .lab-top > * { opacity: 0; }

      /* hold to see the toy, with a lock beside it that keeps it showing */
      .lab-page .lab-holdbar { position: fixed; z-index: 5; display: flex; gap: 8px;
        left: max(16px, env(safe-area-inset-left, 0px)); right: max(16px, env(safe-area-inset-right, 0px)); bottom: calc(16px + env(safe-area-inset-bottom, 0px));
        opacity: 0; pointer-events: none; transition: opacity .2s; }
      html.lab-page:is(.opened, .locked):not(.tuning) .lab-holdbar { opacity: 1; pointer-events: auto; }
      .lab-page .lab-holdbar button { height: 48px; border: 1px solid var(--line); border-radius: 2px; background: rgb(0 0 0 / .6);
        -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); cursor: pointer; transition: opacity .2s, border-color .2s, background-color .2s; }
      .lab-page .lab-hold { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px;
        font: 400 12px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase;
        touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .lab-page .lab-lock { flex: none; display: grid; place-items: center; width: 48px; padding: 0; color: var(--dim); }
      html.lab-page.held .lab-hold { border-color: var(--ink); background-color: rgb(0 0 0 / .35); }
      html.lab-page.locked .lab-hold { opacity: 0; pointer-events: none; }
      html.lab-page.locked .lab-lock { border-color: var(--ink); background-color: var(--ink); color: var(--bg); }
      /* a palette is held down to peek at the toy, which iOS would read as a long press: select text, callout, tap flash */
      .lab-page .palettes, html.lab-page:is(.held, .tuning) body { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      .lab-page :is(.pal, .lab-pip, .ctl.track, .lab-peek, .lab-holdbar button) { -webkit-tap-highlight-color: transparent; }
      html.lab-page.held .lab-panel { opacity: 0; pointer-events: none; }
      html.lab-page.held .lab-top { opacity: .35; }

      /* picture in picture: with the controls up, the toy itself shrinks to its key square in the top right corner,
         over the controls. It is the real stage, scaled (so it never resizes or restarts), and grows back for tuning. */
      .lab-page .lab-stage { transform-origin: 0 0; clip-path: inset(0 0 round 0);
        transition: background-color .4s, transform ${PIP_MS}ms ${EASE}, clip-path ${PIP_MS}ms ${EASE}; }
      .lab-page .lab-stage > :is(.lab-hud, .lab-hint, .lab-square) { transition: opacity .2s; }
      html.lab-page.pip .lab-stage { z-index: 3; pointer-events: none;
        transform: translate(var(--pip-x), var(--pip-y)) scale(var(--pip-s));
        clip-path: inset(var(--pip-cy) var(--pip-cx) round var(--pip-r)); }
      html.lab-page.pip .lab-stage > :is(.lab-hud, .lab-hint, .lab-square) { opacity: 0; }
      html.lab-page.story.opened .lab-stage { pointer-events: none;
        transform: translate(var(--fit-x), var(--fit-y)) scale(var(--fit-s));
        clip-path: inset(var(--pip-cy) var(--pip-cx) round 0); }
      html.lab-page.story.opened .lab-stage > :is(.lab-hud, .lab-hint, .lab-square) { opacity: 0; }
      .lab-page .lab-pip { display: block; position: fixed; z-index: 3; padding: 0; background: none; cursor: pointer;
        top: var(--pip-top); right: ${PIP_M}px; width: var(--pip-size); height: var(--pip-size);
        border: 1px solid var(--line); border-radius: ${PIP_R}px; box-shadow: 0 8px 28px rgb(0 0 0 / .7);
        opacity: 0; pointer-events: none; transition: opacity .2s; }
      html.lab-page.pip .lab-pip { opacity: 1; pointer-events: auto; }
    }
    @media (prefers-reduced-motion: reduce) { .lab-page .lab-panel, .lab-page .lab-panel *, .lab-page .lab-holdbar *, .lab-page .lab-stage { transition: none !important; } }

    /* the lab's process story, with its saved versions as squares that play on tap */
    .lab-page .lab-story { display: grid; gap: 12px; }
    .lab-page .lab-story p { margin: 0; font-size: 14px; line-height: 1.6; text-wrap: pretty; }
    .lab-page .lab-story .open { color: var(--dim); font-size: 13px; }
    .lab-page .lab-story .open b { font: 500 10px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); margin-right: 6px; }
    .lab-page .lab-versions { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
    .lab-page .lab-versions li { position: relative; aspect-ratio: 1; }
    .lab-page .ver-tile, .lab-page .ver-now { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start;
      padding: 8px; border: 1px solid var(--line); border-radius: 2px; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent;
      overflow: hidden; isolation: isolate; background: var(--bg); color: var(--ink); transition: border-color .2s, background-color .2s; }
    /* a still of the version, blurred and darkened: a hint of what's in there, with the words legible over it */
    .lab-page .ver-thumb { position: absolute; z-index: -1; inset: -10%; width: 120%; height: 120%; max-width: none; object-fit: cover; filter: blur(5px) brightness(.42); transition: opacity .25s; }
    .lab-page .ver-tile:hover, .lab-page .ver-now:hover { border-color: var(--dim); }
    .lab-page .ver-n { font: 200 22px/1 var(--display); }
    .lab-page .ver-cap { font: 400 11px/1.3 var(--mono); color: var(--ink); text-wrap: balance; }
    .lab-page .ver-go { font: 400 10px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink); opacity: .75; }
    .lab-page .ver-now { border-color: var(--dim); }
    /* playing: the frame fills the square, under the tile, which turns clear and offers to break out */
    .lab-page .ver-play { position: absolute; inset: 0; display: block; margin: 0; padding: 0; width: auto; height: auto; overflow: hidden;
      border: 1px solid var(--ink); border-radius: 2px; background: var(--bg); color: var(--ink); }
    .lab-page .ver-play { isolation: isolate; }
    .lab-page .ver-play iframe { position: relative; display: block; width: 100%; height: 100%; border: 0; pointer-events: none; opacity: 0; transition: opacity .25s; }
    /* until its first frame: the still and a spinner, which turns on the compositor, so it keeps going while the version compiles */
    .lab-page .ver-spin { position: absolute; z-index: 1; top: 50%; left: 50%; width: 24px; height: 24px; margin: -12px; border: 2px solid rgb(255 255 255 / .25); border-top-color: var(--ink); border-radius: 50%;
      animation: ver-spin .8s linear infinite; transition: opacity .2s; pointer-events: none; }
    @keyframes ver-spin { to { transform: rotate(360deg); } }
    .lab-page .ver-play.ready iframe { opacity: 1; }
    .lab-page .ver-play.ready :is(.ver-thumb, .ver-spin) { opacity: 0; }
    .lab-page .ver-wait { display: none; }
    .lab-page .ver-play.slow:not(.ready):is(:popover-open, .over) .ver-wait { display: block; position: absolute; z-index: 1; top: calc(50% + 28px); left: 0; right: 0; text-align: center;
      font: 400 12px/1.2 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--ink); }
    .lab-page .ver-play:is(:popover-open, .over) .ver-thumb { filter: blur(24px) brightness(.42); }
    .lab-page .ver-bar { display: none; }
    .lab-page li.playing .ver-tile { background: linear-gradient(transparent 55%, rgb(0 0 0 / .75)); border-color: transparent; justify-content: flex-end; }
    .lab-page li.playing .ver-tile > .ver-thumb { display: none; }
    .lab-page li.playing .ver-tile .ver-n { display: none; }
    /* broken out: the same frame, over everything (the popover's top layer), and playable */
    .lab-page .ver-play:popover-open { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; border: 0; border-radius: 0; }
    .lab-page .ver-play:is(:popover-open, .over) iframe { pointer-events: auto; }
    /* on a wide screen: over the toy, in its place */
    .lab-page .ver-play.over { z-index: 5; border: 0; border-radius: 0; }
    .lab-page li.over-on .ver-tile { border-color: var(--ink); }
    .lab-page .ver-play:is(:popover-open, .over) .ver-bar { display: flex; position: absolute; z-index: 1; align-items: center; justify-content: space-between; gap: 12px;
      top: env(safe-area-inset-top, 0px); left: 0; right: 0; padding: 10px max(16px, env(safe-area-inset-left, 0px));
      font: 400 12px/1.2 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--dim); pointer-events: none; }
    .lab-page .ver-bar button { pointer-events: auto; padding: 9px 12px; border: 1px solid var(--line); border-radius: 2px; background: rgb(0 0 0 / .6);
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--ink); cursor: pointer; }
    .lab-page .ver-play::backdrop { background: var(--bg); }`;
  document.head.appendChild(css);

  const EYE = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  const lock = shut => `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="${shut ? 'M5 7V5a3 3 0 0 1 6 0v2' : 'M5 7V5a3 3 0 0 1 5.8-1'}" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;

  // runs as soon as the lab's module has built its shell. Not on DOMContentLoaded: the module waits for the first
  // paint (lab-first-paint.js), and a module that waits doesn't hold that event back.
  function buildPage() {
    const top = document.querySelector('.lab-top'), panel = document.querySelector('.lab-panel');
    if (!top || !panel) return;
    setTimeout(() => { if (!window.labWarming) posterGone(); }, 3000);   // a lab that only draws on input never runs a frame

    // back to the feed, landing on this toy (and its settings code, if the link carried one)
    const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
    const who = top.querySelector('.who');
    if (who) {
      const a = document.createElement('a');
      a.className = 'who lab-back';
      a.innerHTML = `<span class="arr" aria-hidden="true">←</span>${who.innerHTML}`;
      a.setAttribute('aria-label', 'Back to all labs');
      const href = () => '../#' + slug + (location.hash.length > 1 ? '/' + location.hash.slice(1) : '');
      a.href = href();
      a.addEventListener('pointerdown', () => { a.href = href(); });
      who.replaceWith(a);
    }

    // ---- the feed's grid button: every lab as a tile, and picking one opens its page ----
    const meta = top.lastElementChild;   // "lab 01"
    if (meta && meta !== top.firstElementChild) {
      const wrapM = document.createElement('span');
      wrapM.className = 'lab-meta';
      meta.replaceWith(wrapM);
      const gridBtn = document.createElement('button');
      gridBtn.type = 'button'; gridBtn.className = 'lab-gridbtn';
      gridBtn.setAttribute('aria-haspopup', 'dialog'); gridBtn.setAttribute('aria-label', 'All labs');
      gridBtn.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z" fill="none" stroke="currentColor"/></svg>';
      wrapM.append(meta, gridBtn);
      const mark = top.querySelector('svg')?.outerHTML.replace(/width="\d+"/, 'width="32"').replace(/height="\d+"/, 'height="32"') || '';
      const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
      let ov = null, closeT = 0;
      const close = () => {
        if (!ov?.open) return;
        ov.classList.remove('open');
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) ov.close(); else closeT = setTimeout(() => ov.close(), 200);
      };
      const build = async () => {
        // the feed's own list and order: the manifest npm run sync writes, sorted as site/config.js orders the feed
        const [{ LABS }, cfg] = await Promise.all([import(new URL('../labs/manifest.js', SCRIPT)), import(new URL('../site/config.js', SCRIPT)).catch(() => ({}))]);
        const order = cfg.ORDER || [], rank = l => { const i = order.indexOf(l.slug); return i < 0 ? 1000 + +l.number : i; };
        const labs = [...LABS].sort((a, b) => rank(a) - rank(b));
        ov = document.createElement('dialog');
        ov.className = 'lab-ov';
        ov.setAttribute('aria-labelledby', 'lab-ov-h');
        ov.innerHTML = `<div class="ov-head"><h2 id="lab-ov-h"><span class="num">experiments</span> <span>${labs.length} labs</span></h2>
          <button type="button" class="x" aria-label="Close"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.2"/></svg></button></div>
          <ul class="tiles">${labs.map(l => `<li><a class="tile" href="${new URL('../labs/' + l.slug + '.html', SCRIPT).href}"${l.slug === slug ? ' aria-current="page"' : ''}>
            <span class="mark">${mark}</span><img src="${new URL('../posters/' + l.slug + '.jpg', SCRIPT).href}" alt="" loading="lazy" decoding="async">
            <span class="lbl"><span>${esc(l.number)}</span><b>${esc(l.title)}</b></span></a></li>`).join('')}</ul>`;
        for (const img of ov.querySelectorAll('img')) img.addEventListener('error', () => img.remove());
        ov.querySelector('.x').addEventListener('click', close);
        // this lab's own tile just closes the grid; the rest are plain links to their pages
        ov.querySelector('[aria-current]')?.addEventListener('click', e => { e.preventDefault(); close(); });
        ov.addEventListener('cancel', e => { e.preventDefault(); close(); });
        document.body.append(ov);
      };
      // built while the page is idle, so the first tap opens it at once; if the list can't load, the feed's own grid is the way out
      let building = null;
      const ready = () => building ||= build();
      (window.requestIdleCallback || setTimeout)(() => ready().catch(() => {}), { timeout: 3000 });
      gridBtn.addEventListener('click', async () => {
        if (!ov) {
          gridBtn.style.opacity = '.4';
          try { await ready(); } catch (e) { location.href = new URL('../', SCRIPT).href; return; } finally { gridBtn.style.opacity = ''; }
        }
        clearTimeout(closeT);
        if (!ov.open) ov.showModal();
        ov.querySelector('[aria-current]')?.focus({ preventScroll: false });
        // no waiting on a frame to fade in: a paused toy holds frames back and a busy one delays them, and until
        // then the grid is see-through over a black backdrop
        ov.offsetWidth;
        ov.classList.add('open');
      });
    }

    // the peek: a handle that pulls the controls up over the toy, or puts them back down
    const peek = document.createElement('button');
    peek.type = 'button'; peek.className = 'lab-peek';
    peek.setAttribute('aria-label', 'Show or hide the controls');
    panel.prepend(peek);
    const phone = matchMedia(PHONE);
    const opened = () => scrollY > 8;
    peek.addEventListener('click', () => {
      const y = opened() ? 0 : tabHome(tab);
      scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });

    // ---- two tabs: the name stays above them, everything else moves into the tab it belongs to ----
    const head = panel.querySelector('.lab-group');
    const paneChange = document.createElement('div'), paneStory = document.createElement('div');
    paneChange.className = 'lab-pane'; paneStory.className = 'lab-pane lab-pane-story';
    const blurb = head.querySelector('.blurb'), teaches = panel.querySelector('.teaches');
    for (const el of [...panel.children]) if (el !== peek && el !== head) paneChange.append(el);
    if (blurb) paneChange.prepend(blurb);
    const tabList = document.createElement('div');
    tabList.className = 'lab-tabs'; tabList.setAttribute('role', 'tablist'); tabList.setAttribute('aria-label', 'This lab');
    const TABS = { change: { pane: paneChange, label: 'Change This' }, story: { pane: paneStory, label: 'How it got here' } };
    for (const [key, t] of Object.entries(TABS)) {
      t.btn = document.createElement('button');
      t.btn.type = 'button'; t.btn.className = 'lab-tab'; t.btn.id = 'lab-tab-' + key;
      t.btn.setAttribute('role', 'tab'); t.btn.setAttribute('aria-controls', 'lab-pane-' + key);
      t.btn.textContent = t.label;
      t.pane.id = 'lab-pane-' + key;
      t.pane.setAttribute('role', 'tabpanel'); t.pane.setAttribute('aria-labelledby', t.btn.id);
      tabList.append(t.btn);
    }
    peek.after(tabList);
    panel.append(paneChange, paneStory);

    // sizes the peek to show the lab number and title
    const measure = () => {
      root.style.setProperty('--top-h', top.offsetHeight + 'px');
      const h1 = panel.querySelector('h1');
      if (h1) root.style.setProperty('--peek', (h1.offsetTop + h1.offsetHeight + 18) + 'px');
    };
    measure();
    new ResizeObserver(measure).observe(panel);
    document.fonts?.ready.then(measure);

    // ---- hold to see the toy, and the lock ----
    const bar = document.createElement('div');
    bar.className = 'lab-holdbar';
    bar.innerHTML = `<button type="button" class="lab-hold">${EYE}<span>Hold to see the lab</span></button>
      <button type="button" class="lab-lock" aria-pressed="false" aria-label="Keep the lab showing">${lock(false)}</button>`;
    document.body.append(bar);
    const holdBtn = bar.querySelector('.lab-hold'), holdLbl = holdBtn.querySelector('span'), lockBtn = bar.querySelector('.lab-lock');
    // the bar shows once the controls are pulled up far enough to cover the toy
    const onScroll = () => {
      const y = panel.getBoundingClientRect().top;
      root.classList.toggle('opened', y < innerHeight / 2);
      // reading: paused once the panel is a third of the way up the toy above it. Controls keep it running, in the corner.
      const reading = root.classList.contains('story');
      const covered = phone.matches && y < innerHeight * READ_AT - (innerHeight * READ_AT - top.offsetHeight) / 3;
      setFrozen(reading && (covered || versionOn));
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();

    let locked = false;
    const hold = on => {
      if (locked) return;
      root.classList.toggle('held', on);
      holdLbl.textContent = on ? 'Let go for the controls' : 'Hold to see the lab';
    };
    // let go anywhere: the panel (and the button pressed) may have faded out from under the finger
    const release = () => { removeEventListener('pointerup', release); removeEventListener('pointercancel', release); hold(false); };
    const press = () => { getSelection()?.removeAllRanges(); hold(true); addEventListener('pointerup', release); addEventListener('pointercancel', release); };
    holdBtn.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
    holdBtn.addEventListener('contextmenu', e => e.preventDefault());
    holdBtn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); hold(true); } });
    holdBtn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') hold(false); });
    lockBtn.addEventListener('click', () => {
      locked = !locked;
      root.classList.toggle('locked', locked);
      root.classList.toggle('held', locked);
      lockBtn.setAttribute('aria-pressed', String(locked));
      lockBtn.setAttribute('aria-label', locked ? 'Back to the controls' : 'Keep the lab showing');
      lockBtn.innerHTML = lock(locked);
      holdLbl.textContent = 'Hold to see the lab';
    });

    // ---- picture in picture: the toy in the top right corner while the controls are up ----
    // It shows whenever the hold bar would, and gives way to the full toy while a slider is scrubbed or the toy is
    // held. A tap on it puts the controls back down.
    const stage = document.querySelector('.lab-stage');
    stage?.addEventListener('contextmenu', e => { if (phone.matches) e.preventDefault(); });   // a long press on the toy is the toy's
    const pip = document.createElement('button');
    pip.type = 'button'; pip.className = 'lab-pip';
    pip.setAttribute('aria-label', 'Put the controls down to see the lab');
    document.body.append(pip);
    pip.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
    // maps the stage's key square onto the corner box: offsetWidth/Height ignore the transform, so this never feeds back
    const pipFit = () => {
      if (!stage) return;
      const W = stage.offsetWidth, H = stage.offsetHeight, S = Math.min(W, H);
      if (!S) return;
      const P = Math.round(Math.min(156, root.clientWidth * 0.38)), s = P / S;
      const x0 = (W - S) / 2, y0 = (H - S) / 2, r = root.style;
      r.setProperty('--pip-size', P + 'px');
      const below = tabList.offsetHeight + 16;   // the tab bar, and the handle above it, stay clear
      r.setProperty('--pip-top', top.offsetHeight + below + PIP_M + 'px');
      r.setProperty('--pip-s', s);
      r.setProperty('--pip-x', (W - PIP_M - P - s * x0) + 'px');
      r.setProperty('--pip-y', (below + PIP_M - s * y0) + 'px');
      r.setProperty('--pip-cx', x0 + 'px'); r.setProperty('--pip-cy', y0 + 'px');
      r.setProperty('--pip-r', PIP_R / s + 'px');
      // reading: the key square, centered in what's left above the panel
      const R = innerHeight * READ_AT - top.offsetHeight, f = Math.min(1, R / S);
      r.setProperty('--fit-s', f);
      r.setProperty('--fit-x', W / 2 * (1 - f) + 'px');
      r.setProperty('--fit-y', (R - f * H) / 2 + 'px');
    };
    if (stage) new ResizeObserver(pipFit).observe(stage);
    addEventListener('resize', pipFit);
    pipFit();
    const pipSync = () => {
      const c = root.classList;
      c.toggle('pip', phone.matches && c.contains('opened') && !c.contains('tuning') && !c.contains('held') && !c.contains('story'));
    };
    new MutationObserver(pipSync).observe(root, { attributeFilter: ['class'] });
    phone.addEventListener('change', pipSync);
    pipSync();

    // a palette picks as soon as it's pressed, and the toy shows in it until you let go
    panel.querySelector('.palettes')?.addEventListener('contextmenu', e => { if (phone.matches) e.preventDefault(); });
    panel.querySelector('.palettes')?.addEventListener('pointerdown', e => {
      const b = e.target.closest('.pal');
      if (!b || !phone.matches) return;
      b.click();
      press();
    });

    // ---- sliders: big tracks, scrubbed relative to where the finger started ----
    for (const ctl of panel.querySelectorAll('.ctl')) {
      const inp = ctl.querySelector('input[type="range"]');
      if (!inp) continue;
      ctl.classList.add('track');
      const sync = () => ctl.style.setProperty('--pct', (inp.value - inp.min) / (inp.max - inp.min) * 100);
      sync();
      inp.addEventListener('input', sync);
      // reset and settings codes set the value without an input event; the readout changes either way
      const out = ctl.querySelector('output');
      if (out) new MutationObserver(sync).observe(out, { childList: true, characterData: true, subtree: true });
    }

    // fly a slider into the header, leaving a placeholder so the panel doesn't reflow, and back again
    const GEOM = ['top', 'left', 'width', 'height'];
    const place = (el, r) => GEOM.forEach(k => el.style.setProperty(k, r[k] + 'px'));
    let docked = null, undockT = 0;
    const dock = ctl => {
      clearTimeout(undockT);
      if (docked) finishUndock();
      const r = ctl.getBoundingClientRect();
      const ph = document.createElement('div');
      ph.style.height = r.height + 'px';
      ctl.before(ph);
      place(ctl, r);
      ctl.classList.add('docked');
      ctl.offsetWidth;   // start the flight from where it was
      const w = root.clientWidth, h = Math.max(24, top.offsetHeight - 17);
      place(ctl, { top: 8, left: 8, width: w - 16, height: h });
      ctl.classList.add('in-top');
      docked = { ctl, ph };
    };
    const finishUndock = () => {
      const { ctl, ph } = docked;
      ctl.classList.remove('docked', 'active');
      GEOM.forEach(k => ctl.style.removeProperty(k));
      ph.remove();
      docked = null;
    };
    const undock = () => {
      if (!docked) return;
      docked.ctl.classList.remove('in-top');
      place(docked.ctl, docked.ph.getBoundingClientRect());
      undockT = setTimeout(finishUndock, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FLY_MS);
    };

    // tuning starts once a slider actually moves sideways, so a scroll that starts on a slider just scrolls.
    // A tap docks it instead ("armed"): a cover over the whole screen then takes the next drag, wherever it starts,
    // and scrubs that slider; letting go of it (or tapping without dragging) puts the slider back.
    let drag = null, armed = null;
    const scrub = document.createElement('div');
    scrub.className = 'lab-scrub';
    document.body.append(scrub);
    const arm = ctl => {
      armed = ctl;
      ctl.classList.add('active');
      root.classList.add('tuning', 'armed');
      dock(ctl);
    };
    const disarm = () => {
      armed = null;
      root.classList.remove('tuning', 'armed');
      undock();
    };
    const begin = (ctl, e, extra) => {
      const inp = ctl.querySelector('input');
      const w = (docked?.ctl === ctl ? docked.ph : ctl).getBoundingClientRect().width;   // scrub at the slider's own width
      drag = { ctl, inp, id: e.pointerId, x: e.clientX, y: e.clientY, v: +inp.value, w, live: false, ...extra };
    };
    panel.addEventListener('pointerdown', e => {
      const ctl = e.target.closest('.ctl.track');
      if (!ctl || !phone.matches || e.button > 0 || armed) return;
      begin(ctl, e);
    });
    scrub.addEventListener('pointerdown', e => {
      if (!armed || e.button > 0) return;
      e.preventDefault();
      scrub.setPointerCapture?.(e.pointerId);
      begin(armed, e, { armed: true });
    });
    scrub.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('keydown', e => { if (e.key === 'Escape' && armed && !drag) disarm(); });
    addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.live && drag.armed) {
        if (Math.hypot(dx, e.clientY - drag.y) < 6) return;   // already docked: any drag counts, sideways sets the value
        drag.live = true;
      } else if (!drag.live) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }
        drag.live = true;
        drag.ctl.setPointerCapture?.(e.pointerId);
        drag.ctl.classList.add('active');
        root.classList.add('tuning');
        dock(drag.ctl);
      }
      const { inp } = drag, min = +inp.min, max = +inp.max;
      const before = inp.value;
      inp.value = drag.v + dx / drag.w * (max - min);   // the range input clamps and snaps to its step
      if (inp.value !== before) inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { live, ctl } = drag, wasArmed = drag.armed;
      drag = null;
      if (wasArmed) { disarm(); return; }                  // the scrub that followed a tap is over, or it was a tap away
      if (live) { root.classList.remove('tuning'); undock(); return; }
      if (e.type === 'pointerup') arm(ctl);                 // a tap on a slider: dock it and wait for a drag
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);

    // ---- how it got here: the lab's process story, with its saved versions as squares where it talks about them ----
    // A tap plays a version in its square (stage only, through the feed's embed hooks); a second tap breaks it out
    // full screen, where it can be played with. One plays at a time, so a phone isn't running a stack of old labs.
    let stopVersion = () => {};
    if (teaches) {
      teaches.firstElementChild.textContent = 'how it\u2019s built \u2192';
      paneStory.append(teaches);
    }
    const renderStory = () => {
      const sec = bootStory;
      if (!sec) return;
      const title = panel.querySelector('h1')?.textContent || '';
      paneStory.prepend(sec);
      if (!sec.querySelector('.ver-tile')) return;

      let cur = null, slowT = 0;   // cur: { li, play, frame }
      const stop = () => {
        if (!cur) return;
        clearTimeout(slowT);
        if (cur.play.matches?.(':popover-open')) cur.play.hidePopover();
        cur.play.remove();
        cur.li.classList.remove('playing', 'over-on');
        cur.li.querySelector('.ver-go').textContent = 'Play ▸';
        cur = null;
        versionOn = false;
        setNow();
        onScroll();
      };
      stopVersion = stop;
      phone.addEventListener('change', stop);
      const nowGo = sec.querySelector('.ver-now .ver-go');
      const setNow = () => { if (nowGo && !phone.matches) nowGo.textContent = versionOn ? 'Back to it ▸' : 'Playing ▸'; };
      setNow();
      const breakOut = () => {
        if (!cur.play.showPopover) { open(cur.frame.src.replace(/\?.*$/, ''), '_blank', 'noopener'); return; }
        cur.play.showPopover();
        cur.play.querySelector('button').focus();
      };
      const play = li => {
        stop();
        const tile = li.querySelector('.ver-tile'), name = tile.dataset.name;
        const p = document.createElement('div');
        p.className = 'ver-play';
        p.setAttribute('popover', 'manual');
        p.innerHTML = `${li.querySelector('.ver-thumb').outerHTML}<span class="ver-spin" aria-hidden="true"></span><span class="ver-wait">Still loading…</span><iframe title="${title} version ${name}" src="../${tile.dataset.href}?embed=1" tabindex="-1"></iframe>
          <div class="ver-bar"><span>${title} · ${tile.querySelector('.ver-n').textContent} · ${tile.querySelector('.ver-cap').textContent}</span><button type="button">Close</button></div>`;
        const over = !phone.matches;
        p.querySelector('button').addEventListener('click', () => {
          if (over) stop(); else p.hidePopover();
          tile.focus();
        });
        p.querySelector('.ver-bar').addEventListener('pointerdown', e => e.stopPropagation());   // not the toy's
        if (over) { p.classList.add('over'); p.removeAttribute('popover'); stage.append(p); li.classList.add('over-on'); }
        else { li.prepend(p); li.classList.add('playing'); }
        li.querySelector('.ver-go').textContent = 'Loading…';
        cur = { li, play: p, frame: p.querySelector('iframe'), over };
        versionOn = true;
        setNow();
        onScroll();
        // a heavy old version can take a while to compile: say so rather than just spin
        slowT = setTimeout(() => { p.classList.add('slow'); li.querySelector('.ver-go').textContent = 'Still loading…'; }, 12000);
      };
      sec.addEventListener('click', e => {
        if (e.target.closest('.ver-now')) {
          stop();
          if (phone.matches) scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          return;
        }
        const tile = e.target.closest('.ver-tile');
        if (!tile) return;
        const li = tile.parentElement;
        if (cur?.li !== li) play(li);
        else if (cur.over) stop();
        else breakOut();
      });
      // the embed hooks say when the version has drawn its first frame
      addEventListener('message', e => {
        if (e.data?.feed !== 'ready' || !cur || e.source !== cur.frame.contentWindow) return;
        clearTimeout(slowT);
        cur.play.classList.add('ready');
        cur.li.querySelector('.ver-go').textContent = cur.over ? 'Close ×' : 'Full screen ⤢';
      });
      addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !cur) return;
        if (cur.over) stop();
        else if (cur.play.matches?.(':popover-open')) cur.play.hidePopover();
      });
    };
    renderStory();

    // ---- switching tabs ----
    // Each tab keeps its own place. Asked for from the toy, Change This pulls the panel right up and How it got here
    // stops under the toy. On a phone the page scrolls; on a wider screen the panel does.
    const tabY = { change: 0, story: 0 };
    let tab = 'change';
    const getY = () => phone.matches ? scrollY : panel.scrollTop;
    function tabHome(key) {
      const y = panel.getBoundingClientRect().top + scrollY;
      return key === 'story' ? y - innerHeight * READ_AT : y - top.offsetHeight;
    }
    const showTab = key => {
      tab = key;
      root.classList.toggle('story', key === 'story');
      for (const [k, t] of Object.entries(TABS)) {
        t.pane.hidden = k !== key;
        t.btn.setAttribute('aria-selected', String(k === key));
        t.btn.tabIndex = k === key ? 0 : -1;
      }
      onScroll();
    };
    const setURL = key => {
      const q = new URLSearchParams(location.search);
      q.delete('story');
      const others = q.toString(), search = key === 'story' ? '?' + (others ? others + '&' : '') + 'story' : others ? '?' + others : '';
      history.replaceState(history.state, '', location.pathname + search + location.hash);
    };
    const setTab = key => {
      if (key === tab) return;
      tabY[tab] = getY();
      if (tab === 'story') stopVersion();
      const fromToy = phone.matches && scrollY < 8;
      showTab(key);
      setURL(key);
      if (!phone.matches) { panel.scrollTop = tabY[key]; return; }
      scrollTo({ top: tabY[key] > 8 ? tabY[key] : tabHome(key), behavior: fromToy && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
      onScroll();
    };
    tabList.addEventListener('click', e => {
      const b = e.target.closest('.lab-tab');
      if (b) setTab(b.id.replace('lab-tab-', ''));
    });
    tabList.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const next = tab === 'story' ? 'change' : 'story';
      setTab(next);
      TABS[next].btn.focus();
    });
    if (root.classList.contains('story')) {
      // arriving to read: already risen, with no scroll to watch, and still where the reader has got to
      showTab('story');
      if (phone.matches) { scrollTo(0, tabHome('story') + bootY); onScroll(); } else panel.scrollTop = bootY;
      setURL('story');
    } else {
      showTab('change');
      setURL('change');
    }
    bootTap?.click();
  }
})();
