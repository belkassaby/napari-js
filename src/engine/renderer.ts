import type { CanvasTarget } from './canvas';
import type { Camera } from '../camera/camera';
import type { Camera3D } from '../camera/camera3d';
import type { Layer } from '../layers/layer';
import { ImageLayer } from '../layers/image-layer';
import { PointsLayer } from '../layers/points-layer';
import { LabelsLayer } from '../layers/labels-layer';
import { VolumeLayer } from '../layers/volume-layer';
import { ImageVisual } from '../visuals/image-visual';
import { TiledImageVisual } from '../visuals/tiled-image-visual';
import { PointsVisual } from '../visuals/points-visual';
import { LabelsVisual } from '../visuals/labels-visual';
import { VolumeVisual } from '../visuals/volume-visual';
import type { LayerVisual, RenderView } from '../visuals/layer-visual';

/** Camera/dims inputs the viewer hands to a render call (viewport size is filled internally). */
export interface RenderInputs {
  camera2d: Camera;
  camera3d: Camera3D;
  ndisplay: 2 | 3;
  z: number;
}

export interface RendererOptions {
  float32Filterable: boolean;
  /** Called when an async tile upload completes, so the host can schedule a redraw. */
  onNeedsRedraw: () => void;
}

/**
 * Scene renderer: owns one {@link LayerVisual} per layer (a single-image or tiled visual,
 * chosen by source kind) and draws them in order each frame. Layer lifecycle is driven by
 * the {@link Viewer}; this class only uploads, syncs, and draws.
 */
export class Renderer {
  private readonly visuals = new Map<string, LayerVisual>();

  constructor(
    private readonly device: GPUDevice,
    private readonly target: CanvasTarget,
    private readonly options: RendererOptions = { float32Filterable: false, onNeedsRedraw: () => {} },
  ) {}

  addLayer(layer: Layer): void {
    if (this.visuals.has(layer.id)) return;
    const visual = this.createVisual(layer);
    if (visual) this.visuals.set(layer.id, visual);
  }

  private createVisual(layer: Layer): LayerVisual | null {
    const format = this.target.format;
    if (layer instanceof ImageLayer) {
      return layer.source.kind === 'tiled'
        ? new TiledImageVisual(this.device, format, layer, {
            float32Filterable: this.options.float32Filterable,
            onNeedsRedraw: this.options.onNeedsRedraw,
          })
        : new ImageVisual(this.device, format, layer, {
            float32Filterable: this.options.float32Filterable,
          });
    }
    if (layer instanceof PointsLayer) return new PointsVisual(this.device, format, layer);
    if (layer instanceof LabelsLayer) return new LabelsVisual(this.device, format, layer);
    if (layer instanceof VolumeLayer) return new VolumeVisual(this.device, format, layer);
    return null;
  }

  removeLayer(id: string): void {
    this.visuals.get(id)?.dispose();
    this.visuals.delete(id);
  }

  has(id: string): boolean {
    return this.visuals.has(id);
  }

  /** Draw the given layers (in order) into the swapchain for the current cameras/dims. */
  render(
    inputs: RenderInputs,
    layers: readonly Layer[],
    background: GPUColor = { r: 0.07, g: 0.07, b: 0.09, a: 1 },
  ): void {
    const vw = this.target.canvas.clientWidth || this.target.canvas.width;
    const vh = this.target.canvas.clientHeight || this.target.canvas.height;
    this.renderInto(this.target.view, inputs, layers, vw, vh, background);
  }

  /**
   * Draw into an arbitrary color-attachment view. `vw`/`vh` are the CSS-pixel projection size
   * (resolution-independent); the attachment may be a different device-pixel size. Only
   * visuals whose `ndisplay` matches `inputs.ndisplay` are drawn. Used for both the swapchain
   * and offscreen readback.
   */
  renderInto(
    view: GPUTextureView,
    inputs: RenderInputs,
    layers: readonly Layer[],
    vw: number,
    vh: number,
    background: GPUColor = { r: 0.07, g: 0.07, b: 0.09, a: 1 },
  ): void {
    const rv: RenderView = {
      camera2d: inputs.camera2d,
      camera3d: inputs.camera3d,
      vw,
      vh,
      z: inputs.z,
      ndisplay: inputs.ndisplay,
    };
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view, clearValue: background, loadOp: 'clear', storeOp: 'store' }],
    });
    for (const layer of layers) {
      if (!layer.visible) continue;
      const visual = this.visuals.get(layer.id);
      if (!visual || visual.ndisplay !== rv.ndisplay) continue;
      visual.sync();
      visual.draw(pass, rv);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    for (const visual of this.visuals.values()) visual.dispose();
    this.visuals.clear();
  }
}
