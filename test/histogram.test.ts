import { describe, it, expect } from 'vitest';
import { histogramRGBA, histogramScalar, luminance8 } from '../src/color/histogram';

/** Build RGBA8 data from gray levels (one pixel per value). */
function grays(values: number[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach((v, i) => {
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  });
  return data;
}

describe('luminance8', () => {
  it('is the identity for grays and weights green most', () => {
    expect(luminance8(100, 100, 100)).toBeCloseTo(100, 5);
    expect(luminance8(0, 255, 0)).toBeCloseTo(0.587 * 255, 5); // green-weighted
  });
});

describe('histogramRGBA', () => {
  it('counts one entry per pixel', () => {
    const h = histogramRGBA(grays([0, 0, 255, 255]), 256);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('bins black at 0 and white at the top bin', () => {
    const h = histogramRGBA(grays([0, 255]), 256);
    expect(h.counts[0]).toBe(1);
    expect(h.counts[255]).toBe(1);
  });

  it('maps values into a reduced bin count', () => {
    // 4 bins over 0..255: value 200 → floor(200*4/256) = bin 3.
    const h = histogramRGBA(grays([200]), 4);
    expect(h.bins).toBe(4);
    expect(h.counts[3]).toBe(1);
  });

  it('clamps the max value into the last bin', () => {
    const h = histogramRGBA(grays([255]), 4);
    expect(h.counts[3]).toBe(1);
  });

  it('rejects a bin count below 1', () => {
    expect(() => histogramRGBA(grays([0]), 0)).toThrow();
  });
});

describe('histogramScalar', () => {
  it('bins scalar samples over [min,max] (native bit depth)', () => {
    // 16-bit values into 4 bins over 0..65535: 0→bin0, 65535→bin3, 32768→bin2.
    const h = histogramScalar(new Uint16Array([0, 32768, 65535]), 4, 0, 65535);
    expect(h.counts[0]).toBe(1);
    expect(h.counts[3]).toBe(1);
    expect(h.counts[2]).toBe(1);
    expect(h.bins).toBe(4);
    expect([h.min, h.max]).toEqual([0, 65535]);
  });

  it('clamps values outside the range into the end bins', () => {
    const h = histogramScalar([-5, 5, 100], 2, 0, 10);
    expect(h.counts[0]).toBe(1); // -5 clamps to the bottom bin
    expect(h.counts[1]).toBe(2); // 5 (upper half) + 100 (clamped) → top bin
  });

  it('rejects a bin count below 1', () => {
    expect(() => histogramScalar([0], 0, 0, 1)).toThrow();
  });
});
