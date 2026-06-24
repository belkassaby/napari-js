import type { LabelsLayer } from '../layers/labels-layer';
import type { BlendMode } from '../layers/layer';
import type { LayerVisual, RenderView } from './layer-visual';
import { multiply, scaleTranslate2d } from '../math/mat4';
import { buildLabelLut } from '../color/label-colormap';
import { LABELS_SHADER } from './labels-shader';
import { blendStateFor } from './blend';

const LUT_SIZE = 256;
const UNIFORM_FLOATS = 24; // mat4(16) + vec2 imageSize + vec2 origin + vec4 params
const UNIFORM_BYTES = UNIFORM_FLOATS * 4;

/** Renders a {@link LabelsLayer}: nearest-sampled id texture + cyclic palette LUT. */
export class LabelsVisual implements LayerVisual {
  readonly ndisplay = 2 as 2 | 3;
  private readonly module: GPUShaderModule;
  private readonly uniformBuffer: GPUBuffer;
  private readonly scratch = new Float32Array(UNIFORM_FLOATS);
  private readonly texture: GPUTexture;
  private readonly lutTexture: GPUTexture;
  private readonly sampler: GPUSampler;
  private readonly bindGroup: GPUBindGroup;
  private pipeline: GPURenderPipeline;
  private currentBlend: BlendMode;

  constructor(
    private readonly device: GPUDevice,
    private readonly format: GPUTextureFormat,
    private readonly layer: LabelsLayer,
  ) {
    this.module = device.createShaderModule({ code: LABELS_SHADER });
    this.uniformBuffer = device.createBuffer({
      size: UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Label id texture (r8unorm, nearest — ids must not be interpolated).
    this.texture = device.createTexture({
      size: [layer.width, layer.height],
      format: 'r8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture: this.texture },
      layer.data as GPUAllowSharedBufferSource,
      { bytesPerRow: layer.width, rowsPerImage: layer.height },
      { width: layer.width, height: layer.height },
    );

    // Cyclic palette LUT.
    this.lutTexture = device.createTexture({
      size: [LUT_SIZE, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture: this.lutTexture },
      buildLabelLut(LUT_SIZE),
      { bytesPerRow: LUT_SIZE * 4, rowsPerImage: 1 },
      { width: LUT_SIZE, height: 1 },
    );

    this.sampler = device.createSampler({
      magFilter: 'nearest', minFilter: 'nearest',
      addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge',
    });

    this.currentBlend = layer.blending;
    this.pipeline = this.buildPipeline(layer.blending);
    this.bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.texture.createView() },
        { binding: 3, resource: this.sampler },
        { binding: 4, resource: this.lutTexture.createView() },
      ],
    });
  }

  private buildPipeline(blend: BlendMode): GPURenderPipeline {
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: this.module, entryPoint: 'vs' },
      fragment: { module: this.module, entryPoint: 'fs', targets: [{ format: this.format, blend: blendStateFor(blend) }] },
      primitive: { topology: 'triangle-list' },
    });
  }

  sync(): void {
    if (this.layer.blending !== this.currentBlend) {
      this.currentBlend = this.layer.blending;
      this.pipeline = this.buildPipeline(this.currentBlend);
      // 'auto' layout is stable across blend-only rebuilds, so the bind group stays valid.
    }
  }

  draw(pass: GPURenderPassEncoder, view: RenderView): void {
    const mvp = multiply(
      view.camera2d.viewProjection(view.vw, view.vh),
      scaleTranslate2d(this.layer.scale[0], this.layer.scale[1], this.layer.translate[0], this.layer.translate[1]),
    );
    const s = this.scratch;
    s.set(mvp, 0);
    s[16] = this.layer.width;
    s[17] = this.layer.height;
    s[18] = 0;
    s[19] = 0;
    s[20] = this.layer.selectedLabel;
    s[21] = this.layer.showSelectedOnly ? 1 : 0;
    s[22] = this.layer.opacity;
    s[23] = LUT_SIZE;
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
