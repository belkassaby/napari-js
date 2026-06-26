import { describe, it, expect } from 'vitest';
import { MultiChannelImageView, type ImageLayerHost } from '../src/views/multichannel-image-view';
import { ImageLayer } from '../src/layers/image-layer';
import { toTextureSource, type ImageInput, type TypedImageSource } from '../src/io/texture-source';

/** A GPU-free host that records addImage calls + render/clear counts, mirroring Viewer's shape. */
function makeHost() {
  const added: ImageLayer[] = [];
  const state = { renders: 0, clears: 0 };
  const host: ImageLayerHost = {
    addImage(input: ImageInput, opts) {
      const layer = new ImageLayer(toTextureSource(input), opts);
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

const plane = (): TypedImageSource => ({
  kind: 'typed',
  width: 2,
  height: 2,
  channels: 1,
  dtype: 'uint8',
  data: new Uint8Array(4),
});
const rgba = (): TypedImageSource => ({
  kind: 'typed',
  width: 2,
  height: 2,
  channels: 4,
  dtype: 'uint8',
  data: new Uint8Array(16),
});

describe('MultiChannelImageView — multichannel mode', () => {
  it('builds one additive tinted layer per channel', () => {
    const { host, added, state } = makeHost();
    const view = new MultiChannelImageView(host);
    const layers = view.render('multichannel', [
      { source: plane(), tint: '#ff0000', name: 'red' },
      { source: plane(), tint: '#00ff00' },
    ]);

    expect(view.mode).toBe('multichannel');
    expect(layers).toHaveLength(2);
    expect(view.layers).toHaveLength(2);
    expect(added).toHaveLength(2);
    expect(state.clears).toBe(1);
    expect(state.renders).toBe(1);

    expect(layers[0].grayscale).toBe(true);
    expect(layers[0].blending).toBe('additive');
    expect(layers[0].name).toBe('red');
    expect(layers[0].colormap?.name).toBe('tint-ff0000');
    expect(layers[1].name).toBe('ch1'); // default name from channel index
    expect(layers[1].colormap?.name).toBe('tint-00ff00');
    expect(layers[0].contrastLimits).toEqual([0, 255]); // default window
  });

  it('updateChannel re-tints + applies contrast/gamma/visible/invert live', () => {
    const { host, state } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('multichannel', [{ source: plane(), tint: '#ffffff' }]);
    const before = state.renders;

    view.updateChannel(0, {
      tint: '#0000ff',
      contrastLimits: [10, 200],
      gamma: 2,
      visible: false,
      invert: true,
    });
    const layer = view.layers[0];
    expect(layer.colormap?.name).toBe('tint-0000ff');
    expect(layer.contrastLimits).toEqual([10, 200]);
    expect(layer.gamma).toBe(2);
    expect(layer.visible).toBe(false);
    expect(layer.invert).toBe(true);
    expect(state.renders).toBe(before + 1);
  });
});

describe('MultiChannelImageView — grayscale mode', () => {
  it('builds a single colormapped layer', () => {
    const { host, added } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('grayscale', [{ source: plane(), colormap: 'viridis' }]);
    expect(view.mode).toBe('grayscale');
    expect(added).toHaveLength(1);
    expect(view.layers[0].colormap?.name).toBe('viridis');
  });

  it('defaults the colormap to gray', () => {
    const { host } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('grayscale', [{ source: plane() }]);
    expect(view.layers[0].colormap?.name).toBe('gray');
  });

  it('updateChannel applies a new colormap', () => {
    const { host } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('grayscale', [{ source: plane(), colormap: 'gray' }]);
    view.updateChannel(0, { colormap: 'magma' });
    expect(view.layers[0].colormap?.name).toBe('magma');
  });
});

describe('MultiChannelImageView — rgb mode', () => {
  it('builds a single direct RGBA layer with no colormap', () => {
    const { host } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('rgb', [{ source: rgba() }]);
    expect(view.mode).toBe('rgb');
    expect(view.layers).toHaveLength(1);
    expect(view.layers[0].grayscale).toBe(false);
    expect(view.layers[0].colormap).toBeNull();
  });
});

describe('MultiChannelImageView — lifecycle + options', () => {
  it('clears prior layers on re-render', () => {
    const { host, state } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('multichannel', [
      { source: plane(), tint: '#ff0000' },
      { source: plane(), tint: '#00ff00' },
    ]);
    view.render('grayscale', [{ source: plane() }]);
    expect(state.clears).toBe(2);
    expect(view.layers).toHaveLength(1);
    expect(view.mode).toBe('grayscale');
  });

  it('passes interpolation + per-channel scale through to the layers', () => {
    const { host } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('grayscale', [{ source: plane(), scale: [4, 4] }], { interpolation: 'linear' });
    expect(view.interpolation).toBe('linear');
    expect(view.layers[0].interpolation).toBe('linear');
    expect(view.layers[0].scale).toEqual([4, 4]);
  });

  it('setInterpolation updates every live layer', () => {
    const { host } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('multichannel', [
      { source: plane(), tint: '#ff0000' },
      { source: plane(), tint: '#00ff00' },
    ]);
    view.setInterpolation('linear');
    expect(view.layers.every((l) => l.interpolation === 'linear')).toBe(true);
  });

  it('updateChannel is a no-op for an out-of-range index', () => {
    const { host } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('grayscale', [{ source: plane() }]);
    expect(() => view.updateChannel(5, { gamma: 3 })).not.toThrow();
  });

  it('clear() removes layers and resets the mode', () => {
    const { host, state } = makeHost();
    const view = new MultiChannelImageView(host);
    view.render('grayscale', [{ source: plane() }]);
    view.clear();
    expect(view.layers).toHaveLength(0);
    expect(view.mode).toBeNull();
    expect(state.clears).toBe(2); // one on render, one on clear
  });
});
