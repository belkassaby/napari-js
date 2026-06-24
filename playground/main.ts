import { Viewer, VERSION, levelDims, levelScale, type TiledSource, type TileKey, type PixelChunk } from '../src/index';

// A synthetic "multi-gigapixel" pyramidal, z-stacked source generated on the fly. fetchTile
// renders a coordinate/checker pattern per tile so we can exercise tiling + LOD + z-scrub
// without any real data or server.
const FULL = 16384;
const TILE = 256;
const LEVELS = 7; // 16384 → 256 at the coarsest level
const DEPTH = 8;

function fetchTile({ level, col, row, z }: TileKey): Promise<PixelChunk> {
  const dims = levelDims(FULL, FULL, level);
  const w = Math.min(TILE, dims.width - col * TILE);
  const h = Math.min(TILE, dims.height - row * TILE);
  const s = levelScale(level);
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Global level-0 coordinates of this texel.
      const gx = (col * TILE + x) * s;
      const gy = (row * TILE + y) * s;
      const checker = (((gx >> 9) + (gy >> 9)) & 1) === 0 ? 90 : 30;
      const rings = 60 * (0.5 + 0.5 * Math.sin((gx + gy) / (400 + z * 120)));
      data[y * w + x] = Math.min(255, checker + rings);
    }
  }
  // Simulate async latency so LOD/progressive loading is visible.
  return new Promise((resolve) => setTimeout(() => resolve({ width: w, height: h, data }), 8));
}

const source: TiledSource = {
  kind: 'tiled',
  width: FULL,
  height: FULL,
  tileSize: TILE,
  levels: LEVELS,
  depth: DEPTH,
  channels: 1,
  dtype: 'uint8',
  fetchTile,
};

const canvas = document.getElementById('c') as HTMLCanvasElement;
const msg = document.getElementById('msg') as HTMLDivElement;

async function main(): Promise<void> {
  const viewer = new Viewer({ canvas });
  try {
    await viewer.ready;
  } catch (err) {
    msg.textContent = `WebGPU unavailable: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }

  viewer.addImage(source, { colormap: 'viridis', contrastLimits: [0, 255] });

  const help = 'drag = pan · wheel = zoom (LOD) · ↑/↓ = z-slice';
  const status = (): string => `napari-js ${VERSION} — NJ-3 tiled ${FULL}² · z ${viewer.dims.z}/${DEPTH - 1} · ${help}`;
  msg.textContent = status();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') viewer.dims.z += 1;
    else if (e.key === 'ArrowDown') viewer.dims.z -= 1;
    else return;
    msg.textContent = status();
  });
  window.addEventListener('resize', () => viewer.requestRender());
}

void main();
