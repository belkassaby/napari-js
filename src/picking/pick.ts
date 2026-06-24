/**
 * Index of the point whose marker contains `(x, y)` (data coords), nearest center wins, or
 * -1 if none. `sizeAt(i)` returns marker diameter in data units. Pure and GPU-free — the CPU
 * hit-test for point picking (GPU id-buffer picking can come later if needed).
 */
export function nearestPointIndex(
  positions: Float32Array,
  sizeAt: (i: number) => number,
  x: number,
  y: number,
): number {
  let best = -1;
  let bestD2 = Infinity;
  const n = positions.length >> 1;
  for (let i = 0; i < n; i++) {
    const dx = positions[i * 2] - x;
    const dy = positions[i * 2 + 1] - y;
    const d2 = dx * dx + dy * dy;
    const r = sizeAt(i) / 2;
    if (d2 <= r * r && d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}
