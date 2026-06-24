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
