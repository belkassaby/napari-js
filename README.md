# napari-js

A browser-native, **WebGPU** rendering engine that ports the visualization model of
[napari](https://napari.org) (the Python multi-dimensional image viewer) to TypeScript.

> **Status:** **published to npm — `npm install napari-js`** (latest: **v0.2.1**). napari-js
> implements the POC called for in
> [jit-ui#102](https://github.com/TheJacksonLaboratory/jit-ui/issues/102) — a browser-based
> napari shipped as a JS library. Phase B (the renderer, NJ-0…NJ-5+) is complete and
> browser-verified; Phase C (the `jax-image-visualization` `IVisualizer` backend) is underway.
> See the [CHANGELOG](./CHANGELOG.md).

## Features

- **WebGPU rendering**, 100% client-side — no Python, Pyodide, WASM, or server.
- **Image layers**: single- and multi-channel, `uint8` / `uint16` / `float32`, with live
  colormap (LUT), contrast limits, gamma, invert, opacity, and blend modes
  (`opaque` / `translucent` / `additive` / `minimum`).
- **Tiled & pyramidal** large images with level-of-detail + an LRU GPU-tile cache, and
  **z-stacks** — fed by a pluggable `TextureSource` (typed arrays or `ImageBitmap` tiles).
- **Points** (instanced SDF markers) and **Labels** (`uint8`/`uint16`/`uint32` ids, cyclic palette).
- **3D volume raymarching** — MIP, translucent, and iso-surface, with an orbit camera.
- **Readback**: displayed-pixel readout, PNG screenshot, and per-channel histograms.
- **Host-friendly**: device-loss recovery, `ResizeObserver` auto-resize, and
  `canvasToWorld` / `worldToCanvas` / `visibleWorldRect` for overlays and picking.

## Install & use

```bash
npm install napari-js
```

```ts
import { Viewer } from 'napari-js';

const viewer = new Viewer({ canvas: document.querySelector('canvas')! });
await viewer.ready; // WebGPU device acquired

// one layer per channel; composited additively on the GPU
viewer.addImage(channel0, { colormap: 'green', blending: 'additive', contrastLimits: [0, 4095] });
const dapi = viewer.addImage(channel1, { colormap: 'blue', blending: 'additive' });
dapi.gamma = 0.8; // live — updates a uniform, no texture re-upload

viewer.addPoints(points, { size: 12, faceColor: [1, 1, 0, 1] });
viewer.addLabels(labelImage, width, height, { opacity: 0.5 });
```

A layer's data is any `TextureSource` input: an `ImageBitmap`, a typed-array descriptor
(`{ kind: 'typed', width, height, channels, dtype, data }`), or a pyramidal
`{ kind: 'tiled', …, fetchTile }`. Full API in [docs/02](./docs/02-public-api.md).

## Develop

```bash
npm install
npm run dev          # serve the playground (dropdown: image · multi-channel · tiled · points+labels · volume)
npm test             # GPU-free unit tests (Vitest)
npm run test:coverage
npm run typecheck && npm run lint && npm run format:check
npm run build        # library bundle + types → dist/
```

`npm run dev` serves `index.html` → `playground/main.ts`. Pick a demo from the dropdown to
verify each render path; if WebGPU is unavailable the page shows the reason instead of crashing.

## What this is

napari-js is a **standalone, framework-agnostic** library. It renders large
multi-dimensional / multi-channel scientific images in the browser on the GPU, with
napari's model: a `Viewer` holding a list of `Layer`s (Image, later Points / Labels /
Volume), each with its own colormap (LUT), contrast limits, gamma, opacity, and blending.

It is **not** a port of napari's Python code or its Qt GUI. It is a faithful port of
napari's _rendering concepts_ — the layer→visual model, per-layer GPU colormapping,
serializable transforms and camera — onto WebGPU and WGSL. See
[`docs/07-napari-concept-mapping.md`](./docs/07-napari-concept-mapping.md).

## Why

WebGPU now ships in all major browsers (late 2025). napari's strengths — GPU
multi-channel fluorescence compositing, live scalar colormapping, and volume rendering —
are exactly the things current browser image viewers do poorly or on the CPU. napari-js
brings those strengths to the web as a reusable npm package.

## Where it fits

```
~/git/napari      Reference: the Python renderer being ported (napari/_vispy, layers, components)
~/git/napari-js   THIS repo: the standalone TS + WebGPU port, published to npm
~/git/jit-ui      Eventual consumer: jax-image-visualization adds a napari-js IVisualizer backend
```

The first downstream consumer is the `jax-image-visualization` library in the `jit-ui`
monorepo ([jit-ui#102](https://github.com/TheJacksonLaboratory/jit-ui/issues/102)), which adds
napari-js as a new `IVisualizer` backend alongside its OpenSeadragon and Plotly backends — to
swap 2D image plotting with OSD and 3D slicing / isosurfaces with Plotly. napari-js is built
and published independently; that integration (Phase C) is described in
[`docs/06-jit-ui-integration.md`](./docs/06-jit-ui-integration.md).

## Docs

| Doc                                                                      | Contents                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [00 — Feasibility](./docs/00-feasibility.md)                             | Why this is feasible: napari architecture findings, what ports cleanly, what's hard     |
| [01 — Architecture](./docs/01-architecture.md)                           | Engine module layout, render loop, design principles                                    |
| [02 — Public API](./docs/02-public-api.md)                               | The `Viewer` / `Layer` / `Colormap` / `TextureSource` API surface                       |
| [03 — RenderState IR](./docs/03-render-state-ir.md)                      | The serializable intermediate representation between model and GPU                      |
| [04 — WGSL rendering plan](./docs/04-wgsl-rendering-plan.md)             | Shader pipelines: image+colormap, multi-channel compositing, future raycasting          |
| [05 — Roadmap](./docs/05-roadmap.md)                                     | Milestones NJ-0 … NJ-5+                                                                 |
| [06 — jit-ui integration](./docs/06-jit-ui-integration.md)               | Phase C: the `IVisualizer` adapter in jax-image-visualization (deferred)                |
| [07 — napari concept mapping](./docs/07-napari-concept-mapping.md)       | How each napari concept maps to napari-js                                               |
| [08 — Landscape & related work](./docs/08-landscape-and-related-work.md) | Does a browser napari exist? CZI/roadmap WIP, Viv/vizarr/ndv, and how napari-js differs |

## Acknowledgments

Built with the help of Claude Opus 4.8 (Anthropic).

## License

[MIT](./LICENSE) © Baha Elkassaby
