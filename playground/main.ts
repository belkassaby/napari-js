import { Viewer, VERSION, type TypedImageSource } from '../src/index';

const W = 512;
const H = 512;

/** An 8-bit Gaussian blob channel — stands in for one fluorescence channel. */
function blob(cx: number, cy: number, sigma: number): TypedImageSource {
  const data = new Uint8Array(W * H);
  const s2 = 2 * sigma * sigma;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      data[y * W + x] = Math.round(255 * Math.exp(-d2 / s2));
    }
  }
  return { kind: 'typed', width: W, height: H, channels: 1, dtype: 'uint8', data };
}

/** A 16-bit ramp channel — exercises the r32float / native-windowing path. */
function ramp16(): TypedImageSource {
  const data = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      data[y * W + x] = Math.round((x / (W - 1)) * 65535);
    }
  }
  return { kind: 'typed', width: W, height: H, channels: 1, dtype: 'uint16', data };
}

const canvas = document.getElementById('c') as HTMLCanvasElement;
const msg = document.getElementById('msg') as HTMLDivElement;

async function main(): Promise<void> {
  // Black background so the additive composite is pure.
  const viewer = new Viewer({ canvas, background: { r: 0, g: 0, b: 0, a: 1 } });
  try {
    await viewer.ready;
  } catch (err) {
    msg.textContent = `WebGPU unavailable: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }

  // Three additive channels (R/G/B) — a multi-channel fluorescence composite on the GPU.
  viewer.addImage(blob(W * 0.4, H * 0.45, 90), { colormap: 'red', blending: 'additive', name: 'ch0' });
  viewer.addImage(blob(W * 0.6, H * 0.45, 90), { colormap: 'green', blending: 'additive', name: 'ch1' });
  viewer.addImage(blob(W * 0.5, H * 0.62, 90), { colormap: 'blue', blending: 'additive', name: 'ch2' });

  // A faint 16-bit ramp on top (additive), windowed to its upper half.
  const ramp = viewer.addImage(ramp16(), {
    colormap: 'gray',
    blending: 'additive',
    opacity: 0.25,
    contrastLimits: [32768, 65535],
    name: 'ramp16',
  });

  const help = 'drag = pan · wheel = zoom · w = widen/narrow 16-bit window';
  msg.textContent = `napari-js ${VERSION} — NJ-2 multi-channel additive · ${help}`;

  let wide = true;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'w') {
      wide = !wide;
      ramp.contrastLimits = wide ? [0, 65535] : [49152, 65535];
    }
  });
  window.addEventListener('resize', () => viewer.requestRender());
}

void main();
