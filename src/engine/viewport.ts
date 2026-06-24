/**
 * Resolve the backing drawing-buffer size from a canvas's CSS size and the device pixel
 * ratio, clamped to the GPU's maximum 2D texture dimension. Pure and GPU-free so it can be
 * unit-tested directly.
 *
 * - Non-positive `devicePixelRatio` falls back to 1.
 * - Each dimension is clamped to `[1, maxDimension]` and rounded to an integer.
 */
export function resolveDrawingBufferSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
  maxDimension: number,
): { width: number; height: number } {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    width: clampDim(Math.round(cssWidth * dpr), maxDimension),
    height: clampDim(Math.round(cssHeight * dpr), maxDimension),
  };
}

function clampDim(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, Math.max(1, max));
}
