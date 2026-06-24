// Label image display: integer-fetch the id texture with textureLoad (no filtering — ids
// must never be interpolated), look the id up in a cyclic RGBA palette LUT (id % lutSize),
// with background (id 0) transparent and an optional selected-only filter. The id texture is
// r32uint so uint8/uint16/uint32 label images all work exactly.
export const LABELS_SHADER = /* wgsl */ `
struct U {
  mvp : mat4x4<f32>,
  imageSize : vec2<f32>,
  origin : vec2<f32>,
  params : vec4<f32>,   // selectedLabel, showSelectedOnly, opacity, lutSize
};
@group(0) @binding(0) var<uniform> u : U;
@group(0) @binding(1) var labelTex : texture_2d<u32>;
@group(0) @binding(2) var lutSamp : sampler;
@group(0) @binding(3) var lut : texture_2d<f32>;

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
  let dims = vec2<i32>(textureDimensions(labelTex));
  let uv = clamp(in.uv, vec2<f32>(0.0), vec2<f32>(1.0));
  var coord = vec2<i32>(uv * vec2<f32>(dims));
  coord = min(coord, dims - vec2<i32>(1));
  let id = textureLoad(labelTex, coord, 0).r;            // u32 label id

  let lutSize = u32(u.params.w);
  let idMod = id % lutSize;
  var rgba = textureSampleLevel(lut, lutSamp, vec2<f32>((f32(idMod) + 0.5) / u.params.w, 0.5), 0.0);
  if (u.params.y > 0.5 && id != u32(u.params.x)) { rgba.a = 0.0; }   // show-selected-only
  let a = rgba.a * u.params.z;
  return vec4<f32>(rgba.rgb * a, a);
}
`;
