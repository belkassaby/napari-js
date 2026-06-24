import { describe, it, expect } from 'vitest';
import { Camera3D } from '../src/camera/camera3d';
import { VolumeLayer } from '../src/layers/volume-layer';

describe('Camera3D', () => {
  it('places the eye along +z at azimuth/elevation 0', () => {
    const c = new Camera3D();
    c.azimuth = 0;
    c.elevation = 0;
    c.distance = 10;
    const [x, y, z] = c.eye();
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(10, 5);
  });

  it('clamps elevation away from the poles', () => {
    const c = new Camera3D();
    c.elevation = 0;
    c.orbit(0, 100); // huge upward tilt
    expect(c.elevation).toBeLessThan(Math.PI / 2);
    expect(c.elevation).toBeGreaterThan(0);
  });

  it('emits changed on orbit/zoom and frames a volume', () => {
    const c = new Camera3D();
    let n = 0;
    c.changed.connect(() => n++);
    c.orbit(0.1, 0.1);
    c.zoomBy(1.2);
    expect(n).toBe(2);
    c.frame(2, 4, 8);
    expect(c.distance).toBeCloseTo(8 * 1.8, 5);
    expect(c.target).toEqual([0, 0, 0]);
  });

  it('keeps distance strictly positive', () => {
    const c = new Camera3D();
    c.distance = -2;
    expect(c.distance).toBeGreaterThan(0);
  });
});

describe('VolumeLayer', () => {
  it('validates data size', () => {
    expect(() => new VolumeLayer(new Uint8Array(7), 2, 2, 2)).toThrow();
    expect(() => new VolumeLayer(new Uint8Array(8), 2, 2, 2)).not.toThrow();
  });

  it('maps rendering modes to codes', () => {
    const v = new VolumeLayer(new Uint8Array(8), 2, 2, 2, { rendering: 'mip' });
    expect(v.renderingCode()).toBe(0);
    v.rendering = 'translucent';
    expect(v.renderingCode()).toBe(1);
    v.rendering = 'iso';
    expect(v.renderingCode()).toBe(2);
  });

  it('bumps colormapVersion and emits on colormap change', () => {
    const v = new VolumeLayer(new Uint8Array(8), 2, 2, 2);
    let n = 0;
    v.changed.connect(() => n++);
    const before = v.colormapVersion;
    v.colormap = 'gray';
    expect(v.colormapVersion).toBe(before + 1);
    expect(n).toBe(1);
  });
});
