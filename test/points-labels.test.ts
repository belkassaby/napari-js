import { describe, it, expect } from 'vitest';
import { PointsLayer } from '../src/layers/points-layer';
import { LabelsLayer } from '../src/layers/labels-layer';
import { nearestPointIndex } from '../src/picking/pick';
import { buildLabelLut } from '../src/color/label-colormap';

describe('PointsLayer.buildInstanceData', () => {
  it('broadcasts a single size/color and lays out 12 floats per point', () => {
    const p = new PointsLayer(
      [
        [10, 20],
        [30, 40],
      ],
      { size: 8, faceColor: [1, 0, 0, 1] },
    );
    const d = p.buildInstanceData();
    expect(d.length).toBe(2 * 12);
    expect([d[0], d[1], d[2]]).toEqual([10, 20, 8]); // pos + size
    expect([d[3], d[4], d[5], d[6]]).toEqual([1, 0, 0, 1]); // face
    expect(d[12]).toBe(30); // second point x (stride = 12 floats)
  });

  it('uses per-point size and color arrays', () => {
    const p = new PointsLayer(
      [
        [0, 0],
        [1, 1],
      ],
      {
        size: [4, 9],
        faceColor: [
          [1, 0, 0, 1],
          [0, 1, 0, 1],
        ],
      },
    );
    expect(p.sizeAt(0)).toBe(4);
    expect(p.sizeAt(1)).toBe(9);
    const d = p.buildInstanceData();
    expect(d[12 + 3]).toBe(0); // second face r
    expect(d[12 + 4]).toBe(1); // second face g
  });

  it('bumps dataVersion when structural props change', () => {
    const p = new PointsLayer([[0, 0]]);
    const v = p.dataVersion;
    p.size = 20;
    expect(p.dataVersion).toBe(v + 1);
  });
});

describe('nearestPointIndex', () => {
  const positions = new Float32Array([0, 0, 100, 0, 100, 100]);
  const sizeAt = (): number => 20; // radius 10

  it('returns the point whose marker contains the query, nearest center', () => {
    expect(nearestPointIndex(positions, sizeAt, 3, 4)).toBe(0); // within radius 10 of (0,0)
    expect(nearestPointIndex(positions, sizeAt, 98, 1)).toBe(1);
  });

  it('returns -1 when nothing is hit', () => {
    expect(nearestPointIndex(positions, sizeAt, 50, 50)).toBe(-1);
  });
});

describe('LabelsLayer.labelAt', () => {
  it('reads the id at a pixel and 0 out of bounds', () => {
    const data = new Uint8Array(4); // 2x2
    data[0] = 0;
    data[1] = 5;
    data[2] = 7;
    data[3] = 9;
    const layer = new LabelsLayer(data, 2, 2);
    expect(layer.labelAt(1, 0)).toBe(5);
    expect(layer.labelAt(0, 1)).toBe(7);
    expect(layer.labelAt(-1, 0)).toBe(0);
    expect(layer.labelAt(5, 5)).toBe(0);
  });

  it('rejects undersized data', () => {
    expect(() => new LabelsLayer(new Uint8Array(3), 2, 2)).toThrow();
  });
});

describe('buildLabelLut', () => {
  it('is size×4 with a transparent background entry and opaque rest', () => {
    const lut = buildLabelLut(256);
    expect(lut.length).toBe(256 * 4);
    expect(lut[3]).toBe(0); // entry 0 alpha
    expect(lut[7]).toBe(255); // entry 1 alpha
  });

  it('gives distinct colors to adjacent ids', () => {
    const lut = buildLabelLut(256);
    const c1 = [lut[4], lut[5], lut[6]];
    const c2 = [lut[8], lut[9], lut[10]];
    expect(c1).not.toEqual(c2);
  });
});
