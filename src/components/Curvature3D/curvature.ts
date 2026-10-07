/* DevButter · Curvatura 3D — WebGL puro, zero dependências (substitui three.js, ~1 MB a menos).
   Física: a malha é o potencial Σ −K·m/√(r²+ε²), calculado na GPU; corpos integrados sob o mesmo campo
   (Euler semi-implícito); fótons com deflexão 2× a newtoniana; o céu sofre lente gravitacional pontual
   (β = θ − θE²/θ) — anel de Einstein incluso. Membrana iluminada pela própria massa (1/d²).
   ~8 draw calls por quadro, sem pós-processamento. Resolução adaptativa, teto de 60 fps,
   pausa fora da tela / aba oculta / api.pause(). Movimento reduzido = quadro estático.
   Port TypeScript de docs/design/assets/curvature3d.js — shaders e física idênticos. */

import type { CurvatureApi, CurvatureMass, CurvatureOptions, CurvatureOrbit } from "./scenes";

export type { CurvatureApi, CurvatureCamera, CurvatureMass, CurvatureOptions, CurvatureOrbit } from "./scenes";
export { NF_CURV } from "./scenes";

const PHI = `
uniform vec4 uM0; uniform vec4 uM1;
float phi(vec2 p){ vec2 a=p-uM0.xy, b=p-uM1.xy; return -uM0.z*inversesqrt(dot(a,a)+1.3225)-uM1.z*inversesqrt(dot(b,b)+1.3225); }
`;
const GPHI = `
vec2 gphi(vec2 p){ vec2 a=p-uM0.xy, b=p-uM1.xy; float ia=inversesqrt(dot(a,a)+1.3225), ib=inversesqrt(dot(b,b)+1.3225); return uM0.z*a*ia*ia*ia+uM1.z*b*ib*ib*ib; }
`;
const HASH = `
float h1(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h1(i),h1(i+vec3(1.,0.,0.)),f.x),mix(h1(i+vec3(0.,1.,0.)),h1(i+vec3(1.,1.,0.)),f.x),f.y),
             mix(mix(h1(i+vec3(0.,0.,1.)),h1(i+vec3(1.,0.,1.)),f.x),mix(h1(i+vec3(0.,1.,1.)),h1(i+vec3(1.,1.,1.)),f.x),f.y),f.z); }
`;

const VS_TRI = `attribute vec2 aP; void main(){ gl_Position=vec4(aP,0.0,1.0); }`;

const FS_BG = `precision highp float;
uniform vec2 uRes; uniform mat4 uInv; uniform vec3 uCam; uniform vec4 uL0, uL1; uniform float uPx, uT;
${HASH}
vec3 h3(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
vec3 dirAt(vec2 px){ vec4 w=uInv*vec4(px/uRes*2.0-1.0,1.0,1.0); return normalize(w.xyz/w.w-uCam); }
vec3 stars(vec3 d, float sc, float dens, float gain){
  vec3 p=d*sc, c=floor(p), h=h3(c);
  if(h1(c+17.0)>dens) return vec3(0.0);
  vec3 sp=c+0.2+0.6*h;
  float rs=max(uPx*sc*0.8,0.015);
  float r2=dot(p-sp,p-sp)/(rs*rs);
  float b=(exp(-r2)+0.05*exp(-r2*0.07))*gain*(0.2+0.8*h.x*h.x);
  return b*mix(vec3(0.70,0.80,1.0),vec3(1.0,0.86,0.72),h.y);
}
void main(){
  vec2 px=gl_FragCoord.xy;
  vec2 a=px-uL0.xy, b=px-uL1.xy;
  float ra=dot(a,a)+1.0, rb=dot(b,b)+1.0;
  vec2 src=px-a*(uL0.z/ra)-b*(uL1.z/rb);
  vec3 d=dirAt(src);
  float band=exp(-pow(dot(d,vec3(0.28,0.93,0.24))/0.3,2.0));
  vec3 col=vec3(0.024,0.033,0.054);
  float n=vn(d*3.0)*0.55+vn(d*6.7)*0.3+vn(d*14.0)*0.15;
  float neb=smoothstep(0.42,0.95,n)*(0.45+band);
  col+=mix(vec3(0.20,0.55,0.38),vec3(0.62,0.18,0.36),vn(d*1.7+4.0))*neb*0.055;
  col+=vec3(0.05,0.055,0.07)*band*n*0.5;
  col+=stars(d,150.0,0.16+0.3*band,0.7);
  col+=stars(d,64.0,0.09,1.5);
  float ea=sqrt(uL0.z), rr=sqrt(ra);
  col+=vec3(1.0,0.42,0.72)*exp(-pow((rr-ea)/(ea*0.06+1.0),2.0))*0.05*step(1.0,uL0.z);
  vec2 uv=px/uRes-0.5; col*=1.0-0.55*pow(length(uv*vec2(1.1,1.3)),2.4);
  col+=(h1(vec3(px,uT))-0.5)/255.0;
  gl_FragColor=vec4(col,1.0);
}`;

const VS_SHEET = `invariant gl_Position;
attribute vec2 aXZ; uniform mat4 uVP;
${PHI}
varying vec3 vW;
void main(){ vW=vec3(aXZ.x,phi(aXZ),aXZ.y); gl_Position=uVP*vec4(vW,1.0); }`;

const FS_PRE = `precision mediump float; void main(){ gl_FragColor=vec4(0.0); }`;

