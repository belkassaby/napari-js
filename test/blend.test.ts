import { describe, it, expect } from 'vitest';
import { blendStateFor } from '../src/visuals/blend';

describe('blendStateFor', () => {
  it('disables blending for opaque', () => {
    expect(blendStateFor('opaque')).toBeUndefined();
  });

  it('translucent is premultiplied src-over', () => {
    const b = blendStateFor('translucent')!;
    expect(b.color).toMatchObject({
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    });
    expect(b.alpha).toMatchObject({
      srcFactor: 'one',
      dstFactor: 'one-minus-src-alpha',
      operation: 'add',
    });
  });

  it('additive accumulates (one/one add)', () => {
    const b = blendStateFor('additive')!;
    expect(b.color).toMatchObject({ srcFactor: 'one', dstFactor: 'one', operation: 'add' });
  });

  it('minimum uses the min operation', () => {
    const b = blendStateFor('minimum')!;
    expect(b.color.operation).toBe('min');
    expect(b.alpha.operation).toBe('min');
  });
});
