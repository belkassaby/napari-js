import { describe, it, expect } from 'vitest';
import { MultiChannelVolumeView, type VolumeHost } from '../src/views/multichannel-volume-view';
import { VolumeLayer } from '../src/layers/volume-layer';
import { reverseColormap, GRAY, tintColormap } from '../src/color/colormap';

/** GPU-free host that builds real VolumeLayers + records render/clear counts. */
function makeHost() {
  const added: VolumeLayer[] = [];
  const state = { renders: 0, clears: 0 };
  const host: VolumeHost = {
    addVolume(data, w, h, d, opts) {
      const layer = new VolumeLayer(data, w, h, d, opts);
      added.push(layer);
      return layer;
    },
    layers: {
      clear() {
        state.clears++;
      },
    },
    requestRender() {
      state.renders++;
    },
  };
  return { host, added, state };
}

const vol = (n = 8): { data: Uint8Array; width: number; height: number; depth: number } => ({
  data: new Uint8Array(n * n * n),
  width: n,
  height: n,
  depth: n,
});

describe('reverseColormap', () => {
  it('flips every stop t → 1 - t', () => {
    const r = reverseColormap(GRAY);
    expect(r.sample(0)).toEqual([1, 1, 1]); // was black at 0
    expect(r.sample(1)).toEqual([0, 0, 0]);
    expect(r.name).toContain('reversed');
  });
  it('resolves a named colormap first', () => {
    expect(() => reverseColormap('viridis')).not.toThrow();
  });
});

describe('MultiChannelVolumeView — multichannel', () => {
  it('builds one additive tinted volume per channel', () => {
    const { host, added, state } = makeHost();
    const view = new MultiChannelVolumeView(host);
    const layers = view.render(
      'multichannel',
      [
        { ...vol(), tint: '#ff0000' },
        { ...vol(), tint: '#00ff00' },
      ],
      { rendering: 'iso' },
    );
    expect(view.mode).toBe('multichannel');
    expect(layers).toHaveLength(2);
    expect(added).toHaveLength(2);
    expect(state.clears).toBe(1);
    expect(layers[0].blending).toBe('additive');
    expect(layers[0].rendering).toBe('iso');
    expect(layers[0].colormap.name).toBe('tint-ff0000');
  });

  it('updateChannel re-tints + applies window/gamma/visibility', () => {
    const { host } = makeHost();
    const view = new MultiChannelVolumeView(host);
    view.render('multichannel', [{ ...vol(), tint: '#ffffff' }]);
    view.updateChannel(0, {
      colormap: tintColormap('#0000ff'),
      contrastLimits: [10, 200],
      gamma: 2,
      visible: false,
    });
    const layer = view.layers[0];
    expect(layer.colormap.name).toBe('tint-0000ff');
    expect(layer.contrastLimits).toEqual([10, 200]);
    expect(layer.gamma).toBe(2);
    expect(layer.visible).toBe(false);
  });
});

describe('MultiChannelVolumeView — grayscale + lifecycle', () => {
  it('uses a single colormapped volume', () => {
    const { host, added } = makeHost();
    const view = new MultiChannelVolumeView(host);
    view.render('grayscale', [{ ...vol(), colormap: 'viridis' }, { ...vol() }]);
    expect(view.layers).toHaveLength(1); // only the first channel
    expect(added).toHaveLength(1);
    expect(view.layers[0].colormap.name).toBe('viridis');
  });

  it('setRendering updates all layers; clear resets', () => {
    const { host, state } = makeHost();
    const view = new MultiChannelVolumeView(host);
    view.render('multichannel', [
      { ...vol(), tint: '#ff0000' },
      { ...vol(), tint: '#00ff00' },
    ]);
    view.setRendering('mip');
    expect(view.layers.every((l) => l.rendering === 'mip')).toBe(true);
    view.clear();
    expect(view.layers).toHaveLength(0);
    expect(view.mode).toBeNull();
    expect(state.clears).toBe(2);
  });
});
