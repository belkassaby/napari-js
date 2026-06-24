import { describe, it, expect } from 'vitest';
import { windowGamma, mapScalar, additiveComposite } from '../src/color/display-pipeline';
import { GRAY, RED, GREEN } from '../src/color/colormap';

describe('windowGamma', () => {
  it('maps the window endpoints to 0 and 1', () => {
    expect(windowGamma(0, 0, 255, 1, false)).toBe(0);
    expect(windowGamma(255, 0, 255, 1, false)).toBe(1);
    expect(windowGamma(128, 0, 256, 1, false)).toBeCloseTo(0.5, 5);
  });

  it('windows in native units (e.g. 16-bit)', () => {
    expect(windowGamma(32768, 0, 65535, 1, false)).toBeCloseTo(0.5, 3);
    // A tight window on 16-bit data: below/above clip to 0/1.
    expect(windowGamma(900, 1000, 2000, 1, false)).toBe(0);
    expect(windowGamma(2500, 1000, 2000, 1, false)).toBe(1);
    expect(windowGamma(1500, 1000, 2000, 1, false)).toBeCloseTo(0.5, 5);
  });

  it('applies invert then gamma', () => {
    expect(windowGamma(0, 0, 255, 1, true)).toBe(1);
    expect(windowGamma(255, 0, 255, 1, true)).toBe(0);
    // gamma 2 on t=0.5 → 0.25
    expect(windowGamma(128, 0, 256, 2, false)).toBeCloseTo(0.25, 3);
  });
});

describe('mapScalar', () => {
  it('routes the windowed value through the colormap', () => {
    const mid = mapScalar(128, { climLo: 0, climHi: 256, gamma: 1, invert: false, colormap: GRAY });
    expect(mid[0]).toBeCloseTo(0.5, 5);
  });
});

describe('additiveComposite', () => {
  it('sums channel contributions', () => {
    expect(additiveComposite([RED.sample(1), GREEN.sample(1)])).toEqual([1, 1, 0]);
  });

  it('clamps to 1', () => {
    expect(additiveComposite([[0.8, 0, 0], [0.5, 0, 0]])).toEqual([1, 0, 0]);
  });

  it('is black for no channels', () => {
    expect(additiveComposite([])).toEqual([0, 0, 0]);
  });
});
