/*
 * DevButter · 3D scenes (raw WebGL 1, zero dependencies).
 * Port of docs/design/assets/scenes3d.js — only the scenes the site uses:
 *   attention (prototype #c1) · neural (prototype #c4) · distill (prototype #c7).
 *
 * Spheres are impostors (one quad, per-pixel normal, real depth); lines are ribbons
 * extruded in screen space. The GL context is created only when the canvas enters the
 * viewport; a single shared loop drives every mounted scene with a 60 fps cap, adaptive
 * resolution and off-screen pause. Without WebGL `mountScene3D` returns null and the
 * caller falls back to the 2D engine.
 */
import { mulberry32 as mulberry } from "./prng";
import type { SceneApi, Scene3DKind } from "./types";

type Vec3 = [number, number, number];
type Attr = readonly [name: string, size: number];
type Uniforms = Record<string, WebGLUniformLocation | null>;

/* ---------- brand colours as linear floats (engine data, mirrors the tokens) ---------- */
const G: Vec3 = [121 / 255, 229 / 255, 155 / 255]; // --db-green #79e59b
const GG: Vec3 = [0, 210 / 255, 106 / 255]; // --db-green-glow #00d26a
const P: Vec3 = [246 / 255, 76 / 255, 111 / 255]; // --db-pink #f64c6f
const PG: Vec3 = [1, 79 / 255, 163 / 255]; // --db-pink-glow #ff4fa3
const GREY: Vec3 = [0.61, 0.65, 0.71]; // ≈ --db-text-secondary #9ca6b5
const BALL_BODY: Vec3 = [0.1, 0.12, 0.14]; // dark glass body, ≈ --db-surface
/* phase-label colours of the neural scene (CSS strings) */
const LBL_GREEN = "rgba(121,229,155,.85)"; // --db-green
const LBL_PINK_GLOW = "rgba(255,79,163,.9)"; // --db-pink-glow
const LBL_PINK = "rgba(246,76,111,.85)"; // --db-pink
const LBL_MUTED = "rgba(90,98,114,.9)"; // --db-text-muted

/* ---------- environment (resolved lazily, client only) ---------- */
interface Env {
  reduce: boolean;
  low: boolean;
  dpr: number;
  embed: boolean;
}
let envCache: Env | null = null;
function getEnv(): Env {
  if (envCache) return envCache;
  const mq = (q: string) => typeof window.matchMedia === "function" && window.matchMedia(q).matches;
  const low = mq("(pointer: coarse)") || (navigator.hardwareConcurrency || 8) <= 4;
  let embed = false;
  try {
    embed = window.top !== window;
  } catch {
    embed = true;
  }
  envCache = {
    reduce: mq("(prefers-reduced-motion: reduce)"),
    low,
    dpr: Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.5),
    embed,
  };
  return envCache;
}

/* ---------- math ---------- */
function perspective(o: Float32Array, fy: number, asp: number, n: number, f: number): void {
  const t = 1 / Math.tan(fy / 2),
    nf = 1 / (n - f);
  o.fill(0);
  o[0] = t / asp;
  o[5] = t;
  o[10] = (f + n) * nf;
  o[11] = -1;
  o[14] = 2 * f * n * nf;
}
function lookAt(o: Float32Array, e: Vec3, c: Vec3): void {
  let zx = e[0] - c[0],
    zy = e[1] - c[1],
    zz = e[2] - c[2],
    l = Math.hypot(zx, zy, zz);
  zx /= l;
  zy /= l;
  zz /= l;
  let xx = zz,
    xz = -zx;
  l = Math.hypot(xx, xz);
  xx /= l;
  xz /= l;
  const yx = zy * xz,
    yy = zz * xx - zx * xz,
    yz = -zy * xx;
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
  o[4] = 0; o[5] = yy; o[6] = zy; o[7] = 0;
  o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
  o[12] = -(xx * e[0] + xz * e[2]);
  o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
  o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
  o[15] = 1;
}
function mul(o: Float32Array, a: Float32Array, b: Float32Array): void {
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
}
const xfv = (m: Float32Array, p: Vec3): Vec3 => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];
const ease = (p: number): number => (p < 0 ? 0 : p > 1 ? 1 : 1 - Math.pow(1 - p, 3));
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp3 = (a: Vec3, b: Vec3, q: number): Vec3 => [
  a[0] + (b[0] - a[0]) * q,
  a[1] + (b[1] - a[1]) * q,
  a[2] + (b[2] - a[2]) * q,
];
const scale3 = (c: Vec3, k: number): Vec3 => [c[0] * k, c[1] * k, c[2] * k];

/* ---------- shared shaders ---------- */
const BALL_VS = `attribute vec3 aC; attribute vec2 aQ; attribute float aR; attribute vec3 aCol; attribute vec3 aE; attribute float aG;
uniform mat4 uV, uP;
varying vec2 vQ; varying vec3 vC, vCol, vE; varying float vR, vG;
void main(){ vec4 c=uV*vec4(aC,1.0); vC=c.xyz; vR=aR; vQ=aQ*1.1; vCol=aCol; vE=aE; vG=aG;
  gl_Position=uP*vec4(c.xyz+vec3(aQ*aR*1.1,0.0),1.0); }`;
const BALL_FS = `#extension GL_EXT_frag_depth : enable
precision highp float;
uniform mat4 uP; uniform vec3 uL0, uL1, uC0, uC1, uAmb, uRim; uniform vec2 uK;
varying vec2 vQ; varying vec3 vC, vCol, vE; varying float vR, vG;
vec3 light(vec3 n, vec3 p, vec3 V, vec3 Lp, vec3 Lc, float k, float sh){
  vec3 l=Lp-p; float d=dot(l,l); vec3 L=l*inversesqrt(d);
  float df=max(dot(n,L),0.0); float sp=pow(max(dot(n,normalize(L+V)),0.0),sh);
  return (vCol*df*(1.0-0.55*vG)+vec3(sp)*(0.2+0.9*vG))*Lc/(1.0+d*k);
}
void main(){
  float r2=dot(vQ,vQ); if(r2>1.0) discard;
  vec3 n=vec3(vQ,sqrt(1.0-r2)); vec3 p=vC+n*vR; vec3 V=normalize(-p);
  float nv=max(dot(n,V),0.0);
  float sh=mix(22.0,110.0,vG);
  vec3 col=vCol*uAmb*(0.55+0.45*n.y);
  col+=light(n,p,V,uL0,uC0,uK.x,sh)+light(n,p,V,uL1,uC1,uK.y,sh);
  float fr=pow(1.0-nv,3.0);
  col+=uRim*fr*(0.1+0.7*vG);
  col+=vE*(0.5+0.5*nv)+vE*fr*0.7*vG;
  col=1.0-exp(-col*1.3);
  float a=1.0-smoothstep(0.9,1.0,r2);
#ifdef GL_EXT_frag_depth
  vec4 cl=uP*vec4(p,1.0); gl_FragDepthEXT=(cl.z/cl.w)*0.5+0.5;
#endif
  gl_FragColor=vec4(col*a,a);
}`;
const SEG_VS = `attribute vec3 aA, aB; attribute vec2 aS; attribute vec4 aCol; attribute float aW;
uniform mat4 uVP; uniform vec2 uRes; uniform float uDpr;
varying vec4 vCol; varying float vS;
void main(){
  vec4 a=uVP*vec4(aA,1.0), b=uVP*vec4(aB,1.0);
  vec2 d=(b.xy/b.w-a.xy/a.w)*uRes; float l=length(d); vec2 n=l>1e-5?vec2(-d.y,d.x)/l:vec2(0.0,1.0);
  vec4 c=aS.x<0.5?a:b;
  c.xy+=n*aS.y*(aW*uDpr+0.55)*2.0/uRes*c.w;
  gl_Position=c; vS=aS.y; vCol=aCol;
}`;
const SEG_FS = `precision highp float; varying vec4 vCol; varying float vS;
void main(){ float e=1.0-abs(vS); float a=vCol.a*smoothstep(0.0,0.9,e); vec3 c=mix(vCol.rgb,vec3(1.0),e*e*e*0.3)*a; gl_FragColor=vec4(c,min(1.0,max(c.r,max(c.g,c.b)))); }`;
const GLOW_VS = `attribute vec3 aC; attribute vec2 aQ; attribute float aR; attribute vec4 aCol;
uniform mat4 uV, uP; uniform float uFlat; varying vec2 vQ; varying vec4 vCol;
void main(){ vQ=aQ; vCol=aCol;
  if(uFlat>0.5) gl_Position=uP*(uV*vec4(aC+vec3(aQ.x,0.0,aQ.y)*aR,1.0));
  else { vec4 c=uV*vec4(aC,1.0); gl_Position=uP*vec4(c.xyz+vec3(aQ*aR,0.0),1.0); } }`;
