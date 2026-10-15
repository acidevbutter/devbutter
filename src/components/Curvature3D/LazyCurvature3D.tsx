"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import usePrefersReducedMotion from "@/hooks/usePrefersReducedMotion";
import type { Curvature3DProps } from "./Curvature3D";
import CurvatureFallback from "./CurvatureFallback";

// `ssr: false` só é permitido dentro de Client Component — por isso este wrapper.
const Curvature3D = dynamic(() => import("./Curvature3D"), {
  ssr: false,
  loading: () => <CurvatureFallback />,
});

let webglCache: boolean | undefined;

/** Sonda única por página: cria um contexto, confirma e o libera na hora. */
function hasWebGL(): boolean {
  if (webglCache !== undefined) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    webglCache = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

const noSubscribe = () => () => {};

/**
 * O que as páginas importam. Movimento reduzido ou WebGL ausente: só o fallback estático,
 * sem baixar o chunk do motor. O servidor assume WebGL disponível (renderiza o fallback de
 * loading de qualquer jeito) e o cliente corrige logo após a hidratação.
 */
export default function LazyCurvature3D(props: Curvature3DProps) {
  const reduced = usePrefersReducedMotion();
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => true);

  if (reduced || !webgl) {
    return <CurvatureFallback className={props.className} label={props.label} />;
  }
  return <Curvature3D {...props} />;
}
