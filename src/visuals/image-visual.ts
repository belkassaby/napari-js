import type { Camera } from '../camera/camera';
import type { ImageLayer, Interpolation } from '../layers/image-layer';
import type { BlendMode } from '../layers/layer';
import { multiply, scaleTranslate2d } from '../math/mat4';
import { buildLut, LUT_SIZE } from '../color/lut';
import { GRAY } from '../color/colormap';
import { channelsOf } from '../io/texture-source';
import { IMAGE_COLORMAP_SHADER } from './image-colormap-shader';
import { blendStateFor } from './blend';

const UNIFORM_FLOATS = 28; // 112 bytes: mat4(16) + vec2+pad(4) + vec4(4) + vec4(4)
const UNIFORM_BYTES = UNIFORM_FLOATS * 4;

/**
 * Binds one {@link ImageLayer} to a WebGPU pipeline: uploads the source texture and colormap
 * LUT, and draws the layer each frame with its current display uniforms. The napari
 * `Vispy*Layer` wrapper analog — it reads the layer and pushes to the GPU.
 *
 * NJ-1 uploads `uint8` sources (r8unorm / rgba8unorm). float32 / 16-bit land in NJ-2.
 */
export class ImageVisual {
  private readonly module: GPUShaderModule;
  private readonly uniformBuffer: GPUBuffer;
  private readonly scratch = new Float32Array(UNIFORM_FLOATS);

  private texture!: GPUTexture;
  private lutTexture!: GPUTexture;
  private srcSampler!: GPUSampler;
  private lutSampler!: GPUSampler;
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;

  private currentBlend: BlendMode;
  private currentInterp: Interpolation;
  private lutVersion: number;

  /** clim normalization factor: r8unorm/rgba8unorm samples are value/255. */
  private readonly sampleScale: number;
  private readonly isRgba: boolean;

  constructor(
    private readonly device: GPUDevice,
    private readonly format: GPUTextureFormat,
    private readonly layer: ImageLayer,
  ) {
    this.module = device.createShaderModule({ code: IMAGE_COLORMAP_SHADER });
    this.uniformBuffer = device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.isRgba = channelsOf(layer.source) === 4;
    this.sampleScale = 1 / 255;

    this.uploadTexture();
    this.lutTexture = this.createLutTexture();
    this.currentInterp = layer.interpolation;
    this.srcSampler = this.createSrcSampler(layer.interpolation);
    this.lutSampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });
    this.currentBlend = layer.blending;
    this.pipeline = this.buildPipeline(layer.blending);
    this.bindGroup = this.buildBindGroup();
    this.lutVersion = layer.colormapVersion;
  }

  private uploadTexture(): void {
    const src = this.layer.source;
    if (src.kind === 'external') {
      this.texture = this.device.createTexture({
        size: [src.width, src.height],
        format: 'rgba8unorm',
        usage:
          GPUTextureUsage.TEXTURE_BINDING |
          GPUTextureUsage.COPY_DST |
          GPUTextureUsage.RENDER_ATTACHMENT,
      });
      this.device.queue.copyExternalImageToTexture(
        { source: src.image },
        { texture: this.texture },
        [src.width, src.height],
      );
      return;
    }

    if (src.dtype !== 'uint8') {
      throw new Error(
        `napari-js NJ-1 supports uint8 image data; got "${src.dtype}". ` +
          `float32 / 16-bit rendering arrives in NJ-2.`,
      );
    }
    const format: GPUTextureFormat = src.channels === 1 ? 'r8unorm' : 'rgba8unorm';
    const bytesPerPixel = src.channels === 1 ? 1 : 4;
    this.texture = this.device.createTexture({
      size: [src.width, src.height],
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.device.queue.writeTexture(
      { texture: this.texture },
      // User-supplied typed array: cast at the boundary (TS 5.7 widens its buffer generic).
      src.data as GPUAllowSharedBufferSource,
      { bytesPerRow: src.width * bytesPerPixel, rowsPerImage: src.height },
      { width: src.width, height: src.height },
    );
  }

  private createLutTexture(): GPUTexture {
    const tex = this.device.createTexture({
      size: [LUT_SIZE, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.writeLut(tex);
    return tex;
  }

  private writeLut(tex: GPUTexture): void {
    const cmap = this.layer.colormap ?? GRAY;
    this.device.queue.writeTexture(
      { texture: tex },
      buildLut(cmap, LUT_SIZE),
      { bytesPerRow: LUT_SIZE * 4, rowsPerImage: 1 },
      { width: LUT_SIZE, height: 1 },
    );
  }

  private createSrcSampler(interp: Interpolation): GPUSampler {
    const filter: GPUFilterMode = interp === 'nearest' ? 'nearest' : 'linear';
    return this.device.createSampler({
      magFilter: filter,
      minFilter: filter,
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });
  }

  private buildPipeline(blend: BlendMode): GPURenderPipeline {
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: this.module, entryPoint: 'vs' },
      fragment: {
        module: this.module,
        entryPoint: 'fs',
        targets: [{ format: this.format, blend: blendStateFor(blend) }],
      },
      primitive: { topology: 'triangle-list' },
    });
  }

  private buildBindGroup(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.srcSampler },
        { binding: 2, resource: this.texture.createView() },
        { binding: 3, resource: this.lutSampler },
        { binding: 4, resource: this.lutTexture.createView() },
      ],
    });
  }

  /** Reconcile GPU state with the layer's current properties (cheap; called before draw). */
  sync(): void {
    if (this.layer.blending !== this.currentBlend) {
      this.currentBlend = this.layer.blending;
      this.pipeline = this.buildPipeline(this.currentBlend);
      this.bindGroup = this.buildBindGroup();
    }
    if (this.layer.interpolation !== this.currentInterp) {
      this.currentInterp = this.layer.interpolation;
      this.srcSampler = this.createSrcSampler(this.currentInterp);
      this.bindGroup = this.buildBindGroup();
    }
    if (this.layer.colormapVersion !== this.lutVersion) {
      this.lutVersion = this.layer.colormapVersion;
      this.writeLut(this.lutTexture); // same texture object → no bind-group rebuild
    }
  }

  /** Encode a draw of this layer for a `vw`×`vh` CSS-pixel viewport. */
  draw(pass: GPURenderPassEncoder, camera: Camera, vw: number, vh: number): void {
    const src = this.layer.source;
    const model = scaleTranslate2d(
      this.layer.scale[0],
      this.layer.scale[1],
      this.layer.translate[0],
      this.layer.translate[1],
    );
    const mvp = multiply(camera.viewProjection(vw, vh), model);

    const s = this.scratch;
    s.set(mvp, 0);
    s[16] = src.width;
    s[17] = src.height;
    s[18] = 0;
    s[19] = 0;
    const [lo, hi] = this.layer.contrastLimits;
    s[20] = lo * this.sampleScale;
    s[21] = hi * this.sampleScale;
    s[22] = this.layer.gamma;
    s[23] = this.layer.opacity;
    s[24] = this.isRgba ? 1 : 0;
    s[25] = this.layer.invert ? 1 : 0;
    s[26] = 0;
    s[27] = 0;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, s);

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
  }

  dispose(): void {
    this.texture.destroy();
    this.lutTexture.destroy();
    this.uniformBuffer.destroy();
  }
}
