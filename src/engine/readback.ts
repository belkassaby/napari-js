/** Composited pixels read back from the GPU (RGBA8, top row first). */
export interface PixelData {
  width: number;
  height: number;
  channels: number;
  data: Uint8ClampedArray;
}

function align256(n: number): number {
  return Math.ceil(n / 256) * 256;
}

/**
 * Copy an `rgba8unorm` texture to the CPU as tightly-packed RGBA bytes. Handles WebGPU's
 * 256-byte `bytesPerRow` alignment by unpadding each row. The texture must have been created
 * with `COPY_SRC` usage.
 */
export async function readTextureToRGBA(
  device: GPUDevice,
  texture: GPUTexture,
  width: number,
  height: number,
): Promise<Uint8ClampedArray> {
  const unpaddedBytesPerRow = width * 4;
  const bytesPerRow = align256(unpaddedBytesPerRow);
  const buffer = device.createBuffer({
    size: bytesPerRow * height,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const encoder = device.createCommandEncoder();
  encoder.copyTextureToBuffer(
    { texture },
    { buffer, bytesPerRow, rowsPerImage: height },
    { width, height },
  );
  device.queue.submit([encoder.finish()]);

  await buffer.mapAsync(GPUMapMode.READ);
  const padded = new Uint8Array(buffer.getMappedRange());
  const out = new Uint8ClampedArray(unpaddedBytesPerRow * height);
  for (let y = 0; y < height; y++) {
    const srcStart = y * bytesPerRow;
    out.set(padded.subarray(srcStart, srcStart + unpaddedBytesPerRow), y * unpaddedBytesPerRow);
  }
  buffer.unmap();
  buffer.destroy();
  return out;
}
