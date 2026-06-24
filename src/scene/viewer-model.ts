import { Emitter } from './events';
import { LayerList } from './layer-list';
import { Dims } from './dims';
import { Camera } from '../camera/camera';
import type { Layer } from '../layers/layer';

/**
 * Headless viewer state: a {@link LayerList} and a {@link Camera}. Render-agnostic and
 * GPU-free, so it can be constructed and unit-tested without WebGPU (the napari
 * `ViewerModel` analog). Emits {@link changed} when the layer list, the camera, or any
 * layer's display properties change — the single signal the renderer listens on.
 */
export class ViewerModel {
  readonly layers = new LayerList();
  readonly camera = new Camera();
  readonly dims = new Dims();
  readonly changed = new Emitter<ViewerModel>();

  private readonly layerDisposers = new Map<Layer, () => void>();

  constructor() {
    this.layers.changed.connect(() => this.changed.emit(this));
    this.camera.changed.connect(() => this.changed.emit(this));
    this.dims.changed.connect(() => this.changed.emit(this));
    this.layers.added.connect((layer) => {
      this.layerDisposers.set(layer, layer.changed.connect(() => this.changed.emit(this)));
    });
    this.layers.removed.connect((layer) => {
      this.layerDisposers.get(layer)?.();
      this.layerDisposers.delete(layer);
    });
  }
}
