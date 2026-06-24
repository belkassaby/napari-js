/** A binned intensity histogram over a value range. */
export interface Histogram {
  counts: Uint32Array;
  bins: number;
  min: number;
  max: number;
}

/** Rec.601 luma of an 8-bit RGB triple (0..255). */
export function luminance8(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Histogram of per-pixel luminance over RGBA8 data (alpha ignored), `bins` bins across the
 * 0..255 range. Pure and GPU-free (unit-tested); the viewer feeds it readback pixels.
 */
export function histogramRGBA(data: Uint8ClampedArray | Uint8Array, bins: number): Histogram {
  if (bins < 1) throw new Error('histogram bins must be >= 1.');
  const counts = new Uint32Array(bins);
  const scale = bins / 256;
  for (let i = 0; i + 3 < data.length; i += 4) {
    const l = luminance8(data[i], data[i + 1], data[i + 2]);
    let b = Math.floor(l * scale);
    if (b >= bins) b = bins - 1;
    else if (b < 0) b = 0;
    counts[b]++;
  }
  return { counts, bins, min: 0, max: 255 };
}
