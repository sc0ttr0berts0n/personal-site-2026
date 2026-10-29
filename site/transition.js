// The ripple transition between toys: one full-screen canvas over the slides plays a shader from a snapshot of
// the outgoing toy to one of the incoming toy, then hides so the live incoming iframe shows through.
//
// A shockwave in spacetime rolls out from beyond the edge the incoming toy enters by; the wavefront refracts and
// splits the light, and the incoming toy is inside it. (Eleven other effects were tried on the way here; they
// are in this file's git history, e.g. lens, focus, reeded, turbulence, ink.)
//
// The feed keeps moving its slides underneath exactly as before (the CSS slide is the fallback when there's
// no WebGL, for reduced motion, and with ?fx=off), so the overlay only has to cover them and get out of the way.
//
// Snapshots come from the toys' 'grab' message (embed/lab-embed.js): an ImageBitmap of the stage, drawn the
// frame it's asked for and transferred, so there is no encode or decode on the main thread. They are stills:
// the feed holds both toys paused while the ripple runs (see cover's `done`) and starts the incoming one as it
// lifts, so the picture under the ripple is exactly where the toy carries on. A toy that hasn't drawn yet shows
// its poster, or the bench with the mark.
import { logoPath2D } from '../labs/shared/logo.js';

const MS = 800;      // a full transition from rest

