import { describe, it, expect } from 'vitest';
import { Points3DLayer, POINTS3D_INSTANCE_FLOATS } from '../src/layers/points3d-layer';

const POS = new Float32Array([0, 0, 0, 2, 0, 0, 2, 4, 6]);
const VALS = new Float32Array([10, 20, 30]);

describe('Points3DLayer', () => {
  it('validates position / value lengths', () => {
    expect(() => new Points3DLayer(new Float32Array(4))).toThrow(); // not ×3
    expect(() => new Points3DLayer(POS, new Float32Array(2))).toThrow(); // n≠3
    expect(() => new Points3DLayer(POS, VALS)).not.toThrow();
  });

  it('reports count / kind and defaults', () => {
    const p = new Points3DLayer(POS, VALS);
    expect(p.kind).toBe('points3d');
    expect(p.count).toBe(3);
    expect(p.size).toBe(6);
    expect(p.blending).toBe('translucent');
    // contrast defaults to the value range.
    expect(p.contrastLimits).toEqual([10, 30]);
  });

  it('defaults values to 0 (single LUT color) when omitted', () => {
    const p = new Points3DLayer(POS);
    expect(Array.from(p.values)).toEqual([0, 0, 0]);
  });

  it('honors option overrides', () => {
    const p = new Points3DLayer(POS, VALS, {
      size: 12,
      opacity: 0.5,
      contrastLimits: [0, 255],
      blending: 'additive',
    });
    expect(p.size).toBe(12);
    expect(p.opacity).toBe(0.5);
    expect(p.contrastLimits).toEqual([0, 255]);
    expect(p.blending).toBe('additive');
  });

  it('bumps colormapVersion and emits on colormap change', () => {
    const p = new Points3DLayer(POS, VALS);
    let n = 0;
    p.changed.connect(() => n++);
    const before = p.colormapVersion;
    p.colormap = 'magma';
    expect(p.colormapVersion).toBe(before + 1);
    expect(n).toBe(1);
  });

  it('computes bounds (min/max/center/radius)', () => {
    const p = new Points3DLayer(POS, VALS);
    const b = p.bounds();
    expect(b.min).toEqual([0, 0, 0]);
    expect(b.max).toEqual([2, 4, 6]);
    expect(b.center).toEqual([1, 2, 3]);
    expect(b.radius).toBeCloseTo(0.5 * Math.hypot(2, 4, 6), 5);
  });

  it('interleaves [x,y,z,value] into the GPU instance buffer', () => {
    const p = new Points3DLayer(POS, VALS);
    const data = p.buildInstanceData();
    expect(data.length).toBe(3 * POINTS3D_INSTANCE_FLOATS);
    expect(Array.from(data.subarray(0, 4))).toEqual([0, 0, 0, 10]);
    expect(Array.from(data.subarray(8, 12))).toEqual([2, 4, 6, 30]);
  });
});
