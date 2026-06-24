// Public API barrel.

// Viewer + device
export { Viewer } from './viewer';
export type { ViewerOptions } from './viewer';
export { acquireDevice, WebGPUUnsupportedError } from './engine/device';
export type { DeviceContext, DeviceFeatures } from './engine/device';
export type { PixelData } from './engine/readback';

// Readback / analysis
export { histogramRGBA, luminance8 } from './color/histogram';
export type { Histogram } from './color/histogram';

// Model
export { ViewerModel } from './scene/viewer-model';
export { LayerList } from './scene/layer-list';
export { Dims } from './scene/dims';
export { Camera } from './camera/camera';
export { Layer } from './layers/layer';
export type { BlendMode } from './layers/layer';
export { ImageLayer } from './layers/image-layer';
export type { ImageLayerOptions, Interpolation } from './layers/image-layer';
export { PointsLayer } from './layers/points-layer';
export type { PointsLayerOptions, PointSymbol, RGBA } from './layers/points-layer';
export { LabelsLayer } from './layers/labels-layer';
export type { LabelsLayerOptions } from './layers/labels-layer';
export { nearestPointIndex } from './picking/pick';

// Color
export { Colormap, resolveColormap, NAMED_COLORMAPS, GRAY, RED, GREEN, BLUE, VIRIDIS, MAGMA } from './color/colormap';
export type { RGB, ColorStop } from './color/colormap';
export { buildLut, LUT_SIZE } from './color/lut';
export { buildLabelLut } from './color/label-colormap';
export { windowGamma, mapScalar, additiveComposite } from './color/display-pipeline';

// Data sources
export { toTextureSource, defaultContrastLimits, isGrayscale, channelsOf, depthOf } from './io/texture-source';
export type {
  TextureSource, TypedImageSource, ExternalImageSource, TiledSource,
  TileKey, PixelChunk, ImageInput, PixelDtype,
} from './io/texture-source';

// Pyramid / tiling helpers
export { selectLevel, levelScale, levelDims, tileGrid, visibleTiles, worldViewport } from './io/pyramid';
export type { Rect, VisibleTile } from './io/pyramid';
export { LruCache } from './cache/lru';

export { VERSION } from './version';
