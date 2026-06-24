import { Emitter } from './events';

/**
 * Dimension/slicing state. NJ-3 models the displayed 2D plane plus a single steppable
 * Z (stack) axis; the general N-D `currentStep` arrives with higher-dimensional data later.
 * `z` is clamped to `[0, depth-1]`. Mutations emit {@link changed}.
 */
export class Dims {
  readonly changed = new Emitter<Dims>();

  private _ndisplay: 2 | 3 = 2;
  private _depth = 1;
  private _z = 0;

  get ndisplay(): 2 | 3 {
    return this._ndisplay;
  }
  set ndisplay(value: 2 | 3) {
    this._ndisplay = value;
    this.changed.emit(this);
  }

  /** Number of z-slices. Setting it re-clamps `z`. */
  get depth(): number {
    return this._depth;
  }
  set depth(value: number) {
    this._depth = Math.max(1, Math.floor(value));
    this._z = clamp(this._z, 0, this._depth - 1);
    this.changed.emit(this);
  }

  /** Current z-slice index, clamped to `[0, depth-1]`. */
  get z(): number {
    return this._z;
  }
  set z(value: number) {
    const next = clamp(Math.round(value), 0, this._depth - 1);
    if (next === this._z) return;
    this._z = next;
    this.changed.emit(this);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
