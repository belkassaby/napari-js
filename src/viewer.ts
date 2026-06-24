import { acquireDevice, type DeviceContext } from './engine/device';
import { CanvasTarget } from './engine/canvas';
import { Renderer } from './engine/renderer';
import { ViewerModel } from './scene/viewer-model';
import type { Camera } from './camera/camera';
import type { LayerList } from './scene/layer-list';
import { attachCameraControls } from './camera/controls';
import { ImageLayer, type ImageLayerOptions } from './layers/image-layer';
import { toTextureSource, depthOf, type ImageInput } from './io/texture-source';
import type { Dims } from './scene/dims';

export interface ViewerOptions {
  canvas: HTMLCanvasElement;
  /** Background clear color (RGBA 0..1). */
  background?: GPUColor;
  /** Attach pointer/wheel pan-zoom controls (default true). */
  controls?: boolean;
}

/**
 * The napari-js viewer: a headless {@link ViewerModel} (layers + camera) plus a WebGPU
 * renderer. Construction kicks off async device acquisition — await {@link ready} before
 * the first render. Adding layers / mutating display props schedules a coalesced redraw.
 */
export class Viewer {
  readonly ready: Promise<void>;
  readonly model = new ViewerModel();

  private readonly canvas: HTMLCanvasElement;
  private readonly background: GPUColor;
  private readonly useControls: boolean;

  private ctx?: DeviceContext;
  private target?: CanvasTarget;
  private renderer?: Renderer;
  private detachControls?: () => void;
  private frameScheduled = false;
  private firstImageFitted = false;

  constructor(options: ViewerOptions) {
    this.canvas = options.canvas;
    this.background = options.background ?? { r: 0.07, g: 0.07, b: 0.09, a: 1 };
    this.useControls = options.controls ?? true;
    this.ready = this.init();
  }

  get camera(): Camera {
    return this.model.camera;
  }

  get layers(): LayerList {
    return this.model.layers;
  }

  get dims(): Dims {
    return this.model.dims;
  }

  get device(): GPUDevice | undefined {
    return this.ctx?.device;
  }

  private async init(): Promise<void> {
    this.ctx = await acquireDevice();
    this.target = new CanvasTarget(this.canvas, this.ctx.device);
    this.target.syncSize();
    this.renderer = new Renderer(this.ctx.device, this.target, {
      float32Filterable: this.ctx.features.float32Filterable,
      onNeedsRedraw: () => this.requestRender(),
    });

    // Register any layers added before the device was ready.
    for (const layer of this.model.layers) {
      if (layer instanceof ImageLayer) this.renderer.addLayer(layer);
    }
    this.model.layers.added.connect((layer) => {
      if (layer instanceof ImageLayer) this.renderer?.addLayer(layer);
      this.requestRender();
    });
    this.model.layers.removed.connect((layer) => {
      this.renderer?.removeLayer(layer.id);
      this.requestRender();
    });
    this.model.changed.connect(() => this.requestRender());

    if (this.useControls) {
      this.detachControls = attachCameraControls(this.canvas, this.model.camera);
    }
    this.requestRender();
  }

  /** Add an image layer. Accepts typed pixels or a decoded image (see {@link ImageInput}). */
  addImage(input: ImageInput, opts: ImageLayerOptions = {}): ImageLayer {
    const source = toTextureSource(input);
    const layer = new ImageLayer(source, opts);
    this.model.layers.add(layer);
    this.model.dims.depth = Math.max(this.model.dims.depth, depthOf(source));
    this.maybeFitFirst(source.width, source.height);
    return layer;
  }

  private maybeFitFirst(width: number, height: number): void {
    if (this.firstImageFitted) return;
    const vw = this.canvas.clientWidth;
    const vh = this.canvas.clientHeight;
    if (vw > 0 && vh > 0) {
      this.model.camera.fit(width, height, vw, vh);
      this.firstImageFitted = true;
    }
  }

  /** Request a coalesced redraw on the next animation frame. No-op until {@link ready}. */
  requestRender(): void {
    if (this.frameScheduled || !this.renderer || !this.target) return;
    this.frameScheduled = true;
    requestAnimationFrame(() => {
      this.frameScheduled = false;
      this.renderFrame();
    });
  }

  private renderFrame(): void {
    if (!this.renderer || !this.target) return;
    this.target.syncSize();
    const layers = this.model.layers.items.filter(
      (l): l is ImageLayer => l instanceof ImageLayer,
    );
    this.renderer.render(this.model.camera, layers, this.model.dims.z, this.background);
  }

  dispose(): void {
    this.detachControls?.();
    this.renderer?.dispose();
    this.ctx?.device.destroy();
    this.ctx = undefined;
    this.target = undefined;
    this.renderer = undefined;
  }
}
