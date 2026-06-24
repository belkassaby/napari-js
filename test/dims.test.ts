import { describe, it, expect } from 'vitest';
import { Dims } from '../src/scene/dims';

describe('Dims', () => {
  it('clamps z to [0, depth-1]', () => {
    const d = new Dims();
    d.depth = 10;
    d.z = 5;
    expect(d.z).toBe(5);
    d.z = 100;
    expect(d.z).toBe(9);
    d.z = -3;
    expect(d.z).toBe(0);
  });

  it('re-clamps z when depth shrinks', () => {
    const d = new Dims();
    d.depth = 10;
    d.z = 9;
    d.depth = 4;
    expect(d.z).toBe(3);
  });

  it('emits changed on z and depth changes, but not on a no-op z set', () => {
    const d = new Dims();
    d.depth = 5;
    let count = 0;
    d.changed.connect(() => count++);
    d.z = 2; // change
    d.z = 2; // no-op → no emit
    d.depth = 8; // change
    expect(count).toBe(2);
  });

  it('defaults to a single slice in 2D', () => {
    const d = new Dims();
    expect(d.depth).toBe(1);
    expect(d.z).toBe(0);
    expect(d.ndisplay).toBe(2);
  });
});
