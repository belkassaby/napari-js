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
 * Copy an 8-bit-RGBA-class texture to the CPU as tightly-packed **RGBA** bytes. Handles WebGPU's
 * 256-byte `bytesPerRow` alignment by unpadding each row. When the source is `bgra8unorm` (the
 * preferred canvas format on many platforms, e.g. Metal), the R/B channels are swizzled so the
 * result is always RGBA regardless of the texture's native channel order. The texture must have
 * been created with `COPY_SRC` usage.
 */
export async function readTextureToRGBA(
  device: GPUDevice,
  texture: GPUTexture,
  width: number,
  height: number,
  format: GPUTextureFormat = 'rgba8unorm',
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
  const bgra = format === 'bgra8unorm';
  for (let y = 0; y < height; y++) {
    const srcStart = y * bytesPerRow;
    const dstStart = y * unpaddedBytesPerRow;
    if (bgra) {
      for (let x = 0; x < width; x++) {
        const s = srcStart + x * 4;
        const d = dstStart + x * 4;
        out[d] = padded[s + 2]; // R ← B
        out[d + 1] = padded[s + 1]; // G
        out[d + 2] = padded[s]; // B ← R
        out[d + 3] = padded[s + 3]; // A
      }
    } else {
      out.set(padded.subarray(srcStart, srcStart + unpaddedBytesPerRow), dstStart);
    }
  }
  buffer.unmap();
  buffer.destroy();
  return out;
}
