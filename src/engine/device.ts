/** A live WebGPU adapter + device pair. */
export interface DeviceContext {
  adapter: GPUAdapter;
  device: GPUDevice;
}

/** Thrown when WebGPU is unavailable or no adapter/device can be obtained. */
export class WebGPUUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebGPUUnsupportedError';
  }
}

/**
 * Acquire a WebGPU device. Throws {@link WebGPUUnsupportedError} with an actionable message
 * when the environment lacks `navigator.gpu`, has no suitable adapter, or device creation
 * fails — so callers can surface a clear "this browser doesn't support WebGPU" state.
 */
export async function acquireDevice(
  options: { powerPreference?: GPUPowerPreference } = {},
): Promise<DeviceContext> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator) || !navigator.gpu) {
    throw new WebGPUUnsupportedError(
      'WebGPU is not available in this environment (navigator.gpu is missing).',
    );
  }
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: options.powerPreference ?? 'high-performance',
  });
  if (!adapter) {
    throw new WebGPUUnsupportedError('No suitable GPUAdapter was found.');
  }
  try {
    const device = await adapter.requestDevice();
    return { adapter, device };
  } catch (cause) {
    throw new WebGPUUnsupportedError(
      `Failed to create a GPUDevice: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}
