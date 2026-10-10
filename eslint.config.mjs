import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent skill bundles (not app code).
    ".claude/**",
    ".cursor/**",
    // Design-system sync output and vendored bundles (generated, not app code).
    "ds-bundle/**",
    ".ds-sync/**",
    ".design-sync/**",
    "design-system/dist/**",
  ]),
]);

export default eslintConfig;
