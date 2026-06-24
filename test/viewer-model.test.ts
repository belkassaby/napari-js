import { describe, it, expect } from 'vitest';
import { ViewerModel } from '../src/scene/viewer-model';
import { PointsLayer } from '../src/layers/points-layer';

describe('ViewerModel', () => {
  it('exposes layers, camera, camera3d, and dims', () => {
    const m = new ViewerModel();
    expect(m.layers.length).toBe(0);
    expect(m.camera.zoom).toBeGreaterThan(0);
    expect(m.dims.ndisplay).toBe(2);
    expect(m.camera3d.distance).toBeGreaterThan(0);
  });

  it('bubbles layer-list, camera, dims, and per-layer changes into `changed`', () => {
    const m = new ViewerModel();
    let n = 0;
    m.changed.connect(() => n++);

    const layer = new PointsLayer([[0, 0]]);
    m.layers.add(layer);
    const afterAdd = n;
    expect(afterAdd).toBeGreaterThan(0);

    layer.opacity = 0.5; // per-layer change bubbles
    expect(n).toBeGreaterThan(afterAdd);

    const beforeCamera = n;
    m.camera.zoom = 3;
    m.camera3d.orbit(0.1, 0);
    m.dims.ndisplay = 3;
    expect(n).toBeGreaterThan(beforeCamera);
  });

  it('stops bubbling a layer after it is removed', () => {
    const m = new ViewerModel();
    const layer = new PointsLayer([[0, 0]]);
    m.layers.add(layer);
    let n = 0;
    m.changed.connect(() => n++);
    m.layers.remove(layer);
    const afterRemove = n;
    layer.opacity = 0.1; // disposer detached → no longer bubbles
    expect(n).toBe(afterRemove);
  });
});
