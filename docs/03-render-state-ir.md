# 03 — RenderState IR

The **RenderState IR** is a flat, JSON-serializable description of what to draw this frame.
It is produced by reducing the scene model (`scene/render-state.ts`) and consumed by the
WebGPU renderer. The renderer never touches the model directly.

## Why an explicit IR

This boundary is the single most important design decision, lifted from what the napari
analysis revealed: napari's `_vispy` wrappers already compute exactly this flat description
implicitly (pixel array + colormap + clims + gamma + transform + blend) before pushing to a
VisPy node — there just isn't a named type for it. We make it explicit because it:

- **decouples** the model from the renderer (swap/replace either side),
- makes the renderer **unit-testable** from fixtures with no model,
- enables **future splits**: render in a worker, or serialize over the wire for remote
  rendering, with no API change,
- gives a **stable contract** for the eventual jit-ui adapter to reason about.

Large pixel payloads are referenced by **handle**, not embedded — the IR stays small and
cheap to rebuild every frame; texture data is uploaded once and reused.

## Shape

```ts
interface RenderState {
  /** Output target size in device pixels. */
  viewport: { width: number; height: number; dpr: number };
  camera: CameraState;
  /** Background clear color, RGBA 0..1. */
  background: [number, number, number, number];
  /** Draw order = array order (index 0 drawn first / bottom). */
  layers: LayerRenderState[];
}

interface CameraState {
  /** 2D: orthographic. 3D (NJ-5+): adds angles + perspective. */
  kind: '2d' | '3d';
  center: number[]; // world coords (y, x) or (z, y, x)
  zoom: number; // canvas px per world px
  angles?: [number, number, number]; // Euler degrees, 3D only
  perspective?: number; // FOV degrees; 0 = orthographic
}

type LayerRenderState =
  | ImageLayerRS
  | PointsLayerRS // NJ-5
  | LabelsLayerRS // NJ-5
  | VolumeLayerRS; // NJ-5+

interface LayerRenderStateBase {
  id: string;
  kind: 'image' | 'points' | 'labels' | 'volume';
  visible: boolean;
  opacity: number; // 0..1
  blending: BlendMode; // 'opaque'|'translucent'|'translucent-no-depth'|'additive'|'minimum'
  /** Data→world affine as a column-major mat4 (already sliced to displayed dims). */
  transform: Float32Array; // length 16
}

interface ImageLayerRS extends LayerRenderStateBase {
  kind: 'image';
  texture: TextureHandle; // opaque handle into the resource pool
  textureFormat: 'r8unorm' | 'r16uint' | 'r16float' | 'r32float' | 'rgba8unorm';
  /** Normalization window in source-data units (e.g. [0, 4095] for 12-bit). */
  contrastLimits: [number, number];
  gamma: number;
  invert: boolean;
  interpolation: 'nearest' | 'linear';
  /** null for already-RGBA textures; a LUT handle for scalar→color mapping. */
  colormapLut: TextureHandle | null;
}
```

`BlendMode` maps 1:1 to WebGPU `GPUBlendState` (see doc 04). The numbers above are the
exact contract the OpenSeadragon CPU display pipeline produces today
(`jit-ui .../osd/display-pipeline.ts`: window → gamma → invert → LUT); napari-js moves that
math into the fragment shader.

## Resource handles

```ts
type TextureHandle = number; // index into engine/resources.ts pool
```

The reducer does not allocate GPU resources. It records, per layer, a stable handle and a
content version. The renderer's `visual.sync()` step compares versions and re-uploads only
when data actually changed — so changing a colormap or contrast limit (uniform-only) never
re-touches the texture.

## Reduction contract

```ts
// scene/render-state.ts
function fromViewer(viewer: ViewerModel): RenderState;
```

Rules:

- Pure and synchronous: same model state → identical IR (modulo handle identity).
- Cheap: called every dirty frame; no allocation of large buffers.
- Deterministic order: `layers` follows `LayerList` order exactly.
- Hidden layers are still emitted with `visible: false` (renderer skips them) so handles
  stay stable across visibility toggles.

## Test strategy

`fromViewer` and each `LayerRenderState` shape are covered by Vitest fixtures with no GPU:
construct a `ViewerModel`, add layers, assert the emitted IR. This pins the model→renderer
contract independently of WebGPU.
