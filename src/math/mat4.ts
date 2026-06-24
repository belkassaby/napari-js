/** Column-major 4×4 matrix (WGSL `mat4x4<f32>` layout): element at row r, col c is `m[c*4 + r]`. */
export type Mat4 = Float32Array;

export function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

/** Return `a * b` (apply `b` first, then `a`). */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + r] * b[c * 4 + k];
      }
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

/** Affine map `(x, y) → (sx·x + tx, sy·y + ty)` in homogeneous form (data → world). */
export function scaleTranslate2d(sx: number, sy: number, tx: number, ty: number): Mat4 {
  const m = identity();
  m[0] = sx;
  m[5] = sy;
  m[12] = tx;
  m[13] = ty;
  return m;
}

/**
 * Orthographic 2D view-projection: world → clip space, centered on `center`, scaled by
 * `zoom` (canvas px per world unit), for a `vw`×`vh` viewport. The Y axis is flipped so that
 * increasing world/data Y points downward on screen (image convention).
 */
export function ortho2d(
  center: readonly [number, number],
  zoom: number,
  vw: number,
  vh: number,
): Mat4 {
  const a = (2 * zoom) / Math.max(vw, 1);
  const b = (2 * zoom) / Math.max(vh, 1);
  const m = new Float32Array(16);
  m[0] = a;
  m[5] = -b;
  m[10] = 1;
  m[15] = 1;
  m[12] = -a * center[0];
  m[13] = b * center[1];
  return m;
}
