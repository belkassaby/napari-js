# 06 — jit-ui integration (Phase C — deferred)

> **This phase begins only after the napari-js port is usable (≈ NJ-4, published to npm).**
> It is documented now so the napari-js API (doc 02) is designed with the consumer in mind,
> but no jit-ui code is written until Phase B delivers.

## Goal

Add napari-js as a third visualization backend in the `jax-image-visualization` library of
the `jit-ui` monorepo (`~/git/jit-ui`), alongside the existing OpenSeadragon and Plotly
backends — **opt-in, with OpenSeadragon remaining the default and fallback.**

## Why it slots in cleanly

`jax-image-visualization` is a ports-and-adapters library. A backend is any class
implementing the `IVisualizer` contract; a router picks one per plot type. napari-js becomes
a new adapter that wraps the engine.

- **Contract:** `libs/jax-image-visualization/src/lib/contracts/visualizer.contract.ts`
  (`IVisualizer` composes `IDataRenderer`, `IRegionStore`, `IToolController`,
  `IDisplayOptions`, `IIntensitySampling`).
- **Existing backends:** `src/lib/implementations/osd/` (OpenSeadragon),
  `src/lib/implementations/plotly/`.
- **Router:** `src/lib/routing-visualizer.service.ts` — `PlotType.IMAGE` → OSD, others →
  Plotly.
- **DI:** the `VISUALIZER` injection token (bound to the router); 5 host-supplied ports
  (`TILE_ACCESS_PORT`, `IMAGE_STATE_PORT`, `REGION_IO_PORT`, `VIZ_CONFIG`, `CELL_SEGMENTER`).

## Adapter shape

```
libs/jax-image-visualization/src/lib/implementations/napari-js/
  napari-visualizer.service.ts     @Injectable, implements IVisualizer, wraps napari-js Viewer
  napari-tile-source.ts            TiledSource.fetchTile -> /tile + TileAccessPort.zoomOnRegion
  napari-coordinate-transform.ts   mirror osd-coordinate-transform.ts
  napari-region-overlay.ts         IRegionOverlay (or reuse the shared overlay)
  *.spec.ts, README.md
```

The adapter:

- builds a napari-js `TiledSource` whose `fetchTile` calls the existing tile endpoints
  (`/tiles/info`, `/tile?info=…&res=…&col=…&row=…&z=…&channel=…`) and
  `TileAccessPort.zoomOnRegion(roi, screen, z)` — so napari-js never knows about the server;
- maps `IImageInfo` / per-channel `IImageMetadata` (channel count, bit depth, `mppX/Y`,
  per-channel LUT/min/max) onto one napari-js image layer per channel with the right
  colormap/contrast/blend;
- **delegates** `IRegionStore`, `IDisplayOptions`, and `IToolController` to the existing
  shared `RegionStore` / `VisualizerStore` / tool singletons (same as OSD) — it does not
  reimplement regions or tools;
- advertises capabilities: `ImageDisplay`, `ScalarColormap`, `PixelReadback`, `StackSlider`
  (and later `Surface3D` / `Isosurface` once napari-js volume lands);
- `getPlotTypeDescriptors()` returns `[IMAGE, HEATMAP]`.

## Wiring (the exact seam)

- `routing-visualizer.service.ts:82` — add the service to the constructor; in `imageBackend()`
  (~`:92`) prefer napari-js for `PlotType.IMAGE` **only when the opt-in flag is set**, with
  OSD as default and automatic fallback on failure.
- `provide-visualization.ts:47` — register the service in the DI factory.
- `index.ts` (public barrel) — no change; consumers keep injecting the `VISUALIZER` token.
- Opt-in flag carried on `VIZ_CONFIG` (e.g. `useWebGpuImageRenderer`).

## Gates (from jit-ui AGENTS.md / CLAUDE.md)

- `nx test jax-image-visualization` (coverage ≥ thresholds), `nx lint`, `nx build`, and
  `nx build jit-ui` (AOT) all green.
- Browser gate: RGB + grayscale render; regions draw/edit/delete; z-scrub; Channels &
  Histogram live (brightness/contrast/gamma); PNG/TIFF export.
- New Nx module-boundary allowance so the visualization lib may depend on the napari-js npm
  package.

## Open questions for Phase C (resolve later)

- Default-flip criteria: when (if ever) napari-js becomes the default for `PlotType.IMAGE`.
- Whether HEATMAP routing also moves to napari-js (GPU scalar colormap) or stays on Plotly.
- Region overlay: render on a napari-js WebGPU overlay vs. reuse the existing SVG/canvas
  overlay positioned by napari-js's coordinate transform.
