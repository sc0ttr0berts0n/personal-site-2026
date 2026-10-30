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
    @media (prefers-reduced-motion: reduce) { .lab-page .lab-panel, .lab-page .lab-panel *, .lab-page .lab-holdbar *, .lab-page .lab-stage { transition: none !important; } }`;
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
  });
})();
