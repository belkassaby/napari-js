import { resolveDrawingBufferSize } from './viewport';

/**
 * Owns a canvas's WebGPU context: format negotiation, configuration, and DPR-aware sizing.
 * The render loop reads {@link view} each frame for the current swapchain texture.
 */
export class CanvasTarget {
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly device: GPUDevice,
    format?: GPUTextureFormat,
  ) {
    const ctx = canvas.getContext('webgpu');
    if (!ctx) {
      throw new Error('Failed to acquire a "webgpu" canvas context.');
    }
    this.context = ctx;
    this.format = format ?? navigator.gpu.getPreferredCanvasFormat();
    this.configure();
  }

  /** (Re)configure the swapchain for the current device/format. */
  configure(): void {
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });
  }

  /**
   * Resize the backing buffer to match the canvas's CSS size × DPR, clamped to the device's
   * max texture dimension. Returns `true` when the size actually changed.
   */
  syncSize(dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1): boolean {
    const maxDim = this.device.limits.maxTextureDimension2D;
    const { width, height } = resolveDrawingBufferSize(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      dpr,
      maxDim,
    );
    if (this.canvas.width === width && this.canvas.height === height) {
      return false;
    }
    this.canvas.width = width;
    this.canvas.height = height;
    return true;
  }

  /** The current swapchain texture view for this frame. */
  get view(): GPUTextureView {
    return this.context.getCurrentTexture().createView();
  }
}
