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
import { readTextureToRGBA, type PixelData } from './engine/readback';
import { histogramRGBA, type Histogram } from './color/histogram';

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
    this.renderer.render(this.model.camera, this.imageLayers(), this.model.dims.z, this.background);
  }

  private imageLayers(): ImageLayer[] {
    return this.model.layers.items.filter((l): l is ImageLayer => l instanceof ImageLayer);
  }

  /**
   * Read back the composited displayed pixels as RGBA8 (top row first), by rendering the
   * current scene into an offscreen texture at the canvas's device-pixel size.
   */
  async readDisplayedPixels(): Promise<PixelData> {
    if (!this.renderer || !this.target || !this.ctx) {
      throw new Error('Viewer is not ready — await `viewer.ready` first.');
    }
    const w = Math.max(1, this.canvas.width);
    const h = Math.max(1, this.canvas.height);
    const cssW = this.canvas.clientWidth || w;
    const cssH = this.canvas.clientHeight || h;
    const texture = this.ctx.device.createTexture({
      size: [w, h],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    this.renderer.renderInto(
      texture.createView(), cssW, cssH, this.model.camera, this.imageLayers(), this.model.dims.z, this.background,
    );
    const data = await readTextureToRGBA(this.ctx.device, texture, w, h);
    texture.destroy();
    return { width: w, height: h, channels: 4, data };
  }

  /** Composite the displayed image to a PNG `Blob`. */
  async screenshot(): Promise<Blob> {
    const px = await this.readDisplayedPixels();
    if (typeof OffscreenCanvas !== 'undefined') {
      const off = new OffscreenCanvas(px.width, px.height);
      const ctx = off.getContext('2d')!;
      const image = ctx.createImageData(px.width, px.height);
      image.data.set(px.data);
      ctx.putImageData(image, 0, 0);
      return off.convertToBlob({ type: 'image/png' });
    }
    const el = document.createElement('canvas');
    el.width = px.width;
    el.height = px.height;
    const ctx = el.getContext('2d')!;
    const image = ctx.createImageData(px.width, px.height);
    image.data.set(px.data);
    ctx.putImageData(image, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
      el.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png');
    });
  }

  /** Luminance histogram (over `bins` bins) of the currently displayed composite. */
  async histogram(bins = 256): Promise<Histogram> {
    const px = await this.readDisplayedPixels();
    return histogramRGBA(px.data, bins);
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
