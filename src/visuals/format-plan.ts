import type { PixelDtype } from '../io/texture-source';

/** How a scalar/RGBA source maps onto a GPU texture (shared by single-image and tiled paths). */
export interface FormatPlan {
  format: GPUTextureFormat;
  bytesPerPixel: number;
  /** Whether the texture can be linearly filtered (drives sampler + bind-group layout). */
  filterable: boolean;
  /** Factor applied to contrast limits so they match the shader's sample space. */
  sampleScale: number;
  isRgba: boolean;
}

/**
 * Pick the texture plan for given channels/dtype. uint8 scalar → `r8unorm`; RGBA(uint8) →
 * `rgba8unorm` (both normalized, so clim scales by 1/255); uint16/float32 scalar → `r32float`
 * with native-unit windowing (clim scale 1), filterable only when `float32Filterable`.
 */
export function formatPlanFor(
  channels: 1 | 4,
  dtype: PixelDtype,
  float32Filterable: boolean,
): FormatPlan {
  if (channels === 4) {
    return { format: 'rgba8unorm', bytesPerPixel: 4, filterable: true, sampleScale: 1 / 255, isRgba: true };
  }
  if (dtype === 'uint8') {
    return { format: 'r8unorm', bytesPerPixel: 1, filterable: true, sampleScale: 1 / 255, isRgba: false };
  }
  return { format: 'r32float', bytesPerPixel: 4, filterable: float32Filterable, sampleScale: 1, isRgba: false };
}

/** Convert tile/image pixels to the upload representation for `format` (uint16 → float32). */
export function toUploadData(
  data: Uint8Array | Uint16Array | Float32Array,
  format: GPUTextureFormat,
): Uint8Array | Float32Array {
  if (format === 'r32float' && !(data instanceof Float32Array)) {
    return Float32Array.from(data);
  }
  return data as Uint8Array | Float32Array;
}
