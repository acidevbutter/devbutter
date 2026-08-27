import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      // "server-only"'s default export throws to keep it out of client
      // bundles; that guard is meaningless under Vitest's Node
      // environment, so route-handler tests get the inert build instead.
      "server-only": path.resolve(rootDir, "./node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
