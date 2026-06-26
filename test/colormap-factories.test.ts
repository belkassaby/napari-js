import { describe, it, expect } from 'vitest';
import { colormapFromLut, tintColormap } from '../src/color/colormap';

describe('colormapFromLut', () => {
  it('builds evenly spaced stops and normalizes bytes to 0..1', () => {
    const cmap = colormapFromLut('lut', [
      [0, 0, 0],
      [255, 128, 0],
    ]);
    expect(cmap.name).toBe('lut');
    expect(cmap.stops).toHaveLength(2);
    expect(cmap.stops[0]).toEqual({ t: 0, color: [0, 0, 0] });
    expect(cmap.stops[1].t).toBe(1);
    expect(cmap.stops[1].color[0]).toBe(1);
    expect(cmap.stops[1].color[1]).toBeCloseTo(128 / 255, 6);
    expect(cmap.stops[1].color[2]).toBe(0);
  });

  it('spaces N stops at i/(N-1)', () => {
    const cmap = colormapFromLut('triple', [
      [0, 0, 0],
      [128, 128, 128],
      [255, 255, 255],
    ]);
    expect(cmap.stops.map((s) => s.t)).toEqual([0, 0.5, 1]);
    expect(cmap.sample(0.5)).toEqual([128 / 255, 128 / 255, 128 / 255]);
  });

  it('honours a custom maxValue (e.g. a 0..1 LUT)', () => {
    const cmap = colormapFromLut(
      'unit',
      [
        [0, 0, 0],
        [1, 1, 1],
      ],
      1,
    );
    expect(cmap.sample(1)).toEqual([1, 1, 1]);
  });

  it('throws on fewer than two entries', () => {
    expect(() => colormapFromLut('bad', [[0, 0, 0]])).toThrow();
  });
});

describe('tintColormap', () => {
  it('ramps black → the given #rrggbb tint', () => {
    const cmap = tintColormap('#ff8000');
    expect(cmap.name).toBe('tint-ff8000');
    expect(cmap.sample(0)).toEqual([0, 0, 0]);
    const top = cmap.sample(1);
    expect(top[0]).toBe(1);
    expect(top[1]).toBeCloseTo(128 / 255, 6);
    expect(top[2]).toBe(0);
  });

  it('accepts a 3-digit hex and a missing leading #', () => {
    expect(tintColormap('0f0').sample(1)).toEqual([0, 1, 0]);
    expect(tintColormap('00ff00').sample(1)).toEqual([0, 1, 0]);
  });

  it('defaults an empty value to white and bad digits to 0', () => {
    expect(tintColormap('').sample(1)).toEqual([1, 1, 1]);
    expect(tintColormap('#zzzzzz').sample(1)).toEqual([0, 0, 0]);
  });
});