const FS_SHEET = `#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec4 uM0; uniform vec4 uM1;
${GPHI}
uniform vec3 uCam, uL0, uL1, uC0, uC1, uG, uP; uniform float uCell, uHalf;
varying vec3 vW;
float grid(vec2 q, float w){
#ifdef GL_OES_standard_derivatives
  vec2 fw=fwidth(q);
#else
  vec2 fw=vec2(0.04);
#endif
  vec2 g=abs(fract(q-0.5)-0.5)/(fw*w);
  float l=1.0-min(min(g.x,g.y),1.0);
  return l*clamp(1.35-max(fw.x,fw.y)*2.6,0.0,1.0);
}
void main(){
  vec2 xz=vW.xz;
  float r=length(xz)/uHalf;
  float edge=1.0-smoothstep(0.45,1.0,r);
  vec2 g=gphi(xz);
  vec3 N=normalize(vec3(-g.x,1.0,-g.y));
  vec3 V=normalize(uCam-vW);
  float depth=clamp(-vW.y/3.2,0.0,1.0);
  float lines=max(grid(xz/uCell,1.0)*0.3,grid(xz/(uCell*5.0),1.5)*0.95);
  vec3 tint=mix(uG,uP,smoothstep(0.12,0.9,depth));
  vec3 l0=uL0-vW; float d0=dot(l0,l0); vec3 L0=l0*inversesqrt(d0);
  vec3 l1=uL1-vW; float d1=dot(l1,l1); vec3 L1=l1*inversesqrt(d1);
  vec3 lit=uC0*max(dot(N,L0),0.0)/(1.0+d0*0.45)+uC1*max(dot(N,L1),0.0)/(1.0+d1*0.45);
  vec3 Hk=normalize(normalize(vec3(-0.35,1.0,-0.6))+V);
  float sheen=pow(max(dot(N,Hk),0.0),28.0);
  float fres=pow(1.0-max(dot(N,V),0.0),4.0);
  vec3 col=tint*lines*(0.28+0.6*depth);
  col+=lines*lit*1.5;
  col+=lit*0.14;
  col+=vec3(0.55,0.7,0.85)*sheen*0.04+tint*fres*0.06;
  col=1.0-exp(-col*1.25);
  float a=mix(0.36,0.74,depth)*edge;
  gl_FragColor=vec4(col*edge+vec3(0.010,0.014,0.024)*a,a);
}`;

const VS_SPH = `attribute vec3 aN; uniform mat4 uVP; uniform vec4 uS; varying vec3 vN, vW;
void main(){ vN=aN; vW=uS.xyz+aN*uS.w; gl_Position=uVP*vec4(vW,1.0); }`;

const FS_SPH = `precision highp float;
uniform vec3 uCam, uHot, uMid, uRim; uniform float uTime;
varying vec3 vN, vW;
${HASH}
void main(){
  vec3 N=normalize(vN), V=normalize(uCam-vW);
  float mu=clamp(dot(N,V),0.0,1.0);
  float c=cos(uTime*0.07), s=sin(uTime*0.07);
  vec3 q=vec3(c*N.x-s*N.z,N.y,s*N.x+c*N.z)*3.2;
  float n=vn(q)*0.5+vn(q*2.1+uTime*0.15)*0.3+vn(q*4.7-uTime*0.25)*0.2;
  float cells=smoothstep(0.25,0.85,n);
  float limb=1.0-0.62*(1.0-pow(mu,0.6));
  vec3 col=mix(uRim,uMid,smoothstep(0.0,0.75,mu));
  col=mix(col,uHot,smoothstep(0.6,1.0,mu)*0.4);
  col*=limb*(0.55+0.8*cells)*1.1;
  col+=uMid*pow(1.0-mu,2.5)*0.35;
  col=1.0-exp(-col*1.35);
  gl_FragColor=vec4(col,1.0);
}`;

const VS_RIB = `attribute vec2 aPrev, aPos, aNext; attribute vec4 aCol, aSt;
uniform mat4 uVP; uniform vec2 uRes; uniform float uDpr;
${PHI}
varying vec4 vCol; varying float vS;
vec4 P(vec2 p){ return uVP*vec4(p.x,phi(p)*aSt.z+aSt.w,p.y,1.0); }
void main(){
  vec4 c=P(aPos), a=P(aPrev), b=P(aNext);
  vec2 d=(b.xy/b.w-a.xy/a.w)*uRes; float l=length(d);
  vec2 n=l>1e-5?vec2(-d.y,d.x)/l:vec2(0.0,1.0);
  float t=aSt.y, s=sign(aSt.x);
  float w=abs(aSt.x)*uDpr*(1.0-0.65*t)+0.6;
  c.xy+=n*s*w*2.0/uRes*c.w;
  gl_Position=c; vS=s;
  vCol=vec4(aCol.rgb,aCol.a*pow(1.0-t,1.7));
}`;

const FS_RIB = `precision mediump float;
varying vec4 vCol; varying float vS;
void main(){ float e=1.0-abs(vS); float a=vCol.a*smoothstep(0.0,0.85,e); vec3 c=mix(vCol.rgb,vec3(1.0),e*e*e*0.4); gl_FragColor=vec4(c*a,0.0); }`;

