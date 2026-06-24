/**
 * Pixel ingestion for NJ-1: a single full-resolution image (no tiling — that arrives in
 * NJ-3 as a pyramidal `TiledSource`). A source is either raw typed-array pixels or an
 * external decoded image (ImageBitmap/canvas) uploaded via `copyExternalImageToTexture`.
 */

export type PixelDtype = 'uint8' | 'float32';

/** Raw scalar/RGBA pixels in a typed array. NJ-1 renders `uint8`; `float32`/16-bit = NJ-2. */
export interface TypedImageSource {
  readonly kind: 'typed';
  readonly width: number;
  readonly height: number;
  readonly channels: 1 | 4;
  readonly dtype: PixelDtype;
  readonly data: Uint8Array | Float32Array;
}

/** A decoded image to upload directly to an RGBA8 texture. */
export interface ExternalImageSource {
  readonly kind: 'external';
  readonly width: number;
  readonly height: number;
  readonly image: ImageBitmap | HTMLCanvasElement | OffscreenCanvas | HTMLImageElement;
}

export type TextureSource = TypedImageSource | ExternalImageSource;

/** Anything `Viewer.addImage` accepts. */
export type ImageInput = TypedImageSource | ImageBitmap | HTMLCanvasElement | HTMLImageElement;

export function channelsOf(source: TextureSource): 1 | 4 {
  return source.kind === 'typed' ? source.channels : 4;
}

export function isGrayscale(source: TextureSource): boolean {
  return channelsOf(source) === 1;
}

/** Default contrast-limit window for a source, in source-data units. */
export function defaultContrastLimits(source: TextureSource): [number, number] {
  if (source.kind === 'typed' && source.dtype === 'float32') return [0, 1];
  return [0, 255];
}

/** Normalize a user input into a {@link TextureSource}. */
export function toTextureSource(input: ImageInput): TextureSource {
  if (typeof input === 'object' && 'kind' in input && input.kind === 'typed') {
    return input;
  }
  const image = input as ImageBitmap | HTMLCanvasElement | HTMLImageElement;
  const width = 'width' in image ? Number(image.width) : 0;
  const height = 'height' in image ? Number(image.height) : 0;
  return { kind: 'external', width, height, image };
}
