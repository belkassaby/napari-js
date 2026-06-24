import { Viewer, VERSION, type TypedImageSource } from '../src/index';

/** A synthetic 8-bit grayscale image so the demo needs no external assets. */
function syntheticGradient(width: number, height: number): TypedImageSource {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = 0.5 + 0.5 * Math.sin(x / 38) * Math.cos(y / 38);
      data[y * width + x] = Math.round(255 * v);
    }
  }
  return { kind: 'typed', width, height, channels: 1, dtype: 'uint8', data };
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

  const layer = viewer.addImage(syntheticGradient(512, 512), {
    colormap: 'viridis',
    contrastLimits: [0, 255],
  });

  const cmaps = ['viridis', 'magma', 'gray', 'red', 'green', 'blue'];
  let ci = 0;
  const help = 'drag = pan · wheel = zoom · c = colormap · i = invert · [ / ] = contrast';
  const status = (): string => `napari-js ${VERSION} — NJ-1 · ${cmaps[ci]} · ${help}`;
  msg.textContent = status();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'c') {
      ci = (ci + 1) % cmaps.length;
      layer.colormap = cmaps[ci];
    } else if (e.key === 'i') {
      layer.invert = !layer.invert;
    } else if (e.key === '[') {
      const [lo, hi] = layer.contrastLimits;
      layer.contrastLimits = [lo, Math.max(lo + 1, hi - 12)];
    } else if (e.key === ']') {
      const [lo, hi] = layer.contrastLimits;
      layer.contrastLimits = [lo, Math.min(255, hi + 12)];
    }
    msg.textContent = status();
  });
  window.addEventListener('resize', () => viewer.requestRender());
}

void main();
