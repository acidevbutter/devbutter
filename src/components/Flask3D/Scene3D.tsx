"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const GREEN = "#79E59B";
const GREEN_GLOW = "#00D26A";
const PINK = "#F64C6F";
const PINK_GLOW = "#FF4FA3";
const CREAM = "#F5F7FB";

/**
 * Silhouette of the Erlenmeyer from the logomark, revolved into glass by LatheGeometry.
 * The radii track the flat mark's proportions (base and neck each measured against its
 * height) — a wider cone reads as a different vessel rather than the same one in 3D.
 */
const FLASK_PROFILE: [number, number][] = [
  [0.0, -1.3],
  [0.79, -1.3],
  [0.87, -1.23],
  [0.87, -1.17],
  [0.28, 0.52],
  [0.26, 0.58],
  [0.26, 1.24],
  [0.26, 1.31],
  [0.33, 1.39],
];

/** Derived from the profile so the pixel sizing below stays honest if the shape moves. */
const FLASK_BOTTOM = FLASK_PROFILE[0][1];
const FLASK_TOP = FLASK_PROFILE[FLASK_PROFILE.length - 1][1];
const FLASK_UNITS = FLASK_TOP - FLASK_BOTTOM;
const FLASK_CENTRE = (FLASK_TOP + FLASK_BOTTOM) / 2;

const LIQUID_TOP = -0.15;
const LIQUID_BASE = -1.24;
/** Where green gives way to pink, matching the two-tone fill of the flat logomark. */
const LIQUID_SPLIT = -0.62;

const LIQUID_PROFILE: [number, number][] = [
  [0.0, LIQUID_BASE],
  [0.74, LIQUID_BASE],
  [0.8, -1.18],
  [0.49, LIQUID_TOP],
  [0.0, LIQUID_TOP],
];

const GLASS_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying float vY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - wp.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * Fresnel rim instead of real refraction: a transmission material would need its own
 * render target every frame, and the flat, precise edge reads closer to the brand's
 * editorial drawing than photoreal glass would.
 */
const GLASS_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying float vY;
  void main() {
    float f = 1.0 - abs(dot(normalize(vNormalW), normalize(vViewW)));
    f = pow(clamp(f, 0.0, 1.0), 2.2);
    vec3 tint = mix(uBottom, uTop, smoothstep(-1.3, 1.4, vY));
    gl_FragColor = vec4(tint * (0.16 + f * 2.0), 0.04 + f * 0.9);
  }
`;

const LIQUID_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying vec3 vPos;
  varying float vY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - wp.xyz);
    vPos = position;
    vY = position.y;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const LIQUID_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uGreen;
  uniform vec3 uPink;
  uniform float uSplit;
  uniform float uTop;
  varying vec3 vNormalW;
  varying vec3 vViewW;
  varying vec3 vPos;
  varying float vY;
  void main() {
    float ang = atan(vPos.z, vPos.x);
    float split = uSplit + sin(ang * 3.0 + uTime * 1.1) * 0.035;
    // The brand pink is a darker colour than the brand green, so at one shared exposure
    // it silts up into brown. Lifting it holds the hue where swapping it would not.
    vec3 col = mix(uPink * 1.55, uGreen, smoothstep(split - 0.09, split + 0.09, vY));
    float f = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewW))), 1.6);
    float meniscus = smoothstep(uTop - 0.045, uTop - 0.004, vY);
    col += vec3(0.26) * meniscus;
    // Additive blows out fast on a near-black page, so the body stays dim enough to read
    // as a lit volume behind glass rather than a solid neon block.
    gl_FragColor = vec4(col * (0.34 + f * 0.62), 0.68);
  }
`;

function toVec2(profile: [number, number][]) {
  return profile.map(([x, y]) => new THREE.Vector2(x, y));
}

/** Bubbles rise inside the liquid and fade out as they reach the surface. */
const BUBBLES = Array.from({ length: 13 }, (_, i) => ({
  radius: 0.028 + ((i * 7) % 5) * 0.008,
  angle: (i / 13) * Math.PI * 2 + i * 0.7,
  spread: 0.12 + ((i * 3) % 4) * 0.09,
  speed: 0.2 + ((i * 5) % 6) * 0.035,
  phase: (i * 0.37) % 1,
  green: i % 2 === 0,
}));

