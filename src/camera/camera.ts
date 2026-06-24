import { Emitter } from '../scene/events';
import { ortho2d, type Mat4 } from '../math/mat4';

/**
 * 2D orthographic pan/zoom camera. `center` is in world coordinates; `zoom` is canvas pixels
 * per world unit. Emits {@link changed} on any mutation so the viewer can schedule a redraw.
 * The 3D arcball camera arrives in NJ-5+.
 */
export class Camera {
  readonly changed = new Emitter<Camera>();

  private _center: [number, number] = [0, 0];
  private _zoom = 1;

  get center(): [number, number] {
    return [this._center[0], this._center[1]];
  }
  set center(value: readonly [number, number]) {
    this._center = [value[0], value[1]];
    this.changed.emit(this);
  }

  get zoom(): number {
    return this._zoom;
  }
  set zoom(value: number) {
    this._zoom = value > 0 ? value : this._zoom;
    this.changed.emit(this);
  }

  /** Set center + zoom in one mutation (single change event). */
  set(center: readonly [number, number], zoom: number): void {
    this._center = [center[0], center[1]];
    if (zoom > 0) this._zoom = zoom;
    this.changed.emit(this);
  }

  /** World→clip view-projection matrix for a `vw`×`vh` viewport. */
  viewProjection(vw: number, vh: number): Mat4 {
    return ortho2d(this._center, this._zoom, vw, vh);
  }

  /**
   * Frame a `width`×`height` region centered in a `vw`×`vh` viewport (with a little margin),
   * e.g. to fit a freshly loaded image. No-op for degenerate inputs.
   */
  fit(width: number, height: number, vw: number, vh: number, margin = 0.95): void {
    if (width <= 0 || height <= 0 || vw <= 0 || vh <= 0) return;
    const zoom = Math.min(vw / width, vh / height) * margin;
    this.set([width / 2, height / 2], zoom);
  }
}
