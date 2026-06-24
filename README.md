# napari-js

A browser-native, **WebGPU** rendering engine that ports the visualization model of
[napari](https://napari.org) (the Python multi-dimensional image viewer) to TypeScript.

> **Status:** **NJ-0 complete** — project scaffold + WebGPU bootstrap (device/canvas/render
> loop) drawing a demo textured quad, with passing typecheck / lint / unit tests / library
> build. Next is **NJ-1** (single-channel `ImageLayer` + camera). See the
> [roadmap](./docs/05-roadmap.md); design rationale lives in [`docs/`](./docs).

## Quickstart

```bash
npm install
npm run dev        # open the printed URL in a WebGPU browser → see the demo quad
npm test           # GPU-free unit tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # library bundle + types → dist/
```

`npm run dev` serves `index.html` → `playground/main.ts`, which creates a `Viewer`, awaits
its WebGPU device, and renders the NJ-0 demo. If WebGPU is unavailable the page shows the
reason instead of crashing.

## What this is

napari-js is a **standalone, framework-agnostic** library. It renders large
multi-dimensional / multi-channel scientific images in the browser on the GPU, with
napari's model: a `Viewer` holding a list of `Layer`s (Image, later Points / Labels /
Volume), each with its own colormap (LUT), contrast limits, gamma, opacity, and blending.

It is **not** a port of napari's Python code or its Qt GUI. It is a faithful port of
napari's *rendering concepts* — the layer→visual model, per-layer GPU colormapping,
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

The first downstream consumer will be the `jax-image-visualization` library in the
`jit-ui` monorepo, which will add napari-js as a new `IVisualizer` backend alongside its
OpenSeadragon and Plotly backends. **That integration is a later phase** (see
[`docs/06-jit-ui-integration.md`](./docs/06-jit-ui-integration.md)); napari-js is built
and published independently first.

## Docs

| Doc | Contents |
|-----|----------|
| [00 — Feasibility](./docs/00-feasibility.md) | Why this is feasible: napari architecture findings, what ports cleanly, what's hard |
| [01 — Architecture](./docs/01-architecture.md) | Engine module layout, render loop, design principles |
| [02 — Public API](./docs/02-public-api.md) | The `Viewer` / `Layer` / `Colormap` / `TextureSource` API surface |
| [03 — RenderState IR](./docs/03-render-state-ir.md) | The serializable intermediate representation between model and GPU |
| [04 — WGSL rendering plan](./docs/04-wgsl-rendering-plan.md) | Shader pipelines: image+colormap, multi-channel compositing, future raycasting |
| [05 — Roadmap](./docs/05-roadmap.md) | Milestones NJ-0 … NJ-5+ |
| [06 — jit-ui integration](./docs/06-jit-ui-integration.md) | Phase C: the `IVisualizer` adapter in jax-image-visualization (deferred) |
| [07 — napari concept mapping](./docs/07-napari-concept-mapping.md) | How each napari concept maps to napari-js |

## License

TBD.
