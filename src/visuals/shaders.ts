// NJ-0 demo shader: a centered textured quad. WGSL is inlined here for the bootstrap; from
// NJ-1 onward, shaders move to dedicated .wgsl files under visuals/shaders/ (see docs/04).
export const QUAD_SHADER = /* wgsl */ `
struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> VSOut {
  // Two triangles covering a centered quad in clip space.
  var positions = array<vec2<f32>, 6>(
    vec2<f32>(-0.8, -0.8), vec2<f32>( 0.8, -0.8), vec2<f32>(-0.8,  0.8),
    vec2<f32>(-0.8,  0.8), vec2<f32>( 0.8, -0.8), vec2<f32>( 0.8,  0.8),
  );
  // UVs with V flipped so the texture is upright on screen.
  var uvs = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 1.0), vec2<f32>(0.0, 0.0),
    vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 1.0), vec2<f32>(1.0, 0.0),
  );
  var out : VSOut;
  out.position = vec4<f32>(positions[vi], 0.0, 1.0);
  out.uv = uvs[vi];
  return out;
}

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var tex : texture_2d<f32>;

@fragment
fn fs(in : VSOut) -> @location(0) vec4<f32> {
  return textureSample(tex, samp, in.uv);
}
`;
