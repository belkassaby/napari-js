import { describe, it, expect } from 'vitest';
import { selectLevel, levelDims, tileGrid, visibleTiles, worldViewport } from '../src/io/pyramid';

describe('selectLevel', () => {
  it('uses level 0 when zoomed in (≥ 1:1)', () => {
    expect(selectLevel(1, 5)).toBe(0);
    expect(selectLevel(4, 5)).toBe(0);
  });

  it('steps coarser as zoom halves', () => {
    expect(selectLevel(0.5, 5)).toBe(1);
    expect(selectLevel(0.25, 5)).toBe(2);
    expect(selectLevel(0.125, 5)).toBe(3);
  });

  it('clamps to the coarsest available level', () => {
    expect(selectLevel(0.001, 3)).toBe(2);
  });
});

describe('levelDims', () => {
  it('halves per level, rounding up, min 1', () => {
    expect(levelDims(1024, 768, 0)).toEqual({ width: 1024, height: 768 });
    expect(levelDims(1024, 768, 1)).toEqual({ width: 512, height: 384 });
    expect(levelDims(1025, 1, 1)).toEqual({ width: 513, height: 1 });
    expect(levelDims(1, 1, 8)).toEqual({ width: 1, height: 1 });
  });
});

describe('tileGrid', () => {
  it('counts tiles per level', () => {
    expect(tileGrid(1024, 1024, 0, 256)).toEqual({ cols: 4, rows: 4 });
    expect(tileGrid(1024, 1024, 1, 256)).toEqual({ cols: 2, rows: 2 });
    expect(tileGrid(513, 256, 0, 256)).toEqual({ cols: 3, rows: 1 });
  });
});

describe('visibleTiles', () => {
  it('returns tiles overlapping the view, in level-0 coords', () => {
    // Level 0, 256px tiles, view covering the top-left 300×300 → tiles (0,0),(1,0),(0,1),(1,1).
    const tiles = visibleTiles({ x: 0, y: 0, width: 300, height: 300 }, 1024, 1024, 0, 256);
    expect(tiles).toHaveLength(4);
    expect(tiles[0]).toMatchObject({ col: 0, row: 0, x: 0, y: 0, w: 256, h: 256 });
  });

  it('clips edge tiles to the image bounds', () => {
    // 600px wide, 256 tiles → last col is 600-512 = 88px wide.
    const tiles = visibleTiles({ x: 500, y: 0, width: 200, height: 100 }, 600, 100, 0, 256);
    const last = tiles.find((t) => t.col === 2);
    expect(last).toBeDefined();
    expect(last!.w).toBe(600 - 512);
  });

  it('scales tile extents by the level factor', () => {
    // Level 1: each tile covers 256*2 = 512 level-0 units.
    const tiles = visibleTiles({ x: 0, y: 0, width: 10, height: 10 }, 2048, 2048, 1, 256);
    expect(tiles[0]).toMatchObject({ col: 0, row: 0, x: 0, y: 0, w: 512, h: 512 });
  });

  it('returns nothing when the view misses the image', () => {
    expect(visibleTiles({ x: -500, y: -500, width: 100, height: 100 }, 1024, 1024, 0, 256)).toEqual([]);
  });
});

describe('worldViewport', () => {
  it('is centered on the camera and scales inversely with zoom', () => {
    expect(worldViewport(100, 50, 2, 800, 600)).toEqual({ x: 100 - 200, y: 50 - 150, width: 400, height: 300 });
  });
});
