// Lab shell: header, stage with a key square, generated parameter panel, palettes, HUD.
// A lab declares its parameters as data; the panel, defaults and reset all come from that spec.
import { logoSVG } from './logo.js';
import { PALETTES } from './palettes.js';

/**
 * @param {object} spec
 * @param {string} spec.number   "01"
 * @param {string} spec.title
 * @param {string} spec.blurb    one or two sentences
 * @param {string} spec.teaches  the concept, shown under the controls
 * @param {string} [spec.hint]   short interaction hint, top-right of the stage
 * @param {object} spec.params   { key: { type: 'range'|'select'|'toggle'|'heading', label, ... } } (heading = section label only)
 * @param {string[]} [spec.palettes] keys of PALETTES, or palette objects; 'bench' is always first
 * @param {{label:string, action:Function, primary?:boolean}[]} [spec.actions]
 * @param {boolean} [spec.grid=true] draw the CSS bench grid behind the canvas
 * @param {string} [spec.defaultPalette] palette key to start on (default 'bench')
 */
export function createLab(spec) {
  // Reduced motion is honored by default; a viewer can opt back in (remembered per browser).
  const prefersCalm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motionOverride = false;
  try { motionOverride = localStorage.getItem('lab-motion') === 'on'; } catch (e) {}
  const calm = prefersCalm && !motionOverride;
  const listeners = { change: [], palette: [], resize: [], reset: [] };
  const emit = (ev, ...a) => listeners[ev].forEach(fn => fn(...a));

  const palettes = ['bench', ...(spec.palettes || ['spectrum']).filter(p => p !== 'bench')]
    .map(p => typeof p === 'string' ? { key: p, ...PALETTES[p] } : p);

  document.body.insertAdjacentHTML('afterbegin', `
    <header class="lab-top">
      <span class="who">${logoSVG({ size: 18 })} scott robertson</span>
      <span>lab ${spec.number}</span>
    </header>
    <main class="lab">
      <div class="lab-stage${spec.grid === false ? ' no-grid' : ''}">
        <div class="lab-square" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        ${spec.hint ? `<div class="lab-hint">${spec.hint}</div>` : ''}
        <div class="lab-hud" aria-live="off"></div>
      </div>
      <aside class="lab-panel">
        <div class="lab-group">
          <span class="num">Lab ${spec.number}</span>
          <h1>${spec.title}</h1>
          <p class="blurb">${spec.blurb}</p>
        </div>
        ${prefersCalm ? `<div class="motion-note">
          <span>${calm ? 'Your system asks for reduced motion, so idle animation is paused.' : 'Playing full motion even though your system asks for reduced motion.'}</span>
          <button type="button" class="btn" id="motion-toggle">${calm ? 'Play motion anyway' : 'Reduce motion again'}</button>
        </div>` : ''}
        <div class="lab-group"><span class="label">Palette</span><div class="palettes" role="group" aria-label="Palette"></div></div>
        <div class="lab-group"><span class="label">Parameters</span><form class="ctls" onsubmit="return false"></form></div>
        <div class="btns"></div>
        <div class="lab-group share">
          <span class="label">Share settings</span>
          <div class="btns"><button type="button" class="btn" id="share-copy">Copy settings code</button></div>
          <p class="share-out" id="share-out" hidden></p>
          <div class="share-apply">
            <label for="share-in" class="sr">Apply a settings code</label>
            <input id="share-in" type="text" placeholder="paste a code, e.g. glass_diamond~pal_reef" spellcheck="false" autocomplete="off">
            <button type="button" class="btn" id="share-go">Apply</button>
          </div>
        </div>
        <p class="teaches"><span>teaches →</span> ${spec.teaches}</p>
      </aside>
    </main>`);

  document.getElementById('motion-toggle')?.addEventListener('click', () => {
    try { localStorage.setItem('lab-motion', calm ? 'on' : 'off'); } catch (e) {}
    location.reload();
  });

  const stage = document.querySelector('.lab-stage');
  const squareEl = document.querySelector('.lab-square');
  const hudEl = document.querySelector('.lab-hud');

  // ---- params ----
  const defaults = {};
  const params = {};
  const form = document.querySelector('.ctls');
  const inputs = {};
  for (const [key, p] of Object.entries(spec.params || {})) {
    if (p.type === 'heading') {
      const h = document.createElement('div');
      h.className = 'ctl-head'; h.textContent = p.label;
      form.appendChild(h);
      continue;
    }
    defaults[key] = p.value;
    params[key] = p.value;
    const id = `p-${key}`;
    const wrap = document.createElement('div');
    if (p.type === 'range') {
      wrap.className = 'ctl';
      wrap.innerHTML = `<label class="row" for="${id}"><span>${p.label}</span><output id="${id}-o"></output></label>
        <input id="${id}" type="range" min="${p.min}" max="${p.max}" step="${p.step ?? 'any'}" value="${p.value}">`;
      const inp = wrap.querySelector('input'), out = wrap.querySelector('output');
      const show = v => { out.textContent = (p.format ? p.format(v) : fmt(v, p.step)) + (p.unit || ''); };
      show(p.value);
      inp.addEventListener('input', () => { const v = +inp.value; params[key] = v; show(v); emit('change', key, v, params); });
      inputs[key] = { set: v => { inp.value = v; show(v); } };
    } else if (p.type === 'select') {
      wrap.className = 'ctl';
      const opts = p.options.map(o => Array.isArray(o) ? o : [o, o]);
      wrap.innerHTML = `<label class="row" for="${id}"><span>${p.label}</span></label>
        <select id="${id}">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
      const sel = wrap.querySelector('select');
      sel.value = p.value;
      sel.addEventListener('change', () => { params[key] = sel.value; emit('change', key, sel.value, params); });
      inputs[key] = { set: v => { sel.value = v; } };
    } else if (p.type === 'toggle') {
      wrap.className = 'ctl toggle';
      wrap.innerHTML = `<label for="${id}">${p.label}</label><input id="${id}" type="checkbox"${p.value ? ' checked' : ''}>`;
      const cb = wrap.querySelector('input');
      cb.addEventListener('change', () => { params[key] = cb.checked; emit('change', key, cb.checked, params); });
      inputs[key] = { set: v => { cb.checked = v; } };
    }
    form.appendChild(wrap);
  }

  // ---- actions ----
  const btns = document.querySelector('.lab-panel > .btns');
  for (const a of spec.actions || []) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn' + (a.primary ? ' primary' : ''); b.textContent = a.label;
    b.addEventListener('click', () => a.action());
    btns.appendChild(b);
  }
  const reset = document.createElement('button');
  reset.type = 'button'; reset.className = 'btn'; reset.textContent = 'Reset parameters';
  reset.addEventListener('click', () => {
    for (const k of Object.keys(defaults)) { params[k] = defaults[k]; inputs[k]?.set(defaults[k]); emit('change', k, defaults[k], params); }
    emit('reset');
  });
  btns.appendChild(reset);

  // ---- palettes ----
  const defaultPalette = palettes.find(p => p.key === spec.defaultPalette) || palettes[0];
  let palette = defaultPalette;
  const palBox = document.querySelector('.palettes');
  const palButtons = new Map();
  palettes.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pal';
    b.innerHTML = `<span class="bar">${p.colors.map(c => `<span style="background:${c}"></span>`).join('')}</span><span class="nm">${p.name}</span>`;
    b.addEventListener('click', () => setPalette(p));
    palButtons.set(p, b);
    palBox.appendChild(b);
  });
  function setPalette(p) {
    palette = p;
    palButtons.forEach((b, q) => b.setAttribute('aria-pressed', q === p ? 'true' : 'false'));
    const r = document.documentElement.style;
    r.setProperty('--bg', p.bg); r.setProperty('--grid', p.grid); r.setProperty('--ink', p.ink);
    emit('palette', p);
  }
  setPalette(palette);

  // ---- settings codes ----
  // A code lists only what differs from the defaults: "glass_diamond~dispersion_9~fresnel_0~pal_reef".
  // It uses only characters the artifact viewer passes through in a #anchor, so lab-link#code works too.
  function encode() {
    const parts = [];
    for (const [k, p] of Object.entries(spec.params || {})) {
      if (p.type === 'heading') continue;
      const v = params[k];
      if (v === defaults[k]) continue;
      parts.push(`${k}_${p.type === 'toggle' ? (v ? 1 : 0) : v}`);
    }
    if (palette !== defaultPalette && palette.key) parts.push(`pal_${palette.key}`);
    return parts.join('~');
  }
  function apply(code) {
    const pairs = String(code).trim().replace(/^#/, '').split('~').filter(Boolean);
    let applied = 0;
    for (const pair of pairs) {
      const i = pair.indexOf('_');
      if (i < 1) continue;
      const k = pair.slice(0, i), raw = pair.slice(i + 1);
      if (k === 'pal') { const p = palettes.find(q => q.key === raw); if (p) { setPalette(p); applied++; } continue; }
      const p = spec.params?.[k];
      if (!p || p.type === 'heading') continue;
      let v;
      if (p.type === 'range') { v = Number(raw); if (!Number.isFinite(v)) continue; v = Math.min(p.max, Math.max(p.min, v)); }
      else if (p.type === 'toggle') v = raw === '1';
      else { const opts = p.options.map(o => Array.isArray(o) ? String(o[0]) : String(o)); if (!opts.includes(raw)) continue; v = raw; }
      params[k] = v; inputs[k]?.set(v); emit('change', k, v, params); applied++;
    }
    return applied;
  }
  const shareOut = document.getElementById('share-out');
  const shareIn = document.getElementById('share-in');
  document.getElementById('share-copy').addEventListener('click', () => {
    const code = encode();
    if (!code) { shareOut.hidden = false; shareOut.textContent = 'These are the default settings, so there is nothing to share yet.'; return; }
    shareOut.hidden = false;
    shareOut.innerHTML = `<code tabindex="0">#${code}</code><span>Add this to the end of the lab’s link, or paste it below on any copy of the lab.</span>`;
    const done = () => { shareOut.querySelector('span').textContent = 'Copied. Add it to the end of the lab’s link, or paste it below on any copy of the lab.'; };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(shareOut.querySelector('code')); getSelection().removeAllRanges(); getSelection().addRange(r); };
    try { navigator.clipboard.writeText('#' + code).then(done, fallback); } catch (e) { fallback(); }
  });
  const applyInput = () => {
    const n = apply(shareIn.value);
    shareOut.hidden = false;
    shareOut.textContent = n ? `Applied ${n} setting${n === 1 ? '' : 's'}.` : 'That code didn’t match any settings in this lab.';
  };
  document.getElementById('share-go').addEventListener('click', applyInput);
  shareIn.addEventListener('keydown', e => { if (e.key === 'Enter') applyInput(); });

  // ---- key square ----
  let sq = { x: 0, y: 0, size: 1, w: 1, h: 1 };
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    const size = Math.min(w, h);
    sq = { x: (w - size) / 2, y: (h - size) / 2, size, w, h };
    Object.assign(squareEl.style, { left: sq.x + 'px', top: sq.y + 'px', width: size + 'px', height: size + 'px' });
    // grid lines pass through the square's center
    const g = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-size')) || 16;
    stage.style.backgroundPosition = `${(w / 2) % g}px ${(h / 2) % g}px`;
    emit('resize', sq);
  }
  new ResizeObserver(layout).observe(stage);
  layout();

  // A code in the link (#glass_diamond~pal_reef) applies once the lab has wired its listeners.
  const fromHash = () => { if (location.hash.length > 1) apply(location.hash); };
  queueMicrotask(fromHash);
  addEventListener('hashchange', fromHash);

  return {
    stage, params, calm,
    settingsCode: encode,
    applySettings: apply,
    // Set a parameter from code (e.g. a Pour button moving the Fill slider); updates its control and emits 'change'.
    set(key, value) {
      if (!(key in defaults)) return;
      params[key] = value; inputs[key]?.set(value); emit('change', key, value, params);
    },
    get palette() { return palette; },
    square: () => sq,
    on(ev, fn) { listeners[ev].push(fn); return this; },
    hud(html) { hudEl.innerHTML = html; },
    // Adds a canvas filling the stage, sized for the device pixel ratio on every resize.
    canvas({ context = '2d', dprMax = 2, ...attrs } = {}) {
      const c = document.createElement('canvas');
      Object.assign(c, attrs);
      stage.insertBefore(c, squareEl);
      if (context === 'none') return { canvas: c };
      const ctx = c.getContext(context);
      const fit = () => {
        const dpr = Math.min(dprMax, window.devicePixelRatio || 1);
        c.width = Math.round(sq.w * dpr); c.height = Math.round(sq.h * dpr);
        if (context === '2d') ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      listeners.resize.unshift(fit); fit();
      return { canvas: c, ctx };
    },
    // rAF loop that pauses while the stage is off screen. fn(dt, t) with t frozen under reduced motion.
    loop(fn) {
      let visible = true, last = performance.now(), t = 0;
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
      const tick = now => {
        requestAnimationFrame(tick);
        // a frame's timestamp can predate the moment the loop started, so never hand out a negative step
        const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
        if (!visible) return;
        if (!calm) t += dt;
        fn(dt, t);
      };
      requestAnimationFrame(tick);
    }
  };
}

function fmt(v, step) {
  const d = step && step < 1 ? Math.min(3, String(step).split('.')[1]?.length || 2) : 0;
  return Number(v).toFixed(d);
}
