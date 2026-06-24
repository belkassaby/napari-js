/**
 * Generate an `size`×`size` RGBA8 checkerboard with `cells` squares per side. Used by the
 * NJ-0 demo to prove texture upload + sampling. Pure and GPU-free (unit-tested).
 */
export function makeCheckerboard(size: number, cells = 8) {
  const data = new Uint8Array(size * size * 4);
  const cell = Math.max(1, Math.floor(size / cells));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = ((Math.floor(x / cell) + Math.floor(y / cell)) & 1) === 0;
      const i = (y * size + x) * 4;
      // Warm vs cool squares so sampling/orientation is visually obvious.
      data[i] = on ? 235 : 35;
      data[i + 1] = on ? 130 : 45;
      data[i + 2] = on ? 60 : 70;
      data[i + 3] = 255;
    }
  }
  return data;
}
