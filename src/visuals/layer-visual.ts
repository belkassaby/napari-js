import type { Camera } from '../camera/camera';

/** A GPU renderer for one layer. The renderer holds one per layer and draws them in order. */
export interface LayerVisual {
  /** Reconcile GPU state with the layer's current display properties (cheap; pre-draw). */
  sync(): void;
  /** Encode draws for a `vw`×`vh` CSS-pixel viewport at z-slice `z`. */
  draw(pass: GPURenderPassEncoder, camera: Camera, vw: number, vh: number, z: number): void;
  dispose(): void;
}
