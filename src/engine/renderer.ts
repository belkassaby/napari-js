import { CanvasTarget } from './canvas';
import { QUAD_SHADER } from '../visuals/shaders';
import { makeCheckerboard } from '../color/checkerboard';

/**
 * NJ-0 demo renderer: clears the swapchain and draws a single textured quad. Its purpose is
 * to exercise the whole pipeline end-to-end — shader module, render pipeline, texture upload,
 * sampler, bind group, render pass, present — proving the WebGPU bootstrap works. It is
 * replaced by the layer/visual renderer in NJ-1.
 */
export class DemoRenderer {
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;

  constructor(
    private readonly device: GPUDevice,
    private readonly target: CanvasTarget,
  ) {
    const module = device.createShaderModule({ code: QUAD_SHADER });
    this.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: target.format }] },
      primitive: { topology: 'triangle-list' },
    });

    const size = 256;
    const texture = device.createTexture({
      size: [size, size],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    device.queue.writeTexture(
      { texture },
      makeCheckerboard(size, 8),
      { bytesPerRow: size * 4, rowsPerImage: size },
      { width: size, height: size },
    );

    const sampler = device.createSampler({ magFilter: 'nearest', minFilter: 'nearest' });
    this.bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });
  }

  render(clear: GPUColor = { r: 0.07, g: 0.07, b: 0.09, a: 1 }): void {
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.target.view,
          clearValue: clear,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}
