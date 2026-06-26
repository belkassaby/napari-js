/** An axis-aligned rectangle in level-0 (full-resolution) data coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A visible tile plus its rect in level-0 data coordinates (so the camera is uniform). */
export interface VisibleTile {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Downsample factor of a pyramid level — level-0 units per level pixel. With `scales` it's the
 * explicit factor for `level` (arbitrary, non-power-of-two pyramids such as Bio-Formats); without
 * it the classic power-of-two default (level 0 = 1, level 1 = 2, …). `scales` is expected ascending
 * (level 0 finest = smallest factor).
 */
export function levelScale(level: number, scales?: readonly number[]): number {
  const s = scales?.[level];
  return s != null && s > 0 ? s : 2 ** level;
}

/** Pixel dimensions of a pyramid level. */
export function levelDims(
  width: number,
  height: number,
  level: number,
  scales?: readonly number[],
): { width: number; height: number } {
  const s = levelScale(level, scales);
  return { width: Math.max(1, Math.ceil(width / s)), height: Math.max(1, Math.ceil(height / s)) };
}

/** Tile grid (cols × rows) at a level. */
export function tileGrid(
  width: number,
  height: number,
  level: number,
  tileSize: number,
  scales?: readonly number[],
): { cols: number; rows: number } {
  const d = levelDims(width, height, level, scales);
  return { cols: Math.ceil(d.width / tileSize), rows: Math.ceil(d.height / tileSize) };
}

/**
 * Choose the pyramid level whose texels are ≈1 screen pixel for `zoom` (CSS px per level-0
 * unit). With `scales`, pick the coarsest level whose downsample factor doesn't under-sample the
 * screen (factor ≤ 1/zoom); without it, the power-of-two default (each halving of zoom steps one
 * level coarser). Clamped to `[0, levels-1]`.
 */
export function selectLevel(zoom: number, levels: number, scales?: readonly number[]): number {
  if (scales && scales.length) {
    const inv = 1 / Math.max(zoom, 1e-9); // level-0 units per screen pixel
    let best = 0;
    for (let l = 0; l < scales.length && l < levels; l++) {
      if (scales[l] <= inv) best = l;
      else break; // ascending → no finer-than-needed level beyond here
    }
    return Math.min(levels - 1, Math.max(0, best));
  }
  const raw = Math.floor(Math.log2(1 / Math.max(zoom, 1e-9)));
  return Math.min(levels - 1, Math.max(0, raw));
}

/** The level-0 data rectangle currently visible for a camera and CSS viewport size. */
export function worldViewport(
  centerX: number,
  centerY: number,
  zoom: number,
  vw: number,
  vh: number,
): Rect {
  const hw = vw / 2 / Math.max(zoom, 1e-9);
  const hh = vh / 2 / Math.max(zoom, 1e-9);
  return { x: centerX - hw, y: centerY - hh, width: 2 * hw, height: 2 * hh };
}

/**
 * Tiles of `level` that overlap `view` (level-0 coords), with each tile's rect in level-0
 * coords (edge tiles clipped to the image bounds). Empty when the view misses the image.
 */
export function visibleTiles(
  view: Rect,
  width: number,
  height: number,
  level: number,
  tileSize: number,
  scales?: readonly number[],
): VisibleTile[] {
  const tw = tileSize * levelScale(level, scales);
  const { cols, rows } = tileGrid(width, height, level, tileSize, scales);

  const x0 = Math.max(0, view.x);
  const y0 = Math.max(0, view.y);
  const x1 = Math.min(width, view.x + view.width);
  const y1 = Math.min(height, view.y + view.height);
  if (x1 <= x0 || y1 <= y0) return [];

  const c0 = Math.max(0, Math.floor(x0 / tw));
  const c1 = Math.min(cols - 1, Math.floor((x1 - 1e-6) / tw));
  const r0 = Math.max(0, Math.floor(y0 / tw));
  const r1 = Math.min(rows - 1, Math.floor((y1 - 1e-6) / tw));

  const tiles: VisibleTile[] = [];
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const x = col * tw;
      const y = row * tw;
      tiles.push({ col, row, x, y, w: Math.min(tw, width - x), h: Math.min(tw, height - y) });
    }
  }
  return tiles;
}