const GLOW_FS = `precision highp float; uniform float uFlat; varying vec2 vQ; varying vec4 vCol;
void main(){ float d=dot(vQ,vQ); if(d>1.0) discard; float g=exp(-d*4.0)*(1.0-d);
  if(uFlat>0.5) gl_FragColor=vec4(0.0,0.0,0.0,vCol.a*g);
  else { vec3 c=vCol.rgb*vCol.a*(g+exp(-d*60.0)*0.9); gl_FragColor=vec4(c,min(1.0,max(c.r,max(c.g,c.b)))); } }`;
const FLOOR_VS = `attribute vec2 aP; uniform mat4 uVP; uniform float uY, uS; varying vec3 vW;
void main(){ vW=vec3(aP.x*uS,uY,aP.y*uS); gl_Position=uVP*vec4(vW,1.0); }`;
const FLOOR_FS = `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec3 uCam, uL0, uL1, uC0, uC1; uniform float uS, uCell, uGrid, uSpec;
varying vec3 vW;
vec3 pool(vec3 Lp, vec3 Lc, vec3 V){
  vec3 l=Lp-vW; float d2=dot(l,l)+0.04; float h=max(l.y,0.0);
  vec3 L=l*inversesqrt(d2); vec3 R=reflect(-V,vec3(0.0,1.0,0.0));
  float sp=pow(max(dot(R,L),0.0),uSpec);
  return Lc*(h/(d2*sqrt(d2))*0.8+sp*0.3/(1.0+d2*0.15));
}
void main(){
  float r=length(vW.xz)/uS; float edge=1.0-smoothstep(0.3,1.0,r);
  vec3 V=normalize(uCam-vW);
  vec3 col=vec3(0.016,0.02,0.03)+pool(uL0,uC0,V)+pool(uL1,uC1,V);
  float gl=0.0;
#ifdef GL_OES_standard_derivatives
  vec2 q=vW.xz/uCell; vec2 fw=fwidth(q); vec2 g=abs(fract(q-0.5)-0.5)/(fw*1.1);
  gl=(1.0-min(min(g.x,g.y),1.0))*clamp(1.3-max(fw.x,fw.y)*2.5,0.0,1.0);
#endif
  col+=vec3(0.47,0.9,0.6)*gl*uGrid;
  col=1.0-exp(-col*1.2);
  gl_FragColor=vec4(col*edge,edge);
}`;

/* ---------- per-canvas kit ---------- */
interface Light {
  p: Vec3;
  c: Vec3;
  k: number;
}
interface Program {
  p: WebGLProgram;
  u: Uniforms;
  attrs: readonly Attr[];
  offs: number[];
  stride: number;
}
interface FloorOpts {
  y: number;
  size: number;
  cell: number;
  grid: number;
  spec: number;
  l0: number;
  l1: number;
}
interface KitOpts {
  fov: number;
  floor?: FloorOpts;
  maxBalls: number;
  maxSegs: number;
  maxGlows: number;
}
interface Kit {
  gl: WebGLRenderingContext;
  /** Compile + link a program; attribute i is bound to `attrs[i]`. */
  prog(vs: string, fs: string, attrs: readonly Attr[]): Program;
  /** Create a buffer holding `data` (or `data` bytes, uninitialised). */
  buf(data: BufferSource | number, target?: number, usage?: number): WebGLBuffer;
  cv: HTMLCanvasElement;
  W: number;
  H: number;
  q: number;
  fov: number;
  t: number;
  V: Float32Array;
  P: Float32Array;
  VP: Float32Array;
  eye: Vec3;
  L: [Light, Light];
  amb: Vec3;
  rim: Vec3;
  bind(pr: Program, buffer: WebGLBuffer): Uniforms;
  qidx: WebGLBuffer;
  pBall: Program;
  pSeg: Program;
  pGlow: Program;
  rec: Float32Array;
  bn: number;
  order: number[];
  bData: Float32Array;
  bBuf: WebGLBuffer;
  sData: Float32Array;
  sn: number;
  sBuf: WebGLBuffer;
  gData: Float32Array;
  gn: number;
  gBuf: WebGLBuffer;
  hData: Float32Array;
  hn: number;
  hBuf: WebGLBuffer;
  MB: number;
  MS: number;
  MG: number;
  pFloor: Program | null;
  fBuf: WebGLBuffer | null;
  floor: FloorOpts | null;
}

function makeKit(gl: WebGLRenderingContext, cv: HTMLCanvasElement, opts: KitOpts, dpr: number): Kit {
  gl.getExtension("OES_standard_derivatives");
  gl.getExtension("EXT_frag_depth");
  const compile = (type: number, src: string): WebGLShader => {
    const s = gl.createShader(type);
    if (!s) throw new Error("createShader failed");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
    return s;
  };
  const prog = (vs: string, fs: string, attrs: readonly Attr[]): Program => {
    const p = gl.createProgram();
    if (!p) throw new Error("createProgram failed");
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a[0]));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "program link failed");
    const u: Uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      if (info) u[info.name] = gl.getUniformLocation(p, info.name);
    }
    let stride = 0;
    const offs = attrs.map((a) => {
      const o = stride;
      stride += a[1] * 4;
      return o;
    });
    return { p, u, attrs, offs, stride };
  };
  const buf = (data: BufferSource | number, target: number = gl.ARRAY_BUFFER, usage: number = gl.STATIC_DRAW): WebGLBuffer => {
    const b = gl.createBuffer();
    if (!b) throw new Error("createBuffer failed");
    gl.bindBuffer(target, b);
    if (typeof data === "number") gl.bufferData(target, data, usage);
    else gl.bufferData(target, data, usage);
    return b;
  };
  let enabled = 0;
  const bind = (pr: Program, buffer: WebGLBuffer): Uniforms => {
    gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    pr.attrs.forEach((a, i) => gl.vertexAttribPointer(i, a[1], gl.FLOAT, false, pr.stride, pr.offs[i]));
    for (let i = enabled; i < pr.attrs.length; i++) gl.enableVertexAttribArray(i);
    for (let i = pr.attrs.length; i < enabled; i++) gl.disableVertexAttribArray(i);
    enabled = pr.attrs.length;
    return pr.u;
  };
  const MAXQ = 4096,
    qi = new Uint16Array(MAXQ * 6);
  for (let i = 0; i < MAXQ; i++) {
    const v = i * 4,
      o = i * 6;
    qi[o] = v;
    qi[o + 1] = v + 1;
    qi[o + 2] = v + 2;
    qi[o + 3] = v;
    qi[o + 4] = v + 2;
    qi[o + 5] = v + 3;
  }
  const MB = opts.maxBalls,
    MS = opts.maxSegs,
    MG = opts.maxGlows;
  const bData = new Float32Array(MB * 4 * 13),
    sData = new Float32Array(MS * 4 * 13),
    gData = new Float32Array(MG * 4 * 10),
    hData = new Float32Array(MB * 4 * 10);
  const floor = opts.floor ?? null;
  return {
    gl,
    prog,
    buf,
    cv,
    W: 1,
    H: 1,
    q: dpr,
    fov: opts.fov,
    t: 0,
    V: new Float32Array(16),
    P: new Float32Array(16),
    VP: new Float32Array(16),
    eye: [0, 0, 6],
    L: [
      { p: [-4, 6, 5], c: [0.9, 0.92, 1], k: 0.004 },
      { p: [0, -50, 0], c: [0, 0, 0], k: 0.1 },
    ],
    amb: [0.07, 0.08, 0.1],
    rim: [0.6, 0.75, 0.9],
    bind,
    qidx: buf(qi, gl.ELEMENT_ARRAY_BUFFER),
    pBall: prog(BALL_VS, BALL_FS, [["aC", 3], ["aQ", 2], ["aR", 1], ["aCol", 3], ["aE", 3], ["aG", 1]]),
    pSeg: prog(SEG_VS, SEG_FS, [["aA", 3], ["aB", 3], ["aS", 2], ["aCol", 4], ["aW", 1]]),
    pGlow: prog(GLOW_VS, GLOW_FS, [["aC", 3], ["aQ", 2], ["aR", 1], ["aCol", 4]]),
    rec: new Float32Array(MB * 12),
    bn: 0,
    order: [],
    bData,
    bBuf: buf(bData.byteLength, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
    sData,
    sn: 0,
    sBuf: buf(sData.byteLength, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
    gData,
    gn: 0,
    gBuf: buf(gData.byteLength, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
    hData,
    hn: 0,
    hBuf: buf(hData.byteLength, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW),
    MB,
    MS,
    MG,
    pFloor: floor ? prog(FLOOR_VS, FLOOR_FS, [["aP", 2]]) : null,
    fBuf: floor ? buf(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1])) : null,
    floor,
  };
}

