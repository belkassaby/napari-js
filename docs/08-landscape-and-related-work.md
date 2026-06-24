# 08 — Landscape & related work

Research into whether a browser-based napari already exists, the state of "napari in the
browser" efforts (including CZI-funded work), and how **napari-js** differs. Findings are
from public sources (mid-2026); confidence is flagged where the public record is thin —
**verify the CZI specifics with the napari core team before relying on them.**

## TL;DR

- There is **no native-JavaScript port of napari** in production. The closest browser
  bioimage viewers (Viv, vizarr) are **WebGL format-viewers**, not a napari viewer model.
- "napari in the browser" is **on napari's official roadmap but not delivered** — it depends
  on first decoupling napari's core from Qt and VisPy, then targeting WebAssembly/Pyodide.
- CZI is napari's primary funder (core + plugin ecosystem). A dedicated, **publicly
  documented CZI grant for a _JavaScript_ browser napari was not found**; the browser/WASM
  direction is funded indirectly via core-API work, and the Python-side modular-viewer
  effort (`ndv`, pygfx/wgpu) is the visible work-in-progress.
- **napari-js is deliberately different:** a native TypeScript + **WebGPU** re-implementation
  of napari's _layered viewer model_ that runs 100% client-side, with no Python, Pyodide,
  WASM payload, or kernel.

## 1. Does a browser-based napari (in JavaScript) already exist?

**No.** napari itself is Python, built on Qt (GUI) + VisPy/OpenGL (rendering); see
[00 — Feasibility](./00-feasibility.md). The browser bioimage-viewer space in JS is occupied
by **format-specific multiscale viewers**, not a napari port:

- **Viv** (HMS-DBMI) — a JS/TypeScript library for multiscale, multi-channel rendering of
  OME-TIFF and OME-NGFF (Zarr) **directly in the browser**, implemented as **deck.gl/WebGL**
  layers (WebGL1/WebGL2). It's a rendering library for primary imaging data, not a general
  layered/annotation viewer.
- **Avivator** — Viv's reference app: a purely client-side OME-TIFF/Zarr viewer over HTTP or
  local disk.
- **vizarr** — a minimal, client-side **Zarr** image viewer built on Viv; exposes a small
  Python API via `imjoy-rpc` so it can be embedded in Jupyter/Colab.

How these differ from napari-js: they are **viewers for specific file formats** (Zarr/
OME-TIFF) on **WebGL**, centered on multiscale image display. They do not implement napari's
general **layer model** (Image + Points + Labels + Volume with per-layer colormap/contrast/
gamma/blending), and they are not GPU-compute-capable the way WebGPU is. napari-js is a
**viewer-model** renderer with a pluggable data source, on **WebGPU**.

## 2. Work in progress on a browser-based napari (and the CZI angle)

- **napari's roadmap** lists browser/WebAssembly as a _future_ direction, gated on
  architectural work: a "new napari core API specification … to support declarative
  visualization, viewer serialization, and **front-end agnostic user interfaces**," and
  "identify where **decoupling of existing code from Vispy and Qt** is needed." It names
  "NapariLite, browser, WebAssembly" as applications **under consideration** — i.e. planned,
  **not in progress**.
- **CZI funding (context):** napari is a flagship of CZI's Imaging program and is funded
  through CZI's Essential Open Source Software for Science (EOSS) and napari Plugin
  Accelerator grants; an active CZI napari grant (ref `napari-czi-2024-355351`) is visible on
  Open Collective. **Confidence: low** that any of these is _specifically_ a JavaScript
  browser-napari project — the public materials describe core/ecosystem funding and a roadmap
  that _includes_ eventual browser/WASM support, not a shipped JS browser port. Treat "the
  CZI browser-napari grant" as **unconfirmed** until checked with the team.
