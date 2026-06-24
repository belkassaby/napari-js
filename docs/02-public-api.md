# 02 — Public API (proposed)

The API mirrors napari's Python API where it sensibly can, so the two stay conceptually
aligned. This is a **design proposal** for v0.1 — to be ratified/adjusted during NJ-1/NJ-2
and frozen at NJ-4.

## Creating a viewer

```ts
import { Viewer } from 'napari-js';

const viewer = new Viewer({
  canvas: document.querySelector('canvas')!, // or { container } to create one
  // optional: device, colorSpace, devicePixelRatio
});
await viewer.ready; // WebGPU device acquired
```

`Viewer` is the single entry point. It owns the model (`layers`, `camera`, `dims`) and the
engine. Disposing:

```ts
viewer.dispose(); // tears down GPU resources + listeners
```

## Adding image layers

napari parity: `viewer.add_image(data, **kwargs)` → `viewer.addImage(data, opts)`.

```ts
const layer = viewer.addImage(source, {
  name: 'DAPI',
  colormap: 'blue', // named colormap or a Colormap object
  contrastLimits: [0, 4095], // window; defaults to data dtype range / percentile
  gamma: 1.0,
  opacity: 1.0,
  blending: 'additive', // 'opaque' | 'translucent' | 'additive' | 'minimum'
  visible: true,
  interpolation: 'linear', // 'nearest' | 'linear'
  scale: [1, 1], // physical pixel size (e.g. µm); drives the transform
  translate: [0, 0],
});
```

`source` is anything accepted by a `TextureSource` (see below): an `ImageBitmap`,
`HTMLImageElement`, `Blob`, URL string, or `{ data, shape, dtype }` typed-array descriptor.

### Multi-channel = one layer per channel

There is no special "multi-channel layer." A 4-channel fluorescence image is four
`addImage` calls with different colormaps and `blending: 'additive'` — identical to
napari, and identical to the Fiji "Merge Channels" model the OpenSeadragon backend already
emulates on the CPU. napari-js does the compositing on the GPU.

```ts
viewer.addImage(ch0, { colormap: 'blue', blending: 'additive', contrastLimits: [0, 4095] });
viewer.addImage(ch1, { colormap: 'green', blending: 'additive', contrastLimits: [0, 4095] });
viewer.addImage(ch2, { colormap: 'red', blending: 'additive', contrastLimits: [0, 4095] });
```

## Live display updates (no re-fetch)

All display properties are reactive setters — changing them updates a GPU uniform and
redraws; it does not re-upload texture data.

```ts
layer.colormap = 'magma';
layer.contrastLimits = [200, 3000];
layer.gamma = 0.8;
layer.opacity = 0.5;
layer.visible = false;
```

## Layer types (planned)

| Class         | Milestone   | Key properties                                                      |
| ------------- | ----------- | ------------------------------------------------------------------- | ----- | ------------------------------ |
| `ImageLayer`  | NJ-1 / NJ-2 | `colormap`, `contrastLimits`, `gamma`, `interpolation`, `blending`  |
| `PointsLayer` | NJ-5        | `data` (N×D), `size`, `faceColor`, `borderColor`, `symbol`          |
| `LabelsLayer` | NJ-5        | `data` (int image), `colormap` (cyclic), `selectedLabel`, `opacity` |
| `VolumeLayer` | NJ-5+       | `data` (3D), `rendering` ('mip'                                     | 'iso' | 'translucent'), `isoThreshold` |

`viewer.layers` is an evented, ordered `LayerList`: `add`, `remove`, `move`, `clear`,
`[Symbol.iterator]`, and `events.changed`.

## Camera & dims

```ts
viewer.camera.center = [y, x]; // world coords
viewer.camera.zoom = 1.5; // canvas px per world px
viewer.camera.events.changed.connect(handler);

viewer.dims.ndisplay = 2; // 2 (slice) or 3 (volume, NJ-5+)
viewer.dims.currentStep = [z]; // z-slice / time index for stacks (NJ-3)
```

## TextureSource (the pixel-ingestion seam)

The engine pulls pixels through this interface, so the data origin is pluggable. Built-in
sources cover local data; downstream consumers implement their own (e.g. server tiles).

```ts
interface TextureSource {
  /** Logical full-resolution size, in pixels. */
  readonly shape: { width: number; height: number; depth?: number };
  /** Sample format hint for the GPU texture. */
  readonly dtype: 'uint8' | 'uint16' | 'float32';
  readonly channels: 1 | 3 | 4;
  /** Number of pyramid levels (1 = not pyramidal). */
  readonly levels?: number;

  /** Fetch a region at a pyramid level as GPU-uploadable pixels.
   *  Tiled/pyramidal sources implement this lazily; simple sources return the whole image. */
  read(region: Region, level: number, z?: number): Promise<PixelChunk>;
}

interface PixelChunk {
  data: ArrayBufferView | ImageBitmap; // typed array or decoded bitmap
  region: Region; // where it belongs in level coords
}
```

Built-in sources (NJ-1 → NJ-3):

- `BitmapSource(blobOrUrlOrBitmap)` — decode-and-upload a single image.
- `TypedArraySource({ data, shape, dtype, channels })` — raw scalar arrays (incl. 16-bit).
- `TiledSource({ shape, levels, tileSize, fetchTile })` — pyramidal large images with an
  LRU tile cache; `fetchTile(level, col, row, z) => Promise<PixelChunk>` is host-supplied.

> The eventual jit-ui adapter (doc 06) will implement a `TiledSource.fetchTile` that calls
> the existing `/tile` endpoint and `TileAccessPort.zoomOnRegion`. napari-js itself stays
> ignorant of any server.

## Readback & export (NJ-4)

```ts
const px = await viewer.readDisplayedPixels(); // { width, height, channels, data }
const blob = await viewer.screenshot(); // composited PNG Blob
const hist = await viewer.histogram(layer, 256); // bins from displayed pixels
```

## Events summary

- `viewer.events.ready`
- `viewer.layers.events.changed`
- `layer.events.{data,colormap,contrastLimits,gamma,opacity,visible,blending}`
- `viewer.camera.events.changed`
- `viewer.dims.events.currentStep`
