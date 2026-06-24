import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// `vite build` → library bundle in dist/ (+ .d.ts). `vite` (dev) serves index.html →
// the playground. Both use this config; the dev server ignores `build.lib`.
export default defineConfig({
  plugins: [dts({ include: ['src'], outDir: 'dist' })],
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'napari-js.js',
    },
  },
});
