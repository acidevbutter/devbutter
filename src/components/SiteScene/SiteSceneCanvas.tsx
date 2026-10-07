"use client";

import SceneCanvas, { type SceneCanvasProps } from "@/components/Scenes/SceneCanvas";
import { useConcierge } from "@/components/ConciergeCta/ConciergeProvider";

/** Section scene (2D/3D canvas) that freezes while the diagnosis panel is open. */
export default function SiteSceneCanvas(props: Omit<SceneCanvasProps, "paused">) {
  const concierge = useConcierge();
  return <SceneCanvas {...props} paused={concierge?.open ?? false} />;
}
