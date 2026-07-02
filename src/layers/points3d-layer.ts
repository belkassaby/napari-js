import { Layer, type BlendMode } from './layer';
import { Colormap, resolveColormap } from '../color/colormap';
import type { SurfaceBounds } from './surface-layer';

export interface Points3DLayerOptions {
  name?: string;
  /** Colormap applied to per-point `values` (name or {@link Colormap}). */
  colormap?: Colormap | string;
  /** Normalization window in value units (default: data min/max). */
  contrastLimits?: [number, number];
  gamma?: number;
  /** Marker diameter in screen pixels. */
  size?: number;
  opacity?: number;
  blending?: BlendMode;
  visible?: boolean;
}

/** Interleaved GPU instance = [x, y, z, value] → 4 floats. */
export const POINTS3D_INSTANCE_FLOATS = 4;

/**
 * A 3D scatter of point markers (napari Points-in-3D analog): `positions` (N×3, world/data coords,
 * x-fastest) with optional per-point scalar `values` colored through a colormap. Rendered as
 * depth-tested, screen-facing billboards under the orbit camera. Renders only when
 * `dims.ndisplay === 3`. (The 2D {@link PointsLayer} covers `ndisplay === 2`.)
 */
export class Points3DLayer extends Layer {
  readonly kind = 'points3d';
  /** N — number of points. */
  readonly count: number;
  /** N×3 point positions in world/data coords, x-fastest. */
  readonly positions: Float32Array;
  /** Per-point scalar (length N) mapped through the colormap. */
  readonly values: Float32Array;

  colormapVersion = 0;

  private _colormap: Colormap;
  private _contrastLimits: [number, number];
  private _gamma: number;
  private _size: number;

  constructor(positions: Float32Array, values?: Float32Array, opts: Points3DLayerOptions = {}) {
    super({ name: opts.name });
    if (positions.length % 3 !== 0) {
      throw new Error(`Points3D positions length (${positions.length}) must be a multiple of 3.`);
    }
    const n = positions.length / 3;
    const vals = values ?? new Float32Array(n);
    if (vals.length !== n) {
      throw new Error(`Points3D values length (${vals.length}) must equal point count (${n}).`);
    }
    this.positions = positions;
    this.values = vals;
    this.count = n;
    this._colormap = resolveColormap(opts.colormap ?? 'viridis');
    this._contrastLimits = opts.contrastLimits ?? valueRange(vals);
    this._gamma = opts.gamma ?? 1;
    this._size = opts.size ?? 6;
    this._blending = opts.blending ?? 'translucent';
    if (opts.opacity !== undefined) this._opacity = opts.opacity;
    if (opts.visible !== undefined) this._visible = opts.visible;
  }

  get colormap(): Colormap {
    return this._colormap;
  }
  set colormap(value: Colormap | string) {
    this._colormap = resolveColormap(value);
    this.colormapVersion++;
    this.changed.emit(this);
  }

  get contrastLimits(): [number, number] {
    return [this._contrastLimits[0], this._contrastLimits[1]];
  }
  set contrastLimits(value: readonly [number, number]) {
    this._contrastLimits = [value[0], value[1]];
    this.changed.emit(this);
  }

  get gamma(): number {
    return this._gamma;
  }
  set gamma(value: number) {
    this._gamma = value > 0 ? value : this._gamma;
    this.changed.emit(this);
  }

  get size(): number {
    return this._size;
  }
  set size(value: number) {
    this._size = value > 0 ? value : this._size;
    this.changed.emit(this);
  }

  /** Axis-aligned bounds + a center/radius the viewer uses to frame the orbit camera. */
  bounds(): SurfaceBounds {
    const p = this.positions;
    if (p.length === 0) {
      return { min: [0, 0, 0], max: [0, 0, 0], center: [0, 0, 0], radius: 1 };
    }
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        const c = p[i + a];
        if (c < min[a]) min[a] = c;
        if (c > max[a]) max[a] = c;
      }
    }
    const center: [number, number, number] = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];
    const radius = 0.5 * Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) || 1;
    return { min, max, center, radius };
  }

  /** Interleave positions + values into the GPU instance buffer (N × [x, y, z, value]). */
  buildInstanceData(): Float32Array {
    const n = this.count;
    const out = new Float32Array(n * POINTS3D_INSTANCE_FLOATS);
    for (let i = 0; i < n; i++) {
      const o = i * POINTS3D_INSTANCE_FLOATS;
      out[o] = this.positions[i * 3];
      out[o + 1] = this.positions[i * 3 + 1];
      out[o + 2] = this.positions[i * 3 + 2];
      out[o + 3] = this.values[i];
    }
    return out;
  }
}

/** Min/max of a value array, widened to a unit window when degenerate. */
function valueRange(values: Float32Array): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!isFinite(lo)) return [0, 1];
  return hi > lo ? [lo, hi] : [lo, lo + 1];
}
