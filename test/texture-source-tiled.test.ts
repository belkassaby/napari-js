import { describe, it, expect } from 'vitest';
import {
  toTextureSource,
  depthOf,
  channelsOf,
  defaultContrastLimits,
  type TiledSource,
} from '../src/io/texture-source';

const tiled = (over: Partial<TiledSource> = {}): TiledSource => ({
  kind: 'tiled',
  width: 1024,
  height: 1024,
  tileSize: 256,
  levels: 3,
  depth: 5,
  channels: 1,
  dtype: 'uint16',
  fetchTile: () => Promise.resolve({ width: 1, height: 1, data: new Uint8Array(1) }),
  ...over,
});

describe('tiled source helpers', () => {
  it('passes a tiled source through toTextureSource unchanged', () => {
    const t = tiled();
    expect(toTextureSource(t)).toBe(t);
  });

  it('reports depth for tiled sources and 1 otherwise', () => {
    expect(depthOf(tiled({ depth: 7 }))).toBe(7);
    const single = toTextureSource({
      kind: 'typed',
      width: 2,
      height: 1,
      channels: 1,
      dtype: 'uint8',
      data: new Uint8Array(2),
    });
    expect(depthOf(single)).toBe(1);
  });

  it('reads channels and dtype-based contrast for tiled sources', () => {
    expect(channelsOf(tiled({ channels: 4 }))).toBe(4);
    expect(defaultContrastLimits(tiled({ dtype: 'uint16' }))).toEqual([0, 65535]);
    expect(defaultContrastLimits(tiled({ dtype: 'float32' }))).toEqual([0, 1]);
  });
});
