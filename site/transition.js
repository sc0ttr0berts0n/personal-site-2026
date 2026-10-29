// GL transitions between toys: one full-screen canvas over the slides plays a shader from a snapshot of the
// outgoing toy to one of the incoming toy, then hides so the live incoming iframe shows through.
//
// The feed keeps moving its slides underneath exactly as before (the CSS slide is the fallback when there's
// no WebGL, for reduced motion, and with ?fx=off), so the overlay only has to cover them and get out of the way.
//
// Snapshots come from the toys' 'grab' message (embed/lab-embed.js): an ImageBitmap of the stage, drawn the
// frame it's asked for and transferred, so there is no encode or decode on the main thread. While an effect
// runs, the toys that are playing are re-grabbed every frame, so the picture keeps moving under the effect.
// A toy that hasn't drawn yet shows its poster, or the bench with the mark.
//
//   ?fx=ink | wormhole | turbulence | caustics | gravity | ripple | chevron | pixels | logo | off
//                                                pick the effect (f cycles them; ?stats shows which)
import { logoPath2D } from '../labs/shared/logo.js';

export const EFFECTS = ['ink', 'wormhole', 'turbulence', 'caustics', 'gravity', 'ripple', 'chevron', 'pixels', 'logo'];

// Each effect: how long a full transition from rest takes, and a GLSL body that sets `col` from
//   uv (0..1, y down)  p (progress 0..1)  s (0 where the outgoing toy leaves, 1 where the incoming enters)
//   q (across the swipe, -0.5..0.5)  dir (unit, the way the content travels, in uv)  asp (uv → square units)
//   A(uv) / B(uv) (samplers)  Ac(uv, o) / Bc(uv, o) (with red and blue split by o)  uTime (seconds)
const BODIES = {
  // ink: the incoming toy bleeds in along a noisy front from the side it enters, both pictures smeared by
  // the same noise, with a dark rim of ink on the front
  ink: { ms: 640, glsl: `
    float n = fbm(uv * vec2(uAspect, 1.0) * 3.0 + dir * p * 1.5);
    float t = s * 0.55 + n * 0.45;
    float f = 1.0 - p * 1.25;                 // front sweeps past both ends
    float m = smoothstep(f - 0.02, f + 0.02, t);
    vec2 warp = dir * (n - 0.5) * 0.12;
    vec4 a = A(uv + warp * p + dir * p * 0.08);
    vec4 b = B(uv - warp * (1.0 - p) - dir * (1.0 - p) * 0.08);
    col = mix(a, b, m);
    float rim = smoothstep(0.09, 0.0, abs(t - f)) * (1.0 - smoothstep(0.85, 1.0, p));
    col.rgb *= 1.0 - rim * 0.85;` },

  // wormhole: a throat opens near the middle and swallows the screen; space outside falls toward it and spins,
  // the incoming toy unwinds out of it, and the event horizon burns blue
  wormhole: { ms: 900, glsl: `
    float e = p * p * (3.0 - 2.0 * p);
    vec2 c = vec2(0.5) - dir * 0.3 * (1.0 - e);
    vec2 d = (uv - c) * asp;
    float r = length(d), ang = atan(d.y, d.x);
    float R = 1.5 * pow(e, 1.7);                      // the throat's radius
    float edge = r - R;
    float rs = sqrt(r * r + R * R * 0.9);             // outside: pulled in from further out
    float spin = 2.6 * e * exp(-max(edge, 0.0) * 2.5);
    vec2 ua = c + vec2(cos(ang - spin), sin(ang - spin)) * rs / asp;
    vec2 ab = normalize(d + 1e-4) / asp * 0.014 * e;
    vec4 a = Ac(ua, ab) * mix(0.2, 1.0, smoothstep(0.0, 0.35, edge));
    float rho = r / max(R, 1e-3);                     // inside: unwinding, and zooming out to rest
    float un = 3.0 * (1.0 - e) * (1.0 - rho);
    vec2 ub = c + vec2(cos(ang + un), sin(ang + un)) * r * mix(0.35, 1.0, e) / asp;
    col = r < R ? B(ub) : a;
    float rim = exp(-abs(edge) * 38.0) * (1.0 - smoothstep(0.75, 1.0, p));
    col.rgb += vec3(0.55, 0.75, 1.0) * rim * 1.4;` },

  // turbulence: a domain-warped noise field churns both toys; the incoming one boils up through it from the
  // side it enters, with a hot edge where they meet
  turbulence: { ms: 800, glsl: `
    vec2 P = uv * asp * 2.2;
    vec2 w1 = vec2(fbm(P + vec2(0.0, uTime * 0.15)), fbm(P + vec2(5.2, 1.3) - uTime * 0.12));
    vec2 w2 = vec2(fbm(P + 3.5 * w1 + vec2(1.7, 9.2)), fbm(P + 3.5 * w1 + vec2(8.3, 2.8)));
    float n = fbm(P + 3.0 * w2);
    float amp = sin(3.14159 * p);
    vec2 disp = (w2 - 0.5) * 0.45 * amp + dir * amp * 0.04;
    float t = s * 0.5 + n * 0.5;
    float f = 1.05 - p * 1.6;
    float m = smoothstep(f - 0.03, f + 0.03, t);
    vec2 ab = (w1 - 0.5) * 0.04 * amp;
    col = mix(Ac(uv + disp, ab), Bc(uv - disp * 0.8, ab), m);
    col.rgb += vec3(1.0, 0.55, 0.25) * exp(-abs(t - f) * 30.0) * amp;` },

  // caustics: a wall of water rolls across from the entering side, refracting both toys and throwing
  // rippling caustic light; the incoming toy is what's left when it has passed
  caustics: { ms: 850, glsl: `
    vec2 P = uv * asp * 5.0;
    float T = uTime * 0.6 + p * 3.0;
    vec2 w = vec2(noise(P * 0.6 + T * 0.3), noise(P * 0.6 + 7.1 - T * 0.3));
    float r1 = 1.0 - abs(noise(P + w * 2.5 + T * 0.5) * 2.0 - 1.0);
    float r2 = 1.0 - abs(noise(P * 1.6 - w * 2.5 - T * 0.4 + 3.3) * 2.0 - 1.0);
    float caus = pow(r1, 10.0) + pow(r2, 10.0);
    float f = 1.25 - p * 1.5;
    float wet = (exp(-pow((s - f) * 5.0, 2.0)) + 0.12 * sin(3.14159 * p)) * smoothstep(0.0, 0.08, p) * (1.0 - smoothstep(0.9, 1.0, p));
    vec2 refr = (w - 0.5) * 0.09 * wet;
    float m = smoothstep(f - 0.04, f + 0.04, s + (w.x - 0.5) * 0.15);
    col = mix(A(uv + refr), B(uv - refr), m);
    col.rgb += vec3(0.7, 0.95, 1.0) * caus * wet * 0.9;` },

  // gravity: a black hole crosses the screen along the swipe, bending the light around it into an Einstein
  // ring; space it has passed through belongs to the incoming toy
  gravity: { ms: 950, glsl: `
    vec2 c = vec2(0.5) - dir * mix(0.85, -0.85, p);
    vec2 d = (uv - c) * asp;
    float r = length(d);
    float E = 0.07 + 0.17 * sin(3.14159 * p);         // Einstein radius
    vec2 bend = d / (r * r + 0.002) * E * E / asp;
    float shimmer = (noise(uv * asp * 18.0 + uTime * 2.0) - 0.5) * 0.02;
    vec2 src = uv - bend + shimmer * dir;
    float behind = dot((src - c) * asp, -dir);
    float m = smoothstep(-0.015, 0.015, behind + (noise(vec2(q * 9.0, uTime)) - 0.5) * 0.04);
    vec2 ab = bend * 0.08;
    col = mix(Ac(src, ab), Bc(src, ab), m);
    col.rgb *= smoothstep(E * 0.45, E * 0.75, r);     // the shadow
    col.rgb += vec3(1.0, 0.8, 0.5) * exp(-abs(r - E) * 55.0) * 1.2;` },

  // ripple: a shockwave in spacetime rolls out from beyond the entering edge; the wavefront refracts and
  // splits the light, and the incoming toy is inside it
  ripple: { ms: 800, glsl: `
    vec2 o = vec2(0.5) - dir * 0.75;
    vec2 d = (uv - o) * asp;
    float r = length(d);
    vec2 far = (abs(dir) * 1.25 + (1.0 - abs(dir)) * 0.5) * asp;
    float R = mix(-0.1, length(far) + 0.15, p);
    float x = r - R;
    float wave = sin(x * 70.0) * exp(-abs(x) * 14.0);
    vec2 nrm = d / max(r, 1e-3) / asp;
    vec2 off = nrm * wave * 0.035;
    vec2 ab = nrm * 0.012 * exp(-abs(x) * 8.0);
    col = x < 0.0 ? Bc(uv + off, ab) : Ac(uv + off, ab);
    col.rgb += pow(max(wave, 0.0), 3.0) * 0.5;` },

  // chevron: the mark's chevron, pointing the way the swipe goes, sweeps across as a band of ink with a
  // trailing hairline; the toys drift with it
  chevron: { ms: 560, glsl: `
    float k = 0.55 / uAspectAlong;            // how far the chevron's wings trail behind its tip
    float c = s - k * abs(q);                 // 0..1 along the swipe, bent into a chevron
    float f = mix(1.0, -k * 0.5 - 0.2, p);   // the front, from just off the entering edge to past the far one
    vec4 a = A(uv + dir * p * 0.18);
    vec4 b = B(uv - dir * (1.0 - p) * 0.18);
    float band = 0.12;
    col = c > f + band ? b : a;
    float inBand = step(f, c) * step(c, f + band);
    float hair = step(f + band + 0.018, c) * step(c, f + band + 0.024);
    col = mix(col, vec4(0.957, 0.957, 0.965, 1.0), max(inBand, hair));` },

  // pixels: both toys break into cells that grow and shrink again; cells flip to the incoming toy in a
  // ragged wave from the side it enters
  pixels: { ms: 600, glsl: `
    float size = mix(1.0, 44.0, pow(sin(3.14159 * p), 1.5)) * uDpr;
    vec2 cell = floor(uv * uRes / size);
    vec2 cuv = (cell + 0.5) * size / uRes;
    float r = hash(cell);
    float cs = dot(cuv - 0.5, -dir) + 0.5;
    float flip = step(cs * 0.6 + r * 0.4, p * 1.0 + (p > 0.98 ? 1.0 : 0.0));
    col = mix(A(cuv), B(cuv), flip);` },

  // logo: the incoming toy opens through the mark, which flies in from the entering side and grows past the
  // screen; the outgoing toy darkens and falls back
  logo: { ms: 720, glsl: `
    float e = p * p * (3.0 - 2.0 * p);
    vec2 c = vec2(0.5) - dir * 0.45 * (1.0 - e);
    float sc = mix(0.3, 10.0, pow(e, 2.0));      // mark width as a fraction of the screen's short side
    vec2 d = (uv - c) * uRes / min(uRes.x, uRes.y) / sc;
    vec2 lt = d * 0.9 + 0.5;
    float raw = all(equal(clamp(lt, 0.0, 1.0), lt)) ? texture2D(uLogo, lt).r : 0.0;
    float m = max(smoothstep(0.42, 0.58, raw), smoothstep(0.8, 1.0, p));
    float rim = min(1.0, 1.6 * (smoothstep(0.1, 0.42, raw) - smoothstep(0.42, 0.7, raw))) * (1.0 - smoothstep(0.6, 0.9, p));
    vec4 a = A(mix(uv, vec2(0.5), e * 0.12)) * (1.0 - 0.6 * e);
    vec4 b = B(uv);
    col = mix(mix(a, b, m), vec4(0.957, 0.957, 0.965, 1.0), rim);` }
};