const VS_PTS = `attribute vec2 aXZ; attribute vec4 aCol, aSt;
uniform mat4 uVP; uniform vec2 uRes, uLight; uniform float uFocal;
${PHI}
varying vec4 vCol; varying float vT; varying vec2 vL;
void main(){
  vec4 c=uVP*vec4(aXZ.x,phi(aXZ)*aSt.z+aSt.w,aXZ.y,1.0);
  gl_Position=c;
  float r=aSt.x*uFocal/c.w;
  vT=aSt.y;
  gl_PointSize=clamp(r*(vT<0.5?4.8:10.0),2.0,64.0);
  vec2 d=(uLight-c.xy/c.w)*uRes; vL=d/(length(d)+1e-4);
  vCol=aCol;
}`;

const FS_PTS = `precision mediump float;
varying vec4 vCol; varying float vT; varying vec2 vL;
void main(){
  vec2 p=gl_PointCoord*2.0-1.0; p.y=-p.y; float r=length(p);
  if(r>1.0) discard;
  vec3 c; float a=0.0;
  if(vT<0.5){
    float R=0.42;
    float halo=0.28*exp(-max(r-R,0.0)*6.0)*(1.0-r);
    vec2 s=p/R; float z=sqrt(max(1.0-dot(s,s),0.0));
    vec3 n=vec3(s,z), L=normalize(vec3(vL,0.55));
    float df=max(dot(n,L),0.0);
    vec3 sc=vCol.rgb*(0.06+1.2*df)+vec3(pow(df,14.0)*0.35);
    float k=1.0-smoothstep(R-0.08,R,r);
    c=mix(vCol.rgb*halo,sc,k); a=k;
  } else {
    float core=exp(-r*r*28.0), glow=exp(-r*4.5)*0.4;
    c=mix(vCol.rgb,vec3(1.0),core*0.75)*(core+glow);
  }
  gl_FragColor=vec4(c*vCol.a,a*vCol.a);
}`;

const VS_COR = `attribute vec2 aC; uniform mat4 uVP; uniform vec3 uCtr, uRt, uUp; uniform float uSz; varying vec2 vC;
void main(){ vC=aC; gl_Position=uVP*vec4(uCtr+(uRt*aC.x+uUp*aC.y)*uSz,1.0); }`;

const FS_COR = `precision mediump float; uniform float uR, uI; uniform vec3 uMid, uRim; varying vec2 vC;
void main(){
  float d=length(vC); if(d>1.0) discard;
  float x=max(d-uR,0.0)/(1.0-uR);
  float g=(exp(-x*10.0)*0.8+exp(-x*3.2)*0.22)*(1.0-smoothstep(0.65,1.0,x));
  g*=d<uR?0.45*smoothstep(uR*0.55,uR,d):1.0;
  gl_FragColor=vec4(mix(uMid,uRim,clamp(x*2.2,0.0,1.0))*g*uI,0.0);
}`;

type Vec3 = [number, number, number];

interface Mass {
  x: number; z: number; tx: number; tz: number; hx: number; hz: number;
  m: number; R: number; orbit: CurvatureOrbit | null; a: number; cy: number;
  hot: Vec3; mid: Vec3; rim: Vec3; light: number; lens: number;
  /** Posição projetada (NDC) da massa principal — fonte de luz dos corpos. */
  sx: number; sy: number;
}

interface Trail {
  L: number; w: number; a: number; ys: number; lift: number;
  buf: Float32Array; head: number; len: number; col: Vec3; base: number;
}

interface Body { x: number; z: number; vx: number; vz: number; tr: Trail; base: Vec3; col: Vec3 }
interface Photon { x: number; z: number; vx: number; vz: number; tr: Trail; delay: number }

interface Prog { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }

/** [buffer, componentes, tipo (0 = FLOAT), normalizado (0/1), offset em bytes] */
type AttribSpec = [WebGLBuffer, number, number?, number?, number?];

