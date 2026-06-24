// Instanced point markers with SDF shapes (disc / ring / square) and an antialiased border.
// One instanced quad per point; size/colors/borderWidth are per-instance vertex attributes.
// Premultiplied output for the canvas 'premultiplied' alpha mode.
export const POINTS_SHADER = /* wgsl */ `
struct U {
  mvp : mat4x4<f32>,
  params : vec4<f32>,   // symbolCode (0=disc,1=ring,2=square), opacity, 0, 0
};
@group(0) @binding(0) var<uniform> u : U;

struct VSOut {
  @builtin(position) position : vec4<f32>,
  @location(0) local : vec2<f32>,
  @location(1) face : vec4<f32>,
  @location(2) border : vec4<f32>,
  @location(3) borderFrac : f32,
};

@vertex
fn vs(
  @builtin(vertex_index) vi : u32,
  @location(0) pos : vec2<f32>,
  @location(1) size : f32,
  @location(2) face : vec4<f32>,
  @location(3) border : vec4<f32>,
  @location(4) borderWidth : f32,
) -> VSOut {
  var corners = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  );
  let c = corners[vi];
  let world = pos + c * (size * 0.5);
  var out : VSOut;
  out.position = u.mvp * vec4<f32>(world, 0.0, 1.0);
  out.local = c;
  out.face = face;
  out.border = border;
  out.borderFrac = clamp(borderWidth / max(size, 1e-6), 0.0, 1.0);
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4<f32> {
  let symbol = u.params.x;
  let opacity = u.params.y;
  var d : f32;
  if (symbol > 1.5) { d = max(abs(in.local.x), abs(in.local.y)); } // square
  else { d = length(in.local); }                                   // disc / ring

  let aa = max(fwidth(d), 1e-5);
  let inside = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  if (inside <= 0.0) { discard; }

  let borderEdge = 1.0 - in.borderFrac;
  let borderMix = smoothstep(borderEdge - aa, borderEdge, d);
  let rgb = mix(in.face.rgb, in.border.rgb, borderMix);
  var a = mix(in.face.a, in.border.a, borderMix);
  if (symbol > 0.5 && symbol < 1.5) { a = a * borderMix; } // ring: only the border ring shows
  a = a * inside * opacity;
  return vec4<f32>(rgb * a, a);
}
`;
