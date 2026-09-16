import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The HTTP E2E suite runs its own Next process and must not contend with a
  // developer's active `next dev` lock in the default `.next` directory.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Dockerfile.hostinger sets DOCKER=1 at build time so the runtime image can
  // ship the traced `.next/standalone` output instead of the full build + node_modules.
  output: process.env.DOCKER ? "standalone" : undefined,
};

export default nextConfig;
