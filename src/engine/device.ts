/** GPU features napari-js opts into when the adapter supports them. */
export interface DeviceFeatures {
  /** Linear filtering of `r32float` textures (else 16-bit/float layers fall back to nearest). */
  float32Filterable: boolean;
}

/** A live WebGPU adapter + device pair plus the negotiated optional features. */
export interface DeviceContext {
  adapter: GPUAdapter;
  device: GPUDevice;
  features: DeviceFeatures;
}

/** Thrown when WebGPU is unavailable or no adapter/device can be obtained. */
export class WebGPUUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebGPUUnsupportedError';
  }
}

/**
 * Acquire a WebGPU device, opting into `float32-filterable` when available. Throws
 * {@link WebGPUUnsupportedError} with an actionable message when the environment lacks
 * `navigator.gpu`, has no suitable adapter, or device creation fails.
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

  const float32Filterable = adapter.features.has('float32-filterable');
  const requiredFeatures: GPUFeatureName[] = float32Filterable ? ['float32-filterable'] : [];

  try {
    const device = await adapter.requestDevice({ requiredFeatures });
    return { adapter, device, features: { float32Filterable } };
  } catch (cause) {
    throw new WebGPUUnsupportedError(
      `Failed to create a GPUDevice: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}
