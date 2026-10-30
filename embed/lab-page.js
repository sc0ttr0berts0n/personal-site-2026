// Site hooks for a lab's own page, the "Change This" landing. The sync script adds this before the lab's modules.
// In the feed (?embed) it does nothing; lab-embed.js handles that.
//
// On a phone the toy stays put behind everything, framed in the part of the screen above the peek, and the
// controls scroll up over it, peeking at the bottom (lab number and title) until pulled up. Pulled up, a bar at
// the bottom shows the toy while you hold it, and the lock beside it keeps the toy showing until tapped again;
// pressing a palette peeks at the toy too. Sliders are big tracks you drag anywhere on, relative to where you
// started; once one moves it flies up into the header, clear of the toy, and keeps scrubbing until you let go.
// The header's name links back to the feed, on this toy.
(() => {
  if (new URLSearchParams(location.search).has('embed')) return;
  const SCRIPT = document.currentScript?.src || location.href;   // for the generated stories next to the labs
  const root = document.documentElement;
  root.classList.add('lab-page');
  const PHONE = '(max-width: 899px)';   // lab.css's own breakpoint for the stacked layout
  const EASE = 'cubic-bezier(.22, .8, .24, 1)';
  const FLY_MS = 280;
  const PIP_MS = 320, PIP_M = 10, PIP_R = 10;   // picture in picture: grow/shrink time, margin, corner radius

  const css = document.createElement('style');
  css.textContent = `
    html.lab-page { --line: #5c5c66; }   /* 3:1 on black, the minimum for borders (the feed uses the same) */
    .lab-page .lab-back { text-decoration: none; }
    .lab-page .lab-back:hover { color: var(--ink); }
    .lab-page .lab-back .arr { color: var(--dim); margin-right: -2px; }
    .lab-page .lab-peek, .lab-page .lab-holdbar, .lab-page .lab-pip, .lab-page .lab-scrub { display: none; }

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
      .lab-page .lab-panel { position: relative; z-index: 2; scroll-snap-align: start;
        margin: calc(100svh - var(--top-h, 41px) - var(--peek, 120px)) calc(-1 * max(16px, env(safe-area-inset-left, 0px))) 0;
        padding: 0 max(16px, env(safe-area-inset-left, 0px)) calc(96px + env(safe-area-inset-bottom, 0px)); gap: 20px;
        background: color-mix(in srgb, var(--panel) 90%, transparent); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
        border-top: 1px solid var(--line); border-radius: 10px 10px 0 0; transition: background-color .25s, border-color .25s, opacity .2s; }
      .lab-page .lab-peek { display: grid; place-items: center; height: 30px; margin-bottom: -14px; padding: 0; border: 0; background: none; cursor: pointer; }
      .lab-page .lab-peek::before { content: ""; width: 40px; height: 4px; border-radius: 2px; background: var(--line); }

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
      .lab-page .lab-panel > *, .lab-page .lab-group > *, .lab-page .ctls > * { transition: opacity .2s; }
      html.lab-page.tuning .lab-panel { background-color: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; border-color: transparent; }
      html.lab-page.tuning .lab-panel > :not(:has(.ctl.active)),
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
      .lab-page .lab-pip { display: block; position: fixed; z-index: 3; padding: 0; background: none; cursor: pointer;
        top: var(--pip-top); right: ${PIP_M}px; width: var(--pip-size); height: var(--pip-size);
        border: 1px solid var(--line); border-radius: ${PIP_R}px; box-shadow: 0 8px 28px rgb(0 0 0 / .7);
        opacity: 0; pointer-events: none; transition: opacity .2s; }
      html.lab-page.pip .lab-pip { opacity: 1; pointer-events: auto; }
    }
    @media (prefers-reduced-motion: reduce) { .lab-page .lab-panel, .lab-page .lab-panel *, .lab-page .lab-holdbar *, .lab-page .lab-stage { transition: none !important; } }

    /* the lab's process story, at the end of the panel, with its saved versions as squares that play on tap */
    .lab-page .lab-story { display: grid; gap: 12px; padding-top: 16px; border-top: 1px solid var(--line); }
    .lab-page .lab-story p { margin: 0; font-size: 14px; line-height: 1.6; text-wrap: pretty; }
    .lab-page .lab-story .open { color: var(--dim); font-size: 13px; }
    .lab-page .lab-story .open b { font: 500 10px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--ink); margin-right: 6px; }
    .lab-page .lab-versions { list-style: none; margin: 4px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
    .lab-page .lab-versions li { position: relative; aspect-ratio: 1; }
    .lab-page .ver-tile, .lab-page .ver-now { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-start;
      padding: 8px; border: 1px solid var(--line); border-radius: 2px; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent;
      background: var(--bg) linear-gradient(var(--grid) 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(90deg, var(--grid) 1px, transparent 1px) 0 0 / 12px 12px;
      transition: border-color .2s, background-color .2s; }
    .lab-page .ver-tile:hover, .lab-page .ver-now:hover { border-color: var(--dim); }
    .lab-page .ver-n { font: 200 22px/1 var(--display); }
    .lab-page .ver-cap { font: 400 11px/1.3 var(--mono); color: var(--dim); text-wrap: balance; }
    .lab-page .ver-go { font: 400 10px/1 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--dim); }
    .lab-page .ver-now { border-color: var(--dim); background: var(--ink); color: var(--bg); }
    .lab-page .ver-now .ver-cap, .lab-page .ver-now .ver-go { color: var(--bg); opacity: .7; }
    /* playing: the frame fills the square, under the tile, which turns clear and offers to break out */
    .lab-page .ver-play { position: absolute; inset: 0; display: block; margin: 0; padding: 0; width: auto; height: auto; overflow: hidden;
      border: 1px solid var(--ink); border-radius: 2px; background: var(--bg); color: var(--ink); }
    .lab-page .ver-play iframe { display: block; width: 100%; height: 100%; border: 0; pointer-events: none; }
    .lab-page .ver-bar { display: none; }
    .lab-page li.playing .ver-tile { background: linear-gradient(transparent 55%, rgb(0 0 0 / .75)); border-color: transparent; justify-content: flex-end; }
    .lab-page li.playing .ver-tile .ver-n { display: none; }
    .lab-page li.playing :is(.ver-go, .ver-cap) { color: var(--ink); }
    /* broken out: the same frame, over everything (the popover's top layer), and playable */
    .lab-page .ver-play:popover-open { position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; border: 0; border-radius: 0; }
    .lab-page .ver-play:popover-open iframe { pointer-events: auto; }
    .lab-page .ver-play:popover-open .ver-bar { display: flex; position: absolute; z-index: 1; align-items: center; justify-content: space-between; gap: 12px;
      top: env(safe-area-inset-top, 0px); left: 0; right: 0; padding: 10px max(16px, env(safe-area-inset-left, 0px));
      font: 400 12px/1.2 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--dim); pointer-events: none; }
    .lab-page .ver-bar button { pointer-events: auto; padding: 9px 12px; border: 1px solid var(--line); border-radius: 2px; background: rgb(0 0 0 / .6);
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); font: inherit; letter-spacing: inherit; text-transform: inherit; color: var(--ink); cursor: pointer; }
    .lab-page .ver-play::backdrop { background: var(--bg); }`;
  document.head.appendChild(css);

  const EYE = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
  const lock = shut => `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="${shut ? 'M5 7V5a3 3 0 0 1 6 0v2' : 'M5 7V5a3 3 0 0 1 5.8-1'}" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;

  // the lab's module has built the shell by now (module scripts run before DOMContentLoaded)
  addEventListener('DOMContentLoaded', () => {
    const top = document.querySelector('.lab-top'), panel = document.querySelector('.lab-panel');
    if (!top || !panel) return;

    // back to the feed, landing on this toy (and its settings code, if the link carried one)
    const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
    const who = top.querySelector('.who');
    if (who) {
      const a = document.createElement('a');
      a.className = 'who lab-back';
      a.innerHTML = `<span class="arr" aria-hidden="true">←</span>${who.innerHTML}`;
      a.setAttribute('aria-label', 'Back to all toys');
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
      let ov = null;
      const close = () => {
        if (!ov?.open) return;
        ov.classList.remove('open');
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) ov.close(); else setTimeout(() => ov.close(), 200);
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
        if (ov.open) return;
        ov.showModal();
        ov.querySelector('[aria-current]')?.focus({ preventScroll: false });
        requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('open')));
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
      const y = opened() ? 0 : panel.getBoundingClientRect().top + scrollY - top.offsetHeight;
      scrollTo({ top: y, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });

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
    bar.innerHTML = `<button type="button" class="lab-hold">${EYE}<span>Hold to see the toy</span></button>
      <button type="button" class="lab-lock" aria-pressed="false" aria-label="Keep the toy showing">${lock(false)}</button>`;
    document.body.append(bar);
    const holdBtn = bar.querySelector('.lab-hold'), holdLbl = holdBtn.querySelector('span'), lockBtn = bar.querySelector('.lab-lock');
    // the bar shows once the controls are pulled up far enough to cover the toy
    const onScroll = () => root.classList.toggle('opened', panel.getBoundingClientRect().top < innerHeight / 2);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();

    let locked = false;
    const hold = on => {
      if (locked) return;
      root.classList.toggle('held', on);
      holdLbl.textContent = on ? 'Let go for the controls' : 'Hold to see the toy';
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
      lockBtn.setAttribute('aria-label', locked ? 'Back to the controls' : 'Keep the toy showing');
      lockBtn.innerHTML = lock(locked);
      holdLbl.textContent = 'Hold to see the toy';
    });

    // ---- picture in picture: the toy in the top right corner while the controls are up ----
    // It shows whenever the hold bar would, and gives way to the full toy while a slider is scrubbed or the toy is
    // held. A tap on it puts the controls back down.
    const stage = document.querySelector('.lab-stage');
    const pip = document.createElement('button');
    pip.type = 'button'; pip.className = 'lab-pip';
    pip.setAttribute('aria-label', 'Put the controls down to see the toy');
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
      r.setProperty('--pip-top', top.offsetHeight + PIP_M + 'px');
      r.setProperty('--pip-s', s);
      r.setProperty('--pip-x', (W - PIP_M - P - s * x0) + 'px');
      r.setProperty('--pip-y', (PIP_M - s * y0) + 'px');
      r.setProperty('--pip-cx', x0 + 'px'); r.setProperty('--pip-cy', y0 + 'px');
      r.setProperty('--pip-r', PIP_R / s + 'px');
    };
    if (stage) new ResizeObserver(pipFit).observe(stage);
    addEventListener('resize', pipFit);
    pipFit();
    const pipSync = () => {
      const c = root.classList;
      c.toggle('pip', phone.matches && c.contains('opened') && !c.contains('tuning') && !c.contains('held'));
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

    // ---- how it got here: the lab's process story, and its saved versions as squares ----
    // A tap plays a version in its square (stage only, through the feed's embed hooks); a second tap breaks it out
    // full screen, where it can be played with. One plays at a time, so a phone isn't running a stack of old labs.
    import(new URL('../labs/stories.js', SCRIPT)).then(({ STORIES }) => {
      const story = STORIES[slug];
      if (!story) return;
      const title = panel.querySelector('h1')?.textContent || '';
      const sec = document.createElement('section');
      sec.className = 'lab-story';
      sec.setAttribute('aria-labelledby', 'lab-story-h');
      const label = v => v.note || v.name.replace(/^\d+[a-z]?-?/, '').replace(/-/g, ' ');
      sec.innerHTML = `<span class="ctl-head" id="lab-story-h">How it got here</span>
        ${story.paras.map(p => `<p>${p}</p>`).join('')}
        ${story.open ? `<p class="open"><b>Still open</b>${story.open}</p>` : ''}
        ${story.versions.length ? `<ol class="lab-versions" aria-label="Saved versions, oldest first">
          ${story.versions.map((v, i) => `<li><button type="button" class="ver-tile" data-i="${i}">
            <span class="ver-n">${v.name.match(/^\d+[a-z]?/)?.[0] || i + 1}</span>
            <span><span class="ver-cap">${label(v)}</span><br><span class="ver-go">Play ▸</span></span></button></li>`).join('')}
          <li><button type="button" class="ver-now"><span class="ver-n">Now</span>
            <span><span class="ver-cap">this lab, as it is today</span><br><span class="ver-go">${phone.matches ? 'See it ▴' : 'Playing ▸'}</span></span></button></li>
        </ol>` : ''}`;
      panel.append(sec);
      if (!story.versions.length) return;

      let cur = null;   // { li, play, frame }
      const stop = () => {
        if (!cur) return;
        if (cur.play.matches?.(':popover-open')) cur.play.hidePopover();
        cur.play.remove();
        cur.li.classList.remove('playing');
        cur.li.querySelector('.ver-go').textContent = 'Play ▸';
        cur = null;
      };
      const breakOut = () => {
        if (!cur.play.showPopover) { open(cur.frame.src.replace(/\?.*$/, ''), '_blank', 'noopener'); return; }
        cur.play.showPopover();
        cur.play.querySelector('button').focus();
      };
      const play = (li, v) => {
        stop();
        const p = document.createElement('div');
        p.className = 'ver-play';
        p.setAttribute('popover', 'manual');
        p.innerHTML = `<iframe title="${title} version ${v.name}" src="../${v.href}?embed=1" tabindex="-1"></iframe>
          <div class="ver-bar"><span>${title} · ${v.name.match(/^\d+[a-z]?/)?.[0] || ''} · ${label(v)}</span><button type="button">Close</button></div>`;
        p.querySelector('button').addEventListener('click', () => { p.hidePopover(); li.querySelector('.ver-tile').focus(); });
        li.prepend(p);
        li.classList.add('playing');
        li.querySelector('.ver-go').textContent = 'Full screen ⤢';
        cur = { li, play: p, frame: p.querySelector('iframe') };
      };
      sec.querySelector('.lab-versions').addEventListener('click', e => {
        if (e.target.closest('.ver-now')) {
          stop();
          if (phone.matches) scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
          return;
        }
        const tile = e.target.closest('.ver-tile');
        if (!tile) return;
        const li = tile.parentElement;
        if (cur?.li === li) breakOut(); else play(li, story.versions[+tile.dataset.i]);
      });
      addEventListener('keydown', e => { if (e.key === 'Escape' && cur?.play.matches?.(':popover-open')) cur.play.hidePopover(); });
    }, () => {});
  });
})();
