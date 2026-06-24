# 01 — Architecture

## Design principles

1. **Faithful to napari's model.** A `Viewer` owns a `LayerList`, a `Camera`, and `Dims`.
   Each `Layer` carries data + display properties (colormap, contrast limits, gamma,
   opacity, blending). Multi-channel images are modeled as *one Image layer per channel*
   with additive blending — exactly as napari does. This keeps the mental model and the
   port 1:1.
2. **Model is render-agnostic and headless-testable.** The scene model emits events; the
   renderer subscribes. The model can be instantiated and unit-tested with no GPU
   (mirroring napari, where `ViewerModel()` runs headless).
3. **Pixels arrive through a pluggable `TextureSource`.** The engine never assumes one big
   in-memory array. A source yields tiles / crops / bitmaps / typed arrays on demand. This
   is what lets the same engine serve a local file in the dev playground and server-fed
   tiles in the eventual jit-ui integration. See [02 — Public API](./02-public-api.md).
4. **A serializable RenderState IR sits between model and GPU.** Each frame, layers are
   reduced to a flat, JSON-serializable description (see
   [03 — RenderState IR](./03-render-state-ir.md)). The WebGPU renderer consumes only the
   IR — never the model directly. This boundary makes the renderer swappable/testable and
   makes a future remote-rendering or worker-thread split possible.
5. **Framework-agnostic core.** No Angular/React. The public surface is plain TS + a
   `<canvas>`. UI bindings (if any) live in consumers.

## Module layout

```
src/
  index.ts                     Public API barrel (see doc 02)

  scene/                       Headless model — no WebGPU imports
    viewer-model.ts            Viewer state: layers, camera, dims, events
    layer-list.ts              Ordered, evented collection
    dims.ts                    Displayed dims, current step (z-slice, time)
    render-state.ts            Model → serializable IR reducer (doc 03)
    events.ts                  Tiny typed event emitter (psygnal/Event analog)

  layers/                      Data + display model per layer type
    layer.ts                   Base: opacity, blending, visible, transform, events
    image-layer.ts             data source, colormap, contrastLimits, gamma, interpolation
    points-layer.ts            (NJ-5) positions, sizes, colors, symbols
    labels-layer.ts            (NJ-5) label image + color LUT, selected label
    volume-layer.ts            (NJ-5+) 3D field, rendering mode, iso threshold

  engine/                      WebGPU runtime — owns the device
    device.ts                  Adapter/device request, feature/limit negotiation
    canvas.ts                  Canvas context, swapchain config, resize/DPR handling
    renderer.ts                Render loop; walks RenderState, dispatches visuals
    resources.ts               Buffer/texture/bind-group pools and caching

  visuals/                     IR entry → GPU pipeline (the layer_to_visual analog)
    visual.ts                  Visual interface; registry mapping IR layer kind → visual
    image-visual.ts            Quad + sampler + colormap LUT + window/gamma uniforms
    shaders/
      image-colormap.wgsl      window → gamma → invert → LUT → blend
      fullscreen.wgsl          shared vertex stage

  color/
    colormap.ts                Colormap type + named colormaps (viridis, gray, magma…)
    lut.ts                     Colormap → 256×1 (or 2D) RGBA LUT texture

  camera/
    camera.ts                  2D pan/zoom orthographic (NJ-1); 3D arcball (NJ-5+)
    transform.ts               Affine (scale/translate/rotate/shear) → mat4, serializable
    controls.ts                Pointer/wheel → camera updates

  io/
    texture-source.ts          TextureSource interface + built-in sources
    sources/
      bitmap-source.ts         ImageBitmap / HTMLImageElement / Blob / URL
      typed-array-source.ts    Float32/Uint8/Uint16 arrays + shape
      tiled-source.ts          (NJ-3) pyramidal/tiled, async tiles + LRU cache

playground/                    Vite dev app: load image, add channels, tweak colormap
test/                          Vitest unit tests (GPU-free: model, LUT, camera, transforms)
```

## Render loop

```
pointer / wheel ─▶ camera.controls ─▶ Camera (model)
                                          │ emits change
model mutation (addImage, set colormap) ──┤ emits change
                                          ▼
                          schedule frame (requestAnimationFrame, coalesced)
                                          ▼
                  RenderState.fromViewer(model)   ← reduce model to flat IR
                                          ▼
                  renderer.render(ir):
                    for layer in ir.layers (in order):
                      visual = registry[layer.kind]
                      visual.sync(layer)          ← upload changed textures/uniforms
                      visual.encode(pass)         ← draw with blend state from layer
                                          ▼
                                   present()
```

Frames are **pull-based and coalesced**: model/camera changes mark the viewer dirty;
a single rAF tick rebuilds the IR and redraws. No redraw when nothing changed.

## Threading / async

- Tile/data fetching is async (`TextureSource` returns Promises/streams); decode can move
  to a Web Worker + `OffscreenCanvas` later without changing the model.
- The model is synchronous and single-threaded; only I/O is async. This mirrors napari's
  NAP-4 async-slicing split (responsive UI, demand-driven data) without Qt threads.

## Build & test stack (target for NJ-0)

- **Language:** TypeScript, `strict: true`.
- **Bundler:** Vite (library mode for the package; dev server for `playground/`).
- **Types:** `@webgpu/types`.
- **Tests:** Vitest for GPU-free logic (model, LUT generation, camera math, transforms,
  RenderState reduction). GPU behavior is validated in the browser playground / e2e, not in
  unit tests (headless WebGPU in CI is unreliable).
- **Output:** ESM + types, published to npm as a single package.
