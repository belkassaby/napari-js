import { describe, it, expect } from 'vitest';
import { SurfaceLayer, heightField, SURFACE_VERTEX_FLOATS } from '../src/layers/surface-layer';

// A minimal square (two triangles) with per-vertex values.
const QUAD_VERTS = new Float32Array([0, 0, 0, 2, 0, 0, 2, 4, 0, 0, 4, 0]);
const QUAD_FACES = new Uint32Array([0, 1, 2, 0, 2, 3]);
const QUAD_VALUES = new Float32Array([0, 1, 2, 3]);

describe('SurfaceLayer', () => {
  it('validates vertex / face / value lengths', () => {
    expect(() => new SurfaceLayer(new Float32Array(5), QUAD_FACES)).toThrow(); // not ×3
    expect(() => new SurfaceLayer(QUAD_VERTS, new Uint32Array([0, 1]))).toThrow(); // not ×3
    expect(() => new SurfaceLayer(QUAD_VERTS, QUAD_FACES, new Float32Array(3))).toThrow(); // n≠4
    expect(() => new SurfaceLayer(QUAD_VERTS, QUAD_FACES, QUAD_VALUES)).not.toThrow();
  });

  it('reports vertex/index counts and kind', () => {
    const s = new SurfaceLayer(QUAD_VERTS, QUAD_FACES, QUAD_VALUES);
    expect(s.kind).toBe('surface');
    expect(s.vertexCount).toBe(4);
    expect(s.indexCount).toBe(6);
  });

  it('defaults values to per-vertex z and contrast to the value range', () => {
    // z = 0,0,5,5 → default values equal z, contrast [0,5].
    const verts = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 5, 0, 1, 5]);
    const s = new SurfaceLayer(verts, QUAD_FACES);
    expect(Array.from(s.values)).toEqual([0, 0, 5, 5]);
    expect(s.contrastLimits).toEqual([0, 5]);
  });

  it('defaults blending to opaque and honors option overrides', () => {
    const s = new SurfaceLayer(QUAD_VERTS, QUAD_FACES, QUAD_VALUES);
    expect(s.blending).toBe('opaque');
    const s2 = new SurfaceLayer(QUAD_VERTS, QUAD_FACES, QUAD_VALUES, {
      opacity: 0.5,
      blending: 'translucent',
      contrastLimits: [0, 10],
    });
    expect(s2.opacity).toBe(0.5);
    expect(s2.blending).toBe('translucent');
    expect(s2.contrastLimits).toEqual([0, 10]);
  });

  it('bumps colormapVersion and emits on colormap change', () => {
    const s = new SurfaceLayer(QUAD_VERTS, QUAD_FACES, QUAD_VALUES);
    let n = 0;
    s.changed.connect(() => n++);
    const before = s.colormapVersion;
    s.colormap = 'magma';
    expect(s.colormapVersion).toBe(before + 1);
    expect(n).toBe(1);
  });

  it('computes bounds (min/max/center/radius)', () => {
    const s = new SurfaceLayer(QUAD_VERTS, QUAD_FACES, QUAD_VALUES);
    const b = s.bounds();
    expect(b.min).toEqual([0, 0, 0]);
    expect(b.max).toEqual([2, 4, 0]);
    expect(b.center).toEqual([1, 2, 0]);
    expect(b.radius).toBeCloseTo(0.5 * Math.hypot(2, 4, 0), 5);
  });

  it('interleaves [x,y,z,value] into the GPU vertex buffer', () => {
    const s = new SurfaceLayer(QUAD_VERTS, QUAD_FACES, QUAD_VALUES);
    const data = s.buildVertexData();
    expect(data.length).toBe(4 * SURFACE_VERTEX_FLOATS);
    // vertex 1 = pos (2,0,0), value 1
    expect(Array.from(data.subarray(4, 8))).toEqual([2, 0, 0, 1]);
    // vertex 2 = pos (2,4,0), value 2
    expect(Array.from(data.subarray(8, 12))).toEqual([2, 4, 0, 2]);
  });
});

describe('heightField', () => {
  it('rejects grids smaller than 2×2', () => {
    expect(() => heightField([1], 1, 1)).toThrow();
  });

  it('builds a grid mesh: N=cols*rows vertices, 2 triangles per cell', () => {
    // 3×2 grid → 6 vertices, (3-1)*(2-1)=2 cells → 4 triangles → 12 indices.
    const data = [0, 1, 2, 3, 4, 5];
    const { vertices, faces, values } = heightField(data, 3, 2);
    expect(vertices.length).toBe(6 * 3);
    expect(values.length).toBe(6);
    expect(faces.length).toBe(2 * 6);
    expect(Math.max(...faces)).toBe(5); // indices stay in range
  });

  it('places x=column, y=row and carries raw intensities as values', () => {
    const data = [10, 20, 30, 40]; // 2×2
    const { vertices, values } = heightField(data, 2, 2, { zScale: 0 });
    // vertex order is row-major: (0,0),(1,0),(0,1),(1,1)
    expect([vertices[0], vertices[1]]).toEqual([0, 0]); // col0,row0
    expect([vertices[3], vertices[4]]).toEqual([1, 0]); // col1,row0
    expect([vertices[6], vertices[7]]).toEqual([0, 1]); // col0,row1
    expect(Array.from(values)).toEqual([10, 20, 30, 40]);
  });

  it('normalizes z into [0, zScale] over the data range', () => {
    const data = [0, 0, 0, 100]; // min 0, max 100
    const { vertices } = heightField(data, 2, 2, { zScale: 10 });
    // z is at index 2,5,8,11; the max sample (100) → z = zScale = 10, the min → 0.
    const zs = [vertices[2], vertices[5], vertices[8], vertices[11]];
    expect(Math.min(...zs)).toBe(0);
    expect(Math.max(...zs)).toBeCloseTo(10, 5);
  });

  it('decimates with stride while preserving the extent', () => {
    // 5×5 grid, stride 2 → nodes at columns/rows {0,2,4} → 3×3 = 9 vertices.
    const data = new Array(25).fill(1);
    const { vertices } = heightField(data, 5, 5, { stride: 2 });
    expect(vertices.length).toBe(9 * 3);
    // last vertex x/y should reach the far corner (col 4, row 4).
    expect([vertices[8 * 3], vertices[8 * 3 + 1]]).toEqual([4, 4]);
  });
});
