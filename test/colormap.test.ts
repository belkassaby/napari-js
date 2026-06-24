import { describe, it, expect } from 'vitest';
import { Colormap, GRAY, VIRIDIS, resolveColormap } from '../src/color/colormap';
import { buildLut, LUT_SIZE } from '../src/color/lut';

describe('Colormap', () => {
  it('interpolates linearly between stops', () => {
    expect(GRAY.sample(0)).toEqual([0, 0, 0]);
    expect(GRAY.sample(1)).toEqual([1, 1, 1]);
    expect(GRAY.sample(0.5)).toEqual([0.5, 0.5, 0.5]);
  });

  it('clamps out-of-range t', () => {
    expect(GRAY.sample(-1)).toEqual([0, 0, 0]);
    expect(GRAY.sample(2)).toEqual([1, 1, 1]);
  });

  it('pins endpoints for multi-stop maps', () => {
    expect(VIRIDIS.sample(0)).toEqual(VIRIDIS.stops[0].color);
    expect(VIRIDIS.sample(1)).toEqual(VIRIDIS.stops[VIRIDIS.stops.length - 1].color);
  });

  it('requires at least two stops', () => {
    expect(() => new Colormap('bad', [{ t: 0, color: [0, 0, 0] }])).toThrow();
  });

  it('resolves names and rejects unknowns', () => {
    expect(resolveColormap('viridis')).toBe(VIRIDIS);
    expect(resolveColormap(GRAY)).toBe(GRAY);
    expect(() => resolveColormap('nope')).toThrow();
  });
});

describe('buildLut', () => {
  it('produces a 256×4 RGBA8 table by default', () => {
    expect(buildLut(GRAY).length).toBe(LUT_SIZE * 4);
  });

  it('maps endpoints to black and white for gray, fully opaque', () => {
    const lut = buildLut(GRAY);
    expect([lut[0], lut[1], lut[2], lut[3]]).toEqual([0, 0, 0, 255]);
    const last = (LUT_SIZE - 1) * 4;
    expect([lut[last], lut[last + 1], lut[last + 2], lut[last + 3]]).toEqual([255, 255, 255, 255]);
  });

  it('is monotonic in luminance for gray', () => {
    const lut = buildLut(GRAY);
    for (let i = 1; i < LUT_SIZE; i++) {
      expect(lut[i * 4]).toBeGreaterThanOrEqual(lut[(i - 1) * 4]);
    }
  });
});
