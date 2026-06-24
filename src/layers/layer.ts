import { Emitter } from '../scene/events';

export type BlendMode = 'opaque' | 'translucent' | 'additive' | 'minimum';

let nextLayerId = 0;

/**
 * Base layer: identity + the display properties shared by every layer kind (opacity,
 * blending, visibility, and a data→world affine via `scale`/`translate`). Mutating any
 * property emits {@link changed} so the renderer can schedule a redraw — the napari
 * evented-layer model, GPU-side.
 */
export abstract class Layer {
  readonly id: string = `layer-${nextLayerId++}`;
  readonly changed = new Emitter<Layer>();

  abstract readonly kind: string;

  name: string;

  /** Data→world scale (e.g. physical pixel size). */
  scale: [number, number];
  /** Data→world translation. */
  translate: [number, number];

  protected _opacity = 1;
  protected _visible = true;
  protected _blending: BlendMode = 'translucent';

  protected constructor(opts: {
    name?: string;
    scale?: [number, number];
    translate?: [number, number];
  } = {}) {
    this.name = opts.name ?? this.id;
    this.scale = opts.scale ?? [1, 1];
    this.translate = opts.translate ?? [0, 0];
  }

  get opacity(): number {
    return this._opacity;
  }
  set opacity(value: number) {
    this._opacity = clamp01(value);
    this.changed.emit(this);
  }

  get visible(): boolean {
    return this._visible;
  }
  set visible(value: boolean) {
    this._visible = value;
    this.changed.emit(this);
  }

  get blending(): BlendMode {
    return this._blending;
  }
  set blending(value: BlendMode) {
    this._blending = value;
    this.changed.emit(this);
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