const VERT = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
const frag = body => `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uFrom, uTo, uLogo;
uniform vec2 uRes, uDir;
uniform float uP, uAspect, uAspectAlong, uDpr, uTime;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
// snapshots are uploaded top row first, so uv (y down) samples them as is; past the edge repeats the edge
vec4 A(vec2 uv) { return texture2D(uFrom, clamp(uv, 0.0, 1.0)); }
vec4 B(vec2 uv) { return texture2D(uTo, clamp(uv, 0.0, 1.0)); }
vec4 Ac(vec2 uv, vec2 o) { return vec4(A(uv + o).r, A(uv).g, A(uv - o).b, 1.0); }
vec4 Bc(vec2 uv, vec2 o) { return vec4(B(uv + o).r, B(uv).g, B(uv - o).b, 1.0); }
void main() {
  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  vec2 dir = uDir;
  float p = uP;
  float s = dot(uv - 0.5, -dir) + 0.5;
  float q = dot(uv - 0.5, vec2(-dir.y, dir.x));
  vec2 asp = vec2(uAspect, 1.0);
  vec4 col;
  ${body}
  gl_FragColor = vec4(col.rgb, 1.0);
}`;

const ease = t => 1 - Math.pow(1 - t, 3);

// host: the element to cover (the feed). Returns null when WebGL isn't there.
export function createTransitions(host, { effect = 'ink' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  host.appendChild(canvas);

  // frames: effect frames drawn; worstMs: longest gap between them; workMs: longest main-thread time the effect
  // took in one go (uploads + draw); coverMs: from a move to the overlay being up (the snapshot delay), last and
  // worst; slid: moves that gave up waiting for pictures and kept the plain CSS slide
  const stats = { frames: 0, worstMs: 0, workMs: 0, coverMs: 0, worstCoverMs: 0, slid: 0, grabs: 0, last: 0 };
  const timed = fn => (...a) => { const t0 = performance.now(); try { return fn(...a); } finally { stats.workMs = Math.max(stats.workMs, performance.now() - t0); } };

  // ---- GL setup: one triangle over the screen, three textures, one program per effect (compiled lazily) ----
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const programs = {};
  function program(name) {
    if (programs[name]) return programs[name];
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('fx', name, gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, frag(BODIES[name].glsl)));
    gl.bindAttribLocation(pr, 0, 'aPos');
    gl.linkProgram(pr);
    const u = {};
    for (const k of ['uFrom', 'uTo', 'uLogo', 'uRes', 'uDir', 'uP', 'uAspect', 'uAspectAlong', 'uDpr', 'uTime']) u[k] = gl.getUniformLocation(pr, k);
    return (programs[name] = { pr, u });
  }
  const texture = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  };
  const tex = { from: texture(), to: texture(), logo: texture() };
  const upload = (t, img) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); };
  {
    // the mark, white on black, 0.9 of the width of a square texture (the shader samples d * 0.9 + 0.5)
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2); g.scale(S * 0.9, S * 0.9); g.fillStyle = '#fff'; g.fill(logoPath2D());
    upload(tex.logo, c);
  }

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
    if (img && !img.hidden && img.complete && img.naturalWidth) {
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
  const put = timed((t, img) => { upload(t, img); img.close?.(); });

  // ---- state ----
  // hold: a drag is under way; from/next/prev pictures load in the background and the effect follows the finger
  // run: the effect is animating to 1 (commit) or back to 0 (release) by itself
  let st = null;      // { from, to: {1: slide, -1: slide}, pics: {from, 1, -1}, side, p, axis, shown, anim, live }
  let raf = 0;

  function dirVec(side, axis) {
    // side +1: the next toy comes in, so the content travels left (x) or up (y); uv is y down
    return axis === 'y' ? [0, -side] : [-side, 0];
  }

  function draw() {
    if (!st?.shown) return;
    const side = st.side || 1;
    const pr = program(effect);
    gl.viewport(0, 0, W, H);
    gl.useProgram(pr.pr);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex.from);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex.to);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tex.logo);
    gl.uniform1i(pr.u.uFrom, 0); gl.uniform1i(pr.u.uTo, 1); gl.uniform1i(pr.u.uLogo, 2);
    gl.uniform2f(pr.u.uRes, W, H);
    gl.uniform2f(pr.u.uDir, ...dirVec(side, st.axis));
    gl.uniform1f(pr.u.uP, Math.max(0, Math.min(1, st.p)));
    gl.uniform1f(pr.u.uAspect, W / H);
    gl.uniform1f(pr.u.uAspectAlong, st.axis === 'y' ? H / W : W / H);
    gl.uniform1f(pr.u.uDpr, dpr);
    gl.uniform1f(pr.u.uTime, performance.now() / 1000 % 600);
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

  // live refresh: keep re-grabbing the playing toys while the effect is on screen, one request in flight each
  function refresh() {
    if (!st?.shown || !live) return;
    for (const [key, slide, t] of [['from', st.from, tex.from], ['to', st.to[st.side], tex.to]]) {
      if (!slide?.playing || st.inflight[key]) continue;
      st.inflight[key] = true;
      const mine = st;
      grab(slide, 120).then(b => {
        mine.inflight[key] = false;
        if (!b) return;
        if (mine !== st || (key === 'to' && slide !== st.to[st.side])) { b.close?.(); return; }
        stats.grabs++;
        put(t, b);
      });
    }
  }

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
        if (k >= 1) { draw(); return finish(); }
      }
      refresh();
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

  let live = !new URLSearchParams(location.search).has('fx-static');

  return {
    get effect() { return effect; },
    // switching compiles the new shader now, not on the next move
    set effect(name) { if (BODIES[name]) { effect = name; program(name); } },
    stats,
    // warm the effect's shader before the first swipe needs it
    prepare() { resize(); program(effect); },

    // a drag started on `from`, with its neighbours prev/next (slides, any may be missing)
    hold(from, prev, next, axis = 'x') {
      if (st) finish();
      resize();
      st = { from, to: { 1: next, '-1': prev }, pics: {}, side: 0, p: 0, axis, shown: false, anim: null, inflight: {} };
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
      st.p = Math.min(1, Math.abs(frac));
      if (st.shown) draw();
      else show();
    },
    // the drag let go short: run the effect back to 0, then hide
    release(ms = 300) {
      if (!st) return;
      if (!st.shown) return clear();
      st.anim = { t0: performance.now(), ms: Math.max(120, ms * st.p * 1.6), p0: st.p, p1: 0 };
    },

    // a move to `to` (side ±1) is starting. Calls slide() once the overlay covers the slides (or right away
    // if it can't), so the feed's own slide runs underneath. Returns false if it won't play.
    cover(from, to, side, ms, slide, axis = 'x') {
      const dragged = st && !st.anim && st.to[side] === to && st.from === from;
      if (dragged && st.shown) {
        useSide(side);
        const dur = Math.max(ms + 40, BODIES[effect].ms * (1 - st.p));
        st.anim = { t0: performance.now(), ms: dur, p0: st.p, p1: 1 };
        slide();
        return true;
      }
      // a move during a move: the overlay holds its last frame until this one is ready
      if (st?.shown) drop(); else if (st) clear();
      resize();
      const mine = st = { from, to: { [side]: to }, pics: {}, side, p: 0, axis, shown: false, anim: null, inflight: {} };
      const t0 = performance.now();
      let slid = false;
      const go = () => { if (!slid) { slid = true; slide(); } };
      mine.onShown = () => {
        stats.coverMs = Math.round(performance.now() - t0);
        stats.worstCoverMs = Math.max(stats.worstCoverMs, stats.coverMs);
        mine.anim = { t0: performance.now(), ms: Math.max(ms + 40, BODIES[effect].ms), p0: 0, p1: 1 };
        go();
      };
      // waiting on two pictures: if they take longer than a few frames, slide the plain way instead
      setTimeout(() => { if (mine === st && !mine.shown) { stats.slid++; clear(); go(); } }, 140);
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
