"use client";

import LazyCurvature3D from "@/components/Curvature3D/LazyCurvature3D";
import type { Curvature3DProps } from "@/components/Curvature3D/Curvature3D";
import { useConcierge } from "@/components/ConciergeCta/ConciergeProvider";

/** Curvature scene that freezes while the diagnosis panel is open (prototype's syncFx). */
export default function SiteCurvature(props: Omit<Curvature3DProps, "paused">) {
  const concierge = useConcierge();
  return <LazyCurvature3D {...props} paused={concierge?.open ?? false} />;
}
