import { acquireDevice, type DeviceContext } from './engine/device';
import { CanvasTarget } from './engine/canvas';
import { DemoRenderer } from './engine/renderer';

export interface ViewerOptions {
  /** The canvas to render into. */
  canvas: HTMLCanvasElement;
}

/**
 * NJ-0 Viewer facade. Acquires a WebGPU device, configures the canvas, and can render a demo
 * textured quad to prove the pipeline end-to-end. Construction kicks off async device setup;
 * await {@link ready} before rendering.
 *
 * The real layer/model API (`addImage`, colormaps, camera, …) lands in NJ-1 — see
 * docs/02-public-api.md.
 */
export class Viewer {
  /** Resolves once the WebGPU device is acquired and the canvas is configured. */
  readonly ready: Promise<void>;

  private readonly canvas: HTMLCanvasElement;
  private ctx?: DeviceContext;
  private target?: CanvasTarget;
  private renderer?: DemoRenderer;

  constructor(options: ViewerOptions) {
    this.canvas = options.canvas;
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    this.ctx = await acquireDevice();
    this.target = new CanvasTarget(this.canvas, this.ctx.device);
    this.target.syncSize();
    this.renderer = new DemoRenderer(this.ctx.device, this.target);
  }

  /** The acquired GPU device, or `undefined` until {@link ready} resolves. */
  get device(): GPUDevice | undefined {
    return this.ctx?.device;
  }

  /** Render the NJ-0 demo (clear + textured quad). Safe to call repeatedly and on resize. */
  renderDemo(): void {
    if (!this.target || !this.renderer) {
      throw new Error('Viewer is not ready — await `viewer.ready` before rendering.');
    }
    this.target.syncSize();
    this.renderer.render();
  }

  /** Release GPU resources and detach. */
  dispose(): void {
    this.ctx?.device.destroy();
    this.ctx = undefined;
    this.target = undefined;
    this.renderer = undefined;
  }
}
