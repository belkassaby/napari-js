import type { Camera } from '../camera/camera';
import type { Camera3D } from '../camera/camera3d';

/**
 * Depth-buffer format for 3D passes. The renderer attaches a depth texture of this format when
 * drawing `ndisplay === 3` layers, so every 3D visual's pipeline must declare a matching
 * `depthStencil.format`. 2D passes have no depth attachment.
 */
export const DEPTH_FORMAT: GPUTextureFormat = 'depth24plus';

/** Per-frame view state handed to every visual. 2D visuals use `camera2d`; volume uses `camera3d`. */
export interface RenderView {
  camera2d: Camera;
  camera3d: Camera3D;
  /** CSS-pixel projection size. */
  vw: number;
  vh: number;
  /** Current z-slice (2D stacks). */
  z: number;
  ndisplay: 2 | 3;
}

/** A GPU renderer for one layer. The renderer draws only visuals whose `ndisplay` matches. */
export interface LayerVisual {
  /** Display dimensionality this visual renders in (2 for image/points/labels, 3 for volume). */
  readonly ndisplay: 2 | 3;
  /** Reconcile GPU state with the layer's current display properties (cheap; pre-draw). */
  sync(): void;
  /** Encode draws for the given view. */
  draw(pass: GPURenderPassEncoder, view: RenderView): void;
  dispose(): void;
}