- **`ndv`** (pyapp-kit; by napari core developers, incl. Talley Lambert) is the most relevant
  visible WIP: a lightweight, async **n-dimensional array viewer** with a **VisPy _or_ pygfx
  (wgpu)** rendering backend and **Qt / wx / Jupyter** frontends. It runs in a browser **only
  via a Jupyter kernel (Python)** — not as a native JS app. It represents the Python-side
  "decouple the renderer, adopt wgpu/pygfx, run outside Qt" trajectory that a future
  Pyodide-based browser napari would build on.

So the credible path _the napari ecosystem itself_ is on is **Python-in-the-browser**:
decouple core from Qt/VisPy → render via pygfx/wgpu → run under Pyodide/WASM (or a Jupyter
kernel). That is a different bet from napari-js.

## 3. How napari-js differs

|                      | napari (desktop)     | napari-in-browser (roadmap / Pyodide + pygfx, `ndv`) | Viv / vizarr                   | **napari-js**                                     |
| -------------------- | -------------------- | ---------------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| Language / runtime   | Python + Qt          | Python via Pyodide/WASM or Jupyter kernel            | JS/TS, client-side             | **TS, 100% client-side**                          |
| Needs Python/kernel  | yes                  | yes (WASM CPython or server kernel)                  | no                             | **no**                                            |
| Renderer             | VisPy / OpenGL       | pygfx / **wgpu** (in Python)                         | **WebGL** (deck.gl)            | **WebGPU (WGSL)**                                 |
| Model                | full layer model     | full napari model (it _is_ napari)                   | format viewer (no layer model) | **layer model port** (Image/Points/Labels/Volume) |
| 3D volume            | yes                  | yes (pygfx)                                          | limited                        | **yes (raymarch)**                                |
| Data                 | arrays / dask / zarr | same                                                 | Zarr / OME-TIFF                | **pluggable `TextureSource`** (e.g. server tiles) |
| Plugins / Python API | yes                  | yes (inherits napari)                                | n/a                            | **no** (re-implementation, not napari code)       |
| Payload              | native app           | tens of MB WASM                                      | small JS                       | **small JS**                                      |

**The napari-js niche:** a dependency-free **TypeScript + WebGPU** renderer that ports
napari's _rendering/layer model_ and embeds directly in JS/TS web apps (its first consumer is
the Angular `jax-image-visualization` library in `jit-ui`; see
[06 — jit-ui integration](./06-jit-ui-integration.md)). It fills the gap between:

- **format-specific WebGL viewers** (Viv/vizarr) — which aren't a napari-style layered viewer
  and aren't WebGPU; and
- **Python-in-the-browser napari** (the roadmap / Pyodide + pygfx / `ndv` direction) — which
  delivers _actual napari_ (and its Python ecosystem) but at the cost of a heavy WASM Python
  runtime and a Python execution model.

**The explicit trade-off:** because napari-js re-implements the rendering model rather than
running napari's Python, it does **not** inherit napari's plugins, readers, or analysis API.
It is a _renderer_, not napari. Where you need napari's Python ecosystem in the browser, the
Pyodide/pygfx path is the right tool; where you need a small, native-JS, WebGPU image/volume
renderer inside a web app, napari-js is.

## Sources

- napari roadmap (browser/WebAssembly, decouple from Qt/VisPy): <https://napari.org/dev/roadmaps/active_roadmap.html>
- napari (project): <https://napari.org/> · <https://github.com/napari/napari>
- CZI napari program & grants: <https://chanzuckerberg.com/science/programs-resources/imaging/napari/> · <https://chanzuckerberg.com/rfa/essential-open-source-software-for-science/>
- CZI napari grant (Open Collective): <https://opencollective.com/napari-czi-2024-355351/contribute>
- Viv: <https://github.com/hms-dbmi/viv> · <http://viv.gehlenborglab.org/>
- vizarr: <https://github.com/hms-dbmi/vizarr>
- ndv (pygfx/wgpu, Qt/wx/Jupyter): <https://github.com/pyapp-kit/ndv> · <https://pyapp-kit.github.io/ndv/dev/>
- Pyodide (Python in the browser via WASM): <https://pyodide.org/>
- pygfx / wgpu-py browser status: see [00 — Feasibility](./00-feasibility.md)
