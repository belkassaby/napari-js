import type { CanvasTarget } from './canvas';
import type { Camera } from '../camera/camera';
import { ImageLayer } from '../layers/image-layer';
import { ImageVisual } from '../visuals/image-visual';
import { TiledImageVisual } from '../visuals/tiled-image-visual';
import type { LayerVisual } from '../visuals/layer-visual';

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

  addLayer(layer: ImageLayer): void {
    if (this.visuals.has(layer.id)) return;
    const visual: LayerVisual =
      layer.source.kind === 'tiled'
        ? new TiledImageVisual(this.device, this.target.format, layer, {
            float32Filterable: this.options.float32Filterable,
            onNeedsRedraw: this.options.onNeedsRedraw,
          })
        : new ImageVisual(this.device, this.target.format, layer, {
            float32Filterable: this.options.float32Filterable,
          });
    this.visuals.set(layer.id, visual);
  }

  removeLayer(id: string): void {
    this.visuals.get(id)?.dispose();
    this.visuals.delete(id);
  }

  has(id: string): boolean {
    return this.visuals.has(id);
  }

  /** Draw the given layers (in order) for the current camera and z-slice. */
  render(
    camera: Camera,
    layers: readonly ImageLayer[],
    z: number,
    background: GPUColor = { r: 0.07, g: 0.07, b: 0.09, a: 1 },
  ): void {
    const vw = this.target.canvas.clientWidth || this.target.canvas.width;
    const vh = this.target.canvas.clientHeight || this.target.canvas.height;

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: this.target.view, clearValue: background, loadOp: 'clear', storeOp: 'store' },
      ],
    });
    for (const layer of layers) {
      if (!layer.visible) continue;
      const visual = this.visuals.get(layer.id);
      if (!visual) continue;
      visual.sync();
      visual.draw(pass, camera, vw, vh, z);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    for (const visual of this.visuals.values()) visual.dispose();
    this.visuals.clear();
  }
}