const QC = [-1, -1, 1, -1, 1, 1, -1, 1];
const fit = (S: Kit, d: number, ref: number): number => d * Math.max(1, Math.pow(ref / (S.W / S.H), 0.85));
function look(S: Kit, eye: Vec3, tgt: Vec3): void {
  S.eye = eye;
  perspective(S.P, (S.fov * Math.PI) / 180, S.W / S.H, 0.1, 100);
  lookAt(S.V, eye, tgt);
  mul(S.VP, S.P, S.V);
}
function ball(S: Kit, x: number, y: number, z: number, r: number, c: Vec3, e: Vec3, glass: number): void {
  if (S.bn >= S.MB) return;
  const o = S.bn++ * 12,
    R = S.rec;
  R[o] = x;
  R[o + 1] = y;
  R[o + 2] = z;
  R[o + 3] = r;
  R[o + 4] = c[0];
  R[o + 5] = c[1];
  R[o + 6] = c[2];
  R[o + 7] = e[0];
  R[o + 8] = e[1];
  R[o + 9] = e[2];
  R[o + 10] = glass;
}
function seg(S: Kit, a: Vec3, b: Vec3, c: Vec3, al: number, w: number): void {
  if (S.sn >= S.MS || al < 0.004) return;
  const D = S.sData;
  let o = S.sn++ * 52;
  for (let k = 0; k < 4; k++) {
    D[o] = a[0];
    D[o + 1] = a[1];
    D[o + 2] = a[2];
    D[o + 3] = b[0];
    D[o + 4] = b[1];
    D[o + 5] = b[2];
    D[o + 6] = k === 1 || k === 2 ? 1 : 0;
    D[o + 7] = k === 0 || k === 1 ? -1 : 1;
    D[o + 8] = c[0];
    D[o + 9] = c[1];
    D[o + 10] = c[2];
    D[o + 11] = al;
    D[o + 12] = w;
    o += 13;
  }
}
function quad10(D: Float32Array, n: number, x: number, y: number, z: number, s: number, c: Vec3, a: number): void {
  let o = n * 40;
  for (let k = 0; k < 4; k++) {
    D[o] = x;
    D[o + 1] = y;
    D[o + 2] = z;
    D[o + 3] = QC[k * 2];
    D[o + 4] = QC[k * 2 + 1];
    D[o + 5] = s;
    D[o + 6] = c[0];
    D[o + 7] = c[1];
    D[o + 8] = c[2];
    D[o + 9] = a;
    o += 10;
  }
}
function glow(S: Kit, x: number, y: number, z: number, s: number, c: Vec3, a: number): void {
  if (S.gn >= S.MG || a < 0.004) return;
  quad10(S.gData, S.gn++, x, y, z, s, c, a);
}
function shadow(S: Kit, x: number, z: number, s: number, a: number): void {
  if (!S.floor || S.hn >= S.MB || a < 0.004) return;
  quad10(S.hData, S.hn++, x, S.floor.y + 0.002, z, s, G, a);
}

function begin(S: Kit): void {
  const gl = S.gl;
  gl.viewport(0, 0, S.W, S.H);
  gl.clearColor(0, 0, 0, 0);
  gl.depthMask(true);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}
function drawFloor(S: Kit): void {
  const gl = S.gl,
    f = S.floor;
  if (!f || !S.pFloor || !S.fBuf) return;
  gl.disable(gl.DEPTH_TEST);
  const u = S.bind(S.pFloor, S.fBuf);
  gl.uniformMatrix4fv(u.uVP, false, S.VP);
  gl.uniform1f(u.uY, f.y);
  gl.uniform1f(u.uS, f.size);
  gl.uniform3fv(u.uCam, S.eye);
  gl.uniform1f(u.uCell, f.cell);
  gl.uniform1f(u.uGrid, f.grid);
  gl.uniform1f(u.uSpec, f.spec);
  gl.uniform3fv(u.uL0, S.L[0].p);
  gl.uniform3fv(u.uC0, scale3(S.L[0].c, f.l0));
  gl.uniform3fv(u.uL1, S.L[1].p);
  gl.uniform3fv(u.uC1, scale3(S.L[1].c, f.l1));
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.qidx);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  if (S.hn) {
    const v = S.bind(S.pGlow, S.hBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.hData.subarray(0, S.hn * 40));
    gl.uniformMatrix4fv(v.uV, false, S.V);
    gl.uniformMatrix4fv(v.uP, false, S.P);
    gl.uniform1f(v.uFlat, 1);
    gl.drawElements(gl.TRIANGLES, S.hn * 6, gl.UNSIGNED_SHORT, 0);
    S.hn = 0;
  }
}
function drawBalls(S: Kit): void {
  const gl = S.gl,
    n = S.bn;
  if (!n) return;
  const R = S.rec,
    V = S.V,
    ord = S.order;
  ord.length = n;
  for (let i = 0; i < n; i++) {
    ord[i] = i;
    R[i * 12 + 11] = V[2] * R[i * 12] + V[6] * R[i * 12 + 1] + V[10] * R[i * 12 + 2];
  }
  ord.sort((a, b) => R[a * 12 + 11] - R[b * 12 + 11]);
  const D = S.bData;
  let o = 0;
  for (let j = 0; j < n; j++) {
    const i = ord[j] * 12;
    for (let k = 0; k < 4; k++) {
      D[o] = R[i];
      D[o + 1] = R[i + 1];
      D[o + 2] = R[i + 2];
      D[o + 3] = QC[k * 2];
      D[o + 4] = QC[k * 2 + 1];
      D[o + 5] = R[i + 3];
      D[o + 6] = R[i + 4];
      D[o + 7] = R[i + 5];
      D[o + 8] = R[i + 6];
      D[o + 9] = R[i + 7];
      D[o + 10] = R[i + 8];
      D[o + 11] = R[i + 9];
      D[o + 12] = R[i + 10];
      o += 13;
    }
  }
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  const u = S.bind(S.pBall, S.bBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, D.subarray(0, o));
  gl.uniformMatrix4fv(u.uV, false, V);
  gl.uniformMatrix4fv(u.uP, false, S.P);
  gl.uniform3fv(u.uL0, xfv(V, S.L[0].p));
  gl.uniform3fv(u.uL1, xfv(V, S.L[1].p));
  gl.uniform3fv(u.uC0, S.L[0].c);
  gl.uniform3fv(u.uC1, S.L[1].c);
  gl.uniform2f(u.uK, S.L[0].k, S.L[1].k);
  gl.uniform3fv(u.uAmb, S.amb);
  gl.uniform3fv(u.uRim, S.rim);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.qidx);
  gl.drawElements(gl.TRIANGLES, n * 6, gl.UNSIGNED_SHORT, 0);
  S.bn = 0;
}
function drawSegs(S: Kit, depth = true): void {
  const gl = S.gl;
  if (!S.sn) return;
  if (depth) gl.enable(gl.DEPTH_TEST);
  else gl.disable(gl.DEPTH_TEST);
  gl.depthMask(false);
  const u = S.bind(S.pSeg, S.sBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.sData.subarray(0, S.sn * 52));
  gl.uniformMatrix4fv(u.uVP, false, S.VP);
  gl.uniform2f(u.uRes, S.W, S.H);
  gl.uniform1f(u.uDpr, S.q);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.qidx);
  gl.drawElements(gl.TRIANGLES, S.sn * 6, gl.UNSIGNED_SHORT, 0);
  S.sn = 0;
}
function drawGlows(S: Kit): void {
  const gl = S.gl;
  if (!S.gn) return;
  gl.disable(gl.DEPTH_TEST);
  gl.depthMask(false);
  const u = S.bind(S.pGlow, S.gBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.gData.subarray(0, S.gn * 40));
  gl.uniformMatrix4fv(u.uV, false, S.V);
  gl.uniformMatrix4fv(u.uP, false, S.P);
  gl.uniform1f(u.uFlat, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, S.qidx);
  gl.drawElements(gl.TRIANGLES, S.gn * 6, gl.UNSIGNED_SHORT, 0);
  S.gn = 0;
}

