# Changelog

All notable changes to napari-js are documented here. The format roughly follows
[Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [0.5.1]

### Added

- **Click-to-zoom** — a plain left click zooms in about the cursor; a right click or modifier-click
  (shift/ctrl/alt/meta) zooms out; a left drag still pans (and never triggers click-zoom). Tunable
  via `ViewerOptions.clickZoomFactor` (default 2×; 0 disables). Mirrors OpenSeadragon's click-zoom.

### Changed

- **Gentler, tunable wheel zoom** — lower default sensitivity + a tighter per-event delta clamp so
  high-resolution mice / trackpad momentum zoom smoothly. Override via `ViewerOptions.wheelZoomSpeed`.

## [0.5.0]

### Added

- **Arbitrary (non-power-of-two) tiled pyramids** — `TiledSource.levelScales?: number[]` supplies an
  explicit per-level downsample factor (level-0 units per level pixel, ascending). The pyramid
  helpers (`levelScale`/`levelDims`/`tileGrid`/`visibleTiles`/`selectLevel`) and `TiledImageVisual`
  honour it, so a server pyramid with arbitrary level ratios (e.g. Bio-Formats / `/tiles/info`)
  renders with correct level selection and tile placement, refining to higher resolution on zoom.
  Omit it for the classic power-of-two behaviour (unchanged).

## [0.4.2]

### Changed

- **Gentler wheel zoom** — the 2D wheel-zoom handler now normalizes the wheel delta across devices
  (line/page `deltaMode`) and clamps it per event, so high-resolution mice and trackpad momentum
  zoom smoothly instead of in large, over-sensitive jumps. Sensitivity is a single tunable constant.

## [0.4.1]

### Fixed

- **Readback format mismatch** — `readDisplayedPixels()` (and `screenshot()`/`histogram()`, which
  build on it) rendered into a hardcoded `rgba8unorm` texture while the layer pipelines are built
  for the canvas/swapchain format. On platforms whose preferred canvas format is `bgra8unorm`
  (e.g. Metal) this produced a WebGPU validation error ("attachment state … is not compatible")
  on every readback. The readback texture now uses the target format and `readTextureToRGBA`
  swizzles BGRA→RGBA, so callers still get RGBA bytes.

## [0.4.0]

### Added

- **Runtime control toggle** — `Viewer.setControlsEnabled(enabled)` and the `controlsActive`
  getter attach/detach the pointer pan/zoom (2D) and orbit (3D) controls on demand. A host can
  disable navigation so it owns the pointer for region drawing (rectangle/polygon/lasso), then
  re-enable it to restore navigation. The `controls` constructor option is now toggleable at
  runtime rather than fixed at construction.

## [0.3.0]

### Added

- **3D camera drag modes** — `Camera3D.dragMode` (`'rotate'` | `'pan'` | `'zoom'`) plus
  `Camera3D.pan(dx, dy, viewportHeight)`; the orbit controls branch a pointer drag accordingly
  (the wheel still always dollies). `Viewer.setCameraDragMode(mode)` lets a host switch it
  (e.g. orbit / pan / zoom toolbar buttons). Enables interactive volume navigation beyond
  orbit-only.

## [0.2.1]

### Changed

- Documentation: README adds a Features list and a library Install/Use example, and references
  the originating issue [jit-ui#102](https://github.com/TheJacksonLaboratory/jit-ui/issues/102);
  `docs/06` links the tracking issue and marks Phase C underway. (No code changes.)

## [0.2.0]

### Added

- **Device-loss recovery** — on `GPUDevice.lost` (GPU reset/driver crash), the viewer
  re-acquires a device and rebuilds the canvas target, renderer, and all layer textures.
- **uint16 / uint32 labels** — `LabelsLayer` / `Viewer.addLabels` accept
  `Uint8Array | Uint16Array | Uint32Array`; ids are stored in an `r32uint` texture and
  integer-fetched (`textureLoad`), so label ids > 255 render correctly.
- **`ImageBitmap` tile chunks** — `TiledSource.fetchTile` may return a decoded `ImageBitmap`
  (e.g. a PNG tile from a server), uploaded via `copyExternalImageToTexture`.
- **Per-channel native histogram** — `Viewer.layerHistogram(layer, bins)` computes a
  histogram from a single-channel image layer's in-memory source at native bit depth, plus a
  pure `histogramScalar()` helper.

## [0.1.1]

### Added

- Host-embedding APIs: `Viewer.worldToCanvas()`, `Viewer.visibleWorldRect()`, and optional
  `ResizeObserver` auto-resize (`autoResize` option).
- Multi-demo playground with a dropdown selector (image, multi-channel, tiled + z-stack,
  points + labels, volume) for browser verification.
- Coverage tooling (`npm run test:coverage`) and expanded unit tests.
- `docs/08` — landscape & related work (how napari-js differs from Viv/vizarr and the
  Python-in-browser napari direction).

## [0.1.0]

- Initial release. Phase B milestones NJ-0…NJ-5+: WebGPU image rendering
  (single / multi-channel / 16-bit / float32), tiled + pyramidal large images with z-stacks,
  points (SDF markers), labels, and 3D volume raymarching (MIP / translucent / iso), plus
  pixel readback, screenshot, and histogram. Tag-triggered CI/CD publishes to npm with
  provenance.
