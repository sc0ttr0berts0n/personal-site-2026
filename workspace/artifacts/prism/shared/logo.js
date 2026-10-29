// The one logo every lab uses. Geometry comes from logo-paths.js; size and placement rules live here.
//
// "Logo units": the mark's bounding box is centered on (0, 0) and is exactly 1 unit wide, y down.
// Every lab places the logo with fitLogo(square), so the mark always fills LOGO_FILL of the key square.
import { LOGO_PATHS, LOGO_BOUNDS } from './logo-paths.js';

export const LOGO_FILL = 0.6;            // logo width as a fraction of the key square's side
export const LOGO_DEPTH = 0.12;          // extrusion depth for 3D labs, in logo units
export const LOGO_ASPECT = LOGO_BOUNDS.h / LOGO_BOUNDS.w; // height / width ≈ 0.938

const CX = LOGO_BOUNDS.x + LOGO_BOUNDS.w / 2;
const CY = LOGO_BOUNDS.y + LOGO_BOUNDS.h / 2;
const K = 1 / LOGO_BOUNDS.w;
const unit = (x, y) => [(x - CX) * K, (y - CY) * K];

// Parsed pieces: [{ cmd: 'M'|'L'|'C'|'Z', pts: [[x, y], ...] }] per chevron, already in logo units.
export const LOGO_PIECES = LOGO_PATHS.map(d => {
  const out = [];
  for (const [, cmd, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    const pts = [];
    for (let i = 0; i < n.length; i += 2) pts.push(unit(n[i], n[i + 1]));
    out.push({ cmd, pts });
  }
  return out;
});

// Where the logo sits inside a key square: center and pixels per logo unit.
export function fitLogo(square) {
  return { cx: square.x + square.size / 2, cy: square.y + square.size / 2, scale: square.size * LOGO_FILL };
}

// Closed polygons (one per chevron) in logo units. Curves are split into `curveSegments` pieces.
export function logoPolygons({ curveSegments = 6 } = {}) {
  return LOGO_PIECES.map(piece => {
    const poly = [];
    let cur = [0, 0];
    for (const { cmd, pts } of piece) {
      if (cmd === 'M' || cmd === 'L') { cur = pts[0]; poly.push(cur); }
      else if (cmd === 'C') {
        const [p1, p2, p3] = pts, p0 = cur;
        for (let s = 1; s <= curveSegments; s++) {
          const t = s / curveSegments, u = 1 - t;
          poly.push([
            u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
          ]);
        }
        cur = p3;
      }
    }
    // drop a closing point that repeats the start
    const a = poly[0], b = poly[poly.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) poly.pop();
    return poly;
  });
}

// Canvas 2D path in logo units. Draw with ctx.translate(cx, cy); ctx.scale(scale, scale).
export function logoPath2D() {
  const p = new Path2D();
  for (const piece of LOGO_PIECES) {
    for (const { cmd, pts } of piece) {
      if (cmd === 'M') p.moveTo(...pts[0]);
      else if (cmd === 'L') p.lineTo(...pts[0]);
      else if (cmd === 'C') p.bezierCurveTo(...pts[0], ...pts[1], ...pts[2]);
      else p.closePath();
    }
  }
  return p;
}

// One THREE.Shape per chevron, in logo units with y UP (three.js convention).
export function logoShapes(THREE) {
  return LOGO_PIECES.map(piece => {
    const s = new THREE.Shape();
    for (const { cmd, pts } of piece) {
      const q = pts.map(([x, y]) => [x, -y]);
      if (cmd === 'M') s.moveTo(...q[0]);
      else if (cmd === 'L') s.lineTo(...q[0]);
      else if (cmd === 'C') s.bezierCurveTo(...q[0], ...q[1], ...q[2]);
    }
    return s;
  });
}

// Inline SVG of the mark for headers and buttons.
export function logoSVG({ fill = 'currentColor', stroke = 'none', strokeWidth = 0, size = 24 } = {}) {
  const pad = 20;
  const vb = `${LOGO_BOUNDS.x - pad} ${LOGO_BOUNDS.y - pad} ${LOGO_BOUNDS.w + pad * 2} ${LOGO_BOUNDS.h + pad * 2}`;
  return `<svg viewBox="${vb}" width="${size}" height="${size}" aria-hidden="true"><g fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round">${LOGO_PATHS.map(d => `<path d="${d}"/>`).join('')}</g></svg>`;
}