/** Mono caption pinned to the bottom-left of the canvas's parent (the neural phase label). */
interface OverlayLabel {
  set(txt: string, col: string): void;
  remove(): void;
}
function overlayLabel(cv: HTMLCanvasElement): OverlayLabel {
  const host = cv.parentElement;
  if (!host) return { set: () => {}, remove: () => {} };
  let restorePosition: string | null = null;
  if (getComputedStyle(host).position === "static") {
    restorePosition = host.style.position;
    host.style.position = "relative";
  }
  const d = document.createElement("div");
  d.setAttribute("aria-hidden", "true");
  d.style.cssText =
    'position:absolute;left:14px;bottom:11px;font:500 9.5px var(--font-geist-mono),"Geist Mono",ui-monospace,monospace;letter-spacing:.06em;pointer-events:none;transition:color .3s';
  host.appendChild(d);
  let last = "";
  return {
    set(txt, col) {
      if (txt !== last) {
        d.textContent = txt;
        last = txt;
      }
      d.style.color = col;
    },
    remove() {
      d.remove();
      if (restorePosition !== null) host.style.position = restorePosition;
    },
  };
}

/* ---------- scene definitions ---------- */
interface SceneDef<St> {
  opts: KitOpts;
  init(S: Kit): St;
  frame(S: Kit, st: St, dt: number): void;
  dispose?(st: St): void;
}

/* 01 · attention field */
interface AttKey {
  x: number;
  z: number;
  w: number;
  wd: number;
  s: number;
}
const ATT: SceneDef<{ keys: AttKey[] }> = {
  opts: {
    fov: 32,
    floor: { y: 0, size: 6.5, cell: 0.95, grid: 0.05, spec: 60, l0: 0.25, l1: 1 },
    maxBalls: 48,
    maxSegs: 64,
    maxGlows: 80,
  },
  init(S) {
    const keys: AttKey[] = [];
    const cols = 8,
      rows = 4;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        keys.push({ x: (c - (cols - 1) / 2) * 0.95, z: (r - (rows - 1) / 2) * 0.85, w: 0, wd: 0, s: 0 });
    S.amb = [0.06, 0.07, 0.09];
    S.rim = [0.45, 0.85, 0.6];
    S.L[0] = { p: [-3, 6, 5], c: [0.55, 0.6, 0.7], k: 0.002 };
    return { keys };
  },
  frame(S, st, dt) {
    const t = S.t,
      qx = 3.2 * Math.sin(t * 0.32),
      qz = 1.15 * Math.cos(t * 0.24),
      qy = 0.62 + 0.1 * Math.sin(t * 0.9);
    const yaw = 0.16 * Math.sin(t * 0.07),
      el = 0.44,
      dist = fit(S, 7.6, 1.85),
      tg: Vec3 = [0, 0.2, 0.05];
    look(
      S,
      [
        tg[0] + Math.sin(yaw) * Math.cos(el) * dist,
        tg[1] + Math.sin(el) * dist,
        tg[2] + Math.cos(yaw) * Math.cos(el) * dist,
      ],
      tg,
    );
    S.L[1] = { p: [qx, qy, qz], c: scale3(PG, 1.6), k: 0.6 };
    let sum = 0,
      mx = 0;
    for (const k of st.keys) {
      const d2 = (k.x - qx) ** 2 + (k.z - qz) ** 2 + qy * qy;
      k.s = Math.exp(-d2 / 1.5);
      sum += k.s;
    }
    for (const k of st.keys) {
      k.w = k.s / sum;
      if (k.w > mx) mx = k.w;
    }
    const kr = 0.13,
      sm = 1 - Math.exp(-dt * 10);
    for (let i = 0; i < st.keys.length; i++) {
      const k = st.keys[i],
        wn = k.w / mx;
      k.wd += (wn - k.wd) * sm;
      const w = k.wd;
      const e = Math.pow(w, 1.6);
      ball(S, k.x, kr, k.z, kr, BALL_BODY, scale3(G, 0.03 + 0.9 * e), 1);
      const dx = k.x - qx,
        dz = k.z - qz,
        dl = Math.hypot(dx, dz) || 1;
      shadow(S, k.x + (dx / dl) * 0.07, k.z + (dz / dl) * 0.07, 0.34, 0.55);
      if (w > 0.05) {
        seg(S, [qx, qy, qz], [k.x, kr, k.z], G, Math.pow(w, 1.5) * 1.1, 0.5 + w * 1.8);
        const ph = (t * 0.7 + i * 0.137) % 1,
          px = k.x + (qx - k.x) * ph,
          py = kr + (qy - kr) * ph,
          pz = k.z + (qz - k.z) * ph;
        glow(S, px, py, pz, 0.12 + w * 0.08, G, w * w * Math.sin(ph * Math.PI) * 0.9);
        if (w > 0.5) glow(S, k.x, kr, k.z, 0.5, GG, (w - 0.5) * 0.5);
      }
    }
    ball(S, qx, qy, qz, 0.16, [0.4, 0.1, 0.25], [PG[0] * 1.1, PG[1] * 0.9, PG[2] * 1.0], 0);
    glow(S, qx, qy, qz, 0.95, PG, 0.55);
    glow(S, qx, qy, qz, 0.42, [1, 0.7, 0.85], 0.4);
    shadow(S, qx, qz, 0.5, 0.18);
    begin(S);
    drawFloor(S);
    drawBalls(S);
    drawSegs(S);
    drawGlows(S);
  },
};

