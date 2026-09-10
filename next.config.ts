import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The HTTP E2E suite runs its own Next process and must not contend with a
  // developer's active `next dev` lock in the default `.next` directory.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
