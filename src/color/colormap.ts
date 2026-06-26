export type RGB = [number, number, number];

/** A control point in a colormap: normalized position `t` (0..1) → linear RGB (0..1). */
export interface ColorStop {
  t: number;
  color: RGB;
}

/**
 * A colormap defined by sorted control points, linearly interpolated. Mirrors napari's
 * `Colormap` concept; sampled into a LUT texture for the GPU (see ./lut.ts).
 */
export class Colormap {
  readonly stops: ColorStop[];

  constructor(
    readonly name: string,
    stops: ColorStop[],
  ) {
    if (stops.length < 2) {
      throw new Error(`Colormap "${name}" needs at least two stops.`);
    }
    this.stops = [...stops].sort((p, q) => p.t - q.t);
  }

  /** Sample the colormap at `t` (clamped to 0..1), returning linear RGB. */
  sample(t: number): RGB {
    const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
    const { stops } = this;
    if (x <= stops[0].t) return [...stops[0].color];
    const last = stops[stops.length - 1];
    if (x >= last.t) return [...last.color];
    for (let i = 1; i < stops.length; i++) {
      const hi = stops[i];
      if (x <= hi.t) {
        const lo = stops[i - 1];
        const span = hi.t - lo.t || 1;
        const f = (x - lo.t) / span;
        return [
          lo.color[0] + (hi.color[0] - lo.color[0]) * f,
          lo.color[1] + (hi.color[1] - lo.color[1]) * f,
          lo.color[2] + (hi.color[2] - lo.color[2]) * f,
        ];
      }
    }
    return [...last.color];
  }
}

function ramp(name: string, color: RGB): Colormap {
  return new Colormap(name, [
    { t: 0, color: [0, 0, 0] },
    { t: 1, color },
  ]);
}

// Single-hue ramps (napari's red/green/blue/gray).
export const GRAY = ramp('gray', [1, 1, 1]);
export const RED = ramp('red', [1, 0, 0]);
export const GREEN = ramp('green', [0, 1, 0]);
export const BLUE = ramp('blue', [0, 0, 1]);

// Compact perceptual maps (a handful of anchors, interpolated).
export const VIRIDIS = new Colormap('viridis', [
  { t: 0.0, color: [0.267, 0.005, 0.329] },
  { t: 0.25, color: [0.275, 0.227, 0.494] },
  { t: 0.5, color: [0.149, 0.443, 0.541] },
  { t: 0.75, color: [0.122, 0.633, 0.531] },
  { t: 0.9, color: [0.478, 0.821, 0.318] },
  { t: 1.0, color: [0.993, 0.906, 0.144] },
]);

export const MAGMA = new Colormap('magma', [
  { t: 0.0, color: [0.001, 0.0, 0.014] },
  { t: 0.25, color: [0.232, 0.059, 0.437] },
  { t: 0.5, color: [0.55, 0.161, 0.506] },
  { t: 0.75, color: [0.868, 0.288, 0.41] },
  { t: 0.9, color: [0.987, 0.6, 0.392] },
  { t: 1.0, color: [0.987, 0.991, 0.749] },
]);

export const NAMED_COLORMAPS: Record<string, Colormap> = {
  gray: GRAY,
  grey: GRAY,
  red: RED,
  green: GREEN,
  blue: BLUE,
  viridis: VIRIDIS,
  magma: MAGMA,
};

/** Resolve a colormap name or pass through a `Colormap`. Throws on an unknown name. */
export function resolveColormap(cmap: Colormap | string): Colormap {
  if (cmap instanceof Colormap) return cmap;
  const found = NAMED_COLORMAPS[cmap.toLowerCase()];
  if (!found) {
    throw new Error(
      `Unknown colormap "${cmap}". Known: ${Object.keys(NAMED_COLORMAPS).join(', ')}.`,
    );
  }
  return found;
}

/**
 * Build a `Colormap` from a lookup table of RGB triples (bytes 0..`maxValue`, default 255),
 * with evenly spaced stops (`t = i / (len - 1)`). Useful for an arbitrary LUT produced outside
 * the named-colormap registry — e.g. a UI colormap picker that yields 256 RGB rows, or a reversed
 * ramp. Needs at least two entries.
 */
export function colormapFromLut(
  name: string,
  lut: ReadonlyArray<readonly [number, number, number]>,
  maxValue = 255,
): Colormap {
  if (lut.length < 2) {
    throw new Error(`colormapFromLut("${name}") needs at least two LUT entries.`);
  }
  const m = maxValue || 255;
  const n = lut.length;
  const stops: ColorStop[] = lut.map((c, i) => ({
    t: i / (n - 1),
    color: [c[0] / m, c[1] / m, c[2] / m] as RGB,
  }));
  return new Colormap(name, stops);
}

/**
 * Build a black→`hex` ramp `Colormap` — a channel "tint" for additive multichannel compositing
 * (fluorescence). Accepts `#rgb` / `#rrggbb` (the leading `#` is optional); unparseable channels
 * fall back to 0, and an empty/missing value defaults to white.
 */
export function tintColormap(hex: string): Colormap {
  const h = (hex || '#ffffff').replace('#', '');
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return new Colormap(`tint-${full}`, [
    { t: 0, color: [0, 0, 0] },
    { t: 1, color: [r / 255, g / 255, b / 255] },
  ]);
}
