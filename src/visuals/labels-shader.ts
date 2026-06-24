// Label image display: nearest-sample an 8-bit id texture, look the id up in a cyclic RGBA
// palette LUT, with background (id 0) transparent and an optional selected-only filter.
export const LABELS_SHADER = /* wgsl */ `
struct U {
  mvp : mat4x4<f32>,
  imageSize : vec2<f32>,
  origin : vec2<f32>,
  params : vec4<f32>,   // selectedLabel, showSelectedOnly, opacity, lutSize
};
@group(0) @binding(0) var<uniform> u : U;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var labelTex : texture_2d<f32>;
@group(0) @binding(3) var lutSamp : sampler;
@group(0) @binding(4) var lut : texture_2d<f32>;

struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vs(@builtin(vertex_index) vi : u32) -> VSOut {
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 0.0), vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0),
  );
  let c = corners[vi];
  var out : VSOut;
  out.position = u.mvp * vec4<f32>(u.origin + c * u.imageSize, 0.0, 1.0);
  out.uv = c;
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4<f32> {
  let raw = textureSample(labelTex, samp, in.uv).r;
  let id = round(raw * 255.0);
  let lutSize = u.params.w;
  var rgba = textureSample(lut, lutSamp, vec2<f32>((id + 0.5) / lutSize, 0.5));
  if (u.params.y > 0.5 && abs(id - u.params.x) > 0.5) { rgba.a = 0.0; } // show-selected-only
  let a = rgba.a * u.params.z;
  return vec4<f32>(rgba.rgb * a, a);
}
`;
