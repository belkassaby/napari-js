// Public API barrel. NJ-0 surface is intentionally tiny — the layer/model API arrives in NJ-1.
export { Viewer } from './viewer';
export type { ViewerOptions } from './viewer';
export { acquireDevice, WebGPUUnsupportedError } from './engine/device';
export type { DeviceContext } from './engine/device';
export { VERSION } from './version';
