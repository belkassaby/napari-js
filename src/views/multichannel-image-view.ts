import type { ImageInput } from '../io/texture-source';
import { ImageLayer, type ImageLayerOptions, type Interpolation } from '../layers/image-layer';
import { Colormap, tintColormap } from '../color/colormap';

/** How a multichannel image is composited onto the canvas. */
export type ChannelMode =
  /** One additive black→tint layer per channel (fluorescence). */
  | 'multichannel'
  /** A single scalar layer through a colormap (grayscale / LUT). */
  | 'grayscale'
  /** A single RGB(A) layer rendered directly (no colormap). */
  | 'rgb';

/** One channel's pixel source plus its display state. `source` is host-built (a typed plane or a
 *  pyramidal {@link TiledSource}); the view only owns how it becomes a layer. */
export interface ChannelView {
  source: ImageInput;
  /** `multichannel`: hex tint (`#rrggbb`/`#rgb`) → a black→tint ramp colormap. */
  tint?: string;
  /** `grayscale`: explicit colormap (instance or registry name). */
  colormap?: Colormap | string;
  contrastLimits?: [number, number];
  gamma?: number;
  visible?: boolean;
  invert?: boolean;
  name?: string;
  /** Data→world scale (e.g. to place a downscaled pyramid level in full-resolution coordinates). */
  scale?: [number, number];
}

/** Live display patch for a single channel (see {@link MultiChannelImageView.updateChannel}). */
export type ChannelUpdate = Partial<
  Pick<ChannelView, 'tint' | 'colormap' | 'contrastLimits' | 'gamma' | 'visible' | 'invert'>
>;

export interface MultiChannelRenderOptions {
  interpolation?: Interpolation;
}

/** The slice of {@link Viewer} this view drives — satisfied by `Viewer`, and trivial to fake in
 *  tests (no GPU). */
export interface ImageLayerHost {
  addImage(input: ImageInput, opts?: ImageLayerOptions): ImageLayer;
  readonly layers: { clear(): void };
  requestRender(): void;
}

/**
 * High-level multichannel image rendering on top of {@link Viewer}'s primitives. Turns a list of
 * channel sources + display state into the right layer set for a {@link ChannelMode} — additive
 * tinted layers, a single colormapped grayscale layer, or a direct RGB layer — and live-applies
 * per-channel display changes without re-fetching pixels.
 *
 * It deliberately knows nothing about where the pixels come from (HTTP tiles, decoded bitmaps,
 * typed arrays): the host builds each {@link ChannelView.source}; this view owns the rendering
 * orchestration that's identical regardless of the data backend.
 */
export class MultiChannelImageView {
  private _mode: ChannelMode | null = null;
  private readonly _layers: ImageLayer[] = [];
  private _interpolation: Interpolation = 'nearest';

  constructor(private readonly host: ImageLayerHost) {}

  /** The mode of the current render, or null before the first {@link render}/after {@link clear}. */
  get mode(): ChannelMode | null {
    return this._mode;
  }

  /** The layers built by the last {@link render}, in channel order (length 1 for grayscale/rgb). */
  get layers(): readonly ImageLayer[] {
    return this._layers;
  }

  /** The interpolation applied to every built layer. */
  get interpolation(): Interpolation {
    return this._interpolation;
  }

  /**
   * Clear any existing layers and build the layer set for `mode` from `channels`. Returns the new
   * layers (also available via {@link layers}). `multichannel` reads each channel's `tint`;
   * `grayscale`/`rgb` use only the first channel (`colormap` honoured for grayscale).
   */
  render(
    mode: ChannelMode,
    channels: readonly ChannelView[],
    opts: MultiChannelRenderOptions = {},
  ): ImageLayer[] {
    if (opts.interpolation) this._interpolation = opts.interpolation;
    const interpolation = this._interpolation;

    this.host.layers.clear();
    this._layers.length = 0;
    this._mode = mode;

    if (mode === 'multichannel') {
      channels.forEach((ch, i) => {
        this._layers.push(
          this.host.addImage(ch.source, {
            name: ch.name ?? `ch${i}`,
            colormap: tintColormap(ch.tint ?? '#ffffff'),
            contrastLimits: ch.contrastLimits ?? [0, 255],
            gamma: ch.gamma ?? 1,
            visible: ch.visible ?? true,
            invert: ch.invert ?? false,
            blending: 'additive',
            interpolation,
            ...(ch.scale ? { scale: ch.scale } : {}),
          }),
        );
      });
    } else if (mode === 'grayscale') {
      const ch = channels[0];
      this._layers.push(
        this.host.addImage(ch.source, {
          colormap: ch.colormap ?? 'gray',
          contrastLimits: ch.contrastLimits ?? [0, 255],
          gamma: ch.gamma ?? 1,
          invert: ch.invert ?? false,
          interpolation,
          ...(ch.scale ? { scale: ch.scale } : {}),
        }),
      );
    } else {
      const ch = channels[0];
      this._layers.push(
        this.host.addImage(ch.source, {
          interpolation,
          ...(ch.scale ? { scale: ch.scale } : {}),
        }),
      );
    }

    this.host.requestRender();
    return [...this._layers];
  }

  /**
   * Live-apply a display change to one channel's layer (no re-fetch). In `multichannel` mode a
   * `tint` becomes the layer's colormap; in `grayscale` a `colormap` is applied directly. Other
   * fields (contrast/gamma/visible/invert) apply in any mode. No-op for an out-of-range index.
   */
  updateChannel(index: number, patch: ChannelUpdate): void {
    const layer = this._layers[index];
    if (!layer) return;
    if (this._mode === 'multichannel') {
      if (patch.tint !== undefined) layer.colormap = tintColormap(patch.tint);
    } else if (this._mode === 'grayscale') {
      if (patch.colormap !== undefined) layer.colormap = patch.colormap;
    }
    if (patch.contrastLimits !== undefined) layer.contrastLimits = patch.contrastLimits;
    if (patch.gamma !== undefined) layer.gamma = patch.gamma;
    if (patch.visible !== undefined) layer.visible = patch.visible;
    if (patch.invert !== undefined) layer.invert = patch.invert;
    this.host.requestRender();
  }

  /** Set the interpolation on every current layer (and for subsequent renders). */
  setInterpolation(interpolation: Interpolation): void {
    this._interpolation = interpolation;
    for (const layer of this._layers) layer.interpolation = interpolation;
    this.host.requestRender();
  }

  /** Remove all layers and reset the mode. */
  clear(): void {
    this.host.layers.clear();
    this._layers.length = 0;
    this._mode = null;
    this.host.requestRender();
  }
}
