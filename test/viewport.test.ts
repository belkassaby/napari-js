import { describe, it, expect } from 'vitest';
import { resolveDrawingBufferSize } from '../src/engine/viewport';

describe('resolveDrawingBufferSize', () => {
  it('scales CSS size by the device pixel ratio', () => {
    expect(resolveDrawingBufferSize(100, 50, 2, 8192)).toEqual({ width: 200, height: 100 });
  });

  it('clamps each dimension to the max texture dimension', () => {
    expect(resolveDrawingBufferSize(10000, 10000, 1, 4096)).toEqual({ width: 4096, height: 4096 });
  });

  it('falls back to dpr=1 when devicePixelRatio is non-positive', () => {
    expect(resolveDrawingBufferSize(100, 100, 0, 8192)).toEqual({ width: 100, height: 100 });
    expect(resolveDrawingBufferSize(100, 100, -3, 8192)).toEqual({ width: 100, height: 100 });
  });

  it('never returns a dimension below 1', () => {
    expect(resolveDrawingBufferSize(0, 0, 1, 8192)).toEqual({ width: 1, height: 1 });
  });

  it('rounds fractional results to integers', () => {
    expect(resolveDrawingBufferSize(100, 100, 1.5, 8192)).toEqual({ width: 150, height: 150 });
    expect(resolveDrawingBufferSize(33, 33, 1.5, 8192)).toEqual({ width: 50, height: 50 });
  });
});
