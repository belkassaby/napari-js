/** HSV → linear-ish RGB (all components 0..1). */
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    default:
      return [v, p, q];
  }
}

/**
 * Build a cyclic label color LUT: an `size`×1 RGBA8 table indexed by `labelId % size`. Entry
 * 0 is fully transparent (background); the rest are distinct hues spaced by the golden ratio
 * so adjacent ids contrast. Pure and GPU-free (unit-tested). Mirrors napari's cyclic label
 * colormap.
 */
export function buildLabelLut(size = 256) {
  const lut = new Uint8Array(size * 4);
  const golden = 0.618033988749895;
  for (let i = 1; i < size; i++) {
    const hue = (i * golden) % 1;
    const [r, g, b] = hsvToRgb(hue, 0.6, 0.95);
    const o = i * 4;
    lut[o] = Math.round(r * 255);
    lut[o + 1] = Math.round(g * 255);
    lut[o + 2] = Math.round(b * 255);
    lut[o + 3] = 255;
  }
  // Entry 0 (background) stays [0,0,0,0].
  return lut;
}
