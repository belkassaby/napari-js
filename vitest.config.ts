import { defineConfig } from 'vitest/config';

// GPU-free unit tests only (model/LUT/camera/transform math). WebGPU behavior is
// validated in the browser playground, not here — headless WebGPU in CI is unreliable.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      include: ['src/**/*.ts'],
      // Inline-WGSL shader files are constant strings (no logic); GPU visuals/engine require a
      // real device and are validated in the browser playground, not in unit tests.
      exclude: ['src/**/*shader*.ts'],
    },
  },
});
