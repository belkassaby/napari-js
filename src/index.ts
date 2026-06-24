// Public API barrel.

// Viewer + device
export { Viewer } from './viewer';
export type { ViewerOptions } from './viewer';
export { acquireDevice, WebGPUUnsupportedError } from './engine/device';
export type { DeviceContext, DeviceFeatures } from './engine/device';

// Model
export { ViewerModel } from './scene/viewer-model';
export { LayerList } from './scene/layer-list';
export { Camera } from './camera/camera';
export { Layer } from './layers/layer';
export type { BlendMode } from './layers/layer';
export { ImageLayer } from './layers/image-layer';
export type { ImageLayerOptions, Interpolation } from './layers/image-layer';

// Color
export { Colormap, resolveColormap, NAMED_COLORMAPS, GRAY, RED, GREEN, BLUE, VIRIDIS, MAGMA } from './color/colormap';
export type { RGB, ColorStop } from './color/colormap';
export { buildLut, LUT_SIZE } from './color/lut';
export { windowGamma, mapScalar, additiveComposite } from './color/display-pipeline';

// Data sources
export { toTextureSource, defaultContrastLimits, isGrayscale, channelsOf } from './io/texture-source';
export type { TextureSource, TypedImageSource, ExternalImageSource, ImageInput, PixelDtype } from './io/texture-source';

export { VERSION } from './version';
