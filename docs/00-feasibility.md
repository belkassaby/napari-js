# 00 — Feasibility

This is the condensed feasibility finding that motivated the project. It is based on a
read of the napari codebase (`~/git/napari`, ~169K LOC of Python) and the current state
of the browser GPU ecosystem.

## Verdict

**Feasible, well-bounded, but the renderer must be built from scratch.** napari's model
is cleanly separable from its rendering and GUI, and the data each visual consumes is flat
and serializable — so porting the *rendering model* to WebGPU is tractable. The difficulty
is concentrated in one place: there is no renderer abstraction to reuse, and volume
raycasting is hard on WebGPU.

## What the napari codebase looks like

| Layer | LOC | Portability |
|---|---|---|
| Core model — `components/`, `layers/`, `utils/events/` | ~70K | ✅ Qt-free, render-free, serializable |
| App/command model — `_app_model/` | small | ✅ GUI-agnostic |
| Rendering — `_vispy/` | ~11K | ❌ Hardcoded to VisPy + OpenGL, **no abstraction** |
| GUI — `_qt/` | ~37K | ❌ Qt (not relevant to us) |

Key facts established by reading the source:

- **The model is render-agnostic.** `ViewerModel` (`napari/components/viewer_model.py:155`)
  is a pydantic-v2 `EventedModel` with zero Qt and zero `_vispy` imports. Layers
  (`napari/layers/`) import no rendering code. The event system
  (`napari/utils/events/`) is a custom emitter, not Qt signals.
- **Rendering is a thin, registry-based wrapper over VisPy.** `napari/_vispy/utils/visual.py:62`
  is a literal `layer_to_visual` dict mapping each `Layer` subclass to a `Vispy*Layer`
  wrapper. Each wrapper subscribes to layer events and pushes data to a VisPy node.
- **The data crossing the model→renderer boundary is flat and serializable.** For an Image
  layer: pixel array, colormap, contrast limits, gamma, interpolation mode, blending, plus
  an affine transform (`layer._transforms.simplified`, plain numpy) and a numeric camera
  (center, zoom, Euler angles). For Points: positions, sizes, face/border colors, symbols.
  None of this is intrinsically tied to OpenGL.
- **napari's own custom shaders are small** (~331 lines of GLSL inline in Python: label LUT
  lookups + volume gradients/lighting/categorical in `napari/_vispy/visuals/volume.py` and
  `.../layers/labels.py`). GLSL→WGSL is mechanical for these. The genuinely hard shader is
  VisPy's *base* volume raycasting loop, which napari extends but does not own.

## What this means for napari-js

We cannot lift VisPy, so we reimplement the renderer in WebGPU. But because the model is
already a clean producer of serializable render state, napari-js can mirror that model
faithfully and feed an equivalent WebGPU pipeline. The port is therefore a **re-expression
of a well-understood contract**, not reverse-engineering.

## External enablers (verified, mid-2026)

- **WebGPU** ships by default in Chrome, Firefox, Safari, Edge (since late 2025).
- The Python-side `wgpu-py`/`pygfx` stack is independently moving toward browser/Pyodide
  support, validating WebGPU as the right target — but we deliberately do **not** depend on
  it; napari-js is native TypeScript.

## Difficulty ranking (what we defer)

1. **Easy / first:** 2D image + colormap/contrast/gamma (single channel, then multi-channel
   additive compositing). This is the priority milestone.
2. **Medium:** points (instanced SDF markers), labels (LUT lookup shaders — direct GLSL→WGSL
   ports), tiled/pyramidal large images, z-stacks.
3. **Hard / last:** volume raycasting (WebGPU compute shaders). This is the main risk and is
   scheduled last; see [04 — WGSL rendering plan](./04-wgsl-rendering-plan.md).