/* 04 · neural net: forward pass, then backprop */
interface NetState {
  SHAPE: number[];
  W8: number[][][];
  pos: Vec3[][];
  cache: number;
  A: number[][];
  win: number;
  label: OverlayLabel;
}
function netActs(st: NetState, idx: number): void {
  if (idx === st.cache) return;
  st.cache = idx;
  const rnd = mulberry(idx * 7919 + 13),
    SH = st.SHAPE,
    A: number[][] = [[]];
  for (let i = 0; i < SH[0]; i++) A[0][i] = 0.25 + rnd() * 0.75;
  for (let L = 0; L < SH.length - 1; L++) {
    A[L + 1] = [];
    for (let j = 0; j < SH[L + 1]; j++) {
      let s = 0;
      for (let k = 0; k < SH[L]; k++) s += st.W8[L][k][j] * A[L][k];
      A[L + 1][j] = 1 / (1 + Math.exp(-s * 1.3));
    }
  }
  let best = -1;
  st.win = 0;
  A[SH.length - 1].forEach((v, o) => {
    if (v > best) {
      best = v;
      st.win = o;
    }
  });
  st.A = A;
}
const NET: SceneDef<NetState> = {
  opts: { fov: 32, maxBalls: 40, maxSegs: 720, maxGlows: 360 },
  init(S) {
    const SHAPE = [5, 9, 9, 3],
      rnd = mulberry(4242),
      W8: number[][][] = [];
    for (let L = 0; L < SHAPE.length - 1; L++) {
      W8[L] = [];
      for (let i = 0; i < SHAPE[L]; i++) {
        W8[L][i] = [];
        for (let j = 0; j < SHAPE[L + 1]; j++) W8[L][i][j] = rnd() * 2 - 1;
      }
    }
    const lay = (n: number): [number, number][] => {
      const o: [number, number][] = [];
      if (n === 9) {
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) o.push([a * 0.95, b * 0.95]);
      } else {
        const r = n === 5 ? 1.0 : 0.72;
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2 + Math.PI / 2;
          o.push([Math.sin(t) * r, Math.cos(t) * r]);
        }
      }
      return o;
    };
    const pos = SHAPE.map((n, L) => lay(n).map((p): Vec3 => [(L - 1.5) * 2.25, p[0], p[1]]));
    S.amb = [0.06, 0.07, 0.09];
    S.rim = [0.45, 0.85, 0.6];
    S.L[0] = { p: [-5, 6, 7], c: [0.75, 0.8, 0.9], k: 0.002 };
    S.L[1] = { p: [6, -2, -5], c: scale3(PG, 0.5), k: 0.002 };
    return { SHAPE, W8, pos, cache: -1, A: [], win: 0, label: overlayLabel(S.cv) };
  },
  frame(S, st) {
    const FWD = 3.15,
      HOLD = 0.75,
      BACK = 2.4,
      REST = 0.55,
      CYC = FWD + HOLD + BACK + REST,
      SH = st.SHAPE,
      nL = SH.length;
    const t = S.t + 2.1,
      idx = Math.floor(t / CYC),
      ph = t - idx * CYC;
    netActs(st, idx);
    const A = st.A;
    const yaw = -0.35 + 0.42 * Math.sin(S.t * 0.11),
      el = 0.16 + 0.05 * Math.sin(S.t * 0.07),
      dist = fit(S, 9.6, 1.7);
    look(S, [Math.sin(yaw) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(yaw) * Math.cos(el) * dist], [0, 0, 0]);
    let tr = -1,
      p = 0;
    const sg = FWD / (nL - 1);
    if (ph < FWD) {
      tr = Math.min(nL - 2, Math.floor(ph / sg));
      p = (ph - tr * sg) / sg;
    }
    const kb = ph >= FWD + HOLD ? ((ph - FWD - HOLD) / BACK) * (nL - 1) : -1,
      backP = ph >= FWD + HOLD && ph < FWD + HOLD + BACK ? (ph - FWD - HOLD) / BACK : -1;
    for (let L = 0; L < nL - 1; L++) {
      const done = tr > L || ph >= FWD,
        live = tr === L,
        lb = kb >= 0 ? kb - (nL - 2 - L) : -1;
      for (let i = 0; i < SH[L]; i++)
        for (let j = 0; j < SH[L + 1]; j++) {
          const a = st.pos[L][i],
            b = st.pos[L + 1][j],
            w = st.W8[L][i][j],
            stg = Math.abs(w) * A[L][i],
            col = w < 0 ? GREY : G,
            wd = 0.5 + stg * 1.5,
            jit = ((i * 7 + j * 13) % 11) / 11;
          if (done) seg(S, a, b, col, 0.07 + stg * 0.7, wd);
          else if (live) {
            const q = ease(clamp01(p * 1.35 - jit * 0.35)),
              m = lerp3(a, b, q);
            if (q > 0) seg(S, a, m, col, 0.07 + stg * 0.75, wd);
            if (q < 1) seg(S, m, b, GREY, 0.07, 0.45);
            if (q > 0.01 && q < 0.99 && stg > 0.1) glow(S, m[0], m[1], m[2], 0.1 + stg * 0.16, w < 0 ? GREY : GG, 0.35 + stg * 0.65);
          } else seg(S, a, b, GREY, 0.07, 0.45);
          if (lb >= 0 && lb < 1) {
            const q = ease(clamp01(lb * 1.35 - jit * 0.35)),
              m = lerp3(b, a, q),
              g = stg * (0.5 + A[L + 1][j] * (1 - A[L + 1][j]) * 2);
            if (q > 0) seg(S, b, m, P, 0.18 + g * 0.85, 0.6 + g * 2.0);
            if (q > 0.01 && q < 0.99 && g > 0.08) glow(S, m[0], m[1], m[2], 0.1 + g * 0.16, PG, 0.3 + g * 0.7);
          } else if (lb >= 1) {
            const f = 1 - clamp01((lb - 1) / 0.9);
            if (f > 0) seg(S, a, b, P, f * (0.08 + stg * 0.5), wd + f * 0.6);
          }
        }
    }
    for (let L = 0; L < nL; L++) {
      const lit = L === 0 ? 1 : ph >= FWD ? 1 : ease((ph - (L - 1) * sg) / sg);
      for (let i = 0; i < SH[L]; i++) {
        const a = st.pos[L][i],
          act = A[L][i] * lit,
          e = Math.pow(act, 1.4) * 0.95;
        const isWin = L === nL - 1 && i === st.win && ph >= FWD * 0.96,
          pulse = isWin ? (ph < FWD + HOLD ? ease((ph - FWD * 0.96) / 0.5) : 1) : 0;
        const em: Vec3 = [
          G[0] * e * (1 - pulse) + PG[0] * pulse * 0.9,
          G[1] * e * (1 - pulse) + PG[1] * pulse * 0.9,
          G[2] * e * (1 - pulse) + PG[2] * pulse * 0.9,
        ];
        ball(S, a[0], a[1], a[2], 0.15 + act * 0.09, BALL_BODY, em, 1);
        if (act > 0.5) glow(S, a[0], a[1], a[2], 0.55 + act * 0.25, G, (act - 0.5) * 0.45 * (1 - pulse));
        if (pulse > 0) glow(S, a[0], a[1], a[2], 1.1, PG, 0.55 * pulse);
        if (kb >= 0 && L < nL - 1) {
          const hit = Math.exp(-Math.pow(kb - (nL - 1 - L), 2) / 0.04);
          if (hit > 0.02) glow(S, a[0], a[1], a[2], 0.5 + act * 0.2, P, hit * 0.5);
        }
      }
    }
    if (ph < FWD) st.label.set("FORWARD PASS · CAMADA " + (tr + 1) + "/" + (nL - 1), LBL_GREEN);
    else if (ph < FWD + HOLD) st.label.set("SAÍDA " + (st.win + 1) + " · " + A[nL - 1][st.win].toFixed(2), LBL_PINK_GLOW);
    else if (backP >= 0)
      st.label.set("BACKPROP · ∂L/∂W · CAMADA " + (nL - 1 - Math.min(nL - 2, Math.floor(kb))) + "/" + (nL - 1), LBL_PINK);
    else st.label.set("PRÓXIMA AMOSTRA", LBL_MUTED);
    begin(S);
    drawBalls(S);
    drawSegs(S);
    drawGlows(S);
  },
  dispose(st) {
    st.label.remove();
  },
};

