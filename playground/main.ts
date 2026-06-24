import { Viewer, VERSION, nearestPointIndex, type TypedImageSource } from '../src/index';

const W = 512;
const H = 512;

/** 8-bit grayscale gradient base image. */
function gradient(): TypedImageSource {
  const data = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      data[y * W + x] = Math.round(255 * (0.5 + 0.5 * Math.sin(x / 40) * Math.cos(y / 40)));
    }
  }
  return { kind: 'typed', width: W, height: H, channels: 1, dtype: 'uint8', data };
}

/** A labels image: a few rectangular regions with distinct ids. */
function labels(): { data: Uint8Array; width: number; height: number } {
  const data = new Uint8Array(W * H);
  const blocks: [number, number, number, number, number][] = [
    [40, 40, 160, 160, 1],
    [300, 60, 460, 200, 2],
    [120, 300, 380, 460, 3],
  ];
  for (const [x0, y0, x1, y1, id] of blocks) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[y * W + x] = id;
  }
  return { data, width: W, height: H };
}

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

  viewer.addImage(gradient(), { colormap: 'gray', contrastLimits: [0, 255] });

  const lbl = labels();
  const labelsLayer = viewer.addLabels(lbl.data, lbl.width, lbl.height, { opacity: 0.5 });

  // A grid of points with per-point sizes/colors over the image.
  const positions: number[][] = [];
  for (let i = 0; i < 36; i++) positions.push([60 + (i % 6) * 80, 60 + Math.floor(i / 6) * 80]);
  const sizes = positions.map((_, i) => 14 + (i % 5) * 6);
  const colors = positions.map((_, i): [number, number, number, number] =>
    i % 2 ? [1, 0.85, 0.2, 1] : [0.2, 0.8, 1, 1],
  );
  const pointsLayer = viewer.addPoints(positions, {
    size: sizes,
    faceColor: colors,
    borderColor: [0, 0, 0, 1],
    borderWidth: 2,
    symbol: 'disc',
  });

  const help = 'drag = pan · wheel = zoom · click = pick';
  msg.textContent = `napari-js ${VERSION} — NJ-5 points + labels · ${help}`;

  canvas.addEventListener('click', (e) => {
    const [x, y] = viewer.canvasToWorld(e.clientX, e.clientY);
    const pi = nearestPointIndex(pointsLayer.positions, (i) => pointsLayer.sizeAt(i), x, y);
    const id = labelsLayer.labelAt(x, y);
    msg.textContent = `napari-js ${VERSION} — pick @ (${x.toFixed(0)},${y.toFixed(0)}) · point ${pi} · label ${id} · ${help}`;
    labelsLayer.selectedLabel = id;
    labelsLayer.showSelectedOnly = id !== 0;
  });
  window.addEventListener('resize', () => viewer.requestRender());
}

void main();