export async function mountCurvature(el: HTMLElement, opts: CurvatureOptions = {}): Promise<CurvatureApi> {
  const mq = (q: string) => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
  const reduce = mq('(prefers-reduced-motion: reduce)');
  const coarse = mq('(pointer: coarse)');
  const lowEnd = coarse || (navigator.hardwareConcurrency || 8) <= 4;
  const stub: CurvatureApi = { destroy() {}, reset() {}, pause() {} };
  const G: Vec3 = [121 / 255, 229 / 255, 155 / 255], P: Vec3 = [246 / 255, 76 / 255, 111 / 255], PG: Vec3 = [1, 79 / 255, 163 / 255], GG: Vec3 = [0, 210 / 255, 106 / 255];

  const cv = document.createElement('canvas');
  cv.style.cssText = 'display:block;width:100%;height:100%;cursor:grab;opacity:0;transition:opacity 1.2s cubic-bezier(.2,.7,.2,1);touch-action:' + (coarse ? 'pan-y' : 'none');
  el.appendChild(cv);
  let embedded = false; try { embedded = window.top !== window; } catch { embedded = true; }
  const dprCap = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.25 : 1.6);
  /* preserveDrawingBuffer só dentro do editor (screenshots); no site publicado fica desligado */
  const glOrNull = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: dprCap < 1.5, depth: true, stencil: false, preserveDrawingBuffer: embedded, powerPreference: 'default' });
  if (!glOrNull) { cv.remove(); return stub; }
  const gl: WebGLRenderingContext = glOrNull;
  gl.getExtension('OES_standard_derivatives');

  /* ---------- física ---------- */
  const S = 20, H = S / 2, K = 1, EPS2 = 1.3225, GRID = lowEnd ? 96 : 140;
  /* lista vazia cai na cena padrão (o original quebrava com []) */
  const massOpts: CurvatureMass[] = opts.masses && opts.masses.length ? opts.masses : [{ x: 1.6, z: 0.2, m: opts.mass || 4.2, R: 0.72 }];
  const masses = massOpts.slice(0, 2).map((m, i): Mass => ({
    x: m.x || 0, z: m.z || 0, tx: m.x || 0, tz: m.z || 0, hx: m.x || 0, hz: m.z || 0, m: m.m || 4.2, R: m.R || 0.72,
    orbit: m.orbit || null, a: (m.orbit && m.orbit.phase) || 0, cy: 0,
    hot: i ? [0.8, 1, 0.88] : [1, 0.66, 0.82], mid: i ? G : PG, rim: i ? GG : P, light: i ? 0.7 : 1.8, lens: i ? 1.7 : 2.5,
    sx: 0, sy: 0,
  }));
  const M0 = masses[0];
  let ramp = reduce ? 1 : 0;
  const phiF = (x: number, z: number) => { let y = 0; for (const m of masses) { const dx = x - m.x, dz = z - m.z; y -= K * m.m / Math.sqrt(dx * dx + dz * dz + EPS2); } return y; };
  let seed = opts.seed || 5150; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const NB = opts.bodies ?? (lowEnd ? 9 : 15), NP = opts.photons ?? (lowEnd ? 12 : 22), TB = 46, TP = 64, CS = 6.5, BR = 0.09, BLIFT = 0.12;

  const trails: Trail[] = [];
  const mkTrail = (L: number, w: number, a: number, ys: number, lift: number): Trail => { const t: Trail = { L, w, a, ys, lift, buf: new Float32Array(L * 2), head: -1, len: 0, col: G, base: 0 }; trails.push(t); return t; };
  const tpush = (t: Trail, x: number, z: number) => { t.head = (t.head + 1) % t.L; t.buf[t.head * 2] = x; t.buf[t.head * 2 + 1] = z; if (t.len < t.L) t.len++; };

  const bodies: Body[] = [], photons: Photon[] = [];
  function spawnBody(b: Body) {
    const a = rnd() * Math.PI * 2, r = 2.6 + rnd() * 5.5;
    b.x = M0.x + Math.cos(a) * r; b.z = M0.z + Math.sin(a) * r;
    const v = Math.sqrt((K * M0.m * r * r) / Math.pow(r * r + EPS2, 1.5)) * (0.78 + rnd() * 0.42), dir = rnd() < 0.85 ? 1 : -1;
    b.vx = -Math.sin(a) * v * dir; b.vz = Math.cos(a) * v * dir; b.tr.len = 0;
  }
  for (let n = 0; n < NB; n++) { const b: Body = { x: 0, z: 0, vx: 0, vz: 0, tr: mkTrail(TB, 1.5, 0.72, 1, BLIFT), base: n % 3 === 1 ? P : G, col: G }; spawnBody(b); bodies.push(b); }
  function spawnPhoton(p: Photon, first = false) {
    const side = rnd() < 0.5 ? -1 : 1, beam = Math.floor(rnd() * 5);
    p.z = M0.z + (-5 + beam * 2.5) + (rnd() - 0.5) * 0.5; p.x = side < 0 ? -H : H; p.vx = CS * -side; p.vz = 0;
    if (first) p.x += -side * rnd() * S;
    p.tr.len = 0; p.delay = first ? 0 : rnd() * 1.2;
  }
  for (let n = 0; n < NP; n++) { const p: Photon = { x: 0, z: 0, vx: 0, vz: 0, tr: mkTrail(TP, 1.05, 0.95, 0.55, 0.28), delay: 0 }; p.tr.col = n % 2 ? PG : G; spawnPhoton(p, true); photons.push(p); }

  const acc = [0, 0];
  function accel(x: number, z: number, k: number, e2: number) { let ax = 0, az = 0; for (const m of masses) { const dx = x - m.x, dz = z - m.z, d2 = dx * dx + dz * dz + e2, f = -k * m.m / (d2 * Math.sqrt(d2)); ax += dx * f; az += dz * f; } acc[0] = ax; acc[1] = az; }
  function absorbed(x: number, z: number, s: number) { for (const m of masses) { const dx = x - m.x, dz = z - m.z; if (dx * dx + dz * dz < m.R * m.R * s) return true; } return false; }
  function stepBodies(dt: number) {
    const sub = 4, h = dt / sub;
    for (const b of bodies) {
      for (let s = 0; s < sub; s++) { accel(b.x, b.z, K, EPS2); b.vx += acc[0] * h; b.vz += acc[1] * h; b.x += b.vx * h; b.z += b.vz * h; }
      if (Math.abs(b.x) > H * 1.05 || Math.abs(b.z) > H * 1.05 || absorbed(b.x, b.z, 0.8)) spawnBody(b);
    }
  }
  function stepPhotons(dt: number) {
    const sub = 6, h = dt / sub;
    for (const p of photons) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      let dead = false;
      for (let s = 0; s < sub; s++) {
        if (absorbed(p.x, p.z, 1.1)) { dead = true; break; }
        accel(p.x, p.z, 2 * K, EPS2 * 0.5);
        p.vx += acc[0] * h; p.vz += acc[1] * h; const sp = Math.hypot(p.vx, p.vz) || 1; p.vx *= CS / sp; p.vz *= CS / sp;
        p.x += p.vx * h; p.z += p.vz * h;
      }
      if (dead || !Number.isFinite(p.x) || Math.abs(p.x) > H * 1.08 || Math.abs(p.z) > H * 1.08) spawnPhoton(p);
    }
  }
  function record() {
    for (const b of bodies) { tpush(b.tr, b.x, b.z); const e = 0.5 * (b.vx * b.vx + b.vz * b.vz) + phiF(b.x, b.z); b.col = b.tr.col = e > -0.04 ? PG : b.base; }
    for (const p of photons) if (p.delay <= 0) tpush(p.tr, p.x, p.z);
  }
  function moveMasses(dt: number, orbit: boolean) {
    const k = 1 - Math.exp(-dt * 5.5);
    M0.x += (M0.tx - M0.x) * k; M0.z += (M0.tz - M0.z) * k;
    for (let i = 1; i < masses.length; i++) {
      const m = masses[i], o = m.orbit; if (!o) continue;
      if (orbit) m.a += dt * o.speed;
      m.x = M0.x + Math.cos(m.a) * o.r; m.z = M0.z + Math.sin(m.a) * o.r * (o.ecc || 1);
    }
  }
  moveMasses(0, false);
  for (let i = 0; i < 160; i++) { stepBodies(0.016 * 1.6); stepPhotons(0.016); if (i >= 160 - TP) record(); }

  /* ---------- câmera ---------- */
  const cam = { dist: 15.4, el: 0.52, fov: 36, ty: -1.4, spin: 0.035, yaw: 0, ...opts.camera };
  const P4 = new Float32Array(16), V4 = new Float32Array(16), VP = new Float32Array(16), IVP = new Float32Array(16), eye: Vec3 = [0, 0, 0];
  let yaw = cam.yaw; const par = [0, 0], parT = [0, 0];
  function perspective(o: Float32Array, fy: number, asp: number, n: number, f: number) { const t = 1 / Math.tan(fy / 2), nf = 1 / (n - f); o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) * nf; o[11] = -1; o[14] = 2 * f * n * nf; }
  function lookAt(o: Float32Array, e: Vec3, c: Vec3) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = zz, xz = -zx; l = Math.hypot(xx, xz); xx /= l; xz /= l; const xy = 0;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1;
  }
  function mul(o: Float32Array, a: Float32Array, b: Float32Array) { for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; }
  function invert(o: Float32Array, m: Float32Array) {
    const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3], a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7], a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11], a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return; d = 1 / d;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
  }
  const pr: Vec3 = [0, 0, 0];
  function project(x: number, y: number, z: number) { const w = VP[3] * x + VP[7] * y + VP[11] * z + VP[15]; pr[0] = (VP[0] * x + VP[4] * y + VP[8] * z + VP[12]) / w; pr[1] = (VP[1] * x + VP[5] * y + VP[9] * z + VP[13]) / w; pr[2] = w; return pr; }
  function unproj(x: number, y: number, z: number): Vec3 { const m = IVP, w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w]; }

  /* ---------- GL ---------- */
  let W = 1, Hpx = 1, q = dprCap, enabled = 0;
  function compile(type: number, src: string): WebGLShader {
    const s = gl.createShader(type); if (!s) throw new Error('createShader falhou');
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'compile');
    return s;
  }
  function prog(vs: string, fs: string, attrs: string[]): Prog {
    const p = gl.createProgram(); if (!p) throw new Error('createProgram falhou');
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    const u: Prog['u'] = {}, n: number = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); if (info) u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  const buf = (data: Float32Array | Uint16Array | Uint8Array, target?: number, usage?: number): WebGLBuffer => {
    const b = gl.createBuffer(); if (!b) throw new Error('createBuffer falhou');
    gl.bindBuffer(target || gl.ARRAY_BUFFER, b); gl.bufferData(target || gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW); return b;
  };
  function attribs(list: AttribSpec[]) {
    list.forEach((a, i) => { gl.bindBuffer(gl.ARRAY_BUFFER, a[0]); gl.vertexAttribPointer(i, a[1], a[2] || gl.FLOAT, !!a[3], 0, a[4] || 0); });
    for (let i = enabled; i < list.length; i++) gl.enableVertexAttribArray(i);
    for (let i = list.length; i < enabled; i++) gl.disableVertexAttribArray(i);
    enabled = list.length;
  }

  let vCount = 0; for (const t of trails) { t.base = vCount; vCount += (t.L + 2) * 2; }
  const rPos = new Float32Array(vCount * 2), rCol = new Uint8Array(vCount * 4), rSt = new Float32Array(vCount * 4), rIdxA: number[] = [];
  for (const t of trails) for (let j = 0; j < t.L; j++) {
    for (let s = 0; s < 2; s++) { const v = (t.base + 2 * j + s) * 4; rSt[v] = (s ? 1 : -1) * t.w; rSt[v + 1] = j / (t.L - 1); rSt[v + 2] = t.ys; rSt[v + 3] = t.lift; }
    if (j < t.L - 1) { const v0 = t.base + 2 * j; rIdxA.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2); }
  }
  const NPT = NB + NP, pXZ = new Float32Array(NPT * 2), pCol = new Uint8Array(NPT * 4), pSt = new Float32Array(NPT * 4);
  for (let i = 0; i < NPT; i++) { const b = i < NB; pSt.set(b ? [BR, 0, 1, BLIFT] : [0.035, 1, 0.55, 0.28], i * 4); }

  function buildResources() {
    const N = GRID, V = N + 1, sv = new Float32Array(V * V * 2), si = new Uint16Array(N * N * 6);
    for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) { sv[(i * V + j) * 2] = -H + (S * j) / N; sv[(i * V + j) * 2 + 1] = -H + (S * i) / N; }
    let k = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = i * V + j; si[k++] = a; si[k++] = a + V; si[k++] = a + 1; si[k++] = a + 1; si[k++] = a + V; si[k++] = a + V + 1; }
    const LAT = 28, LON = 44, sn: number[] = [], sx: number[] = [];
    for (let i = 0; i <= LAT; i++) { const th = (i / LAT) * Math.PI; for (let j = 0; j <= LON; j++) { const ph = (j / LON) * Math.PI * 2; sn.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); } }
    for (let i = 0; i < LAT; i++) for (let j = 0; j < LON; j++) { const a = i * (LON + 1) + j, b = a + LON + 1; sx.push(a, b, a + 1, b, b + 1, a + 1); }
    const E = gl.ELEMENT_ARRAY_BUFFER, D = gl.DYNAMIC_DRAW;
    return {
      bg: prog(VS_TRI, FS_BG, ['aP']), pre: prog(VS_SHEET, FS_PRE, ['aXZ']), sheet: prog(VS_SHEET, FS_SHEET, ['aXZ']),
      sph: prog(VS_SPH, FS_SPH, ['aN']), rib: prog(VS_RIB, FS_RIB, ['aPrev', 'aPos', 'aNext', 'aCol', 'aSt']),
      pts: prog(VS_PTS, FS_PTS, ['aXZ', 'aCol', 'aSt']), cor: prog(VS_COR, FS_COR, ['aC']),
      tri: buf(new Float32Array([-1, -1, 3, -1, -1, 3])), quad: buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])),
      sv: buf(sv), si: buf(si, E), sCount: si.length, sn: buf(new Float32Array(sn)), sx: buf(new Uint16Array(sx), E), sxCount: sx.length,
      rPos: buf(rPos, 0, D), rCol: buf(rCol, 0, D), rSt: buf(rSt), rIdx: buf(new Uint16Array(rIdxA), E), rCount: rIdxA.length,
      pXZ: buf(pXZ, 0, D), pCol: buf(pCol, 0, D), pSt: buf(pSt),
    };
  }
  let R: ReturnType<typeof buildResources> | null = null;
  function initGL() { enabled = 0; R = buildResources(); }

  function fillDynamic() {
    for (const t of trails) {
      const L = t.L, n = t.len; let o = t.base * 2;
      for (let j = 0; j < L + 2; j++) {
        let x = 0, z = 0;
        if (n > 0) { const kk = Math.min(Math.max(j - 1, 0), n - 1), idx = (((t.head - kk) % L) + L) % L; x = t.buf[idx * 2]; z = t.buf[idx * 2 + 1]; }
        rPos[o] = x; rPos[o + 1] = z; rPos[o + 2] = x; rPos[o + 3] = z; o += 4;
      }
      const c = t.col, r = c[0] * 255, g = c[1] * 255, b = c[2] * 255, A = t.a * 255;
      let ci = t.base * 4;
      for (let j = 0; j < L; j++) { const a = j < n ? A : 0; rCol[ci] = r; rCol[ci + 1] = g; rCol[ci + 2] = b; rCol[ci + 3] = a; rCol[ci + 4] = r; rCol[ci + 5] = g; rCol[ci + 6] = b; rCol[ci + 7] = a; ci += 8; }
    }
    let i = 0;
    for (const b of bodies) { pXZ[i * 2] = b.x; pXZ[i * 2 + 1] = b.z; pCol[i * 4] = b.col[0] * 255; pCol[i * 4 + 1] = b.col[1] * 255; pCol[i * 4 + 2] = b.col[2] * 255; pCol[i * 4 + 3] = 255; i++; }
    for (const p of photons) { const c = p.tr.col; pXZ[i * 2] = p.x; pXZ[i * 2 + 1] = p.z; pCol[i * 4] = c[0] * 255; pCol[i * 4 + 1] = c[1] * 255; pCol[i * 4 + 2] = c[2] * 255; pCol[i * 4 + 3] = p.delay > 0 ? 0 : 230; i++; }
  }

  let clock = 0, shown = false;
  function render() {
    const Rs = R;
    if (!Rs || gl.isContextLost()) return;
    const e = cam.el + par[1], a = yaw + par[0];
    eye[0] = Math.sin(a) * Math.cos(e) * cam.dist; eye[1] = cam.ty + Math.sin(e) * cam.dist; eye[2] = Math.cos(a) * Math.cos(e) * cam.dist;
    const fy = (cam.fov * Math.PI) / 180, focal = Hpx / (2 * Math.tan(fy / 2));
    perspective(P4, fy, W / Hpx, 0.5, 80); lookAt(V4, eye, [0, cam.ty, 0]); mul(VP, P4, V4); invert(IVP, VP);
    const m1: Mass | undefined = masses[1];
    const u0 = [M0.x, M0.z, K * M0.m * ramp, M0.R], u1 = m1 ? [m1.x, m1.z, K * m1.m * ramp, m1.R] : [999, 999, 0, 0];
    const lens = [[-1e5, -1e5, 0, 0], [-1e5, -1e5, 0, 0]];
    masses.forEach((m, i) => {
      let y = 0; for (const n of masses) { const dx = m.x - n.x, dz = m.z - n.z; y -= K * n.m * ramp / Math.sqrt(dx * dx + dz * dz + EPS2); }
      m.cy = y + m.R;
      const p = project(m.x, m.cy, m.z), rpx = (m.R * focal) / p[2], th = m.lens * rpx;
      lens[i] = [(p[0] * 0.5 + 0.5) * W, (p[1] * 0.5 + 0.5) * Hpx, th * th * Math.min(1, Math.max(0, ramp)), rpx];
      if (i === 0) { m.sx = p[0]; m.sy = p[1]; }
    });
    const setM = (u: Prog['u']) => { gl.uniform4fv(u.uM0, u0); gl.uniform4fv(u.uM1, u1); };
    gl.viewport(0, 0, W, Hpx);
    gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
    /* 1 · céu com lente */
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    let u = Rs.bg.u; gl.useProgram(Rs.bg.p);
    gl.uniform2f(u.uRes, W, Hpx); gl.uniformMatrix4fv(u.uInv, false, IVP); gl.uniform3fv(u.uCam, eye);
    gl.uniform4fv(u.uL0, lens[0]); gl.uniform4fv(u.uL1, lens[1]); gl.uniform1f(u.uPx, (2 * Math.tan(fy / 2)) / Hpx); gl.uniform1f(u.uT, clock % 100);
    attribs([[Rs.tri, 2]]); gl.drawArrays(gl.TRIANGLES, 0, 3);
    /* 2 · membrana: pré-passo de profundidade, depois cor só na camada da frente */
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.colorMask(false, false, false, false);
    u = Rs.pre.u; gl.useProgram(Rs.pre.p); gl.uniformMatrix4fv(u.uVP, false, VP); setM(u);
    attribs([[Rs.sv, 2]]); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rs.si); gl.drawElements(gl.TRIANGLES, Rs.sCount, gl.UNSIGNED_SHORT, 0);
    gl.colorMask(true, true, true, true); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    u = Rs.sheet.u; gl.useProgram(Rs.sheet.p); gl.uniformMatrix4fv(u.uVP, false, VP); setM(u);
    gl.uniform3fv(u.uCam, eye); gl.uniform3fv(u.uG, G); gl.uniform3fv(u.uP, P); gl.uniform1f(u.uCell, opts.cell || 0.4); gl.uniform1f(u.uHalf, H);
    const lp = (m: Mass | undefined) => (m ? [m.x, m.cy, m.z] : [0, -50, 0]), lc = (m: Mass | undefined) => (m ? m.mid.map((c) => c * m.light * Math.min(1, ramp)) : [0, 0, 0]);
    gl.uniform3fv(u.uL0, lp(M0)); gl.uniform3fv(u.uL1, lp(m1)); gl.uniform3fv(u.uC0, lc(M0)); gl.uniform3fv(u.uC1, lc(m1));
    gl.drawElements(gl.TRIANGLES, Rs.sCount, gl.UNSIGNED_SHORT, 0);
    /* 3 · massas */
    gl.disable(gl.BLEND); gl.depthMask(true); gl.depthFunc(gl.LESS);
    u = Rs.sph.u; gl.useProgram(Rs.sph.p); gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniform3fv(u.uCam, eye); gl.uniform1f(u.uTime, clock);
    attribs([[Rs.sn, 3]]); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rs.sx);
    for (const m of masses) { gl.uniform4f(u.uS, m.x, m.cy, m.z, m.R); gl.uniform3fv(u.uHot, m.hot); gl.uniform3fv(u.uMid, m.mid); gl.uniform3fv(u.uRim, m.rim); gl.drawElements(gl.TRIANGLES, Rs.sxCount, gl.UNSIGNED_SHORT, 0); }
    /* 4 · rastros */
    fillDynamic();
    gl.enable(gl.BLEND); gl.depthMask(false);
    u = Rs.rib.u; gl.useProgram(Rs.rib.p); gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniform2f(u.uRes, W, Hpx); gl.uniform1f(u.uDpr, q); setM(u);
    gl.bindBuffer(gl.ARRAY_BUFFER, Rs.rPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, rPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, Rs.rCol); gl.bufferSubData(gl.ARRAY_BUFFER, 0, rCol);
    attribs([[Rs.rPos, 2, 0, 0, 0], [Rs.rPos, 2, 0, 0, 16], [Rs.rPos, 2, 0, 0, 32], [Rs.rCol, 4, gl.UNSIGNED_BYTE, 1], [Rs.rSt, 4]]);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Rs.rIdx); gl.drawElements(gl.TRIANGLES, Rs.rCount, gl.UNSIGNED_SHORT, 0);
    /* 5 · corpos e fótons */
    u = Rs.pts.u; gl.useProgram(Rs.pts.p); gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniform2f(u.uRes, W, Hpx); gl.uniform2f(u.uLight, M0.sx, M0.sy); gl.uniform1f(u.uFocal, focal); setM(u);
    gl.bindBuffer(gl.ARRAY_BUFFER, Rs.pXZ); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pXZ);
    gl.bindBuffer(gl.ARRAY_BUFFER, Rs.pCol); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pCol);
    attribs([[Rs.pXZ, 2], [Rs.pCol, 4, gl.UNSIGNED_BYTE, 1], [Rs.pSt, 4]]); gl.drawArrays(gl.POINTS, 0, NPT);
    /* 6 · coroa (bloom barato, sem pós-processamento) */
    gl.disable(gl.DEPTH_TEST);
    u = Rs.cor.u; gl.useProgram(Rs.cor.p); gl.uniformMatrix4fv(u.uVP, false, VP);
    gl.uniform3f(u.uRt, V4[0], V4[4], V4[8]); gl.uniform3f(u.uUp, V4[1], V4[5], V4[9]); attribs([[Rs.quad, 2]]);
    for (const m of masses) { const sz = m.R * 5; gl.uniform3f(u.uCtr, m.x, m.cy, m.z); gl.uniform1f(u.uSz, sz); gl.uniform1f(u.uR, m.R / sz); gl.uniform1f(u.uI, Math.min(1, ramp + 0.15)); gl.uniform3fv(u.uMid, m.mid); gl.uniform3fv(u.uRim, m.rim); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    if (!shown) { shown = true; cv.style.opacity = '1'; }
  }

  /* ---------- interação ---------- */
  let dragging = false;
  function aim(ev: PointerEvent) {
    const r = cv.getBoundingClientRect(), nx = ((ev.clientX - r.left) / r.width) * 2 - 1, ny = -(((ev.clientY - r.top) / r.height) * 2 - 1);
    const a = unproj(nx, ny, -1), b = unproj(nx, ny, 1), dy = b[1] - a[1];
    if (Math.abs(dy) < 1e-6) return; const t = (-1.2 - a[1]) / dy; if (t < 0) return;
    const lim = H * 0.55, cl = (v: number) => Math.max(-lim, Math.min(lim, v));
    M0.tx = cl(a[0] + (b[0] - a[0]) * t); M0.tz = cl(a[2] + (b[2] - a[2]) * t); kick();
  }
  const onDown = (e: PointerEvent) => { dragging = true; try { cv.setPointerCapture(e.pointerId); } catch { /* ponteiro já liberado */ } cv.style.cursor = 'grabbing'; aim(e); };
  const onMove = (e: PointerEvent) => {
    if (dragging) { aim(e); return; }
    if (reduce || e.pointerType !== 'mouse') return;
    const r = cv.getBoundingClientRect(); parT[0] = ((e.clientX - r.left) / r.width - 0.5) * 0.16; parT[1] = -((e.clientY - r.top) / r.height - 0.5) * 0.06;
  };
  const onUp = () => { dragging = false; cv.style.cursor = 'grab'; };
  const onLeave = () => { parT[0] = parT[1] = 0; };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('pointerleave', onLeave);

  /* ---------- laço ---------- */
  let raf = 0, lastT = 0, vis = typeof IntersectionObserver === 'undefined', paused = false, lost = false, destroyed = false, ema = 16.7, nF = 0;
  const active = () => vis && !paused && !lost && !destroyed && !document.hidden;
  function kick() { if (raf || !active()) return; lastT = performance.now() - 16.7; raf = requestAnimationFrame(loop); }
  const settled = () => Math.abs(M0.tx - M0.x) + Math.abs(M0.tz - M0.z) < 0.002;
  function tick(dt: number) {
    if (!reduce) { clock += dt; ramp = clock < 3 ? 1 - Math.exp(-3.2 * clock) * Math.cos(5.5 * clock) : 1; yaw += dt * cam.spin; }
    const k = 1 - Math.exp(-dt * 3); par[0] += (parT[0] - par[0]) * k; par[1] += (parT[1] - par[1]) * k;
    moveMasses(dt, !reduce);
    if (!reduce) { stepBodies(dt * 1.6); stepPhotons(dt); record(); }
  }
  function loop(now: number) {
    raf = 0; if (!active()) return;
    const ms = now - lastT;
    if (ms < 10.5) { raf = requestAnimationFrame(loop); return; }  /* teto ~60 fps em telas de 120/144 Hz */
    lastT = now;
    if (++nF > 90) { ema += (ms - ema) * 0.05; if (nF % 45 === 0 && ema > 23 && q > 0.75) { q = Math.max(0.75, q - 0.25); ema = 16.7; resize(); } }
    tick(Math.min(0.033, ms / 1000)); render();
    if (!reduce || dragging || !settled()) raf = requestAnimationFrame(loop);
  }
  function resize() {
    if (destroyed) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    W = Math.max(1, Math.round(w * q)); Hpx = Math.max(1, Math.round(h * q));
    if (cv.width !== W || cv.height !== Hpx) { cv.width = W; cv.height = Hpx; }
    if (!raf) render();
  }

  try { initGL(); } catch (err) {
    console.warn('curvatura 3D: WebGL indisponível', err);
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
    cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('pointerleave', onLeave);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cv.remove(); return stub;
  }
  const onLost = (e: Event) => { e.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; };
  const onRestored = () => { if (destroyed) return; lost = false; try { initGL(); resize(); kick(); } catch (err) { console.warn(err); } };
  cv.addEventListener('webglcontextlost', onLost);
  cv.addEventListener('webglcontextrestored', onRestored);
  const ro = new ResizeObserver(() => resize()); ro.observe(el);
  const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; if (vis) kick(); }, { threshold: 0.02 });
  io?.observe(el);
  document.addEventListener('visibilitychange', kick);
  resize(); kick();

  return {
    /* idempotente: a segunda chamada é no-op */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf); raf = 0;
      ro.disconnect(); io?.disconnect();
      document.removeEventListener('visibilitychange', kick);
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('pointerleave', onLeave);
      /* sem os handlers de contexto, o loseContext abaixo não pede restauração */
      cv.removeEventListener('webglcontextlost', onLost); cv.removeEventListener('webglcontextrestored', onRestored);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      R = null;
      cv.remove();
    },
    reset() { M0.tx = M0.hx; M0.tz = M0.hz; kick(); },
    pause(b: boolean) { paused = !!b; if (!paused) kick(); },
  };
}
