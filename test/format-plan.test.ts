import { describe, it, expect } from 'vitest';
import { formatPlanFor, toUploadData } from '../src/visuals/format-plan';

describe('formatPlanFor', () => {
  it('RGBA(uint8) → rgba8unorm, normalized clim', () => {
    expect(formatPlanFor(4, 'uint8', false)).toEqual({
      format: 'rgba8unorm',
      bytesPerPixel: 4,
      filterable: true,
      sampleScale: 1 / 255,
      isRgba: true,
    });
  });

  it('uint8 scalar → r8unorm', () => {
    expect(formatPlanFor(1, 'uint8', false)).toMatchObject({
      format: 'r8unorm',
      bytesPerPixel: 1,
      sampleScale: 1 / 255,
      isRgba: false,
    });
  });

  it('uint16/float32 scalar → r32float with native-unit clim; filterability follows the feature', () => {
    expect(formatPlanFor(1, 'uint16', false)).toMatchObject({
      format: 'r32float',
      sampleScale: 1,
      filterable: false,
    });
    expect(formatPlanFor(1, 'uint16', true).filterable).toBe(true);
    expect(formatPlanFor(1, 'float32', true)).toMatchObject({
      format: 'r32float',
      bytesPerPixel: 4,
    });
  });
});

describe('toUploadData', () => {
  it('converts non-Float32 arrays to Float32 for r32float', () => {
    const out = toUploadData(new Uint16Array([1, 2, 3]), 'r32float');
    expect(out).toBeInstanceOf(Float32Array);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });

  it('passes a Float32Array through for r32float', () => {
    const f = new Float32Array([1.5]);
    expect(toUploadData(f, 'r32float')).toBe(f);
  });

  it('passes data through unchanged for non-float formats', () => {
    const u = new Uint8Array([1, 2]);
    expect(toUploadData(u, 'r8unorm')).toBe(u);
  });
});
