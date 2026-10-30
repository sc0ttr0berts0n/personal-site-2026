// Shared palettes. Every lab offers "Bench" (pure black and white) first, then vivid sets.
// bg / grid / ink style the bench; `colors` is an ordered ramp the lab maps its own content onto.
export const PALETTES = {
  bench:       { name: 'Bench',       bg: '#000000', grid: '#1c1c22', ink: '#f4f4f6', colors: ['#ffffff', '#c8c8d0', '#8a8a96', '#4a4a55'] },
  spectrum:    { name: 'Spectrum',    bg: '#000000', grid: '#17161f', ink: '#f4f2fa', colors: ['#ff2d55', '#ff8a00', '#ffe600', '#2bff88', '#00e0ff', '#3d5bff', '#b23dff'] },
  // CMY holds each primary across two stops, so labs sampling near 0, 0.5 and 1 land on pure cyan, magenta, yellow
  cmy:         { name: 'CMY',         bg: '#000000', grid: '#16161c', ink: '#f4f4f8', colors: ['#00e5ff', '#00e5ff', '#ff1fd2', '#ffe600', '#ffe600'] },
  synthwave:   { name: 'Synthwave',   bg: '#05000c', grid: '#1e0b2e', ink: '#ffe9ff', colors: ['#ff2bd6', '#ff6ad5', '#a35bff', '#5b6bff', '#00e5ff'] },
  ember:       { name: 'Ember',       bg: '#060100', grid: '#24110a', ink: '#fff1e6', colors: ['#fff4c2', '#ffd600', '#ff9100', '#ff3d00', '#b80018'] },
  reef:        { name: 'Reef',        bg: '#00050a', grid: '#08202a', ink: '#e8fffb', colors: ['#00ffc8', '#00d5ff', '#2b7bff', '#ff4fa3', '#ffd23f'] },
  aurora:      { name: 'Aurora',      bg: '#000306', grid: '#0b1d1c', ink: '#eafff5', colors: ['#7cff6b', '#00ffb3', '#00d0ff', '#7a6bff', '#d46bff'] },
  ultraviolet: { name: 'Ultraviolet', bg: '#030008', grid: '#170a2c', ink: '#f3eaff', colors: ['#ffffff', '#e05bff', '#b000ff', '#6a00ff', '#2b00ff'] },
  gold:        { name: 'Gold Leaf',   bg: '#030201', grid: '#1d1608', ink: '#fff8e8', colors: ['#fffbe6', '#ffe08a', '#ffbf3c', '#d98a00', '#7a4a00'] }
};

// Pick a color along a palette's ramp. t in [0, 1].
export function ramp(palette, t) {
  const c = palette.colors;
  if (c.length === 1) return c[0];
  const x = Math.min(0.9999, Math.max(0, t)) * (c.length - 1);
  const i = Math.floor(x), f = x - i;
  return mix(c[i], c[i + 1], f);
}

export function mix(a, b, f) {
  const pa = hex(a), pb = hex(b);
  const r = pa.map((v, i) => Math.round(v + (pb[i] - v) * f));
  return '#' + r.map(v => v.toString(16).padStart(2, '0')).join('');
}

export const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