/* 07 · distillation (the flask is the logo) */
const LATHE_VS = `attribute vec3 aP; attribute vec3 aN; uniform mat4 uVP; varying vec3 vW, vN; void main(){ vW=aP; vN=aN; gl_Position=uVP*vec4(aP,1.0); }`;
const GLASS_FS = `precision highp float; uniform vec3 uCam, uG; uniform float uSide; varying vec3 vW, vN;
void main(){
  vec3 n=normalize(vN); vec3 V=normalize(uCam-vW); float f=dot(n,V);
  if(f*uSide<0.0) discard;
  if(f<0.0) n=-n;
  float nv=abs(f), fr=0.04+0.96*pow(1.0-nv,5.0);
  vec3 R=reflect(-V,n);
  vec3 env=vec3(0.015,0.02,0.03);
  env+=vec3(0.92,0.96,1.0)*smoothstep(0.5,0.95,R.y)*0.9;
  float az=atan(R.z,R.x);
  float strip=(1.0-smoothstep(0.0,0.09,abs(az-0.85)))*smoothstep(-0.35,0.15,R.y)*(1.0-smoothstep(0.35,0.75,R.y));
  env+=vec3(0.85,0.92,1.0)*strip*1.3;
  float strip2=(1.0-smoothstep(0.0,0.05,abs(az+2.3)))*(1.0-smoothstep(0.1,0.6,abs(R.y)));
  env+=vec3(1.0,0.45,0.7)*strip2*0.5;
  env+=uG*0.3*smoothstep(0.2,0.85,-R.y);
  vec3 col=env*fr*1.25+uG*pow(1.0-nv,3.0)*0.06;
  float a=clamp(fr*0.9+0.03,0.0,1.0)*0.7;
  gl_FragColor=vec4(col,a);
}`;
const LIQ_FS = `precision highp float; uniform vec3 uCam, uG; varying vec3 vW, vN;
void main(){
  vec3 n=normalize(vN); vec3 V=normalize(uCam-vW); float f=dot(n,V); if(f<0.0) discard;
  float h=clamp((vW.y+1.3)/1.0,0.0,1.0);
  vec3 col=uG*(0.10+0.5*pow(f,1.6))*(1.2-0.5*h)+uG*pow(1.0-f,4.0)*0.35;
  col=1.0-exp(-col*1.3);
  float a=0.5+0.3*f;
  gl_FragColor=vec4(col*a,a);
}`;
const SURF_VS = `attribute vec2 aP; uniform mat4 uVP; uniform float uY, uRad, uT; uniform vec4 uR0, uR1, uR2;
varying vec3 vW, vN; varying float vR;
float rip(vec2 p, vec4 r){ float age=uT-r.z; if(age<0.0||age>2.6) return 0.0; float d=length(p-r.xy); return r.w*exp(-age*1.6)*exp(-pow((d-age*0.32)/0.11,2.0))*sin(d*22.0-age*7.0); }
float hgt(vec2 p){ return rip(p,uR0)+rip(p,uR1)+rip(p,uR2)+0.0045*sin(p.x*7.0+uT*1.3)*sin(p.y*6.0-uT*1.1); }
void main(){ vec2 p=aP*uRad; float h=hgt(p), e=0.01; vec2 g=vec2(hgt(p+vec2(e,0.0))-h,hgt(p+vec2(0.0,e))-h)/e;
  vN=normalize(vec3(-g.x,1.0,-g.y)); vR=length(aP); vW=vec3(p.x,uY+h*(1.0-vR*vR),p.y); gl_Position=uVP*vec4(vW,1.0); }`;
const SURF_FS = `precision highp float; uniform vec3 uCam, uG; varying vec3 vW, vN; varying float vR;
void main(){ vec3 n=normalize(vN); vec3 V=normalize(uCam-vW); float nv=max(dot(n,V),0.0); vec3 R=reflect(-V,n);
  float fr=0.03+0.97*pow(1.0-nv,5.0);
  vec3 env=vec3(0.92,0.96,1.0)*smoothstep(0.55,0.97,R.y)+vec3(1.0,0.45,0.7)*0.2*smoothstep(0.3,0.9,R.x);
  vec3 col=uG*0.36+env*fr*0.95+uG*smoothstep(0.82,1.0,vR)*0.4;
  col=1.0-exp(-col*1.3);
  gl_FragColor=vec4(col*0.85,0.85); }`;
const LATHE_ATTRS: readonly Attr[] = [["aP", 3], ["aN", 3]];
const BUBBLE_BODY: Vec3 = [0.05, 0.14, 0.09]; // deep green glass
const DROP_BODY: Vec3 = [0.5, 0.12, 0.28]; // deep pink glass

interface MeshData {
  v: Float32Array<ArrayBuffer>;
  i: Uint16Array<ArrayBuffer>;
}

/** Surface of revolution of a 2D profile ([radius, y] pairs) around the Y axis: interleaved pos+normal. */
function lathe(profile: readonly [number, number][], segs: number): MeshData {
  const P = profile,
    n = P.length,
    pos: number[] = [],
    nor: number[] = [],
    idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0],
      ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const nr = ty,
      ny = -tx;
    for (let j = 0; j <= segs; j++) {
      const th = (j / segs) * Math.PI * 2,
        c = Math.cos(th),
        s = Math.sin(th);
      pos.push(P[i][0] * c, P[i][1], P[i][0] * s);
      nor.push(nr * c, ny, nr * s);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j,
        b = a + segs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const nv = pos.length / 3,
    v = new Float32Array(nv * 6);
  for (let i = 0; i < nv; i++) {
    v.set(pos.slice(i * 3, i * 3 + 3), i * 6);
    v.set(nor.slice(i * 3, i * 3 + 3), i * 6 + 3);
  }
  return { v, i: new Uint16Array(idx) };
}