function Flask({ animated }: { animated: boolean }) {
  const group = useRef<THREE.Group>(null);
  const liquidMat = useRef<THREE.ShaderMaterial>(null);
  const bubbles = useRef<(THREE.Mesh | null)[]>([]);

  const glassMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLASS_VERT,
        fragmentShader: GLASS_FRAG,
        uniforms: {
          uTop: { value: new THREE.Color(CREAM) },
          uBottom: { value: new THREE.Color(GREEN) },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const liquidMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: LIQUID_VERT,
        fragmentShader: LIQUID_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uGreen: { value: new THREE.Color(GREEN) },
          uPink: { value: new THREE.Color(PINK) },
          uSplit: { value: LIQUID_SPLIT },
          uTop: { value: LIQUID_TOP },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const flaskGeometry = useMemo(
    () => new THREE.LatheGeometry(toVec2(FLASK_PROFILE), 72),
    []
  );
  const liquidGeometry = useMemo(
    () => new THREE.LatheGeometry(toVec2(LIQUID_PROFILE), 72),
    []
  );
  const bubbleGeometry = useMemo(() => new THREE.SphereGeometry(1, 10, 10), []);
  const bubbleGreen = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(GREEN),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  const bubblePink = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PINK_GLOW),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((state, delta) => {
    if (!animated) return;
    const t = state.clock.elapsedTime;

    if (group.current) group.current.rotation.y += delta * 0.16;
    if (liquidMat.current) liquidMat.current.uniforms.uTime.value = t;

    BUBBLES.forEach((b, i) => {
      const mesh = bubbles.current[i];
      if (!mesh) return;
      const travel = (b.phase + t * b.speed) % 1;
      mesh.position.y = LIQUID_BASE + 0.06 + travel * (LIQUID_TOP - LIQUID_BASE - 0.1);
      mesh.position.x = Math.cos(b.angle + travel * 1.6) * b.spread;
      mesh.position.z = Math.sin(b.angle + travel * 1.6) * b.spread;
      // Shrink into the surface rather than popping out of existence.
      const fade = Math.sin(travel * Math.PI);
      mesh.scale.setScalar(b.radius * (0.45 + fade * 0.9));
    });
  });

  return (
    <group ref={group}>
      <mesh geometry={flaskGeometry}>
        <primitive object={glassMaterial} attach="material" />
      </mesh>

      <mesh geometry={liquidGeometry}>
        <primitive object={liquidMaterial} attach="material" ref={liquidMat} />
      </mesh>

      {BUBBLES.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            bubbles.current[i] = el;
          }}
          geometry={bubbleGeometry}
          material={b.green ? bubbleGreen : bubblePink}
          scale={b.radius}
          position={[0, LIQUID_BASE + 0.2, 0]}
        />
      ))}
    </group>
  );
}

type RingProps = {
  radius: number;
  count: number;
  tilt: [number, number, number];
  /** Spin axis in the ring's own tilted frame — three different ones read as a gimbal. */
  axis: "x" | "y" | "z";
  speed: number;
  pulses: number;
  animated: boolean;
};

/**
 * The systems half of the brand: discrete nodes on a shared orbit, with pulses running
 * between them — the same "flows and dependencies" the flat circuit behind it draws.
 * Three of these on three axes precess past each other like a gyroscope.
 */
function OrbitRing({ radius, count, tilt, axis, speed, pulses, animated }: RingProps) {
  const group = useRef<THREE.Group>(null);
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);

  const orbitGeometry = useMemo(() => {
    const pts = Array.from({ length: 128 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  // The ring itself has to be readable, otherwise the nodes scan as loose confetti
  // instead of stops on a shared orbit.
  const orbitMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(CREAM),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    []
  );

  const nodeGeometry = useMemo(() => new THREE.OctahedronGeometry(0.048), []);
  const nodeGreen = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(GREEN_GLOW),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  const nodePink = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PINK_GLOW),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );
  const pulseGeometry = useMemo(() => new THREE.SphereGeometry(0.038, 8, 8), []);

  const nodes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return {
          position: [Math.cos(a) * radius, 0, Math.sin(a) * radius] as [
            number,
            number,
            number,
          ],
          green: i % 2 === 0,
        };
      }),
    [count, radius]
  );

  useFrame((state, delta) => {
    if (!animated) return;
    if (group.current) group.current.rotation[axis] += delta * speed;

    const t = state.clock.elapsedTime;
    for (let i = 0; i < pulses; i++) {
      const mesh = pulseRefs.current[i];
      if (!mesh) continue;
      const a = ((t * 0.28 + i / pulses) % 1) * Math.PI * 2;
      mesh.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    }
  });

  return (
    <group rotation={tilt}>
      <group ref={group}>
        <lineLoop geometry={orbitGeometry}>
          <primitive object={orbitMaterial} attach="material" />
        </lineLoop>

        {nodes.map((n, i) => (
          <mesh
            key={i}
            geometry={nodeGeometry}
            material={n.green ? nodeGreen : nodePink}
            position={n.position}
          />
        ))}

        {Array.from({ length: pulses }, (_, i) => (
          <mesh
            key={`pulse-${i}`}
            ref={(el) => {
              pulseRefs.current[i] = el;
            }}
            geometry={pulseGeometry}
            material={i % 2 === 0 ? nodeGreen : nodePink}
            position={[radius, 0, 0]}
          />
        ))}
      </group>
    </group>
  );
}

