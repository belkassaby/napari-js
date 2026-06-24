import { describe, it, expect } from 'vitest';
import {
  multiply,
  perspective,
  lookAt,
  invert,
  identity,
  scale3d,
  translate3d,
  type Mat4,
} from '../src/math/mat4';

function apply(m: Mat4, v: [number, number, number, number]): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let c = 0; c < 4; c++) s += m[c * 4 + r] * v[c];
    out[r] = s;
  }
  return out;
}

describe('mat4 3D', () => {
  it('invert(M) · M ≈ identity for a perspective·view product', () => {
    const M = multiply(perspective(1.2, 1.5, 0.1, 100), lookAt([3, 2, 5], [0, 0, 0], [0, 1, 0]));
    const I = multiply(invert(M), M);
    const id = identity();
    for (let i = 0; i < 16; i++) expect(I[i]).toBeCloseTo(id[i], 4);
  });

  it('scale3d then translate3d composes (translate applied last)', () => {
    const m = multiply(translate3d(1, 2, 3), scale3d(2, 2, 2));
    expect(apply(m, [1, 1, 1, 1])).toEqual([3, 4, 5, 1]);
  });

  it('invert returns identity for a singular matrix', () => {
    const I = invert(scale3d(0, 1, 1));
    expect(Array.from(I)).toEqual(Array.from(identity()));
  });

  it('lookAt places the target in front of the eye (negative view z)', () => {
    const view = lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
    const p = apply(view, [0, 0, 0, 1]); // target in view space
    expect(p[2]).toBeLessThan(0); // in front of camera
  });
});
