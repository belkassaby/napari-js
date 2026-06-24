import { describe, it, expect } from 'vitest';
import { Camera } from '../src/camera/camera';
import type { Mat4 } from '../src/math/mat4';

function apply(m: Mat4, v: [number, number, number, number]): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let c = 0; c < 4; c++) s += m[c * 4 + r] * v[c];
    out[r] = s;
  }
  return out;
}

describe('Camera', () => {
  it('projects its center to the clip-space origin', () => {
    const cam = new Camera();
    cam.set([100, 50], 2);
    const [x, y] = apply(cam.viewProjection(800, 600), [100, 50, 0, 1]);
    expect(Math.abs(x)).toBeLessThan(1e-5);
    expect(Math.abs(y)).toBeLessThan(1e-5);
  });

  it('emits changed on mutation', () => {
    const cam = new Camera();
    let count = 0;
    cam.changed.connect(() => count++);
    cam.zoom = 4;
    cam.center = [1, 2];
    cam.set([0, 0], 1);
    expect(count).toBe(3);
  });

  it('ignores non-positive zoom', () => {
    const cam = new Camera();
    cam.zoom = 3;
    cam.zoom = -1;
    cam.zoom = 0;
    expect(cam.zoom).toBe(3);
  });

  it('fit centers the region and scales to contain it', () => {
    const cam = new Camera();
    cam.fit(200, 100, 800, 600, 1); // margin 1 for exact math
    expect(cam.center).toEqual([100, 50]);
    expect(cam.zoom).toBe(Math.min(800 / 200, 600 / 100)); // min(4, 6) = 4
  });

  it('fit is a no-op for degenerate inputs', () => {
    const cam = new Camera();
    cam.set([5, 5], 2);
    cam.fit(0, 100, 800, 600);
    expect(cam.center).toEqual([5, 5]);
    expect(cam.zoom).toBe(2);
  });
});
