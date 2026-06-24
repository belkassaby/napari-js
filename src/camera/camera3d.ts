import { Emitter } from '../scene/events';
import { perspective, lookAt, multiply, type Mat4, type Vec3 } from '../math/mat4';

const HALF_PI = Math.PI / 2;
const EPS = 1e-3;

/**
 * Orbit camera for 3D (volume) rendering: spins around `target` at `distance`, parameterized
 * by `azimuth`/`elevation`. Produces a perspective view-projection. Emits {@link changed} on
 * mutation. Used when `dims.ndisplay === 3`.
 */
export class Camera3D {
  readonly changed = new Emitter<Camera3D>();

  azimuth = 0.7;
  elevation = 0.5;
  fov = (45 * Math.PI) / 180;

  private _distance = 3;
  private _target: [number, number, number] = [0, 0, 0];

  get distance(): number {
    return this._distance;
  }
  set distance(value: number) {
    this._distance = Math.max(EPS, value);
    this.changed.emit(this);
  }

  get target(): [number, number, number] {
    return [...this._target];
  }
  set target(value: Vec3) {
    this._target = [value[0], value[1], value[2]];
    this.changed.emit(this);
  }

  /** Rotate the orbit by deltas (radians); elevation is clamped to avoid gimbal flip. */
  orbit(dAzimuth: number, dElevation: number): void {
    this.azimuth += dAzimuth;
    this.elevation = clamp(this.elevation + dElevation, -HALF_PI + EPS, HALF_PI - EPS);
    this.changed.emit(this);
  }

  zoomBy(factor: number): void {
    this.distance = this._distance * factor;
  }

  /** Eye position in world space. */
  eye(): [number, number, number] {
    const ce = Math.cos(this.elevation);
    return [
      this._target[0] + this._distance * ce * Math.sin(this.azimuth),
      this._target[1] + this._distance * Math.sin(this.elevation),
      this._target[2] + this._distance * ce * Math.cos(this.azimuth),
    ];
  }

  /** Perspective view-projection for a `vw`×`vh` viewport. */
  viewProjection(vw: number, vh: number): Mat4 {
    const aspect = vh > 0 ? vw / vh : 1;
    const near = Math.max(EPS, this._distance * 0.05);
    const far = this._distance * 4 + 1;
    const proj = perspective(this.fov, aspect, near, far);
    const view = lookAt(this.eye(), this._target, [0, 1, 0]);
    return multiply(proj, view);
  }

  /** Frame a `[w,h,d]` volume centered at the origin. */
  frame(w: number, h: number, d: number): void {
    this._target = [0, 0, 0];
    this.distance = Math.max(w, h, d) * 1.8;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
