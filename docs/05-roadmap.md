# 05 — Roadmap

Two top-level phases. **Phase B** (this repo) builds and publishes napari-js standalone.
**Phase C** (in `jit-ui`) integrates it — and only begins once the port is usable. See
[06 — jit-ui integration](./06-jit-ui-integration.md).

The first shippable priority is **multi-channel GPU compositing (NJ-2)** — the concrete
capability gap in the eventual consumer's existing backends.

## Phase B — napari-js (standalone, → npm)

### NJ-0 — Project scaffold + WebGPU bootstrap

- git repo, `package.json` (name `napari-js`), `tsconfig` (strict), Vite (lib + playground),
  Vitest, `@webgpu/types`, lint, CI.
- `engine/device.ts` + `engine/canvas.ts`: acquire adapter/device, configure swapchain,
  handle resize/DPR.
- Draw a clear color + a single textured quad to prove the pipeline.
- `playground/` page renders the quad.
- **Done when:** `npm run build` + `npm test` green; playground shows the quad in a
  WebGPU browser.

### NJ-1 — Single-channel ImageLayer + camera

- `scene/` model (`ViewerModel`, `LayerList`, events), `layers/image-layer.ts`.
- `io/sources/bitmap-source.ts` + `typed-array-source.ts`.
- `color/colormap.ts` + `color/lut.ts` (viridis, gray, magma, R/G/B, …).
- `visuals/image-visual.ts` + `shaders/image-colormap.wgsl` (window→gamma→invert→LUT).
- `camera/` 2D pan/zoom + pointer/wheel controls.
- `scene/render-state.ts` reducer + Vitest fixtures.
- Public API: `new Viewer()`, `viewer.addImage()`, live `colormap`/`contrastLimits`/`gamma`.
- **Done when:** load a grayscale and an RGB image; pan/zoom; change colormap/contrast live.

### NJ-2 — Multi-channel compositing ◀ priority

- `LayerList` ordering + per-layer blend state; additive/translucent/minimum modes.
- 16-bit textures (`r16uint`/`r16float`) + in-shader native-bit-depth windowing.
- Per-channel colormap + contrast; correct additive composite.
- **Done when:** N-channel fluorescence renders as a GPU additive composite; per-channel
  controls update live; output matches a CPU reference within tolerance.

### NJ-3 — Tiled/pyramidal large images + z-stacks

- `io/sources/tiled-source.ts` (lazy tiles, LRU GPU-texture cache, level selection).
- `dims.ts` (z-slice / time step); slice caching.
- Tile prefetch + level-of-detail on zoom.
- **Done when:** a multi-gigapixel pyramidal image pans/zooms smoothly; z-scrub works.

### NJ-4 — Readback, export, histogram + v0.1 publish

- `viewer.readDisplayedPixels()`, `viewer.screenshot()`, `viewer.histogram()`.
- API freeze; README/API docs; semver `0.1.0`.
- **Done when:** published to npm; consumable in a clean project.

### NJ-5 — Points + Labels layers

- `points-layer.ts` (instanced SDF markers), `labels-layer.ts` (LUT lookup + selection).
- **Done when:** points and labels render and pick correctly over an image.

### NJ-5+ — Volume rendering (the long pole)

- Prototype frag-raymarch vs compute-raymarch; pick one (decision gate).
- Port napari's gradient/iso/categorical WGSL.
- `dims.ndisplay = 3` + 3D arcball camera.
- **Done when:** a 3D volume renders (MIP + iso) interactively.

## Phase C — jit-ui integration (deferred; see doc 06)

- Add `napari-js` as an npm dep of `jax-image-visualization`.
- New `implementations/napari-js/` adapter implementing `IVisualizer`.
- Opt-in `VIZ_CONFIG` flag; OpenSeadragon stays default + fallback.
- Multi-channel GPU compositing as the first shippable integration win.

## Risk register

| Risk                               | When  | Mitigation                                                    |
| ---------------------------------- | ----- | ------------------------------------------------------------- |
| Volume raycasting on WebGPU        | NJ-5+ | Deferred to last; decision gate to adopt vs build             |
| Pixel source is tiles, not arrays  | NJ-1+ | `TextureSource` abstraction designed in from NJ-1             |
| 16-bit / native windowing fidelity | NJ-2  | `r16uint` textures + in-shader windowing; CPU reference tests |
| Headless WebGPU in CI              | all   | Unit-test pure math; validate GPU in browser playground/e2e   |
| API churn before adoption          | NJ-4  | Freeze API at NJ-4 before Phase C depends on it               |
