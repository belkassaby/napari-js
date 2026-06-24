import type { CanvasTarget } from './canvas';
import type { Camera } from '../camera/camera';
import { ImageLayer } from '../layers/image-layer';
import { ImageVisual } from '../visuals/image-visual';

/**
 * Scene renderer: owns one {@link ImageVisual} per layer and draws them in order each frame.
 * Layer lifecycle is driven by the {@link Viewer} (add/remove); this class only knows how to
 * upload, sync, and draw.
 */
export class Renderer {
  private readonly visuals = new Map<string, ImageVisual>();

  constructor(
    private readonly device: GPUDevice,
    private readonly target: CanvasTarget,
  ) {}

  addLayer(layer: ImageLayer): void {
    if (this.visuals.has(layer.id)) return;
    this.visuals.set(layer.id, new ImageVisual(this.device, this.target.format, layer));
  }

  removeLayer(id: string): void {
    this.visuals.get(id)?.dispose();
    this.visuals.delete(id);
  }

  has(id: string): boolean {
    return this.visuals.has(id);
  }

  /** Draw the given layers (in order) for the current camera. */
  render(
    camera: Camera,
    layers: readonly ImageLayer[],
    background: GPUColor = { r: 0.07, g: 0.07, b: 0.09, a: 1 },
  ): void {
    // CSS pixels drive the projection (resolution-independent); the framebuffer is device px.
    const vw = this.target.canvas.clientWidth || this.target.canvas.width;
    const vh = this.target.canvas.clientHeight || this.target.canvas.height;

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.target.view,
          clearValue: background,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    for (const layer of layers) {
      if (!layer.visible) continue;
      const visual = this.visuals.get(layer.id);
      if (!visual) continue;
      visual.sync();
      visual.draw(pass, camera, vw, vh);
    }
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose(): void {
    for (const visual of this.visuals.values()) visual.dispose();
    this.visuals.clear();
  }
}
