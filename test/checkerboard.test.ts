import { describe, it, expect } from 'vitest';
import { makeCheckerboard } from '../src/color/checkerboard';

describe('makeCheckerboard', () => {
  it('produces an RGBA buffer of size*size*4 bytes', () => {
    expect(makeCheckerboard(16, 4).length).toBe(16 * 16 * 4);
  });

  it('is fully opaque', () => {
    const data = makeCheckerboard(8, 2);
    for (let i = 3; i < data.length; i += 4) {
      expect(data[i]).toBe(255);
    }
  });

  it('alternates adjacent cells when cell size is 1px', () => {
    const size = 8;
    const data = makeCheckerboard(size, size); // cell = 1px
    const red = (x: number, y: number) => data[(y * size + x) * 4];
    expect(red(0, 0)).not.toBe(red(1, 0));
    expect(red(0, 0)).toBe(red(1, 1)); // diagonal neighbours match
  });

  it('clamps the cell size to at least 1px for large `cells`', () => {
    // cells > size would give cell=0 without the guard; assert it still fills the buffer.
    expect(() => makeCheckerboard(4, 100)).not.toThrow();
    expect(makeCheckerboard(4, 100).length).toBe(4 * 4 * 4);
  });
});
