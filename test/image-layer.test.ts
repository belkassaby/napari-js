import { describe, it, expect } from 'vitest';
import { ImageLayer } from '../src/layers/image-layer';
import { VIRIDIS } from '../src/color/colormap';
import type { TypedImageSource } from '../src/io/texture-source';

const gray = (): TypedImageSource => ({
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

describe('ImageLayer', () => {
  it('detects grayscale vs RGBA and defaults the colormap accordingly', () => {
    expect(new ImageLayer(gray()).grayscale).toBe(true);
    expect(new ImageLayer(gray()).colormap?.name).toBe('gray');
    const rgbaLayer = new ImageLayer(rgba());
    expect(rgbaLayer.grayscale).toBe(false);
    expect(rgbaLayer.colormap).toBeNull(); // RGBA rendered directly
  });

  it('bumps colormapVersion and emits on colormap change', () => {
    const layer = new ImageLayer(gray());
    const before = layer.colormapVersion;
    let emits = 0;
    layer.changed.connect(() => emits++);
    layer.colormap = VIRIDIS;
    expect(layer.colormap).toBe(VIRIDIS);
    expect(layer.colormapVersion).toBe(before + 1);
    expect(emits).toBe(1);
  });

  it('ignores colormaps on RGBA layers', () => {
    const layer = new ImageLayer(rgba());
    layer.colormap = VIRIDIS;
    expect(layer.colormap).toBeNull();
  });

  it('sets contrast limits, gamma (ignoring non-positive), invert, interpolation', () => {
    const layer = new ImageLayer(gray());
    layer.contrastLimits = [10, 200];
    expect(layer.contrastLimits).toEqual([10, 200]);
    layer.gamma = 2;
    expect(layer.gamma).toBe(2);
    layer.gamma = 0; // ignored
    expect(layer.gamma).toBe(2);
    layer.invert = true;
    expect(layer.invert).toBe(true);
    layer.interpolation = 'nearest';
    expect(layer.interpolation).toBe('nearest');
  });

  it('clamps opacity (via base Layer) and emits', () => {
    const layer = new ImageLayer(gray());
    let emits = 0;
    layer.changed.connect(() => emits++);
    layer.opacity = 5;
    expect(layer.opacity).toBe(1);
    layer.opacity = -1;
    expect(layer.opacity).toBe(0);
    expect(emits).toBe(2);
  });

  it('uses the dtype range for default contrast limits', () => {
    expect(new ImageLayer(gray()).contrastLimits).toEqual([0, 255]);
  });
});