interface Mesh {
  b: WebGLBuffer;
  x: WebGLBuffer;
  n: number;
}
interface Bubble {
  x: number;
  y: number;
  z: number;
  r: number;
  v: number;
  ph: number;
}
interface Drop {
  x: number;
  y: number;
  z: number;
  v: number;
  /** grow-in progress at the spout, 0 → 1, before it falls */
  g: number;
  wait: number;
}
type Ripple = [x: number, z: number, t0: number, amp: number];
interface FlaskState {
  /** liquid surface height and its radius (the flask wall at that height) */
  yf: number;
  rf: number;
  pLathe: Program;
  pLiq: Program;
  pSurf: Program;
  glass: Mesh;
  liquid: Mesh;
  surf: Mesh;
  rnd: () => number;
  bub: Bubble[];
  drops: Drop[];
  rips: [Ripple, Ripple, Ripple];
  ri: number;
}
function flaskBubble(st: FlaskState, b: Bubble, anywhere: boolean): void {
  const rnd = st.rnd,
    y = anywhere ? -1.2 + rnd() * 0.85 : -1.2;
  const rm = (y < -1.12 ? 0.92 : 1.015 - 0.4228 * (y + 1.09)) - 0.1,
    a = rnd() * 6.283,
    rr = Math.sqrt(rnd()) * rm;
  b.x = Math.cos(a) * rr;
  b.z = Math.sin(a) * rr;
  b.y = y;
  b.r = 0.018 + rnd() * 0.035;
  b.v = 0.18 + rnd() * 0.32;
  b.ph = rnd() * 6.28;
}
function flaskDrop(st: FlaskState, d: Drop, k: number): void {
  const rnd = st.rnd,
    a = rnd() * 6.283;
  d.x = Math.cos(a) * 0.22;
  d.z = Math.sin(a) * 0.22;
  d.y = 1.34;
  d.v = 0;
  d.g = 0;
  d.wait = k * 0.9 + rnd() * 1.5;
}
function flaskRipple(S: Kit, st: FlaskState, x: number, z: number, amp: number): void {
  st.rips[st.ri] = [x, z, S.t, amp];
  st.ri = (st.ri + 1) % 3;
}
function drawMesh(S: Kit, pr: Program, mesh: Mesh): Uniforms {
  const gl = S.gl,
    u = S.bind(pr, mesh.b);
  gl.uniformMatrix4fv(u.uVP, false, S.VP);
  gl.uniform3fv(u.uCam, S.eye);
  gl.uniform3fv(u.uG, G);
  return u;
}
const FLASK: SceneDef<FlaskState> = {
  opts: {
    fov: 30,
    floor: { y: -1.302, size: 5.5, cell: 0.6, grid: 0.02, spec: 70, l0: 0.35, l1: 1.2 },
    maxBalls: 48,
    maxSegs: 24,
    maxGlows: 24,
  },
  init(S) {
    const gl = S.gl,
      low = getEnv().low;
    const outer: [number, number][] = [
      [0, -1.3], [0.6, -1.3], [0.86, -1.295], [0.95, -1.28], [1.01, -1.25], [1.045, -1.2], [1.06, -1.14], [1.05, -1.09],
      [0.42, 0.4], [0.35, 0.52], [0.3, 0.62], [0.28, 0.72], [0.28, 1.38], [0.3, 1.42], [0.33, 1.455], [0.335, 1.5],
      [0.318, 1.53], [0.29, 1.535],
    ];
    const yf = -0.3,
      rf = 1.015 - 0.4228 * (yf + 1.09);
    const inner: [number, number][] = [
      [0, -1.265], [0.6, -1.265], [0.84, -1.26], [0.93, -1.245], [0.985, -1.215], [1.015, -1.17], [1.022, -1.12],
      [1.015, -1.09], [rf, yf],
    ];
    const go = lathe(outer, low ? 48 : 72),
      li = lathe(inner, low ? 40 : 56);
    const mesh = (m: MeshData): Mesh => ({
      b: S.buf(m.v),
      x: S.buf(m.i, gl.ELEMENT_ARRAY_BUFFER),
      n: m.i.length,
    });
    /* liquid surface: a unit disc of RG rings × SG sectors, displaced in the vertex shader */
    const RG = 22,
      SG = 48,
      dv = [0, 0],
      di: number[] = [];
    for (let r = 1; r <= RG; r++)
      for (let s = 0; s < SG; s++) {
        const a = (s / SG) * Math.PI * 2;
        dv.push(Math.cos(a) * (r / RG), Math.sin(a) * (r / RG));
      }
    for (let s = 0; s < SG; s++) di.push(0, 1 + s, 1 + ((s + 1) % SG));
    for (let r = 1; r < RG; r++)
      for (let s = 0; s < SG; s++) {
        const a = 1 + (r - 1) * SG + s,
          b = 1 + (r - 1) * SG + ((s + 1) % SG),
          c = a + SG,
          d = b + SG;
        di.push(a, c, b, b, c, d);
      }
    const off: Ripple = [0, 0, -9, 0];
    const st: FlaskState = {
      yf,
      rf,
      pLathe: S.prog(LATHE_VS, GLASS_FS, LATHE_ATTRS),
      pLiq: S.prog(LATHE_VS, LIQ_FS, LATHE_ATTRS),
      pSurf: S.prog(SURF_VS, SURF_FS, [["aP", 2]]),
      glass: mesh(go),
      liquid: mesh(li),
      surf: mesh({ v: new Float32Array(dv), i: new Uint16Array(di) }),
      rnd: mulberry(33),
      bub: [],
      drops: [],
      rips: [[...off], [...off], [...off]],
      ri: 0,
    };
    for (let i = 0; i < (low ? 16 : 26); i++) {
      const b: Bubble = { x: 0, y: 0, z: 0, r: 0, v: 0, ph: 0 };
      flaskBubble(st, b, true);
      st.bub.push(b);
    }
    for (let i = 0; i < 4; i++) {
      const d: Drop = { x: 0, y: 0, z: 0, v: 0, g: 0, wait: 0 };
      flaskDrop(st, d, i);
      st.drops.push(d);
    }
    S.amb = [0.06, 0.08, 0.08];
    S.rim = [0.6, 0.95, 0.75];
    S.L[0] = { p: [-4, 5, 5], c: [0.85, 0.9, 1], k: 0.002 };
    S.L[1] = { p: [0, -0.75, 0], c: scale3(G, 0.9), k: 0.8 };
    return st;
  },
  frame(S, st, dt) {
    const gl = S.gl,
      reduce = getEnv().reduce,
      t = S.t,
      yaw = 0.35 + t * 0.12,
      el = 0.2,
      dist = Math.max(7.0, fit(S, 5.2, 1.8)),
      tg: Vec3 = [0, 0.08, 0];
    look(S, [Math.sin(yaw) * Math.cos(el) * dist, tg[1] + Math.sin(el) * dist, Math.cos(yaw) * Math.cos(el) * dist], tg);
    shadow(S, 0, 0, 1.75, 0.7);
    const sy = st.yf;
    for (const b of st.bub) {
      if (!reduce) {
        b.v += dt * 0.12;
        b.y += b.v * dt;
        b.ph += dt * 5;
      }
      const wx = b.x + Math.sin(b.ph) * 0.012,
        wz = b.z + Math.cos(b.ph * 0.8) * 0.012;
      if (b.y > sy - b.r) {
        if (b.r > 0.04) flaskRipple(S, st, wx, wz, 0.012);
        flaskBubble(st, b, false);
        continue;
      }
      ball(S, wx, b.y, wz, b.r, BUBBLE_BODY, scale3(G, 0.18), 1);
    }
    begin(S);
    drawFloor(S);
    /* back faces of the glass, then bubbles, liquid body and its rippling surface */
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    let u = drawMesh(S, st.pLathe, st.glass);
    gl.uniform1f(u.uSide, -1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, st.glass.x);
    gl.drawElements(gl.TRIANGLES, st.glass.n, gl.UNSIGNED_SHORT, 0);
    drawBalls(S);
    gl.depthMask(false);
    drawMesh(S, st.pLiq, st.liquid);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, st.liquid.x);
    gl.drawElements(gl.TRIANGLES, st.liquid.n, gl.UNSIGNED_SHORT, 0);
    u = drawMesh(S, st.pSurf, st.surf);
    gl.uniform1f(u.uY, sy);
    gl.uniform1f(u.uRad, st.rf);
    gl.uniform1f(u.uT, t);
    gl.uniform4fv(u.uR0, st.rips[0]);
    gl.uniform4fv(u.uR1, st.rips[1]);
    gl.uniform4fv(u.uR2, st.rips[2]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, st.surf.x);
    gl.drawElements(gl.TRIANGLES, st.surf.n, gl.UNSIGNED_SHORT, 0);
    /* pink drops form at the spout, fall and ripple the surface */
    for (const d of st.drops) {
      if (!reduce) {
        if (d.wait > 0) {
          d.wait -= dt;
          continue;
        }
        if (d.g < 1) d.g = Math.min(1, d.g + dt * 0.7);
        else {
          d.v += 3.4 * dt;
          d.y -= d.v * dt;
        }
      } else if (d.wait > 0) continue;
      if (d.y <= sy + 0.02) {
        flaskRipple(S, st, d.x, d.z, 0.03);
        flaskDrop(st, d, 0);
        continue;
      }
      const r = 0.012 + 0.026 * d.g;
      ball(S, d.x, d.y, d.z, r, DROP_BODY, scale3(PG, 0.7), 1);
      if (d.v > 0.4) seg(S, [d.x, d.y + r, d.z], [d.x, d.y + r + Math.min(0.3, d.v * 0.06), d.z], PG, 0.35, 0.8);
    }
    drawBalls(S);
    drawSegs(S);
    /* front faces of the glass over everything */
    gl.depthMask(false);
    u = drawMesh(S, st.pLathe, st.glass);
    gl.uniform1f(u.uSide, 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, st.glass.x);
    gl.drawElements(gl.TRIANGLES, st.glass.n, gl.UNSIGNED_SHORT, 0);
    glow(S, 0, 1.56, 0, 0.35, PG, 0.35 + 0.2 * Math.sin(t * 0.9));
    glow(S, 0, -0.75, 0, 1.6, GG, 0.08);
    drawGlows(S);
  },
};

