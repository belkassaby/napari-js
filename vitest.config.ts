import { defineConfig } from 'vitest/config';

// GPU-free unit tests only (model/LUT/camera/transform math). WebGPU behavior is
// validated in the browser playground, not here — headless WebGPU in CI is unreliable.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