const VERT = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
// uv (0..1, y down); dir: unit, the way the content travels; snapshots are uploaded top row first, so uv samples
// them as is, and past the edge repeats the edge
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uFrom, uTo;
uniform vec2 uRes, uDir;
uniform float uP, uAspect, uReveal;
vec4 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0)); }
vec4 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0)); }
// with red and blue pulled apart by o
vec4 Ac(vec2 uv, vec2 o) { return vec4(A(uv + o).r, A(uv).g, A(uv - o).b, 1.0); }
vec4 Bc(vec2 uv, vec2 o) { return vec4(B(uv + o).r, B(uv).g, B(uv - o).b, 1.0); }
void main() {
  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  vec2 dir = uDir, asp = vec2(uAspect, 1.0);
  vec2 o = vec2(0.5) - dir * 0.75;                  // the wave's source, beyond the entering edge
  vec2 d = (uv - o) * asp;
  float r = length(d);
  vec2 far = (abs(dir) * 1.25 + (1.0 - abs(dir)) * 0.5) * asp;   // to the furthest corner
  float near = length(abs(dir) * 0.25 * asp);                     // to the entering edge
  // the front starts just inside the entering edge, so the smallest drag already moves something
  float R = mix(near + 0.02, length(far) + 0.15, uP);
  float x = r - R;
  float wave = sin(x * 70.0) * exp(-abs(x) * 14.0);
  vec2 nrm = d / max(r, 1e-3) / asp;
  vec2 off = nrm * wave * 0.035;
  vec2 ab = nrm * 0.012 * exp(-abs(x) * 8.0);
  // both toys drift the way the swipe goes, a little, like the slide they replace
  vec4 a = Ac(uv + off - dir * 0.07 * uP, ab);
  vec4 col = a;
  if (x < 0.0) {
    // inside: the incoming toy, or, until a long pull has committed (uReveal 0), a bubble of the outgoing one
    vec4 bubble = Ac(uv + off - dir * 0.07 * uP - nrm * 0.06 * smoothstep(0.0, -0.35, x), ab * 2.5);
    bubble.rgb = bubble.rgb * 1.1 + 0.035;
    col = mix(bubble, Bc(uv + off + dir * 0.07 * (1.0 - uP), ab), uReveal);
  }
  col.rgb += pow(max(wave, 0.0), 3.0) * 0.5;
  gl_FragColor = vec4(col.rgb, 1.0);
}`;

const ease = t => 1 - Math.pow(1 - t, 3);

// host: the element to cover (the feed). Returns null when WebGL isn't there.
export function createTransitions(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  host.appendChild(canvas);

  // frames: effect frames drawn; worstMs: longest gap between them; workMs: longest main-thread time the effect
  // took in one go (uploads + draw); coverMs: from a move to the overlay being up (the snapshot delay), last and
  // worst; slid: moves that gave up waiting for pictures and kept the plain CSS slide
  const stats = { frames: 0, worstMs: 0, workMs: 0, coverMs: 0, worstCoverMs: 0, slid: 0, last: 0 };
  const timed = fn => (...a) => { const t0 = performance.now(); try { return fn(...a); } finally { stats.workMs = Math.max(stats.workMs, performance.now() - t0); } };

  // ---- GL setup: one triangle over the screen, two textures, one program (compiled on first use) ----
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  let prog = null;
  function program() {
    if (prog) return prog;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('fx', gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(pr, 0, 'aPos');
    gl.linkProgram(pr);
    const u = {};
    for (const k of ['uFrom', 'uTo', 'uRes', 'uDir', 'uP', 'uAspect', 'uReveal']) u[k] = gl.getUniformLocation(pr, k);
    return (prog = { pr, u });
  }
  const texture = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  };
  const tex = { from: texture(), to: texture() };
  const upload = (t, img) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); };

  let dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(host.clientWidth * dpr)); H = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  }
  const grabWidth = () => Math.min(1280, Math.round(host.clientWidth * dpr));

  // ---- grabs: ask a toy for a picture; resolves with an ImageBitmap, or null (no frame, no toy, too slow) ----
  let grabSeq = 0;
  const waiting = new Map();
  addEventListener('message', e => {
    if (e.origin !== location.origin || e.data?.feed !== 'grab') return;
    const w = waiting.get(e.data.id);
    if (!w) { e.data.bitmap?.close?.(); return; }
    waiting.delete(e.data.id); clearTimeout(w.timer);
    w.resolve(e.data.bitmap || null);
  });
  function grab(slide, timeout = 250) {
    const win = slide?.ready && slide.iframe?.contentWindow;
    if (!win) return Promise.resolve(null);
    const id = ++grabSeq;
    return new Promise(resolve => {
      const timer = setTimeout(() => { waiting.delete(id); resolve(null); }, timeout);
      waiting.set(id, { resolve, timer });
      win.postMessage({ feed: 'grab', id, width: grabWidth() }, location.origin);
    });
  }
  // what a toy that hasn't drawn shows: its poster over the bench, or the bench with the mark
  function stand(slide) {
    const c = document.createElement('canvas'), w = c.width = Math.min(W, 900), h = c.height = Math.round(H * w / W);
    const g = c.getContext('2d'), cs = getComputedStyle(document.documentElement), k = w / host.clientWidth;
    g.fillStyle = cs.getPropertyValue('--bg') || '#000'; g.fillRect(0, 0, w, h);
    const gs = (parseFloat(cs.getPropertyValue('--grid-size')) || 16) * k;
    g.fillStyle = cs.getPropertyValue('--grid') || '#1c1c22';
    for (let x = (w / 2) % gs; x < w; x += gs) g.fillRect(Math.round(x), 0, 1, h);
    for (let y = (h / 2) % gs; y < h; y += gs) g.fillRect(0, Math.round(y), w, 1);
    const img = slide?.el.querySelector('.poster');
    if (img?.complete && img.naturalWidth) {
      const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      g.drawImage(img, (w - img.naturalWidth * sc) / 2, (h - img.naturalHeight * sc) / 2, img.naturalWidth * sc, img.naturalHeight * sc);
    } else {
      const sz = 56 * k;
      g.translate(w / 2, h / 2); g.scale(sz, sz); g.fillStyle = cs.getPropertyValue('--dim') || '#8b8b98'; g.fill(logoPath2D());
    }
    return c;
  }
  async function picture(slide) {
    const k = kept.get(slide);
    if (k && k.stamp === stamp(slide) && !slide.playing) return k.img;
    const b = await grab(slide);
    return b || stand(slide);
  }

  // kept pictures of the frozen neighbours: a frozen toy doesn't change, so its picture is taken ahead of time
  // and a move to it only has to wait for the outgoing toy's. Stale once the toy plays or reloads.
  const kept = new Map();      // slide → { img, stamp }
  const stamp = s => `${s.born}|${s.playAt || 0}`;
  const isKept = img => [...kept.values()].some(k => k.img === img);
  function keep(slide) {
    for (const [s, k] of kept) if (!s.el.isConnected) { if (!inUse(k.img)) k.img.close(); kept.delete(s); }
    const want = stamp(slide), k = kept.get(slide);
    if ((k && k.stamp === want) || slide.playing || !slide.ready || slide.keeping) return;
    slide.keeping = true;
    grab(slide, 500).then(b => {
      slide.keeping = false;
      if (!b) return;
      if (slide.playing || stamp(slide) !== want || !slide.el.isConnected) { b.close(); return; }
      const old = kept.get(slide);
      if (old && !inUse(old.img)) old.img.close();
      kept.set(slide, { img: b, stamp: want });
    });
  }
  const inUse = img => !!st && Object.values(st.pics).includes(img);

  // ---- state ----
  // hold: a drag is under way; from/next/prev pictures load in the background and the ripple follows the finger
  // run: the effect is animating to 1 (commit) or back to 0 (release) by itself
  let st = null;      // { from, to: {1: slide, -1: slide}, pics: {from, 1, -1}, side, p, axis, shown, anim }
  let raf = 0;

  function dirVec(side, axis) {
    // side +1: the next toy comes in, so the content travels left (x) or up (y); uv is y down
    return axis === 'y' ? [0, -side] : [-side, 0];
  }

  function draw() {
    if (!st?.shown) return;
    const side = st.side || 1;
    const pr = program();
    gl.viewport(0, 0, W, H);
    gl.useProgram(pr.pr);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex.from);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex.to);
    gl.uniform1i(pr.u.uFrom, 0); gl.uniform1i(pr.u.uTo, 1);
    gl.uniform2f(pr.u.uRes, W, H);
    gl.uniform2f(pr.u.uDir, ...dirVec(side, st.axis));
    gl.uniform1f(pr.u.uP, Math.max(0, Math.min(1, st.p)));
    gl.uniform1f(pr.u.uAspect, W / H);
    gl.uniform1f(pr.u.uReveal, st.reveal ?? 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // the 'to' texture holds whichever neighbour the drag is heading for
  function useSide(side) {
    if (!st || side === st.side || !side) return;
    st.side = side;
    const pic = st.pics[side];
    if (pic) upload(tex.to, pic);
  }
  const show = timed(function () {
    if (!st || st.shown || !st.pics.from || !st.pics[st.side || 1]) return;
    upload(tex.from, st.pics.from);
    upload(tex.to, st.pics[st.side || 1]);
    st.shown = true;
    canvas.classList.add('on');
    draw();
    st.onShown?.();
    loop();
  });

  function loop() {
    cancelAnimationFrame(raf);
    const tick = now => {
      if (!st?.shown) return;
      if (stats.last) { stats.frames++; stats.worstMs = Math.max(stats.worstMs, now - stats.last); }
      stats.last = now;
      const a = st.anim;
      if (a) {
        const k = Math.min(1, (now - a.t0) / a.ms);
        st.p = a.p0 + (a.p1 - a.p0) * ease(k);
        if (a.reveal) st.reveal = Math.min(1, (now - a.t0) / 160);   // the bubble gives way to the next toy
        if (k >= 1) { draw(); return finish(); }
      }
      timed(draw)();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function finish() {
    cancelAnimationFrame(raf);
    const done = st?.anim?.done;
    clear();
    done?.();
  }
  function clear() {
    drop();
    canvas.classList.remove('on');
    stats.last = 0;
  }
  // forget the transition but leave its last frame on screen (the next one takes over from it)
  function drop() {
    cancelAnimationFrame(raf);
    stats.last = 0;
    const pics = st ? Object.values(st.pics) : [];
    st = null;
    for (const p of pics) if (!isKept(p)) p.close?.();
  }

  return {
    stats,
    // compile the shader before the first swipe needs it
    prepare() { resize(); program(); },

    // a drag started on `from`, with its neighbours prev/next (slides, any may be missing). hard: the toy has been
    // touched, so the drag only grows a bubble of `from` (a third of the way across at the commit point) and
    // the next toy is revealed when the feed commits
    hold(from, prev, next, axis = 'x', hard = false) {
      if (st) finish();
      resize();
      st = { from, to: { 1: next, '-1': prev }, pics: {}, side: 0, p: 0, axis, shown: false, anim: null, hard, reveal: hard ? 0 : 1 };
      const mine = st;
      const load = (key, slide) => picture(slide).then(pic => {
        if (mine !== st) { pic.close?.(); return; }
        mine.pics[key] = pic;
        show();
      });
      load('from', from); load('1', next); load('-1', prev);
    },
    // dragged by `frac` of the screen along the axis (negative = toward the next toy)
    drag(frac) {
      if (!st || st.anim) return;
      const side = frac < 0 ? 1 : frac > 0 ? -1 : st.side;
      useSide(side);
      st.p = Math.min(1, Math.abs(frac)) * (st.hard ? 0.6 : 1);
      if (st.shown) draw();
      else show();
    },
    // the drag let go short: run the ripple back to 0, then hide and call done()
    release(ms = 300, done) {
      if (!st) return done?.();
      if (!st.shown) { clear(); return done?.(); }
      st.anim = { t0: performance.now(), ms: Math.max(120, ms * st.p * 1.6), p0: st.p, p1: 0, done };
    },

    // a move to `to` (side ±1) is starting. Calls slide() once the overlay covers the slides (or right away
    // if it can't), so the feed's own slide runs underneath, and done() once the overlay has lifted off the
    // incoming toy, or done(true) when it gives up and slides plainly. Not called if another move or stop() takes over.
    cover(from, to, side, ms, slide, axis = 'x', done) {
      const dragged = st && !st.anim && st.to[side] === to && st.from === from;
      if (dragged && st.shown) {
        useSide(side);
        const dur = Math.max(ms + 40, MS * (1 - st.p));
        st.anim = { t0: performance.now(), ms: dur, p0: st.p, p1: 1, done, reveal: st.reveal < 1 };
        slide();
        return true;
      }
      // a move during a move: the overlay holds its last frame until this one is ready
      if (st?.shown) drop(); else if (st) clear();
      resize();
      const mine = st = { from, to: { [side]: to }, pics: {}, side, p: 0, axis, shown: false, anim: null };
      const t0 = performance.now();
      let slid = false;
      const go = () => { if (!slid) { slid = true; slide(); } };
      mine.onShown = () => {
        stats.coverMs = Math.round(performance.now() - t0);
        stats.worstCoverMs = Math.max(stats.worstCoverMs, stats.coverMs);
        mine.anim = { t0: performance.now(), ms: Math.max(ms + 40, MS), p0: 0, p1: 1, done };
        go();
      };
      // waiting on two pictures: if they take longer than a few frames, slide the plain way instead
      setTimeout(() => { if (mine === st && !mine.shown) { stats.slid++; clear(); go(); done?.(true); } }, 140);
      for (const [key, s] of [['from', from], [String(side), to]]) picture(s).then(pic => {
        if (mine !== st) { pic.close?.(); return; }
        mine.pics[key] = pic;
        show();
      });
      return true;
    },
    // a toy just froze (a neighbour after its warm-up, or the outgoing one after a move): take its picture now
    keep(slide) { if (slide) keep(slide); },
    // stop whatever is showing (a jump, a dialog)
    stop() { if (st) { cancelAnimationFrame(raf); clear(); } },
    get active() { return !!st?.shown; }
  };
}
