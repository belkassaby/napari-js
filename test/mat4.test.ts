import { describe, it, expect } from 'vitest';
import { identity, multiply, scaleTranslate2d, ortho2d, type Mat4 } from '../src/math/mat4';

/** Apply a column-major mat4 to a vec4: out[r] = Σ_c m[c*4+r] * v[c]. */
function apply(m: Mat4, v: [number, number, number, number]): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let c = 0; c < 4; c++) s += m[c * 4 + r] * v[c];
    out[r] = s;
  }
  return out;
}

const close = (a: number, b: number, eps = 1e-5): boolean => Math.abs(a - b) <= eps;

describe('mat4', () => {
  it('identity is a no-op', () => {
    expect(apply(identity(), [3, -2, 0, 1])).toEqual([3, -2, 0, 1]);
  });

  it('scaleTranslate2d scales then translates', () => {
    const m = scaleTranslate2d(2, 3, 10, 20);
    expect(apply(m, [1, 1, 0, 1])).toEqual([12, 23, 0, 1]);
    expect(apply(m, [0, 0, 0, 1])).toEqual([10, 20, 0, 1]);
  });

  it('multiply(a, b) applies b then a', () => {
    const a = scaleTranslate2d(1, 1, 5, 0); // +5 x
    const b = scaleTranslate2d(2, 2, 0, 0); // x2
    const m = multiply(a, b); // (x*2)+5
    expect(apply(m, [3, 0, 0, 1])).toEqual([11, 0, 0, 1]);
  });

  it('ortho2d maps the camera center to clip-space origin', () => {
    const m = ortho2d([256, 256], 1, 800, 600);
    const [x, y] = apply(m, [256, 256, 0, 1]);
    expect(close(x, 0)).toBe(true);
    expect(close(y, 0)).toBe(true);
  });

  it('ortho2d flips Y (data down → clip down)', () => {
    const m = ortho2d([0, 0], 1, 800, 600);
    const above = apply(m, [0, 10, 0, 1]); // +Y in data
    expect(above[1]).toBeLessThan(0); // → negative clip Y (lower on screen)
  });
});