/* ---------- scheduler: one loop for every mounted scene ---------- */
interface Mount {
  /** Has a kit and should be advanced by the loop when visible and not paused. */
  ready: boolean;
  visible: boolean;
  paused: boolean;
  quality(): number;
  degrade(): void;
  tick(dt: number): void;
  resize(): void;
}
const mounts = new Set<Mount>();
const live = new Set<Mount>();
let raf = 0,
  lastT = 0,
  ema = 16.7,
  nF = 0;

function loop(now: number): void {
  raf = 0;
  if (!live.size) return;
  raf = requestAnimationFrame(loop);
  const ms = now - lastT;
  if (ms < 10.5) return; // ~60 fps cap: 120/144 Hz screens don't double the cost or the speed
  lastT = now;
  if (++nF > 90) {
    ema += (ms - ema) * 0.05;
    if (nF % 45 === 0 && ema > 24) {
      ema = 16.7;
      for (const m of live) if (m.quality() > 0.75) m.degrade();
    }
  }
  const dt = Math.min(0.033, ms / 1000);
  for (const m of live) m.tick(dt);
}
function wake(): void {
  if (!raf && live.size && !getEnv().reduce && document.visibilityState !== "hidden") {
    lastT = performance.now() - 16.7;
    raf = requestAnimationFrame(loop);
  }
}
function stopIfIdle(): void {
  if (!live.size && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
}
function onVisibility(): void {
  wake();
}
function sync(m: Mount): void {
  if (m.ready && m.visible && !m.paused) {
    live.add(m);
    wake();
  } else {
    live.delete(m);
    stopIfIdle();
  }
}
function register(m: Mount): void {
  if (!mounts.size) document.addEventListener("visibilitychange", onVisibility);
  mounts.add(m);
}
function unregister(m: Mount): void {
  mounts.delete(m);
  live.delete(m);
  stopIfIdle();
  if (!mounts.size) document.removeEventListener("visibilitychange", onVisibility);
}

/* A destroyed mount loses its context; a later mount on the same <canvas> (Fast Refresh,
   StrictMode, kind change) gets that same lost context back from getContext, so keep the
   extension around to restore it instead of rendering nothing. */
const loseExts = new WeakMap<HTMLCanvasElement, WEBGL_lose_context>();
const preventDefault = (e: Event) => e.preventDefault();

let probe: boolean | null = null;
function hasWebGL(): boolean {
  if (probe !== null) return probe;
  try {
    const c = document.createElement("canvas"),
      g = c.getContext("webgl");
    probe = !!g;
    g?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    probe = false;
  }
  return probe;
}

function mountWith<St>(cv: HTMLCanvasElement, def: SceneDef<St>, onFail?: () => void): SceneApi {
  const env = getEnv();
  let gl: WebGLRenderingContext | null = null;
  let S: Kit | null = null;
  let st: St | null = null;
  let failed = false,
    errored = false,
    destroyed = false;
  let ro: ResizeObserver | null = null;
  let onRestored: (() => void) | null = null;

  const fail = (e: unknown) => {
    failed = true;
    console.warn("cena 3D", e);
    cv.dataset.err = String((e instanceof Error && e.message) || e).slice(0, 300);
    // A canvas that already handed out a WebGL context can't become 2D: the caller
    // swaps in a fresh <canvas> for the 2D engine (issue #63).
    onFail?.();
  };

  const m: Mount = {
    ready: false,
    visible: false,
    paused: false,
    quality: () => (S ? S.q : 1),
    degrade() {
      if (!S) return;
      S.q = Math.max(0.75, S.q - 0.25);
      m.resize();
    },
    tick(dt) {
      if (!S || st === null || S.gl.isContextLost()) return;
      S.t += env.reduce ? 0 : dt;
      try {
        def.frame(S, st, dt);
      } catch (e) {
        if (!errored) {
          errored = true;
          cv.dataset.err = String((e instanceof Error && e.stack) || e).slice(0, 300);
          console.warn(e);
        }
      }
    },
    resize() {
      if (!S) return;
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return;
      S.W = Math.max(1, Math.round(r.width * S.q));
      S.H = Math.max(1, Math.round(r.height * S.q));
      if (cv.width !== S.W || cv.height !== S.H) {
        cv.width = S.W;
        cv.height = S.H;
      }
      if (!live.has(m) || env.reduce) m.tick(0);
    },
  };

  const start = (ctx: WebGLRenderingContext) => {
    try {
      S = makeKit(ctx, cv, def.opts, env.dpr);
      st = def.init(S);
    } catch (e) {
      S = null;
      fail(e);
      return;
    }
    if (env.reduce) S.t = 6.5;
    m.ready = true;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => m.resize());
      ro.observe(cv);
    } else window.addEventListener("resize", m.resize);
    m.resize();
    sync(m);
  };

  /* GL context is created only once the canvas first enters the viewport */
  const boot = () => {
    if (S || failed || destroyed || onRestored) return;
    gl = cv.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: env.dpr < 1.5,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: env.embed,
      powerPreference: "default",
    });
    if (!gl) return fail("WebGL context unavailable");
    if (gl.isContextLost()) {
      const ext = loseExts.get(cv);
      if (!ext) return fail("WebGL context lost");
      const ctx = gl;
      const handler = () => {
        cv.removeEventListener("webglcontextrestored", handler);
        onRestored = null;
        loseExts.delete(cv);
        if (!destroyed) start(ctx);
      };
      onRestored = handler;
      cv.addEventListener("webglcontextrestored", handler);
      try {
        ext.restoreContext();
      } catch (e) {
        fail(e);
      }
      return;
    }
    start(gl);
  };

  const io = new IntersectionObserver(
    (es) => {
      const v = es[es.length - 1].isIntersecting;
      m.visible = v;
      if (v && !S) boot();
      if (!S) return;
      sync(m);
      if (v) m.resize();
    },
    { threshold: 0.02 },
  );
  io.observe(cv);
  register(m);

  return {
    pause(b) {
      if (destroyed) return;
      m.paused = !!b;
      sync(m);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      m.ready = false;
      io.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", m.resize);
      if (onRestored) {
        cv.removeEventListener("webglcontextrestored", onRestored);
        onRestored = null;
      }
      unregister(m);
      if (st !== null && def.dispose) def.dispose(st);
      st = null;
      S = null;
      if (gl && !gl.isContextLost()) {
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) {
          loseExts.set(cv, ext);
          // cancelling the lost event is what allows restoreContext() on a later mount
          cv.addEventListener("webglcontextlost", preventDefault, { once: true });
          ext.loseContext();
        }
      }
      gl = null;
    },
  };
}

/**
 * Mount a WebGL scene on `canvas`. Returns null when WebGL (or IntersectionObserver) is
 * unavailable so the caller can fall back to the 2D engine. The context itself is created
 * lazily, the first time the canvas scrolls into view.
 */
export function mountScene3D(
  canvas: HTMLCanvasElement,
  kind: Scene3DKind,
  onFail?: () => void,
): SceneApi | null {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined" || !hasWebGL()) return null;
  switch (kind) {
    case "attention":
      return mountWith(canvas, ATT, onFail);
    case "neural":
      return mountWith(canvas, NET, onFail);
    case "distill":
      return mountWith(canvas, FLASK, onFail);
  }
}
