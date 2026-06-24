import { Viewer, VERSION } from '../src/index';

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
  msg.textContent = `napari-js ${VERSION} — NJ-0 demo (textured quad)`;
  viewer.renderDemo();
  window.addEventListener('resize', () => viewer.renderDemo());
}

void main();
