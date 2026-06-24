import { Layer, type BlendMode } from './layer';

export interface LabelsLayerOptions {
  name?: string;
  /** Highlight this label id when {@link showSelectedOnly} is set. */
  selectedLabel?: number;
  showSelectedOnly?: boolean;
  opacity?: number;
  blending?: BlendMode;
  visible?: boolean;
  scale?: [number, number];
  translate?: [number, number];
}

/**
 * A segmentation/label layer (the napari Labels analog). `data` is an 8-bit integer label
 * image (ids 0..255; 0 = background/transparent), colored by a cyclic LUT. Sampled with
 * nearest filtering so label edges stay crisp. uint16/uint32 label support is a follow-up.
 */
export class LabelsLayer extends Layer {
  readonly kind = 'labels';
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  private _selectedLabel: number;
  private _showSelectedOnly: boolean;

  constructor(data: Uint8Array, width: number, height: number, opts: LabelsLayerOptions = {}) {
    super({ name: opts.name, scale: opts.scale, translate: opts.translate });
    if (data.length < width * height) {
      throw new Error(`Labels data (${data.length}) smaller than ${width}×${height}.`);
    }
    this.data = data;
    this.width = width;
    this.height = height;
    this._selectedLabel = opts.selectedLabel ?? 0;
    this._showSelectedOnly = opts.showSelectedOnly ?? false;
    this._blending = opts.blending ?? 'translucent';
    if (opts.opacity !== undefined) this._opacity = opts.opacity;
    if (opts.visible !== undefined) this._visible = opts.visible;
  }

  get selectedLabel(): number {
    return this._selectedLabel;
  }
  set selectedLabel(value: number) {
    this._selectedLabel = Math.max(0, Math.round(value));
    this.changed.emit(this);
  }

  get showSelectedOnly(): boolean {
    return this._showSelectedOnly;
  }
  set showSelectedOnly(value: boolean) {
    this._showSelectedOnly = value;
    this.changed.emit(this);
  }

  /** Label id at data pixel `(x, y)`, or 0 (background) if out of bounds. */
  labelAt(x: number, y: number): number {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < 0 || py < 0 || px >= this.width || py >= this.height) return 0;
    return this.data[py * this.width + px];
  }
}