/**
 * The pose the flask keeps when nobody is moving a pointer — a three-quarter view, so the
 * depth still reads for a visitor who never touches the mouse, and on touch screens.
 */
const REST_TILT_X = 0.06;
const REST_TILT_Y = 0.32;

/**
 * How the flask sits on its canvas. Pixels match a flat SVG of fixed size (a stage that
 * has a flat counterpart); fractions suit a canvas with no counterpart to match, such as
 * the mobile backdrop, where the flask should simply scale with the viewport.
 */
export type FlaskPlacement = {
  heightPx?: number;
  heightFraction?: number;
  /** Centre relative to the canvas centre; negative is above. */
  offsetPx?: number;
  offsetFraction?: number;
};

/** Tilts the whole assembly toward the pointer so the depth is legible while still. */
function Scene({
  animated,
  placement,
  rings,
}: {
  animated: boolean;
  placement: FlaskPlacement;
  rings: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  // The flat flask is a fixed pixel size while the stage height changes by breakpoint, so
  // placing the scene in world units only ever matches at the height it was tuned for.
  // Resolving px → units against the live canvas keeps the handover exact at every width.
  const { heightPx, offsetPx, heightFraction, offsetFraction } = placement;
  const { scale, lift } = useMemo(() => {
    const visibleUnits =
      2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const pxPerUnit = size.height / visibleUnits;
    const h = heightPx ?? (heightFraction ?? 0.3) * size.height;
    const o = offsetPx ?? (offsetFraction ?? 0) * size.height;
    const s = h / (FLASK_UNITS * pxPerUnit);
    return { scale: s, lift: -o / pxPerUnit - FLASK_CENTRE * s };
  }, [
    size.height,
    camera.position.z,
    camera.fov,
    heightPx,
    offsetPx,
    heightFraction,
    offsetFraction,
  ]);

  useEffect(() => {
    // The canvas ignores pointer events so the form underneath stays clickable, which
    // also means R3F never sees the pointer — track it on the window instead.
    if (!animated) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [animated]);

  useFrame((_, delta) => {
    // Reduced motion renders a single frame, so there is no time to ease into a pose —
    // the resting tilt is set declaratively below instead.
    if (!animated || !root.current) return;

    // Pointer offsets the resting pose rather than replacing it, otherwise an untouched
    // page eases to a dead-on front view and the flask stops reading as a solid.
    const targetX = REST_TILT_X + pointer.current.y * 0.12;
    const targetY = REST_TILT_Y + pointer.current.x * 0.22;
    const k = 1 - Math.pow(0.001, delta);
    root.current.rotation.x += (targetX - root.current.rotation.x) * k;
    root.current.rotation.y += (targetY - root.current.rotation.y) * k;
  });

  return (
    <group
      ref={root}
      position={[0, lift, 0]}
      rotation={[REST_TILT_X, REST_TILT_Y, 0]}
      scale={scale}
    >
      <Flask animated={animated} />
      {rings && (
        <>
          <OrbitRing
            radius={1.9}
            count={8}
            tilt={[1.2, 0, 0.16]}
            axis="y"
            speed={0.26}
            pulses={2}
            animated={animated}
          />
          <OrbitRing
            radius={2.3}
            count={6}
            tilt={[-1.0, 0, -0.45]}
            axis="x"
            speed={0.19}
            pulses={1}
            animated={animated}
          />
          <OrbitRing
            radius={2.65}
            count={7}
            tilt={[0.25, 0.6, 1.15]}
            axis="z"
            speed={-0.22}
            pulses={2}
            animated={animated}
          />
        </>
      )}
    </group>
  );
}

/**
 * Reports the first frame that actually reaches the screen. Context creation is too early
 * to hand over from the SVG: a stage that mounts below the fold parks the loop before it
 * has drawn anything, and swapping then would leave the flask missing altogether.
 */
function FirstFrame({
  frameloop,
  onFirst,
}: {
  frameloop: string;
  onFirst?: () => void;
}) {
  const fired = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    // `demand` only draws when asked, so unparking the loop has to ask.
    if (frameloop === "demand") invalidate();
  }, [frameloop, invalidate]);

  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onFirst?.();
  });

  return null;
}

export default function Scene3D({
  animated,
  frameloop,
  placement,
  rings,
  onReady,
}: {
  animated: boolean;
  frameloop: "always" | "demand" | "never";
  placement: FlaskPlacement;
  rings: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      style={{ pointerEvents: "none" }}
      dpr={[1, 2]}
      frameloop={frameloop}
      camera={{ fov: 32, position: [0, 0, 11] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <FirstFrame frameloop={frameloop} onFirst={onReady} />
      <Scene animated={animated} placement={placement} rings={rings} />
    </Canvas>
  );
}
