import { Viewer, VERSION, type VolumeRendering } from '../src/index';

const N = 96; // N^3 volume

/** Synthetic uint8 volume: a few 3D Gaussian blobs. */
function makeVolume(): Uint8Array {
  const data = new Uint8Array(N * N * N);
  const blobs: [number, number, number, number][] = [
    [0.35, 0.4, 0.5, 0.14],
    [0.65, 0.55, 0.45, 0.12],
    [0.5, 0.65, 0.6, 0.1],
  ];
  for (let z = 0; z < N; z++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let v = 0;
        for (const [bx, by, bz, s] of blobs) {
          const dx = x / N - bx;
          const dy = y / N - by;
          const dz = z / N - bz;
          v += Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * s * s));
        }
        data[(z * N + y) * N + x] = Math.min(255, Math.round(v * 255));
      }
    }
  }
  return data;
}

const canvas = document.getElementById('c') as HTMLCanvasElement;
const msg = document.getElementById('msg') as HTMLDivElement;

async function main(): Promise<void> {
  const viewer = new Viewer({ canvas, background: { r: 0, g: 0, b: 0, a: 1 } });
  try {
    await viewer.ready;
  } catch (err) {
    msg.textContent = `WebGPU unavailable: ${err instanceof Error ? err.message : String(err)}`;
    return;
  }

  const vol = viewer.addVolume(makeVolume(), N, N, N, {
    colormap: 'magma',
    rendering: 'mip',
    isoThreshold: 0.35,
    contrastLimits: [0, 255],
  });

  const help = 'drag = orbit · wheel = zoom · m = MIP · t = translucent · i = iso';
  const status = (): string => `napari-js ${VERSION} — NJ-5+ volume (${vol.rendering}) · ${help}`;
  msg.textContent = status();

  window.addEventListener('keydown', (e) => {
    const mode: VolumeRendering | null =
      e.key === 'm' ? 'mip' : e.key === 't' ? 'translucent' : e.key === 'i' ? 'iso' : null;
    if (!mode) return;
    vol.rendering = mode;
    msg.textContent = status();
  });
  window.addEventListener('resize', () => viewer.requestRender());
}

void main();
