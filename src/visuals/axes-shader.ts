/** Solid-colour line shader for the {@link AxesVisual}: transform world-space line vertices by the
 *  3D camera MVP and emit the per-vertex colour. */
export const AXES_SHADER = /* wgsl */ `
struct Uniforms { mvp: mat4x4<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VSOut {
  @builtin(position) clip: vec4<f32>,
  @location(0) color: vec3<f32>,
};

@vertex
fn vs(@location(0) pos: vec3<f32>, @location(1) color: vec3<f32>) -> VSOut {
  var out: VSOut;
  out.clip = u.mvp * vec4<f32>(pos, 1.0);
  out.color = color;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4<f32> {
  return vec4<f32>(in.color, 1.0);
}
`;
