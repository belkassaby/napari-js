# 04 — WGSL rendering plan

How each layer kind is drawn on WebGPU. Ordered by milestone; the image path is the
foundation everything else builds on.

## Image + colormap (NJ-1 / NJ-2) — the core

A layer is drawn as a unit quad in data space, transformed to clip space by
`camera * layer.transform`. The fragment shader reads the source texel, normalizes it,
applies gamma, and maps through a colormap LUT.

### Pipeline

- **Vertex:** fullscreen/unit quad; positions from the layer transform + camera matrices
  (uniform buffer).
- **Fragment** (`shaders/image-colormap.wgsl`), per texel:
  1. Sample source (`r8unorm` / `r16uint` / `r16float` / `r32float` / `rgba8unorm`).
  2. **Window:** `t = (value - clim.lo) / (clim.hi - clim.lo)`, clamp 0..1. For integer
     formats (`r16uint`) the raw integer is windowed directly so native bit depth is
     preserved (matches OSD's 16-bit windowing from per-channel min/max).
  3. **Invert** (optional): `t = 1 - t`.
  4. **Gamma:** `t = pow(t, gamma)`.
  5. **Colormap:** `rgb = textureSample(lut, t)` for scalar inputs; passthrough for RGBA.
  6. Output `vec4(rgb, alpha * opacity)`.

Uniforms: `clim`, `gamma`, `invert`, `opacity`, transform matrices. Changing any is a
buffer write + redraw — **no texture re-upload**.

### Multi-channel additive compositing (NJ-2, priority)

No special pipeline. Each channel is its own image layer drawn in order with
`blending: 'additive'`. WebGPU blend state per the table below; the framebuffer accumulates.
This is the OpenSeadragon CPU compositing path moved to the GPU — the concrete win over the
existing backend, which lacks `ScalarColormap` and composites on the CPU at ~262k px/tile.

### Blend modes → `GPUBlendState`

| `BlendMode`            | color blend              | notes                      |
| ---------------------- | ------------------------ | -------------------------- |
| `opaque`               | replace (no blend)       | depth write on             |
| `translucent`          | `src.a` / `1-src.a` over | standard alpha             |
| `translucent-no-depth` | same, depth test off     |                            |
| `additive`             | `one` / `one` add        | multi-channel fluorescence |
| `minimum`              | `min` operation          | darkest-wins               |

## Tiled / pyramidal images (NJ-3)

Large images are not one texture. The `TiledSource` yields tiles per pyramid level; the
renderer:

- chooses a level from `camera.zoom`,
- draws one quad per visible tile (each its own texture, positioned by tile origin in the
  layer transform), reusing the same image-colormap fragment shader,
- keeps tiles in an LRU GPU-texture cache (mirrors `jit-ui .../osd/slice-cache.ts`),
- prefetches neighbors/next level at lower priority.

Z-stacks: `dims.currentStep[z]` selects the slice; resident slices cached so scrubbing is
re-upload-free where possible.

## Points (NJ-5)

- **Instanced** unit quads, one instance per point; per-instance position/size/color/symbol
  from storage buffers.
- Symbols via **signed-distance fields** in the fragment shader (circle, square, ring,
  cross, etc.) with antialiasing — the WGSL analog of VisPy's marker visual.
- Optional spherical shading for a 3D look.

## Labels (NJ-5)

- Source is an integer label image; fragment shader does a **LUT lookup** keyed by label id
  → RGBA, with a selected-label highlight path. These are direct ports of napari's existing
  small GLSL label shaders (`napari/_vispy/layers/labels.py`: `auto_lookup_shader_uint8`,
  `_uint16`, `direct_lookup_shader`) to WGSL. Low risk.
- Background label (0) is transparent.

## Volume raycasting (NJ-5+) — the long pole

The hardest piece, scheduled last and de-risked separately.

- WebGPU has no first-class 3D-texture raymarch primitive equivalent to the OpenGL volume
  path VisPy provides. Two candidate approaches, to be prototyped and compared:
  1. **Fragment-shader raymarch** over a `texture_3d` with a front-face proxy cube.
  2. **Compute-shader raymarch** writing to a storage texture, then blit.
- Port napari's own volume WGSL pieces (`napari/_vispy/visuals/volume.py`, ~278 lines:
  fast/smooth Sobel gradients, Phong iso lighting, categorical iso/translucent snippets)
  once the base raymarch loop exists.
- **Decision gate at NJ-5+:** evaluate adopting an existing WebGPU volume renderer vs.
  porting from scratch before committing.

## Shader testing

WGSL correctness is verified in the browser playground against reference outputs (e.g.
compare a known grayscale + viridis composite to a CPU-computed reference image, the same
way `jit-ui` keeps a `test_grayscale.png` fixture). Pure math that feeds the shaders (LUT
generation, windowing parameters, transform matrices) is unit-tested GPU-free in Vitest.
