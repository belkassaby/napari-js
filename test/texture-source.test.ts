import { describe, it, expect } from 'vitest';
import {
  toTextureSource,
  defaultContrastLimits,
  channelsOf,
  isGrayscale,
  type TypedImageSource,
} from '../src/io/texture-source';

const scalar = (dtype: TypedImageSource['dtype'], data: TypedImageSource['data']): TypedImageSource => ({
  kind: 'typed',
  width: 2,
  height: 1,
  channels: 1,
  dtype,
  data,
});

describe('defaultContrastLimits', () => {
  it('uses the dtype range', () => {
    expect(defaultContrastLimits(scalar('uint8', new Uint8Array(2)))).toEqual([0, 255]);
    expect(defaultContrastLimits(scalar('uint16', new Uint16Array(2)))).toEqual([0, 65535]);
    expect(defaultContrastLimits(scalar('float32', new Float32Array(2)))).toEqual([0, 1]);
  });
});

describe('channelsOf / isGrayscale', () => {
  it('reports channels for typed and external sources', () => {
    expect(channelsOf(scalar('uint8', new Uint8Array(2)))).toBe(1);
    expect(isGrayscale(scalar('uint8', new Uint8Array(2)))).toBe(true);
  });
});

describe('toTextureSource', () => {
  it('passes through a typed source unchanged', () => {
    const src = scalar('uint16', new Uint16Array([1, 2]));
    expect(toTextureSource(src)).toBe(src);
  });

  it('wraps an external image-like object', () => {
    const fakeBitmap = { width: 64, height: 32 } as unknown as ImageBitmap;
    const out = toTextureSource(fakeBitmap);
    expect(out).toMatchObject({ kind: 'external', width: 64, height: 32 });
    expect(channelsOf(out)).toBe(4);
  });
});
