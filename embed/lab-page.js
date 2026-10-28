// Site hooks for a lab's own page, the "Play with this" landing. The sync script adds this before the lab's modules.
// In the feed (?embed) it does nothing; lab-embed.js handles that.
//
// On a phone the toy stays put behind everything and the controls scroll up over it, peeking at the bottom
// (lab number and title) until pulled up. Dragging a slider fades the panel away except that one slider,
// so you watch the toy while you tune it. The header's name links back to the feed, on this toy.
(() => {
  if (new URLSearchParams(location.search).has('embed')) return;
  const root = document.documentElement;
  root.classList.add('lab-page');
  const PHONE = '(max-width: 899px)';   // lab.css's own breakpoint for the stacked layout

  const css = document.createElement('style');
  css.textContent = `
    .lab-page .lab-back { text-decoration: none; }
    .lab-page .lab-back:hover { color: var(--ink); }
    .lab-page .lab-back .arr { color: var(--dim); margin-right: -2px; }
    .lab-page .lab-peek { display: none; }
    @media ${PHONE} {
      html.lab-page { scroll-snap-type: y proximity; scroll-padding-top: var(--top-h, 41px); }
      .lab-page .lab-top { position: sticky; top: 0; z-index: 3; background: var(--bg);
        margin-inline: calc(-1 * max(16px, env(safe-area-inset-left, 0px))); padding-inline: max(16px, env(safe-area-inset-left, 0px)); }
      .lab-page .lab-stage { position: fixed; z-index: 0; left: 0; right: 0; top: var(--top-h, 41px);
        width: auto; height: calc(100svh - var(--top-h, 41px)); aspect-ratio: auto; max-height: none; border: 0; }
      .lab-page .lab-hud { bottom: calc(var(--peek, 120px) + 8px); }
      .lab-page .lab { scroll-snap-align: start; }
      .lab-page .lab-panel { position: relative; z-index: 2; scroll-snap-align: start;
        margin: calc(100svh - var(--top-h, 41px) - var(--peek, 120px)) calc(-1 * max(16px, env(safe-area-inset-left, 0px))) 0;
        padding: 0 max(16px, env(safe-area-inset-left, 0px)) 48px; gap: 20px;
        background: color-mix(in srgb, var(--panel) 90%, transparent); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
        border-top: 1px solid var(--line); border-radius: 10px 10px 0 0; transition: background-color .25s, border-color .25s; }
      .lab-page .lab-peek { display: grid; place-items: center; height: 30px; margin-bottom: -14px; padding: 0; border: 0; background: none; cursor: pointer; }
      .lab-page .lab-peek::before { content: ""; width: 40px; height: 4px; border-radius: 2px; background: var(--line); }
      /* tuning: only the toy and the slider under your finger */
      .lab-page .lab-panel > *, .lab-page .lab-group > *, .lab-page .ctls > * { transition: opacity .2s; }
      html.lab-page.tuning .lab-panel { background-color: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; border-color: transparent; }
      html.lab-page.tuning .lab-panel > :not(:has(.ctl.active)),
      html.lab-page.tuning .lab-group:has(.ctl.active) > :not(.ctls),
      html.lab-page.tuning .ctls > :not(.active) { opacity: 0; }
      html.lab-page.tuning .lab-top { opacity: .35; }
      html.lab-page.tuning .ctl.active { background: rgb(0 0 0 / .6); box-shadow: 0 0 0 10px rgb(0 0 0 / .6); border-radius: 1px; }
      html.lab-page.tuning .lab-hud { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) { .lab-page .lab-panel, .lab-page .lab-panel * { transition: none !important; } }`;
  document.head.appendChild(css);

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

    // tuning: fade in once a slider actually moves, so a scroll that starts on a slider doesn't flash
    let armed = null, tuneOff = 0;
    const off = () => {
      removeEventListener('pointerup', off); removeEventListener('pointercancel', off);
      const ctl = armed; armed = null;
      clearTimeout(tuneOff);
      tuneOff = setTimeout(() => { root.classList.remove('tuning'); ctl?.classList.remove('active'); }, 300);
    };
    panel.addEventListener('pointerdown', e => {
      if (!phone.matches || e.target.type !== 'range') return;
      armed = e.target.closest('.ctl');
      addEventListener('pointerup', off); addEventListener('pointercancel', off);
    });
    panel.addEventListener('input', e => {
      if (!armed || e.target.type !== 'range' || !armed.contains(e.target)) return;
      clearTimeout(tuneOff);
      document.querySelectorAll('.ctl.active').forEach(c => c !== armed && c.classList.remove('active'));
      armed.classList.add('active');
      root.classList.add('tuning');
    });
  });
})();
