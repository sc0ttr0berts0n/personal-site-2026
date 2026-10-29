// Injected first into a lab page served with ?probe. Times every WebGL call that makes the page wait (a call
// that needs the GPU process to finish compiling, linking or drawing), per shader program, and every gap
// between animation frames; after the page settles it shows the result and posts it back to the probe server.
(() => {
  const T0 = performance.now(), now = () => performance.now() - T0;
  const q = new URLSearchParams(location.search), SECS = +(q.get('probe') || 0) || 15;
  const lab = location.pathname.split('/').pop().replace('.html', '');
  const progs = new Map(), shaders = new WeakMap(), slow = [], gaps = [];
  let nextId = 1, ext = null, firstDraw = null, ctxs = 0;
  const info = p => { let i = progs.get(p); if (!i) progs.set(p, i = { id: nextId++, frag: '', vert: '', blocked: 0, calls: {}, linkAt: null, firstUse: null, firstDraw: null }); return i; };
  const label = src => {
    // three.js prepends a long prefix; the lab's own uniforms say which program this is
    const u = [...src.matchAll(/uniform\s+\w+\s+(\w+)/g)].map(m => m[1]).filter(n => !/^(modelMatrix|modelViewMatrix|projectionMatrix|viewMatrix|normalMatrix|cameraPosition|isOrthographic|toneMappingExposure)$/.test(n));
    return `${src.length}ch ${u.slice(0, 4).join(',')}`;
  };
  let cur = null;   // the program in use, for draw calls
  const wrap = (proto, name, before) => {
    const f = proto[name]; if (!f) return;
    proto[name] = function (...a) {
      const p = before ? before.call(this, a) : null;
      const t = performance.now(), r = f.apply(this, a), d = performance.now() - t;
      if (d > 4) {
        const pi = p ? info(p) : null;
        if (pi) { pi.blocked += d; pi.calls[name] = (pi.calls[name] || 0) + d; }
        if (d > 20) slow.push({ at: Math.round(now()), fn: name, ms: Math.round(d), prog: pi ? pi.id : null });
      }
      return r;
    };
  };
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext].filter(Boolean)) {
    const P = C.prototype;
    const cs = P.createShader;
    P.createShader = function (type) { const s = cs.call(this, type); if (s) shaders.set(s, { frag: type === this.FRAGMENT_SHADER, src: '' }); return s; };
    wrap(P, 'shaderSource', function (a) { const s = shaders.get(a[0]); if (s) s.src = a[1]; return null; });
    wrap(P, 'attachShader', function (a) {
      const i = info(a[0]), s = shaders.get(a[1]);
      if (s) { if (s.frag) i.frag = label(s.src); else i.vert = label(s.src); }
      return a[0];
    });
    wrap(P, 'compileShader', null);
    wrap(P, 'linkProgram', function (a) { info(a[0]).linkAt = Math.round(now()); return a[0]; });
    for (const n of ['getProgramParameter', 'getProgramInfoLog', 'getActiveUniform', 'getActiveAttrib', 'getUniformLocation', 'getAttribLocation', 'getUniformBlockIndex', 'validateProgram'])
      wrap(P, n, function (a) { return a[0]; });
    wrap(P, 'getShaderParameter', null);
    wrap(P, 'useProgram', function (a) { cur = a[0]; if (cur) { const i = info(cur); if (i.firstUse == null) i.firstUse = Math.round(now()); } return cur; });
    for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'])
      wrap(P, n, function () { if (firstDraw == null) firstDraw = Math.round(now()); if (cur) { const i = info(cur); if (i.firstDraw == null) i.firstDraw = Math.round(now()); } return cur; });
    for (const n of ['readPixels', 'finish', 'getError', 'clientWaitSync', 'getBufferSubData', 'texImage2D', 'texSubImage2D', 'texImage3D', 'texStorage2D', 'texStorage3D', 'generateMipmap',
      'getParameter', 'getShaderPrecisionFormat', 'getExtension', 'getSupportedExtensions', 'getContextAttributes', 'bufferData', 'renderbufferStorageMultisample', 'checkFramebufferStatus', 'blitFramebuffer']) wrap(P, n, null);
  }
  // when the main thread is really busy, timers stall too; if only rAF gaps show, frames just weren't being drawn
  const beats = []; let lastBeat = performance.now();
  const beat = () => { const t = performance.now(); if (t - lastBeat > 100) beats.push({ at: Math.round(lastBeat - T0), ms: Math.round(t - lastBeat) }); lastBeat = t; setTimeout(beat, 20); };
  setTimeout(beat, 20);
  const marks = [];
  const mark = n => marks.push([n, Math.round(now())]);
  document.addEventListener('DOMContentLoaded', () => mark('DOMContentLoaded'));
  addEventListener('load', () => mark('load'));
  window.__probeMark = mark;
  // script and module evaluation: time each <script type=module> start via the resource list later; time three.js import here
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    const g0 = performance.now();
    const c = gc.call(this, t, o);
    if (/webgl/.test(t)) marks.push([`getContext ${t} ${Math.round(performance.now() - g0)}ms`, Math.round(now())]);
    if (c && /webgl/.test(t)) { ctxs++; if (!ext) { const s = c.getSupportedExtensions() || []; ext = { parallel: s.includes('KHR_parallel_shader_compile'), n: s.length, renderer: (() => { try { const d = c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER); } catch (e) { return '?'; } })() }; } }
    return c;
  };
  let last = null;
  const tick = t => { if (last != null && t - last > 100) gaps.push({ at: Math.round(last - T0), ms: Math.round(t - last) }); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  setTimeout(() => {
    const list = [...progs.values()].filter(p => p.frag || p.vert).map(p => ({ id: p.id, frag: p.frag, vert: p.vert, blockedMs: Math.round(p.blocked), calls: Object.fromEntries(Object.entries(p.calls).map(([k, v]) => [k, Math.round(v)])), linkAt: p.linkAt, firstUse: p.firstUse, firstDraw: p.firstDraw }));
    const rep = { lab, ua: navigator.userAgent, dpr: devicePixelRatio, screen: [screen.width, screen.height], ext, ctxs, firstDraw, totalBlockedMs: Math.round(list.reduce((s, p) => s + p.blockedMs, 0)),
      worstGaps: gaps.sort((a, b) => b.ms - a.ms).slice(0, 8), timerStalls: beats.sort((a, b) => b.ms - a.ms).slice(0, 8), marks,
      resources: performance.getEntriesByType('resource').filter(r => r.duration > 50 || r.transferSize > 50000).map(r => ({ name: r.name.split('/').slice(-2).join('/'), start: Math.round(r.startTime - T0), dur: Math.round(r.duration), kb: Math.round((r.transferSize || r.encodedBodySize || 0) / 1024) })),
      programs: list.sort((a, b) => b.blockedMs - a.blockedMs), slowCalls: slow.slice(0, 40) };
    fetch('/probe-log', { method: 'POST', body: JSON.stringify(rep) }).catch(() => {});
    const el = document.createElement('pre');
    el.style.cssText = 'position:fixed;inset:auto 0 0 0;max-height:60vh;overflow:auto;margin:0;padding:10px;background:rgba(0,0,0,.85);color:#9f9;font:11px/1.35 ui-monospace,monospace;z-index:99999;white-space:pre-wrap';
    el.textContent = `probe ${lab} · screenshot this\nfirst draw ${firstDraw} ms · blocked in GL ${rep.totalBlockedMs} ms · parallel compile ${ext && ext.parallel}\nworst frame gaps: ${rep.worstGaps.map(g => g.ms + 'ms@' + g.at).join(' ')}\ntimer stalls: ${rep.timerStalls.map(g => g.ms + 'ms@' + g.at).join(' ')}\n` +
      `marks: ${marks.map(m => m[0] + '@' + m[1]).join(' · ')}\nslow GL: ${slow.slice(0, 6).map(s => s.fn + ' ' + s.ms + 'ms@' + s.at).join(' · ')}\n` +
      rep.programs.slice(0, 12).map(p => `#${p.id} ${p.blockedMs}ms  ${p.frag}`).join('\n');
    el.onclick = () => el.remove();
    document.body.appendChild(el);
  }, SECS * 1000);
})();
